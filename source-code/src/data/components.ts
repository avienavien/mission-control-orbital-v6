import { ComponentId, SpacecraftComponentSpec, SpacecraftDesign } from '../game/types';

export const SPACECRAFT_COMPONENTS: SpacecraftComponentSpec[] = [
  {
    id: 'bus',
    name: 'Satellite Bus Chassis',
    shortName: 'Satellite Bus',
    category: 'Structure',
    description:
      'Hexagonal avionics core, reaction wheels, star tracker, and thermal MLI gold shielding that holds all subsystems together.',
    engineeringLesson:
      'Every spacecraft starts with a structural bus. Its avionics draw constant baseline power (18 W) even when scientific instruments are idle.',
    functionSummary: 'Core structure, attitude control & flight computer',
    massKg: 180,
    costMillion: 28,
    powerGenW: 0,
    powerDrawW: 18,
    batteryWh: 0,
    required: true,
    minCount: 1,
    maxCount: 1,
    defaultCount: 0,
    accentHex: '#d4a438',
  },
  {
    id: 'solar',
    name: 'Deployable Solar Wing Pair',
    shortName: 'Solar Panels',
    category: 'Power',
    description:
      'Twin articulated photovoltaic wings that convert sunlight into electrical power for instruments and battery recharging.',
    engineeringLesson:
      'Solar panels only generate full power in direct sunlight. Adding a second pair doubles power generation for heavy instrument use, at the cost of extra mass and launch budget.',
    functionSummary: 'Generates +95 W per pair in direct sunlight',
    massKg: 55,
    costMillion: 14,
    powerGenW: 95,
    powerDrawW: 0,
    batteryWh: 0,
    required: true,
    minCount: 1,
    maxCount: 3,
    defaultCount: 0,
    accentHex: '#38bdf8',
  },
  {
    id: 'battery',
    name: 'Lithium-Ion Battery Pack',
    shortName: 'Battery Pack',
    category: 'Power',
    description:
      'Space-rated rechargeable energy storage module that keeps the satellite running while passing through Earth’s night shadow.',
    engineeringLesson:
      'Satellites spend up to 35% of each orbit in Earth’s eclipse shadow. Without sufficient battery capacity, instruments must shut down on the night side.',
    functionSummary: 'Stores +120 Wh of energy per pack for eclipse survival',
    massKg: 45,
    costMillion: 10,
    powerGenW: 0,
    powerDrawW: 0,
    batteryWh: 120,
    required: true,
    minCount: 1,
    maxCount: 3,
    defaultCount: 0,
    accentHex: '#3b82f6',
  },
  {
    id: 'imager',
    name: 'Multispectral Earth Imager',
    shortName: 'Imaging Instrument',
    category: 'Payload',
    description:
      'Nadir-facing optical telescope that captures high-resolution imagery of forests, oceans, cities, and polar ice.',
    engineeringLesson:
      'High-resolution Earth imaging is power-intensive (55 W active). Operating it blindly outside target zones wastes battery energy.',
    functionSummary: 'Primary Earth observation payload (55 W active)',
    massKg: 95,
    costMillion: 26,
    powerGenW: 0,
    powerDrawW: 55,
    batteryWh: 0,
    required: true,
    minCount: 1,
    maxCount: 1,
    defaultCount: 0,
    accentHex: '#06b6d4',
  },
  {
    id: 'antenna',
    name: 'X-Band High-Gain Antenna',
    shortName: 'Comms Antenna',
    category: 'Communications',
    description:
      'Steerable parabolic dish and S-band feed assembly for transmitting recorded science data down to Earth ground stations.',
    engineeringLesson:
      'Collected data sits in onboard memory until a ground station passes within line-of-sight. Downlinking requires 40 W of RF transmitter power.',
    functionSummary: 'Enables ground station downlink (40 W active)',
    massKg: 40,
    costMillion: 14,
    powerGenW: 0,
    powerDrawW: 40,
    batteryWh: 0,
    required: true,
    minCount: 1,
    maxCount: 1,
    defaultCount: 0,
    accentHex: '#a78bfa',
  },
  {
    id: 'sensor',
    name: 'Atmospheric & Thermal Sensor',
    shortName: 'Scientific Sensor',
    category: 'Payload',
    description:
      'Optional boom-mounted spectrometer that measures greenhouse gases, sea-surface temperature, and aerosol layers.',
    engineeringLesson:
      'Adding secondary science instruments boosts data collection speed by +45% and unlocks bonus science points, but demands careful power budgeting.',
    functionSummary: 'Boosts science data yield by +45% (30 W active)',
    massKg: 60,
    costMillion: 16,
    powerGenW: 0,
    powerDrawW: 30,
    batteryWh: 0,
    required: false,
    minCount: 0,
    maxCount: 1,
    defaultCount: 0,
    accentHex: '#10b981',
  },
];

export const COMPONENT_MAP: Record<ComponentId, SpacecraftComponentSpec> =
  SPACECRAFT_COMPONENTS.reduce(
    (acc, item) => {
      acc[item.id] = item;
      return acc;
    },
    {} as Record<ComponentId, SpacecraftComponentSpec>,
  );

export const DEFAULT_DESIGN: SpacecraftDesign = {
  bus: 0,
  solar: 0,
  battery: 0,
  imager: 0,
  antenna: 0,
  sensor: 0,
};
