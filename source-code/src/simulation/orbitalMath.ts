import * as THREE from 'three';
import { OrbitSpec } from '../game/types';

export const EARTH_RADIUS_SCENE = 2.0;
export const SUN_DIRECTION = new THREE.Vector3(1.0, 0.24, 0.55).normalize();

const _tmpVec = new THREE.Vector3();
const _tmpNormal = new THREE.Vector3();
const _orbitQuat = new THREE.Quaternion();
const _euler = new THREE.Euler();

/**
 * Converts geographic latitude/longitude (deg) into a 3D point on a sphere
 * rotated by Earth's current Y rotation.
 */
export function latLonToWorldVector(
  latDeg: number,
  lonDeg: number,
  radius: number,
  earthRotationRad: number,
  target = new THREE.Vector3(),
): THREE.Vector3 {
  const lat = THREE.MathUtils.degToRad(latDeg);
  const lon = THREE.MathUtils.degToRad(lonDeg) + earthRotationRad;
  const cosLat = Math.cos(lat);
  target.set(
    radius * cosLat * Math.cos(lon),
    radius * Math.sin(lat),
    -radius * cosLat * Math.sin(lon),
  );
  return target;
}

/**
 * Converts a 3D world position to Earth-fixed latitude/longitude in degrees.
 */
export function worldVectorToLatLon(
  pos: THREE.Vector3,
  earthRotationRad: number,
): { latDeg: number; lonDeg: number } {
  const r = pos.length();
  if (r < 1e-5) return { latDeg: 0, lonDeg: 0 };
  const lat = Math.asin(THREE.MathUtils.clamp(pos.y / r, -1, 1));
  const rawLon = Math.atan2(-pos.z, pos.x) - earthRotationRad;
  // Normalize to [-180, 180]
  let lonDeg = THREE.MathUtils.radToDeg(rawLon) % 360;
  if (lonDeg > 180) lonDeg -= 360;
  if (lonDeg < -180) lonDeg += 360;
  return {
    latDeg: THREE.MathUtils.radToDeg(lat),
    lonDeg,
  };
}

/**
 * Computes satellite 3D position along an inclined circular orbit.
 */
export function computeOrbitPosition(
  orbit: OrbitSpec,
  phaseRad: number,
  target = new THREE.Vector3(),
): THREE.Vector3 {
  const r = orbit.orbitRadiusScene;
  target.set(Math.cos(phaseRad) * r, 0, Math.sin(phaseRad) * r);
  _euler.set(
    THREE.MathUtils.degToRad(orbit.inclinationDeg),
    THREE.MathUtils.degToRad(orbit.ascendingNodeDeg),
    0,
    'YXZ',
  );
  _orbitQuat.setFromEuler(_euler);
  target.applyQuaternion(_orbitQuat);
  return target;
}

/**
 * Builds an array of points for drawing the full 3D orbital path loop.
 */
export function sampleOrbitPath(orbit: OrbitSpec, segments = 128): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const phase = (i / segments) * Math.PI * 2;
    pts.push(computeOrbitPosition(orbit, phase, new THREE.Vector3()));
  }
  return pts;
}

/**
 * Checks whether the satellite is exposed to sunlight or inside Earth's cylindrical umbra.
 * Also applies a small orbit-specific sunlight bias for SSO / MEO educational behavior.
 */
export function checkSatelliteInSunlight(
  satPos: THREE.Vector3,
  orbit: OrbitSpec,
): boolean {
  const dist = satPos.length();
  if (dist < EARTH_RADIUS_SCENE) return false;
  const dirToSat = _tmpVec.copy(satPos).normalize();
  const sunDot = dirToSat.dot(SUN_DIRECTION);
  // Geometric umbra threshold: -sqrt(1 - (R_e / r)^2)
  const sinShadowAngle = EARTH_RADIUS_SCENE / dist;
  const umbraThreshold =
    -Math.sqrt(Math.max(0, 1 - sinShadowAngle * sinShadowAngle)) -
    orbit.sunlightBias * 0.45;
  return sunDot > umbraThreshold;
}

/**
 * Computes great-circle angular separation (degrees) between satellite nadir/steered
 * look vector and a surface target point.
 */
export function computeObservationAlignment(
  satPos: THREE.Vector3,
  targetSurfacePos: THREE.Vector3,
  steeringDeg: number,
): { inWindow: boolean; alignmentPct: number; angleDeg: number } {
  const satSubPoint = _tmpVec.copy(satPos).normalize();
  const targetDir = _tmpNormal.copy(targetSurfacePos).normalize();
  const rawAngleDeg = THREE.MathUtils.radToDeg(satSubPoint.angleTo(targetDir));
  // Off-nadir steering gives the player active control to compensate up to 25 degrees
  const effectiveAngleDeg = Math.max(0, rawAngleDeg - Math.abs(steeringDeg) * 0.55);
  const windowHalfAngleDeg = 46;
  const inWindow = effectiveAngleDeg <= windowHalfAngleDeg;
  const alignmentPct = inWindow
    ? Math.round(
        THREE.MathUtils.clamp(
          (1 - effectiveAngleDeg / windowHalfAngleDeg) * 100,
          12,
          100,
        ),
      )
    : 0;
  return {
    inWindow,
    alignmentPct,
    angleDeg: Math.round(rawAngleDeg),
  };
}

/**
 * Checks whether a ground station has line-of-sight to the satellite above horizon.
 */
export function checkGroundStationContact(
  satPos: THREE.Vector3,
  stationSurfacePos: THREE.Vector3,
  maxRangeScene: number,
  minElevationDeg: number,
): { inRange: boolean; elevationDeg: number; distance: number } {
  const toSat = _tmpVec.copy(satPos).sub(stationSurfacePos);
  const distance = toSat.length();
  const localUp = _tmpNormal.copy(stationSurfacePos).normalize();
  const cosZenith = toSat.normalize().dot(localUp);
  const elevationDeg = 90 - THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(cosZenith, -1, 1)));
  const inRange = elevationDeg >= minElevationDeg && distance <= maxRangeScene;
  return {
    inRange,
    elevationDeg: Math.round(elevationDeg),
    distance,
  };
}
