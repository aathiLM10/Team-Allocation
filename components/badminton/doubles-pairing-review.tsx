'use client';

import React, { useState, useMemo } from 'react';
import { Participant } from '@/types/badminton';
import { DoublesPair } from '@/types/knockout';
import { TeamName, TEAM_NAMES } from '@/types/employee';
import {
  getDoublesPairingSummary,
  swapDoublesPartners,
  replaceDoublesPartnerWithUnpaired,
} from '@/lib/badminton/knockout-generator';
import {
  Users,
  Trophy,
  Shuffle,
  Lock,
  Unlock,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Edit2,
  HelpCircle,
  MapPin,
  Check,
  X,
} from 'lucide-react';

interface DoublesPairingReviewProps {
  participants: Participant[];
  doublesPairs: DoublesPair[];
  onDoublesPairsChange: (pairs: DoublesPair[]) => void;
  onRegeneratePairs: () => void;
  onConfirmAndGenerateFixtures: () => void;
  onBackToRoster: () => void;
}

export function DoublesPairingReview({
  participants,
  doublesPairs,
  onDoublesPairsChange,
  onRegeneratePairs,
  onConfirmAndGenerateFixtures,
  onBackToRoster,
}: DoublesPairingReviewProps) {
  // Compute pairing summary (pairs and unpaired per team)
  const summary = useMemo(() => {
    return getDoublesPairingSummary(participants, doublesPairs);
  }, [participants, doublesPairs]);

  // Modal / inline state for swapping partners
  const [swapModalState, setSwapModalState] = useState<{
    isOpen: boolean;
    sourcePairId: string;
    sourcePlayerNum: 1 | 2;
    sourcePlayerName: string;
    team: TeamName;
  } | null>(null);

  // Helper for Team color badges
  const getTeamBadge = (team: TeamName) => {
    switch (team) {
      case 'Blue Team':
        return 'bg-blue-600 text-white border-blue-700';
      case 'White Team':
        return 'bg-slate-200 text-slate-800 border-slate-300';
      case 'Red Team':
        return 'bg-rose-600 text-white border-rose-700';
      case 'Grey Team':
        return 'bg-slate-700 text-white border-slate-800';
      default:
        return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  };

  const getTeamHeaderBg = (team: TeamName) => {
    switch (team) {
      case 'Blue Team':
        return 'from-blue-600/10 to-indigo-600/10 border-blue-200 text-blue-900';
      case 'White Team':
        return 'from-slate-200/50 to-slate-100 border-slate-300 text-slate-900';
      case 'Red Team':
        return 'from-rose-600/10 to-orange-600/10 border-rose-200 text-rose-900';
      case 'Grey Team':
        return 'from-slate-700/10 to-slate-800/10 border-slate-300 text-slate-900';
      default:
        return 'from-slate-100 to-slate-50 border-slate-200 text-slate-800';
    }
  };

  // Toggle lock on single pair
  const handleToggleLock = (pairId: string) => {
    const updated = doublesPairs.map((p) =>
      p.id === pairId ? { ...p, isLocked: !p.isLocked } : p
    );
    onDoublesPairsChange(updated);
  };

  // Lock all pairs
  const handleLockAll = () => {
    const updated = doublesPairs.map((p) => ({ ...p, isLocked: true }));
    onDoublesPairsChange(updated);
  };

  // Unlock all pairs
  const handleUnlockAll = () => {
    const updated = doublesPairs.map((p) => ({ ...p, isLocked: false }));
    onDoublesPairsChange(updated);
  };

  // Handle Partner Swap confirmation
  const handleExecuteSwapWithPair = (targetPairId: string, targetPlayerNum: 1 | 2) => {
    if (!swapModalState) return;
    try {
      const updated = swapDoublesPartners(
        doublesPairs,
        swapModalState.sourcePairId,
        swapModalState.sourcePlayerNum,
        targetPairId,
        targetPlayerNum
      );
      onDoublesPairsChange(updated);
      setSwapModalState(null);
    } catch (e: any) {
      alert(e.message || 'Error swapping partners');
    }
  };

  // Handle swap with an unpaired player
  const handleExecuteSwapWithUnpaired = (unpairedParticipant: Participant) => {
    if (!swapModalState) return;
    try {
      const updated = replaceDoublesPartnerWithUnpaired(
        doublesPairs,
        swapModalState.sourcePairId,
        swapModalState.sourcePlayerNum,
        unpairedParticipant
      );
      onDoublesPairsChange(updated);
      setSwapModalState(null);
    } catch (e: any) {
      alert(e.message || 'Error assigning partner');
    }
  };

  const totalRegisteredDoubles = participants.filter((p) => p.doublesRegistered).length;
  const canGenerateBracket = doublesPairs.length >= 2;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Workflow Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToRoster}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Back to Employee Roster"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-purple-600 text-white shadow-xs">
                  <Users className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                    Doubles Partner Review &amp; Approval
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                      Step 1 of 2: Partnerships
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Eligible players have been randomly paired within their own team. Review pairs, lock approved teams, or swap partners before generating the knockout bracket.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Regenerate Unlocked Partners */}
            <button
              type="button"
              onClick={onRegeneratePairs}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors cursor-pointer"
              title="Randomly reshuffle and re-pair unlocked players within their teams"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Regenerate Partners</span>
            </button>

            {/* Lock / Unlock All */}
            {doublesPairs.some((p) => !p.isLocked) ? (
              <button
                type="button"
                onClick={handleLockAll}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                title="Lock all pairs so they won't change"
              >
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Lock All</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleUnlockAll}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                title="Unlock all pairs"
              >
                <Unlock className="w-3.5 h-3.5 text-slate-600" />
                <span>Unlock All</span>
              </button>
            )}

            {/* GENERATE DOUBLES FIXTURES CTA */}
            <button
              type="button"
              onClick={onConfirmAndGenerateFixtures}
              disabled={!canGenerateBracket}
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer ${
                canGenerateBracket
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-purple-600/20'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-300" />
              <span>Generate Doubles Knockout Fixtures ({doublesPairs.length} Pairs)</span>
            </button>
          </div>
        </div>

        {/* Compact Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Doubles Registered
            </span>
            <span className="text-lg font-extrabold text-slate-800">
              {totalRegisteredDoubles} Players
            </span>
          </div>

          <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200/80">
            <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
              Complete Pairs
            </span>
            <span className="text-lg font-extrabold text-purple-800">
              {doublesPairs.length} Pairs ({doublesPairs.length * 2} Players)
            </span>
          </div>

          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
              Approved &amp; Locked
            </span>
            <span className="text-lg font-extrabold text-amber-800">
              {doublesPairs.filter((p) => p.isLocked).length} Pairs
            </span>
          </div>

          <div className={`p-3 rounded-xl border ${
            summary.totalUnpairedCount > 0
              ? 'bg-rose-50/70 border-rose-200 text-rose-900'
              : 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
          }`}>
            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
              Unpaired Participants
            </span>
            <span className="text-lg font-extrabold">
              {summary.totalUnpairedCount === 0 ? '0 (All Paired)' : `${summary.totalUnpairedCount} Unpaired`}
            </span>
          </div>
        </div>

        {/* Odd Count Warning Banner */}
        {summary.totalUnpairedCount > 0 && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block">
                Odd participant counts detected in team rosters ({summary.totalUnpairedCount} player(s) unpaired)
              </span>
              <p className="text-amber-800 leading-relaxed text-[11px]">
                Doubles matches require exactly two players per side from the same team. You can generate the knockout bracket right now using the <strong>{doublesPairs.length} complete pairs</strong>, or edit partnerships below to swap players. Unpaired players will not be assigned into partial matches.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Team-by-Team Pairs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {TEAM_NAMES.map((team) => {
          const teamPairs = doublesPairs.filter((p) => p.team === team);
          const teamUnpaired = summary.unpairedByTeam.find((t) => t.team === team)?.unpaired || [];
          const teamEligibleCount = participants.filter((p) => p.team === team && p.doublesRegistered).length;

          return (
            <div
              key={team}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
            >
              {/* Team Card Header */}
              <div className={`px-4 py-3 bg-gradient-to-r border-b flex items-center justify-between ${getTeamHeaderBg(team)}`}>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold ${getTeamBadge(team)}`}>
                    {team}
                  </span>
                  <span className="text-xs font-bold text-slate-700">
                    {teamPairs.length} Pairs
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-slate-500">
                  {teamEligibleCount} eligible players
                </span>
              </div>

              {/* Team Pairs List */}
              <div className="p-4 space-y-2.5 flex-1">
                {teamPairs.length === 0 && teamUnpaired.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No Doubles players registered in {team}.
                  </div>
                ) : (
                  teamPairs.map((pair, idx) => (
                    <div
                      key={pair.id}
                      className={`p-3 rounded-xl border transition-all ${
                        pair.isLocked
                          ? 'border-amber-300 bg-amber-50/20 shadow-2xs'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {pair.id.replace('PAIR_', 'P')}
                          </span>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                            <span className="hover:text-blue-600 transition-colors">
                              {pair.player1.name}
                            </span>
                            <span className="text-[10px] font-semibold px-1 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {pair.player1.office}
                            </span>
                            <span className="text-purple-600 font-extrabold text-[11px]">+</span>
                            <span className="hover:text-blue-600 transition-colors">
                              {pair.player2.name}
                            </span>
                            <span className="text-[10px] font-semibold px-1 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {pair.player2.office}
                            </span>
                          </div>
                        </div>

                        {/* Pair Actions: Lock/Unlock & Swap */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setSwapModalState({
                                isOpen: true,
                                sourcePairId: pair.id,
                                sourcePlayerNum: 1,
                                sourcePlayerName: pair.player1.name,
                                team,
                              })
                            }
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer"
                            title="Swap or adjust partners within team"
                          >
                            <Shuffle className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleLock(pair.id)}
                            className={`p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                              pair.isLocked
                                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                : 'bg-slate-200/70 text-slate-500 hover:bg-slate-200'
                            }`}
                            title={pair.isLocked ? 'Pair is approved and locked' : 'Click to lock pair'}
                          >
                            {pair.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* Unpaired Player Notice for this Team */}
                {teamUnpaired.map((unpaired) => (
                  <div
                    key={unpaired.id}
                    className="p-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-200 text-amber-900 border border-amber-300">
                        UNPAIRED
                      </span>
                      <span className="font-bold text-slate-800">{unpaired.name}</span>
                      <span className="text-[10px] text-slate-500">({unpaired.office})</span>
                    </div>
                    <span className="text-[10px] text-amber-700 font-semibold italic">
                      Odd participant count
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Swap Partner Dialog Modal */}
      {swapModalState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <span>Swap Partner ({swapModalState.team})</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Select a partner from {swapModalState.team} to swap with <strong>{swapModalState.sourcePlayerName}</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSwapModalState(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Available Partners in {swapModalState.team}
              </span>

              {/* Other pairs in the same team */}
              {doublesPairs
                .filter((p) => p.team === swapModalState.team && p.id !== swapModalState.sourcePairId)
                .map((targetPair) => (
                  <div key={targetPair.id} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 block">
                      Pair {targetPair.id.replace('PAIR_', 'P')}
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleExecuteSwapWithPair(targetPair.id, 1)}
                        className="p-2 text-left bg-white border border-slate-200 hover:border-purple-500 rounded-lg text-xs font-bold text-slate-800 transition-colors cursor-pointer"
                      >
                        Swap with {targetPair.player1.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExecuteSwapWithPair(targetPair.id, 2)}
                        className="p-2 text-left bg-white border border-slate-200 hover:border-purple-500 rounded-lg text-xs font-bold text-slate-800 transition-colors cursor-pointer"
                      >
                        Swap with {targetPair.player2.name}
                      </button>
                    </div>
                  </div>
                ))}

              {/* Unpaired participants in the same team */}
              {(summary.unpairedByTeam.find((t) => t.team === swapModalState.team)?.unpaired || []).map(
                (unpaired) => (
                  <div
                    key={unpaired.id}
                    className="p-2.5 rounded-xl border border-amber-300 bg-amber-50/60 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-amber-800 block">Unpaired Player</span>
                      <span className="text-xs font-bold text-slate-900">{unpaired.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleExecuteSwapWithUnpaired(unpaired)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Assign Partner
                    </button>
                  </div>
                )
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 text-right">
              <button
                type="button"
                onClick={() => setSwapModalState(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
