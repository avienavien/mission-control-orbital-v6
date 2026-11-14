import { COMPONENT_MAP } from '../data/components';
import { ORBIT_MAP, TARGET_REGION_MAP } from '../data/orbits';
import {
  MissionObjective,
  MissionReportData,
  MissionState,
} from '../game/types';
import { MISSION_LIMITS } from '../styles/theme';
import { calculateDesignMetrics } from './spacecraftMath';

export function computeMissionObjectives(state: MissionState): MissionObjective[] {
  const op = state.operations;
  const collectPct = Math.min(
    1,
    op.dataCollectedGB / MISSION_LIMITS.targetDataCollectGB,
  );
  const transmitPct = Math.min(
    1,
    op.dataTransmittedGB / MISSION_LIMITS.targetDataTransmitGB,
  );
  const durationPct = Math.min(
    1,
    op.elapsedSec / MISSION_LIMITS.missionDurationSec,
  );
  const batteryHealthy = op.minBatteryPctObserved >= 15;

  return [
    {
      id: 'deploy',
      label: 'Deploy Satellite into Orbit',
      description: 'Complete launch ascent and spacecraft orbital insertion.',
      progress: state.launchCompleted || op.deployed ? 1 : 0,
      completed: state.launchCompleted || op.deployed,
      valueLabel: state.launchCompleted || op.deployed ? 'Deployed' : 'Pending',
    },
    {
      id: 'collect',
      label: `Collect ${MISSION_LIMITS.targetDataCollectGB} GB Observation Data`,
      description: 'Activate Imager over target regions to gather science data.',
      progress: collectPct,
      completed: op.dataCollectedGB >= MISSION_LIMITS.targetDataCollectGB,
      valueLabel: `${op.dataCollectedGB.toFixed(1)} / ${MISSION_LIMITS.targetDataCollectGB} GB`,
    },
    {
      id: 'transmit',
      label: `Transmit ${MISSION_LIMITS.targetDataTransmitGB} GB to Ground Stations`,
      description: 'Establish downlink during ground station passes.',
      progress: transmitPct,
      completed: op.dataTransmittedGB >= MISSION_LIMITS.targetDataTransmitGB,
      valueLabel: `${op.dataTransmittedGB.toFixed(1)} / ${MISSION_LIMITS.targetDataTransmitGB} GB`,
    },
    {
      id: 'battery',
      label: 'Maintain Safe Battery Reserve (≥ 15%)',
      description: 'Prevent critical deep discharge during eclipse shadows.',
      progress: batteryHealthy ? 1 : Math.max(0, op.minBatteryPctObserved / 15),
      completed: batteryHealthy && op.elapsedSec > 10,
      valueLabel: `Min ${op.minBatteryPctObserved.toFixed(0)}%`,
    },
    {
      id: 'duration',
      label: 'Complete Observation Period',
      description: `Operate satellite for full ${MISSION_LIMITS.missionDurationSec}s mission timeline.`,
      progress: durationPct,
      completed: op.elapsedSec >= MISSION_LIMITS.missionDurationSec - 0.5,
      valueLabel: `${Math.min(MISSION_LIMITS.missionDurationSec, Math.floor(op.elapsedSec))} / ${MISSION_LIMITS.missionDurationSec}s`,
    },
  ];
}

