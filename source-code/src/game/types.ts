export type GameStage =
  | 'menu'
  | 'briefing'
  | 'designer'
  | 'orbit'
  | 'launch'
  | 'operations'
  | 'report';

export type ComponentId =
  | 'bus'
  | 'solar'
  | 'battery'
  | 'imager'
  | 'antenna'
  | 'sensor';

export interface SpacecraftComponentSpec {
  id: ComponentId;
  name: string;
  shortName: string;
  category: 'Structure' | 'Power' | 'Payload' | 'Communications';
  description: string;
  engineeringLesson: string;
  functionSummary: string;
  massKg: number;
  costMillion: number;
  powerGenW: number;
  powerDrawW: number;
  batteryWh: number;
  required: boolean;
  minCount: number;
  maxCount: number;
  defaultCount: number;
  accentHex: string;
}

export type SpacecraftDesign = Record<ComponentId, number>;

export interface DesignMetrics {
  totalMassKg: number;
  maxMassKg: number;
  remainingMassKg: number;
  totalCostMillion: number;
  totalBudgetMillion: number;
  remainingBudgetMillion: number;
  solarGenerationW: number;
  baseBusDrawW: number;
  peakConsumptionW: number;
  batteryCapacityWh: number;
  isValid: boolean;
  validationErrors: string[];
  warnings: string[];
}

export type OrbitId = 'leo' | 'sso' | 'meo';

export interface OrbitSpec {
  id: OrbitId;
  name: string;
  shortName: string;
  altitudeLabel: string;
  orbitRadiusScene: number;
  inclinationDeg: number;
  ascendingNodeDeg: number;
  periodSeconds: number;
  swathBonus: number;
  resolutionMultiplier: number;
  sunlightBias: number;
  description: string;
  benefits: string[];
  tradeoffs: string[];
  educationalNote: string;
}

export type TargetRegionId = 'forest' | 'ocean' | 'urban' | 'polar';

export interface TargetRegionSpec {
  id: TargetRegionId;
  name: string;
  locationLabel: string;
  latDeg: number;
  lonDeg: number;
  biomeColor: string;
  description: string;
  scienceGoal: string;
  dataBonusMultiplier: number;
}

export interface GroundStationSpec {
  id: string;
  name: string;
  region: string;
  latDeg: number;
  lonDeg: number;
  maxRangeScene: number;
  minElevationDeg: number;
  description: string;
}

export type CameraMode = 'earth' | 'satellite' | 'free';

export type SimulationSpeed = 1 | 2 | 5;

export interface MissionEvent {
  id: string;
  timestampSec: number;
  title: string;
  description: string;
  impactLabel: string;
  severity: 'info' | 'opportunity' | 'warning';
  durationSec: number;
  solarMultiplier?: number;
  imagerPowerMultiplier?: number;
  dataRateMultiplier?: number;
  commsBlocked?: boolean;
}

export interface MissionObjective {
  id: string;
  label: string;
  description: string;
  progress: number; // 0 to 1
  completed: boolean;
  valueLabel: string;
}

export interface TelemetryLogSample {
  timeSec: number;
  batteryPct: number;
  solarW: number;
  loadW: number;
  dataCollectedGB: number;
  dataTransmittedGB: number;
}

export interface MissionOperationsState {
  elapsedSec: number;
  isPaused: boolean;
  speed: SimulationSpeed;
  cameraMode: CameraMode;
  earthRotationRad: number;
  satellitePhaseRad: number;
  satellitePosition: [number, number, number];
  satelliteLatDeg: number;
  satelliteLonDeg: number;
  inSunlight: boolean;
  solarOutputW: number;
  powerConsumptionW: number;
  batteryWh: number;
  batteryCapacityWh: number;
  batteryPct: number;
  minBatteryPctObserved: number;
  lowBatterySeconds: number;
  imagerEnabled: boolean;
  sensorEnabled: boolean;
  commsEnabled: boolean;
  isObserving: boolean;
  observationDirectionDeg: number; // -25 to +25 off-nadir steering
  inTargetWindow: boolean;
  targetAlignmentPct: number;
  dataCollectedGB: number;
  dataTransmittedGB: number;
  activeGroundStationId: string | null;
  availableGroundStationIds: string[];
  commsStatusReason: string;
  isTransmitting: boolean;
  activeEvent: MissionEvent | null;
  eventHistory: MissionEvent[];
  nextEventTriggerSec: number;
  deployed: boolean;
  scienceBonusPoints: number;
  samples: TelemetryLogSample[];
  missionEndedEarly: boolean;
}

export interface MissionReportData {
  outcomeTitle: string;
  outcomeTier: 'exceptional' | 'success' | 'partial' | 'compromised';
  totalScore: number;
  maxScore: number;
  scoreBreakdown: {
    label: string;
    score: number;
    max: number;
  }[];
  badges: {
    id: string;
    title: string;
    description: string;
  }[];
  objectivesCompletedCount: number;
  objectivesTotalCount: number;
  whatWentWell: string[];
  helpfulDecisions: string[];
  problemsEncountered: string[];
  improvementsForNextAttempt: string[];
}

export interface MissionState {
  stage: GameStage;
  soundEnabled: boolean;
  design: SpacecraftDesign;
  selectedComponentId: ComponentId | null;
  selectedOrbit: OrbitId;
  selectedTargetRegion: TargetRegionId;
  launchCompleted: boolean;
  operations: MissionOperationsState;
}
