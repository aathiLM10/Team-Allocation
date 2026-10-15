'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  BadmintonFixture,
  MatchCategory,
  MatchStatus,
  SchedulingSettings,
  DEFAULT_SCHEDULING_SETTINGS,
} from '@/types/fixture';
import { Participant, TournamentSummaryStats } from '@/types/badminton';
import { TeamAllocation, TeamName } from '@/types/employee';
import {
  SAMPLE_PARTICIPANTS,
  getSampleFixtures,
  generateBlankParticipationCSV,
  generateCombinedParticipationCSV,
  generateSinglesOnlyCSV,
  generateDoublesOnlyCSV,
} from '@/lib/badminton/sample-data';
import {
  detectAllFixtureConflicts,
  generateNextMatchId,
} from '@/lib/fixtures/fixture-validation';
import {
  exportMasterFixturesExcel,
  exportFixturesToCSV,
  exportParticipantsToCSV,
} from '@/lib/export/fixture-export';
import { downloadCSV } from '@/lib/export/team-export';

import { FixtureModal } from '@/components/fixtures/fixture-modal';
import { SchedulingSettingsModal } from '@/components/fixtures/scheduling-settings-modal';
import { FixtureList } from '@/components/fixtures/fixture-list';
import { ParticipantsTable } from './participants-table';
import { ParticipantImportView } from './participant-import-view';
import { AutoFixtureControl } from './auto-fixture-control';
import { KnockoutBracketView } from './knockout-bracket-view';
import { KnockoutBracket, DoublesPair } from '@/types/knockout';
import {
  createKnockoutBracket,
  generateDoublesPairs,
} from '@/lib/badminton/knockout-generator';

import {
  Plus,
  Settings,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ChevronDown,
  Layers,
  Users,
  User,
  CheckCircle2,
  Trash2,
  UploadCloud,
  FileText,
  Calendar,
} from 'lucide-react';

