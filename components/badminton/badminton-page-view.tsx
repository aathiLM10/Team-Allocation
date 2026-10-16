'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BadmintonFixture,
  MatchCategory,
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
  parseParticipantFile,
  processParticipantRows,
} from '@/lib/badminton/participant-import';
import {
  detectAllFixtureConflicts,
} from '@/lib/fixtures/fixture-validation';
import {
  exportMasterFixturesExcel,
  exportFixturesToCSV,
  exportParticipantsToCSV,
} from '@/lib/export/fixture-export';
import { downloadCSV } from '@/lib/export/team-export';
import {
  downloadCombinedKnockoutFixtureListPDF,
  printCombinedKnockoutFixtureList,
} from '@/lib/export/pdf-fixture-export';

import { SchedulingSettingsModal } from '@/components/fixtures/scheduling-settings-modal';
import { ParticipantsTable } from './participants-table';
import { ParticipantImportView } from './participant-import-view';
import { KnockoutBracketView } from './knockout-bracket-view';
import { DoublesPairingReview } from './doubles-pairing-review';
import { KnockoutBracket, DoublesPair } from '@/types/knockout';
import {
  createKnockoutBracket,
  generateDoublesPairs,
} from '@/lib/badminton/knockout-generator';

import {
  Trophy,
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
  FileDown,
  Printer,
  ArrowRight,
  Plus,
} from 'lucide-react';

export type BadmintonAppTab =
  | 'initial-view'       // State 1: No data loaded
  | 'employee-roster'    // State 2: Data loaded, review participants & generate buttons
  | 'doubles-pairing'    // State 3: Doubles partner pairing review
  | 'singles-fixtures'   // State 4: Singles knockout tournament active
  | 'doubles-fixtures'   // State 4: Doubles knockout tournament active
  | 'import-data';       // Full import wizard

