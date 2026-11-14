import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { CreditsModal } from './components/CreditsModal';
import { HowToPlayModal } from './components/HowToPlayModal';
import { LaunchSequenceHUD } from './components/LaunchSequenceHUD';
import { MainMenu } from './components/MainMenu';
import { MissionBriefing } from './components/MissionBriefing';
import { MissionOperationsHUD } from './components/MissionOperationsHUD';
import { MissionReport } from './components/MissionReport';
import { OrbitDesigner } from './components/OrbitDesigner';
import {
  AssemblyLabDesigner,
  type AssemblyLabSnapshot,
} from './assemblyLab/AssemblyLabDesigner';
import { SpaceCanvas } from './scenes/SpaceCanvas';
import {
  createInitialMissionState,
  missionReducer,
} from './simulation/missionReducer';
import { soundEngine } from './simulation/sound';
import { MISSION_LIMITS } from './styles/theme';

export default function App() {
  const [state, dispatch] = useReducer(
    missionReducer,
    undefined,
    () => createInitialMissionState(true),
  );

  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [launchProgress, setLaunchProgress] = useState(0);
  const [assemblyBuild, setAssemblyBuild] = useState<AssemblyLabSnapshot | null>(null);

  const prevLowBatteryRef = useRef(false);
  const prevTransmittingRef = useRef(false);

  // Sync sound engine toggle
  useEffect(() => {
    soundEngine.setEnabled(state.soundEnabled);
  }, [state.soundEnabled]);

  // Animated 16-second launch sequence driver
  useEffect(() => {
    if (state.stage !== 'launch') {
      setLaunchProgress(0);
      return;
    }

    let rafId = 0;
    const durationMs = 16000;
    const startTime = performance.now();

    const step = (now: number) => {
      const progress = Math.min(1, (now - startTime) / durationMs);
      setLaunchProgress(progress);
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        dispatch({ type: 'COMPLETE_LAUNCH' });
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [state.stage]);

  // Audio cue feedback for low battery & downlink lock during Mission Operations
  useEffect(() => {
    if (state.stage !== 'operations') {
      prevLowBatteryRef.current = false;
      prevTransmittingRef.current = false;
      return;
    }
    const isLow =
      state.operations.batteryPct < MISSION_LIMITS.lowBatteryThresholdPct;
    if (isLow && !prevLowBatteryRef.current) {
      soundEngine.playWarning();
    }
    prevLowBatteryRef.current = isLow;

    const isTx = state.operations.isTransmitting;
    if (isTx && !prevTransmittingRef.current) {
      soundEngine.playCommsHandshake();
    }
    prevTransmittingRef.current = isTx;
  }, [
    state.stage,
    state.operations.batteryPct,
    state.operations.isTransmitting,
  ]);

  const handleTickOperations = useCallback((dtSec: number) => {
    dispatch({ type: 'TICK_OPERATIONS', dtSec });
  }, []);

  const handleSelectPart = useCallback((partId: typeof state.selectedComponentId) => {
    if (partId) soundEngine.playClick();
    dispatch({ type: 'SELECT_COMPONENT', id: partId });
  }, []);

  const handleDropComponent = useCallback((partId: NonNullable<typeof state.selectedComponentId>) => {
    soundEngine.playAttach();
    dispatch({ type: 'ADJUST_COMPONENT', id: partId, delta: 1 });
  }, []);

  return (
    <main className="relative w-screen h-dvh overflow-hidden bg-[#050914] select-none">
      {/* Persistent 3D WebGL Environment */}
      {state.stage !== 'designer' && (
        <SpaceCanvas
          state={state}
          assemblyBuild={assemblyBuild}
          launchProgress={launchProgress}
          onSelectPart={handleSelectPart}
          onDropComponent={handleDropComponent}
          onTickOperations={handleTickOperations}
        />
      )}

      {/* Stage 1: Main Menu */}
      {state.stage === 'menu' && (
        <MainMenu
          soundEnabled={state.soundEnabled}
          onStartMission={() => {
            soundEngine.playClick();
            dispatch({ type: 'SET_STAGE', stage: 'briefing' });
          }}
          onOpenHowToPlay={() => {
            soundEngine.playClick();
            setShowHowToPlay(true);
          }}
          onOpenCredits={() => {
            soundEngine.playClick();
            setShowCredits(true);
          }}
          onToggleSound={() => {
            dispatch({ type: 'TOGGLE_SOUND' });
          }}
        />
      )}

      {/* Stage 2: Mission Briefing */}
      {state.stage === 'briefing' && (
        <MissionBriefing
          onContinue={() => {
            soundEngine.playClick();
            dispatch({ type: 'SET_STAGE', stage: 'designer' });
          }}
          onBackToMenu={() => {
            soundEngine.playClick();
            dispatch({ type: 'SET_STAGE', stage: 'menu' });
          }}
        />
      )}

      {/* Stage 3: Spacecraft Designer */}
      <div
        className={
          state.stage === 'designer'
            ? 'designer-stage-shell designer-stage-enter'
            : 'hidden'
        }
      >
        <AssemblyLabDesigner
          soundEnabled={state.soundEnabled}
          onToggleSound={() => dispatch({ type: 'TOGGLE_SOUND' })}
          onBack={() => {
            soundEngine.playClick();
            dispatch({ type: 'SET_STAGE', stage: 'briefing' });
          }}
          onContinue={(design, snapshot) => {
            setAssemblyBuild(snapshot);
            dispatch({ type: 'SET_DESIGN', design });
            dispatch({ type: 'SET_STAGE', stage: 'orbit' });
          }}
        />
      </div>

      {/* Stage 4: Orbit Designer */}
      {state.stage === 'orbit' && (
        <OrbitDesigner
          selectedOrbit={state.selectedOrbit}
          selectedTargetRegion={state.selectedTargetRegion}
          soundEnabled={state.soundEnabled}
          onSelectOrbit={(orbit) => {
            soundEngine.playClick();
            dispatch({ type: 'SET_ORBIT', orbit });
          }}
          onSelectTargetRegion={(region) => {
            soundEngine.playClick();
            dispatch({ type: 'SET_TARGET_REGION', region });
          }}
          onBack={() => {
            soundEngine.playClick();
            dispatch({ type: 'SET_STAGE', stage: 'designer' });
          }}
          onLaunchMission={() => {
            soundEngine.playCountdownTick(false);
            dispatch({ type: 'SET_STAGE', stage: 'launch' });
          }}
          onOpenHelp={() => {
            soundEngine.playClick();
            setShowHowToPlay(true);
          }}
          onToggleSound={() => dispatch({ type: 'TOGGLE_SOUND' })}
        />
      )}

      {/* Stage 5: Launch Sequence */}
      {state.stage === 'launch' && (
        <LaunchSequenceHUD
          launchProgress={launchProgress}
          selectedOrbit={state.selectedOrbit}
          soundEnabled={state.soundEnabled}
          onSkipToOrbit={() => {
            soundEngine.playCommsHandshake();
            dispatch({ type: 'COMPLETE_LAUNCH' });
          }}
          onToggleSound={() => dispatch({ type: 'TOGGLE_SOUND' })}
        />
      )}

      {/* Stage 6: Mission Operations */}
      {state.stage === 'operations' && (
        <MissionOperationsHUD
          state={state}
          onTogglePause={() => {
            soundEngine.playClick();
            dispatch({ type: 'TOGGLE_PAUSE' });
          }}
          onSetSpeed={(speed) => {
            soundEngine.playClick();
            dispatch({ type: 'SET_SPEED', speed });
          }}
          onSetCameraMode={(mode) => {
            soundEngine.playClick();
            dispatch({ type: 'SET_CAMERA_MODE', mode });
          }}
          onToggleImager={() => {
            soundEngine.playClick();
            dispatch({ type: 'TOGGLE_IMAGER' });
          }}
          onToggleSensor={() => {
            soundEngine.playClick();
            dispatch({ type: 'TOGGLE_SENSOR' });
          }}
          onToggleComms={() => {
            soundEngine.playClick();
            dispatch({ type: 'TOGGLE_COMMS' });
          }}
          onSetObserving={(observing) => {
            if (observing) soundEngine.playScanPulse();
            else soundEngine.playClick();
            dispatch({ type: 'SET_OBSERVING', observing });
          }}
          onSetObservationDirection={(deg) => {
            dispatch({ type: 'SET_OBSERVATION_DIRECTION', deg });
          }}
          onSelectGroundStation={(stationId) => {
            soundEngine.playCommsHandshake();
            dispatch({ type: 'SELECT_GROUND_STATION', stationId });
          }}
          onEndMission={() => {
            soundEngine.playClick();
            dispatch({ type: 'END_MISSION_EARLY' });
          }}
          onOpenHelp={() => {
            soundEngine.playClick();
            setShowHowToPlay(true);
          }}
          onToggleSound={() => dispatch({ type: 'TOGGLE_SOUND' })}
        />
      )}

      {/* Stage 7: Mission Report */}
      {state.stage === 'report' && (
        <MissionReport
          state={state}
          onReplayMission={() => {
            soundEngine.playClick();
            dispatch({ type: 'REPLAY_MISSION' });
          }}
          onReturnToMenu={() => {
            soundEngine.playClick();
            dispatch({ type: 'RETURN_TO_MENU' });
          }}
        />
      )}

      {/* Modals */}
      {showHowToPlay && (
        <HowToPlayModal
          onClose={() => {
            soundEngine.playClick();
            setShowHowToPlay(false);
          }}
        />
      )}
      {showCredits && (
        <CreditsModal
          onClose={() => {
            soundEngine.playClick();
            setShowCredits(false);
          }}
        />
      )}
    </main>
  );
}
