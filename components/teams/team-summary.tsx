'use client';

import React from 'react';
import { TeamAllocation, AllocationValidationReport, EmployeeSummary } from '@/types/employee';
import { exportSummaryCSV } from '@/lib/export/team-export';
import { Scale, CheckCircle2, AlertCircle, Download } from 'lucide-react';

interface TeamSummaryProps {
  allocations: TeamAllocation[];
  validationReport: AllocationValidationReport;
  summary?: EmployeeSummary;
}

export function TeamSummary({
  allocations,
  validationReport,
  summary,
}: TeamSummaryProps) {
  const white = allocations.find((a) => a.teamKey === 'white');
  const red = allocations.find((a) => a.teamKey === 'red');
  const blue = allocations.find((a) => a.teamKey === 'blue');
  const grey = allocations.find((a) => a.teamKey === 'grey');

  const rows = [
    {
      metric: 'Total Employees',
      white: white?.stats.total ?? 0,
      red: red?.stats.total ?? 0,
      blue: blue?.stats.total ?? 0,
      grey: grey?.stats.total ?? 0,
      total: validationReport.totalAssigned,
      delta: validationReport.maxTeamSizeDelta,
      balanced: validationReport.isTeamSizeBalanced,
    },
    {
      metric: 'Guindy Office',
      white: white?.stats.guindy ?? 0,
      red: red?.stats.guindy ?? 0,
      blue: blue?.stats.guindy ?? 0,
      grey: grey?.stats.guindy ?? 0,
      total: allocations.reduce((s, a) => s + a.stats.guindy, 0),
      delta: validationReport.maxGuindyDelta,
      balanced: validationReport.maxGuindyDelta <= 1,
    },
    {
      metric: 'Vandaloor Office',
      white: white?.stats.vandaloor ?? 0,
      red: red?.stats.vandaloor ?? 0,
      blue: blue?.stats.vandaloor ?? 0,
      grey: grey?.stats.vandaloor ?? 0,
      total: allocations.reduce((s, a) => s + a.stats.vandaloor, 0),
      delta: validationReport.maxVandaloorDelta,
      balanced: validationReport.maxVandaloorDelta <= 1,
    },
    {
      metric: 'Men',
      white: white?.stats.men ?? 0,
      red: red?.stats.men ?? 0,
      blue: blue?.stats.men ?? 0,
      grey: grey?.stats.men ?? 0,
      total: allocations.reduce((s, a) => s + a.stats.men, 0),
      delta: validationReport.maxMenDelta,
      balanced: validationReport.maxMenDelta <= 1,
    },
    {
      metric: 'Women',
      white: white?.stats.women ?? 0,
      red: red?.stats.women ?? 0,
      blue: blue?.stats.women ?? 0,
      grey: grey?.stats.women ?? 0,
      total: allocations.reduce((s, a) => s + a.stats.women, 0),
      delta: validationReport.maxWomenDelta,
      balanced: validationReport.maxWomenDelta <= 1,
    },
    {
      metric: 'Unspecified / Other',
      white: white?.stats.unspecified ?? 0,
      red: red?.stats.unspecified ?? 0,
      blue: blue?.stats.unspecified ?? 0,
      grey: grey?.stats.unspecified ?? 0,
      total: allocations.reduce((s, a) => s + a.stats.unspecified, 0),
      delta: 0,
      balanced: true,
    },
  ];

  const handleDownloadSummaryCSV = () => {
    const fallbackSummary: EmployeeSummary = summary || {
      total: validationReport.totalAssigned,
      guindy: allocations.reduce((s, a) => s + a.stats.guindy, 0),
      vandaloor: allocations.reduce((s, a) => s + a.stats.vandaloor, 0),
      men: allocations.reduce((s, a) => s + a.stats.men, 0),
      women: allocations.reduce((s, a) => s + a.stats.women, 0),
      unspecified: allocations.reduce((s, a) => s + a.stats.unspecified, 0),
      hasErrors: false,
      hasWarnings: false,
      errorCount: 0,
      warningCount: 0,
    };
    exportSummaryCSV(allocations, validationReport, fallbackSummary);
  };

  return (
    <div className="bg-white rounded-xl shadow-2xs border border-slate-200/90 overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Team Balance Comparison Matrix
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            Target variance: ≤ 1
          </span>
          <button
            type="button"
            onClick={handleDownloadSummaryCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Download Summary CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-100/90 text-slate-700 font-semibold uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4 min-w-[160px]">Metric</th>
              <th className="py-3 px-3 text-center bg-slate-200/50">
                <span className="inline-block w-2 h-2 rounded-full bg-slate-400 mr-1.5 align-middle" />
                White Team
              </th>
              <th className="py-3 px-3 text-center bg-rose-50/60 text-rose-950">
                <span className="inline-block w-2 h-2 rounded-full bg-rose-600 mr-1.5 align-middle" />
                Red Team
              </th>
              <th className="py-3 px-3 text-center bg-blue-50/60 text-blue-950">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-600 mr-1.5 align-middle" />
                Blue Team
              </th>
              <th className="py-3 px-3 text-center bg-zinc-100 text-zinc-900">
                <span className="inline-block w-2 h-2 rounded-full bg-zinc-700 mr-1.5 align-middle" />
                Grey Team
              </th>
              <th className="py-3 px-3 text-center font-bold bg-slate-100">
                Total
              </th>
              <th className="py-3 px-3 text-center">Max Delta</th>
              <th className="py-3 px-4 text-center">Balance Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {rows.map((row) => (
              <tr key={row.metric} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-2.5 px-4 font-semibold text-slate-800">
                  {row.metric}
                </td>
                <td className="py-2.5 px-3 text-center font-medium text-slate-800 bg-slate-50/30">
                  {row.white}
                </td>
                <td className="py-2.5 px-3 text-center font-medium text-rose-900 bg-rose-50/20">
                  {row.red}
                </td>
                <td className="py-2.5 px-3 text-center font-medium text-blue-900 bg-blue-50/20">
                  {row.blue}
                </td>
                <td className="py-2.5 px-3 text-center font-medium text-zinc-900 bg-zinc-50/30">
                  {row.grey}
                </td>
                <td className="py-2.5 px-3 text-center font-bold text-slate-900 bg-slate-50/50">
                  {row.total}
                </td>
                <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-700">
                  {row.delta}
                </td>
                <td className="py-2.5 px-4 text-center">
                  {row.balanced ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Optimal (≤ 1)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800">
                      <AlertCircle className="w-3 h-3 text-amber-600" />
                      Delta {row.delta}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
