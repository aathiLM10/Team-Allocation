'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  BadmintonFixture,
  MatchCategory,
  MatchStatus,
  SchedulingSettings,
  DEFAULT_SCHEDULING_SETTINGS,
} from '@/types/fixture';
import { TeamAllocation, Employee, TeamName } from '@/types/employee';
import {
  detectAllFixtureConflicts,
  generateNextMatchId,
} from '@/lib/fixtures/fixture-validation';
import {
  exportMasterFixturesExcel,
  exportFixturesToCSV,
} from '@/lib/export/fixture-export';

import { FixtureModal } from './fixture-modal';
import { SchedulingSettingsModal } from './scheduling-settings-modal';
import { FixtureList } from './fixture-list';

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
} from 'lucide-react';

interface BadmintonDashboardProps {
  allocations: TeamAllocation[] | null;
  employees: Employee[];
  onNavigateToTeams?: () => void;
}

export function BadmintonDashboard({
  allocations,
  employees,
  onNavigateToTeams,
}: BadmintonDashboardProps) {
  // Fixtures State
  const [fixtures, setFixtures] = useState<BadmintonFixture[]>([]);
  const [settings, setSettings] = useState<SchedulingSettings>(DEFAULT_SCHEDULING_SETTINGS);
  const [activeTab, setActiveTab] = useState<MatchCategory | 'All'>('Singles');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFixture, setEditingFixture] = useState<BadmintonFixture | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [modalDefaultCategory, setModalDefaultCategory] = useState<MatchCategory>('Singles');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Fallback default teams if allocation has not been generated yet
  const effectiveAllocations: TeamAllocation[] = useMemo(() => {
    if (allocations && allocations.length > 0) return allocations;

    // Distribute uploaded employees into 4 placeholder teams if no allocation exists
    const teamNames: TeamName[] = ['White Team', 'Red Team', 'Blue Team', 'Grey Team'];
    const buckets: Record<TeamName, Employee[]> = {
      'White Team': [],
      'Red Team': [],
      'Blue Team': [],
      'Grey Team': [],
    };

    if (employees.length > 0) {
      employees.forEach((emp, i) => {
        buckets[teamNames[i % 4]].push(emp);
      });
    } else {
      // Sample mock members so the organizer can experiment even before uploading
      const sampleNames = [
        'Vignesh S', 'Arun Kumar', 'Suresh R', 'Hariharan K',
        'Karthik M', 'Praveen T', 'Naveen Kumar', 'Elangovan G',
        'Divya M', 'Kavitha R', 'Sneha P', 'Ananya S',
      ];
      sampleNames.forEach((name, i) => {
        buckets[teamNames[i % 4]].push({
          id: `sample-${i + 1}`,
          name,
          gender: i >= 8 ? 'Women' : 'Men',
          office: i % 2 === 0 ? 'Guindy' : 'Vandaloor',
        });
      });
    }

    return teamNames.map((tName) => ({
      teamName: tName,
      teamKey: tName.split(' ')[0].toLowerCase() as 'white' | 'red' | 'blue' | 'grey',
      members: buckets[tName],
      stats: {
        total: buckets[tName].length,
        guindy: buckets[tName].filter((e) => e.office === 'Guindy').length,
        vandaloor: buckets[tName].filter((e) => e.office === 'Vandaloor').length,
        men: buckets[tName].filter((e) => e.gender === 'Men').length,
        women: buckets[tName].filter((e) => e.gender === 'Women').length,
        unspecified: 0,
      },
    }));
  }, [allocations, employees]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedFixtures = localStorage.getItem('badminton_fixtures_v1');
      if (savedFixtures) {
        setFixtures(JSON.parse(savedFixtures));
      }
      const savedSettings = localStorage.getItem('badminton_settings_v1');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (e) {
      console.warn('Could not load stored badminton fixtures:', e);
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('badminton_fixtures_v1', JSON.stringify(fixtures));
    } catch (e) {
      console.warn('Could not save badminton fixtures:', e);
    }
  }, [fixtures]);

  useEffect(() => {
    try {
      localStorage.setItem('badminton_settings_v1', JSON.stringify(settings));
    } catch (e) {
      console.warn('Could not save badminton settings:', e);
    }
  }, [settings]);

  // Conflict calculation across all fixtures
  const conflictMap = useMemo(() => {
    return detectAllFixtureConflicts(fixtures, settings);
  }, [fixtures, settings]);

  const totalConflictsCount = useMemo(() => {
    let count = 0;
    conflictMap.forEach((conflicts) => {
      count += conflicts.length;
    });
    return Math.floor(count / 2); // Each pairwise conflict is mapped to both
  }, [conflictMap]);

  // Counts by category
  const singlesCount = useMemo(() => fixtures.filter((f) => f.category === 'Singles').length, [fixtures]);
  const doublesCount = useMemo(() => fixtures.filter((f) => f.category === 'Doubles').length, [fixtures]);

  // Create Handlers
  const handleOpenCreateModal = (category: MatchCategory = 'Singles') => {
    setEditingFixture(null);
    setIsDuplicate(false);
    setModalDefaultCategory(category);
    setIsModalOpen(true);
  };

  const handleEditFixture = (fixture: BadmintonFixture) => {
    setEditingFixture(fixture);
    setIsDuplicate(false);
    setModalDefaultCategory(fixture.category);
    setIsModalOpen(true);
  };

  const handleDuplicateFixture = (fixture: BadmintonFixture) => {
    setEditingFixture(fixture);
    setIsDuplicate(true);
    setModalDefaultCategory(fixture.category);
    setIsModalOpen(true);
  };

  const handleDeleteFixture = (fixtureId: string) => {
    if (window.confirm(`Are you sure you want to delete match ${fixtureId}?`)) {
      setFixtures((prev) => prev.filter((f) => f.id !== fixtureId));
    }
  };

  const handleUpdateStatus = (fixtureId: string, status: MatchStatus) => {
    setFixtures((prev) =>
      prev.map((f) => (f.id === fixtureId ? { ...f, status, updatedAt: Date.now() } : f))
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
      setIsModalOpen(false);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all configured badminton fixtures? This cannot be undone.')) {
      setFixtures([]);
    }
  };

  // Preload Sample Matchups (Red vs White Singles, Blue vs Grey Singles, Red vs Blue Doubles, White vs Grey Doubles)
  const handleLoadSampleMatchups = () => {
    const white = effectiveAllocations.find((t) => t.teamName === 'White Team')?.members || [];
    const red = effectiveAllocations.find((t) => t.teamName === 'Red Team')?.members || [];
    const blue = effectiveAllocations.find((t) => t.teamName === 'Blue Team')?.members || [];
    const grey = effectiveAllocations.find((t) => t.teamName === 'Grey Team')?.members || [];

    const samples: BadmintonFixture[] = [
      {
        id: 'M001',
        category: 'Singles',
        teamA: 'Red Team',
        teamAPlayers: red.slice(0, 1),
        teamB: 'White Team',
        teamBPlayers: white.slice(0, 1),
        court: settings.courtNames[0] || 'Court 1',
        scheduledDate: settings.defaultDate,
        scheduledTime: '10:00',
        round: 'Round 1',
        status: 'Scheduled',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'M002',
        category: 'Singles',
        teamA: 'Blue Team',
        teamAPlayers: blue.slice(0, 1),
        teamB: 'Grey Team',
        teamBPlayers: grey.slice(0, 1),
        court: settings.courtNames[1] || 'Court 2',
        scheduledDate: settings.defaultDate,
        scheduledTime: '10:00',
        round: 'Round 1',
        status: 'Scheduled',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'M003',
        category: 'Doubles',
        teamA: 'Red Team',
        teamAPlayers: red.slice(1, 3).length === 2 ? red.slice(1, 3) : red.slice(0, 2),
        teamB: 'Blue Team',
        teamBPlayers: blue.slice(1, 3).length === 2 ? blue.slice(1, 3) : blue.slice(0, 2),
        court: settings.courtNames[0] || 'Court 1',
        scheduledDate: settings.defaultDate,
        scheduledTime: '10:45',
        round: 'Round 1',
        status: 'Scheduled',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'M004',
        category: 'Doubles',
        teamA: 'White Team',
        teamAPlayers: white.slice(1, 3).length === 2 ? white.slice(1, 3) : white.slice(0, 2),
        teamB: 'Grey Team',
        teamBPlayers: grey.slice(1, 3).length === 2 ? grey.slice(1, 3) : grey.slice(0, 2),
        court: settings.courtNames[1] || 'Court 2',
        scheduledDate: settings.defaultDate,
        scheduledTime: '10:45',
        round: 'Round 1',
        status: 'Scheduled',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    setFixtures(samples);
  };

  // Export handlers
  const handleExportMasterExcel = async () => {
    if (fixtures.length === 0) {
      alert('Please configure at least one fixture before exporting.');
      return;
    }
    setIsExportingExcel(true);
    try {
      await exportMasterFixturesExcel(fixtures);
    } finally {
      setIsExportingExcel(false);
      setShowExportMenu(false);
    }
  };

  const handleExportCSV = (category?: MatchCategory) => {
    if (fixtures.length === 0) {
      alert('Please configure at least one fixture before exporting.');
      return;
    }
    exportFixturesToCSV(fixtures, category);
    setShowExportMenu(false);
  };

  return (
    <div className="space-y-6">
      {/* Informational Banner if using unallocated fallback */}
      {!allocations && (
        <div className="bg-blue-50/90 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5 text-xs text-blue-900">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            <span>
              <strong>Note:</strong> Teams have not been officially generated on Step 3 yet. Currently previewing with active roster players.
            </span>
          </div>
          {onNavigateToTeams && (
            <button
              type="button"
              onClick={onNavigateToTeams}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0"
            >
              Go to Step 3: Balanced Shuffle
            </button>
          )}
        </div>
      )}

      {/* Badminton Fixtures Studio Top Bar */}
      <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/90 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
              🏸
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-950 tracking-tight">
                  Badminton Fixtures Studio
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  Organizer-Controlled
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure custom Singles &amp; Doubles matchups with court scheduling, partner validation &amp; conflict detection.
              </p>
            </div>
          </div>
        </div>

        {/* Global Fixture Studio Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Scheduling Settings */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Configure courts and rematch rules"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>Scheduling Settings</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={fixtures.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
              <span>Export Fixtures</span>
              <ChevronDown className="w-3.5 h-3.5 text-emerald-200" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 text-xs animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Master Workbook (.xlsx)
                </div>
                <button
                  type="button"
                  onClick={handleExportMasterExcel}
                  disabled={isExportingExcel}
                  className="w-full px-3 py-2 text-left text-slate-800 hover:bg-emerald-50 hover:text-emerald-900 font-semibold flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    Master Excel (.xlsx)
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                    3 Sheets
                  </span>
                </button>

                <div className="my-1 border-t border-slate-100" />
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  CSV Exports (UTF-8)
                </div>

                <button
                  type="button"
                  onClick={() => handleExportCSV('Singles')}
                  className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-blue-500" />
                  Singles Fixtures CSV ({singlesCount})
                </button>

                <button
                  type="button"
                  onClick={() => handleExportCSV('Doubles')}
                  className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-purple-500" />
                  Doubles Fixtures CSV ({doublesCount})
                </button>

                <button
                  type="button"
                  onClick={() => handleExportCSV()}
                  className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  All Master Fixtures CSV ({fixtures.length})
                </button>
              </div>
            )}
          </div>

          {/* Primary: Create Fixture */}
          <button
            type="button"
            onClick={() => handleOpenCreateModal(activeTab === 'All' ? 'Singles' : activeTab)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors cursor-pointer uppercase tracking-wider"
          >
            <Plus className="w-4 h-4 text-blue-100" />
            <span>Create Fixture</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {/* Total Fixtures */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Matches
          </span>
          <span className="text-xl font-extrabold text-slate-900 mt-0.5 block">
            {fixtures.length}
          </span>
          <span className="text-[11px] text-slate-500">
            Across {settings.totalCourts} court{settings.totalCourts > 1 ? 's' : ''}
          </span>
        </div>

        {/* Singles */}
        <div className="p-3.5 rounded-xl bg-white border border-blue-200/90 shadow-2xs bg-blue-50/20">
          <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
            Singles Matches
          </span>
          <span className="text-xl font-extrabold text-blue-700 mt-0.5 block">
            {singlesCount}
          </span>
          <span className="text-[11px] text-blue-600">1 player per side</span>
        </div>

        {/* Doubles */}
        <div className="p-3.5 rounded-xl bg-white border border-purple-200/90 shadow-2xs bg-purple-50/20">
          <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">
            Doubles Matches
          </span>
          <span className="text-xl font-extrabold text-purple-700 mt-0.5 block">
            {doublesCount}
          </span>
          <span className="text-[11px] text-purple-600">2 partners per side</span>
        </div>

        {/* Completed */}
        <div className="p-3.5 rounded-xl bg-white border border-emerald-200/90 shadow-2xs bg-emerald-50/20">
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
            Completed Matches
          </span>
          <span className="text-xl font-extrabold text-emerald-700 mt-0.5 block">
            {fixtures.filter((f) => f.status === 'Completed').length}
          </span>
          <span className="text-[11px] text-emerald-600">
            {fixtures.length > 0
              ? `${Math.round((fixtures.filter((f) => f.status === 'Completed').length / fixtures.length) * 100)}% concluded`
              : '0% concluded'}
          </span>
        </div>

        {/* Conflicts Alert */}
        <div
          className={`p-3.5 rounded-xl border shadow-2xs ${
            totalConflictsCount > 0
              ? 'bg-amber-50/70 border-amber-300 text-amber-900'
              : 'bg-white border-slate-200/90 text-slate-600'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider block">
            Schedule Conflicts
          </span>
          <span className={`text-xl font-extrabold mt-0.5 block ${totalConflictsCount > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
            {totalConflictsCount}
          </span>
          <span className="text-[11px]">
            {totalConflictsCount > 0 ? 'Requires attention' : 'No conflicts found'}
          </span>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('Singles')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'Singles'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Singles Fixtures</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === 'Singles' ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {singlesCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('Doubles')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'Doubles'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Doubles Fixtures</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === 'Doubles' ? 'bg-purple-800 text-purple-100' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {doublesCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('All')}
            className={`px-3 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'All'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>All Fixtures</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === 'All' ? 'bg-slate-900 text-slate-300' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {fixtures.length}
            </span>
          </button>
        </div>

        {/* Secondary Quick Utilities */}
        <div className="flex items-center gap-2 text-xs">
          {fixtures.length === 0 && (
            <button
              type="button"
              onClick={handleLoadSampleMatchups}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              Load Sample Matchups
            </button>
          )}

          {fixtures.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Clear all fixtures"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Fixture List Component */}
      <FixtureList
        fixtures={fixtures}
        categoryTab={activeTab}
        conflictMap={conflictMap}
        onEditFixture={handleEditFixture}
        onDuplicateFixture={handleDuplicateFixture}
        onDeleteFixture={handleDeleteFixture}
        onUpdateStatus={handleUpdateStatus}
        onCreateFixture={handleOpenCreateModal}
      />

      {/* Create / Edit / Duplicate Modal */}
      <FixtureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaveFixture={handleSaveFixture}
        initialFixture={editingFixture}
        isDuplicate={isDuplicate}
        existingFixtures={fixtures}
        allocations={effectiveAllocations}
        settings={settings}
        defaultCategory={modalDefaultCategory}
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
