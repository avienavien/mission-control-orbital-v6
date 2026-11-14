import { OrbitId, OrbitSpec, TargetRegionId, TargetRegionSpec } from '../game/types';

export const ORBIT_OPTIONS: OrbitSpec[] = [
  {
    id: 'leo',
    name: 'Low Earth Orbit (LEO)',
    shortName: 'LEO · 540 km',
    altitudeLabel: '540 km (Illustrative)',
    orbitRadiusScene: 3.15,
    inclinationDeg: 38,
    ascendingNodeDeg: 20,
    periodSeconds: 34,
    swathBonus: 1.0,
    resolutionMultiplier: 1.25,
    sunlightBias: 0,
    description:
      'Close-range equatorial-to-mid-latitude orbit with rapid passes and sharp surface detail, entering Earth’s shadow each orbit.',
    benefits: [
      'Highest imaging detail (+25% data yield over mid-latitude targets)',
      'Fast orbital loop (~34s simulated period) gives frequent passes',
      'Strong signal link to Goldstone and Canberra ground stations',
    ],
    tradeoffs: [
      'Spends ~35% of each orbit in Earth shadow (battery drain)',
      'Cannot fly directly over high polar latitudes above 45°',
      'Shorter ground station contact windows per pass',
    ],
    educationalNote:
      'Lower orbits fly faster due to stronger gravity and yield sharper images, but Earth blocks sunlight for part of every revolution.',
  },
  {
    id: 'sso',
    name: 'Sun-Synchronous Orbit (SSO)',
    shortName: 'SSO · 720 km',
    altitudeLabel: '720 km (Illustrative)',
    orbitRadiusScene: 3.48,
    inclinationDeg: 82,
    ascendingNodeDeg: 75,
    periodSeconds: 44,
    swathBonus: 1.15,
    resolutionMultiplier: 1.1,
    sunlightBias: 0.22,
    description:
      'Near-polar orbit timed so the satellite crosses regions under consistent daylight angles—the gold standard for NASA Earth observation.',
    benefits: [
      'Covers the entire globe including Polar & Arctic regions',
      'Extended solar exposure (~78% sunlight per orbit)',
      'Frequent passes over Arctic Svalbard ground station',
    ],
    tradeoffs: [
      'Moderate orbital speed (~44s simulated period)',
      'Mid-latitude passes occur less frequently than low-inclination LEO',
    ],
    educationalNote:
      'Landsat and Aqua use Sun-Synchronous Orbits so shadows on forests and glaciers appear consistent across months of observation.',
  },
  {
    id: 'meo',
    name: 'Medium Earth Orbit (MEO)',
    shortName: 'MEO · 2,400 km',
    altitudeLabel: '2,400 km (Illustrative)',
    orbitRadiusScene: 4.35,
    inclinationDeg: 52,
    ascendingNodeDeg: -35,
    periodSeconds: 66,
    swathBonus: 1.4,
    resolutionMultiplier: 0.85,
    sunlightBias: 0.34,
    description:
      'High-altitude wide-field orbit with long communication windows and minimal eclipse time, trading image resolution for broad coverage.',
    benefits: [
      'Longest ground station contact windows for reliable data downlink',
      'Minimal eclipse shadow (~86% sunlight exposure per orbit)',
      'Wide observation swath sees larger target corridors',
    ],
    tradeoffs: [
      'Slower orbital period (~66s simulated) with fewer target revisits',
      'Greater distance reduces optical data rate (-15% resolution yield)',
    ],
    educationalNote:
      'Higher orbits stay in sunlight longer and stay visible to ground antennas much longer, but cameras are farther from Earth’s surface.',
  },
];

export const ORBIT_MAP: Record<OrbitId, OrbitSpec> = ORBIT_OPTIONS.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<OrbitId, OrbitSpec>,
);

export const TARGET_REGIONS: TargetRegionSpec[] = [
  {
    id: 'forest',
    name: 'Tropical Rainforest Canopy',
    locationLabel: 'Amazon Basin · 4°S, 62°W',
    latDeg: -4,
    lonDeg: -62,
    biomeColor: '#10b981',
    description:
      'Monitor deforestation patterns, biomass carbon storage, and drought stress across tropical rainforest watersheds.',
    scienceGoal: 'Track canopy health and deforestation boundaries',
    dataBonusMultiplier: 1.15,
  },
  {
    id: 'ocean',
    name: 'Pacific Ocean Current Gyre',
    locationLabel: 'Central Pacific · 12°N, 145°W',
    latDeg: 12,
    lonDeg: -145,
    biomeColor: '#0ea5e9',
    description:
      'Measure sea-surface temperature anomalies, plankton blooms, and tropical cyclone formation across open ocean basins.',
    scienceGoal: 'Map ocean warming & phytoplankton productivity',
    dataBonusMultiplier: 1.1,
  },
  {
    id: 'urban',
    name: 'Coastal Megacity Corridor',
    locationLabel: 'East Asia Coast · 31°N, 121°E',
    latDeg: 31,
    lonDeg: 121,
    biomeColor: '#f59e0b',
    description:
      'Observe urban heat islands, air quality plumes, and rapid coastal infrastructure expansion.',
    scienceGoal: 'Analyze urban heat islands & atmospheric particulates',
    dataBonusMultiplier: 1.12,
  },
  {
    id: 'polar',
    name: 'Arctic Sea Ice & Glaciers',
    locationLabel: 'High Arctic · 74°N, 18°E',
    latDeg: 74,
    lonDeg: 18,
    biomeColor: '#38bdf8',
    description:
      'Survey seasonal sea-ice extent, glacier calving, and polar albedo changes. Best observed from high-inclination SSO.',
    scienceGoal: 'Quantify polar ice retreat & surface reflectivity',
    dataBonusMultiplier: 1.25,
  },
];

export const TARGET_REGION_MAP: Record<TargetRegionId, TargetRegionSpec> =
  TARGET_REGIONS.reduce(
    (acc, item) => {
      acc[item.id] = item;
      return acc;
    },
    {} as Record<TargetRegionId, TargetRegionSpec>,
  );