export function BadmintonPageView() {
  // 1. Core State
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [fixtures, setFixtures] = useState<BadmintonFixture[]>([]);
  const [settings, setSettings] = useState<SchedulingSettings>(DEFAULT_SCHEDULING_SETTINGS);

  // 2. Active Tab
  const [activeTab, setActiveTab] = useState<
    'singles-fixtures' | 'doubles-fixtures' | 'singles-participants' | 'doubles-participants' | 'all-participants' | 'import-data'
  >('singles-fixtures');

  // 3. Modals & Dropdown State
  const [isFixtureModalOpen, setIsFixtureModalOpen] = useState(false);
  const [editingFixture, setEditingFixture] = useState<BadmintonFixture | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [fixtureModalCategory, setFixtureModalCategory] = useState<MatchCategory>('Singles');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Knockout State
  const [singlesBracket, setSinglesBracket] = useState<KnockoutBracket | null>(null);
  const [doublesBracket, setDoublesBracket] = useState<KnockoutBracket | null>(null);
  const [doublesPairs, setDoublesPairs] = useState<DoublesPair[]>([]);

  // Initialize from localStorage or load sample data on initial first mount
  useEffect(() => {
    try {
      const savedP = localStorage.getItem('badminton_participants_v2');
      const savedF = localStorage.getItem('badminton_fixtures_v2');
      const savedS = localStorage.getItem('badminton_settings_v2');
      const savedSB = localStorage.getItem('badminton_singles_bracket_v1');
      const savedDB = localStorage.getItem('badminton_doubles_bracket_v1');
      const savedDP = localStorage.getItem('badminton_doubles_pairs_v1');

      let currentParticipants = SAMPLE_PARTICIPANTS;
      if (savedP) {
        currentParticipants = JSON.parse(savedP);
        setParticipants(currentParticipants);
      } else {
        setParticipants(SAMPLE_PARTICIPANTS);
      }

      let currentPairs: DoublesPair[] = [];
      if (savedDP) {
        currentPairs = JSON.parse(savedDP);
        setDoublesPairs(currentPairs);
      } else {
        currentPairs = generateDoublesPairs(currentParticipants, []);
        setDoublesPairs(currentPairs);
      }

      if (savedSB) {
        setSinglesBracket(JSON.parse(savedSB));
      } else {
        try {
          const sb = createKnockoutBracket('Singles', currentParticipants, [], { category: 'Singles' }, DEFAULT_SCHEDULING_SETTINGS);
          setSinglesBracket(sb);
        } catch (e) {}
      }

      if (savedDB) {
        setDoublesBracket(JSON.parse(savedDB));
      } else {
        try {
          const db = createKnockoutBracket('Doubles', currentParticipants, currentPairs, { category: 'Doubles' }, DEFAULT_SCHEDULING_SETTINGS);
          setDoublesBracket(db);
        } catch (e) {}
      }

      if (savedF) {
        setFixtures(JSON.parse(savedF));
      } else {
        setFixtures(getSampleFixtures(SAMPLE_PARTICIPANTS));
      }

      if (savedS) {
        setSettings(JSON.parse(savedS));
      }
    } catch (e) {
      console.warn('Error reading from localStorage:', e);
      setParticipants(SAMPLE_PARTICIPANTS);
      const pairs = generateDoublesPairs(SAMPLE_PARTICIPANTS, []);
      setDoublesPairs(pairs);
      try {
        setSinglesBracket(createKnockoutBracket('Singles', SAMPLE_PARTICIPANTS, [], { category: 'Singles' }, DEFAULT_SCHEDULING_SETTINGS));
        setDoublesBracket(createKnockoutBracket('Doubles', SAMPLE_PARTICIPANTS, pairs, { category: 'Doubles' }, DEFAULT_SCHEDULING_SETTINGS));
      } catch (err) {}
    }
  }, []);

  // Sync to localStorage
  useEffect(() => {
    if (participants.length > 0) {
      try {
        localStorage.setItem('badminton_participants_v2', JSON.stringify(participants));
      } catch (e) {}
    }
  }, [participants]);

  useEffect(() => {
    if (singlesBracket) {
      try {
        localStorage.setItem('badminton_singles_bracket_v1', JSON.stringify(singlesBracket));
      } catch (e) {}
    }
  }, [singlesBracket]);

  useEffect(() => {
    if (doublesBracket) {
      try {
        localStorage.setItem('badminton_doubles_bracket_v1', JSON.stringify(doublesBracket));
      } catch (e) {}
    }
  }, [doublesBracket]);

  useEffect(() => {
    if (doublesPairs.length > 0) {
      try {
        localStorage.setItem('badminton_doubles_pairs_v1', JSON.stringify(doublesPairs));
      } catch (e) {}
    }
  }, [doublesPairs]);

  useEffect(() => {
    try {
      localStorage.setItem('badminton_fixtures_v2', JSON.stringify(fixtures));
    } catch (e) {}
  }, [fixtures]);

  useEffect(() => {
    try {
      localStorage.setItem('badminton_settings_v2', JSON.stringify(settings));
    } catch (e) {}
  }, [settings]);

  // Derive TeamAllocations format for backward-compatibility with fixture modal & auto-pair
  const teamAllocations: TeamAllocation[] = useMemo(() => {
    const teams: TeamName[] = ['White Team', 'Red Team', 'Blue Team', 'Grey Team'];
    return teams.map((tName) => {
      const members = participants.filter((p) => p.team === tName);
      return {
        teamName: tName,
        teamKey: tName.split(' ')[0].toLowerCase() as any,
        members: members.map((p) => ({
          id: p.id,
          name: p.name,
          gender: (p.gender || 'Men') as any,
          office: (p.office || 'Guindy') as any,
        })),
        stats: {
          total: members.length,
          guindy: members.filter((p) => p.office === 'Guindy').length,
          vandaloor: members.filter((p) => p.office === 'Vandaloor').length,
          men: members.filter((p) => p.gender === 'Men').length,
          women: members.filter((p) => p.gender === 'Women').length,
          unspecified: 0,
        },
      };
    });
  }, [participants]);

  // Conflict calculations
  const conflictMap = useMemo(() => {
    return detectAllFixtureConflicts(fixtures, settings);
  }, [fixtures, settings]);

  const conflictsList = useMemo(() => {
    const list: any[] = [];
    conflictMap.forEach((cList) => {
      cList.forEach((c) => {
        if (!list.some((existing) => existing.fixtureId === c.fixtureId && existing.message === c.message)) {
          list.push(c);
        }
      });
    });
    return list;
  }, [conflictMap]);

  // KPI Calculations
  const stats: TournamentSummaryStats = useMemo(() => {
    const singlesP = participants.filter((p) => p.singlesRegistered).length;
    const doublesP = participants.filter((p) => p.doublesRegistered).length;
    const bothP = participants.filter((p) => p.singlesRegistered && p.doublesRegistered).length;
    const neitherP = participants.filter((p) => !p.singlesRegistered && !p.doublesRegistered).length;

    const singlesF = fixtures.filter((f) => f.category === 'Singles').length;
    const doublesF = fixtures.filter((f) => f.category === 'Doubles').length;

    const teams: TeamName[] = ['White Team', 'Red Team', 'Blue Team', 'Grey Team'];
    const dist: any = {};
    teams.forEach((t) => {
      const m = participants.filter((p) => p.team === t);
      dist[t] = {
        total: m.length,
        singles: m.filter((p) => p.singlesRegistered).length,
        doubles: m.filter((p) => p.doublesRegistered).length,
      };
    });

    return {
      totalParticipants: participants.length,
      singlesParticipants: singlesP,
      doublesParticipants: doublesP,
      bothCategoriesCount: bothP,
      neitherCategoryCount: neitherP,
      totalFixtures: fixtures.length,
      singlesFixtures: singlesF,
      doublesFixtures: doublesF,
      scheduledFixtures: fixtures.filter((f) => f.status === 'Scheduled').length,
      inProgressFixtures: fixtures.filter((f) => f.status === 'In Progress').length,
      completedFixtures: fixtures.filter((f) => f.status === 'Completed').length,
      activeConflictsCount: Math.floor(conflictsList.length / 2),
      teamDistribution: dist,
    };
  }, [participants, fixtures, conflictsList]);

  // Additional Metrics for Automatic Fixture Summary Cards
  const totalRoundsCount = useMemo(() => {
    return new Set(fixtures.map((f) => f.round).filter(Boolean)).size;
  }, [fixtures]);

  const assignedPlayersCount = useMemo(() => {
    const ids = new Set<string>();
    fixtures.forEach((f) => {
      f.teamAPlayers.forEach((p) => ids.add(p.id));
      f.teamBPlayers.forEach((p) => ids.add(p.id));
    });
    return ids.size;
  }, [fixtures]);

  const unassignedEligibleCount = useMemo(() => {
    const eligibleCount = participants.filter((p) => p.singlesRegistered || p.doublesRegistered).length;
    return Math.max(0, eligibleCount - assignedPlayersCount);
  }, [participants, assignedPlayersCount]);

  // Handlers for Fixtures
  const handleOpenCreateFixture = (category: MatchCategory = 'Singles') => {
    setEditingFixture(null);
    setIsDuplicate(false);
    setFixtureModalCategory(category);
    setIsFixtureModalOpen(true);
  };

  const handleEditFixture = (fixture: BadmintonFixture) => {
    setEditingFixture(fixture);
    setIsDuplicate(false);
    setFixtureModalCategory(fixture.category);
    setIsFixtureModalOpen(true);
  };

  const handleDuplicateFixture = (fixture: BadmintonFixture) => {
    setEditingFixture(fixture);
    setIsDuplicate(true);
    setFixtureModalCategory(fixture.category);
    setIsFixtureModalOpen(true);
  };

  const handleDeleteFixture = (id: string) => {
    if (window.confirm(`Delete Match ${id}?`)) {
      setFixtures((prev) => prev.filter((f) => f.id !== id));
    }
  };

  const handleUpdateFixtureStatus = (id: string, status: MatchStatus) => {
    setFixtures((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status, updatedAt: Date.now() } : f))
    );
  };

  const handleSaveFixture = (fixtureToSave: BadmintonFixture, addAnother: boolean = false) => {
    setFixtures((prev) => {
      const exists = prev.some((f) => f.id === fixtureToSave.id);
      if (exists) {
        return prev.map((f) => (f.id === fixtureToSave.id ? fixtureToSave : f));
      }
      return [...prev, fixtureToSave];
    });

    if (!addAnother) {
      setIsFixtureModalOpen(false);
    }
  };

  // Handlers for Participants
  const handleUpdateParticipant = (updated: Participant) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
  };

  const handleDeleteParticipant = (id: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  };

  const handleAddParticipant = (newP: Participant) => {
    setParticipants((prev) => [...prev, newP]);
  };

  const handleImportComplete = (imported: Participant[], mode: 'replace' | 'append') => {
    if (mode === 'replace') {
      setParticipants(imported);
    } else {
      // Append mode: merge and update matching IDs
      setParticipants((prev) => {
        const idMap = new Map(prev.map((p) => [p.id.toLowerCase(), p]));
        imported.forEach((p) => idMap.set(p.id.toLowerCase(), p));
        return Array.from(idMap.values());
      });
    }
    setActiveTab('all-participants');
  };

  // Load Sample Data Action
  const handleLoadSampleData = () => {
    if (participants.length > 0) {
      const confirmReplace = window.confirm(
        'Participant records already exist. Do you want to replace current data with the 28 fictional sample participants & generate complete knockout brackets?'
      );
      if (!confirmReplace) return;
    }

    setParticipants(SAMPLE_PARTICIPANTS);
    setFixtures(getSampleFixtures(SAMPLE_PARTICIPANTS));
    const pairs = generateDoublesPairs(SAMPLE_PARTICIPANTS, []);
    setDoublesPairs(pairs);

    try {
      const sb = createKnockoutBracket('Singles', SAMPLE_PARTICIPANTS, [], { category: 'Singles' }, settings);
      setSinglesBracket(sb);
    } catch (e) {}

    try {
      const db = createKnockoutBracket('Doubles', SAMPLE_PARTICIPANTS, pairs, { category: 'Doubles' }, settings);
      setDoublesBracket(db);
    } catch (e) {}

    alert('Loaded 28 sample participants and generated complete knockout brackets for Singles and Doubles.');
  };

  // Export Handlers
  const handleExportMasterExcel = async () => {
    setIsExportingExcel(true);
    try {
      await exportMasterFixturesExcel(fixtures, participants, conflictsList);
    } finally {
      setIsExportingExcel(false);
      setShowExportMenu(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Common Tournament & Office Freedom */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏸</span>
            <h2 className="text-lg font-extrabold tracking-tight">
              Badminton Tournament Studio
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
              Common Office Tournament
            </span>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Common badminton championship for all employees from Guindy and Vandaloor. Office location is informational only and never restricts pairings or matches. Configure custom Singles and Doubles matchups freely.
          </p>
        </div>

        {/* Global Tournament Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Scheduling Settings */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-colors cursor-pointer"
            title="Configure courts, dates & rematch policies"
          >
            <Settings className="w-3.5 h-3.5 text-blue-300" />
            <span>Settings</span>
          </button>

          {/* Load Sample Data */}
          <button
            type="button"
            onClick={handleLoadSampleData}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-200 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/30 rounded-lg transition-colors cursor-pointer"
            title="Load 28 sample participants & example matchups"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span>Load Sample Data</span>
          </button>

          {/* Download Templates Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowTemplateMenu(!showTemplateMenu);
                setShowExportMenu(false);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-300" />
              <span>Templates</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showTemplateMenu && (
              <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 text-xs animate-in fade-in zoom-in-95 duration-100 text-slate-800">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Downloadable Templates
                </div>
                <button
                  type="button"
                  onClick={() => {
                    downloadCSV(generateBlankParticipationCSV(), 'badminton_participation_template.csv');
                    setShowTemplateMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  Blank CSV Template
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadCSV(generateCombinedParticipationCSV(), 'badminton_sample_combined.csv');
                    setShowTemplateMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-500" />
                  Sample Combined CSV
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadCSV(generateSinglesOnlyCSV(), 'badminton_sample_singles.csv');
                    setShowTemplateMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-500" />
                  Singles-Only CSV
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadCSV(generateDoublesOnlyCSV(), 'badminton_sample_doubles.csv');
                    setShowTemplateMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-purple-500" />
                  Doubles-Only CSV
                </button>
              </div>
            )}
          </div>

          {/* Export Results Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowExportMenu(!showExportMenu);
                setShowTemplateMenu(false);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
              <span>Export Results</span>
              <ChevronDown className="w-3.5 h-3.5 text-emerald-200" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 text-xs animate-in fade-in zoom-in-95 duration-100 text-slate-800">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Master Workbook (.xlsx)
                </div>
                <button
                  type="button"
                  onClick={handleExportMasterExcel}
                  disabled={isExportingExcel}
                  className="w-full px-3 py-2 text-left hover:bg-emerald-50 hover:text-emerald-900 font-semibold flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    Master Excel (.xlsx)
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                    6 Worksheets
                  </span>
                </button>

                <div className="my-1 border-t border-slate-100" />
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Fixtures CSV Exports
                </div>
                <button
                  type="button"
                  onClick={() => {
                    exportFixturesToCSV(fixtures, 'Singles');
                    setShowExportMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-blue-500" />
                  Singles Fixtures CSV ({stats.singlesFixtures})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportFixturesToCSV(fixtures, 'Doubles');
                    setShowExportMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-purple-500" />
                  Doubles Fixtures CSV ({stats.doublesFixtures})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportFixturesToCSV(fixtures);
                    setShowExportMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  All Master Fixtures CSV ({stats.totalFixtures})
                </button>

                <div className="my-1 border-t border-slate-100" />
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Participants CSV Exports
                </div>
                <button
                  type="button"
                  onClick={() => {
                    exportParticipantsToCSV(participants, 'Singles');
                    setShowExportMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-blue-500" />
                  Singles Participants ({stats.singlesParticipants})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportParticipantsToCSV(participants, 'Doubles');
                    setShowExportMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-purple-500" />
                  Doubles Participants ({stats.doublesParticipants})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportParticipantsToCSV(participants, 'All');
                    setShowExportMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  Complete Participant Roster ({stats.totalParticipants})
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Matches */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Knockout Matches
          </span>
          <span className="text-xl font-extrabold text-slate-900 mt-0.5 block">
            {(singlesBracket?.rounds.flatMap((r) => r.matches).length || 0) +
              (doublesBracket?.rounds.flatMap((r) => r.matches).length || 0)}
          </span>
          <span className="text-[11px] text-slate-500">
            {singlesBracket?.rounds.flatMap((r) => r.matches).length || 0} Singles • {doublesBracket?.rounds.flatMap((r) => r.matches).length || 0} Doubles
          </span>
        </div>

        {/* Matches Completed */}
        <div className="p-3.5 rounded-xl bg-white border border-indigo-200/90 shadow-2xs bg-indigo-50/20">
          <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
            Matches Decided
          </span>
          <span className="text-xl font-extrabold text-indigo-700 mt-0.5 block">
            {(singlesBracket?.rounds.flatMap((r) => r.matches).filter((m) => m.status === 'Completed' || m.status === 'Walkover').length || 0) +
              (doublesBracket?.rounds.flatMap((r) => r.matches).filter((m) => m.status === 'Completed' || m.status === 'Walkover').length || 0)}
          </span>
          <span className="text-[11px] text-indigo-600">Results Recorded</span>
        </div>

        {/* Registered Participants */}
        <div className="p-3.5 rounded-xl bg-white border border-blue-200/90 shadow-2xs bg-blue-50/20">
          <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
            Participants
          </span>
          <span className="text-xl font-extrabold text-blue-700 mt-0.5 block">
            {stats.totalParticipants}
          </span>
          <span className="text-[11px] text-blue-600">
            {stats.singlesParticipants} Singles • {stats.doublesParticipants} Doubles
          </span>
        </div>

        {/* Doubles Partner Pairs */}
        <div className="p-3.5 rounded-xl bg-white border border-purple-200/90 shadow-2xs bg-purple-50/20">
          <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">
            Doubles Pairs
          </span>
          <span className="text-xl font-extrabold text-purple-700 mt-0.5 block">
            {doublesPairs.length}
          </span>
          <span className="text-[11px] text-purple-600">
            {doublesPairs.filter((p) => p.isLocked).length} Approved &amp; Locked
          </span>
        </div>

        {/* Singles Champion */}
        <div className="p-3.5 rounded-xl bg-white border border-amber-200/90 shadow-2xs bg-amber-50/20">
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
            Singles Champion
          </span>
          <span className="text-sm font-extrabold text-amber-800 mt-1 block truncate">
            {singlesBracket?.champion ? singlesBracket.champion.displayName : 'In Progress'}
          </span>
          <span className="text-[11px] text-amber-600 truncate block">
            {singlesBracket?.champion ? singlesBracket.champion.team : 'Not Decided'}
          </span>
        </div>

        {/* Doubles Champions */}
        <div className="p-3.5 rounded-xl bg-white border border-amber-200/90 shadow-2xs bg-amber-50/20">
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
            Doubles Champions
          </span>
          <span className="text-sm font-extrabold text-amber-800 mt-1 block truncate">
            {doublesBracket?.champion ? doublesBracket.champion.displayName : 'In Progress'}
          </span>
          <span className="text-[11px] text-amber-600 truncate block">
            {doublesBracket?.champion ? doublesBracket.champion.team : 'Not Decided'}
          </span>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Singles Knockout Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('singles-fixtures')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'singles-fixtures'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Singles Knockout</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === 'singles-fixtures' ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {singlesBracket?.totalParticipants || stats.singlesParticipants}
            </span>
          </button>

          {/* Doubles Knockout Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('doubles-fixtures')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'doubles-fixtures'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Doubles Knockout</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === 'doubles-fixtures' ? 'bg-purple-800 text-purple-100' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {doublesPairs.length || Math.floor(stats.doublesParticipants / 2)}
            </span>
          </button>

          {/* Singles Participants */}
          <button
            type="button"
            onClick={() => setActiveTab('singles-participants')}
            className={`px-3 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'singles-participants'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>Singles Players</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === 'singles-participants' ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {stats.singlesParticipants}
            </span>
          </button>

          {/* Doubles Participants */}
          <button
            type="button"
            onClick={() => setActiveTab('doubles-participants')}
            className={`px-3 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'doubles-participants'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>Doubles Players</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === 'doubles-participants' ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {stats.doublesParticipants}
            </span>
          </button>

          {/* All Participants */}
          <button
            type="button"
            onClick={() => setActiveTab('all-participants')}
            className={`px-3 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'all-participants'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>All Participants</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === 'all-participants' ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {stats.totalParticipants}
            </span>
          </button>

          {/* Import Data Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('import-data')}
            className={`px-3 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'import-data'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Import Data</span>
          </button>
        </div>
      </div>

      {/* TAB CONTENT VIEWS */}

      {/* 1. Singles Knockout Bracket */}
      {activeTab === 'singles-fixtures' && (
        <KnockoutBracketView
          category="Singles"
          participants={participants}
          doublesPairs={doublesPairs}
          onDoublesPairsChange={setDoublesPairs}
          bracket={singlesBracket}
          onBracketChange={setSinglesBracket}
          otherCategoryBracket={doublesBracket}
          settings={settings}
        />
      )}

      {/* 2. Doubles Knockout Bracket */}
      {activeTab === 'doubles-fixtures' && (
        <KnockoutBracketView
          category="Doubles"
          participants={participants}
          doublesPairs={doublesPairs}
          onDoublesPairsChange={setDoublesPairs}
          bracket={doublesBracket}
          onBracketChange={setDoublesBracket}
          otherCategoryBracket={singlesBracket}
          settings={settings}
        />
      )}

      {/* 3. Singles Participants Table */}
      {activeTab === 'singles-participants' && (
        <ParticipantsTable
          participants={participants}
          filterCategory="Singles"
          onUpdateParticipant={handleUpdateParticipant}
          onDeleteParticipant={handleDeleteParticipant}
          onAddParticipant={handleAddParticipant}
        />
      )}

      {/* 4. Doubles Participants Table */}
      {activeTab === 'doubles-participants' && (
        <ParticipantsTable
          participants={participants}
          filterCategory="Doubles"
          onUpdateParticipant={handleUpdateParticipant}
          onDeleteParticipant={handleDeleteParticipant}
          onAddParticipant={handleAddParticipant}
        />
      )}

      {/* 5. All Participants Table */}
      {activeTab === 'all-participants' && (
        <ParticipantsTable
          participants={participants}
          filterCategory="All"
          onUpdateParticipant={handleUpdateParticipant}
          onDeleteParticipant={handleDeleteParticipant}
          onAddParticipant={handleAddParticipant}
        />
      )}

      {/* 6. Import Data View */}
      {activeTab === 'import-data' && (
        <ParticipantImportView
          existingParticipants={participants}
          onImportComplete={handleImportComplete}
          onCancel={() => setActiveTab('all-participants')}
        />
      )}

      {/* Fixture Create / Edit / Duplicate Modal */}
      <FixtureModal
        isOpen={isFixtureModalOpen}
        onClose={() => setIsFixtureModalOpen(false)}
        onSaveFixture={handleSaveFixture}
        initialFixture={editingFixture}
        isDuplicate={isDuplicate}
        existingFixtures={fixtures}
        allocations={teamAllocations}
        settings={settings}
        defaultCategory={fixtureModalCategory}
      />

      {/* Scheduling Controls Modal */}
      <SchedulingSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={(newSettings) => setSettings(newSettings)}
      />
    </div>
  );
}
