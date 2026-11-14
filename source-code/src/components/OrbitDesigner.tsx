import React from 'react';
import {
  ArrowLeft,
  BookOpen,
  Compass,
  Globe2,
  Rocket,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  ORBIT_MAP,
  ORBIT_OPTIONS,
  TARGET_REGION_MAP,
  TARGET_REGIONS,
} from '../data/orbits';
import { OrbitId, TargetRegionId } from '../game/types';

interface OrbitDesignerProps {
  selectedOrbit: OrbitId;
  selectedTargetRegion: TargetRegionId;
  soundEnabled: boolean;
  onSelectOrbit: (orbit: OrbitId) => void;
  onSelectTargetRegion: (region: TargetRegionId) => void;
  onBack: () => void;
  onLaunchMission: () => void;
  onOpenHelp: () => void;
  onToggleSound: () => void;
}

export const OrbitDesigner: React.FC<OrbitDesignerProps> = ({
  selectedOrbit,
  selectedTargetRegion,
  soundEnabled,
  onSelectOrbit,
  onSelectTargetRegion,
  onBack,
  onLaunchMission,
  onOpenHelp,
  onToggleSound,
}) => {
  const activeOrbit = ORBIT_MAP[selectedOrbit];
  const activeTarget = TARGET_REGION_MAP[selectedTargetRegion];
  const polarMismatch =
    selectedOrbit === 'leo' && selectedTargetRegion === 'polar';

  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-2 sm:p-4 lg:p-5">
      {/* Top Bar */}
      <div className="pointer-events-auto hud-panel rounded-xl px-3 py-2 sm:px-5 sm:py-3 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex shrink-0 items-center gap-1.5 rounded-lg hud-panel-subtle px-2 sm:px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-cyan-400/50 cursor-pointer whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Spacecraft</span>
          </button>
          <div>
            <h1 className="font-display text-lg font-bold text-white leading-tight">
              <span className="sm:hidden">Orbit & Target</span>
              <span className="hidden sm:inline">Orbit & Target Region Selection</span>
            </h1>
            <p className="hidden text-xs text-slate-400 sm:block">
              Drag to inspect Earth & orbital ring · Scroll to zoom
            </p>
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onOpenHelp}
            className="flex items-center gap-1.5 rounded-lg hud-panel-subtle px-2 sm:px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-cyan-400/50 cursor-pointer whitespace-nowrap"
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

      {/* Left & Right Flanking Consoles (Center 3D Earth stays completely unobstructed) */}
      <div className="flex-1 my-2 flex min-h-0 flex-col gap-2 overflow-y-auto custom-scroll lg:my-3 lg:flex-row lg:items-stretch lg:justify-between lg:gap-4">
        {/* Left: Orbit Selection */}
        <aside className="pointer-events-auto hud-panel flex w-full shrink-0 flex-col overflow-hidden rounded-xl max-h-[38vh] lg:max-h-full lg:w-80 xl:w-92">
          <div className="px-4 py-3 border-b border-slate-700/60 flex items-center gap-2">
            <Compass className="w-4 h-4 text-cyan-400" />
            <h2 className="font-display text-sm font-semibold text-white">
              Orbital Regime
            </h2>
          </div>

          <div className="p-3 overflow-y-auto custom-scroll space-y-3 flex-1">
            <div className="space-y-2">
              {ORBIT_OPTIONS.map((orb) => {
                const active = orb.id === selectedOrbit;
                return (
                  <button
                    key={orb.id}
                    type="button"
                    onClick={() => onSelectOrbit(orb.id)}
                    className={`w-full text-left rounded-lg p-3 border transition-colors cursor-pointer ${
                      active
                        ? 'bg-cyan-500/15 border-cyan-400 text-white'
                        : 'bg-slate-900/65 border-slate-800 hover:border-slate-600 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-sm font-semibold">
                        {orb.name}
                      </span>
                      <span className="font-mono-tabular text-xs text-cyan-300">
                        {orb.periodSeconds}s orbit
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {orb.altitudeLabel} · Inclination {orb.inclinationDeg}°
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="hud-panel-subtle rounded-lg p-3.5 space-y-3">
              <p className="text-xs text-slate-200 leading-relaxed">
                {activeOrbit.description}
              </p>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 mb-1">
                  Benefits
                </p>
                <ul className="space-y-1 text-xs text-slate-300">
                  {activeOrbit.benefits.map((b) => (
                    <li key={b} className="flex items-start gap-1.5">
                      <span className="text-emerald-400">+</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 mb-1">
                  Trade-Offs
                </p>
                <ul className="space-y-1 text-xs text-slate-300">
                  {activeOrbit.tradeoffs.map((t) => (
                    <li key={t} className="flex items-start gap-1.5">
                      <span className="text-amber-400">−</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-[11px] text-cyan-200/90 pt-2 border-t border-slate-800 leading-relaxed">
                {activeOrbit.educationalNote}
              </p>
            </div>
          </div>
        </aside>

        {/* Right: Target Observation Region & Launch CTA */}
        <aside className="pointer-events-auto hud-panel flex w-full shrink-0 flex-col overflow-hidden rounded-xl max-h-[38vh] lg:max-h-full lg:w-80 xl:w-92">
          <div className="px-4 py-3 border-b border-slate-700/60 flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-cyan-400" />
            <h2 className="font-display text-sm font-semibold text-white">
              Target Observation Region
            </h2>
          </div>

          <div className="p-3 overflow-y-auto custom-scroll space-y-2.5 flex-1">
            {TARGET_REGIONS.map((reg) => {
              const active = reg.id === selectedTargetRegion;
              return (
                <button
                  key={reg.id}
                  type="button"
                  onClick={() => onSelectTargetRegion(reg.id)}
                  className={`w-full text-left rounded-lg p-3 border transition-colors cursor-pointer ${
                    active
                      ? 'bg-cyan-500/15 border-cyan-400 text-white'
                      : 'bg-slate-900/65 border-slate-800 hover:border-slate-600 text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{reg.name}</span>
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: reg.biomeColor }}
                    />
                  </div>
                  <p className="text-[11px] font-mono-tabular text-slate-400 mt-0.5">
                    {reg.locationLabel}
                  </p>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                    {reg.description}
                  </p>
                </button>
              );
            })}

            <div className="hud-panel-subtle rounded-lg p-3 text-xs space-y-1">
              <p className="text-cyan-300 font-semibold">
                Selected Science Goal
              </p>
              <p className="text-slate-300">{activeTarget.scienceGoal}</p>
            </div>

            {polarMismatch && (
              <div className="rounded-lg p-3 bg-amber-500/10 border border-amber-500/40 text-xs text-amber-200 leading-relaxed">
                Engineering Tip: LEO (38° inclination) does not pass directly over the 74°N Arctic region. Consider switching to Sun-Synchronous Orbit (82°) for optimal polar passes.
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-700/60">
            <button
              type="button"
              onClick={onLaunchMission}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm tracking-wide transition-colors cursor-pointer whitespace-nowrap"
            >
              <Rocket className="w-4 h-4" />
              <span>PROCEED TO LAUNCH PAD</span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};
