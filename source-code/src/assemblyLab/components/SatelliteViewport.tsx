import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { MISSION_GOALS, PARTS_BY_ID } from '../data/partsCatalog';
import { createMaterialLibrary, MaterialLibrary } from '../three/materials';
import { buildAssemblyPedestal, buildPartMesh, BuiltPartResult } from '../three/partMeshes';
import { createProceduralTextures } from '../three/textures';
import {
  CameraPreset,
  MissionGoalId,
  PlacedPart,
  SocketDefinition,
  SubsystemCategory,
  SurfaceFinish,
} from '../types/satellite';

export interface CameraTargetRequest {
  id: number;
  position: [number, number, number];
  target: [number, number, number];
}

export interface Hovered3DTarget {
  kind: 'blueprint' | 'placed' | 'socket';
  partId?: string;
  instanceId?: string;
  socketId: string;
  label: string;
  screenX: number;
  screenY: number;
}

interface SatelliteViewportProps {
  placedParts: PlacedPart[];
  missionGoalId: MissionGoalId;
  selectedInstanceId: string | null;
  selectedCatalogPartId: string | null;
  activeSocketId: string | null;
  highlightedPartId: string | null;
  highlightedSocketId: string | null;
  showOutlineOverlay: boolean;
  explodeAmount: number;
  deployProgress: number;
  autoRotate: boolean;
  inOrbit: boolean;
  cameraPresetRequest: { id: number; preset: CameraPreset } | null;
  cameraTargetRequest: CameraTargetRequest | null;
  onClickBlueprintSlot: (partId: string, socketId: string) => void;
  onClickPlacedPart: (instanceId: string) => void;
  onClickEmptySocket: (socketId: string) => void;
  onHoverTargetChange: (target: Hovered3DTarget | null) => void;
}

const SPACECRAFT_CENTER_Y = 1.82;
const UP_VEC = new THREE.Vector3(0, 1, 0);
const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _mat4 = new THREE.Matrix4();
const _invMat4 = new THREE.Matrix4();
const _box3 = new THREE.Box3();
const _mouse = new THREE.Vector2();

const PRESET_VIEWS: Record<
  CameraPreset,
  { pos: [number, number, number]; target: [number, number, number] }
> = {
  [CameraPreset.ISO]: { pos: [4.7, 3.6, 5.4], target: [0, SPACECRAFT_CENTER_Y, 0] },
  [CameraPreset.FRONT]: { pos: [0, SPACECRAFT_CENTER_Y + 0.25, 6.4], target: [0, SPACECRAFT_CENTER_Y, 0] },
  [CameraPreset.TOP]: { pos: [0, SPACECRAFT_CENTER_Y + 6.4, 0.35], target: [0, SPACECRAFT_CENTER_Y, 0] },
  [CameraPreset.SIDE]: { pos: [6.5, SPACECRAFT_CENTER_Y + 0.35, 0.35], target: [0, SPACECRAFT_CENTER_Y, 0] },
};

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createSpaceBackground(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const context = canvas.getContext('2d')!;
  const base = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  base.addColorStop(0, '#080d20');
  base.addColorStop(0.48, '#11152b');
  base.addColorStop(1, '#07101d');
  context.fillStyle = base;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const nebulae = [
    { x: 0.2, y: 0.36, radius: 0.34, color: '56, 88, 190' },
    { x: 0.72, y: 0.24, radius: 0.29, color: '123, 64, 166' },
    { x: 0.56, y: 0.82, radius: 0.3, color: '20, 112, 142' },
  ];
  for (const nebula of nebulae) {
    const centerX = canvas.width * nebula.x;
    const centerY = canvas.height * nebula.y;
    const radius = canvas.width * nebula.radius;
    const glow = context.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      radius,
    );
    glow.addColorStop(0, `rgba(${nebula.color}, 0.23)`);
    glow.addColorStop(0.5, `rgba(${nebula.color}, 0.09)`);
    glow.addColorStop(1, `rgba(${nebula.color}, 0)`);
    context.fillStyle = glow;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  let seed = 3917;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < 440; i++) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    const radius = 0.45 + random() * 1.15;
    const alpha = 0.25 + random() * 0.65;
    context.beginPath();
    context.fillStyle = `rgba(220, 235, 255, ${alpha})`;
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createWhiteOutlineFromGroup(
  sourceGroup: THREE.Group,
  edgeThresholdDeg = 20
): {
  outlineGroup: THREE.Group;
  lines: THREE.LineSegments[];
  ghosts: THREE.Mesh[];
  disposables: Array<{ dispose: () => void }>;
} {
  const outlineGroup = new THREE.Group();
  const lines: THREE.LineSegments[] = [];
  const ghosts: THREE.Mesh[] = [];
  const disposables: Array<{ dispose: () => void }> = [];

  sourceGroup.updateMatrixWorld(true);
  _invMat4.copy(sourceGroup.matrixWorld).invert();

  const ghostMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.03,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  disposables.push(ghostMat);

  sourceGroup.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const mat = child.material as THREE.Material;
    // Skip transparent thruster exhaust cones from outline
    if (mat.transparent && mat.depthWrite === false && !child.geometry.type.includes('Sphere')) {
      return;
    }

    const edgesGeom = new THREE.EdgesGeometry(child.geometry, edgeThresholdDeg);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    });
    disposables.push(edgesGeom, lineMat);

    _mat4.copy(_invMat4).multiply(child.matrixWorld);
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scl = new THREE.Vector3();
    _mat4.decompose(pos, quat, scl);

    const seg = new THREE.LineSegments(edgesGeom, lineMat);
    seg.position.copy(pos);
    seg.quaternion.copy(quat);
    seg.scale.copy(scl);
    outlineGroup.add(seg);
    lines.push(seg);

    const ghost = new THREE.Mesh(child.geometry, ghostMat);
    ghost.position.copy(pos);
    ghost.quaternion.copy(quat);
    ghost.scale.copy(scl);
    outlineGroup.add(ghost);
    ghosts.push(ghost);
  });

  return { outlineGroup, lines, ghosts, disposables };
}

