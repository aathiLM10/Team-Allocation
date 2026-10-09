'use client';

import React from 'react';
import { Settings2, ArrowRight } from 'lucide-react';
import { ColumnMapping } from '@/types/employee';

interface ColumnMapperProps {
  availableHeaders: string[];
  mapping: ColumnMapping;
  hasDefaultOffice?: boolean;
  onMappingChange: (newMapping: ColumnMapping) => void;
  onApplyMapping: () => void;
}

export function ColumnMapper({
  availableHeaders,
  mapping,
  hasDefaultOffice,
  onMappingChange,
  onApplyMapping,
}: ColumnMapperProps) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Settings2 className="w-5 h-5 text-slate-700" />
        <h3 className="text-sm font-semibold text-slate-900">
          Column Header Mapping
        </h3>
        <span className="text-xs text-slate-500 ml-auto">
          Match your file&apos;s columns to required employee attributes
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Name Column */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Employee Name Column <span className="text-rose-500">*</span>
          </label>
          <select
            value={mapping.nameColumn}
            onChange={(e) =>
              onMappingChange({ ...mapping, nameColumn: e.target.value })
            }
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
          >
            <option value="">-- Select Column --</option>
            {availableHeaders.map((header) => (
              <option key={header} value={header}>
                {header}
              </option>
            ))}
          </select>
        </div>

        {/* Gender Column */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Gender Column <span className="text-rose-500">*</span>
          </label>
          <select
            value={mapping.genderColumn}
            onChange={(e) =>
              onMappingChange({ ...mapping, genderColumn: e.target.value })
            }
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
          >
            <option value="">-- Select Column --</option>
            {availableHeaders.map((header) => (
              <option key={header} value={header}>
                {header}
              </option>
            ))}
          </select>
        </div>

        {/* Office Location Column */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Office Location Column <span className="text-rose-500">*</span>
          </label>
          <select
            value={mapping.officeColumn}
            onChange={(e) =>
              onMappingChange({ ...mapping, officeColumn: e.target.value })
            }
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
          >
            {hasDefaultOffice && (
              <option value="__DEFAULT_OFFICE__">
                [Inferred from separate office files]
              </option>
            )}
            <option value="">-- Select Column --</option>
            {availableHeaders.map((header) => (
              <option key={header} value={header}>
                {header}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onApplyMapping}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-blue-700 bg-blue-100/70 hover:bg-blue-200/80 rounded-lg transition-colors cursor-pointer"
        >
          Re-apply Column Mapping
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
