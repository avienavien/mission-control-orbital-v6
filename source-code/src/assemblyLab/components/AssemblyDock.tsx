import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Eye,
  EyeOff,
  HelpCircle,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  RotateCw,
} from 'lucide-react';
import {
  CATEGORY_META,
  CATEGORY_WHY_NEEDED,
  MISSION_GOALS,
  PARTS_BY_ID,
  PARTS_CATALOG,
} from '../data/partsCatalog';
import { PART_EXPLANATIONS } from '../data/partExplanations';
import {
  CameraPreset,
  MissionGoalId,
  PlacedPart,
  SpacecraftTelemetry,
  SubsystemCategory,
} from '../types/satellite';
import { PartIcon } from './PartIcon';

export type DockTab = 'parts' | 'warnings' | 'telemetry';

interface AssemblyDockProps {
  placedParts: PlacedPart[];
  telemetry: SpacecraftTelemetry;
  missionGoalId: MissionGoalId;
  activeSocketId: string | null;
  selectedCatalogPartId: string | null;
  activeTab: DockTab;
  onTabChange: (tab: DockTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  inOrbit: boolean;
  explodeAmount: number;
  onExplodeChange: (value: number) => void;
  deployed: boolean;
  onToggleDeployed: () => void;
  showOutlineOverlay: boolean;
  onToggleOutlineOverlay: () => void;
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
  onSelectCameraPreset: (preset: CameraPreset) => void;
  onChangeMissionGoal: (goalId: MissionGoalId) => void;
  onSelectCatalogPart: (partId: string | null) => void;
  onAddPart: (partId: string) => void;
  onRemovePart: (partId: string) => void;
  onHoverPart: (partId: string | null) => void;
  onInstallRecommended: (partId: string, socketId: string) => void;
  onLocateRecommended: (partId: string, socketId: string) => void;
}

const CATEGORIES: Array<{ id: 'all' | SubsystemCategory; label: string }> = [
  { id: 'all', label: 'All Parts' },
  { id: SubsystemCategory.BUS, label: CATEGORY_META[SubsystemCategory.BUS].shortLabel },
  { id: SubsystemCategory.POWER, label: CATEGORY_META[SubsystemCategory.POWER].shortLabel },
  {
    id: SubsystemCategory.PROPULSION,
    label: CATEGORY_META[SubsystemCategory.PROPULSION].shortLabel,
  },
  { id: SubsystemCategory.AVIONICS, label: CATEGORY_META[SubsystemCategory.AVIONICS].shortLabel },
  { id: SubsystemCategory.COMMS, label: CATEGORY_META[SubsystemCategory.COMMS].shortLabel },
  { id: SubsystemCategory.PAYLOAD, label: CATEGORY_META[SubsystemCategory.PAYLOAD].shortLabel },
  { id: SubsystemCategory.THERMAL, label: CATEGORY_META[SubsystemCategory.THERMAL].shortLabel },
];

export const AssemblyDock: React.FC<AssemblyDockProps> = ({
  placedParts,
  telemetry,
  missionGoalId,
  activeSocketId,
  selectedCatalogPartId,
  activeTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
  inOrbit,
  explodeAmount,
  onExplodeChange,
  deployed,
  onToggleDeployed,
  showOutlineOverlay,
  onToggleOutlineOverlay,
  autoRotate,
  onToggleAutoRotate,
  onSelectCameraPreset,
  onChangeMissionGoal,
  onSelectCatalogPart,
  onAddPart,
  onRemovePart,
  onHoverPart,
  onInstallRecommended,
  onLocateRecommended,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'all' | SubsystemCategory>('all');
  const [expandedWhyPart, setExpandedWhyPart] = useState<string | null>(null);
  const [hoveredCatalogPartId, setHoveredCatalogPartId] = useState<string | null>(null);

  const failingChecks = useMemo(
    () => telemetry.missionChecks.filter((c) => !c.passed),
    [telemetry.missionChecks]
  );

  const countByPartId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of placedParts) {
      map[p.partId] = (map[p.partId] ?? 0) + 1;
    }
    return map;
  }, [placedParts]);

  const activeSocketKind = useMemo(() => {
    if (!activeSocketId) return null;
    const busPlaced = placedParts.find(
      (p) => PARTS_BY_ID[p.partId]?.category === SubsystemCategory.BUS
    );
    const goal = MISSION_GOALS.find((g) => g.id === missionGoalId) ?? MISSION_GOALS[0];
    const busDef = busPlaced ? PARTS_BY_ID[busPlaced.partId] : PARTS_BY_ID[goal.blueprintBusId];
    return busDef?.busSockets?.find((s) => s.id === activeSocketId)?.kind ?? null;
  }, [activeSocketId, placedParts, missionGoalId]);

  const filteredParts = useMemo(() => {
    return PARTS_CATALOG.filter((part) => {
      if (categoryFilter !== 'all' && part.category !== categoryFilter) return false;
      return true;
    });
  }, [categoryFilter]);

  const hoveredCatalogPart = hoveredCatalogPartId
    ? PARTS_BY_ID[hoveredCatalogPartId]
    : null;
  const hoveredExplanation = hoveredCatalogPart
    ? PART_EXPLANATIONS[hoveredCatalogPart.id]
    : null;

  return (
    <>
    <div className="mobile-safe-dock fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-[min(1120px,95vw)] flex flex-col items-center pointer-events-none">
      {/* Collapse / Expand Handle */}
      <button
        type="button"
        onClick={onToggleCollapse}
        className="pointer-events-auto mb-1.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-t-lg border border-b-0 border-slate-700/80 bg-[#0D1320]/95 text-xs font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-400"
      >
        {isCollapsed ? (
          <>
            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Open Assembly Dock</span>
          </>
        ) : (
          <>
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Hide Controls</span>
          </>
        )}
      </button>

      {!isCollapsed && (
        <div className="pointer-events-auto w-full max-h-[min(68vh,620px)] overflow-auto tray-scroll rounded-xl border border-slate-800 bg-[#0B101B]/95 shadow-2xl">
          {/* Dock Header Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-800/90 bg-[#0F1625]">
            {/* Primary Tabs */}
            <div className="flex max-w-full shrink-0 items-center gap-1 overflow-x-auto tray-scroll rounded-lg border border-slate-800 bg-[#080C14] p-1">
              <button
                type="button"
                onClick={() => onTabChange('parts')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'parts'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Parts Catalog ({placedParts.length})
              </button>
              <button
                type="button"
                onClick={() => onTabChange('warnings')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'warnings'
                    ? 'bg-slate-800 text-white'
                    : failingChecks.length > 0
                      ? 'text-amber-300 hover:text-amber-200'
                      : 'text-emerald-400 hover:text-emerald-300'
                }`}
              >
                {failingChecks.length > 0 ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                )}
                <span>
                  {failingChecks.length > 0
                    ? `Warnings (${failingChecks.length})`
                    : 'Ready (0 Warnings)'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onTabChange('telemetry')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'telemetry'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Mission & Telemetry
              </button>
            </div>

            {/* Viewport & Camera Toolbar */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <div className="hidden md:flex items-center gap-1 border-r border-slate-800 pr-2.5">
                {[
                  { id: CameraPreset.ISO, label: 'Iso' },
                  { id: CameraPreset.FRONT, label: 'Front' },
                  { id: CameraPreset.TOP, label: 'Top' },
                  { id: CameraPreset.SIDE, label: 'Side' },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onSelectCameraPreset(preset.id)}
                    className="px-2 py-1 rounded text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors whitespace-nowrap shrink-0"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={onToggleDeployed}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                  deployed
                    ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                    : 'border-slate-700/80 text-slate-300 hover:text-white'
                }`}
              >
                {deployed ? (
                  <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>{deployed ? 'Deployed' : 'Folded'}</span>
              </button>

              <label className="flex items-center gap-2 text-slate-300">
                <span className="whitespace-nowrap">Explode</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(explodeAmount * 100)}
                  onChange={(e) => onExplodeChange(Number(e.target.value) / 100)}
                  aria-label="Exploded view separation"
                  className="w-16 accent-cyan-400 cursor-pointer"
                />
                <span className="font-mono-tabular w-8 text-right text-slate-400">
                  {Math.round(explodeAmount * 100)}%
                </span>
              </label>

              {!inOrbit && (
                <button
                  type="button"
                  onClick={onToggleOutlineOverlay}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                    showOutlineOverlay
                      ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                      : 'border-slate-700/80 text-slate-300 hover:text-white'
                  }`}
                >
                  {showOutlineOverlay ? (
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>Outline</span>
                </button>
              )}

              <button
                type="button"
                onClick={onToggleAutoRotate}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                  autoRotate
                    ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                    : 'border-slate-700/80 text-slate-300 hover:text-white'
                }`}
              >
                <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Orbit</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Parts Catalog */}
          {activeTab === 'parts' && (
            <div>
              {/* Category Filter Strip */}
              <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-slate-800/70 bg-[#0A0F1A] overflow-x-auto tray-scroll">
                <div className="flex items-center gap-1">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryFilter(cat.id)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        categoryFilter === cat.id
                          ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/35'
                          : 'text-slate-400 hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
                {activeSocketId && (
                  <span className="text-[11px] text-cyan-300 whitespace-nowrap shrink-0">
                    Targeting socket: {activeSocketId}
                  </span>
                )}
              </div>

              {/* Horizontal Parts Shelf */}
              <div
                className="p-3 overflow-x-auto overflow-y-hidden tray-scroll parts-shelf"
                aria-label="Satellite parts catalog"
                onWheel={(event) => {
                  if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
                    event.currentTarget.scrollLeft += event.deltaY;
                    event.preventDefault();
                  }
                }}
              >
                <div className="flex items-stretch gap-3 min-w-max">
                  {filteredParts.map((part) => {
                    const count = countByPartId[part.id] ?? 0;
                    const isBus = part.category === SubsystemCategory.BUS;
                    const isSelectedCatalog = selectedCatalogPartId === part.id;
                    const isWhyOpen = expandedWhyPart === part.id;
                    const socketCompatible =
                      !activeSocketKind ||
                      isBus ||
                      part.compatibleSockets.includes(activeSocketKind);

                    const statSpec =
                      part.powerGenW > 0
                        ? `+${part.powerGenW} W`
                        : part.batteryWh
                          ? `${part.batteryWh} Wh`
                          : part.dataRateMbps
                            ? `${part.dataRateMbps} Mbps`
                            : part.ispSec
                              ? `${part.ispSec} s Isp`
                              : part.thermalDissipationW
                                ? `-${part.thermalDissipationW} W heat`
                                : `-${part.powerDrawW} W`;

                    return (
                      <div
                        key={part.id}
                        onMouseEnter={() => {
                          onHoverPart(part.id);
                          setHoveredCatalogPartId(part.id);
                        }}
                        onMouseLeave={() => {
                          onHoverPart(null);
                          setHoveredCatalogPartId(null);
                        }}
                        onFocus={() => setHoveredCatalogPartId(part.id)}
                        onBlur={(event) => {
                          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                            setHoveredCatalogPartId(null);
                          }
                        }}
                        onClick={() => {
                          setHoveredCatalogPartId(part.id);
                          onSelectCatalogPart(isSelectedCatalog ? null : part.id);
                        }}
                        className={`w-[244px] flex flex-col justify-between rounded-lg border p-3 transition-colors cursor-pointer ${
                          isSelectedCatalog
                            ? 'border-cyan-400/70 bg-[#111C2D]'
                            : count > 0
                              ? 'border-emerald-500/35 bg-[#0D1A1E]'
                              : socketCompatible
                                ? 'border-slate-800 bg-[#0F1522] hover:border-slate-600'
                                : 'border-slate-800/60 bg-[#0B0F19] opacity-60'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                            <span className="truncate">
                              {CATEGORY_META[part.category].shortLabel} · {part.massKg} kg
                            </span>
                            <span
                              className={`font-mono-tabular font-semibold ${
                                count > 0 ? 'text-emerald-400' : 'text-slate-400'
                              }`}
                            >
                              {count} installed
                            </span>
                          </div>

                          <div className="mt-2 flex items-start gap-2.5">
                            <div className="h-8 w-8 rounded-md border border-slate-700/80 bg-[#090D16] flex items-center justify-center text-cyan-300 shrink-0">
                              <PartIcon
                                partId={part.id}
                                category={part.category}
                                className="w-5 h-5"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-1">
                                <h3 className="text-xs font-semibold text-white leading-snug">
                                  {part.shortName}
                                </h3>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedWhyPart(isWhyOpen ? null : part.id);
                                  }}
                                  aria-label={`Explain why ${part.name} is needed`}
                                  className="p-0.5 rounded text-slate-400 hover:text-cyan-300 shrink-0"
                                >
                                  <HelpCircle className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <p className="mt-1 text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                                {isWhyOpen ? CATEGORY_WHY_NEEDED[part.category] : part.description}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                          <span className="text-[11px] font-mono-tabular text-slate-300">
                            {statSpec}
                          </span>
                          <div
                            className="flex items-center gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              disabled={count === 0 || inOrbit}
                              onClick={() => onRemovePart(part.id)}
                              aria-label={`Remove ${part.shortName}`}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={inOrbit}
                              onClick={() => onAddPart(part.id)}
                              aria-label={`Add ${part.shortName}`}
                              className="h-8 px-2.5 inline-flex items-center gap-1 rounded-md text-xs font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap shrink-0"
                            >
                              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>{isBus && count > 0 ? 'Swap' : 'Add'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Missing Part Warnings */}
          {activeTab === 'warnings' && (
            <div className="max-h-60 overflow-y-auto tray-scroll p-3">
              {failingChecks.length === 0 ? (
                <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-4 py-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-white">
                      All Required Subsystems Installed
                    </p>
                    <p className="text-xs text-slate-300">
                      Zero missing-part warnings for this mission profile. Click Launch Satellite in
                      the top bar to deploy into orbit.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {failingChecks.map((check) => {
                    const recPart = check.recommendedPartId
                      ? PARTS_BY_ID[check.recommendedPartId]
                      : undefined;
                    const recSocket = check.recommendedSocketId ?? 'top_deck';

                    return (
                      <div
                        key={check.id}
                        onMouseEnter={() =>
                          onHoverPart(check.recommendedPartId ?? null)
                        }
                        onMouseLeave={() => onHoverPart(null)}
                        className="flex items-start justify-between gap-3 rounded-lg border border-amber-500/25 bg-[#121622] p-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-xs text-amber-300 font-medium">
                            <span>▲ {check.warningTitle}</span>
                            <span className="text-slate-400">· {check.detail}</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                            {check.whyNeeded}
                          </p>
                        </div>
                        {recPart && (
                          <div className="flex flex-col gap-1.5 shrink-0">
                            <button
                              type="button"
                              disabled={inOrbit}
                              onClick={() => onInstallRecommended(recPart.id, recSocket)}
                              className="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors whitespace-nowrap shrink-0"
                            >
                              + Add {recPart.shortName}
                            </button>
                            <button
                              type="button"
                              onClick={() => onLocateRecommended(recPart.id, recSocket)}
                              className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[11px] text-slate-300 border border-slate-700 hover:text-white hover:border-slate-500 transition-colors whitespace-nowrap shrink-0"
                            >
                              <Crosshair className="h-3 w-3" aria-hidden="true" />
                              <span>Locate</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Mission Profile & Engineering Telemetry */}
          {activeTab === 'telemetry' && (
            <div className="p-4 space-y-3">
              {/* Mission Goal Selector */}
              <div className="flex flex-wrap items-center gap-2">
                {MISSION_GOALS.map((goal) => (
                  <button
                    key={goal.id}
                    type="button"
                    disabled={inOrbit}
                    onClick={() => onChangeMissionGoal(goal.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                      missionGoalId === goal.id
                        ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-200'
                        : 'border-slate-800 bg-[#0E1422] text-slate-400 hover:text-white'
                    }`}
                  >
                    {goal.name} · {goal.orbitLabel}
                  </button>
                ))}
              </div>

              {/* Engineering Readouts */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                <div className="rounded-lg border border-slate-800 bg-[#0D1320] p-2.5">
                  <div className="text-[11px] text-slate-400">Wet Mass</div>
                  <div className="mt-0.5 text-sm font-semibold font-mono-tabular text-white">
                    {telemetry.wetMassKg} kg
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-[#0D1320] p-2.5">
                  <div className="text-[11px] text-slate-400">Net Power</div>
                  <div
                    className={`mt-0.5 text-sm font-semibold font-mono-tabular ${
                      telemetry.netPowerW >= 0 ? 'text-emerald-400' : 'text-amber-300'
                    }`}
                  >
                    {telemetry.netPowerW >= 0 ? '+' : ''}
                    {telemetry.netPowerW} W
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-[#0D1320] p-2.5">
                  <div className="text-[11px] text-slate-400">Battery Reserve</div>
                  <div className="mt-0.5 text-sm font-semibold font-mono-tabular text-white">
                    {telemetry.batteryWh} Wh
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-[#0D1320] p-2.5">
                  <div className="text-[11px] text-slate-400">Delta-V (Δv)</div>
                  <div className="mt-0.5 text-sm font-semibold font-mono-tabular text-white">
                    {telemetry.deltaV} m/s
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-[#0D1320] p-2.5">
                  <div className="text-[11px] text-slate-400">Downlink Rate</div>
                  <div className="mt-0.5 text-sm font-semibold font-mono-tabular text-white">
                    {telemetry.downlinkMbps} Mbps
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-[#0D1320] p-2.5">
                  <div className="text-[11px] text-slate-400">Center of Mass</div>
                  <div
                    className={`mt-0.5 text-sm font-semibold font-mono-tabular ${
                      telemetry.isBalanced ? 'text-emerald-400' : 'text-amber-300'
                    }`}
                  >
                    {telemetry.isBalanced ? 'Balanced' : 'Off-Axis'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>

    {activeTab === 'parts' && !isCollapsed && hoveredCatalogPart && hoveredExplanation && (
      <aside
        id="catalog-part-hover-details"
        role="tooltip"
        aria-live="polite"
        className="fixed right-3 top-24 z-40 w-[min(340px,calc(100vw-1.5rem))] rounded-xl border border-cyan-500/30 bg-[#0B1220]/[.97] p-3 sm:right-5 sm:p-4 xl:top-16 text-left shadow-2xl shadow-black/50 pointer-events-none"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-[#090D16] text-cyan-300">
            <PartIcon
              partId={hoveredCatalogPart.id}
              category={hoveredCatalogPart.category}
              className="h-5 w-5"
            />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.16em] text-cyan-300">
              {CATEGORY_META[hoveredCatalogPart.category].shortLabel}
            </p>
            <h3 className="mt-0.5 text-sm font-semibold text-white">
              {hoveredCatalogPart.name}
            </h3>
          </div>
        </div>

        <div className="mt-3 space-y-3">
          <section>
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              What it is
            </h4>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-200">
              {hoveredCatalogPart.description}
            </p>
          </section>
          <section>
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              What it does
            </h4>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-200">
              {hoveredExplanation.whatItDoes}
            </p>
          </section>
          <section className="rounded-lg border border-cyan-500/20 bg-cyan-500/[.07] p-2.5">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
              Simplified version
            </h4>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-100">
              {hoveredExplanation.simplified}
            </p>
          </section>
        </div>
      </aside>
    )}
    </>
  );
};
