'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BadmintonFixture,
  MatchCategory,
  SchedulingSettings,
  DEFAULT_SCHEDULING_SETTINGS,
} from '@/types/fixture';
import { Participant, TournamentSummaryStats } from '@/types/badminton';
import { TeamName, TEAM_NAMES } from '@/types/employee';
import {
  SAMPLE_PARTICIPANTS,
  getRealCompanyParticipants,
  generateTeamColumnsCSV,
  generateBlankParticipationCSV,
  generateCombinedParticipationCSV,
  generateSinglesOnlyCSV,
  generateDoublesOnlyCSV,
} from '@/lib/badminton/sample-data';
import {
  parseParticipantFile,
  processParticipantRows,
  isTeamColumnsLayout,
} from '@/lib/badminton/participant-import';
import { getComplementaryMatchup } from '@/lib/badminton/auto-shuffle';
import { detectAllFixtureConflicts } from '@/lib/fixtures/fixture-validation';
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
  Download,
  RotateCcw,
  Sparkles,
  ChevronDown,
  Users,
  User,
  CheckCircle2,
  UploadCloud,
  FileText,
  Calendar,
  FileDown,
  Printer,
  ArrowRight,
  Plus,
  RefreshCw,
  Sliders,
  ListOrdered,
  Shuffle,
  Shield,
  Layers,
} from 'lucide-react';

export type MainCategoryTab = 'singles' | 'doubles' | 'all-roster';

