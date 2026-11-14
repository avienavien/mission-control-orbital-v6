import React from 'react';
import { AlertTriangle, Crosshair, Plus, X } from 'lucide-react';
import { PARTS_BY_ID } from '../data/partsCatalog';
import { MissionCheckItem } from '../types/satellite';

interface MissingPartsWarningModalProps {
  isOpen: boolean;
  missionName: string;
  failingChecks: MissionCheckItem[];
  onClose: () => void;
  onContinueAnyway: () => void;
  onInstallRecommended: (partId: string, socketId: string) => void;
  onLocateRecommended: (partId: string, socketId: string) => void;
}

export const MissingPartsWarningModal: React.FC<MissingPartsWarningModalProps> = ({
  isOpen,
  missionName,
  failingChecks,
  onClose,
  onContinueAnyway,
  onInstallRecommended,
  onLocateRecommended,
}) => {
  if (!isOpen || failingChecks.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75"
      role="dialog"
      aria-modal="true"
      aria-labelledby="missing-parts-dialog-title"
    >
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl border border-amber-500/35 bg-[#0C111D] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-800 bg-[#111827]">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="missing-parts-dialog-title"
                className="text-lg font-semibold text-white tracking-tight"
              >
                {failingChecks.length} Mission Warning{failingChecks.length === 1 ? '' : 's'}{' '}
              </h2>
              <p className="mt-1 text-sm text-slate-300 leading-relaxed">
                For <span className="font-semibold text-white">{missionName}</span>, your satellite
                may not meet every mission requirement until the parts below are installed. You can
                add them now or continue to orbit selection with these warnings.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close warning dialog"
            className="shrink-0 rounded-lg p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Failing Checks List */}
        <div className="flex-1 overflow-y-auto tray-scroll divide-y divide-slate-800/80 px-6">
          {failingChecks.map((check) => {
            const recPart = check.recommendedPartId
              ? PARTS_BY_ID[check.recommendedPartId]
              : undefined;
            const recSocket = check.recommendedSocketId ?? 'top_deck';

            return (
              <div
                key={check.id}
                className="py-4 flex flex-col sm:flex-row sm:items-start gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-amber-300 font-medium">
                    <span>▲ {check.label}</span>
                    <span aria-hidden="true" className="text-slate-600">
                      ·
                    </span>
                    <span className="text-slate-400">{check.detail}</span>
                  </div>

                  <h3 className="mt-1 text-base font-semibold text-white">
                    {check.warningTitle}
                  </h3>

                  <p className="mt-1.5 text-sm text-slate-300 leading-relaxed">
                    <span className="font-medium text-slate-100">Why it is needed: </span>
                    {check.whyNeeded}
                  </p>
                </div>

                {recPart && (
                  <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 pt-1">
                    <button
                      type="button"
                      onClick={() => onInstallRecommended(recPart.id, recSocket)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-300"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Add {recPart.shortName}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onLocateRecommended(recPart.id, recSocket)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white transition-colors whitespace-nowrap shrink-0"
                    >
                      <Crosshair className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Locate Outline</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-slate-800 bg-[#0A0F1A]">
          <p className="text-xs text-slate-400">
            Install the recommended parts or continue to orbit selection with the current build.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-100 hover:bg-slate-700 transition-colors whitespace-nowrap"
            >
              Back to Assembly
            </button>
            <button
              type="button"
              onClick={onContinueAnyway}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-400 text-slate-950 hover:bg-amber-300 transition-colors whitespace-nowrap"
            >
              Continue with Warnings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
