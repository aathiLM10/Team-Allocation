'use client';

import React, { useState, useMemo } from 'react';
import {
  KnockoutBracket,
  KnockoutMatch,
  KnockoutRound,
  KnockoutParticipantEntry,
  DoublesPair,
} from '@/types/knockout';
import { Participant } from '@/types/badminton';
import { TeamName, TEAM_NAMES } from '@/types/employee';
import { MatchCategory, SchedulingSettings } from '@/types/fixture';
import {
  createKnockoutBracket,
  recordMatchResult,
  shuffleKnockoutBracket,
  resetKnockoutBracket,
  generateDoublesPairs,
} from '@/lib/badminton/knockout-generator';
import {
  downloadMasterKnockoutExcel,
  generateKnockoutBracketCSV,
  generateCompleteKnockoutCSV,
  generateMatchResultsCSV,
  generateChampionSummaryCSV,
} from '@/lib/export/knockout-export';
import { downloadCSV } from '@/lib/export/team-export';
import {
  downloadKnockoutFixtureListPDF,
  downloadCombinedKnockoutFixtureListPDF,
  printKnockoutFixtureList,
  printCombinedKnockoutFixtureList,
} from '@/lib/export/pdf-fixture-export';
import {
  Trophy,
  Sparkles,
  Shuffle,
  Lock,
  Unlock,
  RotateCcw,
  Download,
  Calendar,
  Clock,
  MapPin,
  ChevronRight,
  CheckCircle2,
  Users,
  User,
  AlertTriangle,
  PlayCircle,
  FileSpreadsheet,
  Award,
  Layers,
  Edit2,
  Check,
  Printer,
  FileDown,
  ArrowLeft,
  ChevronDown,
} from 'lucide-react';

interface KnockoutBracketViewProps {
  category: MatchCategory;
  participants: Participant[];
  doublesPairs: DoublesPair[];
  onDoublesPairsChange: (pairs: DoublesPair[]) => void;
  bracket: KnockoutBracket | null;
  onBracketChange: (bracket: KnockoutBracket | null) => void;
  otherCategoryBracket: KnockoutBracket | null;
  settings: SchedulingSettings;
  onBackToRoster?: () => void;
  onManagePartners?: () => void;
}

