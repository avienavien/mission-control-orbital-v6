import React from 'react';
import { BookOpen, Info, Rocket, Volume2, VolumeX } from 'lucide-react';

interface MainMenuProps {
  soundEnabled: boolean;
  onStartMission: () => void;
  onOpenHowToPlay: () => void;
  onOpenCredits: () => void;
  onToggleSound: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  soundEnabled,
  onStartMission,
  onOpenHowToPlay,
  onOpenCredits,
  onToggleSound,
}) => {
  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex items-center">
      {/* Left contrast gradient scrim so typography stays razor-sharp over sunlit Earth */}
      <div className="absolute inset-y-0 left-0 w-full max-w-2xl bg-gradient-to-r from-[#050914]/92 via-[#050914]/65 to-transparent" />

      <div className="relative z-10 pointer-events-auto max-h-full max-w-xl overflow-y-auto custom-scroll px-5 py-8 sm:px-10 sm:py-12 md:px-16 flex flex-col gap-6 sm:gap-8">
        <div className="space-y-3">
          <p className="text-xs font-mono-tabular tracking-[0.2em] uppercase text-cyan-400">
            NASA Space Apps Challenge 2026 · Orbital Simulation
          </p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.06]">
            MISSION CONTROL: ORBITAL
          </h1>
          <p className="text-lg md:text-xl font-medium text-cyan-200 tracking-wide">
            Design. Launch. Explore.
          </p>
          <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-md pt-1">
            Become a NASA-inspired space mission director. Engineer a custom Earth-observation satellite, select an orbital trajectory, launch into space, and manage power, instruments, and ground downlinks in real time.
          </p>
        </div>

        <div className="flex flex-col gap-3 max-w-xs">
          <button
            type="button"
            onClick={onStartMission}
            className="flex items-center justify-center gap-3 px-6 py-3.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm tracking-wide transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
          >
            <Rocket className="w-4 h-4 shrink-0" />
            <span>START MISSION</span>
          </button>

          <button
            type="button"
            onClick={onOpenHowToPlay}
            className="flex items-center justify-center gap-3 px-6 py-3 rounded-lg hud-panel hover:border-cyan-400/60 text-slate-100 font-medium text-sm transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
          >
            <BookOpen className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>HOW TO PLAY</span>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onOpenCredits}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg hud-panel-subtle hover:border-cyan-400/50 text-slate-200 font-medium text-xs transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
            >
              <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>GAME CREDITS</span>
            </button>

            <button
              type="button"
              onClick={onToggleSound}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg hud-panel-subtle hover:border-cyan-400/50 text-slate-200 font-medium text-xs transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
            >
              {soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )}
              <span>{soundEnabled ? 'SOUND ON' : 'SOUND OFF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
