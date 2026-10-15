'use client';

import React, { useState, useMemo } from 'react';
import { BadmintonFixture, MatchCategory, SchedulingSettings } from '@/types/fixture';
import { Participant } from '@/types/badminton';
import { TeamName, TEAM_NAMES } from '@/types/employee';
import {
  ScheduleMode,
  getComplementaryMatchup,
  autoShuffleFixtures,
  compareShuffles,
  AutoShuffleResult,
} from '@/lib/badminton/auto-shuffle';
import {
  Shuffle,
  Sparkles,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  Download,
  Users,
  User,
  Sliders,
  ArrowRight,
  Info,
} from 'lucide-react';

interface AutoFixtureControlProps {
  category: MatchCategory;
  participants: Participant[];
  fixtures: BadmintonFixture[];
  settings: SchedulingSettings;
  onFixturesGenerated: (newFixtures: BadmintonFixture[]) => void;
  onReset: () => void;
  onExport: () => void;
}

const PRESET_PAIRINGS: { a: TeamName; b: TeamName; label: string }[] = [
  { a: 'Blue Team', b: 'White Team', label: 'Blue vs White' },
  { a: 'Red Team', b: 'White Team', label: 'Red vs White' },
  { a: 'Blue Team', b: 'Red Team', label: 'Blue vs Red' },
  { a: 'White Team', b: 'Grey Team', label: 'White vs Grey' },
  { a: 'Red Team', b: 'Grey Team', label: 'Red vs Grey' },
  { a: 'Blue Team', b: 'Grey Team', label: 'Blue vs Grey' },
];

