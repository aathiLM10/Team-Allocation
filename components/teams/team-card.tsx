'use client';

import React, { useState, useMemo } from 'react';
import { TeamAllocation } from '@/types/employee';
import { exportSingleTeamCSV } from '@/lib/export/team-export';
import { TiltCard } from '@/components/ui/tilt-card';
import { AnimatedNumber } from '@/components/ui/animated-number';
import {
  Search,
  Building2,
  Users2,
  Copy,
  Check,
  Download,
  Sparkles,
} from 'lucide-react';

interface TeamCardProps {
  allocation: TeamAllocation;
  index?: number;
}

const TEAM_THEMES = {
  white: {
    cardBorder: 'border-slate-300/90 shadow-[0_8px_25px_rgba(15,23,42,0.06)]',
    headerBg: 'bg-gradient-to-b from-slate-100/90 to-white/80 border-b border-slate-200',
    titleColor: 'text-slate-900',
    badgeBg: 'bg-white text-slate-800 border border-slate-300 shadow-xs',
    accentDot: 'bg-slate-500 ring-2 ring-slate-300',
    accentLine: 'border-t-3 border-slate-400',
    btnColor: 'text-slate-700 bg-white hover:bg-slate-50 border-slate-300',
    barOfficeGuindy: 'bg-emerald-500',
    barOfficeVandaloor: 'bg-indigo-500',
    barGenderMen: 'bg-blue-500',
    barGenderWomen: 'bg-rose-500',
  },
  red: {
    cardBorder: 'border-rose-200/90 shadow-[0_8px_25px_rgba(220,38,38,0.06)]',
    headerBg: 'bg-gradient-to-b from-rose-50/90 to-white/80 border-b border-rose-200',
    titleColor: 'text-rose-950',
    badgeBg: 'bg-rose-100/90 text-rose-800 border border-rose-300 shadow-xs',
    accentDot: 'bg-rose-600 ring-2 ring-rose-300',
    accentLine: 'border-t-3 border-rose-500',
    btnColor: 'text-rose-800 bg-white hover:bg-rose-50 border-rose-200',
    barOfficeGuindy: 'bg-emerald-500',
    barOfficeVandaloor: 'bg-indigo-500',
    barGenderMen: 'bg-blue-500',
    barGenderWomen: 'bg-rose-500',
  },
  blue: {
    cardBorder: 'border-blue-200/90 shadow-[0_8px_25px_rgba(37,99,235,0.06)]',
    headerBg: 'bg-gradient-to-b from-blue-50/90 to-white/80 border-b border-blue-200',
    titleColor: 'text-blue-950',
    badgeBg: 'bg-blue-100/90 text-blue-800 border border-blue-300 shadow-xs',
    accentDot: 'bg-blue-600 ring-2 ring-blue-300',
    accentLine: 'border-t-3 border-blue-500',
    btnColor: 'text-blue-800 bg-white hover:bg-blue-50 border-blue-200',
    barOfficeGuindy: 'bg-emerald-500',
    barOfficeVandaloor: 'bg-indigo-500',
    barGenderMen: 'bg-blue-500',
    barGenderWomen: 'bg-rose-500',
  },
  grey: {
    cardBorder: 'border-slate-300/90 shadow-[0_8px_25px_rgba(71,85,105,0.06)]',
    headerBg: 'bg-gradient-to-b from-slate-100/90 to-white/80 border-b border-slate-200',
    titleColor: 'text-slate-900',
    badgeBg: 'bg-slate-200/80 text-slate-800 border border-slate-300 shadow-xs',
    accentDot: 'bg-slate-700 ring-2 ring-slate-400',
    accentLine: 'border-t-3 border-slate-600',
    btnColor: 'text-slate-800 bg-white hover:bg-slate-50 border-slate-300',
    barOfficeGuindy: 'bg-emerald-500',
    barOfficeVandaloor: 'bg-indigo-500',
    barGenderMen: 'bg-blue-500',
    barGenderWomen: 'bg-rose-500',
  },
};

export function TeamCard({ allocation, index = 0 }: TeamCardProps) {
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

  // Distribution percentages
  const total = allocation.stats.total || 1;
  const guindyPct = Math.round((allocation.stats.guindy / total) * 100);
  const vandaloorPct = 100 - guindyPct;
  const menPct = Math.round((allocation.stats.men / total) * 100);
  const womenPct = Math.round((allocation.stats.women / total) * 100);

  return (
    <TiltCard className="h-full">
      <div
        className={`bg-white rounded-2xl border ${theme.cardBorder} ${theme.accentLine} flex flex-col h-full transition-all duration-200 overflow-hidden relative`}
      >
        {/* Header */}
        <div className={`p-4 rounded-t-2xl ${theme.headerBg} flex items-center justify-between`}>
          <div className="flex items-center gap-2.5">
            <span className={`w-3 h-3 rounded-full ${theme.accentDot} shadow-xs shrink-0`} />
            <h3 className={`text-base font-bold ${theme.titleColor} tracking-tight`}>
              {allocation.teamName}
            </h3>
            <span
              className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${theme.badgeBg} flex items-center gap-1`}
            >
              <AnimatedNumber value={allocation.stats.total} />
            </span>
          </div>

          {/* Header Actions: Copy Roster & Download CSV */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyRoster}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-200"
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
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer ${theme.btnColor}`}
              title={`Download ${allocation.teamName} CSV`}
            >
              <Download className="w-3 h-3" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Visual Distribution Ratio Progress Bars */}
        <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 space-y-2.5">
          {/* Office Ratio Mini-Bar */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3 text-slate-400" />
                Guindy ({allocation.stats.guindy})
              </span>
              <span>Vandaloor ({allocation.stats.vandaloor})</span>
            </div>
            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${guindyPct}%` }}
                className="bg-emerald-600 transition-all duration-500"
                title={`Guindy: ${guindyPct}%`}
              />
              <div
                style={{ width: `${vandaloorPct}%` }}
                className="bg-indigo-600 transition-all duration-500"
                title={`Vandaloor: ${vandaloorPct}%`}
              />
            </div>
          </div>

          {/* Gender Ratio Mini-Bar */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <Users2 className="w-3 h-3 text-slate-400" />
                Men ({allocation.stats.men})
              </span>
              <span>Women ({allocation.stats.women})</span>
            </div>
            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${menPct}%` }}
                className="bg-blue-600 transition-all duration-500"
                title={`Men: ${menPct}%`}
              />
              <div
                style={{ width: `${womenPct}%` }}
                className="bg-rose-500 transition-all duration-500"
                title={`Women: ${womenPct}%`}
              />
            </div>
          </div>
        </div>

        {/* Member Search Bar */}
        <div className="p-2.5 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder={`Search ${allocation.teamName}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Member Roster List */}
        <div className="flex-1 overflow-y-auto max-h-60 p-2 divide-y divide-slate-100 bg-white">
          {filteredMembers.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No team members match search
            </div>
          ) : (
            filteredMembers.map((member, idx) => (
              <div
                key={member.id}
                className="py-1.5 px-2 flex items-center justify-between hover:bg-slate-50/90 rounded-md transition-colors text-xs"
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

        {/* Footer Roster Count */}
        <div className="p-2.5 bg-slate-50/90 rounded-b-2xl border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>
            {filteredMembers.length} of {allocation.members.length} members
          </span>
          <button
            type="button"
            onClick={handleDownloadCSV}
            className="text-blue-600 hover:text-blue-800 font-semibold hover:underline flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Download className="w-3 h-3" />
            Download Team CSV
          </button>
        </div>
      </div>
    </TiltCard>
  );
}
