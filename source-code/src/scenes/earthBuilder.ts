import * as THREE from 'three';
import { GROUND_STATIONS } from '../data/groundStations';
import { TARGET_REGIONS } from '../data/orbits';
import { TargetRegionId } from '../game/types';
import {
  EARTH_RADIUS_SCENE,
  latLonToWorldVector,
  SUN_DIRECTION,
} from '../simulation/orbitalMath';
import { ProceduralTextureSet } from './proceduralTextures';

export interface EarthAssembly {
  rootGroup: THREE.Group;
  earthSpinGroup: THREE.Group;
  cloudMesh: THREE.Mesh;
  stationMarkers: Map<
    string,
    {
      group: THREE.Group;
      beaconMat: THREE.MeshBasicMaterial;
      ringMat: THREE.MeshBasicMaterial;
      ringMesh: THREE.Mesh;
    }
  >;
  targetMarkers: Map<
    TargetRegionId,
    {
      group: THREE.Group;
      ringMat: THREE.MeshBasicMaterial;
      coreMat: THREE.MeshBasicMaterial;
    }
  >;
  updateMarkers: (
    activeTargetId: TargetRegionId,
    availableStationIds: string[],
    activeStationId: string | null,
    elapsedSec: number,
  ) => void;
}

export function createEarthAssembly(
  textures: ProceduralTextureSet,
): EarthAssembly {
  const rootGroup = new THREE.Group();
  const earthSpinGroup = new THREE.Group();
  rootGroup.add(earthSpinGroup);

  // Primary Earth Sphere with Day Albedo + Night City Lights injection
  const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS_SCENE, 64, 48);
  const earthMat = new THREE.MeshStandardMaterial({
    map: textures.earthDay,
    roughnessMap: textures.earthRoughness,
    roughness: 0.85,
    metalness: 0.08,
  });

  earthMat.onBeforeCompile = (shader) => {
    shader.uniforms.nightMap = { value: textures.earthNight };
    shader.uniforms.sunDir = { value: SUN_DIRECTION };
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec3 vWorldNormalCustom;
         varying vec2 vCustomUv;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vCustomUv = uv;
         vWorldNormalCustom = normalize(mat3(modelMatrix) * normal);`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform sampler2D nightMap;
         uniform vec3 sunDir;
         varying vec3 vWorldNormalCustom;
         varying vec2 vCustomUv;`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         float sunDot = dot(normalize(vWorldNormalCustom), normalize(sunDir));
         float nightFactor = smoothstep(0.12, -0.22, sunDot);
         vec3 cityGlow = texture2D(nightMap, vCustomUv).rgb;
         totalEmissiveRadiance += cityGlow * nightFactor * 1.15;`,
      );
  };

  const earthMesh = new THREE.Mesh(earthGeo, earthMat);
  earthMesh.receiveShadow = true;
  earthSpinGroup.add(earthMesh);

  // Cloud Layer Sphere
  const cloudGeo = new THREE.SphereGeometry(
    EARTH_RADIUS_SCENE * 1.015,
    48,
    36,
  );
  const cloudMat = new THREE.MeshStandardMaterial({
    map: textures.earthClouds,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    roughness: 0.95,
    metalness: 0,
  });
  const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
  earthSpinGroup.add(cloudMesh);

  // Fresnel Atmospheric Rim Glow
  const atmoGeo = new THREE.SphereGeometry(EARTH_RADIUS_SCENE * 1.065, 48, 36);
  const atmoMat = new THREE.ShaderMaterial({
    uniforms: {
      sunDir: { value: SUN_DIRECTION },
    },
    vertexShader: `
      varying vec3 vNormalWorld;
      varying vec3 vViewDir;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vNormalWorld = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - worldPos.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 sunDir;
      varying vec3 vNormalWorld;
      varying vec3 vViewDir;
      void main() {
        float rim = pow(clamp(0.68 - dot(vNormalWorld, vViewDir), 0.0, 1.0), 3.0);
        float daySide = smoothstep(-0.35, 0.55, dot(vNormalWorld, normalize(sunDir)));
        vec3 dayColor = vec3(0.22, 0.65, 1.0);
        vec3 twilightColor = vec3(0.06, 0.24, 0.55);
        vec3 color = mix(twilightColor, dayColor, daySide);
        gl_FragColor = vec4(color, rim * (0.35 + 0.6 * daySide));
      }
    `,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
  rootGroup.add(atmoMesh);

  // Ground Station 3D Dish & Beacon Markers attached to earthSpinGroup
  const stationMarkers = new Map<
    string,
    {
      group: THREE.Group;
      beaconMat: THREE.MeshBasicMaterial;
      ringMat: THREE.MeshBasicMaterial;
      ringMesh: THREE.Mesh;
    }
  >();

  const upAxis = new THREE.Vector3(0, 1, 0);
  const tmpPos = new THREE.Vector3();
  const tmpDir = new THREE.Vector3();

  for (const gs of GROUND_STATIONS) {
    const group = new THREE.Group();
    latLonToWorldVector(gs.latDeg, gs.lonDeg, EARTH_RADIUS_SCENE + 0.005, 0, tmpPos);
    group.position.copy(tmpPos);
    tmpDir.copy(tmpPos).normalize();
    group.quaternion.setFromUnitVectors(upAxis, tmpDir);

    // Base pedestal
    const baseMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.042, 0.03, 12),
      new THREE.MeshStandardMaterial({
        color: 0xcbd5e1,
        metalness: 0.7,
        roughness: 0.3,
      }),
    );
    baseMesh.position.y = 0.015;
    group.add(baseMesh);

    // Mini parabolic dish
    const dishMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.042, 0.025, 16, 1, true),
      new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        metalness: 0.5,
        roughness: 0.3,
        side: THREE.DoubleSide,
      }),
    );
    dishMesh.position.y = 0.045;
    dishMesh.rotation.x = Math.PI * 0.85;
    group.add(dishMesh);

    // Status beacon sphere
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 12, 12),
      beaconMat,
    );
    beacon.position.y = 0.075;
    group.add(beacon);

    // Ground coverage ring
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ringMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.065, 0.088, 28),
      ringMat,
    );
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.008;
    group.add(ringMesh);

    earthSpinGroup.add(group);
    stationMarkers.set(gs.id, { group, beaconMat, ringMat, ringMesh });
  }

  // Target Observation Region Markers attached to earthSpinGroup
  const targetMarkers = new Map<
    TargetRegionId,
    {
      group: THREE.Group;
      ringMat: THREE.MeshBasicMaterial;
      coreMat: THREE.MeshBasicMaterial;
    }
  >();

  for (const region of TARGET_REGIONS) {
    const group = new THREE.Group();
    latLonToWorldVector(
      region.latDeg,
      region.lonDeg,
      EARTH_RADIUS_SCENE + 0.012,
      0,
      tmpPos,
    );
    group.position.copy(tmpPos);
    tmpDir.copy(tmpPos).normalize();
    group.quaternion.setFromUnitVectors(upAxis, tmpDir);

    const colorHex = new THREE.Color(region.biomeColor);
    const ringMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.11, 0.14, 32),
      ringMat,
    );
    ring.rotation.x = -Math.PI / 2;
    group.add(ring);

    const coreMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.105, 32), coreMat);
    disc.rotation.x = -Math.PI / 2;
    group.add(disc);

    earthSpinGroup.add(group);
    targetMarkers.set(region.id, { group, ringMat, coreMat });
  }

  const updateMarkers = (
    activeTargetId: TargetRegionId,
    availableStationIds: string[],
    activeStationId: string | null,
    elapsedSec: number,
  ) => {
    const pulse = 0.88 + Math.sin(elapsedSec * 3.5) * 0.14;
    for (const [id, marker] of targetMarkers.entries()) {
      const isSelected = id === activeTargetId;
      marker.group.visible = isSelected;
      if (isSelected) {
        marker.group.scale.setScalar(pulse);
        marker.ringMat.opacity = 0.85;
      }
    }

    for (const [id, st] of stationMarkers.entries()) {
      const isActive = id === activeStationId;
      const isAvailable = availableStationIds.includes(id);
      if (isActive) {
        st.beaconMat.color.setHex(0x10b981);
        st.ringMat.color.setHex(0x10b981);
        st.ringMat.opacity = 0.85;
        st.ringMesh.scale.setScalar(1.15);
      } else if (isAvailable) {
        st.beaconMat.color.setHex(0x06b6d4);
        st.ringMat.color.setHex(0x06b6d4);
        st.ringMat.opacity = 0.72;
        st.ringMesh.scale.setScalar(1.0);
      } else {
        st.beaconMat.color.setHex(0xf59e0b);
        st.ringMat.color.setHex(0xf59e0b);
        st.ringMat.opacity = 0.35;
        st.ringMesh.scale.setScalar(0.85);
      }
    }
  };

  return {
    rootGroup,
    earthSpinGroup,
    cloudMesh,
    stationMarkers,
    targetMarkers,
    updateMarkers,
  };
}
