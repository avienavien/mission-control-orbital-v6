export enum SubsystemCategory {
  BUS = 'bus',
  POWER = 'power',
  PROPULSION = 'propulsion',
  AVIONICS = 'avionics',
  COMMS = 'comms',
  PAYLOAD = 'payload',
  THERMAL = 'thermal',
}

export enum SocketKind {
  DECK_MOUNT = 'deck_mount',
  PROPULSION_MOUNT = 'propulsion_mount',
  LATERAL_MOUNT = 'lateral_mount',
  INSTRUMENT_MOUNT = 'instrument_mount',
  AUXILIARY_MOUNT = 'auxiliary_mount',
  BAY_SLOT = 'bay_slot',
}

export enum SurfaceFinish {
  GOLD_MLI = 'gold_mli',
  TITANIUM = 'titanium',
  WHITE_CERAMIC = 'white_ceramic',
  CARBON_COMPOSITE = 'carbon_composite',
}

export enum MissionGoalId {
  FREEFORM = 'freeform',
  LEO_EARTH = 'leo_earth',
  GEO_COMMS = 'geo_comms',
  DEEP_SPACE = 'deep_space',
}

export enum CameraPreset {
  ISO = 'iso',
  TOP = 'top',
  FRONT = 'front',
  SIDE = 'side',
}

export interface SocketDefinition {
  id: string;
  label: string;
  kind: SocketKind;
  position: [number, number, number];
  normal: [number, number, number];
}

export interface PartDefinition {
  id: string;
  name: string;
  shortName: string;
  category: SubsystemCategory;
  compatibleSockets: SocketKind[];
  massKg: number;
  propellantKg?: number;
  ispSec?: number;
  powerGenW: number;
  powerDrawW: number;
  batteryWh?: number;
  dataRateMbps?: number;
  thermalDissipationW?: number;
  attitudeTorqueNm?: number;
  deployable?: boolean;
  defaultFinish: SurfaceFinish;
  description: string;
  busSockets?: SocketDefinition[];
}

export interface PlacedPart {
  instanceId: string;
  partId: string;
  socketId: string;
  rotationStep: 0 | 1 | 2 | 3;
  deployed: boolean;
  finish: SurfaceFinish;
  installedAt: number;
}

export interface MissionCheckItem {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
  warningTitle: string;
  whyNeeded: string;
  recommendedPartId?: string;
  recommendedSocketId?: string;
}

export interface BlueprintSlotSpec {
  socketId: string;
  partId: string;
  required: boolean;
}

export interface MissionGoal {
  id: MissionGoalId;
  name: string;
  orbitLabel: string;
  summary: string;
  minPowerMarginW: number;
  minDeltaV: number;
  minDownlinkMbps: number;
  minBatteryWh: number;
  requirePayloadIds?: string[];
  requireAnyPayload?: boolean;
  requireRtgOrHighSolar?: boolean;
  blueprintBusId: string;
  blueprintParts: BlueprintSlotSpec[];
}

export interface SpacecraftTelemetry {
  hasBus: boolean;
  dryMassKg: number;
  propellantKg: number;
  wetMassKg: number;
  powerGenW: number;
  powerDrawW: number;
  netPowerW: number;
  batteryWh: number;
  eclipseMinutes: number;
  deltaV: number;
  downlinkMbps: number;
  thermalBalanceW: number;
  comOffsetRatio: number;
  isBalanced: boolean;
  partCount: number;
  totalSockets: number;
  missionChecks: MissionCheckItem[];
  isFlightReady: boolean;
}
