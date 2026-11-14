import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Minus,
  Plus,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { COMPONENT_MAP, SPACECRAFT_COMPONENTS } from '../data/components';
import { ComponentId, SpacecraftDesign } from '../game/types';
import { calculateDesignMetrics } from '../simulation/spacecraftMath';

interface SpacecraftDesignerProps {
  design: SpacecraftDesign;
  selectedComponentId: ComponentId | null;
  soundEnabled: boolean;
  onSelectComponent: (id: ComponentId | null) => void;
  onAdjustComponent: (id: ComponentId, delta: number) => void;
  onResetDesign: () => void;
  onBack: () => void;
  onContinue: () => void;
  onOpenHelp: () => void;
  onToggleSound: () => void;
}

export const SpacecraftDesigner: React.FC<SpacecraftDesignerProps> = ({
  design,
  selectedComponentId,
  soundEnabled,
  onSelectComponent,
  onAdjustComponent,
  onResetDesign,
  onBack,
  onContinue,
  onOpenHelp,
  onToggleSound,
}) => {
  const metrics = useMemo(() => calculateDesignMetrics(design), [design]);
  const inspectedSpec = selectedComponentId
    ? COMPONENT_MAP[selectedComponentId]
    : COMPONENT_MAP.bus;

  const massPct = Math.min(100, (metrics.totalMassKg / metrics.maxMassKg) * 100);
  const costPct = Math.min(
    100,
    (metrics.totalCostMillion / metrics.totalBudgetMillion) * 100,
  );

  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 md:p-5">
      {/* Top Bar */}
      <div className="pointer-events-auto hud-panel rounded-xl px-5 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hud-panel-subtle hover:border-cyan-400/50 text-xs font-medium text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Briefing</span>
          </button>
          <div>
            <h1 className="font-display text-lg font-bold text-white leading-tight">
              Spacecraft Assembly Bay
            </h1>
            <p className="text-xs text-slate-400">
              Drag to orbit 3D view · Scroll to zoom · Click any spacecraft part or drag components into the bay
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenHelp}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hud-panel-subtle hover:border-cyan-400/50 text-xs font-medium text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>Guide</span>
          </button>
          <button
            type="button"
            onClick={onToggleSound}
            aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'}
            className="p-2 rounded-lg hud-panel-subtle hover:border-cyan-400/50 text-slate-200 transition-colors cursor-pointer"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
          </button>
        </div>
      </div>

      {/* Middle Row: Left Component Catalogue + Right Inspected Part Lesson (leaves center 3D spacecraft open) */}
      <div className="flex-1 my-3 flex items-stretch justify-between gap-4 min-h-0">
        {/* Component Catalogue */}
        <aside className="pointer-events-auto hud-panel rounded-xl w-80 lg:w-92 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700/60 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-white">
              Component Catalogue
            </h2>
            <span className="text-xs text-slate-400">6 Subsystems</span>
          </div>

          <div className="p-3 overflow-y-auto custom-scroll space-y-2.5 flex-1">
            {SPACECRAFT_COMPONENTS.map((comp) => {
              const count = design[comp.id] ?? 0;
              const isSelected = selectedComponentId === comp.id;

              return (
                <div
                  key={comp.id}
                  draggable={count < comp.maxCount}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/component-id', comp.id);
                  }}
                  onClick={() => onSelectComponent(comp.id)}
                  className={`rounded-lg p-3 border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800/90 border-cyan-400/70'
                      : 'bg-slate-900/65 border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white truncate">
                          {comp.shortName}
                        </span>
                        <span className="text-[11px] font-mono-tabular text-slate-400">
                          {comp.required ? 'Required' : 'Optional'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                        {comp.functionSummary}
                      </p>
                    </div>

                    {/* Quantity Controls */}
                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        disabled={count <= 0}
                        onClick={() => onAdjustComponent(comp.id, -1)}
                        aria-label={`Remove ${comp.shortName}`}
                        className="w-7 h-7 rounded flex items-center justify-center bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 transition-colors cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center font-mono-tabular text-xs font-semibold text-white">
                        {count}
                      </span>
                      <button
                        type="button"
                        disabled={count >= comp.maxCount}
                        onClick={() => onAdjustComponent(comp.id, 1)}
                        aria-label={`Add ${comp.shortName}`}
                        className="w-7 h-7 rounded flex items-center justify-center bg-cyan-500/20 hover:bg-cyan-500/35 disabled:opacity-30 disabled:cursor-not-allowed text-cyan-300 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono-tabular text-slate-300">
                    <span>{comp.massKg} kg</span>
                    <span>${comp.costMillion}M</span>
                    <span>
                      {comp.powerGenW > 0
                        ? `+${comp.powerGenW} W`
                        : comp.batteryWh > 0
                          ? `+${comp.batteryWh} Wh`
                          : `-${comp.powerDrawW} W`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Right Engineering Inspector Panel */}
        <aside className="pointer-events-auto hud-panel rounded-xl w-76 lg:w-84 p-4 flex flex-col justify-between gap-4 self-start max-h-full overflow-y-auto custom-scroll">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono-tabular text-cyan-400 uppercase tracking-wider">
                Component Inspector
              </span>
              <span className="text-xs text-slate-400">
                {inspectedSpec.category}
              </span>
            </div>

            <h3 className="font-display text-lg font-bold text-white">
              {inspectedSpec.name}
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              {inspectedSpec.description}
            </p>

            <div className="hud-panel-subtle rounded-lg p-3 space-y-1.5">
              <p className="text-xs font-semibold text-cyan-300">
                Why This Matters
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                {inspectedSpec.engineeringLesson}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Unit Mass</span>
              <span className="font-mono-tabular text-white">
                {inspectedSpec.massKg} kg
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Unit Cost</span>
              <span className="font-mono-tabular text-white">
                ${inspectedSpec.costMillion}M
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Installed Count</span>
              <span className="font-mono-tabular text-cyan-300">
                {design[inspectedSpec.id] ?? 0} / {inspectedSpec.maxCount}
              </span>
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom Engineering Calculations & Validation Dock */}
      <div className="pointer-events-auto hud-panel rounded-xl px-5 py-3.5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Live Calculations Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
          {/* Mass */}
          <div>
            <div className="flex items-baseline justify-between text-xs mb-1">
              <span className="text-slate-400">Total Mass</span>
              <span
                className={`font-mono-tabular font-semibold ${
                  metrics.remainingMassKg < 0 ? 'text-rose-400' : 'text-white'
                }`}
              >
                {metrics.totalMassKg} / {metrics.maxMassKg} kg
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  metrics.remainingMassKg < 0 ? 'bg-rose-500' : 'bg-cyan-400'
                }`}
                style={{ width: `${massPct}%` }}
              />
            </div>
            <p className="text-[11px] font-mono-tabular text-slate-400 mt-1">
              Remaining: {metrics.remainingMassKg} kg
            </p>
          </div>

          {/* Budget */}
          <div>
            <div className="flex items-baseline justify-between text-xs mb-1">
              <span className="text-slate-400">Mission Cost</span>
              <span
                className={`font-mono-tabular font-semibold ${
                  metrics.remainingBudgetMillion < 0
                    ? 'text-rose-400'
                    : 'text-white'
                }`}
              >
                ${metrics.totalCostMillion}M / ${metrics.totalBudgetMillion}M
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  metrics.remainingBudgetMillion < 0
                    ? 'bg-rose-500'
                    : 'bg-blue-400'
                }`}
                style={{ width: `${costPct}%` }}
              />
            </div>
            <p className="text-[11px] font-mono-tabular text-slate-400 mt-1">
              Remaining: ${metrics.remainingBudgetMillion}M
            </p>
          </div>

          {/* Power Balance */}
          <div className="flex flex-col justify-center">
            <span className="text-xs text-slate-400">Power Gen / Peak Load</span>
            <p className="font-mono-tabular text-sm font-semibold text-white mt-0.5">
              <span className="text-emerald-400">+{metrics.solarGenerationW} W</span>
              <span className="text-slate-500 mx-1">/</span>
              <span className="text-amber-300">-{metrics.peakConsumptionW} W</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Base Avionics: {metrics.baseBusDrawW} W
            </p>
          </div>

          {/* Battery Capacity */}
          <div className="flex flex-col justify-center">
            <span className="text-xs text-slate-400">Battery Capacity</span>
            <p className="font-mono-tabular text-sm font-semibold text-cyan-300 mt-0.5">
              {metrics.batteryCapacityWh} Wh
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {metrics.isValid ? 'Design Verified' : 'Action Required'}
            </p>
          </div>
        </div>

        {/* Validation Status & Action Buttons */}
        <div className="flex items-center gap-3 shrink-0 border-t lg:border-t-0 lg:border-l border-slate-700/60 pt-3 lg:pt-0 lg:pl-4">
          {!metrics.isValid ? (
            <div className="flex items-start gap-2 text-xs text-rose-300 max-w-xs min-w-0">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <ul className="space-y-1 max-h-24 overflow-y-auto custom-scroll">
                {metrics.validationErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : metrics.warnings.length > 0 ? (
            <div className="flex items-center gap-2 text-xs text-amber-300 max-w-xs">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{metrics.warnings[0]}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Ready for Orbit Selection</span>
            </div>
          )}

          <button
            type="button"
            onClick={onResetDesign}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg hud-panel-subtle hover:border-slate-500 text-xs font-medium text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET DESIGN</span>
          </button>

          <button
            type="button"
            disabled={!metrics.isValid}
            onClick={onContinue}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-950 font-semibold text-xs tracking-wide transition-colors cursor-pointer whitespace-nowrap"
          >
            <span>CONTINUE</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
