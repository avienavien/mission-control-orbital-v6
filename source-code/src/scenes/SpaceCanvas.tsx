import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GROUND_STATIONS } from '../data/groundStations';
import { ORBIT_MAP, TARGET_REGION_MAP } from '../data/orbits';
import { ComponentId, MissionState } from '../game/types';
import {
  MISSION_GOALS,
  PARTS_BY_ID,
} from '../assemblyLab/data/partsCatalog';
import {
  buildPartMesh,
  BuiltPartResult,
} from '../assemblyLab/three/partMeshes';
import {
  createMaterialLibrary,
  MaterialLibrary,
} from '../assemblyLab/three/materials';
import {
  createProceduralTextures as createAssemblyTextures,
  ProceduralTextures,
} from '../assemblyLab/three/textures';
import {
  AssemblyLabSnapshot,
} from '../assemblyLab/AssemblyLabDesigner';
import {
  SubsystemCategory,
  SurfaceFinish,
} from '../assemblyLab/types/satellite';
import {
  computeOrbitPosition,
  EARTH_RADIUS_SCENE,
  latLonToWorldVector,
  sampleOrbitPath,
  SUN_DIRECTION,
} from '../simulation/orbitalMath';
import { createEarthAssembly } from './earthBuilder';
import { createLaunchAssembly } from './launchBuilder';
import { createProceduralTextures } from './proceduralTextures';
import { createSatelliteAssembly } from './satelliteBuilder';

interface SpaceCanvasProps {
  state: MissionState;
  assemblyBuild: AssemblyLabSnapshot | null;
  launchProgress: number;
  onSelectPart: (partId: ComponentId | null) => void;
  onDropComponent: (partId: ComponentId) => void;
  onTickOperations: (dtSec: number) => void;
}

const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _vecC = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _lookMat = new THREE.Matrix4();
const _targetQuat = new THREE.Quaternion();

const MENU_PREVIEW_DESIGN: MissionState['design'] = {
  bus: 1,
  solar: 1,
  battery: 1,
  imager: 1,
  antenna: 1,
  sensor: 0,
};

