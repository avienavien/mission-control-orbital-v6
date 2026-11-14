export const THEME_COLORS = {
  spaceBg: 0x050914,
  panelBg: '#080e1c',
  cyanAccent: '#06b6d4',
  electricBlue: '#3b82f6',
  amberWarning: '#f59e0b',
  emeraldNominal: '#10b981',
  roseAlert: '#f43f5e',
  goldFoil: 0xd4a438,
  solarCellBlue: 0x102854,
  titaniumSilver: 0xcbd5e1,
} as const;

export const MISSION_LIMITS = {
  totalBudgetMillion: 120,
  maxMassKg: 650,
  missionDurationSec: 180,
  targetDataCollectGB: 100,
  targetDataTransmitGB: 80,
  lowBatteryThresholdPct: 25,
  criticalBatteryThresholdPct: 10,
} as const;