export function BadmintonPageView() {
  // 1. Core State
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [fixtures, setFixtures] = useState<BadmintonFixture[]>([]);
  const [settings, setSettings] = useState<SchedulingSettings>(DEFAULT_SCHEDULING_SETTINGS);

  // 2. Active Tab / Workflow View
  const [activeTab, setActiveTab] = useState<BadmintonAppTab>('initial-view');

  // 3. Dropdowns & Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 4. Knockout Tournament Brackets & Pairs
  const [singlesBracket, setSinglesBracket] = useState<KnockoutBracket | null>(null);
  const [doublesBracket, setDoublesBracket] = useState<KnockoutBracket | null>(null);
  const [doublesPairs, setDoublesPairs] = useState<DoublesPair[]>([]);

  // Initialize from localStorage ONLY if existing user records are found; do not auto-load sample data
  useEffect(() => {
    try {
      const savedP = localStorage.getItem('badminton_participants_v2');
      const savedF = localStorage.getItem('badminton_fixtures_v2');
      const savedS = localStorage.getItem('badminton_settings_v2');
      const savedSB = localStorage.getItem('badminton_singles_bracket_v1');
      const savedDB = localStorage.getItem('badminton_doubles_bracket_v1');
      const savedDP = localStorage.getItem('badminton_doubles_pairs_v1');

      if (savedP) {
        const parsedP: Participant[] = JSON.parse(savedP);
        if (Array.isArray(parsedP) && parsedP.length > 0) {
          setParticipants(parsedP);

          if (savedDP) setDoublesPairs(JSON.parse(savedDP));
          if (savedSB) setSinglesBracket(JSON.parse(savedSB));
          if (savedDB) setDoublesBracket(JSON.parse(savedDB));
          if (savedF) setFixtures(JSON.parse(savedF));

          // If brackets were already active, show the appropriate bracket view, otherwise employee roster
          if (savedSB) {
            setActiveTab('singles-fixtures');
          } else if (savedDB) {
            setActiveTab('doubles-fixtures');
          } else {
            setActiveTab('employee-roster');
          }
          return;
        }
      }

      // No saved data found -> remain in clean Initial State
      setParticipants([]);
      setActiveTab('initial-view');

      if (savedS) {
        setSettings(JSON.parse(savedS));
      }
    } catch (e) {
      console.warn('Error reading from localStorage:', e);
      setParticipants([]);
      setActiveTab('initial-view');
    }
  }, []);

  // Sync state to localStorage
  useEffect(() => {
    try {
      if (participants.length > 0) {
        localStorage.setItem('badminton_participants_v2', JSON.stringify(participants));
      } else {
        localStorage.removeItem('badminton_participants_v2');
      }
    } catch (e) {}
  }, [participants]);

  useEffect(() => {
    try {
      if (singlesBracket) {
        localStorage.setItem('badminton_singles_bracket_v1', JSON.stringify(singlesBracket));
      } else {
        localStorage.removeItem('badminton_singles_bracket_v1');
      }
    } catch (e) {}
  }, [singlesBracket]);

  useEffect(() => {
    try {
      if (doublesBracket) {
        localStorage.setItem('badminton_doubles_bracket_v1', JSON.stringify(doublesBracket));
      } else {
        localStorage.removeItem('badminton_doubles_bracket_v1');
      }
    } catch (e) {}
  }, [doublesBracket]);

  useEffect(() => {
    try {
      if (doublesPairs.length > 0) {
        localStorage.setItem('badminton_doubles_pairs_v1', JSON.stringify(doublesPairs));
      } else {
        localStorage.removeItem('badminton_doubles_pairs_v1');
      }
    } catch (e) {}
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

  // Derived counts
  const singlesParticipantsCount = useMemo(() => {
    return participants.filter((p) => p.singlesRegistered).length;
  }, [participants]);

  const doublesParticipantsCount = useMemo(() => {
    return participants.filter((p) => p.doublesRegistered).length;
  }, [participants]);

  // Tournament lifecycle state
  const tournamentStatus = useMemo(() => {
    if (participants.length === 0) return 'NO_DATA';
    if (!singlesBracket && !doublesBracket) return 'DATA_LOADED';

    const sDone = singlesBracket?.champion !== null && singlesBracket?.champion !== undefined;
    const dDone = doublesBracket?.champion !== null && doublesBracket?.champion !== undefined;
    if (sDone && dDone) return 'COMPLETED';

    const sStarted = singlesBracket?.rounds.some((r) =>
      r.matches.some((m) => m.status === 'Completed' || m.status === 'Walkover')
    );
    const dStarted = doublesBracket?.rounds.some((r) =>
      r.matches.some((m) => m.status === 'Completed' || m.status === 'Walkover')
    );
    if (sStarted || dStarted) return 'IN_PROGRESS';

    return 'FIXTURES_GENERATED';
  }, [participants, singlesBracket, doublesBracket]);

  // Conflict calculations for scheduled manual fixtures
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

  // ACTION: Direct file upload from Initial View
  const handleDirectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rawRecords = await parseParticipantFile(file);
      const { rows } = processParticipantRows(rawRecords, 'combined', []);
      const validParticipants = rows
        .filter((r) => r.isValid)
        .map((r) => ({
          id: r.id,
          name: r.name,
          team: r.team as any,
          office: (r.office || 'Guindy') as any,
          gender: (r.gender || 'Men') as any,
          singlesRegistered: r.singlesRegistered,
          doublesRegistered: r.doublesRegistered,
        }));

      if (validParticipants.length === 0) {
        alert(
          'No valid employee records found in the uploaded file. Please ensure columns include ID, Name, and Team (White, Red, Blue, Grey).'
        );
        return;
      }

      setParticipants(validParticipants);
      setSinglesBracket(null);
      setDoublesBracket(null);
      setDoublesPairs([]);
      setActiveTab('employee-roster');
    } catch (err: any) {
      alert(`Error reading file: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ACTION: Load Sample Data
  const handleLoadSampleData = () => {
    if (participants.length > 0) {
      const confirmReplace = window.confirm(
        'Participant records already exist. Do you want to load the 28 sample participants? Current data will be replaced.'
      );
      if (!confirmReplace) return;
    }

    setParticipants(SAMPLE_PARTICIPANTS);
    setSinglesBracket(null);
    setDoublesBracket(null);
    setDoublesPairs([]);
    setActiveTab('employee-roster');
  };

  // ACTION: Reset & Clear All Data
  const handleClearAllData = () => {
    const confirmClear = window.confirm(
      'Are you sure you want to clear all employee participants and generated fixtures? This will reset the application to the initial state.'
    );
    if (!confirmClear) return;

    setParticipants([]);
    setSinglesBracket(null);
    setDoublesBracket(null);
    setDoublesPairs([]);
    setFixtures([]);
    localStorage.removeItem('badminton_participants_v2');
    localStorage.removeItem('badminton_singles_bracket_v1');
    localStorage.removeItem('badminton_doubles_bracket_v1');
    localStorage.removeItem('badminton_doubles_pairs_v1');
    localStorage.removeItem('badminton_fixtures_v2');
    setActiveTab('initial-view');
  };

  // ACTION: Generate Singles Fixtures (One-Click)
  const handleGenerateSinglesFixtures = () => {
    const singlesPlayers = participants.filter((p) => p.singlesRegistered);
    if (singlesPlayers.length < 2) {
      alert(
        `Cannot generate Singles Knockout: At least 2 employees must be registered for Singles (currently ${singlesPlayers.length}).`
      );
      return;
    }

    try {
      const newBracket = createKnockoutBracket(
        'Singles',
        participants,
        [],
        { category: 'Singles' },
        settings
      );
      setSinglesBracket(newBracket);
      setActiveTab('singles-fixtures');
    } catch (e: any) {
      alert(e.message || 'Error generating Singles knockout bracket');
    }
  };

  // ACTION: Initiate Doubles Workflow (Step 1-3: Pair first, then review)
  const handleInitiateDoublesWorkflow = () => {
    const doublesPlayers = participants.filter((p) => p.doublesRegistered);
    if (doublesPlayers.length < 2) {
      alert(
        `Cannot generate Doubles: At least 2 employees must be registered for Doubles (currently ${doublesPlayers.length}).`
      );
      return;
    }

    // Automatically shuffle and pair partners within each team
    const pairs = generateDoublesPairs(participants, doublesPairs);
    setDoublesPairs(pairs);
    // Transition to Doubles Partner Review screen
    setActiveTab('doubles-pairing');
  };

  // ACTION: Confirm Doubles Pairs & Generate Bracket (Step 5)
  const handleConfirmAndGenerateDoublesBracket = () => {
    if (doublesPairs.length < 2) {
      alert(
        `Cannot generate Doubles bracket with only ${doublesPairs.length} pair(s). At least 2 complete pairs are required.`
      );
      return;
    }

    try {
      const newBracket = createKnockoutBracket(
        'Doubles',
        participants,
        doublesPairs,
        { category: 'Doubles' },
        settings
      );
      setDoublesBracket(newBracket);
      setActiveTab('doubles-fixtures');
    } catch (e: any) {
      alert(e.message || 'Error generating Doubles knockout bracket');
    }
  };

  // Handlers for Participant Updates from table
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
      setSinglesBracket(null);
      setDoublesBracket(null);
      setDoublesPairs([]);
    } else {
      setParticipants((prev) => {
        const idMap = new Map(prev.map((p) => [p.id.toLowerCase(), p]));
        imported.forEach((p) => idMap.set(p.id.toLowerCase(), p));
        return Array.from(idMap.values());
      });
    }
    setActiveTab('employee-roster');
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
      {/* Hidden File Input for Direct Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv, .xlsx, .xls"
        onChange={handleDirectFileUpload}
        className="hidden"
      />

      {/* TOP HEADER: Clean Tournament Studio Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-500/20 border border-blue-400/30 text-xl shadow-inner">
              🏸
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-extrabold tracking-tight">
                  Badminton Tournament Studio
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  Common Office Tournament
                </span>
                {tournamentStatus !== 'NO_DATA' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    {participants.length} Employees Loaded
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed mt-0.5">
                Common badminton championship for all employees from Guindy and Vandaloor. Simple reliable workflow: load data, pair partners, and generate single-elimination knockout fixtures.
              </p>
            </div>
          </div>
        </div>

        {/* Global Header Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Scheduling Settings */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-colors cursor-pointer"
            title="Configure courts & tournament dates"
          >
            <Settings className="w-3.5 h-3.5 text-blue-300" />
            <span>Settings</span>
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
              <Download className="w-3.5 h-3.5 text-slate-300" />
              <span>Templates</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
            </button>

            {showTemplateMenu && (
              <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 text-xs animate-in fade-in zoom-in-95 duration-100 text-slate-800">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  CSV Import Templates
                </div>
                <button
                  type="button"
                  onClick={() => {
                    downloadCSV(generateCombinedParticipationCSV(), 'badminton_combined_template.csv');
                    setShowTemplateMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-500" />
                  Combined (Singles &amp; Doubles)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadCSV(generateSinglesOnlyCSV(), 'badminton_singles_template.csv');
                    setShowTemplateMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-blue-500" />
                  Singles-Only CSV
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadCSV(generateDoublesOnlyCSV(), 'badminton_doubles_template.csv');
                    setShowTemplateMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-purple-500" />
                  Doubles-Only CSV
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadCSV(generateBlankParticipationCSV(), 'badminton_blank_roster.csv');
                    setShowTemplateMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer border-t border-slate-100"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  Blank Roster Template
                </button>
              </div>
            )}
          </div>

          {/* Reset / Clear All (when participants loaded) */}
          {participants.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllData}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-300 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 rounded-lg transition-colors cursor-pointer"
              title="Clear all data and reset to initial state"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. INITIAL STATE — NO DATA LOADED */}
      {/* ========================================================================= */}
      {participants.length === 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-8 sm:p-12 text-center space-y-8 animate-in fade-in duration-200">
          <div className="max-w-2xl mx-auto space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto text-3xl shadow-lg shadow-indigo-600/20">
              🏸
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              Get Started: Load Employee List
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed max-w-lg mx-auto">
              Upload your employee list from Excel or CSV, or load fictional sample data to start generating Singles and Doubles knockout fixtures.
            </p>
          </div>

          {/* Primary Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto text-left">
            {/* Card 1: Upload Employee List */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-6 rounded-2xl border-2 border-dashed border-blue-300 hover:border-blue-600 bg-blue-50/30 hover:bg-blue-50/70 transition-all cursor-pointer group space-y-3"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-900 text-base group-hover:text-blue-700 transition-colors">
                  Upload Employee List
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Upload a CSV or Excel (.xlsx) file containing employee names, assigned teams (White, Red, Blue, Grey), and category registrations.
                </p>
              </div>
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 group-hover:underline">
                  <span>Browse files or drop here</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* Card 2: Load Sample Data */}
            <div
              onClick={handleLoadSampleData}
              className="p-6 rounded-2xl border-2 border-slate-200 hover:border-indigo-500 bg-slate-50/50 hover:bg-indigo-50/30 transition-all cursor-pointer group space-y-3"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-900 text-base group-hover:text-indigo-700 transition-colors">
                  Load Sample Data
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Try the studio instantly with 28 fictional employees balanced across all four teams with mixed Singles and Doubles registrations.
                </p>
              </div>
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 group-hover:underline">
                  <span>Load 28 Sample Players</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>

          {/* Download CSV Templates Link */}
          <div className="pt-2 border-t border-slate-100 max-w-md mx-auto text-center">
            <span className="text-xs text-slate-500">
              Need a sample spreadsheet format?{' '}
              <button
                type="button"
                onClick={() => downloadCSV(generateCombinedParticipationCSV(), 'badminton_combined_template.csv')}
                className="font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
              >
                Download CSV Template
              </button>
            </span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MAIN APPLICATION WORKFLOW (AFTER DATA IS LOADED) */}
      {/* ========================================================================= */}
      {participants.length > 0 && (
        <div className="space-y-6">
          {/* Main Navigation Pill Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Employee Roster Tab */}
              <button
                type="button"
                onClick={() => setActiveTab('employee-roster')}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'employee-roster'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Employee List</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    activeTab === 'employee-roster' ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {participants.length}
                </span>
              </button>

              {/* Singles Knockout Tab */}
              <button
                type="button"
                onClick={() => {
                  if (singlesBracket) {
                    setActiveTab('singles-fixtures');
                  } else {
                    handleGenerateSinglesFixtures();
                  }
                }}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'singles-fixtures'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Singles Knockout</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    activeTab === 'singles-fixtures' ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {singlesBracket ? `${singlesBracket.totalParticipants} Players` : `${singlesParticipantsCount} Ready`}
                </span>
              </button>

              {/* Doubles Knockout Tab */}
              <button
                type="button"
                onClick={() => {
                  if (doublesBracket) {
                    setActiveTab('doubles-fixtures');
                  } else if (doublesPairs.length > 0) {
                    setActiveTab('doubles-pairing');
                  } else {
                    handleInitiateDoublesWorkflow();
                  }
                }}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'doubles-fixtures' || activeTab === 'doubles-pairing'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Doubles Knockout</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    activeTab === 'doubles-fixtures' || activeTab === 'doubles-pairing'
                      ? 'bg-purple-800 text-purple-100'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {doublesBracket
                    ? `${doublesBracket.totalParticipants} Pairs`
                    : doublesPairs.length > 0
                    ? `${doublesPairs.length} Pairs`
                    : `${doublesParticipantsCount} Ready`}
                </span>
              </button>

              {/* Import Data View */}
              <button
                type="button"
                onClick={() => setActiveTab('import-data')}
                className={`px-3 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'import-data'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Import Data</span>
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors cursor-pointer"
              >
                Upload File
              </button>
              <button
                type="button"
                onClick={handleLoadSampleData}
                className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors cursor-pointer"
              >
                Load Sample Data
              </button>
            </div>
          </div>

          {/* VIEW 1: EMPLOYEE ROSTER & PROMINENT GENERATION BUTTONS */}
          {activeTab === 'employee-roster' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Compact Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Total Employees
                  </span>
                  <span className="text-2xl font-black text-slate-900 mt-0.5 block">
                    {participants.length}
                  </span>
                  <span className="text-[11px] text-slate-500">Across 4 Teams</span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-blue-200 shadow-2xs bg-blue-50/20">
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                    Singles Registered
                  </span>
                  <span className="text-2xl font-black text-blue-700 mt-0.5 block">
                    {singlesParticipantsCount}
                  </span>
                  <span className="text-[11px] text-blue-600">
                    {singlesBracket ? 'Bracket Generated' : 'Ready for Fixtures'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-purple-200 shadow-2xs bg-purple-50/20">
                  <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
                    Doubles Registered
                  </span>
                  <span className="text-2xl font-black text-purple-700 mt-0.5 block">
                    {doublesParticipantsCount}
                  </span>
                  <span className="text-[11px] text-purple-600">
                    {doublesPairs.length > 0
                      ? `${doublesPairs.length} Pairs Formed`
                      : 'Requires Partner Pairing'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Team Distribution
                  </span>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white">
                      B: {stats.teamDistribution['Blue Team']?.total || 0}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-800">
                      W: {stats.teamDistribution['White Team']?.total || 0}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-600 text-white">
                      R: {stats.teamDistribution['Red Team']?.total || 0}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-700 text-white">
                      G: {stats.teamDistribution['Grey Team']?.total || 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* TWO UNMISSABLE PROMINENT GENERATION ACTION CARDS */}
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-lg border border-slate-800 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold tracking-tight flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <span>Generate Tournament Knockout Fixtures</span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    Click an action below to automatically create the single-elimination tournament bracket from the registered participants.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  {/* Action 1: Generate Singles Fixtures */}
                  <div className="p-4 rounded-xl bg-white/10 border border-white/10 hover:border-blue-400/50 transition-colors flex flex-col justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                          <User className="w-4 h-4" />
                          Singles Championship
                        </span>
                        <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-blue-500/30 text-blue-200 border border-blue-400/30">
                          {singlesParticipantsCount} Eligible Players
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        One-click random shuffle &amp; single-elimination knockout draw for all employees registered for Singles.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateSinglesFixtures}
                      disabled={singlesParticipantsCount < 2}
                      className={`w-full py-2.5 px-4 rounded-xl font-extrabold text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        singlesParticipantsCount >= 2
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30'
                          : 'bg-white/10 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>
                        {singlesParticipantsCount >= 2
                          ? `Generate Singles Fixtures (${singlesParticipantsCount} Players)`
                          : 'Requires at least 2 Singles Players'}
                      </span>
                    </button>
                  </div>

                  {/* Action 2: Generate Doubles Fixtures */}
                  <div className="p-4 rounded-xl bg-white/10 border border-white/10 hover:border-purple-400/50 transition-colors flex flex-col justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                          <Users className="w-4 h-4" />
                          Doubles Championship
                        </span>
                        <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-purple-500/30 text-purple-200 border border-purple-400/30">
                          {doublesParticipantsCount} Eligible Players
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Randomly pairs partners within each team first, opens partnerships for review/approval, then creates the knockout bracket.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleInitiateDoublesWorkflow}
                      disabled={doublesParticipantsCount < 2}
                      className={`w-full py-2.5 px-4 rounded-xl font-extrabold text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        doublesParticipantsCount >= 2
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-purple-600/30'
                          : 'bg-white/10 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span>
                        {doublesParticipantsCount >= 2
                          ? `Generate Doubles Fixtures (${doublesParticipantsCount} Players)`
                          : 'Requires at least 2 Doubles Players'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Employee Table with Search, Filter & Editing */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                    Registered Employee Participants
                  </h3>
                  <span className="text-xs text-slate-500">
                    Showing all registered employees across Guindy and Vandaloor.
                  </span>
                </div>
                <ParticipantsTable
                  participants={participants}
                  filterCategory="All"
                  onUpdateParticipant={handleUpdateParticipant}
                  onDeleteParticipant={handleDeleteParticipant}
                  onAddParticipant={handleAddParticipant}
                />
              </div>
            </div>
          )}

          {/* VIEW 2: DOUBLES PARTNER PAIRING REVIEW (STEP 4) */}
          {activeTab === 'doubles-pairing' && (
            <DoublesPairingReview
              participants={participants}
              doublesPairs={doublesPairs}
              onDoublesPairsChange={setDoublesPairs}
              onRegeneratePairs={() => {
                const refreshed = generateDoublesPairs(participants, doublesPairs);
                setDoublesPairs(refreshed);
              }}
              onConfirmAndGenerateFixtures={handleConfirmAndGenerateDoublesBracket}
              onBackToRoster={() => setActiveTab('employee-roster')}
            />
          )}

          {/* VIEW 3: SINGLES KNOCKOUT BRACKET */}
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
              onBackToRoster={() => setActiveTab('employee-roster')}
            />
          )}

          {/* VIEW 4: DOUBLES KNOCKOUT BRACKET */}
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
              onBackToRoster={() => setActiveTab('employee-roster')}
              onManagePartners={() => setActiveTab('doubles-pairing')}
            />
          )}

          {/* VIEW 5: IMPORT DATA */}
          {activeTab === 'import-data' && (
            <ParticipantImportView
              existingParticipants={participants}
              onImportComplete={handleImportComplete}
              onCancel={() => setActiveTab('employee-roster')}
            />
          )}
        </div>
      )}

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
