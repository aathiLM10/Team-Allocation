'use client';

import React from 'react';
import { AllocationValidationReport } from '@/types/employee';
import { CheckCircle2, AlertTriangle, Info, ShieldCheck } from 'lucide-react';

interface ValidationSummaryProps {
  report: AllocationValidationReport;
}

export function ValidationSummary({ report }: ValidationSummaryProps) {
  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200">
        <ShieldCheck className="w-5 h-5 text-emerald-600" />
        <h3 className="text-base font-semibold text-slate-900">
          Allocation Audit & Validation Report
        </h3>
        <span
          className={`ml-auto px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            report.isValid
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              : 'bg-amber-100 text-amber-800 border border-amber-200'
          }`}
        >
          {report.isValid ? 'Audit Verified • Mathematically Optimal' : 'Audit Notice'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Passed Checks */}
        <div className="p-3.5 bg-emerald-50/40 rounded-lg border border-emerald-200">
          <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Integrity & Allocation Checks Passed
          </h4>
          <ul className="space-y-1.5 text-xs text-emerald-950">
            {report.passedChecks.map((check, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-emerald-500 font-bold">•</span>
                <span>{check}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Warnings or Unavoidable Imbalances */}
        <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-blue-600" />
            Data Distribution Limitations & Transparency
          </h4>
          {report.unavoidableImbalances.length === 0 ? (
            <p className="text-xs text-slate-600">
              No mathematical remainder issues. All office and gender distributions split evenly across the 4 teams.
            </p>
          ) : (
            <ul className="space-y-1.5 text-xs text-slate-700">
              {report.unavoidableImbalances.map((note, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-slate-400 font-bold">•</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          )}

          {report.warnings.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <h5 className="text-[11px] font-bold text-amber-800 uppercase flex items-center gap-1 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Allocation Notices
              </h5>
              <ul className="space-y-1 text-xs text-amber-900">
                {report.warnings.map((w, idx) => (
                  <li key={idx} className="flex items-start gap-1">
                    <span className="text-amber-500">•</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
