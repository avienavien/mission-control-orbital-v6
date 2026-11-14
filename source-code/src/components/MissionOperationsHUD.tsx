import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BatteryCharging,
  BatteryWarning,
  BookOpen,
  Camera,
  CheckCircle2,
  Compass,
  Eye,
  EyeOff,
  Flag,
  Moon,
  Pause,
  Play,
  Radio,
  Satellite,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { GROUND_STATIONS } from '../data/groundStations';
import { ORBIT_MAP, TARGET_REGION_MAP } from '../data/orbits';
import {
  CameraMode,
  MissionState,
  SimulationSpeed,
} from '../game/types';
import { computeMissionObjectives } from '../simulation/scoring';
import { MISSION_LIMITS } from '../styles/theme';

interface MissionOperationsHUDProps {
  state: MissionState;
  onTogglePause: () => void;
  onSetSpeed: (speed: SimulationSpeed) => void;
  onSetCameraMode: (mode: CameraMode) => void;
  onToggleImager: () => void;
  onToggleSensor: () => void;
  onToggleComms: () => void;
  onSetObserving: (observing: boolean) => void;
  onSetObservationDirection: (deg: number) => void;
  onSelectGroundStation: (stationId: string | null) => void;
  onEndMission: () => void;
  onOpenHelp: () => void;
  onToggleSound: () => void;
}

