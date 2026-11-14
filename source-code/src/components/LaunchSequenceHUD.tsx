import React, { useEffect, useRef } from 'react';
import { FastForward, Volume2, VolumeX } from 'lucide-react';
import { ORBIT_MAP } from '../data/orbits';
import { OrbitId } from '../game/types';
import { soundEngine } from '../simulation/sound';

interface LaunchSequenceHUDProps {
  launchProgress: number;
  selectedOrbit: OrbitId;
  soundEnabled: boolean;
  onSkipToOrbit: () => void;
  onToggleSound: () => void;
}

export const LaunchSequenceHUD: React.FC<LaunchSequenceHUDProps> = ({
  launchProgress,
  selectedOrbit,
  soundEnabled,
  onSkipToOrbit,
  onToggleSound,
}) => {
  const orbit = ORBIT_MAP[selectedOrbit];
  const lastPhaseRef = useRef<string>('');

  // T-8s to T+24s timeline mapped from 0..1 progress
  const simClockSec = Math.round(launchProgress * 32 - 8);
  const clockLabel =
    simClockSec < 0
      ? `T-00:${String(Math.abs(simClockSec)).padStart(2, '0')}`
      : `T+00:${String(simClockSec).padStart(2, '0')}`;

  let phaseTitle = 'Pre-Launch Terminal Countdown';
  let callout =
    'Flight director confirms go for orbital launch. Internal power transfer complete.';

  if (launchProgress >= 0.16 && launchProgress < 0.25) {
    phaseTitle = 'Main Engine Ignition';
    callout =
      'Cryogenic engines at 100% thrust. Umbilical swing arm retracting from vehicle.';
  } else if (launchProgress >= 0.25 && launchProgress < 0.48) {
    phaseTitle = 'Liftoff & Tower Clear';
    callout = `Liftoff confirmed! Vehicle pitching downrange toward ${orbit.name}.`;
  } else if (launchProgress >= 0.48 && launchProgress < 0.62) {
    phaseTitle = 'Upper Atmospheric Ascent';
    callout =
      'Passed Max-Q aerodynamic pressure. Approaching outer Karman boundary.';
  } else if (launchProgress >= 0.62 && launchProgress < 0.78) {
    phaseTitle = 'Payload Fairing Separation';
    callout =
      'Fairing halves jettisoned. Your custom Earth-observation satellite is exposed to space.';
  } else if (launchProgress >= 0.78) {
    phaseTitle = 'Spacecraft Separation & Deployment';
    callout = `Spacecraft separated cleanly into ${orbit.shortName}. Initializing orbital telemetry.`;
  }

  useEffect(() => {
    if (lastPhaseRef.current === phaseTitle) return;
    lastPhaseRef.current = phaseTitle;
    if (phaseTitle === 'Main Engine Ignition') {
      soundEngine.playCountdownTick(true);
      soundEngine.playLaunchRumble();
    } else if (phaseTitle === 'Payload Fairing Separation') {
      soundEngine.playAttach();
    } else if (phaseTitle === 'Spacecraft Separation & Deployment') {
      soundEngine.playCommsHandshake();
    }
  }, [phaseTitle]);

  const milestones = [
    { label: 'Countdown', done: launchProgress >= 0.16 },
    { label: 'Ignition', done: launchProgress >= 0.25 },
    { label: 'Ascent', done: launchProgress >= 0.62 },
    { label: 'Fairing Sep', done: launchProgress >= 0.78 },
    { label: 'Deploy', done: launchProgress >= 0.96 },
  ];

  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-2 sm:p-3 lg:p-5">
      {/* Top Countdown & Controls */}
      <div className="flex items-start justify-between gap-4">
        <div className="pointer-events-auto hud-panel rounded-xl px-3 py-2.5 sm:px-5 sm:py-3.5">
          <p className="text-xs font-mono-tabular text-cyan-400 uppercase tracking-wider">
            Launch Control · {orbit.shortName}
          </p>
          <p className="font-mono-tabular text-2xl sm:text-3xl font-bold text-white mt-0.5">
            {clockLabel}
          </p>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleSound}
            aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'}
            className="p-2.5 rounded-lg hud-panel hover:border-cyan-400/50 text-slate-200 transition-colors cursor-pointer"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
          </button>
          <button
            type="button"
            onClick={onSkipToOrbit}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg hud-panel hover:border-cyan-400/60 text-xs font-semibold text-slate-100 transition-colors cursor-pointer whitespace-nowrap"
          >
            <FastForward className="w-3.5 h-3.5 text-cyan-400" />
            <span>Skip to Orbit</span>
          </button>
        </div>
      </div>

      {/* Bottom Mission Control Callout */}
      <div className="pointer-events-auto hud-panel rounded-xl px-3 py-3 sm:px-6 sm:py-4 max-w-3xl mx-auto w-full space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-white">
              {phaseTitle}
            </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">{callout}</p>
          </div>
          <span className="font-mono-tabular text-sm font-semibold text-cyan-300 shrink-0">
            {Math.round(launchProgress * 100)}%
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2 pt-1">
          {milestones.map((m) => (
            <div key={m.label} className="space-y-1">
              <div
                className={`h-1.5 rounded-full transition-colors ${
                  m.done ? 'bg-cyan-400' : 'bg-slate-700'
                }`}
              />
              <p
                className={`text-[11px] font-mono-tabular ${
                  m.done ? 'text-cyan-300' : 'text-slate-500'
                }`}
                style={{ overflowWrap: 'anywhere' }}
              >
                {m.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
