import * as THREE from 'three';
import { COMPONENT_MAP, DEFAULT_DESIGN } from '../data/components';
import { GROUND_STATIONS } from '../data/groundStations';
import { ORBIT_MAP, TARGET_REGION_MAP } from '../data/orbits';
import {
  CameraMode,
  ComponentId,
  GameStage,
  MissionEvent,
  MissionOperationsState,
  MissionState,
  OrbitId,
  SimulationSpeed,
  SpacecraftDesign,
  TargetRegionId,
} from '../game/types';
import { MISSION_LIMITS } from '../styles/theme';
import {
  checkGroundStationContact,
  checkSatelliteInSunlight,
  computeObservationAlignment,
  computeOrbitPosition,
  EARTH_RADIUS_SCENE,
  latLonToWorldVector,
  worldVectorToLatLon,
} from './orbitalMath';
import { calculateDesignMetrics } from './spacecraftMath';

const EVENT_CATALOGUE: Array<
  Omit<MissionEvent, 'id' | 'timestampSec'>
> = [
  {
    title: 'Solar Proton Flux Attenuation',
    description:
      'High-altitude geomagnetic activity temporarily reduces photovoltaic conversion efficiency.',
    impactLabel: 'Solar Output -28% for 18s',
    severity: 'warning',
    durationSec: 18,
    solarMultiplier: 0.72,
  },
  {
    title: 'Clear-Sky Observation Corridor',
    description:
      'Cloud cover clears over the target biome, boosting optical signal-to-noise ratio.',
    impactLabel: 'Data Collection +45% for 20s',
    severity: 'opportunity',
    durationSec: 20,
    dataRateMultiplier: 1.45,
  },
  {
    title: 'S-Band Atmospheric Interference',
    description:
      'Ionospheric scintillation interrupts ground-station RF carrier lock.',
    impactLabel: 'Ground Downlink Paused for 12s',
    severity: 'warning',
    durationSec: 12,
    commsBlocked: true,
  },
  {
    title: 'Thermal Calibration Sweep',
    description:
      'Instrument optics require active heater stabilization during cold-side transit.',
    impactLabel: 'Imager Power Draw +25% for 16s',
    severity: 'info',
    durationSec: 16,
    imagerPowerMultiplier: 1.25,
  },
  {
    title: 'Priority Disaster-Response Pass',
    description:
      'Science team requests urgent high-rate telemetry capture across the current ground track.',
    impactLabel: 'All Surface Observations +35% for 22s',
    severity: 'opportunity',
    durationSec: 22,
    dataRateMultiplier: 1.35,
  },
];

export function createInitialOperationsState(
  batteryCapacityWh: number,
  orbitId: OrbitId,
): MissionOperationsState {
  const orbit = ORBIT_MAP[orbitId];
  const initialPos = computeOrbitPosition(orbit, 0, new THREE.Vector3());
  const { latDeg, lonDeg } = worldVectorToLatLon(initialPos, 0);

  return {
    elapsedSec: 0,
    isPaused: false,
    speed: 1,
    cameraMode: 'earth',
    earthRotationRad: 0.4,
    satellitePhaseRad: 0.25,
    satellitePosition: [initialPos.x, initialPos.y, initialPos.z],
    satelliteLatDeg: latDeg,
    satelliteLonDeg: lonDeg,
    inSunlight: true,
    solarOutputW: 0,
    powerConsumptionW: 18,
    batteryWh: batteryCapacityWh,
    batteryCapacityWh,
    batteryPct: 100,
    minBatteryPctObserved: 100,
    lowBatterySeconds: 0,
    imagerEnabled: false,
    sensorEnabled: false,
    commsEnabled: false,
    isObserving: false,
    observationDirectionDeg: 0,
    inTargetWindow: false,
    targetAlignmentPct: 0,
    dataCollectedGB: 0,
    dataTransmittedGB: 0,
    activeGroundStationId: null,
    availableGroundStationIds: [],
    commsStatusReason: 'Enable Communications to link with an in-range ground station.',
    isTransmitting: false,
    activeEvent: null,
    eventHistory: [],
    nextEventTriggerSec: 24,
    deployed: false,
    scienceBonusPoints: 0,
    samples: [
      {
        timeSec: 0,
        batteryPct: 100,
        solarW: 0,
        loadW: 18,
        dataCollectedGB: 0,
        dataTransmittedGB: 0,
      },
    ],
    missionEndedEarly: false,
  };
}

