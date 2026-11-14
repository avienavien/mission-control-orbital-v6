import React from 'react';
import { X } from 'lucide-react';
import { HOW_TO_PLAY_SECTIONS } from '../data/missionBriefing';

interface HowToPlayModalProps {
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-to-play-title"
    >
      <div className="hud-panel rounded-xl w-full max-w-2xl max-h-[86vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60">
          <div>
            <p className="text-xs font-mono-tabular text-cyan-400 uppercase tracking-wider">
              Mission Director Handbook
            </p>
            <h2
              id="how-to-play-title"
              className="font-display text-xl font-bold text-white"
            >
              How to Play MISSION CONTROL: ORBITAL
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close How to Play"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto custom-scroll space-y-5">
          {HOW_TO_PLAY_SECTIONS.map((sec) => (
            <div
              key={sec.title}
              className="pb-4 border-b border-slate-800/80 last:border-b-0 last:pb-0"
            >
              <h3 className="font-display text-base font-semibold text-cyan-300 mb-1.5">
                {sec.title}
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">{sec.body}</p>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-slate-700/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