export function BadmintonPageView() {
  // 1. Separate Participant Pools for Singles and Doubles
  const [singlesParticipants, setSinglesParticipants] = useState<Participant[]>([]);
  const [doublesParticipants, setDoublesParticipants] = useState<Participant[]>([]);

  // 2. Knockout Tournament Brackets & Doubles Pairs
  const [singlesBracket, setSinglesBracket] = useState<KnockoutBracket | null>(null);
  const [doublesBracket, setDoublesBracket] = useState<KnockoutBracket | null>(null);
  const [doublesPairs, setDoublesPairs] = useState<DoublesPair[]>([]);

  // 3. Team Matchup Selections (Which two teams face each other)
  const [singlesTeamA, setSinglesTeamA] = useState<TeamName>('Red Team');
  const [singlesTeamB, setSinglesTeamB] = useState<TeamName>('White Team');
  const [doublesTeamA, setDoublesTeamA] = useState<TeamName>('Red Team');
  const [doublesTeamB, setDoublesTeamB] = useState<TeamName>('White Team');

  // 4. Active Navigation Tab
  const [activeTab, setActiveTab] = useState<MainCategoryTab>('singles');

  // 5. Settings & Modals
  const [settings, setSettings] = useState<SchedulingSettings>(DEFAULT_SCHEDULING_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);

  // File input refs for dedicated uploads
  const singlesFileInputRef = useRef<HTMLInputElement>(null);
  const doublesFileInputRef = useRef<HTMLInputElement>(null);

  // Load saved state from localStorage on initial render
  useEffect(() => {
    try {
      const savedSP = localStorage.getItem('badminton_singles_participants_v3');
      const savedDP = localStorage.getItem('badminton_doubles_participants_v3');
      const savedSB = localStorage.getItem('badminton_singles_bracket_v2');
      const savedDB = localStorage.getItem('badminton_doubles_bracket_v2');
      const savedPairs = localStorage.getItem('badminton_doubles_pairs_v2');
      const savedSettings = localStorage.getItem('badminton_settings_v2');
      const savedSTA = localStorage.getItem('badminton_singles_team_a');
      const savedSTB = localStorage.getItem('badminton_singles_team_b');
      const savedDTA = localStorage.getItem('badminton_doubles_team_a');
      const savedDTB = localStorage.getItem('badminton_doubles_team_b');

      if (savedSP) {
        const parsed = JSON.parse(savedSP);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSinglesParticipants(parsed);
        }
      }
      if (savedDP) {
        const parsed = JSON.parse(savedDP);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDoublesParticipants(parsed);
        }
      }
      if (savedSB) setSinglesBracket(JSON.parse(savedSB));
      if (savedDB) setDoublesBracket(JSON.parse(savedDB));
      if (savedPairs) setDoublesPairs(JSON.parse(savedPairs));
      if (savedSettings) setSettings(JSON.parse(savedSettings));

      if (savedSTA) setSinglesTeamA(savedSTA as TeamName);
      if (savedSTB) setSinglesTeamB(savedSTB as TeamName);
      if (savedDTA) setDoublesTeamA(savedDTA as TeamName);
      if (savedDTB) setDoublesTeamB(savedDTB as TeamName);

      // Backwards compatibility migration from legacy combined roster
      if (!savedSP && !savedDP) {
        const legacyP = localStorage.getItem('badminton_participants_v2');
        if (legacyP) {
          const parsedLegacy: Participant[] = JSON.parse(legacyP);
          if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
            const sPlayers = parsedLegacy.filter((p) => p.singlesRegistered);
            const dPlayers = parsedLegacy.filter((p) => p.doublesRegistered);
            setSinglesParticipants(sPlayers);
            setDoublesParticipants(dPlayers);
            if (dPlayers.length > 0) {
              setDoublesPairs(generateDoublesPairs(dPlayers, []));
            }
          }
        }
      }
    } catch (e) {
      console.warn('Error reading from localStorage:', e);
    }
  }, []);

  // Sync state changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('badminton_singles_participants_v3', JSON.stringify(singlesParticipants));
    } catch (e) {}
  }, [singlesParticipants]);

  useEffect(() => {
    try {
      localStorage.setItem('badminton_doubles_participants_v3', JSON.stringify(doublesParticipants));
    } catch (e) {}
  }, [doublesParticipants]);

  useEffect(() => {
    try {
      if (singlesBracket) {
        localStorage.setItem('badminton_singles_bracket_v2', JSON.stringify(singlesBracket));
      } else {
        localStorage.removeItem('badminton_singles_bracket_v2');
      }
    } catch (e) {}
  }, [singlesBracket]);

  useEffect(() => {
    try {
      if (doublesBracket) {
        localStorage.setItem('badminton_doubles_bracket_v2', JSON.stringify(doublesBracket));
      } else {
        localStorage.removeItem('badminton_doubles_bracket_v2');
      }
    } catch (e) {}
  }, [doublesBracket]);

  useEffect(() => {
    try {
      if (doublesPairs.length > 0) {
        localStorage.setItem('badminton_doubles_pairs_v2', JSON.stringify(doublesPairs));
      } else {
        localStorage.removeItem('badminton_doubles_pairs_v2');
      }
    } catch (e) {}
  }, [doublesPairs]);

  useEffect(() => {
    try {
      localStorage.setItem('badminton_settings_v2', JSON.stringify(settings));
    } catch (e) {}
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem('badminton_singles_team_a', singlesTeamA);
      localStorage.setItem('badminton_singles_team_b', singlesTeamB);
      localStorage.setItem('badminton_doubles_team_a', doublesTeamA);
      localStorage.setItem('badminton_doubles_team_b', doublesTeamB);
    } catch (e) {}
  }, [singlesTeamA, singlesTeamB, doublesTeamA, doublesTeamB]);

  // Derived Complementary Matchups
  const singlesComplementary = useMemo(() => {
    try {
      return getComplementaryMatchup(singlesTeamA, singlesTeamB);
    } catch {
      return ['Blue Team', 'Grey Team'] as [TeamName, TeamName];
    }
  }, [singlesTeamA, singlesTeamB]);

  const doublesComplementary = useMemo(() => {
    try {
      return getComplementaryMatchup(doublesTeamA, doublesTeamB);
    } catch {
      return ['Blue Team', 'Grey Team'] as [TeamName, TeamName];
    }
  }, [doublesTeamA, doublesTeamB]);

  // Combined Participants Roster for full table view
  const allCombinedParticipants = useMemo(() => {
    const map = new Map<string, Participant>();
    singlesParticipants.forEach((p) => {
      map.set(p.name.toLowerCase() + '_' + p.team, {
        ...p,
        singlesRegistered: true,
        doublesRegistered: false,
      });
    });
    doublesParticipants.forEach((p) => {
      const key = p.name.toLowerCase() + '_' + p.team;
      const existing = map.get(key);
      if (existing) {
        existing.doublesRegistered = true;
      } else {
        map.set(key, {
          ...p,
          singlesRegistered: false,
          doublesRegistered: true,
        });
      }
    });
    return Array.from(map.values());
  }, [singlesParticipants, doublesParticipants]);

  // ACTION: Dedicated Upload for Singles
  const handleUploadSinglesFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rawRecords = await parseParticipantFile(file);
      const { rows } = processParticipantRows(rawRecords, 'singles-only', []);
      const validSingles = rows
        .filter((r) => r.isValid)
        .map((r) => ({
          id: r.id,
          name: r.name,
          team: r.team as TeamName,
          office: (r.office || 'Guindy') as any,
          gender: (r.gender || 'Men') as any,
          singlesRegistered: true,
          doublesRegistered: false,
          source: 'upload' as const,
        }));

      if (validSingles.length === 0) {
        alert('No valid participants found. Please ensure the file contains employee names under team columns (Red, Blue, Grey, White).');
        return;
      }

      setSinglesParticipants(validSingles);
      setSinglesBracket(null);
      setActiveTab('singles');
    } catch (err: any) {
      alert(`Error reading file: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      if (singlesFileInputRef.current) singlesFileInputRef.current.value = '';
    }
  };

  // ACTION: Dedicated Upload for Doubles
  const handleUploadDoublesFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rawRecords = await parseParticipantFile(file);
      const { rows } = processParticipantRows(rawRecords, 'doubles-only', []);
      const validDoubles = rows
        .filter((r) => r.isValid)
        .map((r) => ({
          id: r.id,
          name: r.name,
          team: r.team as TeamName,
          office: (r.office || 'Guindy') as any,
          gender: (r.gender || 'Men') as any,
          singlesRegistered: false,
          doublesRegistered: true,
          source: 'upload' as const,
        }));

      if (validDoubles.length === 0) {
        alert('No valid participants found. Please ensure the file contains employee names under team columns (Red, Blue, Grey, White).');
        return;
      }

      setDoublesParticipants(validDoubles);
      setDoublesBracket(null);
      // Immediately pair players within their teams alphabetically
      const generatedPairs = generateDoublesPairs(validDoubles, []);
      setDoublesPairs(generatedPairs);
      setActiveTab('doubles');
    } catch (err: any) {
      alert(`Error reading file: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      if (doublesFileInputRef.current) doublesFileInputRef.current.value = '';
    }
  };

  // ACTION: Load Sample Roster for Singles (69 Players from screenshot)
  const handleLoadSampleSingles = () => {
    const sampleSingles = getRealCompanyParticipants('singles');
    setSinglesParticipants(sampleSingles);
    setSinglesBracket(null);
    setActiveTab('singles');
  };

  // ACTION: Load Sample Roster for Doubles (69 Players from screenshot)
  const handleLoadSampleDoubles = () => {
    const sampleDoubles = getRealCompanyParticipants('doubles');
    setDoublesParticipants(sampleDoubles);
    setDoublesBracket(null);
    // Immediately pair within teams alphabetically
    const pairs = generateDoublesPairs(sampleDoubles, []);
    setDoublesPairs(pairs);
    setActiveTab('doubles');
  };

  // ACTION: Generate Singles Fixtures based on Alphabetical Order
  const handleGenerateSinglesFixtures = () => {
    if (singlesParticipants.length < 2) {
      alert('At least 2 Singles participants are required to generate fixtures.');
      return;
    }

    try {
      const newBracket = createKnockoutBracket(
        'Singles',
        singlesParticipants,
        [],
        {
          category: 'Singles',
          firstTeamA: singlesTeamA,
          firstTeamB: singlesTeamB,
        },
        settings
      );
      setSinglesBracket(newBracket);
    } catch (e: any) {
      alert(e.message || 'Error generating Singles fixtures');
    }
  };

  // ACTION: Generate Doubles Fixtures based on Alphabetical Pairs
  const handleGenerateDoublesFixtures = () => {
    if (doublesPairs.length < 2) {
      alert(`Cannot generate Doubles bracket with only ${doublesPairs.length} pair(s). At least 2 pairs are required.`);
      return;
    }

    try {
      const newBracket = createKnockoutBracket(
        'Doubles',
        doublesParticipants,
        doublesPairs,
        {
          category: 'Doubles',
          firstTeamA: doublesTeamA,
          firstTeamB: doublesTeamB,
        },
        settings
      );
      setDoublesBracket(newBracket);
    } catch (e: any) {
      alert(e.message || 'Error generating Doubles fixtures');
    }
  };

  // ACTION: Clear Everything / Reset to Initial State
  const handleClearAllData = () => {
    if (!window.confirm('Reset all badminton participants and generated brackets? This action cannot be undone.')) {
      return;
    }
    setSinglesParticipants([]);
    setDoublesParticipants([]);
    setSinglesBracket(null);
    setDoublesBracket(null);
    setDoublesPairs([]);
    localStorage.removeItem('badminton_singles_participants_v3');
    localStorage.removeItem('badminton_doubles_participants_v3');
    localStorage.removeItem('badminton_singles_bracket_v2');
    localStorage.removeItem('badminton_doubles_bracket_v2');
    localStorage.removeItem('badminton_doubles_pairs_v2');
    localStorage.removeItem('badminton_participants_v2');
    setActiveTab('singles');
  };

  // Helper: Group and sort players in alphabetical order by team
  const singlesByTeam = useMemo(() => {
    const map = new Map<TeamName, Participant[]>();
    TEAM_NAMES.forEach((t) => map.set(t, []));
    singlesParticipants.forEach((p) => {
      if (map.has(p.team)) map.get(p.team)!.push(p);
    });
    // Sort alphabetically (A-Z)
    TEAM_NAMES.forEach((t) => {
      map.get(t)!.sort((a, b) => a.name.localeCompare(b.name));
    });
    return map;
  }, [singlesParticipants]);

  const doublesByTeam = useMemo(() => {
    const map = new Map<TeamName, Participant[]>();
    TEAM_NAMES.forEach((t) => map.set(t, []));
    doublesParticipants.forEach((p) => {
      if (map.has(p.team)) map.get(p.team)!.push(p);
    });
    TEAM_NAMES.forEach((t) => {
      map.get(t)!.sort((a, b) => a.name.localeCompare(b.name));
    });
    return map;
  }, [doublesParticipants]);

  // Color badges helper
  const getTeamBadge = (team: TeamName) => {
    switch (team) {
      case 'Blue Team':
        return 'bg-blue-600 text-white';
      case 'White Team':
        return 'bg-slate-200 text-slate-900 border border-slate-300';
      case 'Red Team':
        return 'bg-rose-600 text-white';
      case 'Grey Team':
        return 'bg-slate-700 text-white';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  // Check if anything has been loaded yet
  const hasAnyData = singlesParticipants.length > 0 || doublesParticipants.length > 0;

  return (
    <div className="space-y-6">
      {/* Hidden File Inputs for Dedicated Uploads */}
      <input
        ref={singlesFileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleUploadSinglesFile}
      />
      <input
        ref={doublesFileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleUploadDoublesFile}
      />

      {/* ========================================================================= */}
      {/* APPLICATION HEADER BAR */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-3xl text-white shadow-xl border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
              Tournament Studio
            </span>
            <span className="text-xs text-slate-400">Solidpro Badminton Championship</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-amber-400" />
            <span>Badminton Fixtures &amp; Knockout Generator</span>
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Upload participant lists for Singles &amp; Doubles separately, select competing teams head-to-head, and generate single-elimination fixtures in alphabetical order.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Settings */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-blue-300" />
            <span>Settings</span>
          </button>

          {/* Download Templates Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTemplateMenu(!showTemplateMenu)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-300" />
              <span>Templates</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
            </button>

            {showTemplateMenu && (
              <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 text-xs text-slate-800">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Spreadsheet Templates
                </div>
                {/* 4-Team Columns Template (matches user's screenshot format) */}
                <button
                  type="button"
                  onClick={() => {
                    downloadCSV(generateTeamColumnsCSV(), 'badminton_4teams_roster.csv');
                    setShowTemplateMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-bold text-blue-700 bg-blue-50/50"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span>4-Team Format (S.No, Red, Blue, Grey, White)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadCSV(generateCombinedParticipationCSV(), 'badminton_combined_template.csv');
                    setShowTemplateMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Standard Combined List CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadCSV(generateSinglesOnlyCSV(), 'badminton_singles_template.csv');
                    setShowTemplateMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Singles-Only CSV</span>
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
                  <span>Doubles-Only CSV</span>
                </button>
              </div>
            )}
          </div>

          {/* Reset All */}
          {hasAnyData && (
            <button
              type="button"
              onClick={handleClearAllData}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-300 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 rounded-xl transition-colors cursor-pointer"
              title="Reset all participants and brackets"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* INITIAL STATE: THREE CLEAR ACTION CARDS (WHEN NO DATA LOADED) */}
      {/* ========================================================================= */}
      {!hasAnyData && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-8 sm:p-12 text-center space-y-8 animate-in fade-in duration-200">
          <div className="max-w-2xl mx-auto space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center mx-auto text-3xl shadow-lg shadow-indigo-600/20">
              🏸
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              Get Started: Load Tournament Data
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed max-w-xl mx-auto">
              Upload your employee list for Singles and Doubles separately using your 4-team spreadsheet format (<strong>Red</strong>, <strong>Blue</strong>, <strong>Grey</strong>, <strong>White</strong>), or load the company sample roster.
            </p>
          </div>

          {/* THREE DEDICATED ACTION CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto text-left">
            {/* Card 1: Upload Singles List */}
            <div
              onClick={() => singlesFileInputRef.current?.click()}
              className="p-6 rounded-2xl border-2 border-dashed border-blue-300 hover:border-blue-600 bg-blue-50/40 hover:bg-blue-50/80 transition-all cursor-pointer group flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <User className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-blue-100 text-blue-800">
                      Singles
                    </span>
                    <h4 className="font-extrabold text-slate-900 text-base group-hover:text-blue-700">
                      Upload Singles List
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Upload CSV or Excel file with Red, Blue, Grey, and White columns. Automatically registers all players for Singles, shows team counts, asks for team matchup, and generates alphabetical fixtures.
                  </p>
                </div>
              </div>
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 group-hover:underline">
                  <span>Browse Singles File</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* Card 2: Upload Doubles List */}
            <div
              onClick={() => doublesFileInputRef.current?.click()}
              className="p-6 rounded-2xl border-2 border-dashed border-purple-300 hover:border-purple-600 bg-purple-50/40 hover:bg-purple-50/80 transition-all cursor-pointer group flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <Users className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-800">
                      Doubles
                    </span>
                    <h4 className="font-extrabold text-slate-900 text-base group-hover:text-purple-700">
                      Upload Doubles List
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Upload CSV or Excel file for Doubles. All players will automatically be paired within their teams, with pairing review &amp; partner swap before selecting competing teams.
                  </p>
                </div>
              </div>
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 group-hover:underline">
                  <span>Browse Doubles File</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* Card 3: Load Sample Data */}
            <div className="p-6 rounded-2xl border-2 border-slate-200 hover:border-indigo-500 bg-slate-50/50 hover:bg-indigo-50/30 transition-all group flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-indigo-100 text-indigo-800">
                      Sample Data
                    </span>
                    <h4 className="font-extrabold text-slate-900 text-base group-hover:text-indigo-700">
                      Load 69 Player Roster
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Try the tournament studio instantly with the 69 company employees (Red: 10, Blue: 23, Grey: 18, White: 18).
                  </p>
                </div>
              </div>
              <div className="pt-2 space-y-1.5">
                <button
                  type="button"
                  onClick={handleLoadSampleSingles}
                  className="w-full px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-100/70 hover:bg-blue-200/80 rounded-xl transition-colors text-left flex items-center justify-between cursor-pointer"
                >
                  <span>Load for Singles (69 Players)</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={handleLoadSampleDoubles}
                  className="w-full px-3 py-1.5 text-xs font-bold text-purple-700 bg-purple-100/70 hover:bg-purple-200/80 rounded-xl transition-colors text-left flex items-center justify-between cursor-pointer"
                >
                  <span>Load for Doubles (69 Players)</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleLoadSampleSingles();
                    handleLoadSampleDoubles();
                  }}
                  className="w-full px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-100/70 hover:bg-indigo-200/80 rounded-xl transition-colors text-left flex items-center justify-between cursor-pointer"
                >
                  <span>Load for Both Singles &amp; Doubles</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Download CSV Templates Link */}
          <div className="pt-2 border-t border-slate-100 max-w-md mx-auto text-center">
            <span className="text-xs text-slate-500">
              Need the spreadsheet template?{' '}
              <button
                type="button"
                onClick={() => downloadCSV(generateTeamColumnsCSV(), 'badminton_4teams_roster.csv')}
                className="font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
              >
                Download 4-Team Format CSV
              </button>
            </span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* WORKFLOW NAVIGATION (WHEN AT LEAST ONE CATEGORY HAS DATA LOADED) */}
      {/* ========================================================================= */}
      {hasAnyData && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Tab 1: Singles Knockout */}
              <button
                type="button"
                onClick={() => setActiveTab('singles')}
                className={`px-4 py-2.5 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                  activeTab === 'singles'
                    ? 'bg-blue-600 text-white shadow-blue-500/20'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Singles Knockout</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    activeTab === 'singles' ? 'bg-blue-800 text-blue-100' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {singlesBracket
                    ? `${singlesBracket.totalParticipants} Players`
                    : `${singlesParticipants.length} Loaded`}
                </span>
              </button>

              {/* Tab 2: Doubles Knockout */}
              <button
                type="button"
                onClick={() => setActiveTab('doubles')}
                className={`px-4 py-2.5 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                  activeTab === 'doubles'
                    ? 'bg-purple-600 text-white shadow-purple-500/20'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Doubles Knockout</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    activeTab === 'doubles' ? 'bg-purple-800 text-purple-100' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {doublesBracket
                    ? `${doublesBracket.totalParticipants} Pairs`
                    : doublesPairs.length > 0
                    ? `${doublesPairs.length} Pairs`
                    : `${doublesParticipants.length} Loaded`}
                </span>
              </button>

              {/* Tab 3: Full Roster */}
              <button
                type="button"
                onClick={() => setActiveTab('all-roster')}
                className={`px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'all-roster'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <ListOrdered className="w-4 h-4" />
                <span>Full Roster</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                    activeTab === 'all-roster' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {allCombinedParticipants.length}
                </span>
              </button>
            </div>

            {/* Quick Upload Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => singlesFileInputRef.current?.click()}
                className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload Singles</span>
              </button>
              <button
                type="button"
                onClick={() => doublesFileInputRef.current?.click()}
                className="px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload Doubles</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 1. SINGLES WORKFLOW VIEW */}
          {/* ========================================================================= */}
          {activeTab === 'singles' && (
            <div className="space-y-6">
              {/* If no singles data loaded yet, show dedicated upload card for Singles */}
              {singlesParticipants.length === 0 && (
                <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto text-xl">
                    🏸
                  </div>
                  <h4 className="text-lg font-extrabold text-slate-900">
                    No Singles Participants Loaded Yet
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Upload your Singles participant list (CSV or Excel) or load the 69 company employees.
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => singlesFileInputRef.current?.click()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-2"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>Upload Singles File</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadSampleSingles}
                      className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 cursor-pointer flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Load 69 Sample Players</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Once Singles Data is loaded, show Employee Counts -> Select Matchup -> Generate */}
              {singlesParticipants.length > 0 && !singlesBracket && (
                <div className="space-y-6">
                  {/* STEP 1: EMPLOYEE COUNTS PER TEAM */}
                  <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-100 text-blue-800">
                          Step 1 of 2: Employee Counts
                        </span>
                        <h3 className="text-base font-extrabold text-slate-900 mt-1">
                          Singles Participants Loaded ({singlesParticipants.length} Players)
                        </h3>
                        <p className="text-xs text-slate-500">
                          Players listed in <strong>Alphabetical Order (A to Z)</strong> within each team.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => singlesFileInputRef.current?.click()}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-xl cursor-pointer"
                        >
                          Upload New File
                        </button>
                        <button
                          type="button"
                          onClick={() => setSinglesParticipants([])}
                          className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl cursor-pointer"
                        >
                          Clear Singles
                        </button>
                      </div>
                    </div>

                    {/* Team Distribution & Alphabetical Player List */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {TEAM_NAMES.map((team) => {
                        const teamPlayers = singlesByTeam.get(team) || [];
                        const isTeamA = team === singlesTeamA;
                        const isTeamB = team === singlesTeamB;

                        return (
                          <div
                            key={team}
                            className={`p-4 rounded-2xl border transition-all ${
                              isTeamA || isTeamB
                                ? 'border-blue-500 bg-blue-50/30 ring-2 ring-blue-500/20'
                                : 'border-slate-200 bg-slate-50/50'
                            } space-y-3`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold ${getTeamBadge(team)}`}>
                                {team}
                              </span>
                              <span className="text-xs font-black text-slate-800">
                                {teamPlayers.length} Players
                              </span>
                            </div>

                            <div className="max-h-48 overflow-y-auto space-y-1 pr-1 text-xs divide-y divide-slate-100">
                              {teamPlayers.map((p, idx) => (
                                <div
                                  key={p.id}
                                  className="flex items-center justify-between py-1 text-[11px]"
                                >
                                  <span className="font-bold text-slate-800 truncate mr-1">
                                    {idx + 1}. {p.name}
                                  </span>
                                  <span className="text-[9px] text-slate-400 uppercase font-mono">
                                    {p.id.replace('EMP-', '')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* STEP 2: SELECT WHICH TWO TEAMS FACE EACH OTHER */}
                  <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
                    <div className="border-b border-slate-100 pb-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-100 text-blue-800">
                        Step 2 of 2: Set Competing Teams
                      </span>
                      <h3 className="text-base font-extrabold text-slate-900 mt-1">
                        Which Two Teams Are Going to Face Each Other?
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Choose the two competing teams. Singles fixtures will pair each team&apos;s players in <strong>alphabetical order head-to-head</strong> (Team A #1 vs Team B #1, Team A #2 vs Team B #2, etc.).
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Primary Matchup Box */}
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 space-y-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 block">
                          Primary Matchup
                        </span>

                        <div className="flex items-center gap-3">
                          <div className="flex-1 space-y-1">
                            <label className="text-[10px] font-bold text-slate-600 uppercase">Team A</label>
                            <select
                              value={singlesTeamA}
                              onChange={(e) => {
                                const newA = e.target.value as TeamName;
                                setSinglesTeamA(newA);
                                if (newA === singlesTeamB) {
                                  const other = TEAM_NAMES.find((t) => t !== newA)!;
                                  setSinglesTeamB(other);
                                }
                              }}
                              className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl shadow-2xs focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            >
                              {TEAM_NAMES.map((t) => (
                                <option key={t} value={t}>
                                  {t} ({singlesByTeam.get(t)?.length || 0} players)
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="pt-4 text-xs font-black text-blue-600">VS</div>

                          <div className="flex-1 space-y-1">
                            <label className="text-[10px] font-bold text-slate-600 uppercase">Team B</label>
                            <select
                              value={singlesTeamB}
                              onChange={(e) => setSinglesTeamB(e.target.value as TeamName)}
                              className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl shadow-2xs focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            >
                              {TEAM_NAMES.filter((t) => t !== singlesTeamA).map((t) => (
                                <option key={t} value={t}>
                                  {t} ({singlesByTeam.get(t)?.length || 0} players)
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Complementary Matchup Box */}
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                          Complementary Matchup
                        </span>
                        <div className="pt-2 flex items-center justify-between text-xs font-bold text-slate-800">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold ${getTeamBadge(singlesComplementary[0])}`}>
                              {singlesComplementary[0]}
                            </span>
                            <span className="text-slate-500">({singlesByTeam.get(singlesComplementary[0])?.length || 0} players)</span>
                          </div>
                          <span className="text-xs font-black text-slate-400">VS</span>
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold ${getTeamBadge(singlesComplementary[1])}`}>
                              {singlesComplementary[1]}
                            </span>
                            <span className="text-slate-500">({singlesByTeam.get(singlesComplementary[1])?.length || 0} players)</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 italic">
                          Automatically computed from remaining teams to balance the knockout draw.
                        </p>
                      </div>
                    </div>

                    {/* Prominent Generate Button */}
                    <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-xs text-slate-600">
                        Teams selected: <strong>{singlesTeamA}</strong> vs <strong>{singlesTeamB}</strong> &amp; <strong>{singlesComplementary[0]}</strong> vs <strong>{singlesComplementary[1]}</strong>.
                      </div>

                      <button
                        type="button"
                        onClick={handleGenerateSinglesFixtures}
                        className="w-full sm:w-auto px-6 py-3 rounded-2xl font-black text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>Generate Singles Fixtures</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* If Singles Bracket is generated, show the Knockout Bracket View */}
              {singlesBracket && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800">
                        Fixtures Active
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        Singles Knockout Bracket ({singlesBracket.totalParticipants} Players)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSinglesBracket(null)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-xl cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reconfigure Matchup / Regenerate</span>
                    </button>
                  </div>

                  <KnockoutBracketView
                    category="Singles"
                    participants={singlesParticipants}
                    doublesPairs={doublesPairs}
                    onDoublesPairsChange={setDoublesPairs}
                    bracket={singlesBracket}
                    onBracketChange={setSinglesBracket}
                    otherCategoryBracket={doublesBracket}
                    settings={settings}
                    onBackToRoster={() => setSinglesBracket(null)}
                  />
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. DOUBLES WORKFLOW VIEW */}
          {/* ========================================================================= */}
          {activeTab === 'doubles' && (
            <div className="space-y-6">
              {/* If no doubles data loaded yet, show dedicated upload card for Doubles */}
              {doublesParticipants.length === 0 && (
                <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mx-auto text-xl">
                    👥
                  </div>
                  <h4 className="text-lg font-extrabold text-slate-900">
                    No Doubles Participants Loaded Yet
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Upload your Doubles participant list (CSV or Excel) or load the 69 company employees. Players will be paired within their teams.
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => doublesFileInputRef.current?.click()}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-2"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>Upload Doubles File</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadSampleDoubles}
                      className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-xl border border-purple-200 cursor-pointer flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Load 69 Sample Players</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Once Doubles Data is loaded:
                  1. Shows Employee Counts
                  2. Extra Flow: Partner Pairing within Teams
                  3. Select Matchup: Which two teams face each other
                  4. Generate Doubles Fixtures Button */}
              {doublesParticipants.length > 0 && !doublesBracket && (
                <div className="space-y-6">
                  {/* Summary Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black">
                        {doublesParticipants.length}
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900">
                          Doubles Participants &amp; Team Counts
                        </h4>
                        <p className="text-xs text-slate-500">
                          {doublesParticipants.length} players loaded across Red ({doublesByTeam.get('Red Team')?.length || 0}), Blue ({doublesByTeam.get('Blue Team')?.length || 0}), Grey ({doublesByTeam.get('Grey Team')?.length || 0}), White ({doublesByTeam.get('White Team')?.length || 0}).
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => doublesFileInputRef.current?.click()}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-xl cursor-pointer"
                      >
                        Upload New File
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDoublesParticipants([]);
                          setDoublesPairs([]);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl cursor-pointer"
                      >
                        Clear Doubles
                      </button>
                    </div>
                  </div>

                  {/* EXTRA FLOW FOR DOUBLES: PARTNER PAIRING WITHIN TEAMS */}
                  <div className="space-y-3">
                    <DoublesPairingReview
                      participants={doublesParticipants}
                      doublesPairs={doublesPairs}
                      onDoublesPairsChange={setDoublesPairs}
                      onRegeneratePairs={() => {
                        const refreshed = generateDoublesPairs(doublesParticipants, doublesPairs);
                        setDoublesPairs(refreshed);
                      }}
                      onConfirmAndGenerateFixtures={handleGenerateDoublesFixtures}
                      onBackToRoster={() => setDoublesParticipants([])}
                    />
                  </div>

                  {/* SELECT WHICH TWO TEAMS FACE EACH OTHER IN DOUBLES */}
                  <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
                    <div className="border-b border-slate-100 pb-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-800">
                        Doubles Matchup Selection
                      </span>
                      <h3 className="text-base font-extrabold text-slate-900 mt-1">
                        Which Two Teams Are Going to Face Each Other in Doubles?
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Select the competing teams. Their paired partnerships will compete head-to-head in the doubles knockout bracket.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Primary Matchup Box */}
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 space-y-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-purple-900 block">
                          Primary Matchup
                        </span>

                        <div className="flex items-center gap-3">
                          <div className="flex-1 space-y-1">
                            <label className="text-[10px] font-bold text-slate-600 uppercase">Team A</label>
                            <select
                              value={doublesTeamA}
                              onChange={(e) => {
                                const newA = e.target.value as TeamName;
                                setDoublesTeamA(newA);
                                if (newA === doublesTeamB) {
                                  const other = TEAM_NAMES.find((t) => t !== newA)!;
                                  setDoublesTeamB(other);
                                }
                              }}
                              className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl shadow-2xs focus:ring-2 focus:ring-purple-500 cursor-pointer"
                            >
                              {TEAM_NAMES.map((t) => {
                                const pCount = doublesPairs.filter((p) => p.team === t).length;
                                return (
                                  <option key={t} value={t}>
                                    {t} ({pCount} pairs)
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          <div className="pt-4 text-xs font-black text-purple-600">VS</div>

                          <div className="flex-1 space-y-1">
                            <label className="text-[10px] font-bold text-slate-600 uppercase">Team B</label>
                            <select
                              value={doublesTeamB}
                              onChange={(e) => setDoublesTeamB(e.target.value as TeamName)}
                              className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl shadow-2xs focus:ring-2 focus:ring-purple-500 cursor-pointer"
                            >
                              {TEAM_NAMES.filter((t) => t !== doublesTeamA).map((t) => {
                                const pCount = doublesPairs.filter((p) => p.team === t).length;
                                return (
                                  <option key={t} value={t}>
                                    {t} ({pCount} pairs)
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Complementary Matchup Box */}
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                          Complementary Matchup
                        </span>
                        <div className="pt-2 flex items-center justify-between text-xs font-bold text-slate-800">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold ${getTeamBadge(doublesComplementary[0])}`}>
                              {doublesComplementary[0]}
                            </span>
                            <span className="text-slate-500">
                              ({doublesPairs.filter((p) => p.team === doublesComplementary[0]).length} pairs)
                            </span>
                          </div>
                          <span className="text-xs font-black text-slate-400">VS</span>
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold ${getTeamBadge(doublesComplementary[1])}`}>
                              {doublesComplementary[1]}
                            </span>
                            <span className="text-slate-500">
                              ({doublesPairs.filter((p) => p.team === doublesComplementary[1]).length} pairs)
                            </span>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 italic">
                          Automatically computed from remaining teams for bracket balance.
                        </p>
                      </div>
                    </div>

                    {/* Prominent Generate Button */}
                    <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-xs text-slate-600">
                        Doubles pairings confirmed. Ready to generate single-elimination tournament bracket.
                      </div>

                      <button
                        type="button"
                        onClick={handleGenerateDoublesFixtures}
                        className="w-full sm:w-auto px-6 py-3 rounded-2xl font-black text-sm bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
                      >
                        <Users className="w-4 h-4 text-purple-200" />
                        <span>Generate Doubles Fixtures</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* If Doubles Bracket is generated, show the Knockout Bracket View */}
              {doublesBracket && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-800">
                        Fixtures Active
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        Doubles Knockout Bracket ({doublesBracket.totalParticipants} Pairs)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDoublesBracket(null)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-xl cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reconfigure Matchup / Manage Pairs</span>
                    </button>
                  </div>

                  <KnockoutBracketView
                    category="Doubles"
                    participants={doublesParticipants}
                    doublesPairs={doublesPairs}
                    onDoublesPairsChange={setDoublesPairs}
                    bracket={doublesBracket}
                    onBracketChange={setDoublesBracket}
                    otherCategoryBracket={singlesBracket}
                    settings={settings}
                    onBackToRoster={() => setDoublesBracket(null)}
                    onManagePartners={() => setDoublesBracket(null)}
                  />
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. FULL ROSTER TABLE VIEW */}
          {/* ========================================================================= */}
          {activeTab === 'all-roster' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                    All Registered Participants ({allCombinedParticipants.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Combined view of participants registered across Singles and Doubles tournaments.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSinglesParticipants(getRealCompanyParticipants('singles'));
                      setDoublesParticipants(getRealCompanyParticipants('doubles'));
                      const pairs = generateDoublesPairs(getRealCompanyParticipants('doubles'), []);
                      setDoublesPairs(pairs);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl cursor-pointer"
                  >
                    Load 69 Player Roster for Both
                  </button>
                </div>
              </div>

              <ParticipantsTable
                participants={allCombinedParticipants}
                filterCategory="All"
                onUpdateParticipant={(updated) => {
                  if (updated.singlesRegistered) {
                    setSinglesParticipants((prev) =>
                      prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
                    );
                  }
                  if (updated.doublesRegistered) {
                    setDoublesParticipants((prev) =>
                      prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
                    );
                  }
                }}
                onDeleteParticipant={(id) => {
                  setSinglesParticipants((prev) => prev.filter((p) => p.id !== id));
                  setDoublesParticipants((prev) => prev.filter((p) => p.id !== id));
                }}
                onAddParticipant={(newP) => {
                  if (newP.singlesRegistered) setSinglesParticipants((prev) => [...prev, newP]);
                  if (newP.doublesRegistered) setDoublesParticipants((prev) => [...prev, newP]);
                }}
              />
            </div>
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