export function createInitialMissionState(soundEnabled = true): MissionState {
  const design = { ...DEFAULT_DESIGN };
  const metrics = calculateDesignMetrics(design);
  return {
    stage: 'menu',
    soundEnabled,
    design,
    selectedComponentId: 'bus',
    selectedOrbit: 'leo',
    selectedTargetRegion: 'forest',
    launchCompleted: false,
    operations: createInitialOperationsState(metrics.batteryCapacityWh, 'leo'),
  };
}

export type MissionAction =
  | { type: 'SET_STAGE'; stage: GameStage }
  | { type: 'TOGGLE_SOUND' }
  | { type: 'ADJUST_COMPONENT'; id: ComponentId; delta: number }
  | { type: 'SET_DESIGN'; design: SpacecraftDesign }
  | { type: 'SET_COMPONENT_COUNT'; id: ComponentId; count: number }
  | { type: 'SELECT_COMPONENT'; id: ComponentId | null }
  | { type: 'RESET_DESIGN' }
  | { type: 'SET_ORBIT'; orbit: OrbitId }
  | { type: 'SET_TARGET_REGION'; region: TargetRegionId }
  | { type: 'COMPLETE_LAUNCH' }
  | { type: 'TICK_OPERATIONS'; dtSec: number }
  | { type: 'TOGGLE_PAUSE' }
  | { type: 'SET_SPEED'; speed: SimulationSpeed }
  | { type: 'SET_CAMERA_MODE'; mode: CameraMode }
  | { type: 'TOGGLE_IMAGER' }
  | { type: 'TOGGLE_SENSOR' }
  | { type: 'TOGGLE_COMMS' }
  | { type: 'SET_OBSERVING'; observing: boolean }
  | { type: 'SET_OBSERVATION_DIRECTION'; deg: number }
  | { type: 'SELECT_GROUND_STATION'; stationId: string | null }
  | { type: 'END_MISSION_EARLY' }
  | { type: 'REPLAY_MISSION' }
  | { type: 'RETURN_TO_MENU' };

const _satPos = new THREE.Vector3();
const _targetWorld = new THREE.Vector3();
const _stationWorld = new THREE.Vector3();

