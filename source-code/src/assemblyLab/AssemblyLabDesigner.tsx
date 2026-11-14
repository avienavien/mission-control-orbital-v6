import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Rocket,
  RotateCcw,
  RotateCw,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { AssemblyDock, DockTab } from './components/AssemblyDock';
import { MissingPartsWarningModal } from './components/MissingPartsWarningModal';
import {
  CameraTargetRequest,
  Hovered3DTarget,
  SatelliteViewport,
} from './components/SatelliteViewport';
import {
  CATEGORY_WHY_NEEDED,
  FINISH_OPTIONS,
  MISSION_GOALS,
  PARTS_BY_ID,
} from './data/partsCatalog';
import {
  CameraPreset,
  MissionGoalId,
  PlacedPart,
  SubsystemCategory,
  SurfaceFinish,
} from './types/satellite';
import { calculateSpacecraftTelemetry } from './utils/engineeringMath';
import { soundFx } from './utils/soundFx';

interface RemovalWarningState {
  partId: string;
  partName: string;
  socketId: string;
  reason: string;
}

export interface AssemblyLabDesignCounts {
  bus: number;
  solar: number;
  battery: number;
  imager: number;
  antenna: number;
  sensor: number;
}

export interface AssemblyLabSnapshot {
  placedParts: PlacedPart[];
  missionGoalId: MissionGoalId;
}

interface AssemblyLabDesignerProps {
  soundEnabled: boolean;
  onBack: () => void;
  onContinue: (design: AssemblyLabDesignCounts, snapshot: AssemblyLabSnapshot) => void;
  onToggleSound: () => void;
}

function toMissionDesign(placedParts: PlacedPart[]): AssemblyLabDesignCounts {
  const definitions = placedParts.map((part) => PARTS_BY_ID[part.partId]).filter(Boolean);
  const hasCategory = (category: SubsystemCategory) =>
    definitions.some((part) => part.category === category);
  const payloadCount = definitions.filter(
    (part) => part.category === SubsystemCategory.PAYLOAD,
  ).length;
  const generators = definitions.filter((part) => part.powerGenW > 0).length;
  const batteries = definitions.filter((part) => (part.batteryWh ?? 0) > 0).length;

  return {
    bus: hasCategory(SubsystemCategory.BUS) ? 1 : 0,
    solar: Math.min(3, generators),
    battery: Math.min(3, batteries),
    imager: payloadCount > 0 ? 1 : 0,
    antenna: hasCategory(SubsystemCategory.COMMS) ? 1 : 0,
    sensor: payloadCount > 1 ? 1 : 0,
  };
}

