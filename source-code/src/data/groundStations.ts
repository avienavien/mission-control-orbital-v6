import { GroundStationSpec } from '../game/types';

export const GROUND_STATIONS: GroundStationSpec[] = [
  {
    id: 'goldstone',
    name: 'Goldstone Deep Space Complex',
    region: 'Mojave Desert, USA',
    latDeg: 35.4,
    lonDeg: -116.9,
    maxRangeScene: 4.15,
    minElevationDeg: 12,
    description:
      'Primary Western Hemisphere S/X-band tracking complex supporting LEO, SSO, and MEO telemetry passes.',
  },
  {
    id: 'svalbard',
    name: 'Svalbard Satellite Station (SvalSat)',
    region: 'Spitsbergen, Arctic Norway',
    latDeg: 78.2,
    lonDeg: 15.4,
    maxRangeScene: 4.15,
    minElevationDeg: 10,
    description:
      'High-Arctic polar station capable of contacting Sun-Synchronous satellites on nearly every single orbit.',
  },
  {
    id: 'canberra',
    name: 'Canberra Tracking Station',
    region: 'Tidbinbilla, Australia',
    latDeg: -35.4,
    lonDeg: 149.0,
    maxRangeScene: 4.15,
    minElevationDeg: 12,
    description:
      'Southern Hemisphere parabolic dish array providing critical downlink coverage over Oceania and the Pacific.',
  },
];