function stepMissionOperations(state: MissionState, rawDt: number): MissionState {
  const op = state.operations;
  if (op.isPaused || state.stage !== 'operations') return state;

  const dt = Math.min(0.1, rawDt) * op.speed;
  const nextElapsed = op.elapsedSec + dt;
  const designMetrics = calculateDesignMetrics(state.design);
  const orbit = ORBIT_MAP[state.selectedOrbit];
  const target = TARGET_REGION_MAP[state.selectedTargetRegion];

  // Advance orbital phase and Earth rotation
  const earthRotationRad = op.earthRotationRad + dt * 0.028;
  const angularSpeed = (Math.PI * 2) / orbit.periodSeconds;
  const satellitePhaseRad = (op.satellitePhaseRad + dt * angularSpeed) % (Math.PI * 2);

  computeOrbitPosition(orbit, satellitePhaseRad, _satPos);
  const { latDeg, lonDeg } = worldVectorToLatLon(_satPos, earthRotationRad);
  const inSunlight = checkSatelliteInSunlight(_satPos, orbit);

  // Mission Event lifecycle
  let activeEvent = op.activeEvent;
  const eventHistory = [...op.eventHistory];
  let nextEventTriggerSec = op.nextEventTriggerSec;

  if (activeEvent && nextElapsed >= activeEvent.timestampSec + activeEvent.durationSec) {
    activeEvent = null;
  }

  if (!activeEvent && nextElapsed >= nextEventTriggerSec && nextElapsed < MISSION_LIMITS.missionDurationSec - 15) {
    const idx = eventHistory.length % EVENT_CATALOGUE.length;
    const template = EVENT_CATALOGUE[idx];
    activeEvent = {
      ...template,
      id: `evt-${eventHistory.length + 1}`,
      timestampSec: nextElapsed,
    };
    eventHistory.push(activeEvent);
    nextEventTriggerSec = nextElapsed + 36;
  }

  // Target observation alignment
  latLonToWorldVector(
    target.latDeg,
    target.lonDeg,
    EARTH_RADIUS_SCENE,
    earthRotationRad,
    _targetWorld,
  );
  const alignment = computeObservationAlignment(
    _satPos,
    _targetWorld,
    op.observationDirectionDeg,
  );

  // Ground station contact checks
  const availableStationIds: string[] = [];
  for (const gs of GROUND_STATIONS) {
    latLonToWorldVector(
      gs.latDeg,
      gs.lonDeg,
      EARTH_RADIUS_SCENE,
      earthRotationRad,
      _stationWorld,
    );
    const contact = checkGroundStationContact(
      _satPos,
      _stationWorld,
      gs.maxRangeScene,
      gs.minElevationDeg,
    );
    if (contact.inRange) {
      availableStationIds.push(gs.id);
    }
  }

  let activeGroundStationId = op.activeGroundStationId;
  if (activeGroundStationId && !availableStationIds.includes(activeGroundStationId)) {
    activeGroundStationId = null;
  }
  if (!activeGroundStationId && op.commsEnabled && availableStationIds.length > 0) {
    activeGroundStationId = availableStationIds[0];
  }

  // Auto-shutoff payloads if battery completely depletes (0%)
  let imagerEnabled = op.imagerEnabled;
  let sensorEnabled = op.sensorEnabled;
  let commsEnabled = op.commsEnabled;
  let isObserving = op.isObserving && imagerEnabled;

  if (op.batteryWh <= 0.5) {
    imagerEnabled = false;
    sensorEnabled = false;
    commsEnabled = false;
    isObserving = false;
  }

  // Power Generation & Consumption (W)
  const solarMult = activeEvent?.solarMultiplier ?? 1;
  const solarOutputW = inSunlight
    ? Math.round(designMetrics.solarGenerationW * solarMult)
    : 0;

  const imagerMult = activeEvent?.imagerPowerMultiplier ?? 1;
  const hasSensor = state.design.sensor > 0;
  const commsBlocked = Boolean(activeEvent?.commsBlocked);

  const canTransmit =
    commsEnabled &&
    !commsBlocked &&
    activeGroundStationId !== null &&
    op.dataCollectedGB - op.dataTransmittedGB > 0.05;

  let powerConsumptionW = designMetrics.baseBusDrawW;
  if (imagerEnabled) {
    // Active observation draws full imager power; standby draws 20W
    powerConsumptionW += Math.round(
      (isObserving ? COMPONENT_MAP.imager.powerDrawW : 20) * imagerMult,
    );
  }
  if (sensorEnabled && hasSensor) {
    powerConsumptionW += COMPONENT_MAP.sensor.powerDrawW;
  }
  if (commsEnabled) {
    powerConsumptionW += canTransmit ? COMPONENT_MAP.antenna.powerDrawW : 10;
  }

  // Energy integration: scale time so 180s mission feels lively like multiple orbital cycles
  // 1 simulated second = 0.025 Wh/W scaling (i.e. 90x compressed thermal-electric hours)
  const energyTimeScale = 0.024;
  const netPowerW = solarOutputW - powerConsumptionW;
  const nextBatteryWh = THREE.MathUtils.clamp(
    op.batteryWh + netPowerW * dt * energyTimeScale,
    0,
    designMetrics.batteryCapacityWh,
  );
  const batteryPct =
    designMetrics.batteryCapacityWh > 0
      ? (nextBatteryWh / designMetrics.batteryCapacityWh) * 100
      : 0;

  // Data collection
  let dataCollectedGB = op.dataCollectedGB;
  let scienceBonusPoints = op.scienceBonusPoints;
  if (imagerEnabled && isObserving) {
    const sensorBoost = sensorEnabled && hasSensor ? 1.45 : 1.0;
    const eventBoost = activeEvent?.dataRateMultiplier ?? 1.0;
    const targetFactor = alignment.inWindow
      ? target.dataBonusMultiplier * (0.65 + (alignment.alignmentPct / 100) * 0.75)
      : 0.18; // General baseline background mapping vs focused target corridor

    const baseRateGBPerSec = 1.65 * orbit.resolutionMultiplier;
    const deltaGB = baseRateGBPerSec * sensorBoost * eventBoost * targetFactor * dt;
    dataCollectedGB += deltaGB;
    if (alignment.inWindow && sensorEnabled && hasSensor) {
      scienceBonusPoints += dt * 0.4;
    }
  }

  // Data transmission
  let dataTransmittedGB = op.dataTransmittedGB;
  let commsStatusReason = '';
  if (!commsEnabled) {
    commsStatusReason = 'Communications subsystem is OFF.';
  } else if (commsBlocked) {
    commsStatusReason = 'Ionospheric interference blocking RF link.';
  } else if (availableStationIds.length === 0) {
    commsStatusReason = 'No ground station in line-of-sight range.';
  } else if (dataCollectedGB - dataTransmittedGB <= 0.05) {
    commsStatusReason = 'Ground link ready — collect observation data first.';
  } else {
    const downlinkRateGBPerSec = orbit.id === 'meo' ? 4.8 : 4.2;
    const tx = Math.min(
      dataCollectedGB - dataTransmittedGB,
      downlinkRateGBPerSec * dt,
    );
    dataTransmittedGB += tx;
    const st = GROUND_STATIONS.find((g) => g.id === activeGroundStationId);
    commsStatusReason = `Downlinking to ${st ? st.name : 'Ground Station'} (${downlinkRateGBPerSec.toFixed(1)} GB/s).`;
  }

  const minBatteryPctObserved = Math.min(op.minBatteryPctObserved, batteryPct);
  const lowBatterySeconds =
    batteryPct < MISSION_LIMITS.lowBatteryThresholdPct
      ? op.lowBatterySeconds + dt
      : op.lowBatterySeconds;

  const samples = [...op.samples];
  const lastSample = samples[samples.length - 1];
  if (!lastSample || nextElapsed - lastSample.timeSec >= 5) {
    samples.push({
      timeSec: Math.round(nextElapsed),
      batteryPct: Math.round(batteryPct),
      solarW: solarOutputW,
      loadW: powerConsumptionW,
      dataCollectedGB: Number(dataCollectedGB.toFixed(1)),
      dataTransmittedGB: Number(dataTransmittedGB.toFixed(1)),
    });
  }

  const reachedEnd = nextElapsed >= MISSION_LIMITS.missionDurationSec;

  return {
    ...state,
    stage: reachedEnd ? 'report' : state.stage,
    operations: {
      ...op,
      elapsedSec: Math.min(MISSION_LIMITS.missionDurationSec, nextElapsed),
      earthRotationRad,
      satellitePhaseRad,
      satellitePosition: [_satPos.x, _satPos.y, _satPos.z],
      satelliteLatDeg: Math.round(latDeg * 10) / 10,
      satelliteLonDeg: Math.round(lonDeg * 10) / 10,
      inSunlight,
      solarOutputW,
      powerConsumptionW,
      batteryWh: nextBatteryWh,
      batteryCapacityWh: designMetrics.batteryCapacityWh,
      batteryPct,
      minBatteryPctObserved,
      lowBatterySeconds,
      imagerEnabled,
      sensorEnabled,
      commsEnabled,
      isObserving,
      inTargetWindow: alignment.inWindow,
      targetAlignmentPct: alignment.alignmentPct,
      dataCollectedGB,
      dataTransmittedGB,
      activeGroundStationId,
      availableGroundStationIds: availableStationIds,
      commsStatusReason,
      isTransmitting: canTransmit,
      activeEvent,
      eventHistory,
      nextEventTriggerSec,
      deployed: true,
      scienceBonusPoints,
      samples,
    },
  };
}

