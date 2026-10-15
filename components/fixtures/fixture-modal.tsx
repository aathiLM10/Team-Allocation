'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  BadmintonFixture,
  FixtureDraft,
  MatchCategory,
  MatchStatus,
  SchedulingSettings,
} from '@/types/fixture';
import { TeamAllocation, TeamName, Employee } from '@/types/employee';
import {
  validateDraftFixture,
  generateNextMatchId,
  suggestDoublesPartners,
} from '@/lib/fixtures/fixture-validation';
import {
  X,
  Check,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  Users,
  User,
  Plus,
  Clock,
  MapPin,
  Calendar,
  Layers,
} from 'lucide-react';

interface FixtureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveFixture: (fixture: BadmintonFixture, addAnother?: boolean) => void;
  initialFixture?: BadmintonFixture | null;
  isDuplicate?: boolean;
  existingFixtures: BadmintonFixture[];
  allocations: TeamAllocation[];
  settings: SchedulingSettings;
  defaultCategory?: MatchCategory;
}

export function FixtureModal({
  isOpen,
  onClose,
  onSaveFixture,
  initialFixture,
  isDuplicate = false,
  existingFixtures,
  allocations,
  settings,
  defaultCategory = 'Singles',
}: FixtureModalProps) {
  const [category, setCategory] = useState<MatchCategory>(defaultCategory);
  const [matchId, setMatchId] = useState<string>('');
  const [teamA, setTeamA] = useState<TeamName | ''>('White Team');
  const [teamB, setTeamB] = useState<TeamName | ''>('Red Team');
  const [teamAPlayerIds, setTeamAPlayerIds] = useState<string[]>([]);
  const [teamBPlayerIds, setTeamBPlayerIds] = useState<string[]>([]);
  const [court, setCourt] = useState<string>(settings.courtNames[0] || 'Court 1');
  const [scheduledDate, setScheduledDate] = useState<string>(settings.defaultDate);
  const [scheduledTime, setScheduledTime] = useState<string>(settings.defaultTime);
  const [round, setRound] = useState<string>(settings.defaultRound);
  const [status, setStatus] = useState<MatchStatus>('Scheduled');
  const [notes, setNotes] = useState<string>('');
  const [autoPairNotice, setAutoPairNotice] = useState<string | null>(null);

  // Initialize or reset form state when modal opens or initialFixture changes
  useEffect(() => {
    if (!isOpen) return;

    if (initialFixture) {
      setCategory(initialFixture.category);
      setMatchId(isDuplicate ? generateNextMatchId(existingFixtures) : initialFixture.id);
      setTeamA(initialFixture.teamA);
      setTeamB(initialFixture.teamB);
      setTeamAPlayerIds(initialFixture.teamAPlayers.map((p) => p.id));
      setTeamBPlayerIds(initialFixture.teamBPlayers.map((p) => p.id));
      setCourt(initialFixture.court);
      setScheduledDate(initialFixture.scheduledDate);
      setScheduledTime(initialFixture.scheduledTime);
      setRound(initialFixture.round);
      setStatus(isDuplicate ? 'Scheduled' : initialFixture.status);
      setNotes(initialFixture.notes || '');
    } else {
      // New Fixture
      setCategory(defaultCategory);
      setMatchId(generateNextMatchId(existingFixtures));
      setTeamA('White Team');
      setTeamB('Red Team');
      setTeamAPlayerIds([]);
      setTeamBPlayerIds([]);
      setCourt(settings.courtNames[0] || 'Court 1');
      setScheduledDate(settings.defaultDate);
      setScheduledTime(settings.defaultTime);
      setRound(settings.defaultRound);
      setStatus('Scheduled');
      setNotes('');
    }
    setAutoPairNotice(null);
  }, [isOpen, initialFixture, isDuplicate, defaultCategory, existingFixtures, settings]);

  // Adjust player selections when category changes (Singles = 1, Doubles = 2)
  const handleCategoryChange = (newCat: MatchCategory) => {
    setCategory(newCat);
    if (newCat === 'Singles') {
      if (teamAPlayerIds.length > 1) setTeamAPlayerIds([teamAPlayerIds[0]]);
      if (teamBPlayerIds.length > 1) setTeamBPlayerIds([teamBPlayerIds[0]]);
    }
  };

  // Team rosters from allocations
  const teamAMembers = useMemo(() => {
    return allocations.find((t) => t.teamName === teamA)?.members || [];
  }, [allocations, teamA]);

  const teamBMembers = useMemo(() => {
    return allocations.find((t) => t.teamName === teamB)?.members || [];
  }, [allocations, teamB]);

  // Handle Team A change: clear players and ensure Team B != Team A
  const handleTeamAChange = (newTeamA: TeamName) => {
    setTeamA(newTeamA);
    setTeamAPlayerIds([]);
    if (teamB === newTeamA) {
      // Pick another team for Team B
      const candidate = (['White Team', 'Red Team', 'Blue Team', 'Grey Team'] as TeamName[]).find(
        (t) => t !== newTeamA
      );
      if (candidate) {
        setTeamB(candidate);
        setTeamBPlayerIds([]);
      }
    }
  };

  // Handle Team B change: clear players
  const handleTeamBChange = (newTeamB: TeamName) => {
    setTeamB(newTeamB);
    setTeamBPlayerIds([]);
  };

  // Current draft object for validation
  const currentDraft: FixtureDraft = useMemo(() => {
    return {
      id: isDuplicate ? undefined : initialFixture?.id,
      category,
      teamA,
      teamAPlayerIds,
      teamB,
      teamBPlayerIds,
      court,
      scheduledDate,
      scheduledTime,
      round,
      status,
      notes,
    };
  }, [
    isDuplicate,
    initialFixture?.id,
    category,
    teamA,
    teamAPlayerIds,
    teamB,
    teamBPlayerIds,
    court,
    scheduledDate,
    scheduledTime,
    round,
    status,
    notes,
  ]);

  // Run live validation
  const validationReport = useMemo(() => {
    return validateDraftFixture(currentDraft, existingFixtures, allocations, settings);
  }, [currentDraft, existingFixtures, allocations, settings]);

  // Auto-pair partners action for Doubles
  const handleAutoPair = (teamSide: 'A' | 'B') => {
    const selectedTeam = teamSide === 'A' ? teamA : teamB;
    if (!selectedTeam) return;

    const pair = suggestDoublesPartners(selectedTeam, allocations, existingFixtures);
    if (pair) {
      if (teamSide === 'A') {
        setTeamAPlayerIds([pair[0].id, pair[1].id]);
        setAutoPairNotice(`Suggested ${pair[0].name} + ${pair[1].name} for ${selectedTeam}.`);
      } else {
        setTeamBPlayerIds([pair[0].id, pair[1].id]);
        setAutoPairNotice(`Suggested ${pair[0].name} + ${pair[1].name} for ${selectedTeam}.`);
      }
    } else {
      setAutoPairNotice(`Unable to auto-pair: ${selectedTeam} has fewer than 2 available players.`);
    }
  };

  // Save handler
  const handleSave = (addAnother: boolean = false) => {
    if (!validationReport.isValid) return;

    const finalTeamAPlayers = teamAPlayerIds
      .map((id) => teamAMembers.find((m) => m.id === id))
      .filter((m): m is Employee => !!m);

    const finalTeamBPlayers = teamBPlayerIds
      .map((id) => teamBMembers.find((m) => m.id === id))
      .filter((m): m is Employee => !!m);

    const fixtureToSave: BadmintonFixture = {
      id: matchId || generateNextMatchId(existingFixtures),
      category,
      teamA: teamA as TeamName,
      teamAPlayers: finalTeamAPlayers,
      teamB: teamB as TeamName,
      teamBPlayers: finalTeamBPlayers,
      court,
      scheduledDate,
      scheduledTime,
      round,
      status,
      notes,
      createdAt: initialFixture && !isDuplicate ? initialFixture.createdAt : Date.now(),
      updatedAt: Date.now(),
    };

    onSaveFixture(fixtureToSave, addAnother);

    if (addAnother) {
      // Clear players and advance match ID for next entry
      setMatchId(generateNextMatchId([...existingFixtures, fixtureToSave]));
      setTeamAPlayerIds([]);
      setTeamBPlayerIds([]);
      setAutoPairNotice('Saved! Ready to configure next fixture.');
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  const teamColors: Record<TeamName, { bg: string; text: string; badge: string }> = {
    'White Team': { bg: 'bg-slate-100', text: 'text-slate-800', badge: 'bg-white text-slate-800 border-slate-300' },
    'Red Team': { bg: 'bg-rose-50', text: 'text-rose-700', badge: 'bg-rose-500 text-white border-rose-600' },
    'Blue Team': { bg: 'bg-blue-50', text: 'text-blue-700', badge: 'bg-blue-600 text-white border-blue-700' },
    'Grey Team': { bg: 'bg-slate-200', text: 'text-slate-700', badge: 'bg-slate-700 text-white border-slate-800' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              🏸
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {initialFixture && !isDuplicate ? `Edit Fixture ${initialFixture.id}` : isDuplicate ? `Duplicate Match as ${matchId}` : 'Create Badminton Fixture'}
              </h3>
              <p className="text-xs text-slate-500">
                Configure opposing teams, player assignments, and court schedule
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
          {/* Top Bar: Category Switch & Match ID */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Category:</span>
              <div className="inline-flex rounded-lg p-1 bg-slate-200/80 border border-slate-300/80">
                <button
                  type="button"
                  onClick={() => handleCategoryChange('Singles')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                    category === 'Singles'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  Singles
                </button>
                <button
                  type="button"
                  onClick={() => handleCategoryChange('Doubles')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                    category === 'Doubles'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  Doubles
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Match ID:</span>
              <input
                type="text"
                value={matchId}
                onChange={(e) => setMatchId(e.target.value)}
                className="w-24 px-2.5 py-1 font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg text-center"
              />
            </div>
          </div>

          {/* Opposing Teams Configuration Container */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ----------------- TEAM A ----------------- */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Team A Side
                </label>
                {category === 'Doubles' && (
                  <button
                    type="button"
                    onClick={() => handleAutoPair('A')}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200 transition-colors cursor-pointer"
                    title="Auto-pair 2 players from this team roster"
                  >
                    <Sparkles className="w-3 h-3 text-purple-500" />
                    Auto-pair
                  </button>
                )}
              </div>

              {/* Team A Selector */}
              <div>
                <select
                  value={teamA}
                  onChange={(e) => handleTeamAChange(e.target.value as TeamName)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 text-xs focus:ring-1 focus:ring-blue-500"
                >
                  <option value="White Team">White Team</option>
                  <option value="Red Team">Red Team</option>
                  <option value="Blue Team">Blue Team</option>
                  <option value="Grey Team">Grey Team</option>
                </select>
              </div>

              {/* Player 1 Selection */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 block">
                  {category === 'Singles' ? 'Singles Player:' : 'Partner 1:'}
                </label>
                <select
                  value={teamAPlayerIds[0] || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTeamAPlayerIds((prev) => [val, ...(prev.slice(1))].filter(Boolean));
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs"
                >
                  <option value="">-- Choose {teamA} Player --</option>
                  {teamAMembers.map((m) => (
                    <option
                      key={m.id}
                      value={m.id}
                      disabled={teamAPlayerIds[1] === m.id || teamBPlayerIds.includes(m.id)}
                    >
                      {m.name} ({m.gender}, {m.office})
                    </option>
                  ))}
                </select>
              </div>

              {/* Partner 2 Selection for Doubles */}
              {category === 'Doubles' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 block">Partner 2:</label>
                  <select
                    value={teamAPlayerIds[1] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTeamAPlayerIds((prev) => [prev[0] || '', val].filter(Boolean));
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs"
                  >
                    <option value="">-- Choose Second Partner --</option>
                    {teamAMembers.map((m) => (
                      <option
                        key={m.id}
                        value={m.id}
                        disabled={teamAPlayerIds[0] === m.id || teamBPlayerIds.includes(m.id)}
                      >
                        {m.name} ({m.gender}, {m.office})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* ----------------- TEAM B ----------------- */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Team B Side (Opponent)
                </label>
                {category === 'Doubles' && (
                  <button
                    type="button"
                    onClick={() => handleAutoPair('B')}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200 transition-colors cursor-pointer"
                    title="Auto-pair 2 players from this team roster"
                  >
                    <Sparkles className="w-3 h-3 text-purple-500" />
                    Auto-pair
                  </button>
                )}
              </div>

              {/* Team B Selector */}
              <div>
                <select
                  value={teamB}
                  onChange={(e) => handleTeamBChange(e.target.value as TeamName)}
                  className={`w-full px-3 py-2 bg-white border rounded-lg font-bold text-xs focus:ring-1 ${
                    teamA === teamB
                      ? 'border-rose-400 text-rose-700 ring-rose-300'
                      : 'border-slate-300 text-slate-900 ring-blue-500'
                  }`}
                >
                  {(['White Team', 'Red Team', 'Blue Team', 'Grey Team'] as TeamName[]).map((t) => (
                    <option key={t} value={t} disabled={t === teamA}>
                      {t} {t === teamA ? '(Cannot play same team)' : ''}
                    </option>
                  ))}
                </select>
                {teamA === teamB && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">
                    Opponents must belong to different teams!
                  </p>
                )}
              </div>

              {/* Player 1 Selection */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 block">
                  {category === 'Singles' ? 'Singles Player:' : 'Partner 1:'}
                </label>
                <select
                  value={teamBPlayerIds[0] || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTeamBPlayerIds((prev) => [val, ...(prev.slice(1))].filter(Boolean));
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs"
                >
                  <option value="">-- Choose {teamB} Player --</option>
                  {teamBMembers.map((m) => (
                    <option
                      key={m.id}
                      value={m.id}
                      disabled={teamBPlayerIds[1] === m.id || teamAPlayerIds.includes(m.id)}
                    >
                      {m.name} ({m.gender}, {m.office})
                    </option>
                  ))}
                </select>
              </div>

              {/* Partner 2 Selection for Doubles */}
              {category === 'Doubles' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 block">Partner 2:</label>
                  <select
                    value={teamBPlayerIds[1] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTeamBPlayerIds((prev) => [prev[0] || '', val].filter(Boolean));
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs"
                  >
                    <option value="">-- Choose Second Partner --</option>
                    {teamBMembers.map((m) => (
                      <option
                        key={m.id}
                        value={m.id}
                        disabled={teamBPlayerIds[0] === m.id || teamAPlayerIds.includes(m.id)}
                      >
                        {m.name} ({m.gender}, {m.office})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Auto-pair notification banner */}
          {autoPairNotice && (
            <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                {autoPairNotice}
              </span>
              <button
                type="button"
                onClick={() => setAutoPairNotice(null)}
                className="text-purple-500 hover:text-purple-800"
              >
                ✕
              </button>
            </div>
          )}

          {/* Scheduling Details */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
              Court &amp; Schedule
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Court */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Court:</label>
                <select
                  value={court}
                  onChange={(e) => setCourt(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs"
                >
                  {settings.courtNames.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Date:</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs"
                />
              </div>

              {/* Time */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Time:</label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs"
                />
              </div>

              {/* Round */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Round:</label>
                <input
                  type="text"
                  value={round}
                  onChange={(e) => setRound(e.target.value)}
                  placeholder="e.g. Round 1"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs"
                />
              </div>
            </div>

            {/* Status & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Match Status:</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as MatchStatus)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-semibold"
                >
                  <option value="Scheduled">Scheduled</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Organizer Notes (Optional):</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Best of 3 sets, shuttlecock provided by Team A"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Real-time Validation Errors & Warnings */}
          {validationReport.errors.length > 0 && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                Required Corrections ({validationReport.errors.length}):
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-rose-700">
                {validationReport.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {validationReport.warnings.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                Scheduling Warnings:
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-amber-700">
                {validationReport.warnings.map((warn, idx) => (
                  <li key={idx}>{warn}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!validationReport.isValid}
              onClick={() => handleSave(true)}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              Save &amp; Add Another
            </button>

            <button
              type="button"
              disabled={!validationReport.isValid}
              onClick={() => handleSave(false)}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Save Fixture
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
