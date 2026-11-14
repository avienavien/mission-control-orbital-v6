import { COMPONENT_MAP, SPACECRAFT_COMPONENTS } from '../data/components';
import { DesignMetrics, SpacecraftDesign } from '../game/types';
import { MISSION_LIMITS } from '../styles/theme';

export function calculateDesignMetrics(design: SpacecraftDesign): DesignMetrics {
  let totalMassKg = 0;
  let totalCostMillion = 0;
  let solarGenerationW = 0;
  let baseBusDrawW = 0;
  let peakConsumptionW = 0;
  let batteryCapacityWh = 0;

  for (const spec of SPACECRAFT_COMPONENTS) {
    const count = design[spec.id] ?? 0;
    if (count <= 0) continue;
    totalMassKg += spec.massKg * count;
    totalCostMillion += spec.costMillion * count;
    solarGenerationW += spec.powerGenW * count;
    batteryCapacityWh += spec.batteryWh * count;
    if (spec.id === 'bus') {
      baseBusDrawW += spec.powerDrawW * count;
    }
    peakConsumptionW += spec.powerDrawW * count;
  }

  const maxMassKg = MISSION_LIMITS.maxMassKg;
  const totalBudgetMillion = MISSION_LIMITS.totalBudgetMillion;
  const remainingMassKg = maxMassKg - totalMassKg;
  const remainingBudgetMillion = totalBudgetMillion - totalCostMillion;

  const validationErrors: string[] = [];
  const warnings: string[] = [];

  if ((design.bus ?? 0) < 1) {
    validationErrors.push(
      `${COMPONENT_MAP.bus.shortName} is required to house avionics and hold subsystems together.`,
    );
  }
  if ((design.solar ?? 0) < 1) {
    validationErrors.push(
      `At least 1 ${COMPONENT_MAP.solar.shortName} pair is required to generate orbital electricity.`,
    );
  }
  if ((design.battery ?? 0) < 1) {
    validationErrors.push(
      `At least 1 ${COMPONENT_MAP.battery.shortName} is required to survive Earth’s eclipse shadow.`,
    );
  }
  if ((design.imager ?? 0) < 1) {
    validationErrors.push(
      `${COMPONENT_MAP.imager.shortName} is required to capture Earth observation science data.`,
    );
  }
  if ((design.antenna ?? 0) < 1) {
    validationErrors.push(
      `${COMPONENT_MAP.antenna.shortName} is required to downlink collected data to ground stations.`,
    );
  }

  if (totalMassKg > maxMassKg) {
    validationErrors.push(
      `Spacecraft mass (${totalMassKg} kg) exceeds the ${maxMassKg} kg launch vehicle payload limit by ${totalMassKg - maxMassKg} kg.`,
    );
  }
  if (totalCostMillion > totalBudgetMillion) {
    validationErrors.push(
      `Total spacecraft cost ($${totalCostMillion}M) exceeds the $${totalBudgetMillion}M mission budget by $${totalCostMillion - totalBudgetMillion}M.`,
    );
  }

  if (solarGenerationW > 0 && solarGenerationW < peakConsumptionW) {
    warnings.push(
      `Peak subsystem draw (${peakConsumptionW} W) exceeds solar generation (${solarGenerationW} W). Avoid running all payloads and comms simultaneously for long periods.`,
    );
  }
  if (batteryCapacityWh > 0 && batteryCapacityWh <= 120 && (design.sensor ?? 0) > 0) {
    warnings.push(
      'Single battery pack with Scientific Sensor installed leaves a tight eclipse margin; manage shadow passes carefully.',
    );
  }

  return {
    totalMassKg,
    maxMassKg,
    remainingMassKg,
    totalCostMillion,
    totalBudgetMillion,
    remainingBudgetMillion,
    solarGenerationW,
    baseBusDrawW,
    peakConsumptionW,
    batteryCapacityWh,
    isValid: validationErrors.length === 0,
    validationErrors,
    warnings,
  };
}
