import { MISSION_LIMITS } from '../styles/theme';

export const MISSION_BRIEFING_DATA = {
  missionCode: 'MCO-2026',
  missionName: 'GLOBAL EARTH OBSERVATION',
  subtitle: 'Climate, Biosphere & Urban Dynamics Survey',
  story:
    'Earth’s forests, oceans, polar ice sheets, and coastal cities are transforming faster than ever. As Mission Director, you must engineer a custom Earth-observation satellite within strict mass and launch budget limits, place it into an optimal orbit, and operate its instruments while balancing sunlight, battery reserves, and ground-station downlinks.',
  note: 'All engineering values, orbital periods, and power figures are simplified educational simulations inspired by real NASA Earth-observing missions.',
  objectives: [
    'Design a complete satellite with Bus, Power, Imaging, and Comms subsystems.',
    `Keep launch mass under ${MISSION_LIMITS.maxMassKg} kg and cost under $${MISSION_LIMITS.totalBudgetMillion}M.`,
    'Choose an orbit and target observation region suited to your mission strategy.',
    'Launch into orbit and deploy your spacecraft cleanly.',
    `Collect at least ${MISSION_LIMITS.targetDataCollectGB} GB of observation data over target corridors.`,
    `Downlink at least ${MISSION_LIMITS.targetDataTransmitGB} GB to Earth ground stations.`,
    'Manage power and battery reserves across eclipse shadows without blackouts.',
  ],
  specs: [
    { label: 'Available Budget', value: `$${MISSION_LIMITS.totalBudgetMillion}M` },
    { label: 'Max Spacecraft Mass', value: `${MISSION_LIMITS.maxMassKg} kg` },
    { label: 'Mission Duration', value: `${MISSION_LIMITS.missionDurationSec}s (Sim)` },
    { label: 'Science Target', value: `${MISSION_LIMITS.targetDataCollectGB} GB Collect · ${MISSION_LIMITS.targetDataTransmitGB} GB Downlink` },
  ],
};

export const HOW_TO_PLAY_SECTIONS = [
  {
    title: '1. Mission Objective',
    body: 'Design an Earth-observation satellite, launch it into orbit, capture scientific data over your chosen Earth target, and transmit that data back to ground stations before the mission timer ends.',
  },
  {
    title: '2. Spacecraft Components & Trade-Offs',
    body: 'Every part adds mass and cost. Solar panels generate power in sunlight, batteries keep instruments alive in Earth’s shadow, the Multispectral Imager gathers data, the Comms Antenna transmits to ground stations, and the optional Scientific Sensor boosts data yield by +45%.',
  },
  {
    title: '3. Power & Mass Management',
    body: 'Never exceed 650 kg or $120M. During flight, solar generation drops to zero when passing behind Earth in eclipse. Watch your net watt balance and turn off idle instruments if battery reserves fall below 25%.',
  },
  {
    title: '4. Orbit Selection',
    body: 'LEO orbits fast with crisp resolution and longer eclipses. SSO flies near-polar to reach Arctic targets and stay in sunlight longer. MEO sits higher with wide coverage and long ground-station windows.',
  },
  {
    title: '5. Mission Operations & Controls',
    body: 'Drag to rotate the 3D camera, scroll to zoom, or switch between Earth View and Follow Satellite. Turn on the Imager and press Start Observation when approaching your target region (steer off-nadir -25° to +25° to widen alignment). Enable Comms when a ground station is in range to downlink stored GB.',
  },
];

export const CREDITS_DATA = {
  title: 'MISSION CONTROL: ORBITAL',
  event: 'NASA Space Apps Challenge 2026',
  tagline: 'Design. Launch. Explore.',
  architecture: [
    '100% Client-Side Interactive 3D Simulation',
    'Built with React, TypeScript, Three.js & Tailwind CSS',
    'Procedural Earth, Spacecraft, Rocket & Web Audio Engine',
    'Inspired by NASA Landsat, Terra, Aqua & Deep Space Network operations',
  ],
};