function createDesignedSatellite(
  snapshot: AssemblyLabSnapshot,
  materials: MaterialLibrary,
): { root: THREE.Group; parts: BuiltPartResult[] } {
  const root = new THREE.Group();
  const parts: BuiltPartResult[] = [];
  const busPart = snapshot.placedParts.find(
    (placed) => PARTS_BY_ID[placed.partId]?.category === SubsystemCategory.BUS,
  );
  const goal =
    MISSION_GOALS.find((candidate) => candidate.id === snapshot.missionGoalId) ??
    MISSION_GOALS[0];
  const busDefinition = busPart
    ? PARTS_BY_ID[busPart.partId]
    : PARTS_BY_ID[goal.blueprintBusId];
  const sockets = busDefinition?.busSockets ?? [];
  const socketById = new Map(sockets.map((socket) => [socket.id, socket]));
  const localUp = new THREE.Vector3(0, 1, 0);

  for (const placed of snapshot.placedParts) {
    const definition = PARTS_BY_ID[placed.partId];
    if (!definition) continue;

    const built = buildPartMesh(placed.partId, placed.finish, materials);
    built.updateDeploy?.(placed.deployed ? 1 : 0);
    const holder = new THREE.Group();
    holder.add(built.group);

    if (definition.category !== SubsystemCategory.BUS) {
      const socket = socketById.get(placed.socketId);
      if (socket) {
        holder.position.set(...socket.position);
        const normal = new THREE.Vector3(...socket.normal).normalize();
        holder.quaternion.setFromUnitVectors(localUp, normal);
        if (placed.rotationStep !== 0) {
          holder.rotateY((placed.rotationStep * Math.PI) / 2);
        }
      }
    }

    root.add(holder);
    parts.push(built);
  }

  return { root, parts };
}

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export const SpaceCanvas: React.FC<SpaceCanvasProps> = ({
  state,
  assemblyBuild,
  launchProgress,
  onSelectPart,
  onDropComponent,
  onTickOperations,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const launchProgressRef = useRef(launchProgress);
  launchProgressRef.current = launchProgress;

  const callbacksRef = useRef({
    onSelectPart,
    onDropComponent,
    onTickOperations,
  });
  callbacksRef.current = { onSelectPart, onDropComponent, onTickOperations };

  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2),
    );
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener(
      'webglcontextrestored',
      handleContextRestored,
    );

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050914);

    // Procedural studio environment for crisp PBR metal & solar reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04,
    ).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      250,
    );
    camera.position.set(0, 2.1, 7.2);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 2.2;
    controls.maxDistance = 16;
    controls.enablePan = false;

    let userInteracting = false;
    let cameraTransitionActive = false;
    const camGoalPos = new THREE.Vector3(0, 2.1, 7.2);
    const camGoalTarget = new THREE.Vector3(0, 0, 0);

    controls.addEventListener('start', () => {
      userInteracting = true;
      cameraTransitionActive = false;
    });
    controls.addEventListener('end', () => {
      userInteracting = false;
    });

    // 3-Point Space & Studio Lighting
    const sunLight = new THREE.DirectionalLight(0xfff5e4, 2.75);
    sunLight.position.copy(SUN_DIRECTION).multiplyScalar(25);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0x60a5fa, 0x0f172a, 0.52);
    scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.75);
    rimLight.position.set(-10, -4, -10);
    scene.add(rimLight);

    // Procedural Textures
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const textures = createProceduralTextures(maxAniso);

    // Deep-Space Starfield (1800 stars)
    const starCount = 1800;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 45 + (i % 40) * 1.4;
      const theta = ((i * 137.5) % 360) * (Math.PI / 180);
      const phi = Math.acos(1 - (2 * (i + 0.5)) / starCount);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const tint = i % 5 === 0 ? [0.7, 0.85, 1.0] : i % 7 === 0 ? [1.0, 0.9, 0.75] : [0.95, 0.97, 1.0];
      starColors[i * 3] = tint[0];
      starColors[i * 3 + 1] = tint[1];
      starColors[i * 3 + 2] = tint[2];
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.22,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // 1. Orbital Earth & Satellite Scene Group
    const spaceGroup = new THREE.Group();
    scene.add(spaceGroup);

    const earthAssembly = createEarthAssembly(textures);
    spaceGroup.add(earthAssembly.rootGroup);

    const orbitSat = createSatelliteAssembly(textures);
    orbitSat.rootGroup.scale.setScalar(0.26);
    spaceGroup.add(orbitSat.rootGroup);

    let designedSatelliteRoot: THREE.Group | null = null;
    let designedSatelliteParts: BuiltPartResult[] = [];
    let designedMaterials: MaterialLibrary | null = null;
    let designedTextures: ProceduralTextures | null = null;
    if (assemblyBuild) {
      designedTextures = createAssemblyTextures(maxAniso);
      designedMaterials = createMaterialLibrary(designedTextures, isSoftwareGl);
      const designedSatellite = createDesignedSatellite(
        assemblyBuild,
        designedMaterials,
      );
      designedSatelliteRoot = designedSatellite.root;
      designedSatelliteParts = designedSatellite.parts;
      designedSatelliteRoot.visible = false;
      orbitSat.rootGroup.add(designedSatelliteRoot);
    }

    // Orbit Trajectory Ring
    const orbitLineGeo = new THREE.BufferGeometry();
    const orbitLineMat = new THREE.LineBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.65,
    });
    const orbitLine = new THREE.Line(orbitLineGeo, orbitLineMat);
    spaceGroup.add(orbitLine);

    // Ground Station RF Downlink Beam (Line + Signal Pulse Ring)
    const commsBeamGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]);
    const commsBeamMat = new THREE.LineBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.9,
    });
    const commsBeam = new THREE.Line(commsBeamGeo, commsBeamMat);
    commsBeam.visible = false;
    spaceGroup.add(commsBeam);

    // 2. Designer Workshop Group (Hero Satellite centered)
    const designerGroup = new THREE.Group();
    designerGroup.visible = false;
    scene.add(designerGroup);

    const designerSat = createSatelliteAssembly(textures);
    designerSat.rootGroup.scale.setScalar(1.15);
    designerGroup.add(designerSat.rootGroup);

    // Subtle calibration floor grid in Designer (offset to avoid Z-fighting)
    const gridHelper = new THREE.GridHelper(6, 16, 0x1e3a5f, 0x0f1f38);
    gridHelper.position.y = -1.35;
    designerGroup.add(gridHelper);

    // 3. Launch Sequence Group
    const launchSceneGroup = new THREE.Group();
    launchSceneGroup.visible = false;
    scene.add(launchSceneGroup);

    const launchAssembly = createLaunchAssembly();
    launchSceneGroup.add(launchAssembly.rootGroup);

    const launchPayloadSat = createSatelliteAssembly(textures);
    launchAssembly.payloadMount.add(launchPayloadSat.rootGroup);

    // Track current orbit line & design signature so we only rebuild geometry when changed
    let cachedOrbitId = '';
    let cachedDesignKey = '';
    let lastStage = '';
    let lastTargetId = '';
    let lastCamMode = '';

    const rebuildOrbitLine = (orbitId: MissionState['selectedOrbit']) => {
      const orbit = ORBIT_MAP[orbitId];
      const pts = sampleOrbitPath(orbit, 144);
      orbitLineGeo.setFromPoints(pts);
      cachedOrbitId = orbitId;
    };
    rebuildOrbitLine(stateRef.current.selectedOrbit);

    // Raycasting for Spacecraft Designer part inspection
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      if (stateRef.current.stage !== 'designer') return;
      const distMoved = Math.hypot(
        e.clientX - pointerDownPos.x,
        e.clientY - pointerDownPos.y,
      );
      if (distMoved > 6) return; // Was an orbit drag, not a click

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(designerSat.rootGroup.children, true);
      if (hits.length > 0) {
        let obj: THREE.Object3D | null = hits[0].object;
        while (obj && !obj.userData.partId) {
          obj = obj.parent;
        }
        if (obj?.userData.partId) {
          callbacksRef.current.onSelectPart(obj.userData.partId as ComponentId);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // Resize observer
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObs = new ResizeObserver(handleResize);
    resizeObs.observe(container);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const clock = new THREE.Clock();
    let menuPhase = 0.4;
    let menuEarthRot = 0.4;
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const status = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (status === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function applyCameraPreset(stage: string, targetId: string, camMode: string) {
      cameraTransitionActive = true;
      if (stage === 'menu') {
        camGoalPos.set(-1.6, 1.4, 6.2);
        camGoalTarget.set(0.08, 0, 0);
        controls.minDistance = 3.5;
        controls.maxDistance = 12;
      } else if (stage === 'briefing' || stage === 'report') {
        camGoalPos.set(-1.6, 1.4, 6.2);
        camGoalTarget.set(0.35, 0, 0);
        controls.minDistance = 3.5;
        controls.maxDistance = 12;
      } else if (stage === 'designer') {
        camGoalPos.set(2.3, 1.5, 3.2);
        camGoalTarget.set(0, 0, 0);
        controls.minDistance = 1.9;
        controls.maxDistance = 7.5;
      } else if (stage === 'orbit') {
        const region = TARGET_REGION_MAP[targetId as MissionState['selectedTargetRegion']];
        if (region) {
          latLonToWorldVector(region.latDeg, region.lonDeg, 7.6, menuEarthRot, camGoalPos);
          camGoalPos.y = THREE.MathUtils.clamp(camGoalPos.y, -4.5, 4.8);
        } else {
          camGoalPos.set(0, 2.8, 7.8);
        }
        camGoalTarget.set(0, 0, 0);
        controls.minDistance = 3.4;
        controls.maxDistance = 13.5;
      } else if (stage === 'launch') {
        camGoalPos.set(9.5, 4.2, 11.5);
        camGoalTarget.set(0, 3.8, 0);
        controls.minDistance = 4;
        controls.maxDistance = 30;
      } else if (stage === 'operations') {
        if (camMode === 'earth') {
          camGoalPos.set(0, 2.8, 8.2);
          camGoalTarget.set(0, 0, 0);
        }
        controls.minDistance = 1.6;
        controls.maxDistance = 14;
      }
    }

    function tick() {
      if (disposed) return;
      const dt = Math.min(0.05, clock.getDelta());
      const elapsed = clock.elapsedTime;
      const st = stateRef.current;

      // Rebuild satellite geometry if design changed
      const previewDesign =
        st.stage === 'menu' || st.stage === 'briefing'
          ? MENU_PREVIEW_DESIGN
          : st.design;
      const showDesignedSatellite =
        Boolean(designedSatelliteRoot) &&
        (st.stage === 'orbit' || st.stage === 'operations');
      const designKey = `${previewDesign.bus}-${previewDesign.solar}-${previewDesign.battery}-${previewDesign.imager}-${previewDesign.antenna}-${previewDesign.sensor}-${st.selectedComponentId}-${showDesignedSatellite}`;
      if (designKey !== cachedDesignKey) {
        orbitSat.updateFromDesign(previewDesign, null);
        if (showDesignedSatellite) {
          for (const groups of orbitSat.partMeshes.values()) {
            groups.forEach((group) => {
              group.visible = false;
            });
          }
        }
        if (designedSatelliteRoot) {
          designedSatelliteRoot.visible = showDesignedSatellite;
        }
        designerSat.updateFromDesign(st.design, st.selectedComponentId);
        launchPayloadSat.updateFromDesign(st.design, null);
        cachedDesignKey = designKey;
      }

      if (st.selectedOrbit !== cachedOrbitId) {
        rebuildOrbitLine(st.selectedOrbit);
      }

      // Detect stage/target/camera mode changes for smooth camera transitions
      if (
        st.stage !== lastStage ||
        (st.stage === 'orbit' && st.selectedTargetRegion !== lastTargetId) ||
        (st.stage === 'operations' && st.operations.cameraMode !== lastCamMode)
      ) {
        applyCameraPreset(st.stage, st.selectedTargetRegion, st.operations.cameraMode);
        lastStage = st.stage;
        lastTargetId = st.selectedTargetRegion;
        lastCamMode = st.operations.cameraMode;
      }

      // Stage visibility toggles
      const isSpaceStage =
        st.stage === 'menu' ||
        st.stage === 'briefing' ||
        st.stage === 'orbit' ||
        st.stage === 'operations' ||
        st.stage === 'report';
      spaceGroup.visible = isSpaceStage;
      designerGroup.visible = st.stage === 'designer';
      launchSceneGroup.visible = st.stage === 'launch';

      // Subtle star rotation
      starField.rotation.y += dt * 0.005;

      if (st.stage === 'designer') {
        controls.enabled = true;
        designerSat.rootGroup.rotation.y += dt * 0.18;
      } else if (st.stage === 'launch') {
        controls.enabled = false;
        const p = launchProgressRef.current;
        launchAssembly.updateLaunchAnimation(p, dt);

        // Cinematic scripted launch camera phases
        const rocketY = launchAssembly.rocketGroup.position.y;
        const payloadWorldY =
          rocketY + launchAssembly.payloadMount.position.y;

        if (p < 0.25) {
          _vecA.set(9.2, 4.2, 10.8);
          _vecB.set(0, 3.8, 0);
        } else if (p < 0.62) {
          _vecA.set(9.5 + p * 6, rocketY + 3.2, 11.5);
          _vecB.set(0, rocketY + 4.5, 0);
        } else if (p < 0.8) {
          _vecA.set(4.5, payloadWorldY + 1.2, 5.5);
          _vecB.set(0, payloadWorldY, 0);
        } else {
          _vecA.set(3.2, payloadWorldY + 0.9, 3.8);
          _vecB.set(0, payloadWorldY, 0);
        }
        camera.position.lerp(_vecA, 1 - Math.exp(-3.5 * dt));
        controls.target.lerp(_vecB, 1 - Math.exp(-4.5 * dt));
        controls.update();
      } else if (st.stage === 'operations') {
        controls.enabled = true;
        callbacksRef.current.onTickOperations(dt);

        const op = stateRef.current.operations;
        earthAssembly.earthSpinGroup.rotation.y = op.earthRotationRad;
        earthAssembly.cloudMesh.rotation.y = op.earthRotationRad * 0.14;

        orbitSat.rootGroup.position.set(
          op.satellitePosition[0],
          op.satellitePosition[1],
          op.satellitePosition[2],
        );

        // Orient satellite nadir (-Y) toward Earth's center
        _vecA.copy(orbitSat.rootGroup.position).normalize(); // outward radial (+Y in sat local)
        _vecB.set(0, 1, 0);
        _targetQuat.setFromUnitVectors(_vecB, _vecA);
        orbitSat.rootGroup.quaternion.copy(_targetQuat);

        // Scanning cone & ground footprint
        orbitSat.setScanActive(
          op.imagerEnabled && op.isObserving,
          op.observationDirectionDeg,
          op.elapsedSec,
        );

        // Ground station & target markers
        earthAssembly.updateMarkers(
          st.selectedTargetRegion,
          op.availableGroundStationIds,
          op.activeGroundStationId,
          elapsed,
        );

        // Active RF Ground Station Comms Beam
        if (op.isTransmitting && op.activeGroundStationId) {
          const gs = GROUND_STATIONS.find(
            (g) => g.id === op.activeGroundStationId,
          );
          if (gs) {
            latLonToWorldVector(
              gs.latDeg,
              gs.lonDeg,
              EARTH_RADIUS_SCENE + 0.05,
              op.earthRotationRad,
              _vecC,
            );
            const posAttr = commsBeamGeo.getAttribute(
              'position',
            ) as THREE.BufferAttribute;
            posAttr.setXYZ(
              0,
              orbitSat.rootGroup.position.x,
              orbitSat.rootGroup.position.y,
              orbitSat.rootGroup.position.z,
            );
            posAttr.setXYZ(1, _vecC.x, _vecC.y, _vecC.z);
            posAttr.needsUpdate = true;
            commsBeam.visible = true;
            commsBeamMat.opacity = 0.55 + Math.sin(elapsed * 12) * 0.35;
          } else {
            commsBeam.visible = false;
          }
        } else {
          commsBeam.visible = false;
        }

        // Follow Satellite Camera Mode
        if (op.cameraMode === 'satellite' && !userInteracting) {
          _vecA.copy(orbitSat.rootGroup.position);
          _vecB.copy(_vecA).normalize().multiplyScalar(2.1);
          _vecC.copy(_vecA).add(_vecB).add(_up.clone().multiplyScalar(0.85));
          camera.position.lerp(_vecC, 1 - Math.exp(-4.5 * dt));
          controls.target.lerp(_vecA, 1 - Math.exp(-5.5 * dt));
        }
      } else {
        // Menu / Briefing / Orbit Designer / Report preview orbit
        controls.enabled = st.stage === 'orbit';
        const orbit = ORBIT_MAP[st.selectedOrbit];
        menuPhase = (menuPhase + dt * ((Math.PI * 2) / orbit.periodSeconds)) % (Math.PI * 2);
        menuEarthRot += dt * 0.04;

        earthAssembly.earthSpinGroup.rotation.y = menuEarthRot;
        earthAssembly.cloudMesh.rotation.y = menuEarthRot * 0.16;

        computeOrbitPosition(orbit, menuPhase, _vecA);
        orbitSat.rootGroup.position.copy(_vecA);
        _vecB.copy(_vecA).normalize();
        _targetQuat.setFromUnitVectors(_up, _vecB);
        orbitSat.rootGroup.quaternion.copy(_targetQuat);
        orbitSat.setScanActive(false, 0, elapsed);
        commsBeam.visible = false;

        earthAssembly.updateMarkers(
          st.selectedTargetRegion,
          [],
          null,
          elapsed,
        );

        if (st.stage === 'menu') {
          camera.position.x = Math.sin(elapsed * 0.12) * 1.1 - 1.2;
          camera.position.y = 1.2 + Math.cos(elapsed * 0.09) * 0.35;
          camera.position.z = 6.1;
          controls.target.set(0.08, 0, 0);
        }
      }

      for (const part of designedSatelliteParts) {
        part.updateOrbitFx?.(elapsed, st.stage === 'operations');
      }

      // Smooth exponential camera preset transition
      if (cameraTransitionActive && st.stage !== 'launch' && st.stage !== 'menu') {
        const damp = 1 - Math.exp(-5.0 * dt);
        camera.position.lerp(camGoalPos, damp);
        controls.target.lerp(camGoalTarget, damp);
        if (
          camera.position.distanceTo(camGoalPos) < 0.04 &&
          controls.target.distanceTo(camGoalTarget) < 0.04
        ) {
          cameraTransitionActive = false;
        }
      }

      if (st.stage !== 'launch') {
        controls.update();
      }

      // Keep look matrix variable referenced cleanly
      _lookMat.identity();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObs.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener(
        'webglcontextlost',
        handleContextLost,
      );
      renderer.domElement.removeEventListener(
        'webglcontextrestored',
        handleContextRestored,
      );
      controls.dispose();
      textures.dispose();
      designedMaterials?.dispose();
      designedTextures?.dispose();
      designedSatelliteRoot?.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
        }
      });
      envTexture.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (state.stage === 'designer') {
      e.preventDefault();
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (state.stage !== 'designer') return;
    e.preventDefault();
    const partId = e.dataTransfer.getData('text/component-id') as ComponentId;
    if (partId) {
      onDropComponent(partId);
    }
  };

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-[#050914]"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div ref={mountRef} className="w-full h-full" />
      {contextLost && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#050914]/90 z-50">
          <div className="hud-panel rounded-xl px-6 py-5 text-center max-w-md">
            <h2 className="font-display text-lg font-semibold text-white mb-2">
              3D Graphics Context Interrupted
            </h2>
            <p className="text-sm text-slate-300">
              Your browser paused WebGL rendering. Restoring orbital viewport...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
