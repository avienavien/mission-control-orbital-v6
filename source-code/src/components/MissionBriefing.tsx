import React from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { MISSION_BRIEFING_DATA } from '../data/missionBriefing';

interface MissionBriefingProps {
  onContinue: () => void;
  onBackToMenu: () => void;
}

export const MissionBriefing: React.FC<MissionBriefingProps> = ({
  onContinue,
  onBackToMenu,
}) => {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center p-2 sm:p-4 lg:p-6 bg-[#050914]/60">
      <div className="hud-panel rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-4 py-4 sm:px-8 sm:py-5 border-b border-slate-700/60 flex items-center justify-between gap-3 sm:gap-4">
          <div>
            <p className="text-[10px] sm:text-xs font-mono-tabular text-cyan-400 uppercase tracking-wider">
              Mission Briefing · {MISSION_BRIEFING_DATA.missionCode}
            </p>
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-white">
              {MISSION_BRIEFING_DATA.missionName}
            </h1>
            <p className="hidden text-sm text-slate-300 mt-0.5 sm:block">
              {MISSION_BRIEFING_DATA.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onBackToMenu}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg hud-panel-subtle hover:border-cyan-400/50 text-xs font-medium text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Main Menu</span>
          </button>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto custom-scroll space-y-5 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <div>
                <h2 className="text-xs uppercase tracking-wider text-cyan-400 font-semibold mb-2">
                  Mission Story
                </h2>
                <p className="text-sm md:text-base text-slate-200 leading-relaxed">
                  {MISSION_BRIEFING_DATA.story}
                </p>
              </div>

              <div>
                <h2 className="text-xs uppercase tracking-wider text-cyan-400 font-semibold mb-3">
                  Scientific & Engineering Objectives
                </h2>
                <ul className="space-y-2.5">
                  {MISSION_BRIEFING_DATA.objectives.map((obj) => (
                    <li
                      key={obj}
                      className="flex items-start gap-2.5 text-sm text-slate-200"
                    >
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="hud-panel-subtle rounded-lg p-5 flex flex-col justify-between gap-5">
              <div className="space-y-4">
                <h2 className="text-xs uppercase tracking-wider text-cyan-400 font-semibold">
                  Illustrative Constraints
                </h2>
                <div className="space-y-3.5">
                  {MISSION_BRIEFING_DATA.specs.map((spec) => (
                    <div
                      key={spec.label}
                      className="pb-3 border-b border-slate-800 last:border-b-0 last:pb-0"
                    >
                      <p className="text-xs text-slate-400">{spec.label}</p>
                      <p className="font-mono-tabular text-base font-semibold text-white mt-0.5">
                        {spec.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed pt-3 border-t border-slate-800">
                {MISSION_BRIEFING_DATA.note}
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 sm:px-8 sm:py-4 border-t border-slate-700/60 flex items-center justify-between gap-3 sm:gap-4">
          <p className="hidden text-xs text-slate-400 sm:block">
            Next Stage: Spacecraft Assembly Bay
          </p>
          <button
            type="button"
            onClick={onContinue}
            className="flex items-center gap-2 px-4 sm:px-6 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <span className="sm:hidden">CONTINUE</span>
            <span className="hidden sm:inline">CONTINUE TO DESIGNER</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