export function KnockoutBracketView({
  category,
  participants,
  doublesPairs,
  onDoublesPairsChange,
  bracket,
  onBracketChange,
  otherCategoryBracket,
  settings,
  onBackToRoster,
  onManagePartners,
}: KnockoutBracketViewProps) {
  // 1. Matchup Preferences
  const [firstTeamA, setFirstTeamA] = useState<TeamName>('Blue Team');
  const [firstTeamB, setFirstTeamB] = useState<TeamName>('White Team');

  // 2. View Mode: Visual Tree Bracket vs Fixture Table
  const [viewMode, setViewMode] = useState<'bracket' | 'table'>('bracket');

  // 3. Modals & Result Entry State
  const [activeMatchModal, setActiveMatchModal] = useState<KnockoutMatch | null>(null);
  const [selectedWinnerSide, setSelectedWinnerSide] = useState<'sideA' | 'sideB'>('sideA');
  const [scoreInput, setScoreInput] = useState<string>('21-18, 21-19');
  const [isWalkover, setIsWalkover] = useState<boolean>(false);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 4. Doubles Pair Manager Drawer
  const [showPairManager, setShowPairManager] = useState<boolean>(false);

  // Helper for Team color badges
  const getTeamBadge = (team?: TeamName) => {
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

  // Filter eligible participants for category
  const eligibleCount = useMemo(() => {
    return participants.filter((p) =>
      category === 'Singles' ? p.singlesRegistered : p.doublesRegistered
    ).length;
  }, [participants, category]);

  // Handle Generate Knockout Bracket
  const handleGenerateBracket = () => {
    setErrorMessage(null);
    try {
      let currentPairs = doublesPairs;
      if (category === 'Doubles' && doublesPairs.length === 0) {
        currentPairs = generateDoublesPairs(participants, []);
        onDoublesPairsChange(currentPairs);
      }

      const newBracket = createKnockoutBracket(
        category,
        participants,
        currentPairs,
        {
          category,
          firstTeamA,
          firstTeamB,
          startDate: settings.defaultDate,
          startTime: settings.defaultTime,
        },
        settings
      );
      onBracketChange(newBracket);
    } catch (e: any) {
      setErrorMessage(e.message || 'Error generating knockout bracket');
    }
  };

  // Handle Shuffle Bracket
  const handleShuffleBracket = () => {
    if (!bracket) return;
    if (bracket.hasStarted) {
      const confirmReset = window.confirm(
        'Warning: Matches have already started or results recorded. Shuffling will reset all recorded scores and progression. Do you want to proceed?'
      );
      if (!confirmReset) return;
    }

    setErrorMessage(null);
    try {
      const shuffled = shuffleKnockoutBracket(
        bracket,
        participants,
        doublesPairs,
        { category, firstTeamA, firstTeamB },
        settings
      );
      onBracketChange(shuffled);
    } catch (e: any) {
      setErrorMessage(e.message || 'Error shuffling bracket');
    }
  };

  // Handle Lock / Unlock
  const handleToggleLock = () => {
    if (!bracket) return;
    onBracketChange({
      ...bracket,
      isLocked: !bracket.isLocked,
      updatedAt: Date.now(),
    });
  };

  // Handle Reset Bracket
  const handleResetBracket = () => {
    if (!bracket) return;
    const confirmReset = window.confirm(
      'Reset all match results and scores back to the opening first-round state?'
    );
    if (!confirmReset) return;

    const reset = resetKnockoutBracket(bracket);
    onBracketChange(reset);
  };

  // Handle Open Result Entry Modal
  const handleOpenResultModal = (match: KnockoutMatch) => {
    if (bracket?.isLocked && match.status === 'Completed') {
      // Still allow viewing, or warn
    }
    if (!match.sideA.participant || !match.sideB.participant) {
      alert('Both sides must be determined before recording a match result.');
      return;
    }

    setActiveMatchModal(match);
    setSelectedWinnerSide(match.sideB.isWinner ? 'sideB' : 'sideA');
    setScoreInput(match.sideA.score || '21-18, 21-19');
    setIsWalkover(match.status === 'Walkover');
  };

  // Handle Save Match Result
  const handleSaveResult = () => {
    if (!bracket || !activeMatchModal) return;

    try {
      const updated = recordMatchResult(
        bracket,
        activeMatchModal.id,
        selectedWinnerSide,
        scoreInput.trim(),
        isWalkover
      );
      onBracketChange(updated);
      setActiveMatchModal(null);
    } catch (e: any) {
      alert(e.message || 'Error saving match result');
    }
  };

  // Toggle locked status for a Doubles pair
  const handleToggleLockPair = (pairId: string) => {
    const updated = doublesPairs.map((pair) =>
      pair.id === pairId ? { ...pair, isLocked: !pair.isLocked } : pair
    );
    onDoublesPairsChange(updated);
  };

  // Regenerate unlocked doubles pairs
  const handleRegeneratePairs = () => {
    const regenerated = generateDoublesPairs(participants, doublesPairs);
    onDoublesPairsChange(regenerated);
  };

  return (
    <div className="space-y-5">
      {/* Knockout Configuration & Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 space-y-4">
        {/* Top Header Row with Navigation & View Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-3">
            {onBackToRoster && (
              <button
                type="button"
                onClick={onBackToRoster}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                title="Return to Employee Roster"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Employee List</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-indigo-600 text-white shadow-xs">
                <Trophy className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  {category} Knockout Fixtures
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Single-Elimination
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  {category === 'Singles'
                    ? `${bracket?.totalParticipants || eligibleCount} Players`
                    : `${bracket?.totalParticipants || doublesPairs.length} Approved Pairs`}{' '}
                  • {bracket?.rounds.flatMap((r) => r.matches).length || 0} Matches
                </p>
              </div>
            </div>
          </div>

          {/* Right Badges & Navigation Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {category === 'Doubles' && onManagePartners && (
              <button
                type="button"
                onClick={onManagePartners}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors cursor-pointer"
                title="Review and adjust doubles partner pairings"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Review Partner Pairs</span>
              </button>
            )}

            {bracket && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                  bracket.isLocked
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                }`}
              >
                {bracket.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                {bracket.isLocked ? 'Bracket Locked' : 'Bracket Active'}
              </span>
            )}

            {/* View Switcher: Bracket vs Table */}
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('bracket')}
                className={`px-3 py-1 font-semibold rounded-md transition-all cursor-pointer ${
                  viewMode === 'bracket'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Visual Bracket
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 font-semibold rounded-md transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Fixture Table
              </button>
            </div>
          </div>
        </div>

        {/* Action Controls Row */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Left: Collapsible Secondary Matchup Settings */}
          <details className="group">
            <summary className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer flex items-center gap-1.5 select-none py-1">
              <span>Opening Matchup Preferences (Optional)</span>
              <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
            </summary>
            <div className="pt-2 flex items-center gap-2 flex-wrap text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200 mt-1">
              <span className="font-semibold text-slate-600">Opening:</span>
              <select
                value={firstTeamA}
                onChange={(e) => setFirstTeamA(e.target.value as TeamName)}
                className="px-2 py-1 bg-white border border-slate-300 rounded font-bold text-slate-800 text-xs"
              >
                {TEAM_NAMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <span className="font-bold text-slate-400">vs</span>
              <select
                value={firstTeamB}
                onChange={(e) => setFirstTeamB(e.target.value as TeamName)}
                className="px-2 py-1 bg-white border border-slate-300 rounded font-bold text-slate-800 text-xs"
              >
                {TEAM_NAMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </details>

          {/* Right: Primary Fixture Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Direct Download PDF Button (First-Class Export) */}
            {bracket && (
              <button
                type="button"
                onClick={() => {
                  downloadKnockoutFixtureListPDF(bracket, {
                    tournamentDate: settings.defaultDate,
                  });
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                title="Download clean printable A4 PDF fixture list for notice board"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Download Fixture List (PDF)</span>
              </button>
            )}

            {/* Direct Print Button (First-Class Export) */}
            {bracket && (
              <button
                type="button"
                onClick={() => {
                  printKnockoutFixtureList(bracket, {
                    tournamentDate: settings.defaultDate,
                  });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-2xs transition-colors cursor-pointer"
                title="Print clean fixture list for notice board"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>Print Fixture List</span>
              </button>
            )}

            {/* Regenerate Fixtures */}
            <button
              type="button"
              onClick={() => {
                if (bracket?.hasStarted) {
                  const confirmRegen = window.confirm(
                    'Match results have already been recorded. Regenerating the bracket will reset all recorded scores. Do you want to proceed?'
                  );
                  if (!confirmRegen) return;
                }
                handleGenerateBracket();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Regenerate Fixtures</span>
            </button>

            {/* Shuffle Button */}
            {bracket && (
              <button
                type="button"
                onClick={handleShuffleBracket}
                disabled={bracket.isLocked}
                className={`inline-flex items-center gap-1.5 px-3 py-2 font-bold text-xs rounded-xl border transition-all cursor-pointer ${
                  bracket.isLocked
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                }`}
                title="Shuffle player seedings in the bracket"
              >
                <Shuffle className="w-3.5 h-3.5 text-indigo-600" />
                <span>Shuffle</span>
              </button>
            )}

            {/* Lock / Unlock */}
            {bracket && (
              <button
                type="button"
                onClick={handleToggleLock}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                title={bracket.isLocked ? 'Unlock bracket' : 'Lock bracket to prevent accidental reshuffle'}
              >
                {bracket.isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                <span>{bracket.isLocked ? 'Unlock' : 'Lock'}</span>
              </button>
            )}

            {/* Reset Scores */}
            {bracket && (
              <button
                type="button"
                onClick={handleResetBracket}
                className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                title="Reset all recorded scores"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}

            {/* Export Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-2xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-100" />
                <span>Export</span>
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 text-xs animate-in fade-in zoom-in-95 duration-100 text-slate-800 divide-y divide-slate-100">
                  {/* PDF & Notice Board */}
                  <div className="py-1">
                    <div className="px-3 py-1 text-[10px] font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1">
                      <FileDown className="w-3 h-3" />
                      Notice Board &amp; PDF
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (bracket) {
                          downloadKnockoutFixtureListPDF(bracket, {
                            tournamentDate: settings.defaultDate,
                          });
                        }
                        setShowExportMenu(false);
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-rose-50 hover:text-rose-900 font-semibold flex items-center gap-2 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-rose-600" />
                      Download {category} Fixtures (PDF)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        downloadCombinedKnockoutFixtureListPDF(
                          category === 'Singles' ? bracket : otherCategoryBracket,
                          category === 'Doubles' ? bracket : otherCategoryBracket,
                          { tournamentDate: settings.defaultDate }
                        );
                        setShowExportMenu(false);
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-rose-50 hover:text-rose-900 font-semibold flex items-center gap-2 cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5 text-rose-600" />
                      Download Combined Tournament (PDF)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (bracket) {
                          printKnockoutFixtureList(bracket, {
                            tournamentDate: settings.defaultDate,
                          });
                        }
                        setShowExportMenu(false);
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-600" />
                      Print {category} Fixture List
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        printCombinedKnockoutFixtureList(
                          category === 'Singles' ? bracket : otherCategoryBracket,
                          category === 'Doubles' ? bracket : otherCategoryBracket,
                          { tournamentDate: settings.defaultDate }
                        );
                        setShowExportMenu(false);
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-indigo-600" />
                      Print Complete Tournament
                    </button>
                  </div>

                  {/* Excel Workbook */}
                  <div className="py-1">
                    <div className="px-3 py-1 text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                      <FileSpreadsheet className="w-3 h-3" />
                      Excel Workbook (.xlsx)
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        downloadMasterKnockoutExcel(
                          category === 'Singles' ? bracket : otherCategoryBracket,
                          category === 'Doubles' ? bracket : otherCategoryBracket,
                          participants,
                          doublesPairs
                        );
                        setShowExportMenu(false);
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-emerald-50 hover:text-emerald-900 font-semibold flex items-center gap-2 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600" />
                      Export Fixture List (Excel)
                    </button>
                  </div>

                  {/* CSV Exports */}
                  <div className="py-1">
                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      CSV Exports
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (bracket) {
                          downloadCSV(
                            generateKnockoutBracketCSV(bracket),
                            `badminton_${category.toLowerCase()}_knockout.csv`
                          );
                        }
                        setShowExportMenu(false);
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-500" />
                      Export Fixture List (CSV)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        downloadCSV(
                          generateCompleteKnockoutCSV(
                            category === 'Singles' ? bracket : otherCategoryBracket,
                            category === 'Doubles' ? bracket : otherCategoryBracket
                          ),
                          'badminton_complete_bracket.csv'
                        );
                        setShowExportMenu(false);
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-purple-500" />
                      Complete Bracket CSV
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        downloadCSV(
                          generateMatchResultsCSV(
                            category === 'Singles' ? bracket : otherCategoryBracket,
                            category === 'Doubles' ? bracket : otherCategoryBracket
                          ),
                          'badminton_match_results.csv'
                        );
                        setShowExportMenu(false);
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-500" />
                      Match Results CSV
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        downloadCSV(
                          generateChampionSummaryCSV(
                            category === 'Singles' ? bracket : otherCategoryBracket,
                            category === 'Doubles' ? bracket : otherCategoryBracket
                          ),
                          'badminton_champion_summary.csv'
                        );
                        setShowExportMenu(false);
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      Champion Summary CSV
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error message banner */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Doubles Pair Management Trigger (Doubles only) */}
        {category === 'Doubles' && (
          <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl flex items-center justify-between text-xs text-purple-950">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              <span>
                Configured Doubles Pairs: <strong>{doublesPairs.length} pairs</strong> ({doublesPairs.filter((p) => p.isLocked).length} approved &amp; locked)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowPairManager(!showPairManager)}
              className="text-xs font-bold text-purple-700 hover:text-purple-900 underline cursor-pointer"
            >
              {showPairManager ? 'Hide Pair Manager' : 'Manage Doubles Partner Pairs'}
            </button>
          </div>
        )}

        {/* Doubles Pair Manager Drawer */}
        {category === 'Doubles' && showPairManager && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-800 uppercase tracking-wider">
                Doubles Partner Pairs Review
              </h4>
              <button
                type="button"
                onClick={handleRegeneratePairs}
                className="px-3 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 cursor-pointer"
              >
                Auto-pair Unlocked Players
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {doublesPairs.map((pair) => (
                <div
                  key={pair.id}
                  className={`p-2.5 rounded-lg border bg-white flex items-center justify-between shadow-2xs ${
                    pair.isLocked ? 'border-amber-300 ring-1 ring-amber-100' : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-800">{pair.id}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${getTeamBadge(pair.team)}`}>
                        {pair.team}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 font-medium">
                      {pair.player1.name} + {pair.player2.name}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleLockPair(pair.id)}
                    className={`p-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                      pair.isLocked
                        ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    title={pair.isLocked ? 'Pair is approved and locked' : 'Click to lock pair'}
                  >
                    {pair.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Champion Banner when Tournament is Complete */}
      {bracket?.champion && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 text-slate-950 rounded-2xl p-6 shadow-xl border border-amber-300 flex items-center justify-between animate-in zoom-in-95 duration-200">
          <div className="flex items-center gap-4">
            <span className="w-14 h-14 rounded-2xl bg-white/30 backdrop-blur-xs flex items-center justify-center text-3xl shadow-inner">
              🏆
            </span>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-950/80 bg-amber-200/60 px-2 py-0.5 rounded-full inline-block">
                Tournament Winner Declared
              </span>
              <h3 className="text-xl font-black tracking-tight text-slate-950">
                {bracket.champion.displayName}
              </h3>
              <p className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <span>Team: {bracket.champion.team}</span>
                <span>•</span>
                <span>Category: Badminton {category} Knockout</span>
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-block px-4 py-2 rounded-xl bg-white/40 backdrop-blur-xs font-black text-xs text-amber-950 uppercase tracking-wider">
            Champion
          </span>
        </div>
      )}

      {/* VISUAL BRACKET VIEW */}
      {bracket && viewMode === 'bracket' && (
        <div className="bg-slate-900 rounded-2xl p-6 shadow-inner border border-slate-800 overflow-x-auto">
          <div className="flex items-start gap-8 min-w-max pb-4">
            {bracket.rounds.map((round) => (
              <div key={round.roundIndex} className="w-72 shrink-0 space-y-4">
                {/* Round Header */}
                <div className="bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-center">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
                    {round.roundName}
                  </h4>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {round.matches.length} {round.matches.length === 1 ? 'Match' : 'Matches'}
                  </span>
                </div>

                {/* Match Cards in Round */}
                <div className="space-y-6">
                  {round.matches.map((match) => {
                    const isSideAWinner = match.sideA.isWinner;
                    const isSideBWinner = match.sideB.isWinner;
                    const canEnterResult =
                      Boolean(match.sideA.participant && match.sideB.participant) &&
                      !match.isByeMatch;

                    return (
                      <div
                        key={match.id}
                        className={`rounded-xl border transition-all duration-150 overflow-hidden shadow-lg ${
                          match.status === 'Completed' || match.status === 'Walkover'
                            ? 'bg-slate-800 border-slate-700'
                            : match.status === 'Bye'
                            ? 'bg-slate-800/50 border-slate-700/60'
                            : 'bg-slate-800/90 border-slate-600 hover:border-blue-500'
                        }`}
                      >
                        {/* Match Header */}
                        <div className="px-3 py-1.5 bg-slate-950/60 border-b border-slate-700/50 flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-300">
                              {match.id}
                            </span>
                            <span className="text-slate-500">•</span>
                            <span className="text-slate-400">{match.court}</span>
                          </div>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              match.status === 'Completed'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : match.status === 'Bye'
                                ? 'bg-blue-500/20 text-blue-300'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {match.status}
                          </span>
                        </div>

                        {/* Side A */}
                        <div
                          className={`p-3 border-b border-slate-700/50 flex items-center justify-between gap-2 ${
                            isSideAWinner
                              ? 'bg-emerald-500/10 font-bold text-emerald-300'
                              : 'text-slate-200'
                          }`}
                        >
                          <div className="space-y-0.5 truncate flex-1">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-xs truncate">
                                {match.sideA.participant
                                  ? match.sideA.participant.displayName
                                  : match.sideA.placeholderText || 'TBD'}
                              </span>
                              {isSideAWinner && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              )}
                            </div>
                            {match.sideA.participant && (
                              <span
                                className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-extrabold ${getTeamBadge(
                                  match.sideA.participant.team
                                )}`}
                              >
                                {match.sideA.participant.team}
                              </span>
                            )}
                          </div>
                          {match.sideA.score && (
                            <span className="text-[11px] font-mono font-bold text-slate-300 shrink-0">
                              {match.sideA.score}
                            </span>
                          )}
                        </div>

                        {/* Side B */}
                        <div
                          className={`p-3 flex items-center justify-between gap-2 ${
                            isSideBWinner
                              ? 'bg-emerald-500/10 font-bold text-emerald-300'
                              : 'text-slate-200'
                          }`}
                        >
                          <div className="space-y-0.5 truncate flex-1">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-xs truncate">
                                {match.sideB.participant
                                  ? match.sideB.participant.displayName
                                  : match.sideB.placeholderText || 'TBD'}
                              </span>
                              {isSideBWinner && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              )}
                            </div>
                            {match.sideB.participant && (
                              <span
                                className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-extrabold ${getTeamBadge(
                                  match.sideB.participant.team
                                )}`}
                              >
                                {match.sideB.participant.team}
                              </span>
                            )}
                          </div>
                          {match.sideB.score && (
                            <span className="text-[11px] font-mono font-bold text-slate-300 shrink-0">
                              {match.sideB.score}
                            </span>
                          )}
                        </div>

                        {/* Match Footer & Action Button */}
                        <div className="px-3 py-2 bg-slate-950/40 border-t border-slate-700/50 flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 font-mono text-[10px]">
                            {match.scheduledTime}
                          </span>
                          {canEnterResult && (
                            <button
                              type="button"
                              onClick={() => handleOpenResultModal(match)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer"
                            >
                              <PlayCircle className="w-3 h-3" />
                              <span>{match.winnerId ? 'Edit Result' : 'Enter Result'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FIXTURE TABLE VIEW */}
      {bracket && viewMode === 'table' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <th className="py-3 px-3">Match</th>
                <th className="py-3 px-3">Round</th>
                <th className="py-3 px-3">Side A</th>
                <th className="py-3 px-2">Team A</th>
                <th className="py-3 px-1 text-center">VS</th>
                <th className="py-3 px-3">Side B</th>
                <th className="py-3 px-2">Team B</th>
                <th className="py-3 px-2">Score</th>
                <th className="py-3 px-3">Winner</th>
                <th className="py-3 px-2">Status</th>
                <th className="py-3 px-2">Court</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bracket.rounds.map((round) => (
                <React.Fragment key={round.roundIndex}>
                  <tr className="bg-slate-100/80 font-extrabold text-slate-800 text-[11px]">
                    <td colSpan={12} className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{round.roundName}</span>
                        <span className="text-[10px] font-semibold text-slate-500">
                          ({round.matches.length} matches)
                        </span>
                      </div>
                    </td>
                  </tr>
                  {round.matches.map((match) => {
                    const sideAName = match.sideA.participant?.displayName || match.sideA.placeholderText || 'TBD';
                    const sideBName = match.sideB.participant?.displayName || match.sideB.placeholderText || 'TBD';
                    const winnerName = match.winnerId ? (match.sideA.isWinner ? sideAName : sideBName) : '-';

                    return (
                      <tr key={match.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{match.id}</td>
                        <td className="py-2.5 px-3 text-slate-600 font-medium">{match.roundName}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{sideAName}</td>
                        <td className="py-2.5 px-2">
                          {match.sideA.participant && (
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${getTeamBadge(match.sideA.participant.team)}`}>
                              {match.sideA.participant.team.split(' ')[0]}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-1 text-center font-bold text-slate-400 text-[10px]">VS</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{sideBName}</td>
                        <td className="py-2.5 px-2">
                          {match.sideB.participant && (
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${getTeamBadge(match.sideB.participant.team)}`}>
                              {match.sideB.participant.team.split(' ')[0]}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 font-mono text-slate-600">{match.sideA.score || '-'}</td>
                        <td className="py-2.5 px-3 font-bold text-emerald-700">{winnerName}</td>
                        <td className="py-2.5 px-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              match.status === 'Completed'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {match.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-slate-600">{match.court}</td>
                        <td className="py-2.5 px-3 text-right">
                          {match.sideA.participant && match.sideB.participant && !match.isByeMatch && (
                            <button
                              type="button"
                              onClick={() => handleOpenResultModal(match)}
                              className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md cursor-pointer"
                            >
                              Result
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State when Bracket Not Generated */}
      {!bracket && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-2xl font-bold shadow-xs">
            🏸
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              No {category} Knockout Bracket Generated Yet
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Click &quot;Generate Knockout Bracket&quot; above to automatically create the complete single-elimination tournament bracket from the registered participants.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerateBracket}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors inline-flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate {category} Bracket</span>
          </button>
        </div>
      )}

      {/* Result Entry Modal */}
      {activeMatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <span>Record Match Result</span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {activeMatchModal.id} ({activeMatchModal.roundName})
                  </span>
                </h4>
                <p className="text-xs text-slate-500">
                  Select the winner to automatically advance them to the next round.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveMatchModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Winner Selection Radio Cards */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Select Winning Side
              </label>

              {/* Side A Card */}
              <div
                onClick={() => setSelectedWinnerSide('sideA')}
                className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                  selectedWinnerSide === 'sideA'
                    ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 font-bold shadow-2xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 block">Side A</span>
                  <div className="text-xs font-extrabold">
                    {activeMatchModal.sideA.participant?.displayName}
                  </div>
                  <span
                    className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-extrabold ${getTeamBadge(
                      activeMatchModal.sideA.participant?.team
                    )}`}
                  >
                    {activeMatchModal.sideA.participant?.team}
                  </span>
                </div>
                {selectedWinnerSide === 'sideA' && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                )}
              </div>

              {/* Side B Card */}
              <div
                onClick={() => setSelectedWinnerSide('sideB')}
                className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                  selectedWinnerSide === 'sideB'
                    ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 font-bold shadow-2xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 block">Side B</span>
                  <div className="text-xs font-extrabold">
                    {activeMatchModal.sideB.participant?.displayName}
                  </div>
                  <span
                    className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-extrabold ${getTeamBadge(
                      activeMatchModal.sideB.participant?.team
                    )}`}
                  >
                    {activeMatchModal.sideB.participant?.team}
                  </span>
                </div>
                {selectedWinnerSide === 'sideB' && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                )}
              </div>
            </div>

            {/* Score Input */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Match Score / Sets
              </label>
              <input
                type="text"
                placeholder="e.g. 21-18, 21-19"
                value={scoreInput}
                onChange={(e) => setScoreInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-800"
              />
            </div>

            {/* Walkover Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="walkoverCheck"
                checked={isWalkover}
                onChange={(e) => setIsWalkover(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded cursor-pointer"
              />
              <label htmlFor="walkoverCheck" className="text-xs text-slate-700 cursor-pointer">
                Conceded / Walkover Result
              </label>
            </div>

            {/* Next round preview */}
            {activeMatchModal.nextMatchId && (
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-1.5">
                <ChevronRight className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Winner will advance directly to <strong>{activeMatchModal.nextMatchId}</strong>
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveMatchModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveResult}
                className="px-5 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Confirm &amp; Advance Winner
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
