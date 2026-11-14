import React from 'react';
import { X } from 'lucide-react';
import { CREDITS_DATA } from '../data/missionBriefing';

interface CreditsModalProps {
  onClose: () => void;
}

export const CreditsModal: React.FC<CreditsModalProps> = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="credits-title"
    >
      <div className="hud-panel rounded-xl w-full max-w-lg flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60">
          <div>
            <p className="text-xs font-mono-tabular text-cyan-400 uppercase tracking-wider">
              {CREDITS_DATA.event}
            </p>
            <h2
              id="credits-title"
              className="font-display text-xl font-bold text-white"
            >
              Game Credits & Engineering Notes
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Credits"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <h3 className="font-display text-lg font-bold text-white">
              {CREDITS_DATA.title}
            </h3>
            <p className="text-sm text-cyan-300">{CREDITS_DATA.tagline}</p>
          </div>

          <div className="space-y-2.5">
            <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              Simulation & Technical Stack
            </p>
            <ul className="space-y-2 text-sm text-slate-300">
              {CREDITS_DATA.architecture.map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <span className="text-cyan-400 font-mono-tabular">·</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed pt-2 border-t border-slate-800">
            Educational Note: Spacecraft mass, launch costs, orbital periods, and power budgets are simplified illustrative simulations created to teach core aerospace systems engineering concepts.
          </p>
        </div>

        <div className="px-6 py-4 border-t border-slate-700/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
