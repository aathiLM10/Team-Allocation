'use client';

import React, { useState } from 'react';
import { AllocationDiff } from '@/types/employee';
import { Shuffle, ArrowRight, X, Search, CheckCircle } from 'lucide-react';

interface AllocationDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  diffs: AllocationDiff[];
  totalEmployees: number;
}

export function AllocationDiffModal({
  isOpen,
  onClose,
  diffs,
  totalEmployees,
}: AllocationDiffModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredDiffs = diffs.filter(
    (d) =>
      d.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.previousTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.newTeam.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const retainedCount = totalEmployees - diffs.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shuffle className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-semibold text-slate-900">
              Reshuffle Movement Log
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overview Stats */}
        <div className="p-4 bg-blue-50/50 border-b border-blue-100 flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-slate-800">
              {diffs.length} employee{diffs.length === 1 ? '' : 's'} moved
            </span>{' '}
            <span className="text-slate-500">
              ({totalEmployees > 0 ? Math.round((diffs.length / totalEmployees) * 100) : 0}% of roster)
            </span>
          </div>
          <div className="text-slate-600">
            <span className="font-semibold text-emerald-700">{retainedCount}</span>{' '}
            stayed in the same team
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-200">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter moved employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-blue-500"
            />
          </div>
        </div>

        {/* Movements list */}
        <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-100">
          {diffs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
              <span>No employees moved. The allocation remained identical.</span>
            </div>
          ) : filteredDiffs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No moved employees match your search query.
            </div>
          ) : (
            filteredDiffs.map((diff) => (
              <div
                key={diff.employeeId}
                className="py-2.5 px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 rounded text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">
                    {diff.employeeName}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    {diff.office} • {diff.gender}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-medium">
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {diff.previousTeam}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    {diff.newTeam}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            Close Movement Log
          </button>
        </div>
      </div>
    </div>
  );
}
