import * as THREE from 'three';
import { ComponentId, SpacecraftDesign } from '../game/types';
import { ProceduralTextureSet } from './proceduralTextures';

export interface SatelliteAssembly {
  rootGroup: THREE.Group;
  scanConeMesh: THREE.Mesh;
  scanRingMesh: THREE.Mesh;
  partMeshes: Map<ComponentId, THREE.Object3D[]>;
  updateFromDesign: (
    design: SpacecraftDesign,
    selectedPart: ComponentId | null,
  ) => void;
  setScanActive: (active: boolean, steeringDeg: number, elapsedSec: number) => void;
}

function tagPart(obj: THREE.Object3D, partId: ComponentId): void {
  obj.traverse((child) => {
    child.userData.partId = partId;
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

function createOutline(source: THREE.Object3D): THREE.Group {
  const outline = new THREE.Group();
  outline.position.copy(source.position);
  outline.quaternion.copy(source.quaternion);
  outline.scale.copy(source.scale);
  const material = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
  });

  const copyShape = (sourceNode: THREE.Object3D, targetParent: THREE.Object3D) => {
    if ((sourceNode as THREE.Mesh).isMesh) {
      const mesh = sourceNode as THREE.Mesh;
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(mesh.geometry, 12),
        material,
      );
      edges.position.copy(mesh.position);
      edges.quaternion.copy(mesh.quaternion);
      edges.scale.copy(mesh.scale);
      edges.renderOrder = 2;
      targetParent.add(edges);
      return;
    }

    const group = new THREE.Group();
    group.position.copy(sourceNode.position);
    group.quaternion.copy(sourceNode.quaternion);
    group.scale.copy(sourceNode.scale);
    targetParent.add(group);
    sourceNode.children.forEach((child) => copyShape(child, group));
  };

  source.children.forEach((child) => copyShape(child, outline));
  return outline;
}

