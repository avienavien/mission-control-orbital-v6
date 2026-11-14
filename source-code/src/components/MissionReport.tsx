import React, { useMemo } from 'react';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  Home,
  RotateCcw,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { SPACECRAFT_COMPONENTS } from '../data/components';
import { ORBIT_MAP, TARGET_REGION_MAP } from '../data/orbits';
import { MissionState } from '../game/types';
import {
  computeMissionObjectives,
  generateMissionReport,
} from '../simulation/scoring';
import { calculateDesignMetrics } from '../simulation/spacecraftMath';
import { MISSION_LIMITS } from '../styles/theme';

interface MissionReportProps {
  state: MissionState;
  onReplayMission: () => void;
  onReturnToMenu: () => void;
}

export const MissionReport: React.FC<MissionReportProps> = ({
  state,
  onReplayMission,
  onReturnToMenu,
}) => {
  const report = useMemo(() => generateMissionReport(state), [state]);
  const objectives = useMemo(() => computeMissionObjectives(state), [state]);
  const designMetrics = useMemo(
    () => calculateDesignMetrics(state.design),
    [state.design],
  );
  const orbit = ORBIT_MAP[state.selectedOrbit];
  const target = TARGET_REGION_MAP[state.selectedTargetRegion];
  const op = state.operations;

  const downlinkRatio =
    op.dataCollectedGB > 0
      ? Math.min(100, Math.round((op.dataTransmittedGB / op.dataCollectedGB) * 100))
      : 0;

  const outcomeAccent =
    report.outcomeTier === 'exceptional'
      ? 'text-emerald-300 border-emerald-500/50'
      : report.outcomeTier === 'success'
        ? 'text-cyan-300 border-cyan-500/50'
        : report.outcomeTier === 'partial'
          ? 'text-amber-300 border-amber-500/50'
          : 'text-rose-300 border-rose-500/50';

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center p-2 sm:p-4 lg:p-6 bg-[#050914]/75">
      <div className="hud-panel rounded-xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 md:px-8 py-5 border-b border-slate-700/60 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-mono-tabular text-cyan-400 uppercase tracking-wider">
              Post-Mission Telemetry Evaluation · {orbit.shortName} · {target.name}
            </p>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-white mt-0.5">
              {report.outcomeTitle}
            </h1>
          </div>

          <div
            className={`hud-panel-subtle rounded-xl px-5 py-3 border text-right ${outcomeAccent}`}
          >
            <p className="text-[11px] uppercase tracking-wider text-slate-400">
              Final Mission Score
            </p>
            <p className="font-mono-tabular text-3xl font-bold text-white">
              {report.totalScore}{' '}
              <span className="text-sm font-normal text-slate-400">
                / {report.maxScore}
              </span>
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto custom-scroll space-y-5 sm:space-y-6">
          {/* Primary Telemetry Metrics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="hud-panel-subtle rounded-lg p-3.5">
              <p className="text-xs text-slate-400">Mission Duration</p>
              <p className="font-mono-tabular text-xl font-bold text-white mt-1">
                {Math.floor(op.elapsedSec)}s
              </p>
              <p className="text-[11px] text-slate-400">
                of {MISSION_LIMITS.missionDurationSec}s
              </p>
            </div>
            <div className="hud-panel-subtle rounded-lg p-3.5">
              <p className="text-xs text-slate-400">Data Collected</p>
              <p className="font-mono-tabular text-xl font-bold text-cyan-300 mt-1">
                {op.dataCollectedGB.toFixed(1)} GB
              </p>
              <p className="text-[11px] text-slate-400">
                Goal: {MISSION_LIMITS.targetDataCollectGB} GB
              </p>
            </div>
            <div className="hud-panel-subtle rounded-lg p-3.5">
              <p className="text-xs text-slate-400">Data Transmitted</p>
              <p className="font-mono-tabular text-xl font-bold text-emerald-300 mt-1">
                {op.dataTransmittedGB.toFixed(1)} GB
              </p>
              <p className="text-[11px] text-slate-400">
                {downlinkRatio}% downlink efficiency
              </p>
            </div>
            <div className="hud-panel-subtle rounded-lg p-3.5">
              <p className="text-xs text-slate-400">Min Battery Level</p>
              <p className="font-mono-tabular text-xl font-bold text-white mt-1">
                {op.minBatteryPctObserved.toFixed(0)}%
              </p>
              <p className="text-[11px] text-slate-400">
                End charge: {op.batteryPct.toFixed(0)}%
              </p>
            </div>
            <div className="hud-panel-subtle rounded-lg p-3.5">
              <p className="text-xs text-slate-400">Objectives Met</p>
              <p className="font-mono-tabular text-xl font-bold text-white mt-1">
                {report.objectivesCompletedCount} / {report.objectivesTotalCount}
              </p>
              <p className="text-[11px] text-slate-400">
                Constraints: {designMetrics.isValid ? 'Respected' : 'Exceeded'}
              </p>
            </div>
          </div>

          {/* Score Breakdown + Spacecraft Config */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="hud-panel-subtle rounded-lg p-5 space-y-3.5">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-cyan-300">
                Score Breakdown
              </h2>
              <div className="space-y-3">
                {report.scoreBreakdown.map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-200">{item.label}</span>
                      <span className="font-mono-tabular font-semibold text-white">
                        {item.score} / {item.max}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-cyan-400"
                        style={{
                          width: `${Math.round((item.score / item.max) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="hud-panel-subtle rounded-lg p-5 space-y-3">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-cyan-300">
                Spacecraft & Mission Configuration
              </h2>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-800 pb-1">
                  <span className="text-slate-400">Launch Mass</span>
                  <span className="font-mono-tabular text-white">
                    {designMetrics.totalMassKg} / {designMetrics.maxMassKg} kg
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1">
                  <span className="text-slate-400">Total Cost</span>
                  <span className="font-mono-tabular text-white">
                    ${designMetrics.totalCostMillion}M / ${designMetrics.totalBudgetMillion}M
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1">
                  <span className="text-slate-400">Solar Array</span>
                  <span className="font-mono-tabular text-white">
                    {designMetrics.solarGenerationW} W
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1">
                  <span className="text-slate-400">Battery Bank</span>
                  <span className="font-mono-tabular text-white">
                    {designMetrics.batteryCapacityWh} Wh
                  </span>
                </div>
              </div>
              <div className="pt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-300">
                {SPACECRAFT_COMPONENTS.filter(
                  (c) => (state.design[c.id] ?? 0) > 0,
                ).map((c) => (
                  <span key={c.id} className="font-mono-tabular">
                    {state.design[c.id]}× {c.shortName}
                  </span>
                ))}
              </div>
              <div className="pt-2 border-t border-slate-800 text-xs text-slate-300">
                <span>Orbit: {orbit.name}</span>
                <span className="mx-2 text-slate-600">·</span>
                <span>Target: {target.name}</span>
              </div>
            </div>
          </div>

          {/* Achievement Badges */}
          {report.badges.length > 0 && (
            <div className="space-y-2.5">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-cyan-300">
                Achievement Badges Earned
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {report.badges.map((badge) => (
                  <div
                    key={badge.id}
                    className="hud-panel-subtle rounded-lg p-3.5 flex items-start gap-3"
                  >
                    <Award className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {badge.title}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {badge.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Diagnostic Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="hud-panel-subtle rounded-lg p-5 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>What Went Well</span>
              </h3>
              <ul className="space-y-2 text-xs text-slate-200 leading-relaxed">
                {report.whatWentWell.map((item) => (
                  <li key={item}>· {item}</li>
                ))}
              </ul>

              {report.helpfulDecisions.length > 0 && (
                <>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-300 flex items-center gap-2 pt-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Helpful Engineering Decisions</span>
                  </h3>
                  <ul className="space-y-2 text-xs text-slate-200 leading-relaxed">
                    {report.helpfulDecisions.map((item) => (
                      <li key={item}>· {item}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className="hud-panel-subtle rounded-lg p-5 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>Challenges & Problems</span>
              </h3>
              <ul className="space-y-2 text-xs text-slate-200 leading-relaxed">
                {report.problemsEncountered.length > 0 ? (
                  report.problemsEncountered.map((item) => (
                    <li key={item}>· {item}</li>
                  ))
                ) : (
                  <li>· No major operational anomalies occurred during flight.</li>
                )}
              </ul>

              <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-300 flex items-center gap-2 pt-2">
                <TrendingUp className="w-4 h-4" />
                <span>Recommendations for Next Attempt</span>
              </h3>
              <ul className="space-y-2 text-xs text-slate-200 leading-relaxed">
                {report.improvementsForNextAttempt.map((item) => (
                  <li key={item}>· {item}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Objectives & Mission Events Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="hud-panel-subtle rounded-lg p-4 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Objective Checklist
              </h3>
              <div className="space-y-1.5">
                {objectives.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between text-xs"
                  >
                    <span
                      className={
                        o.completed ? 'text-emerald-300' : 'text-slate-400'
                      }
                    >
                      {o.completed ? '✓' : '○'} {o.label}
                    </span>
                    <span className="font-mono-tabular text-slate-300">
                      {o.valueLabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="hud-panel-subtle rounded-lg p-4 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                In-Flight Mission Events ({op.eventHistory.length})
              </h3>
              {op.eventHistory.length === 0 ? (
                <p className="text-xs text-slate-400">
                  No orbital events occurred before mission completion.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {op.eventHistory.map((evt) => (
                    <div
                      key={evt.id}
                      className="flex items-center justify-between text-xs gap-2"
                    >
                      <span className="text-slate-200 truncate">
                        T+{Math.round(evt.timestampSec)}s · {evt.title}
                      </span>
                      <span className="font-mono-tabular text-cyan-300 shrink-0">
                        {evt.impactLabel}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 md:px-8 py-4 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={onReturnToMenu}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg hud-panel-subtle hover:border-cyan-400/60 text-sm font-medium text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Home className="w-4 h-4" />
            <span>RETURN TO MAIN MENU</span>
          </button>

          <button
            type="button"
            onClick={onReplayMission}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4" />
            <span>REPLAY MISSION</span>
          </button>
        </div>
      </div>
    </div>
  );
};
