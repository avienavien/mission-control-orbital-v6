import * as THREE from 'three';
import { SurfaceFinish } from '../types/satellite';
import { ProceduralTextures } from './textures';

export interface MaterialLibrary {
  finishes: Record<SurfaceFinish, THREE.MeshStandardMaterial>;
  darkAnodized: THREE.MeshStandardMaterial;
  brushedSteel: THREE.MeshPhysicalMaterial;
  copperAccent: THREE.MeshStandardMaterial;
  solarCell: THREE.MeshPhysicalMaterial;
  opticalGlass: THREE.MeshPhysicalMaterial;
  whiteReflector: THREE.MeshStandardMaterial;
  thrusterCeramic: THREE.MeshStandardMaterial;
  nozzleCarbon: THREE.MeshStandardMaterial;
  cyanEmissive: THREE.MeshStandardMaterial;
  amberEmissive: THREE.MeshStandardMaterial;
  ionPlume: THREE.MeshBasicMaterial;
  ghostValid: THREE.MeshStandardMaterial;
  dispose: () => void;
}

export function createMaterialLibrary(
  textures: ProceduralTextures,
  isSoftwareGl: boolean
): MaterialLibrary {
  const goldMli = new THREE.MeshStandardMaterial({
    map: textures.mliColor,
    bumpMap: textures.mliBump,
    bumpScale: 0.025,
    color: 0xf4bd42,
    metalness: 0.92,
    roughness: 0.3,
  });

  const titanium = new THREE.MeshPhysicalMaterial({
    map: textures.aluminumColor,
    color: 0xb8c2ce,
    metalness: 0.88,
    roughness: 0.28,
    anisotropy: 0.65,
  });

  const whiteCeramic = new THREE.MeshPhysicalMaterial({
    color: 0xeaf0f6,
    metalness: 0.06,
    roughness: 0.42,
    clearcoat: 0.35,
    clearcoatRoughness: 0.25,
  });

  const carbonComposite = new THREE.MeshStandardMaterial({
    map: textures.carbonColor,
    color: 0x3b4454,
    metalness: 0.18,
    roughness: 0.62,
  });

  const darkAnodized = new THREE.MeshStandardMaterial({
    color: 0x1e2530,
    metalness: 0.72,
    roughness: 0.4,
  });

  const brushedSteel = new THREE.MeshPhysicalMaterial({
    color: 0xd0d8e4,
    metalness: 0.94,
    roughness: 0.2,
    anisotropy: 0.75,
  });

  const copperAccent = new THREE.MeshStandardMaterial({
    color: 0xd17e47,
    metalness: 0.9,
    roughness: 0.24,
  });

  const solarCell = new THREE.MeshPhysicalMaterial({
    map: textures.solarColor,
    color: 0xffffff,
    metalness: 0.35,
    roughness: 0.15,
    clearcoat: 0.92,
    clearcoatRoughness: 0.08,
  });

  const opticalGlass = new THREE.MeshPhysicalMaterial({
    color: 0x7fd4ff,
    metalness: 0.05,
    roughness: 0.06,
    transmission: isSoftwareGl ? 0 : 0.88,
    transparent: true,
    opacity: isSoftwareGl ? 0.55 : 1,
    ior: 1.56,
    thickness: 0.35,
    clearcoat: 1.0,
  });

  const whiteReflector = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.1,
    roughness: 0.34,
  });

  const thrusterCeramic = new THREE.MeshStandardMaterial({
    color: 0xd8dee6,
    metalness: 0.05,
    roughness: 0.58,
  });

  const nozzleCarbon = new THREE.MeshStandardMaterial({
    color: 0x242830,
    metalness: 0.48,
    roughness: 0.45,
    side: THREE.DoubleSide,
  });

  const cyanEmissive = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 1.6,
    roughness: 0.3,
  });

  const amberEmissive = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 1.3,
    roughness: 0.3,
  });

  const ionPlume = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const ghostValid = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x06b6d4,
    emissiveIntensity: 0.75,
    transparent: true,
    opacity: 0.45,
    roughness: 0.25,
    depthWrite: false,
  });

  const allMaterials: THREE.Material[] = [
    goldMli,
    titanium,
    whiteCeramic,
    carbonComposite,
    darkAnodized,
    brushedSteel,
    copperAccent,
    solarCell,
    opticalGlass,
    whiteReflector,
    thrusterCeramic,
    nozzleCarbon,
    cyanEmissive,
    amberEmissive,
    ionPlume,
    ghostValid,
  ];

  return {
    finishes: {
      [SurfaceFinish.GOLD_MLI]: goldMli,
      [SurfaceFinish.TITANIUM]: titanium,
      [SurfaceFinish.WHITE_CERAMIC]: whiteCeramic,
      [SurfaceFinish.CARBON_COMPOSITE]: carbonComposite,
    },
    darkAnodized,
    brushedSteel,
    copperAccent,
    solarCell,
    opticalGlass,
    whiteReflector,
    thrusterCeramic,
    nozzleCarbon,
    cyanEmissive,
    amberEmissive,
    ionPlume,
    ghostValid,
    dispose: () => {
      allMaterials.forEach((m) => m.dispose());
    },
  };
}