export function AutoFixtureControl({
  category,
  participants,
  fixtures,
  settings,
  onFixturesGenerated,
  onReset,
  onExport,
}: AutoFixtureControlProps) {
  // 1. Matchup Selection State
  const [teamA, setTeamA] = useState<TeamName>('Blue Team');
  const [teamB, setTeamB] = useState<TeamName>('White Team');

  // 2. Schedule Mode
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('round-robin');
  const [customRounds, setCustomRounds] = useState<number>(3);

  // 3. Timing & Court Settings
  const [startDate, setStartDate] = useState<string>(settings.defaultDate || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState<string>(settings.defaultTime || '10:00');
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // 4. Feedback & Shuffle Changes State
  const [lastShuffleResult, setLastShuffleResult] = useState<AutoShuffleResult | null>(null);
  const [movementLog, setMovementLog] = useState<{
    hasChanges: boolean;
    changedMatchesCount: number;
    changes: string[];
  } | null>(null);
  const [showMovementModal, setShowMovementModal] = useState(false);

  // Derive complementary matchup
  const complementaryMatchup = useMemo(() => {
    if (teamA === teamB) return null;
    try {
      return getComplementaryMatchup(teamA, teamB);
    } catch {
      return null;
    }
  }, [teamA, teamB]);

  // Check eligible participants for current category
  const eligibleParticipants = useMemo(() => {
    return participants.filter((p) =>
      category === 'Singles' ? p.singlesRegistered : p.doublesRegistered
    );
  }, [participants, category]);

  // Assigned players in existing fixtures of this category
  const assignedPlayerIds = useMemo(() => {
    const ids = new Set<string>();
    fixtures
      .filter((f) => f.category === category)
      .forEach((f) => {
        f.teamAPlayers.forEach((p) => ids.add(p.id));
        f.teamBPlayers.forEach((p) => ids.add(p.id));
      });
    return ids;
  }, [fixtures, category]);

  // Unassigned eligible players
  const unassignedParticipants = useMemo(() => {
    return eligibleParticipants.filter((p) => !assignedPlayerIds.has(p.id));
  }, [eligibleParticipants, assignedPlayerIds]);

  // Handle Team A Change
  const handleTeamAChange = (newA: TeamName) => {
    setTeamA(newA);
    if (newA === teamB) {
      // Pick another team for B
      const available = TEAM_NAMES.filter((t) => t !== newA);
      setTeamB(available[0]);
    }
  };

  // Handle Team B Change
  const handleTeamBChange = (newB: TeamName) => {
    setTeamB(newB);
    if (newB === teamA) {
      const available = TEAM_NAMES.filter((t) => t !== newB);
      setTeamA(available[0]);
    }
  };

  // Handle Quick Preset Click
  const handleApplyPreset = (presetA: TeamName, presetB: TeamName) => {
    setTeamA(presetA);
    setTeamB(presetB);
  };

  // Execute Automatic Fixture Generation
  const handleGenerate = (isReshuffle: boolean = false) => {
    const result = autoShuffleFixtures(
      participants,
      {
        category,
        firstTeamA: teamA,
        firstTeamB: teamB,
        scheduleMode,
        roundsCount: scheduleMode === 'multiple-rounds' ? customRounds : scheduleMode === 'round-robin' ? 3 : 1,
        startDate,
        startTime,
      },
      settings
    );

    setLastShuffleResult(result);

    if (result.success) {
      if (isReshuffle) {
        // Compare with previous fixtures of this category
        const prevCategoryFixtures = fixtures.filter((f) => f.category === category);
        const comparison = compareShuffles(prevCategoryFixtures, result.fixtures);
        setMovementLog(comparison);
        setShowMovementModal(true);
      } else {
        setMovementLog(null);
      }

      // Merge: keep opposite category fixtures, replace this category's fixtures
      const otherFixtures = fixtures.filter((f) => f.category !== category);
      onFixturesGenerated([...otherFixtures, ...result.fixtures]);
    }
  };

  // Team badges style helper
  const getTeamPill = (name: TeamName) => {
    switch (name) {
      case 'Blue Team':
        return 'bg-blue-600 text-white';
      case 'White Team':
        return 'bg-slate-200 text-slate-800 border border-slate-300';
      case 'Red Team':
        return 'bg-rose-600 text-white';
      case 'Grey Team':
        return 'bg-slate-700 text-white';
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Configuration Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-5">
        {/* Header with Title and Mode */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                Automatic {category} Fixture Generator
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Organizer-Controlled Matchups
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Select your opening matchup. The app automatically pairs the remaining teams and shuffles eligible players.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Reset all generated fixtures"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Step 1: Opening Team Matchup & Complementary Pair Preview */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
            1. First Matchup Selection (Round 1)
          </label>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Team A Dropdown */}
            <div className="md:col-span-5 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500">First Side (Team A)</span>
              <select
                value={teamA}
                onChange={(e) => handleTeamAChange(e.target.value as TeamName)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                {TEAM_NAMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* VS Badge */}
            <div className="md:col-span-2 text-center flex flex-col items-center justify-center pt-3">
              <span className="w-8 h-8 rounded-full bg-slate-900 text-white font-extrabold text-[11px] flex items-center justify-center shadow-xs">
                VS
              </span>
            </div>

            {/* Team B Dropdown */}
            <div className="md:col-span-5 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500">Second Side (Team B)</span>
              <select
                value={teamB}
                onChange={(e) => handleTeamBChange(e.target.value as TeamName)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                {TEAM_NAMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Presets Carousel / Pills */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">Quick Matchups:</span>
            {PRESET_PAIRINGS.map((p) => {
              const isSelected =
                (teamA === p.a && teamB === p.b) || (teamA === p.b && teamB === p.a);
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handleApplyPreset(p.a, p.b)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-2xs font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Complementary Matchup Live Banner */}
          {complementaryMatchup && (
            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs flex items-center justify-between gap-3 text-indigo-950">
              <div className="flex items-center gap-2">
                <span className="text-base">⚡</span>
                <span>
                  Complementary pairing automatically scheduled for Round 1:{' '}
                  <strong className="text-indigo-900 font-extrabold">
                    {complementaryMatchup[0]} vs {complementaryMatchup[1]}
                  </strong>
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-200/80 text-indigo-800">
                All 4 Teams Active
              </span>
            </div>
          )}
        </div>

        {/* Step 2: Schedule Mode Selection */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
            2. Schedule Structure &amp; Rounds
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* One Round */}
            <div
              onClick={() => setScheduleMode('one-round')}
              className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer space-y-1.5 ${
                scheduleMode === 'one-round'
                  ? 'border-blue-600 bg-blue-50/40 text-blue-900 shadow-2xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs">One Round Only</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                  2 Matches
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Runs your selected matchup and the complementary matchup concurrently in Round 1.
              </p>
            </div>

            {/* Complete Round Robin */}
            <div
              onClick={() => setScheduleMode('round-robin')}
              className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer space-y-1.5 ${
                scheduleMode === 'round-robin'
                  ? 'border-blue-600 bg-blue-50/40 text-blue-900 shadow-2xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs">Complete Round Robin</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-200 text-blue-800">
                  3 Rounds (6 Matches)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Generates all 6 unique matchups across 3 balanced rounds with zero repeated team pairings.
              </p>
            </div>

            {/* Multiple Rounds */}
            <div
              onClick={() => setScheduleMode('multiple-rounds')}
              className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer space-y-1.5 ${
                scheduleMode === 'multiple-rounds'
                  ? 'border-blue-600 bg-blue-50/40 text-blue-900 shadow-2xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs">Multiple Rounds</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                  Custom Count
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Specify any custom round count (e.g. 2, 4, or 5 rounds) with balanced rotations.
              </p>
            </div>
          </div>

          {/* Custom Round Count Input when Multiple Rounds selected */}
          {scheduleMode === 'multiple-rounds' && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3 text-xs">
              <span className="font-bold text-slate-700">Number of Rounds:</span>
              <input
                type="number"
                min={1}
                max={10}
                value={customRounds}
                onChange={(e) => setCustomRounds(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg font-bold text-center text-slate-800"
              />
              <span className="text-slate-500">
                (Will generate {customRounds * 2} total matches across {customRounds} rounds)
              </span>
            </div>
          )}
        </div>

        {/* Advanced Scheduling Settings Toggle */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{showAdvancedSettings ? 'Hide' : 'Show'} Date, Time &amp; Court Options</span>
            {showAdvancedSettings ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {showAdvancedSettings && (
            <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  Tournament Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  Starting Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Available Courts</label>
                <div className="text-slate-600 font-medium py-1.5">
                  {settings.courtNames.join(', ')} ({settings.courtNames.length} courts)
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Validation Errors or Warnings */}
        {lastShuffleResult && !lastShuffleResult.success && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5 text-xs text-rose-900">
            <div className="flex items-center gap-2 font-bold text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>Fixture Generation Incomplete</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-rose-700">
              {lastShuffleResult.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons: Generate & Reshuffle */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Eligible Pool:</span>
            <strong className="text-slate-800 font-bold">
              {eligibleParticipants.length} {category} participants
            </strong>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Generate Fixtures Button */}
            <button
              type="button"
              onClick={() => handleGenerate(false)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate {category} Fixtures</span>
            </button>

            {/* Shuffle Again Button */}
            <button
              type="button"
              onClick={() => handleGenerate(true)}
              disabled={fixtures.filter((f) => f.category === category).length === 0}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 font-bold text-xs rounded-xl border transition-all cursor-pointer ${
                fixtures.filter((f) => f.category === category).length === 0
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-white hover:bg-slate-50 text-indigo-700 border-indigo-200 shadow-2xs hover:border-indigo-300'
              }`}
              title="Preserve matchups and rounds, but randomize eligible player and partner assignments"
            >
              <Shuffle className="w-4 h-4 text-indigo-600" />
              <span>Shuffle Again</span>
            </button>
          </div>
        </div>
      </div>

      {/* Movement Log Modal after "Shuffle Again" */}
      {showMovementModal && movementLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
                  <Shuffle className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">
                    Shuffle Again Movement Summary
                  </h4>
                  <p className="text-xs text-slate-500">
                    {movementLog.hasChanges
                      ? `${movementLog.changedMatchesCount} match(es) received new player assignments`
                      : 'Same allocation maintained (pool limit reached)'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMovementModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 text-xs">
              {movementLog.hasChanges ? (
                movementLog.changes.map((change, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed font-mono text-[11px]"
                  >
                    {change}
                  </div>
                ))
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl leading-relaxed">
                  No other valid permutation of players could be generated without violating eligibility or fairness constraints.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowMovementModal(false)}
                className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unassigned Players Card */}
      {unassignedParticipants.length > 0 && fixtures.some((f) => f.category === category) && (
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              Unassigned Eligible {category} Players ({unassignedParticipants.length})
            </span>
            <span className="text-[10px] text-slate-500">
              Eligible players not scheduled in current round(s)
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {unassignedParticipants.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-medium text-slate-700 shadow-2xs"
              >
                <span className="font-bold">{p.name}</span>
                <span className="text-[10px] text-slate-400">({p.team.split(' ')[0]})</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