export function createSatelliteAssembly(
  textures: ProceduralTextureSet,
): SatelliteAssembly {
  const rootGroup = new THREE.Group();
  const partMeshes = new Map<ComponentId, THREE.Object3D[]>();

  // Shared calibrated aerospace PBR materials
  const goldMliMat = new THREE.MeshStandardMaterial({
    map: textures.goldFoil,
    color: 0xebb948,
    metalness: 0.88,
    roughness: 0.32,
  });

  const titaniumMat = new THREE.MeshStandardMaterial({
    color: 0xd0d8e4,
    metalness: 0.85,
    roughness: 0.24,
  });

  const carbonMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.35,
    roughness: 0.62,
  });

  const solarMat = new THREE.MeshStandardMaterial({
    map: textures.solarCell,
    metalness: 0.55,
    roughness: 0.22,
  });

  const batteryMat = new THREE.MeshStandardMaterial({
    color: 0x2563eb,
    metalness: 0.72,
    roughness: 0.28,
  });

  const lensMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x083344,
    emissiveIntensity: 0.6,
    metalness: 0.2,
    roughness: 0.08,
  });

  const dishMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.45,
    roughness: 0.32,
    side: THREE.DoubleSide,
  });

  const sensorMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    metalness: 0.65,
    roughness: 0.25,
  });

  // A. SATELLITE BUS CHASSIS (Hexagonal primary hull + structural endplates + thrusters)
  const busGroup = new THREE.Group();
  const hexHull = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, 0.46, 0.82, 6),
    goldMliMat,
  );
  busGroup.add(hexHull);

  const topRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.49, 0.49, 0.07, 6),
    titaniumMat,
  );
  topRing.position.y = 0.42;
  busGroup.add(topRing);

  const bottomRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.49, 0.49, 0.07, 6),
    titaniumMat,
  );
  bottomRing.position.y = -0.42;
  busGroup.add(bottomRing);

  // Attitude star tracker hood
  const starTracker = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.09, 0.18, 12),
    carbonMat,
  );
  starTracker.position.set(0.28, 0.35, 0.25);
  starTracker.rotation.set(0.4, 0, -0.4);
  busGroup.add(starTracker);

  // Bell thruster nozzles at corners (LatheGeometry)
  const bellPoints = [
    new THREE.Vector2(0.02, 0),
    new THREE.Vector2(0.03, 0.04),
    new THREE.Vector2(0.055, 0.11),
    new THREE.Vector2(0.048, 0.11),
  ];
  const bellGeo = new THREE.LatheGeometry(bellPoints, 12);
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const bell = new THREE.Mesh(bellGeo, carbonMat);
    bell.position.set(Math.cos(angle) * 0.35, 0.48, Math.sin(angle) * 0.35);
    busGroup.add(bell);
  }
  tagPart(busGroup, 'bus');
  rootGroup.add(busGroup);
  partMeshes.set('bus', [busGroup]);

  // B. SOLAR PANEL PAIRS (Up to 3 pairs extending on ±X wings)
  const solarPairs: THREE.Group[] = [];
  for (let pairIdx = 0; pairIdx < 3; pairIdx++) {
    const pairGroup = new THREE.Group();
    const yOffset = pairIdx === 0 ? 0 : pairIdx === 1 ? 0.26 : -0.26;
    const xBase = 0.52;

    for (const side of [-1, 1]) {
      const wing = new THREE.Group();
      // Yoke strut
      const strut = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.26, 8),
        titaniumMat,
      );
      strut.rotation.z = Math.PI / 2;
      strut.position.set(side * (xBase + 0.08), yOffset, 0);
      wing.add(strut);

      // Panel backing frame
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(1.18, 0.028, 0.56),
        carbonMat,
      );
      frame.position.set(side * (xBase + 0.78), yOffset, 0);
      wing.add(frame);

      // Photovoltaic face
      const cells = new THREE.Mesh(
        new THREE.BoxGeometry(1.12, 0.032, 0.5),
        solarMat,
      );
      cells.position.set(side * (xBase + 0.78), yOffset, 0);
      wing.add(cells);

      pairGroup.add(wing);
    }
    tagPart(pairGroup, 'solar');
    rootGroup.add(pairGroup);
    solarPairs.push(pairGroup);
  }
  partMeshes.set('solar', solarPairs);

  // C. BATTERY PACKS (Up to 3 anodized modules on bus side faces)
  const batteryPacks: THREE.Group[] = [];
  const batteryAngles = [0.52, -0.52, Math.PI - 0.52];
  for (let i = 0; i < 3; i++) {
    const bGroup = new THREE.Group();
    const angle = batteryAngles[i];
    const r = 0.49;
    bGroup.position.set(Math.sin(angle) * r, -0.04, Math.cos(angle) * r);
    bGroup.rotation.y = angle;

    const casing = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.34, 0.14),
      batteryMat,
    );
    bGroup.add(casing);

    const radiator = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.06, 0.16),
      titaniumMat,
    );
    radiator.position.y = 0.14;
    bGroup.add(radiator);

    tagPart(bGroup, 'battery');
    rootGroup.add(bGroup);
    batteryPacks.push(bGroup);
  }
  partMeshes.set('battery', batteryPacks);

  // D. IMAGING INSTRUMENT (Nadir-pointing -Y optical telescope barrel + sapphire lens)
  const imagerGroup = new THREE.Group();
  imagerGroup.position.set(0, -0.56, 0);

  const shroudPoints = [
    new THREE.Vector2(0.18, 0.16),
    new THREE.Vector2(0.21, 0.06),
    new THREE.Vector2(0.24, -0.16),
    new THREE.Vector2(0.19, -0.16),
    new THREE.Vector2(0.16, 0.05),
  ];
  const barrel = new THREE.Mesh(
    new THREE.LatheGeometry(shroudPoints, 20),
    carbonMat,
  );
  imagerGroup.add(barrel);

  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.08, 20),
    titaniumMat,
  );
  collar.position.y = 0.12;
  imagerGroup.add(collar);

  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.17, 0.04, 24),
    lensMat,
  );
  lens.position.y = -0.12;
  imagerGroup.add(lens);

  tagPart(imagerGroup, 'imager');
  rootGroup.add(imagerGroup);
  partMeshes.set('imager', [imagerGroup]);

  // E. COMMUNICATIONS ANTENNA (Top +Y parabolic high-gain dish + tripod feed)
  const antennaGroup = new THREE.Group();
  antennaGroup.position.set(0, 0.56, 0.08);

  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.045, 0.24, 12),
    titaniumMat,
  );
  antennaGroup.add(mast);

  const dishPoints = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(0.16, 0.03),
    new THREE.Vector2(0.28, 0.09),
    new THREE.Vector2(0.35, 0.17),
  ];
  const dish = new THREE.Mesh(
    new THREE.LatheGeometry(dishPoints, 24),
    dishMat,
  );
  dish.position.y = 0.1;
  dish.rotation.x = 0.25;
  antennaGroup.add(dish);

  const feedHorn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.035, 0.22, 10),
    goldMliMat,
  );
  feedHorn.position.set(0, 0.24, 0.04);
  feedHorn.rotation.x = 0.25;
  antennaGroup.add(feedHorn);

  tagPart(antennaGroup, 'antenna');
  rootGroup.add(antennaGroup);
  partMeshes.set('antenna', [antennaGroup]);

  // F. SCIENTIFIC SENSOR (Optional boom-mounted atmospheric & thermal spectrometer on -Z)
  const sensorGroup = new THREE.Group();
  sensorGroup.position.set(0, 0.12, -0.52);

  const boom = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.032, 0.58, 10),
    titaniumMat,
  );
  boom.rotation.x = Math.PI / 2;
  boom.position.z = -0.22;
  sensorGroup.add(boom);

  const sensorHead = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.18, 0.24),
    sensorMat,
  );
  sensorHead.position.z = -0.52;
  sensorGroup.add(sensorHead);

  const prism = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.09, 0),
    lensMat,
  );
  prism.position.set(0, -0.1, -0.54);
  sensorGroup.add(prism);

  tagPart(sensorGroup, 'sensor');
  rootGroup.add(sensorGroup);
  partMeshes.set('sensor', [sensorGroup]);

  // White reference silhouettes mark the required parts that have not been installed.
  const requiredPartOutlines = new Map<ComponentId, THREE.Group>();
  const requiredParts: Array<[ComponentId, THREE.Object3D]> = [
    ['bus', busGroup],
    ['solar', solarPairs[0]],
    ['battery', batteryPacks[0]],
    ['imager', imagerGroup],
    ['antenna', antennaGroup],
  ];
  for (const [partId, part] of requiredParts) {
    const outline = createOutline(part);
    outline.visible = false;
    outline.userData.referencePartId = partId;
    rootGroup.add(outline);
    requiredPartOutlines.set(partId, outline);
  }

  // Observation Scanning Volumetric Cone & Footprint Ring (used in Mission Operations)
  const scanConeGeo = new THREE.ConeGeometry(0.32, 1.3, 24, 1, true);
  scanConeGeo.translate(0, -0.65, 0);
  const scanConeMat = new THREE.MeshBasicMaterial({
    color: 0x06b6d4,
    transparent: true,
    opacity: 0.26,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const scanConeMesh = new THREE.Mesh(scanConeGeo, scanConeMat);
  scanConeMesh.position.set(0, -0.68, 0);
  scanConeMesh.visible = false;
  rootGroup.add(scanConeMesh);

  const scanRingGeo = new THREE.RingGeometry(0.24, 0.31, 32);
  const scanRingMat = new THREE.MeshBasicMaterial({
    color: 0x22d3ee,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const scanRingMesh = new THREE.Mesh(scanRingGeo, scanRingMat);
  scanRingMesh.rotation.x = -Math.PI / 2;
  scanRingMesh.position.y = -1.28;
  scanRingMesh.visible = false;
  scanConeMesh.add(scanRingMesh);

  const updateFromDesign = (
    design: SpacecraftDesign,
    selectedPart: ComponentId | null,
  ) => {
    busGroup.visible = (design.bus ?? 0) >= 1;
    imagerGroup.visible = (design.imager ?? 0) >= 1;
    antennaGroup.visible = (design.antenna ?? 0) >= 1;
    sensorGroup.visible = (design.sensor ?? 0) >= 1;

    for (const [partId, outline] of requiredPartOutlines) {
      outline.visible = (design[partId] ?? 0) < 1;
    }

    solarPairs.forEach((pair, i) => {
      pair.visible = i < (design.solar ?? 0);
    });
    batteryPacks.forEach((pack, i) => {
      pack.visible = i < (design.battery ?? 0);
    });

    // Subtle emissive highlight on inspected part in Spacecraft Designer
    for (const [partId, groups] of partMeshes.entries()) {
      const isSelected = selectedPart === partId;
      for (const g of groups) {
        g.scale.setScalar(isSelected ? 1.04 : 1.0);
      }
    }
  };

  const setScanActive = (
    active: boolean,
    steeringDeg: number,
    elapsedSec: number,
  ) => {
    scanConeMesh.visible = active;
    scanRingMesh.visible = active;
    if (active) {
      scanConeMesh.rotation.z = THREE.MathUtils.degToRad(steeringDeg);
      const pulse = 0.88 + Math.sin(elapsedSec * 5) * 0.14;
      scanRingMesh.scale.setScalar(pulse);
      scanConeMat.opacity = 0.2 + Math.sin(elapsedSec * 4) * 0.06;
    }
  };

  return {
    rootGroup,
    scanConeMesh,
    scanRingMesh,
    partMeshes,
    updateFromDesign,
    setScanActive,
  };
}