export const MissionOperationsHUD: React.FC<MissionOperationsHUDProps> = ({
  state,
  onTogglePause,
  onSetSpeed,
  onSetCameraMode,
  onToggleImager,
  onToggleSensor,
  onToggleComms,
  onSetObserving,
  onSetObservationDirection,
  onSelectGroundStation,
  onEndMission,
  onOpenHelp,
  onToggleSound,
}) => {
  const [showOpsTips, setShowOpsTips] = useState(false);
  const op = state.operations;
  const orbit = ORBIT_MAP[state.selectedOrbit];
  const target = TARGET_REGION_MAP[state.selectedTargetRegion];
  const objectives = useMemo(() => computeMissionObjectives(state), [state]);

  const netPowerW = op.solarOutputW - op.powerConsumptionW;
  const storedDataGB = Math.max(0, op.dataCollectedGB - op.dataTransmittedGB);
  const isLowBattery = op.batteryPct < MISSION_LIMITS.lowBatteryThresholdPct;
  const isCriticalBattery =
    op.batteryPct < MISSION_LIMITS.criticalBatteryThresholdPct;

  const hasSensor = state.design.sensor > 0;
  const activeStation = GROUND_STATIONS.find(
    (g) => g.id === op.activeGroundStationId,
  );

  // Identify active power-consuming systems when battery is low
  const powerConsumers: string[] = ['Bus Avionics (18W)'];
  if (op.imagerEnabled) {
    powerConsumers.push(
      op.isObserving ? 'Imager Active (55W)' : 'Imager Standby (20W)',
    );
  }
  if (op.sensorEnabled && hasSensor) {
    powerConsumers.push('Sci Sensor (30W)');
  }
  if (op.commsEnabled) {
    powerConsumers.push(op.isTransmitting ? 'Comms TX (40W)' : 'Comms Idle (10W)');
  }

  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-2 sm:p-3 lg:p-4">
      {/* Top Telemetry & Time Control Bar */}
      <div className="pointer-events-auto hud-panel rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 flex flex-wrap items-center justify-between gap-2 sm:gap-3 max-h-[28vh] overflow-y-auto custom-scroll lg:max-h-none lg:overflow-visible">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[11px] font-mono-tabular text-cyan-400 uppercase tracking-wider">
              Mission Operations · {orbit.shortName}
            </p>
            <div className="flex items-center gap-3 text-sm font-mono-tabular text-white">
              <span>
                MET {Math.floor(op.elapsedSec)}s / {MISSION_LIMITS.missionDurationSec}s
              </span>
              <span className="text-slate-600">·</span>
              <span className="flex items-center gap-1.5">
                {op.inSunlight ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-amber-200">Sunlight</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-300" />
                    <span className="text-indigo-200">Earth Eclipse</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Simulation Speed & Camera Presets */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Play / Pause & Speed */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900/90 border border-slate-700/70">
            <button
              type="button"
              onClick={onTogglePause}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              {op.isPaused ? (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-400" />
                  <span>Pause</span>
                </>
              )}
            </button>
            {([1, 2, 5] as SimulationSpeed[]).map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => onSetSpeed(spd)}
                className={`px-2.5 py-1 rounded text-xs font-mono-tabular font-semibold transition-colors cursor-pointer ${
                  op.speed === spd
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Camera Views */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900/90 border border-slate-700/70">
            {(
              [
                { id: 'earth', label: 'Earth View' },
                { id: 'satellite', label: 'Follow Sat' },
                { id: 'free', label: 'Free Orbit' },
              ] as Array<{ id: CameraMode; label: string }>
            ).map((cam) => (
              <button
                key={cam.id}
                type="button"
                onClick={() => onSetCameraMode(cam.id)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  op.cameraMode === cam.id
                    ? 'bg-blue-500 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {cam.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowOpsTips((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hud-panel-subtle hover:border-cyan-400/50 text-xs font-medium text-cyan-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Ops Tips</span>
          </button>

          <button
            type="button"
            onClick={onOpenHelp}
            aria-label="How to Play"
            className="px-3 py-1.5 rounded-lg hud-panel-subtle hover:border-cyan-400/50 text-xs font-medium text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            Guide
          </button>

          <button
            type="button"
            onClick={onToggleSound}
            aria-label={state.soundEnabled ? 'Mute sound' : 'Unmute sound'}
            className="p-2 rounded-lg hud-panel-subtle hover:border-cyan-400/50 text-slate-200 transition-colors cursor-pointer"
          >
            {state.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
          </button>

          <button
            type="button"
            onClick={onEndMission}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            <Flag className="w-3.5 h-3.5 text-cyan-400" />
            <span>Finish Mission</span>
          </button>
        </div>
      </div>

      {/* Center Row: Left Controls + Right Telemetry/Objectives (Center 3D space open) */}
      <div className="flex-1 my-2.5 flex min-h-0 flex-col gap-2 overflow-y-auto custom-scroll lg:flex-row lg:items-stretch lg:justify-between lg:gap-4">
        {/* Left: Spacecraft Controls, Observation & Ground Station Comms */}
        <aside className="pointer-events-auto hud-panel flex w-full shrink-0 flex-col overflow-hidden rounded-xl max-h-[34vh] lg:max-h-full lg:w-80">
          <div className="p-3.5 overflow-y-auto custom-scroll space-y-3.5 flex-1">
            {/* Satellite Position */}
            <div className="hud-panel-subtle rounded-lg p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Satellite className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Sub-Satellite Point</span>
                </span>
                <span className="font-mono-tabular text-white font-semibold">
                  {op.satelliteLatDeg >= 0
                    ? `${op.satelliteLatDeg.toFixed(1)}°N`
                    : `${Math.abs(op.satelliteLatDeg).toFixed(1)}°S`}
                  ,{' '}
                  {op.satelliteLonDeg >= 0
                    ? `${op.satelliteLonDeg.toFixed(1)}°E`
                    : `${Math.abs(op.satelliteLonDeg).toFixed(1)}°W`}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Target ({target.name})</span>
                <span
                  className={`font-mono-tabular font-semibold ${
                    op.inTargetWindow ? 'text-emerald-400' : 'text-slate-300'
                  }`}
                >
                  {op.inTargetWindow
                    ? `In Window (${op.targetAlignmentPct}%)`
                    : 'Approaching'}
                </span>
              </div>
            </div>

            {/* Subsystem Power Switches */}
            <div className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Subsystem Controls
              </h2>

              <button
                type="button"
                onClick={onToggleImager}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                  op.imagerEnabled
                    ? 'bg-cyan-500/15 border-cyan-400/70 text-white'
                    : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-600'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-cyan-400" />
                  <span>Imaging Instrument</span>
                </span>
                <span className="font-mono-tabular font-semibold">
                  {op.imagerEnabled ? 'ON' : 'OFF'}
                </span>
              </button>

              {hasSensor && (
                <button
                  type="button"
                  onClick={onToggleSensor}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                    op.sensorEnabled
                      ? 'bg-emerald-500/15 border-emerald-400/70 text-white'
                      : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-emerald-400" />
                    <span>Scientific Sensor (+45%)</span>
                  </span>
                  <span className="font-mono-tabular font-semibold">
                    {op.sensorEnabled ? 'ON (30W)' : 'OFF'}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={onToggleComms}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                  op.commsEnabled
                    ? 'bg-blue-500/15 border-blue-400/70 text-white'
                    : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-600'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-blue-400" />
                  <span>Communications Antenna</span>
                </span>
                <span className="font-mono-tabular font-semibold">
                  {op.commsEnabled ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>

            {/* Earth Observation Operations */}
            <div className="hud-panel-subtle rounded-lg p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                  Earth Observation
                </h2>
                <span className="text-[11px] font-mono-tabular text-slate-400">
                  {op.isObserving ? 'Scanning Active' : 'Idle'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onSetObserving(true)}
                  disabled={op.batteryWh <= 0.5 || op.isObserving}
                  className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Start Observation</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSetObserving(false)}
                  disabled={!op.isObserving}
                  className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-medium text-xs transition-colors cursor-pointer whitespace-nowrap"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Stop</span>
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-400">Observation Direction</span>
                  <span className="font-mono-tabular text-cyan-300">
                    {op.observationDirectionDeg > 0
                      ? `+${op.observationDirectionDeg}°`
                      : `${op.observationDirectionDeg}°`}
                  </span>
                </div>
                <input
                  type="range"
                  min={-25}
                  max={25}
                  step={5}
                  value={op.observationDirectionDeg}
                  onChange={(e) =>
                    onSetObservationDirection(Number(e.target.value))
                  }
                  aria-label="Observation Direction Degrees"
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono-tabular">
                  <span>-25° Port</span>
                  <span>0° Nadir</span>
                  <span>+25° Starboard</span>
                </div>
              </div>

              {op.isObserving && (
                <p className="text-[11px] text-cyan-200 leading-snug">
                  {op.inTargetWindow
                    ? `High-yield imaging over ${target.name}! Science data rate boosted.`
                    : 'Capturing background survey telemetry. Wait for target corridor for peak science yield.'}
                </p>
              )}
            </div>

            {/* Ground Station Downlink */}
            <div className="hud-panel-subtle rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-blue-300">
                  Ground Stations
                </h2>
                <span
                  className={`text-[11px] font-mono-tabular font-semibold ${
                    op.isTransmitting
                      ? 'text-emerald-400'
                      : op.availableGroundStationIds.length > 0
                        ? 'text-cyan-300'
                        : 'text-slate-400'
                  }`}
                >
                  {op.isTransmitting
                    ? 'Transmitting'
                    : op.availableGroundStationIds.length > 0
                      ? `${op.availableGroundStationIds.length} In Range`
                      : 'Out of Range'}
                </span>
              </div>

              <div className="space-y-1.5">
                {GROUND_STATIONS.map((gs) => {
                  const inRange = op.availableGroundStationIds.includes(gs.id);
                  const isConnected = op.activeGroundStationId === gs.id;
                  return (
                    <button
                      key={gs.id}
                      type="button"
                      disabled={!inRange}
                      onClick={() =>
                        onSelectGroundStation(isConnected ? null : gs.id)
                      }
                      className={`w-full text-left px-2.5 py-2 rounded border text-xs transition-colors ${
                        isConnected
                          ? 'bg-emerald-500/15 border-emerald-400/70 text-white cursor-pointer'
                          : inRange
                            ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-100 hover:bg-cyan-500/20 cursor-pointer'
                            : 'bg-slate-900/50 border-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">
                          {gs.name.split(' ')[0]}
                        </span>
                        <span className="font-mono-tabular text-[11px]">
                          {isConnected
                            ? 'Linked'
                            : inRange
                              ? 'Connect'
                              : 'No LOS'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] text-slate-300 leading-snug">
                {op.commsStatusReason}
              </p>
            </div>
          </div>
        </aside>

        {/* Center Top: Active Mission Event Alert (non-blocking) */}
        <div className="flex-none flex flex-col items-center pointer-events-none lg:flex-1 lg:min-w-0">
          {op.activeEvent && (
            <div
              className={`pointer-events-auto hud-panel rounded-xl px-4 py-2.5 max-w-md border ${
                op.activeEvent.severity === 'warning'
                  ? 'border-amber-500/60'
                  : op.activeEvent.severity === 'opportunity'
                    ? 'border-emerald-500/60'
                    : 'border-cyan-500/50'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-white">
                  {op.activeEvent.title}
                </span>
                <span
                  className={`text-[11px] font-mono-tabular font-semibold ${
                    op.activeEvent.severity === 'warning'
                      ? 'text-amber-300'
                      : op.activeEvent.severity === 'opportunity'
                        ? 'text-emerald-300'
                        : 'text-cyan-300'
                  }`}
                >
                  {op.activeEvent.impactLabel}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1">
                {op.activeEvent.description}
              </p>
            </div>
          )}

          {showOpsTips && (
            <div className="pointer-events-auto hud-panel rounded-xl p-4 mt-3 max-w-md text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-cyan-300">
                  Engineering Operations Guide
                </span>
                <button
                  type="button"
                  onClick={() => setShowOpsTips(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  Close
                </button>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Solar panels only generate power in Sunlight. Turn off the Imager during Earth Eclipse if your battery dips below 25%. Enable Communications when Goldstone, Svalbard, or Canberra enters line-of-sight to transmit collected GB.
              </p>
            </div>
          )}
        </div>

        {/* Right: Power Telemetry, Data Counters & Mission Objectives */}
        <aside className="pointer-events-auto hud-panel flex w-full shrink-0 flex-col overflow-hidden rounded-xl max-h-[34vh] lg:max-h-full lg:w-80">
          <div className="p-3.5 overflow-y-auto custom-scroll space-y-3.5 flex-1">
            {/* Power & Battery */}
            <div className="hud-panel-subtle rounded-lg p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  {isLowBattery ? (
                    <BatteryWarning className="w-4 h-4 text-rose-400" />
                  ) : (
                    <BatteryCharging className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>Battery Reserve</span>
                </span>
                <span
                  className={`font-mono-tabular text-base font-bold ${
                    isCriticalBattery
                      ? 'text-rose-400'
                      : isLowBattery
                        ? 'text-amber-300'
                        : 'text-emerald-400'
                  }`}
                >
                  {op.batteryPct.toFixed(0)}%
                </span>
              </div>

              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    isCriticalBattery
                      ? 'bg-rose-500'
                      : isLowBattery
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, op.batteryPct))}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Solar Gen</p>
                  <p className="font-mono-tabular text-xs font-semibold text-emerald-300">
                    +{op.solarOutputW} W
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Draw</p>
                  <p className="font-mono-tabular text-xs font-semibold text-amber-300">
                    -{op.powerConsumptionW} W
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Balance</p>
                  <p
                    className={`font-mono-tabular text-xs font-semibold ${
                      netPowerW >= 0 ? 'text-cyan-300' : 'text-rose-300'
                    }`}
                  >
                    {netPowerW >= 0 ? `+${netPowerW} W` : `${netPowerW} W`}
                  </p>
                </div>
              </div>

              {isLowBattery && (
                <div className="rounded p-2 bg-rose-500/15 border border-rose-500/40 text-[11px] text-rose-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>Low Battery Warning!</span>
                  </div>
                  <p className="text-rose-100/90">
                    Active loads: {powerConsumers.join(', ')}. Deactivate idle payloads to prevent brownout.
                  </p>
                </div>
              )}
            </div>

            {/* Science Data */}
            <div className="hud-panel-subtle rounded-lg p-3 space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Science Data Buffer
              </h2>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] text-slate-400">Collected</p>
                  <p className="font-mono-tabular text-sm font-bold text-cyan-300">
                    {op.dataCollectedGB.toFixed(1)} GB
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Transmitted</p>
                  <p className="font-mono-tabular text-sm font-bold text-emerald-300">
                    {op.dataTransmittedGB.toFixed(1)} GB
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Onboard</p>
                  <p className="font-mono-tabular text-sm font-bold text-slate-200">
                    {storedDataGB.toFixed(1)} GB
                  </p>
                </div>
              </div>
              {activeStation && op.isTransmitting && (
                <p className="text-[11px] text-emerald-300 font-mono-tabular text-center">
                  Active Link: {activeStation.name}
                </p>
              )}
            </div>

            {/* Live Objective Tracker */}
            <div className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Mission Objectives
              </h2>
              <div className="space-y-2">
                {objectives.map((obj) => (
                  <div
                    key={obj.id}
                    className="hud-panel-subtle rounded-lg p-2.5 space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2 text-xs">
                      <span
                        className={`font-medium flex items-center gap-1.5 ${
                          obj.completed ? 'text-emerald-300' : 'text-slate-200'
                        }`}
                      >
                        <CheckCircle2
                          className={`w-3.5 h-3.5 shrink-0 ${
                            obj.completed ? 'text-emerald-400' : 'text-slate-600'
                          }`}
                        />
                        <span>{obj.label}</span>
                      </span>
                      <span className="font-mono-tabular text-[11px] text-slate-300 shrink-0">
                        {obj.valueLabel}
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          obj.completed ? 'bg-emerald-400' : 'bg-cyan-400'
                        }`}
                        style={{ width: `${Math.round(obj.progress * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