export function missionReducer(
  state: MissionState,
  action: MissionAction,
): MissionState {
  switch (action.type) {
    case 'SET_STAGE':
      return { ...state, stage: action.stage };

    case 'TOGGLE_SOUND':
      return { ...state, soundEnabled: !state.soundEnabled };

    case 'ADJUST_COMPONENT': {
      const spec = COMPONENT_MAP[action.id];
      const current = state.design[action.id] ?? 0;
      const next = THREE.MathUtils.clamp(current + action.delta, 0, spec.maxCount);
      return {
        ...state,
        design: { ...state.design, [action.id]: next },
        selectedComponentId: action.id,
      };
    }

    case 'SET_DESIGN':
      return { ...state, design: { ...action.design } };

    case 'SET_COMPONENT_COUNT': {
      const spec = COMPONENT_MAP[action.id];
      const next = THREE.MathUtils.clamp(action.count, 0, spec.maxCount);
      return {
        ...state,
        design: { ...state.design, [action.id]: next },
        selectedComponentId: action.id,
      };
    }

    case 'SELECT_COMPONENT':
      return { ...state, selectedComponentId: action.id };

    case 'RESET_DESIGN':
      return {
        ...state,
        design: { ...DEFAULT_DESIGN },
        selectedComponentId: 'bus',
      };

    case 'SET_ORBIT':
      return { ...state, selectedOrbit: action.orbit };

    case 'SET_TARGET_REGION':
      return { ...state, selectedTargetRegion: action.region };

    case 'COMPLETE_LAUNCH': {
      const metrics = calculateDesignMetrics(state.design);
      const initialOp = createInitialOperationsState(
        metrics.batteryCapacityWh,
        state.selectedOrbit,
      );
      return {
        ...state,
        launchCompleted: true,
        stage: 'operations',
        operations: {
          ...initialOp,
          deployed: true,
          imagerEnabled: true,
          isObserving: false,
          commsEnabled: true,
        },
      };
    }

    case 'TICK_OPERATIONS':
      return stepMissionOperations(state, action.dtSec);

    case 'TOGGLE_PAUSE':
      return {
        ...state,
        operations: {
          ...state.operations,
          isPaused: !state.operations.isPaused,
        },
      };

    case 'SET_SPEED':
      return {
        ...state,
        operations: { ...state.operations, speed: action.speed },
      };

    case 'SET_CAMERA_MODE':
      return {
        ...state,
        operations: { ...state.operations, cameraMode: action.mode },
      };

    case 'TOGGLE_IMAGER': {
      const nextImager = !state.operations.imagerEnabled;
      return {
        ...state,
        operations: {
          ...state.operations,
          imagerEnabled: nextImager,
          isObserving: nextImager ? state.operations.isObserving : false,
        },
      };
    }

    case 'TOGGLE_SENSOR': {
      if (state.design.sensor < 1) return state;
      return {
        ...state,
        operations: {
          ...state.operations,
          sensorEnabled: !state.operations.sensorEnabled,
        },
      };
    }

    case 'TOGGLE_COMMS':
      return {
        ...state,
        operations: {
          ...state.operations,
          commsEnabled: !state.operations.commsEnabled,
        },
      };

    case 'SET_OBSERVING':
      return {
        ...state,
        operations: {
          ...state.operations,
          imagerEnabled: action.observing ? true : state.operations.imagerEnabled,
          isObserving: action.observing,
        },
      };

    case 'SET_OBSERVATION_DIRECTION':
      return {
        ...state,
        operations: {
          ...state.operations,
          observationDirectionDeg: THREE.MathUtils.clamp(action.deg, -25, 25),
        },
      };

    case 'SELECT_GROUND_STATION':
      return {
        ...state,
        operations: {
          ...state.operations,
          activeGroundStationId: action.stationId,
          commsEnabled: action.stationId ? true : state.operations.commsEnabled,
        },
      };

    case 'END_MISSION_EARLY':
      return {
        ...state,
        stage: 'report',
        operations: {
          ...state.operations,
          missionEndedEarly:
            state.operations.elapsedSec < MISSION_LIMITS.missionDurationSec - 2,
        },
      };

    case 'REPLAY_MISSION': {
      const fresh = createInitialMissionState(state.soundEnabled);
      return {
        ...fresh,
        stage: 'briefing',
      };
    }

    case 'RETURN_TO_MENU':
      return createInitialMissionState(state.soundEnabled);

    default:
      return state;
  }
}