function orientGroupToSocket(group: THREE.Object3D, sock: SocketDefinition, rotationStep = 0) {
  group.position.set(sock.position[0], sock.position[1], sock.position[2]);
  _vecA.set(sock.normal[0], sock.normal[1], sock.normal[2]).normalize();
  _quat.setFromUnitVectors(UP_VEC, _vecA);
  group.quaternion.copy(_quat);
  if (rotationStep !== 0) {
    group.rotateY((rotationStep * Math.PI) / 2);
  }
}

export const SatelliteViewport: React.FC<SatelliteViewportProps> = ({
  placedParts,
  missionGoalId,
  selectedInstanceId,
  selectedCatalogPartId,
  activeSocketId,
  highlightedPartId,
  highlightedSocketId,
  showOutlineOverlay,
  explodeAmount,
  deployProgress,
  autoRotate,
  inOrbit,
  cameraPresetRequest,
  cameraTargetRequest,
  onClickBlueprintSlot,
  onClickPlacedPart,
  onClickEmptySocket,
  onHoverTargetChange,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [contextLost, setContextLost] = useState(false);

  const stateRef = useRef({
    placedParts,
    missionGoalId,
    selectedInstanceId,
    selectedCatalogPartId,
    activeSocketId,
    highlightedPartId,
    highlightedSocketId,
    showOutlineOverlay,
    explodeAmount,
    deployProgress,
    autoRotate,
    inOrbit,
    hoveredKey: null as string | null,
  });

  stateRef.current.placedParts = placedParts;
  stateRef.current.missionGoalId = missionGoalId;
  stateRef.current.selectedInstanceId = selectedInstanceId;
  stateRef.current.selectedCatalogPartId = selectedCatalogPartId;
  stateRef.current.activeSocketId = activeSocketId;
  stateRef.current.highlightedPartId = highlightedPartId;
  stateRef.current.highlightedSocketId = highlightedSocketId;
  stateRef.current.showOutlineOverlay = showOutlineOverlay;
  stateRef.current.explodeAmount = explodeAmount;
  stateRef.current.deployProgress = deployProgress;
  stateRef.current.autoRotate = autoRotate;
  stateRef.current.inOrbit = inOrbit;

  const callbacksRef = useRef({
    onClickBlueprintSlot,
    onClickPlacedPart,
    onClickEmptySocket,
    onHoverTargetChange,
  });
  callbacksRef.current = {
    onClickBlueprintSlot,
    onClickPlacedPart,
    onClickEmptySocket,
    onHoverTargetChange,
  };

  const rebuildFnRef = useRef<(() => void) | null>(null);

  const cameraAnimRef = useRef<{
    active: boolean;
    desiredPos: THREE.Vector3;
    desiredTarget: THREE.Vector3;
  }>({
    active: false,
    desiredPos: new THREE.Vector3(...PRESET_VIEWS[CameraPreset.ISO].pos),
    desiredTarget: new THREE.Vector3(...PRESET_VIEWS[CameraPreset.ISO].target),
  });

  useEffect(() => {
    if (!cameraPresetRequest) return;
    const cfg = PRESET_VIEWS[cameraPresetRequest.preset];
    cameraAnimRef.current.desiredPos.set(...cfg.pos);
    cameraAnimRef.current.desiredTarget.set(...cfg.target);
    cameraAnimRef.current.active = true;
  }, [cameraPresetRequest]);

  useEffect(() => {
    if (!cameraTargetRequest) return;
    cameraAnimRef.current.desiredPos.set(...cameraTargetRequest.position);
    cameraAnimRef.current.desiredTarget.set(...cameraTargetRequest.target);
    cameraAnimRef.current.active = true;
  }, [cameraTargetRequest]);

  // Trigger 3D spacecraft rebuild whenever placedParts, missionGoalId, or showOutlineOverlay changes
  useEffect(() => {
    rebuildFnRef.current?.();
  }, [placedParts, missionGoalId, showOutlineOverlay, inOrbit, selectedCatalogPartId, activeSocketId]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setContextLost(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => setContextLost(false);
    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    const scene = new THREE.Scene();
    const spaceBackground = createSpaceBackground();
    scene.background = spaceBackground;
    scene.fog = new THREE.FogExp2(0x070a11, 0.028);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 140);
    camera.position.set(...PRESET_VIEWS[CameraPreset.ISO].pos);

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(...PRESET_VIEWS[CameraPreset.ISO].target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 2.6;
    controls.maxDistance = 14;
    controls.enablePan = true;
    controls.addEventListener('start', () => {
      cameraAnimRef.current.active = false;
    });

    // Studio Environment Reflection (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // 3-Point Warm/Cool Studio Lighting Rig
    const keyLight = new THREE.DirectionalLight(0xfff5e4, 2.35);
    keyLight.position.set(5.5, 8.5, 5.5);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 24;
      keyLight.shadow.camera.left = -5;
      keyLight.shadow.camera.right = 5;
      keyLight.shadow.camera.top = 6;
      keyLight.shadow.camera.bottom = -4;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const hemiFill = new THREE.HemisphereLight(0xb8d4ff, 0x162033, 0.78);
    scene.add(hemiFill);

    const rimLight = new THREE.DirectionalLight(0x60a5fa, 1.15);
    rimLight.position.set(-6, 4.5, -5.5);
    scene.add(rimLight);

    if (!isSoftwareGl) {
      RectAreaLightUniformsLib.init();
      const softbox = new THREE.RectAreaLight(0xe0f2fe, 2.2, 4.5, 2.5);
      softbox.position.set(-4.2, 5.2, 4.2);
      softbox.lookAt(0, SPACECRAFT_CENTER_Y, 0);
      scene.add(softbox);
    }

    // Textures & Materials from existing library
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const textures = createProceduralTextures(maxAnisotropy);
    const mats: MaterialLibrary = createMaterialLibrary(textures, isSoftwareGl);

    // Cleanroom Assembly Bay Floor + Rotary Pedestal
    const cleanroomGroup = new THREE.Group();
    scene.add(cleanroomGroup);

    const floorPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 16),
      new THREE.MeshStandardMaterial({
        map: textures.cleanroomFloor,
        roughness: 0.78,
        metalness: 0.15,
      })
    );
    floorPlane.rotation.x = -Math.PI / 2;
    floorPlane.receiveShadow = true;
    cleanroomGroup.add(floorPlane);

    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(5.5, 5.5),
      new THREE.MeshBasicMaterial({
        map: textures.contactShadow,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
      })
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.012;
    cleanroomGroup.add(contactShadow);

    const pedestal = buildAssemblyPedestal(mats);
    cleanroomGroup.add(pedestal);

    // Starfield
    const starCount = 520;
    const starPositions = new Float32Array(starCount * 3);
    let seed = 9187;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < starCount; i++) {
      const r = 20 + rand() * 48;
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);
    }
    const starGeom = new THREE.BufferGeometry();
    starGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x94a3b8,
      size: 0.11,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    const stars = new THREE.Points(starGeom, starMat);
    scene.add(stars);

    // Earth Globe for Orbit Mode
    const earthGeom = new THREE.SphereGeometry(28, 48, 32);
    const earthMat = new THREE.MeshStandardMaterial({
      map: textures.earthAlbedo,
      roughness: 0.8,
      metalness: 0.05,
    });
    const earthMesh = new THREE.Mesh(earthGeom, earthMat);
    earthMesh.position.set(0, -31.5, -10);
    earthMesh.visible = false;
    scene.add(earthMesh);

    // Spacecraft Assembly Root
    const spacecraftRoot = new THREE.Group();
    spacecraftRoot.position.y = SPACECRAFT_CENTER_Y;
    scene.add(spacecraftRoot);

    interface ActivePlacedEntry {
      instanceId: string;
      partId: string;
      socketId: string;
      holder: THREE.Group;
      basePos: THREE.Vector3;
      explodeDir: THREE.Vector3;
      mountAnim: number;
      built: BuiltPartResult;
    }

    interface ActiveOutlineEntry {
      key: string;
      kind: 'blueprint' | 'socket';
      partId?: string;
      socketId: string;
      required: boolean;
      holder: THREE.Group;
      basePos: THREE.Vector3;
      explodeDir: THREE.Vector3;
      lines: THREE.LineSegments[];
      ghosts: THREE.Mesh[];
      ringMesh?: THREE.Mesh;
    }

    let placedEntries: ActivePlacedEntry[] = [];
    let outlineEntries: ActiveOutlineEntry[] = [];
    let hitProxies: THREE.Object3D[] = [];
    let dynamicDisposables: Array<{ dispose: () => void }> = [];
    const seenInstalledIds = new Set<string>();

    const clearSpacecraft = () => {
      while (spacecraftRoot.children.length > 0) {
        spacecraftRoot.remove(spacecraftRoot.children[0]);
      }
      dynamicDisposables.forEach((d) => {
        try {
          d.dispose();
        } catch {
          // ignore
        }
      });
      dynamicDisposables = [];
      placedEntries = [];
      outlineEntries = [];
      hitProxies = [];
    };

    const rebuildSpacecraft = () => {
      clearSpacecraft();

      const st = stateRef.current;
      const goal =
        MISSION_GOALS.find((g) => g.id === st.missionGoalId) ?? MISSION_GOALS[0];

      const placedBus = st.placedParts.find(
        (p) => PARTS_BY_ID[p.partId]?.category === SubsystemCategory.BUS
      );
      const busDef = placedBus ? PARTS_BY_ID[placedBus.partId] : undefined;
      const blueprintBusDef = PARTS_BY_ID[goal.blueprintBusId];
      const activeSockets = busDef?.busSockets ?? blueprintBusDef?.busSockets ?? [];
      const socketMap = new Map(activeSockets.map((s) => [s.id, s]));

      const occupiedSocketIds = new Set<string>();

      // 1. Build all currently placed parts (starts EMPTY at 0 parts!)
      for (const placed of st.placedParts) {
        const def = PARTS_BY_ID[placed.partId];
        if (!def) continue;

        const isBus = def.category === SubsystemCategory.BUS;
        const sock = isBus ? undefined : socketMap.get(placed.socketId);
        if (!isBus) {
          occupiedSocketIds.add(placed.socketId);
        }

        const built = buildPartMesh(placed.partId, placed.finish, mats, false);
        if (built.updateDeploy) {
          built.updateDeploy(placed.deployed ? st.deployProgress : 0);
        }

        const holder = new THREE.Group();
        holder.add(built.group);

        const basePos = new THREE.Vector3(0, 0, 0);
        const explodeDir = new THREE.Vector3(0, 0, 0);

        if (sock) {
          orientGroupToSocket(holder, sock, placed.rotationStep);
          basePos.copy(holder.position);
          explodeDir.set(sock.normal[0], sock.normal[1], sock.normal[2]).normalize();
        }

        const isNewlyAdded = !seenInstalledIds.has(placed.instanceId);
        seenInstalledIds.add(placed.instanceId);
        const initialMountAnim = isNewlyAdded ? 0 : 1;

        if (initialMountAnim < 1 && !isBus) {
          holder.position.copy(basePos).addScaledVector(explodeDir, 1.35);
        } else if (initialMountAnim < 1 && isBus) {
          holder.position.set(0, 1.4, 0);
        }

        spacecraftRoot.add(holder);

        // Compute bounding box proxy for clicking/hovering installed part
        holder.updateMatrixWorld(true);
        _box3.setFromObject(built.group);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        _box3.getSize(size);
        _box3.getCenter(center);

        const proxyGeom = new THREE.BoxGeometry(
          Math.max(size.x, 0.25),
          Math.max(size.y, 0.25),
          Math.max(size.z, 0.25)
        );
        const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
        const proxy = new THREE.Mesh(proxyGeom, proxyMat);
        // Convert world center to holder local
        holder.worldToLocal(center);
        proxy.position.copy(center);
        proxy.layers.set(1);
        proxy.userData = {
          kind: 'placed',
          instanceId: placed.instanceId,
          partId: placed.partId,
          socketId: placed.socketId,
          label: def.name,
        };
        holder.add(proxy);
        hitProxies.push(proxy);

        // Track geometries created by buildPartMesh for cleanup
        built.group.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            dynamicDisposables.push(obj.geometry);
          }
        });
        dynamicDisposables.push(proxyGeom, proxyMat);

        placedEntries.push({
          instanceId: placed.instanceId,
          partId: placed.partId,
          socketId: placed.socketId,
          holder,
          basePos,
          explodeDir,
          mountAnim: initialMountAnim,
          built,
        });
      }

      // 2. Render White Blueprint Outlines for ALL missing required blueprint parts (and Bus if missing!)
      if (!st.inOrbit) {
        // 2a. Bus White Outline if no bus installed (or if outline overlay toggled)
        if (!placedBus || st.showOutlineOverlay) {
          const busTargetId = busDef?.id ?? goal.blueprintBusId;
          const busBuilt = buildPartMesh(busTargetId, SurfaceFinish.TITANIUM, mats, false);
          const { outlineGroup, lines, ghosts, disposables } = createWhiteOutlineFromGroup(
            busBuilt.group,
            20
          );
          busBuilt.group.traverse((o) => {
            if (o instanceof THREE.Mesh) o.geometry.dispose();
          });
          dynamicDisposables.push(...disposables);

          const holder = new THREE.Group();
          holder.add(outlineGroup);
          spacecraftRoot.add(holder);

          if (!placedBus) {
            _box3.setFromObject(outlineGroup);
            const size = new THREE.Vector3();
            const center = new THREE.Vector3();
            _box3.getSize(size);
            _box3.getCenter(center);
            holder.worldToLocal(center);
            const pGeom = new THREE.BoxGeometry(
              Math.max(size.x, 0.8),
              Math.max(size.y, 0.8),
              Math.max(size.z, 0.8)
            );
            const pMat = new THREE.MeshBasicMaterial({ visible: false });
            const proxy = new THREE.Mesh(pGeom, pMat);
            proxy.position.copy(center);
            proxy.layers.set(1);
            proxy.userData = {
              kind: 'blueprint',
              partId: busTargetId,
              socketId: 'bus_center',
              label: PARTS_BY_ID[busTargetId]?.name ?? 'Bus Chassis',
            };
            holder.add(proxy);
            hitProxies.push(proxy);
            dynamicDisposables.push(pGeom, pMat);
          }

          outlineEntries.push({
            key: `bp_bus_${busTargetId}`,
            kind: 'blueprint',
            partId: busTargetId,
            socketId: 'bus_center',
            required: true,
            holder,
            basePos: new THREE.Vector3(0, 0, 0),
            explodeDir: new THREE.Vector3(0, 0, 0),
            lines,
            ghosts,
          });
        }

        // 2b. Subsystem Blueprint White Outlines
        for (const bp of goal.blueprintParts) {
          const isOccupied = occupiedSocketIds.has(bp.socketId);
          if (isOccupied && !st.showOutlineOverlay) continue;

          const sock = socketMap.get(bp.socketId);
          const partDef = PARTS_BY_ID[bp.partId];
          if (!sock || !partDef) continue;

          const built = buildPartMesh(bp.partId, partDef.defaultFinish, mats, false);
          if (built.updateDeploy) {
            built.updateDeploy(1); // Show full deployed target silhouette
          }
          const { outlineGroup, lines, ghosts, disposables } = createWhiteOutlineFromGroup(
            built.group,
            20
          );
          built.group.traverse((o) => {
            if (o instanceof THREE.Mesh) o.geometry.dispose();
          });
          dynamicDisposables.push(...disposables);

          const holder = new THREE.Group();
          holder.add(outlineGroup);
          orientGroupToSocket(holder, sock, 0);
          spacecraftRoot.add(holder);

          const basePos = holder.position.clone();
          const explodeDir = new THREE.Vector3(
            sock.normal[0],
            sock.normal[1],
            sock.normal[2]
          ).normalize();

          if (!isOccupied) {
            holder.updateMatrixWorld(true);
            _box3.setFromObject(outlineGroup);
            const size = new THREE.Vector3();
            const center = new THREE.Vector3();
            _box3.getSize(size);
            _box3.getCenter(center);
            holder.worldToLocal(center);

            const pGeom = new THREE.BoxGeometry(
              Math.max(size.x, 0.36),
              Math.max(size.y, 0.36),
              Math.max(size.z, 0.36)
            );
            const pMat = new THREE.MeshBasicMaterial({ visible: false });
            const proxy = new THREE.Mesh(pGeom, pMat);
            proxy.position.copy(center);
            proxy.layers.set(1);
            proxy.userData = {
              kind: 'blueprint',
              partId: bp.partId,
              socketId: bp.socketId,
              label: `${partDef.shortName} (${sock.label})`,
            };
            holder.add(proxy);
            hitProxies.push(proxy);
            dynamicDisposables.push(pGeom, pMat);
          }

          outlineEntries.push({
            key: `bp_${bp.socketId}`,
            kind: 'blueprint',
            partId: bp.partId,
            socketId: bp.socketId,
            required: bp.required,
            holder,
            basePos,
            explodeDir,
            lines,
            ghosts,
          });
        }

        // 2c. Additional Empty Sockets on Bus (for custom placement when user selects a catalog part)
        const blueprintSocketSet = new Set(goal.blueprintParts.map((b) => b.socketId));
        const selectedCatalogDef = st.selectedCatalogPartId
          ? PARTS_BY_ID[st.selectedCatalogPartId]
          : undefined;

        for (const sock of activeSockets) {
          if (occupiedSocketIds.has(sock.id)) continue;
          const isCompatible =
            selectedCatalogDef &&
            selectedCatalogDef.compatibleSockets.includes(sock.kind);
          if (blueprintSocketSet.has(sock.id) && !isCompatible) continue;

          const holder = new THREE.Group();
          orientGroupToSocket(holder, sock, 0);

          const ringGeom = new THREE.TorusGeometry(0.14, 0.015, 8, 24);
          ringGeom.rotateX(Math.PI / 2);
          const ringMat = new THREE.MeshBasicMaterial({
            color: isCompatible ? 0x22d3ee : 0x94a3b8,
            transparent: true,
            opacity: isCompatible ? 0.9 : 0.35,
          });
          const ringMesh = new THREE.Mesh(ringGeom, ringMat);
          ringMesh.layers.set(1);
          ringMesh.userData = {
            kind: 'socket',
            socketId: sock.id,
            label: sock.label,
          };
          holder.add(ringMesh);
          spacecraftRoot.add(holder);
          hitProxies.push(ringMesh);
          dynamicDisposables.push(ringGeom, ringMat);

          outlineEntries.push({
            key: `sock_${sock.id}`,
            kind: 'socket',
            socketId: sock.id,
            required: false,
            holder,
            basePos: holder.position.clone(),
            explodeDir: new THREE.Vector3(
              sock.normal[0],
              sock.normal[1],
              sock.normal[2]
            ).normalize(),
            lines: [],
            ghosts: [],
            ringMesh,
          });
        }
      }
    };

    rebuildFnRef.current = rebuildSpacecraft;
    rebuildSpacecraft();

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Raycasting for 3D hover & click
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    let lastHoverTs = 0;
    let pointerDownXY = { x: 0, y: 0 };

    const updateMouse = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      _mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    const pickHit = () => {
      raycaster.setFromCamera(_mouse, camera);
      const hits = raycaster.intersectObjects(hitProxies, false);
      return hits.length > 0 ? hits[0].object : null;
    };

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverTs < 35) return;
      lastHoverTs = now;

      updateMouse(e.clientX, e.clientY);
      const obj = pickHit();
      if (obj) {
        const ud = obj.userData as {
          kind: 'blueprint' | 'placed' | 'socket';
          partId?: string;
          instanceId?: string;
          socketId: string;
          label: string;
        };
        stateRef.current.hoveredKey = ud.instanceId ?? `${ud.kind}_${ud.socketId}`;
        canvas.style.cursor = 'pointer';
        const rect = canvas.getBoundingClientRect();
        callbacksRef.current.onHoverTargetChange({
          kind: ud.kind,
          partId: ud.partId,
          instanceId: ud.instanceId,
          socketId: ud.socketId,
          label: ud.label,
          screenX: e.clientX - rect.left,
          screenY: e.clientY - rect.top,
        });
      } else {
        stateRef.current.hoveredKey = null;
        canvas.style.cursor = 'grab';
        callbacksRef.current.onHoverTargetChange(null);
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownXY = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - pointerDownXY.x, e.clientY - pointerDownXY.y) > 6) return;
      updateMouse(e.clientX, e.clientY);
      const obj = pickHit();
      if (!obj) return;
      const ud = obj.userData as {
        kind: 'blueprint' | 'placed' | 'socket';
        partId?: string;
        instanceId?: string;
        socketId: string;
      };
      if (ud.kind === 'blueprint' && ud.partId) {
        callbacksRef.current.onClickBlueprintSlot(ud.partId, ud.socketId);
      } else if (ud.kind === 'placed' && ud.instanceId) {
        callbacksRef.current.onClickPlacedPart(ud.instanceId);
      } else if (ud.kind === 'socket') {
        callbacksRef.current.onClickEmptySocket(ud.socketId);
      }
    };

    const onPointerLeave = () => {
      stateRef.current.hoveredKey = null;
      canvas.style.cursor = 'grab';
      callbacksRef.current.onHoverTargetChange(null);
    };

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerLeave);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Animation loop with Software WebGL afterDraw pacing
    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;

      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const st = stateRef.current;

      // Damped camera preset/focus transition
      if (cameraAnimRef.current.active) {
        const lambda = 7.5;
        camera.position.x = THREE.MathUtils.damp(
          camera.position.x,
          cameraAnimRef.current.desiredPos.x,
          lambda,
          delta
        );
        camera.position.y = THREE.MathUtils.damp(
          camera.position.y,
          cameraAnimRef.current.desiredPos.y,
          lambda,
          delta
        );
        camera.position.z = THREE.MathUtils.damp(
          camera.position.z,
          cameraAnimRef.current.desiredPos.z,
          lambda,
          delta
        );
        controls.target.x = THREE.MathUtils.damp(
          controls.target.x,
          cameraAnimRef.current.desiredTarget.x,
          lambda,
          delta
        );
        controls.target.y = THREE.MathUtils.damp(
          controls.target.y,
          cameraAnimRef.current.desiredTarget.y,
          lambda,
          delta
        );
        controls.target.z = THREE.MathUtils.damp(
          controls.target.z,
          cameraAnimRef.current.desiredTarget.z,
          lambda,
          delta
        );
        if (
          camera.position.distanceTo(cameraAnimRef.current.desiredPos) < 0.02 &&
          controls.target.distanceTo(cameraAnimRef.current.desiredTarget) < 0.02
        ) {
          cameraAnimRef.current.active = false;
        }
      }

      controls.autoRotate = !isSoftwareGl && st.autoRotate && !cameraAnimRef.current.active;
      controls.update();

      // Cleanroom vs Orbit Mode
      cleanroomGroup.visible = !st.inOrbit;
      earthMesh.visible = st.inOrbit;
      if (st.inOrbit) {
        earthMesh.rotation.y += delta * 0.025;
        spacecraftRoot.position.y = SPACECRAFT_CENTER_Y + Math.sin(elapsed * 1.1) * 0.07;
        spacecraftRoot.rotation.y += delta * 0.1;
      } else {
        spacecraftRoot.position.y = THREE.MathUtils.damp(
          spacecraftRoot.position.y,
          SPACECRAFT_CENTER_Y,
          6,
          delta
        );
        spacecraftRoot.rotation.y = THREE.MathUtils.damp(spacecraftRoot.rotation.y, 0, 6, delta);
      }

      // Animate placed parts (glide-in mount + explode + deploy + orbit FX)
      for (const entry of placedEntries) {
        entry.mountAnim = THREE.MathUtils.damp(entry.mountAnim, 1, 9, delta);
        const inv = 1 - entry.mountAnim;
        const isBus = PARTS_BY_ID[entry.partId]?.category === SubsystemCategory.BUS;

        if (isBus) {
          entry.holder.position.set(0, 1.4 * inv, 0);
        } else {
          _vecA.copy(entry.basePos).addScaledVector(
            entry.explodeDir,
            inv * 1.35 + st.explodeAmount * 1.15
          );
          entry.holder.position.copy(_vecA);
        }

        const pObj = st.placedParts.find((p) => p.instanceId === entry.instanceId);
        if (entry.built.updateDeploy && pObj) {
          entry.built.updateDeploy(pObj.deployed ? st.deployProgress : 0);
        }
        if (entry.built.updateOrbitFx) {
          entry.built.updateOrbitFx(elapsed, st.inOrbit);
        }
      }

      // Animate & highlight White Blueprint Outlines
      for (const out of outlineEntries) {
        _vecB.copy(out.basePos).addScaledVector(out.explodeDir, st.explodeAmount * 1.15);
        out.holder.position.copy(_vecB);

        const isHovered =
          st.hoveredKey === `${out.kind}_${out.socketId}` ||
          (out.partId && st.highlightedPartId === out.partId) ||
          st.highlightedSocketId === out.socketId ||
          st.activeSocketId === out.socketId;

        const targetColor = isHovered ? 0x38bdf8 : 0xffffff;
        const targetOpacity = isHovered ? 1.0 : out.required ? 0.78 : 0.45;
        const ghostOpacity = isHovered ? 0.09 : 0.025;

        for (const l of out.lines) {
          const lm = l.material as THREE.LineBasicMaterial;
          lm.color.setHex(targetColor);
          lm.opacity = targetOpacity;
        }
        for (const gh of out.ghosts) {
          const gm = gh.material as THREE.MeshBasicMaterial;
          gm.color.setHex(targetColor);
          gm.opacity = ghostOpacity;
        }
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);

      clearSpacecraft();
      controls.dispose();
      mats.dispose();
      textures.dispose();
      cleanroomGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      starGeom.dispose();
      starMat.dispose();
      earthGeom.dispose();
      earthMat.dispose();
      envTarget.dispose();
      renderer.dispose();
      spaceBackground.dispose();

      if (canvas.parentElement === container) {
        container.removeChild(canvas);
      }
    };
  }, []);

  if (contextLost) {
    return (
      <div className="w-full h-full flex items-center justify-center designer-space-backdrop text-slate-300 p-8">
        <div className="max-w-md text-center space-y-2 border border-slate-800 bg-[#0D131F] p-6 rounded-xl">
          <p className="text-base font-semibold text-white">3D Viewport Unavailable</p>
          <p className="text-sm text-slate-400">
            WebGL rendering could not be initialized. You can still assemble parts and review
            missing-part warnings in the dock below.
          </p>
        </div>
      </div>
    );
  }

  return <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />;
};
