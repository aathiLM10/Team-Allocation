'use client';

import React, { useState, useMemo } from 'react';
import {
  BadmintonFixture,
  MatchCategory,
  MatchStatus,
  FixtureConflict,
} from '@/types/fixture';
import { TeamName } from '@/types/employee';
import {
  Edit2,
  Trash2,
  Copy,
  AlertTriangle,
  Clock,
  MapPin,
  Calendar,
  Layers,
  Search,
  Filter,
  CheckCircle2,
  Users,
  User,
  Activity,
  CalendarCheck,
} from 'lucide-react';

interface FixtureListProps {
  fixtures: BadmintonFixture[];
  categoryTab: MatchCategory | 'All';
  conflictMap: Map<string, FixtureConflict[]>;
  onEditFixture: (fixture: BadmintonFixture) => void;
  onDuplicateFixture: (fixture: BadmintonFixture) => void;
  onDeleteFixture: (fixtureId: string) => void;
  onUpdateStatus: (fixtureId: string, status: MatchStatus) => void;
  onCreateFixture: (category?: MatchCategory) => void;
}

export function FixtureList({
  fixtures,
  categoryTab,
  conflictMap,
  onEditFixture,
  onDuplicateFixture,
  onDeleteFixture,
  onUpdateStatus,
  onCreateFixture,
}: FixtureListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [teamFilter, setTeamFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [courtFilter, setCourtFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Filter logic
  const filteredFixtures = useMemo(() => {
    return fixtures.filter((f) => {
      // Category Tab
      if (categoryTab !== 'All' && f.category !== categoryTab) return false;

      // Status
      if (statusFilter !== 'All' && f.status !== statusFilter) return false;

      // Team
      if (teamFilter !== 'All' && f.teamA !== teamFilter && f.teamB !== teamFilter) {
        return false;
      }

      // Court
      if (courtFilter !== 'All' && f.court !== courtFilter) return false;

      // Search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const players = [
          ...f.teamAPlayers.map((p) => p.name.toLowerCase()),
          ...f.teamBPlayers.map((p) => p.name.toLowerCase()),
        ];
        const matchId = f.id.toLowerCase();
        const round = f.round.toLowerCase();
        const courtName = f.court.toLowerCase();

        return (
          matchId.includes(query) ||
          round.includes(query) ||
          courtName.includes(query) ||
          players.some((name) => name.includes(query))
        );
      }

      return true;
    });
  }, [fixtures, categoryTab, statusFilter, teamFilter, courtFilter, searchTerm]);

  // Extract unique courts for filter
  const availableCourts = useMemo(() => {
    const set = new Set<string>();
    fixtures.forEach((f) => {
      if (f.court) set.add(f.court);
    });
    return Array.from(set).sort();
  }, [fixtures]);

  const teamColors: Record<TeamName, { border: string; bg: string; text: string; badge: string }> = {
    'White Team': {
      border: 'border-slate-300',
      bg: 'bg-white',
      text: 'text-slate-800',
      badge: 'bg-slate-100 text-slate-800 border-slate-300',
    },
    'Red Team': {
      border: 'border-rose-200',
      bg: 'bg-rose-50/40',
      text: 'text-rose-700',
      badge: 'bg-rose-500 text-white border-rose-600',
    },
    'Blue Team': {
      border: 'border-blue-200',
      bg: 'bg-blue-50/40',
      text: 'text-blue-700',
      badge: 'bg-blue-600 text-white border-blue-700',
    },
    'Grey Team': {
      border: 'border-slate-300',
      bg: 'bg-slate-100/60',
      text: 'text-slate-700',
      badge: 'bg-slate-700 text-white border-slate-800',
    },
  };

  const getStatusBadge = (status: MatchStatus) => {
    switch (status) {
      case 'Scheduled':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'In Progress':
        return 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse';
      case 'Completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-300';
      case 'Cancelled':
        return 'bg-slate-100 text-slate-500 border-slate-200 line-through';
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-1 items-center gap-2">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search player, match ID, round..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Team Filter */}
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
          >
            <option value="All">All Teams</option>
            <option value="White Team">White Team</option>
            <option value="Red Team">Red Team</option>
            <option value="Blue Team">Blue Team</option>
            <option value="Grey Team">Grey Team</option>
          </select>

          {/* Court Filter */}
          {availableCourts.length > 0 && (
            <select
              value={courtFilter}
              onChange={(e) => setCourtFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
            >
              <option value="All">All Courts</option>
              {availableCourts.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
          >
            <option value="All">All Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        {/* View Switcher & Match Count */}
        <div className="flex items-center justify-between md:justify-end gap-3 text-slate-500">
          <span className="font-semibold text-slate-700">
            Showing {filteredFixtures.length} of {fixtures.length} matches
          </span>
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredFixtures.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto text-xl font-bold shadow-xs">
            🏸
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No Badminton Fixtures Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              {fixtures.length === 0
                ? 'No matches have been configured yet. Create individual Singles or Doubles fixtures manually to set up your tournament.'
                : 'No matches matched your search and filter criteria. Clear filters to see all fixtures.'}
            </p>
          </div>
          {fixtures.length === 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onCreateFixture(categoryTab === 'All' ? 'Singles' : categoryTab)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                + Create First Fixture
              </button>
            </div>
          )}
        </div>
      )}

      {/* CARD VIEW */}
      {filteredFixtures.length > 0 && viewMode === 'cards' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredFixtures.map((fixture) => {
            const conflicts = conflictMap.get(fixture.id) || [];
            const hasConflict = conflicts.length > 0;
            const colorA = teamColors[fixture.teamA] || teamColors['White Team'];
            const colorB = teamColors[fixture.teamB] || teamColors['Red Team'];

            return (
              <div
                key={fixture.id}
                className={`bg-white rounded-xl border transition-all duration-200 shadow-2xs overflow-hidden flex flex-col justify-between ${
                  hasConflict ? 'border-amber-300 ring-1 ring-amber-200/60' : 'border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                {/* Card Header */}
                <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                      {fixture.id}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        fixture.category === 'Singles'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-purple-50 text-purple-700 border-purple-200'
                      }`}
                    >
                      {fixture.category === 'Singles' ? (
                        <User className="w-2.5 h-2.5" />
                      ) : (
                        <Users className="w-2.5 h-2.5" />
                      )}
                      {fixture.category}
                    </span>
                    <span className="text-slate-500 font-medium text-[11px]">
                      {fixture.round}
                    </span>
                  </div>

                  {/* Status Dropdown */}
                  <div className="flex items-center gap-1.5">
                    <select
                      value={fixture.status}
                      onChange={(e) => onUpdateStatus(fixture.id, e.target.value as MatchStatus)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold border cursor-pointer focus:outline-hidden ${getStatusBadge(
                        fixture.status
                      )}`}
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Conflict Alert Banner if any */}
                {hasConflict && (
                  <div className="px-4 py-2 bg-amber-50/90 border-b border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      {conflicts.map((c, idx) => (
                        <div key={idx} className="font-medium">
                          {c.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Matchup Layout: Team A vs Team B */}
                <div className="p-4 grid grid-cols-11 gap-2 items-center">
                  {/* Side A */}
                  <div className={`col-span-5 p-3 rounded-xl border ${colorA.border} ${colorA.bg} space-y-2`}>
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${colorA.badge}`}>
                        {fixture.teamA}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {fixture.teamAPlayers.map((p, idx) => (
                        <div key={p.id} className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900 truncate">
                            {idx + 1}. {p.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {p.gender[0]} • {p.office[0]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* VS Indicator */}
                  <div className="col-span-1 flex flex-col items-center justify-center">
                    <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center font-black text-[10px] text-slate-600 shadow-2xs">
                      VS
                    </div>
                  </div>

                  {/* Side B */}
                  <div className={`col-span-5 p-3 rounded-xl border ${colorB.border} ${colorB.bg} space-y-2`}>
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${colorB.badge}`}>
                        {fixture.teamB}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {fixture.teamBPlayers.map((p, idx) => (
                        <div key={p.id} className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900 truncate">
                            {idx + 1}. {p.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {p.gender[0]} • {p.office[0]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Footer: Scheduling Details & Actions */}
                <div className="px-4 py-2.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-3 text-[11px] flex-wrap">
                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {fixture.court}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {fixture.scheduledDate}
                    </span>
                    <span className="flex items-center gap-1 font-mono font-medium text-slate-700">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {fixture.scheduledTime}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onDuplicateFixture(fixture)}
                      title="Duplicate as new draft fixture"
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditFixture(fixture)}
                      title="Edit fixture details"
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteFixture(fixture.id)}
                      title="Delete fixture"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TABLE VIEW */}
      {filteredFixtures.length > 0 && viewMode === 'table' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <th className="py-3 px-3">Match</th>
                <th className="py-3 px-2">Category</th>
                <th className="py-3 px-3">Round</th>
                <th className="py-3 px-3">Team A</th>
                <th className="py-3 px-3">Team A Players</th>
                <th className="py-3 px-1 text-center">VS</th>
                <th className="py-3 px-3">Team B</th>
                <th className="py-3 px-3">Team B Players</th>
                <th className="py-3 px-2">Court</th>
                <th className="py-3 px-3">Date &amp; Time</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFixtures.map((fixture) => {
                const conflicts = conflictMap.get(fixture.id) || [];
                const hasConflict = conflicts.length > 0;

                return (
                  <tr
                    key={fixture.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      hasConflict ? 'bg-amber-50/40' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      {fixture.id}
                      {hasConflict && (
                        <span title={conflicts[0]?.message}>
                          <AlertTriangle className="w-3 h-3 text-amber-500 inline ml-1" />
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          fixture.category === 'Singles'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-purple-50 text-purple-700'
                        }`}
                      >
                        {fixture.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-medium">{fixture.round}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">{fixture.teamA}</td>
                    <td className="py-2.5 px-3 text-slate-900">
                      {fixture.teamAPlayers.map((p) => p.name).join(' + ')}
                    </td>
                    <td className="py-2.5 px-1 text-center font-bold text-slate-400 text-[10px]">VS</td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">{fixture.teamB}</td>
                    <td className="py-2.5 px-3 text-slate-900">
                      {fixture.teamBPlayers.map((p) => p.name).join(' + ')}
                    </td>
                    <td className="py-2.5 px-2 text-slate-700 font-medium">{fixture.court}</td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono">
                      {fixture.scheduledDate} {fixture.scheduledTime}
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        value={fixture.status}
                        onChange={(e) => onUpdateStatus(fixture.id, e.target.value as MatchStatus)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${getStatusBadge(
                          fixture.status
                        )}`}
                      >
                        <option value="Scheduled">Scheduled</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onDuplicateFixture(fixture)}
                          title="Duplicate"
                          className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditFixture(fixture)}
                          title="Edit"
                          className="p-1 text-slate-500 hover:text-blue-600 rounded hover:bg-blue-50"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteFixture(fixture.id)}
                          title="Delete"
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