export function AssemblyLabDesigner({
  soundEnabled,
  onBack,
  onContinue,
  onToggleSound,
}: AssemblyLabDesignerProps) {
  // Starts completely empty: ALL parts set to 0!
  const [placedParts, setPlacedParts] = useState<PlacedPart[]>([]);
  const [missionGoalId, setMissionGoalId] = useState<MissionGoalId>(MissionGoalId.LEO_EARTH);
  const [dockTab, setDockTab] = useState<DockTab>('parts');
  const [dockCollapsed, setDockCollapsed] = useState(false);

  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [selectedCatalogPartId, setSelectedCatalogPartId] = useState<string | null>(null);
  const [activeSocketId, setActiveSocketId] = useState<string | null>(null);
  const [hoveredPartId, setHoveredPartId] = useState<string | null>(null);
  const [hovered3D, setHovered3D] = useState<Hovered3DTarget | null>(null);

  const [showOutlineOverlay, setShowOutlineOverlay] = useState(false);
  const [explodeAmount, setExplodeAmount] = useState(0);
  const [deployed, setDeployed] = useState(true);
  const [deployProgress, setDeployProgress] = useState(1);
  const [autoRotate, setAutoRotate] = useState(false);
  const [inOrbit, setInOrbit] = useState(false);
  const muted = !soundEnabled;

  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [removalWarning, setRemovalWarning] = useState<RemovalWarningState | null>(null);
  const [cameraPresetRequest, setCameraPresetRequest] = useState<{
    id: number;
    preset: CameraPreset;
  } | null>(null);
  const [cameraTargetRequest, setCameraTargetRequest] = useState<CameraTargetRequest | null>(null);
  const reqSeq = useRef(1);
  const instanceSeq = useRef(1);

  useEffect(() => {
    soundFx.muted = muted;
  }, [muted]);

  // Smoothly animate deployProgress when toggled
  useEffect(() => {
    const target = deployed ? 1 : 0;
    let raf = 0;
    const step = () => {
      setDeployProgress((prev) => {
        const diff = target - prev;
        if (Math.abs(diff) < 0.01) return target;
        raf = requestAnimationFrame(step);
        return prev + diff * 0.14;
      });
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [deployed]);

  const currentGoal = useMemo(
    () => MISSION_GOALS.find((g) => g.id === missionGoalId) ?? MISSION_GOALS[0],
    [missionGoalId]
  );

  const telemetry = useMemo(
    () => calculateSpacecraftTelemetry(placedParts, missionGoalId),
    [placedParts, missionGoalId]
  );

  const failingChecks = useMemo(
    () => telemetry.missionChecks.filter((c) => !c.passed),
    [telemetry.missionChecks]
  );

  const activeSockets = useMemo(() => {
    const placedBus = placedParts.find(
      (p) => PARTS_BY_ID[p.partId]?.category === SubsystemCategory.BUS
    );
    const busDef = placedBus
      ? PARTS_BY_ID[placedBus.partId]
      : PARTS_BY_ID[currentGoal.blueprintBusId];
    return busDef?.busSockets ?? [];
  }, [placedParts, currentGoal.blueprintBusId]);

  const installPartAt = useCallback(
    (partId: string, preferredSocketId?: string) => {
      if (inOrbit) return;
      const partDef = PARTS_BY_ID[partId];
      if (!partDef) return;

      setPlacedParts((prev) => {
        const isBus = partDef.category === SubsystemCategory.BUS;

        if (isBus) {
          const withoutBus = prev.filter(
            (p) => PARTS_BY_ID[p.partId]?.category !== SubsystemCategory.BUS
          );
          const validSockets = new Set((partDef.busSockets ?? []).map((s) => s.id));
          const kept = withoutBus.filter((p) => validSockets.has(p.socketId));
          instanceSeq.current += 1;
          const busEntry: PlacedPart = {
            instanceId: `inst_${instanceSeq.current}`,
            partId: partDef.id,
            socketId: 'bus_center',
            rotationStep: 0,
            deployed: true,
            finish: partDef.defaultFinish,
            installedAt: Date.now(),
          };
          soundFx.playSnap();
          return [busEntry, ...kept];
        }

        // Determine target socket for non-bus part
        const occupied = new Set(prev.map((p) => p.socketId));
        let chosenSocket: string | undefined;

        if (preferredSocketId && !occupied.has(preferredSocketId)) {
          const sockDef = activeSockets.find((s) => s.id === preferredSocketId);
          if (sockDef && partDef.compatibleSockets.includes(sockDef.kind)) {
            chosenSocket = preferredSocketId;
          }
        }

        if (!chosenSocket && activeSocketId && !occupied.has(activeSocketId)) {
          const sockDef = activeSockets.find((s) => s.id === activeSocketId);
          if (sockDef && partDef.compatibleSockets.includes(sockDef.kind)) {
            chosenSocket = activeSocketId;
          }
        }

        // Prefer unoccupied blueprint sockets matching this part
        if (!chosenSocket) {
          const bpMatch = currentGoal.blueprintParts.find(
            (bp) => bp.partId === partId && !occupied.has(bp.socketId)
          );
          if (bpMatch) chosenSocket = bpMatch.socketId;
        }

        // Fallback to any compatible unoccupied socket
        if (!chosenSocket) {
          const anyCompat = activeSockets.find(
            (s) => !occupied.has(s.id) && partDef.compatibleSockets.includes(s.kind)
          );
          chosenSocket = anyCompat?.id;
        }

        if (!chosenSocket) return prev;

        instanceSeq.current += 1;
        const newPart: PlacedPart = {
          instanceId: `inst_${instanceSeq.current}`,
          partId: partDef.id,
          socketId: chosenSocket,
          rotationStep: 0,
          deployed: true,
          finish: partDef.defaultFinish,
          installedAt: Date.now(),
        };
        soundFx.playSnap();
        if (partDef.deployable) {
          soundFx.playServo();
        }
        return [...prev, newPart];
      });

      setActiveSocketId(null);
      setRemovalWarning((prev) => (prev?.partId === partId ? null : prev));
    },
    [inOrbit, activeSockets, activeSocketId, currentGoal.blueprintParts]
  );

  const removeInstance = useCallback(
    (instanceId: string) => {
      if (inOrbit) return;
      const target = placedParts.find((p) => p.instanceId === instanceId);
      if (!target) return;
      const def = PARTS_BY_ID[target.partId];

      const nextParts = placedParts.filter((p) => p.instanceId !== instanceId);
      setPlacedParts(nextParts);
      if (selectedInstanceId === instanceId) {
        setSelectedInstanceId(null);
      }
      soundFx.playDetach();

      // Check if removing this part created or left a mission-critical failure
      const nextTelemetry = calculateSpacecraftTelemetry(nextParts, missionGoalId);
      const relatedFailure = nextTelemetry.missionChecks.find(
        (c) => !c.passed && (c.recommendedPartId === target.partId || def?.category === SubsystemCategory.BUS)
      );
      if (def && (!nextTelemetry.isFlightReady || relatedFailure)) {
        const fallbackReason =
          relatedFailure?.whyNeeded ?? CATEGORY_WHY_NEEDED[def.category];
        soundFx.playWarning();
        setRemovalWarning({
          partId: def.id,
          partName: def.name,
          socketId: target.socketId,
          reason: fallbackReason,
        });
      }
    },
    [inOrbit, placedParts, selectedInstanceId, missionGoalId]
  );

  const handleRemovePartById = useCallback(
    (partId: string) => {
      const matching = placedParts.filter((p) => p.partId === partId);
      const last = matching[matching.length - 1];
      if (last) {
        removeInstance(last.instanceId);
      }
    },
    [placedParts, removeInstance]
  );

  const handleClickBlueprintSlot = useCallback(
    (partId: string, socketId: string) => {
      if (inOrbit) return;
      installPartAt(partId, socketId);
    },
    [inOrbit, installPartAt]
  );

  const handleClickEmptySocket = useCallback(
    (socketId: string) => {
      if (inOrbit) return;
      if (selectedCatalogPartId) {
        const partDef = PARTS_BY_ID[selectedCatalogPartId];
        const sockDef = activeSockets.find((s) => s.id === socketId);
        if (partDef && sockDef && partDef.compatibleSockets.includes(sockDef.kind)) {
          installPartAt(partDef.id, socketId);
          return;
        }
      }
      setActiveSocketId((prev) => (prev === socketId ? null : socketId));
      setDockCollapsed(false);
      setDockTab('parts');
    },
    [inOrbit, selectedCatalogPartId, activeSockets, installPartAt]
  );

  const handleLocateRecommended = useCallback(
    (partId: string, socketId: string) => {
      setWarningModalOpen(false);
      setHoveredPartId(partId);
      if (socketId === 'bus_center') {
        reqSeq.current += 1;
        setCameraTargetRequest({
          id: reqSeq.current,
          position: [4.2, 2.8, 4.8],
          target: [0, 1.82, 0],
        });
        return;
      }
      const sock = activeSockets.find((s) => s.id === socketId);
      if (sock) {
        const [sx, sy, sz] = sock.position;
        const [nx, ny, nz] = sock.normal;
        reqSeq.current += 1;
        setCameraTargetRequest({
          id: reqSeq.current,
          position: [sx + nx * 3.8 + 1.2, 1.82 + sy + ny * 2.2 + 1.2, sz + nz * 3.8 + 1.4],
          target: [sx * 0.5, 1.82 + sy * 0.5, sz * 0.5],
        });
      }
    },
    [activeSockets]
  );

  const handleSelectCameraPreset = useCallback((preset: CameraPreset) => {
    reqSeq.current += 1;
    setCameraPresetRequest({ id: reqSeq.current, preset });
  }, []);

  const handleLaunchClick = () => {
    if (inOrbit) {
      setInOrbit(false);
      return;
    }

    if (!telemetry.isFlightReady) {
      soundFx.playWarning();
      setWarningModalOpen(true);
      setDockCollapsed(false);
      setDockTab('warnings');
      return;
    }

    soundFx.playHover();
    onContinue(toMissionDesign(placedParts), { placedParts, missionGoalId });
  };

  const handleResetToZero = () => {
    setResetConfirmOpen(false);
    setInOrbit(false);
    setPlacedParts([]);
    setMissionGoalId(MissionGoalId.LEO_EARTH);
    setDockTab('parts');
    setDockCollapsed(false);
    setSelectedInstanceId(null);
    setSelectedCatalogPartId(null);
    setActiveSocketId(null);
    setRemovalWarning(null);
    setWarningModalOpen(false);
    setExplodeAmount(0);
    soundFx.playDetach();
    handleSelectCameraPreset(CameraPreset.ISO);
  };

  const handleToggleMute = () => {
    onToggleSound();
  };

  const selectedPlaced = useMemo(
    () => placedParts.find((p) => p.instanceId === selectedInstanceId) ?? null,
    [placedParts, selectedInstanceId]
  );
  const selectedPlacedDef = selectedPlaced ? PARTS_BY_ID[selectedPlaced.partId] : null;

  const updateSelectedPart = (updater: (p: PlacedPart) => PlacedPart) => {
    if (!selectedPlaced) return;
    setPlacedParts((prev) =>
      prev.map((p) => (p.instanceId === selectedPlaced.instanceId ? updater(p) : p))
    );
  };

  return (
    <div className="relative w-screen h-dvh overflow-hidden designer-space-backdrop text-slate-100 select-none">
      {/* Top Bar (Strict 3-Zone Contract, solid surface — zero backdrop-blur over WebGL) */}
      <header className="designer-responsive-header fixed top-0 inset-x-0 z-30 grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-1 border-b border-slate-800/90 bg-[#0A0F1A]/95 px-3 py-2 sm:px-4 xl:h-14 xl:flex xl:items-center xl:justify-between xl:gap-6 xl:px-5 xl:py-0">
        {/* Back navigation and designer wordmark */}
        <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-2 sm:gap-3 xl:shrink-0">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex shrink-0 items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors whitespace-nowrap"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Briefing</span>
          </button>
          <span className="truncate text-sm font-bold tracking-tight text-white sm:text-base xl:whitespace-nowrap">
            <span className="sm:hidden">Assembly Lab</span>
            <span className="hidden sm:inline">Orbital Assembly Lab</span>
          </span>
        </div>

        {/* Zone 2: Clean single-line telemetry / warning links */}
        <nav className="col-span-2 row-start-2 flex min-w-0 items-center justify-between gap-3 overflow-x-auto text-xs font-medium text-slate-300 xl:order-2 xl:col-span-1 xl:row-auto xl:justify-start xl:gap-6 xl:overflow-visible">
          <button
            type="button"
            onClick={() => {
              setDockCollapsed(false);
              setDockTab('warnings');
              if (failingChecks.length > 0) {
                setWarningModalOpen(true);
              }
            }}
            className={`inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
              telemetry.isFlightReady
                ? 'text-emerald-400 hover:text-emerald-300'
                : 'text-amber-300 hover:text-amber-200'
            }`}
          >
            {telemetry.isFlightReady ? (
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>
              {telemetry.isFlightReady
                ? 'Flight Ready · 0 Warnings'
                : `${failingChecks.length} Missing ${failingChecks.length === 1 ? 'Warning' : 'Warnings'}`}
            </span>
          </button>

          <span className="hidden text-slate-400 font-mono-tabular whitespace-nowrap shrink-0 sm:inline">
            {placedParts.length} Parts · {telemetry.wetMassKg} kg ·{' '}
            {telemetry.netPowerW >= 0 ? '+' : ''}
            {telemetry.netPowerW} W
          </span>

          <button
            type="button"
            onClick={() => setResetConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Reset to 0</span>
          </button>

          <button
            type="button"
            onClick={handleToggleMute}
            aria-label={muted ? 'Unmute sound effects' : 'Mute sound effects'}
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            {muted ? (
              <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">{muted ? 'Muted' : 'Audio'}</span>
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="col-start-2 row-start-1 flex shrink-0 items-center justify-end gap-2 xl:order-3 xl:gap-3">
          <button
            type="button"
            onClick={handleLaunchClick}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-400 sm:gap-2 sm:px-4 sm:text-xs xl:shrink-0 ${
              inOrbit
                ? 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-700'
                : telemetry.isFlightReady
                  ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                  : 'bg-amber-400 text-slate-950 hover:bg-amber-300'
            }`}
          >
            <Rocket className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sm:hidden">Continue</span>
            <span className="hidden sm:inline">
              {inOrbit
                ? 'Return to Cleanroom'
                : 'Continue to Orbit Selection'}
            </span>
          </button>
        </div>
      </header>

      {/* Main 3D Viewport */}
      <main className="h-full w-full pt-24 xl:pt-14">
        <SatelliteViewport
          placedParts={placedParts}
          missionGoalId={missionGoalId}
          selectedInstanceId={selectedInstanceId}
          selectedCatalogPartId={selectedCatalogPartId}
          activeSocketId={activeSocketId}
          highlightedPartId={hoveredPartId}
          highlightedSocketId={null}
          showOutlineOverlay={showOutlineOverlay}
          explodeAmount={explodeAmount}
          deployProgress={deployProgress}
          autoRotate={autoRotate || inOrbit}
          inOrbit={inOrbit}
          cameraPresetRequest={cameraPresetRequest}
          cameraTargetRequest={cameraTargetRequest}
          onClickBlueprintSlot={handleClickBlueprintSlot}
          onClickPlacedPart={(instId) =>
            setSelectedInstanceId((prev) => (prev === instId ? null : instId))
          }
          onClickEmptySocket={handleClickEmptySocket}
          onHoverTargetChange={setHovered3D}
        />
      </main>

      {/* Empty-State Blueprint Prompt (shown when 0 parts installed) */}
      {placedParts.length === 0 && !removalWarning && (
        <div className="fixed top-28 xl:top-18 left-1/2 -translate-x-1/2 z-20 pointer-events-none px-3 sm:px-4 max-w-xl w-full flex justify-center">
          <div className="rounded-lg border border-slate-700/80 bg-[#0D1321]/95 px-4 py-2 text-center shadow-lg">
            <p className="text-xs text-slate-200">
              <span className="font-semibold text-white">0 parts installed</span> ({currentGoal.name}
              ). The white outline shows all required parts—click any outline in 3D or add from the
              catalog below.
            </p>
          </div>
        </div>
      )}

      {/* Orbit Simulation Readout */}
      {inOrbit && (
        <div className="fixed top-28 xl:top-18 left-3 sm:left-5 z-20 pointer-events-none rounded-lg border border-emerald-500/35 bg-[#0B141A]/95 px-3 sm:px-4 py-3 shadow-lg max-w-[calc(100vw-1.5rem)] sm:max-w-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span>{currentGoal.orbitLabel} · Nominal</span>
          </div>
          <p className="mt-1 text-xs text-slate-300 leading-relaxed">
            Generating <span className="font-mono-tabular text-white">{telemetry.powerGenW} W</span>{' '}
            (<span className="font-mono-tabular text-emerald-300">+{telemetry.netPowerW} W</span>{' '}
            net) · <span className="font-mono-tabular text-white">{telemetry.deltaV} m/s</span> Δv ·{' '}
            <span className="font-mono-tabular text-white">{telemetry.downlinkMbps} Mbps</span>
          </p>
        </div>
      )}

      {/* Immediate Warning Banner when a required part is removed */}
      {removalWarning && !inOrbit && (
        <div
          role="alert"
          className="fixed top-28 xl:top-18 left-1/2 -translate-x-1/2 z-30 w-[min(580px,calc(100vw-1.5rem))] rounded-lg border border-amber-500/45 bg-[#17120B]/95 px-3 sm:px-4 py-3 shadow-xl"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-amber-300">
                  Warning: {removalWarning.partName} Removed
                </p>
                <p className="mt-1 text-xs text-slate-200 leading-relaxed">
                  {removalWarning.reason}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => installPartAt(removalWarning.partId, removalWarning.socketId)}
                className="px-2.5 py-1 rounded text-xs font-semibold bg-amber-400 text-slate-950 hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0"
              >
                Re-install
              </button>
              <button
                type="button"
                onClick={() => setRemovalWarning(null)}
                aria-label="Dismiss warning"
                className="p-1 rounded text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Installed Part Inspector (Finish, Rotate, Deploy, Remove) */}
      {selectedPlaced && selectedPlacedDef && !inOrbit && (
        <div
          className={`fixed left-3 right-3 z-20 mx-auto w-[min(19rem,calc(100vw-1.5rem))] max-h-[24vh] overflow-y-auto tray-scroll rounded-lg border border-slate-700/90 bg-[#0C121F]/95 p-3.5 shadow-xl lg:left-auto lg:right-5 lg:max-h-none ${
            dockCollapsed ? 'bottom-16' : 'bottom-[calc(68vh+1rem)] lg:bottom-64'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[11px] text-slate-400">
                {selectedPlacedDef.massKg} kg · {selectedPlaced.socketId}
              </div>
              <h3 className="text-sm font-semibold text-white mt-0.5">
                {selectedPlacedDef.name}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedInstanceId(null)}
              aria-label="Close part inspector"
              className="p-1 rounded text-slate-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
            {CATEGORY_WHY_NEEDED[selectedPlacedDef.category]}
          </p>

          {/* Finish Swatches */}
          <div className="mt-3 pt-2.5 border-t border-slate-800">
            <div className="text-[11px] text-slate-400 mb-1.5">Surface Finish</div>
            <div className="flex items-center gap-1.5">
              {FINISH_OPTIONS.map((fin) => (
                <button
                  key={fin.id}
                  type="button"
                  title={fin.label}
                  onClick={() =>
                    updateSelectedPart((p) => ({ ...p, finish: fin.id as SurfaceFinish }))
                  }
                  className={`h-6 flex-1 rounded border text-[10px] font-medium flex items-center justify-center gap-1 transition-colors ${
                    selectedPlaced.finish === fin.id
                      ? 'border-cyan-400 text-white bg-slate-800'
                      : 'border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: fin.swatch }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Actions: Rotate, Deploy, Remove */}
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {selectedPlacedDef.category !== SubsystemCategory.BUS && (
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playHover();
                    updateSelectedPart((p) => ({
                      ...p,
                      rotationStep: ((p.rotationStep + 1) % 4) as 0 | 1 | 2 | 3,
                    }));
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 whitespace-nowrap shrink-0"
                >
                  <RotateCw className="h-3 w-3" aria-hidden="true" />
                  <span>90°</span>
                </button>
              )}
              {selectedPlacedDef.deployable && (
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playServo();
                    updateSelectedPart((p) => ({ ...p, deployed: !p.deployed }));
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 whitespace-nowrap shrink-0"
                >
                  {selectedPlaced.deployed ? (
                    <Minimize2 className="h-3 w-3" aria-hidden="true" />
                  ) : (
                    <Maximize2 className="h-3 w-3" aria-hidden="true" />
                  )}
                  <span>{selectedPlaced.deployed ? 'Fold' : 'Deploy'}</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => removeInstance(selectedPlaced.instanceId)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-rose-300 border border-rose-500/35 hover:bg-rose-500/15 transition-colors whitespace-nowrap shrink-0"
            >
              <Trash2 className="h-3 w-3" aria-hidden="true" />
              <span>Detach</span>
            </button>
          </div>
        </div>
      )}

      {/* 3D Cursor Hover Tooltip */}
      {hovered3D && (
        <div
          className="fixed z-40 pointer-events-none max-h-[24vh] max-w-[min(260px,calc(100vw-1.5rem))] overflow-hidden rounded-lg border border-slate-700 bg-[#0B101D]/95 px-3 py-2 shadow-xl"
          style={{
            left: Math.min(hovered3D.screenX + 16, window.innerWidth - 280),
            top: Math.max(hovered3D.screenY + 56, 68),
          }}
        >
          <div className="text-[11px] text-cyan-300 font-medium">
            {hovered3D.kind === 'blueprint'
              ? 'White Outline · Click to install'
              : hovered3D.kind === 'placed'
                ? 'Installed · Click to inspect'
                : 'Mount Socket · Click to select'}
          </div>
          <div className="text-xs font-semibold text-white mt-0.5">{hovered3D.label}</div>
          {hovered3D.partId && PARTS_BY_ID[hovered3D.partId] && (
            <div className="text-[11px] text-slate-300 mt-0.5 leading-snug">
              {PARTS_BY_ID[hovered3D.partId].description}
            </div>
          )}
        </div>
      )}

      {/* Collapsible Bottom Assembly Dock */}
      <AssemblyDock
        placedParts={placedParts}
        telemetry={telemetry}
        missionGoalId={missionGoalId}
        activeSocketId={activeSocketId}
        selectedCatalogPartId={selectedCatalogPartId}
        activeTab={dockTab}
        onTabChange={setDockTab}
        isCollapsed={dockCollapsed}
        onToggleCollapse={() => setDockCollapsed((c) => !c)}
        inOrbit={inOrbit}
        explodeAmount={explodeAmount}
        onExplodeChange={setExplodeAmount}
        deployed={deployed}
        onToggleDeployed={() => {
          soundFx.playServo();
          setDeployed((d) => !d);
        }}
        showOutlineOverlay={showOutlineOverlay}
        onToggleOutlineOverlay={() => setShowOutlineOverlay((v) => !v)}
        autoRotate={autoRotate}
        onToggleAutoRotate={() => setAutoRotate((v) => !v)}
        onSelectCameraPreset={handleSelectCameraPreset}
        onChangeMissionGoal={(goalId) => {
          setMissionGoalId(goalId);
          setActiveSocketId(null);
        }}
        onSelectCatalogPart={setSelectedCatalogPartId}
        onAddPart={(partId) => installPartAt(partId)}
        onRemovePart={handleRemovePartById}
        onHoverPart={setHoveredPartId}
        onInstallRecommended={(partId, socketId) => installPartAt(partId, socketId)}
        onLocateRecommended={handleLocateRecommended}
      />

      {/* Launch Blocked Missing-Parts Warning Modal */}
      <MissingPartsWarningModal
        isOpen={warningModalOpen}
        missionName={currentGoal.name}
        failingChecks={failingChecks}
        onClose={() => setWarningModalOpen(false)}
        onContinueAnyway={() => {
          setWarningModalOpen(false);
          soundFx.playLaunch();
          onContinue(toMissionDesign(placedParts), { placedParts, missionGoalId });
        }}
        onInstallRecommended={(partId, socketId) => installPartAt(partId, socketId)}
        onLocateRecommended={handleLocateRecommended}
      />

      {resetConfirmOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="reset-design-title"
          aria-describedby="reset-design-description"
        >
          <div className="w-full max-w-md rounded-xl border border-amber-500/35 bg-[#0C111D] p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/15 text-amber-400">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 id="reset-design-title" className="text-base font-semibold text-white">
                  Reset this satellite design?
                </h2>
                <p id="reset-design-description" className="mt-1.5 text-sm leading-relaxed text-slate-300">
                  This removes every installed part, clears the current profile, and returns the designer to the default LEO Earth mission.
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                autoFocus
                onClick={() => setResetConfirmOpen(false)}
                className="rounded-lg border border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-800"
              >
                No, keep my design
              </button>
              <button
                type="button"
                onClick={handleResetToZero}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-3.5 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-300"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Yes, reset to 0
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
