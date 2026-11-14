import { MISSION_GOALS, PARTS_BY_ID } from '../data/partsCatalog';
import {
  MissionCheckItem,
  MissionGoalId,
  PlacedPart,
  SpacecraftTelemetry,
  SubsystemCategory,
} from '../types/satellite';

const G0 = 9.80665;

export function calculateSpacecraftTelemetry(
  placedParts: PlacedPart[],
  missionGoalId: MissionGoalId
): SpacecraftTelemetry {
  const busPlaced = placedParts.find(
    (p) => PARTS_BY_ID[p.partId]?.category === SubsystemCategory.BUS
  );
  const busDef = busPlaced ? PARTS_BY_ID[busPlaced.partId] : undefined;
  const sockets = busDef?.busSockets ?? [];
  const socketMap = new Map(sockets.map((s) => [s.id, s]));

  let dryMassKg = 0;
  let propellantKg = 0;
  let powerGenW = 0;
  let powerDrawW = 0;
  let batteryWh = 0;
  let downlinkMbps = 0;
  let thermalDissipationW = 0;
  let totalTorqueNm = 0;

  // Center of mass tracking (XZ lateral balance)
  let momentX = 0;
  let momentZ = 0;

  let hasFlightComputer = false;
  let hasPowerSource = false;
  let hasPropulsion = false;
  let hasComms = false;
  let hasThermalControl = false;
  let hasRtg = false;
  const payloadIds = new Set<string>();

  // Propulsion tracking for harmonic / multi-engine Tsiolkovsky calculation
  let thrustWeightedIspNum = 0;
  let thrustWeightedIspDen = 0;

  for (const placed of placedParts) {
    const def = PARTS_BY_ID[placed.partId];
    if (!def) continue;

    dryMassKg += def.massKg;
    const prop = def.propellantKg ?? 0;
    propellantKg += prop;
    powerGenW += def.powerGenW;
    powerDrawW += def.powerDrawW;
    batteryWh += def.batteryWh ?? 0;
    downlinkMbps = Math.max(downlinkMbps, def.dataRateMbps ?? 0);
    thermalDissipationW += def.thermalDissipationW ?? 0;
    totalTorqueNm += def.attitudeTorqueNm ?? 0;

    if (def.category === SubsystemCategory.POWER && def.powerGenW > 0) {
      hasPowerSource = true;
    }
    if (def.id === 'pwr_rtg_nuclear') {
      hasRtg = true;
    }
    if (def.id === 'av_flight_computer') {
      hasFlightComputer = true;
    }
    if (def.category === SubsystemCategory.PROPULSION) {
      hasPropulsion = true;
      if (prop > 0 && def.ispSec) {
        thrustWeightedIspNum += prop * def.ispSec;
        thrustWeightedIspDen += prop;
      }
    }
    if (def.category === SubsystemCategory.COMMS) {
      hasComms = true;
    }
    if (def.category === SubsystemCategory.THERMAL) {
      hasThermalControl = true;
    }
    if (def.category === SubsystemCategory.PAYLOAD) {
      payloadIds.add(def.id);
    }

    const sock = socketMap.get(placed.socketId);
    if (sock) {
      const partTotalMass = def.massKg + prop;
      momentX += sock.position[0] * partTotalMass;
      momentZ += sock.position[2] * partTotalMass;
    }
  }

  const wetMassKg = dryMassKg + propellantKg;
  const netPowerW = powerGenW - powerDrawW;
  const effectiveIsp =
    thrustWeightedIspDen > 0 ? thrustWeightedIspNum / thrustWeightedIspDen : 0;

  const deltaV =
    wetMassKg > dryMassKg && dryMassKg > 0 && effectiveIsp > 0
      ? effectiveIsp * G0 * Math.log(wetMassKg / dryMassKg)
      : 0;

  const eclipseMinutes =
    powerDrawW > 0 && batteryWh > 0 ? (batteryWh / powerDrawW) * 60 : 0;

  const thermalBalanceW = thermalDissipationW - powerDrawW * 0.65;

  const goal =
    MISSION_GOALS.find((g) => g.id === missionGoalId) ?? MISSION_GOALS[0];

  const busDefForFallback = PARTS_BY_ID[goal.blueprintBusId];
  const activeSockets = busDef?.busSockets ?? busDefForFallback?.busSockets ?? [];
  const activeSocketMap = new Map(activeSockets.map((s) => [s.id, s]));

  // Recompute CoM against active/blueprint sockets when bus isn't mounted yet
  if (!busDef && placedParts.length > 0) {
    momentX = 0;
    momentZ = 0;
    for (const placed of placedParts) {
      const def = PARTS_BY_ID[placed.partId];
      if (!def) continue;
      const sock = activeSocketMap.get(placed.socketId);
      if (sock) {
        const partTotalMass = def.massKg + (def.propellantKg ?? 0);
        momentX += sock.position[0] * partTotalMass;
        momentZ += sock.position[2] * partTotalMass;
      }
    }
  }

  const comOffsetMagUpdated =
    wetMassKg > 0 ? Math.hypot(momentX, momentZ) / wetMassKg : 0;
  const isBalancedUpdated = comOffsetMagUpdated <= 0.35;

  const findBlueprintSocket = (category: SubsystemCategory, fallbackSocket: string) => {
    const match = goal.blueprintParts.find(
      (bp) => PARTS_BY_ID[bp.partId]?.category === category
    );
    return match ? { partId: match.partId, socketId: match.socketId } : { partId: '', socketId: fallbackSocket };
  };

  const powerSuggestion = !hasPowerSource
    ? findBlueprintSocket(SubsystemCategory.POWER, 'lateral_port')
    : batteryWh < goal.minBatteryWh
      ? { partId: 'pwr_battery_pack', socketId: 'internal_lower' }
      : findBlueprintSocket(SubsystemCategory.POWER, 'lateral_starboard');

  const avionicsSuggestion = !hasFlightComputer
    ? { partId: 'av_flight_computer', socketId: 'internal_upper' }
    : { partId: 'av_reaction_wheels', socketId: 'aft_deck' };

  const commsSuggestion =
    goal.minDownlinkMbps >= 400
      ? { partId: 'comm_hga_dish', socketId: 'top_deck' }
      : findBlueprintSocket(SubsystemCategory.COMMS, 'top_deck');

  const propSuggestion =
    goal.minDeltaV >= 350 && goal.id === MissionGoalId.GEO_COMMS
      ? { partId: 'prop_biprop_main', socketId: 'bottom_ring' }
      : { partId: 'prop_hall_ion', socketId: 'bottom_ring' };

  const missionChecks: MissionCheckItem[] = [
    {
      id: 'bus',
      label: 'Structural Bus',
      passed: Boolean(busDef),
      detail: busDef ? busDef.shortName : 'Mount a spacecraft bus frame',
      warningTitle: 'Structural Bus Chassis Missing',
      whyNeeded:
        'Without a structural bus chassis, the satellite has no load-bearing skeleton to survive rocket launch G-forces or hold internal avionics, propellant tanks, and external panels together.',
      recommendedPartId: goal.blueprintBusId,
      recommendedSocketId: 'bus_center',
    },
    {
      id: 'power',
      label: 'Power & Storage',
      passed:
        hasPowerSource &&
        netPowerW >= goal.minPowerMarginW &&
        batteryWh >= goal.minBatteryWh,
      detail: !hasPowerSource
        ? 'Add solar arrays or MMRTG'
        : batteryWh < goal.minBatteryWh
          ? `Need ≥ ${goal.minBatteryWh} Wh battery`
          : netPowerW < goal.minPowerMarginW
            ? `Net margin ${Math.round(netPowerW)} W (< ${goal.minPowerMarginW} W)`
            : `+${Math.round(netPowerW)} W margin · ${batteryWh} Wh`,
      warningTitle: !hasPowerSource
        ? 'Power Generation Missing'
        : batteryWh < goal.minBatteryWh
          ? 'Battery Energy Storage Missing'
          : 'Insufficient Power Margin',
      whyNeeded: !hasPowerSource
        ? 'Without Solar Arrays or an MMRTG generator, the spacecraft cannot produce electricity in orbit and all computers, radios, and heaters will shut down.'
        : batteryWh < goal.minBatteryWh
          ? 'Without a space-qualified Battery Pack, the satellite suffers immediate blackout whenever it passes through Earth’s shadow during orbital eclipse.'
          : 'Your subsystems consume more power than your generators produce; add another solar array or lower-draw component to prevent brownouts.',
      recommendedPartId: powerSuggestion.partId || 'pwr_wing_deployable',
      recommendedSocketId: powerSuggestion.socketId,
    },
    {
      id: 'avionics',
      label: 'Flight Core & ADCS',
      passed: hasFlightComputer && totalTorqueNm >= 0.4,
      detail: !hasFlightComputer
        ? 'Install Flight Computer'
        : totalTorqueNm < 0.4
          ? 'Add Reaction Wheels or RCS'
          : `${totalTorqueNm.toFixed(2)} N·m control authority`,
      warningTitle: !hasFlightComputer
        ? 'Flight Computer Missing'
        : 'Attitude Control (ADCS) Missing',
      whyNeeded: !hasFlightComputer
        ? 'Without a Flight Computer, the satellite has no onboard processor to execute ground commands, manage power, or run autonomous fault recovery.'
        : 'Without Reaction Wheels or RCS Thrusters, the satellite will tumble uncontrollably in zero-G, unable to aim its solar panels at the Sun or its dish toward Earth.',
      recommendedPartId: avionicsSuggestion.partId,
      recommendedSocketId: avionicsSuggestion.socketId,
    },
    {
      id: 'comms',
      label: 'Telemetry Downlink',
      passed: hasComms && downlinkMbps >= goal.minDownlinkMbps,
      detail: !hasComms
        ? 'Mount a Comms antenna'
        : downlinkMbps < goal.minDownlinkMbps
          ? `${downlinkMbps} Mbps (< ${goal.minDownlinkMbps} Mbps)`
          : `${downlinkMbps} Mbps link`,
      warningTitle: !hasComms ? 'Communications Antenna Missing' : 'Downlink Bandwidth Too Low',
      whyNeeded:
        'Without a high-gain dish, helical antenna, or optical link, the satellite cannot transmit mission telemetry or receive ground control instructions, leaving it stranded in radio silence.',
      recommendedPartId: commsSuggestion.partId || 'comm_hga_dish',
      recommendedSocketId: commsSuggestion.socketId,
    },
    {
      id: 'propulsion',
      label: 'Propulsion & Δv',
      passed:
        goal.minDeltaV === 0
          ? hasPropulsion || missionGoalId === MissionGoalId.FREEFORM
          : deltaV >= goal.minDeltaV,
      detail:
        deltaV < goal.minDeltaV
          ? `${Math.round(deltaV)} m/s (< ${goal.minDeltaV} m/s)`
          : `${Math.round(deltaV)} m/s Δv`,
      warningTitle: !hasPropulsion ? 'Propulsion System Missing' : 'Insufficient Orbital Δv',
      whyNeeded:
        'Without an Ion Thruster or Bipropellant Engine, the satellite cannot perform orbit insertion burns, counteract atmospheric drag, or dodge space debris.',
      recommendedPartId: propSuggestion.partId,
      recommendedSocketId: propSuggestion.socketId,
    },
  ];

  if (goal.requirePayloadIds) {
    const ok = goal.requirePayloadIds.some((id) => payloadIds.has(id));
    missionChecks.push({
      id: 'payload',
      label: 'Mission Payload',
      passed: ok,
      detail: ok ? 'Recon sensor online' : 'Add Optical Imager or SAR Panel',
      warningTitle: 'Earth Observation Payload Missing',
      whyNeeded:
        'This mission requires an Optical Imager or SAR Radar payload to capture Earth reconnaissance data; without it, the spacecraft has no scientific utility.',
      recommendedPartId: 'pay_multispectral',
      recommendedSocketId: 'front_deck',
    });
  } else if (goal.requireAnyPayload) {
    const ok = payloadIds.size > 0;
    missionChecks.push({
      id: 'payload',
      label: 'Science Instrument',
      passed: ok,
      detail: ok ? `${payloadIds.size} payload active` : 'Mount a Science Payload',
      warningTitle: 'Science Instrument Missing',
      whyNeeded:
        'A Deep Space Probe requires at least one scientific instrument (Magnetometer, Spectrometer, or Imager) to gather interplanetary measurements.',
      recommendedPartId: 'pay_magnetometer',
      recommendedSocketId: 'front_deck',
    });
  }

  if (goal.requireRtgOrHighSolar) {
    const ok = hasRtg || powerGenW >= 800;
    missionChecks.push({
      id: 'deepspace_pwr',
      label: 'Deep-Space Power',
      passed: ok,
      detail: ok
        ? hasRtg
          ? 'MMRTG nuclear ready'
          : 'High-area solar ready'
        : 'Add MMRTG or ≥ 800 W solar',
      warningTitle: 'Deep-Space Power Rating Too Low',
      whyNeeded:
        'Sunlight drops off by the inverse-square law beyond Mars. Deep-space missions require MMRTG nuclear generators or ≥ 800 W solar arrays to prevent freezing.',
      recommendedPartId: 'pwr_rtg_nuclear',
      recommendedSocketId: 'lateral_port',
    });
  }

  if (missionGoalId !== MissionGoalId.FREEFORM) {
    missionChecks.push({
      id: 'thermal',
      label: 'Thermal & Balance',
      passed: hasThermalControl && thermalBalanceW >= 0 && isBalancedUpdated,
      detail: !hasThermalControl
        ? 'Add Radiator or MLI Shroud'
        : !isBalancedUpdated
          ? 'Balance lateral wing mass'
          : thermalBalanceW < 0
            ? 'Add more heat rejection'
            : 'Balanced & thermally nominal',
      warningTitle: !hasThermalControl
        ? 'Thermal Control Missing'
        : !isBalancedUpdated
          ? 'Spacecraft Mass Imbalanced'
          : 'Insufficient Heat Rejection',
      whyNeeded: !hasThermalControl
        ? 'Without Radiator Vanes or MLI Thermal Shrouds, electronics swing between +120 °C in direct sun and -150 °C in eclipse, destroying processors and batteries.'
        : !isBalancedUpdated
          ? 'Asymmetrical mass off the center axis causes thruster burns to spin the spacecraft off course; mount symmetric opposing wings or counterweights.'
          : 'Internal electronics generate more waste heat than your hull can radiate; add a Louvered Radiator Vane to prevent thermal runaway.',
      recommendedPartId: !isBalancedUpdated ? 'pwr_wing_deployable' : 'thm_radiator_vane',
      recommendedSocketId: !isBalancedUpdated ? 'lateral_starboard' : 'diag_ne',
    });
  }

  const isFlightReady = missionChecks.every((c) => c.passed);

  return {
    hasBus: Boolean(busDef),
    dryMassKg: Math.round(dryMassKg * 10) / 10,
    propellantKg: Math.round(propellantKg * 10) / 10,
    wetMassKg: Math.round(wetMassKg * 10) / 10,
    powerGenW: Math.round(powerGenW),
    powerDrawW: Math.round(powerDrawW),
    netPowerW: Math.round(netPowerW),
    batteryWh,
    eclipseMinutes: Math.round(eclipseMinutes),
    deltaV: Math.round(deltaV),
    downlinkMbps,
    thermalBalanceW: Math.round(thermalBalanceW),
    comOffsetRatio: comOffsetMagUpdated,
    isBalanced: isBalancedUpdated,
    partCount: placedParts.filter(
      (p) => PARTS_BY_ID[p.partId]?.category !== SubsystemCategory.BUS
    ).length,
    totalSockets: activeSockets.length,
    missionChecks,
    isFlightReady,
  };
}