export function generateMissionReport(state: MissionState): MissionReportData {
  const designMetrics = calculateDesignMetrics(state.design);
  const orbit = ORBIT_MAP[state.selectedOrbit];
  const target = TARGET_REGION_MAP[state.selectedTargetRegion];
  const op = state.operations;
  const objectives = computeMissionObjectives(state);

  const completedCount = objectives.filter((o) => o.completed).length;

  // 1. Objective Completion Score (max 400)
  const collectRatio = Math.min(
    1.15,
    op.dataCollectedGB / MISSION_LIMITS.targetDataCollectGB,
  );
  const transmitRatio = Math.min(
    1.15,
    op.dataTransmittedGB / MISSION_LIMITS.targetDataTransmitGB,
  );
  const durationRatio = Math.min(
    1,
    op.elapsedSec / MISSION_LIMITS.missionDurationSec,
  );
  const objectiveScore = Math.round(
    Math.min(
      400,
      (state.launchCompleted ? 60 : 0) +
        collectRatio * 130 +
        transmitRatio * 140 +
        durationRatio * 70,
    ),
  );

  // 2. Power & Resource Management Score (max 250)
  const batteryDiscipline =
    op.minBatteryPctObserved >= 25
      ? 150
      : op.minBatteryPctObserved >= 15
        ? 115
        : op.minBatteryPctObserved > 0
          ? 70
          : 25;
  const lowPowerPenalty = Math.min(80, Math.round(op.lowBatterySeconds * 2.5));
  const endingChargeBonus = Math.round((op.batteryPct / 100) * 100);
  const powerScore = Math.max(
    0,
    Math.min(250, batteryDiscipline + endingChargeBonus - lowPowerPenalty),
  );

  // 3. Spacecraft Engineering & Budget Efficiency (max 200)
  const massEfficiency =
    designMetrics.remainingMassKg >= 0
      ? Math.round(50 + Math.min(40, (designMetrics.remainingMassKg / designMetrics.maxMassKg) * 100))
      : 0;
  const budgetEfficiency =
    designMetrics.remainingBudgetMillion >= 0
      ? Math.round(50 + Math.min(40, (designMetrics.remainingBudgetMillion / designMetrics.totalBudgetMillion) * 100))
      : 0;
  const sensorSynergy = state.design.sensor > 0 ? 20 : 0;
  const designScore = Math.min(200, massEfficiency + budgetEfficiency + sensorSynergy);

  // 4. Communication & Science Yield (max 150)
  const transmitEfficiency =
    op.dataCollectedGB > 0
      ? Math.min(1, op.dataTransmittedGB / op.dataCollectedGB)
      : 0;
  const commsScore = Math.round(
    transmitEfficiency * 110 + Math.min(40, op.scienceBonusPoints),
  );

  const totalScore = Math.min(
    1000,
    objectiveScore + powerScore + designScore + commsScore,
  );

  let outcomeTier: MissionReportData['outcomeTier'] = 'partial';
  let outcomeTitle = 'Partial Mission Success';

  if (totalScore >= 820 && completedCount >= 4 && op.dataTransmittedGB >= 80) {
    outcomeTier = 'exceptional';
    outcomeTitle = 'Mission Accomplished — Exceptional Operations';
  } else if (totalScore >= 650 && op.dataTransmittedGB >= 50) {
    outcomeTier = 'success';
    outcomeTitle = 'Mission Successful — Nominal Science Return';
  } else if (totalScore >= 400 && op.dataCollectedGB >= 25) {
    outcomeTier = 'partial';
    outcomeTitle = 'Partial Success — Limited Data Downlink';
  } else {
    outcomeTier = 'compromised';
    outcomeTitle = 'Mission Compromised — Insufficient Science Return';
  }

  // Diagnostic prose strictly derived from actual state
  const whatWentWell: string[] = [];
  const helpfulDecisions: string[] = [];
  const problemsEncountered: string[] = [];
  const improvementsForNextAttempt: string[] = [];

  if (op.dataCollectedGB >= MISSION_LIMITS.targetDataCollectGB) {
    whatWentWell.push(
      `Exceeded the ${MISSION_LIMITS.targetDataCollectGB} GB collection goal with ${op.dataCollectedGB.toFixed(1)} GB of ${target.name} observations.`,
    );
  } else if (op.dataCollectedGB >= 50) {
    whatWentWell.push(
      `Captured ${op.dataCollectedGB.toFixed(1)} GB of imagery over ${target.name}.`,
    );
  }

  if (op.dataTransmittedGB >= MISSION_LIMITS.targetDataTransmitGB) {
    whatWentWell.push(
      `Successfully downlinked ${op.dataTransmittedGB.toFixed(1)} GB to Earth ground stations.`,
    );
  }

  if (op.minBatteryPctObserved >= 25) {
    whatWentWell.push(
      `Maintained strong power discipline across eclipse shadows (minimum battery never dropped below ${op.minBatteryPctObserved.toFixed(0)}%).`,
    );
  }

  if (state.design.solar >= 2) {
    helpfulDecisions.push(
      `Installing ${state.design.solar} pairs of ${COMPONENT_MAP.solar.shortName} generated ${designMetrics.solarGenerationW} W in sunlight, keeping recharge cycles rapid.`,
    );
  }
  if (state.design.battery >= 2) {
    helpfulDecisions.push(
      `Including ${state.design.battery} ${COMPONENT_MAP.battery.shortName} units provided ${designMetrics.batteryCapacityWh} Wh capacity for longer eclipse imaging.`,
    );
  }
  if (state.design.sensor > 0) {
    helpfulDecisions.push(
      `Equipping the optional ${COMPONENT_MAP.sensor.shortName} boosted scientific collection yield by +45%.`,
    );
  }
  if (orbit.id === 'sso' && target.id === 'polar') {
    helpfulDecisions.push(
      'Pairing Sun-Synchronous Orbit (82° inclination) with the Arctic Sea Ice target provided direct polar overflights and Svalbard station passes.',
    );
  } else if (orbit.id === 'leo' && target.id !== 'polar') {
    helpfulDecisions.push(
      `Low Earth Orbit gave +25% optical detail and rapid revisits over ${target.name}.`,
    );
  } else if (orbit.id === 'meo') {
    helpfulDecisions.push(
      'Medium Earth Orbit delivered long ground-station communication windows and minimal eclipse downtime.',
    );
  }

  if (designMetrics.remainingBudgetMillion >= 12) {
    helpfulDecisions.push(
      `Built a cost-effective spacecraft with $${designMetrics.remainingBudgetMillion}M budget margin remaining.`,
    );
  }

  if (op.minBatteryPctObserved < 15) {
    problemsEncountered.push(
      `Battery dipped to ${op.minBatteryPctObserved.toFixed(0)}% (${op.lowBatterySeconds.toFixed(0)}s in critical low-power state), risking instrument brownouts.`,
    );
    improvementsForNextAttempt.push(
      'Turn off the Imaging Instrument during Earth eclipse or add an extra Battery Pack / Solar Wing pair.',
    );
  }

  if (op.dataCollectedGB > op.dataTransmittedGB + 25) {
    problemsEncountered.push(
      `${(op.dataCollectedGB - op.dataTransmittedGB).toFixed(1)} GB of collected data remained stored onboard untransmitted.`,
    );
    improvementsForNextAttempt.push(
      'Enable Communications whenever Goldstone, Svalbard, or Canberra passes within line-of-sight.',
    );
  }

  if (op.dataCollectedGB < MISSION_LIMITS.targetDataCollectGB) {
    problemsEncountered.push(
      `Collected ${op.dataCollectedGB.toFixed(1)} GB, short of the ${MISSION_LIMITS.targetDataCollectGB} GB mission science goal.`,
    );
    improvementsForNextAttempt.push(
      'Use off-nadir steering (-25° to +25°) and keep observation active while passing near the target corridor.',
    );
  }

  if (orbit.id === 'leo' && target.id === 'polar') {
    problemsEncountered.push(
      'LEO at 38° inclination does not fly directly over the 74°N Arctic target, limiting polar observation alignment.',
    );
    improvementsForNextAttempt.push(
      'Select Sun-Synchronous Orbit (SSO) when targeting high-latitude Polar regions.',
    );
  }

  if (op.missionEndedEarly) {
    problemsEncountered.push(
      `Mission ended early at ${Math.floor(op.elapsedSec)}s of ${MISSION_LIMITS.missionDurationSec}s, reducing available orbital passes.`,
    );
    improvementsForNextAttempt.push(
      'Use 2x or 5x simulation speed to complete full orbital cycles rather than ending operations early.',
    );
  }

  if (whatWentWell.length === 0) {
    whatWentWell.push('Spacecraft launched and achieved stable orbital deployment.');
  }
  if (improvementsForNextAttempt.length === 0) {
    improvementsForNextAttempt.push(
      'Experiment with a lighter spacecraft configuration or try MEO / Polar target combinations to compare orbital trade-offs.',
    );
  }

  const badges: MissionReportData['badges'] = [];
  if (op.dataCollectedGB >= MISSION_LIMITS.targetDataCollectGB) {
    badges.push({
      id: 'science-ace',
      title: 'Earth Observer',
      description: `Collected ${MISSION_LIMITS.targetDataCollectGB}+ GB of Earth observation telemetry.`,
    });
  }
  if (op.dataTransmittedGB >= MISSION_LIMITS.targetDataTransmitGB) {
    badges.push({
      id: 'dsn-link',
      title: 'Deep Space Communicator',
      description: `Downlinked ${MISSION_LIMITS.targetDataTransmitGB}+ GB to ground stations.`,
    });
  }
  if (op.minBatteryPctObserved >= 30 && op.elapsedSec >= 120) {
    badges.push({
      id: 'power-master',
      title: 'Power Engineer',
      description: 'Kept satellite battery above 30% throughout operations.',
    });
  }
  if (state.design.sensor > 0 && op.dataCollectedGB >= 80) {
    badges.push({
      id: 'multi-spectral',
      title: 'Full-Spectrum Scientist',
      description: 'Operated both Multispectral Imager and Atmospheric Sensor.',
    });
  }
  if (designMetrics.remainingBudgetMillion >= 20 && completedCount >= 4) {
    badges.push({
      id: 'lean-craft',
      title: 'Lean Aerospace Architect',
      description: 'Completed primary objectives while saving $20M+ budget.',
    });
  }

  return {
    outcomeTitle,
    outcomeTier,
    totalScore,
    maxScore: 1000,
    scoreBreakdown: [
      { label: 'Mission Objectives', score: objectiveScore, max: 400 },
      { label: 'Power & Battery Discipline', score: powerScore, max: 250 },
      { label: 'Spacecraft Engineering', score: designScore, max: 200 },
      { label: 'Comms & Science Yield', score: commsScore, max: 150 },
    ],
    badges,
    objectivesCompletedCount: completedCount,
    objectivesTotalCount: objectives.length,
    whatWentWell,
    helpfulDecisions,
    problemsEncountered,
    improvementsForNextAttempt,
  };
}
