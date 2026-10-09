'use client';

import React, { useState, useMemo } from 'react';
import { TeamAllocation } from '@/types/employee';
import { exportSingleTeamCSV } from '@/lib/export/team-export';
import {
  Search,
  Building2,
  Users2,
  Copy,
  Check,
  Download,
} from 'lucide-react';

interface TeamCardProps {
  allocation: TeamAllocation;
}

const TEAM_THEMES = {
  white: {
    cardBorder: 'border-slate-300 ring-1 ring-slate-200/50',
    headerBg: 'bg-slate-100/90 border-b border-slate-200',
    titleColor: 'text-slate-900',
    badgeBg: 'bg-white text-slate-800 border border-slate-300 shadow-2xs',
    accentDot: 'bg-slate-400 ring-2 ring-slate-300',
    accentLine: 'border-t-2 border-slate-400',
    btnColor: 'text-slate-700 bg-white hover:bg-slate-50 border-slate-300',
  },
  red: {
    cardBorder: 'border-rose-200 ring-1 ring-rose-100',
    headerBg: 'bg-rose-50/70 border-b border-rose-200',
    titleColor: 'text-rose-950',
    badgeBg: 'bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs',
    accentDot: 'bg-rose-600 ring-2 ring-rose-300',
    accentLine: 'border-t-2 border-rose-500',
    btnColor: 'text-rose-800 bg-white hover:bg-rose-50 border-rose-200',
  },
  blue: {
    cardBorder: 'border-blue-200 ring-1 ring-blue-100',
    headerBg: 'bg-blue-50/70 border-b border-blue-200',
    titleColor: 'text-blue-950',
    badgeBg: 'bg-blue-100 text-blue-800 border border-blue-300 shadow-2xs',
    accentDot: 'bg-blue-600 ring-2 ring-blue-300',
    accentLine: 'border-t-2 border-blue-500',
    btnColor: 'text-blue-800 bg-white hover:bg-blue-50 border-blue-200',
  },
  grey: {
    cardBorder: 'border-zinc-300 ring-1 ring-zinc-200',
    headerBg: 'bg-zinc-100/80 border-b border-zinc-200',
    titleColor: 'text-zinc-900',
    badgeBg: 'bg-zinc-200 text-zinc-800 border border-zinc-300 shadow-2xs',
    accentDot: 'bg-zinc-700 ring-2 ring-zinc-400',
    accentLine: 'border-t-2 border-zinc-600',
    btnColor: 'text-zinc-800 bg-white hover:bg-zinc-50 border-zinc-300',
  },
};

export function TeamCard({ allocation }: TeamCardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  const theme = TEAM_THEMES[allocation.teamKey] || TEAM_THEMES.white;

  const filteredMembers = useMemo(() => {
    if (!searchTerm.trim()) return allocation.members;
    const q = searchTerm.toLowerCase();
    return allocation.members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.office.toLowerCase().includes(q) ||
        m.gender.toLowerCase().includes(q)
    );
  }, [allocation.members, searchTerm]);

  const handleCopyRoster = () => {
    const text = allocation.members
      .map((m, i) => `${i + 1}. ${m.name} (${m.gender}, ${m.office})`)
      .join('\n');
    navigator.clipboard.writeText(`${allocation.teamName} (${allocation.members.length} members):\n\n${text}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCSV = () => {
    exportSingleTeamCSV(allocation);
  };

  return (
    <div
      className={`bg-white rounded-xl border ${theme.cardBorder} ${theme.accentLine} shadow-2xs hover:shadow-xs transition-all flex flex-col h-full`}
    >
      {/* Header */}
      <div className={`p-4 rounded-t-xl ${theme.headerBg} flex items-center justify-between`}>
        <div className="flex items-center gap-2.5">
          <span className={`w-3 h-3 rounded-full ${theme.accentDot} shadow-2xs`} />
          <h3 className={`text-base font-bold ${theme.titleColor}`}>
            {allocation.teamName}
          </h3>
          <span
            className={`px-2 py-0.5 text-xs font-semibold rounded-full ${theme.badgeBg}`}
          >
            {allocation.stats.total}
          </span>
        </div>

        {/* Header Actions: Copy Roster & Download CSV */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopyRoster}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-md transition-colors"
            title="Copy roster to clipboard"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadCSV}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-colors shadow-2xs cursor-pointer ${theme.btnColor}`}
            title={`Download ${allocation.teamName} CSV`}
          >
            <Download className="w-3 h-3" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Metrics Breakdown Grid */}
      <div className="p-3.5 border-b border-slate-100 bg-slate-50/50">
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Office Representation */}
          <div className="p-2.5 bg-white rounded-lg border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-1">
              <Building2 className="w-3 h-3 text-slate-400" />
              Offices
            </span>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-600">Guindy:</span>
              <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded text-[11px] border border-emerald-100">
                {allocation.stats.guindy}
              </span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-600">Vandaloor:</span>
              <span className="font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded text-[11px] border border-indigo-100">
                {allocation.stats.vandaloor}
              </span>
            </div>
          </div>

          {/* Gender Representation */}
          <div className="p-2.5 bg-white rounded-lg border border-slate-200/90 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-1">
              <Users2 className="w-3 h-3 text-slate-400" />
              Gender
            </span>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-600">Men:</span>
              <span className="font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded text-[11px] border border-blue-100">
                {allocation.stats.men}
              </span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-600">Women:</span>
              <span className="font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded text-[11px] border border-rose-100">
                {allocation.stats.women}
              </span>
            </div>
            {allocation.stats.unspecified > 0 && (
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-600">Unspecified:</span>
                <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded text-[11px] border border-amber-100">
                  {allocation.stats.unspecified}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Member Search */}
      <div className="p-2.5 border-b border-slate-100">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder={`Search ${allocation.teamName}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
          />
        </div>
      </div>

      {/* Member Roster List */}
      <div className="flex-1 overflow-y-auto max-h-64 p-2 divide-y divide-slate-100">
        {filteredMembers.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No team members found
          </div>
        ) : (
          filteredMembers.map((member, idx) => (
            <div
              key={member.id}
              className="py-1.5 px-2 flex items-center justify-between hover:bg-slate-50/80 rounded transition-colors text-xs"
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <span className="text-slate-400 font-mono text-[10px] w-5 text-right shrink-0">
                  {idx + 1}.
                </span>
                <span className="font-medium text-slate-800 truncate">
                  {member.name}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                    member.office === 'Guindy'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  }`}
                >
                  {member.office}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                    member.gender === 'Men'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : member.gender === 'Women'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {member.gender}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer count indicator & action */}
      <div className="p-2.5 bg-slate-50/80 rounded-b-xl border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span>
          {filteredMembers.length} of {allocation.members.length} members
        </span>
        <button
          type="button"
          onClick={handleDownloadCSV}
          className="text-blue-600 hover:text-blue-800 font-medium hover:underline flex items-center gap-1 cursor-pointer"
        >
          <Download className="w-3 h-3" />
          Download Team CSV
        </button>
      </div>
    </div>
  );
}
