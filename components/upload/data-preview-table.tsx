'use client';

import React, { useState, useMemo } from 'react';
import {
  Employee,
  ValidationError,
  EmployeeSummary,
  Gender,
  OfficeLocation,
} from '@/types/employee';
import {
  Search,
  AlertTriangle,
  XCircle,
  CheckCircle,
  Trash2,
  Users,
  ShieldAlert,
  Edit2,
  UserPlus,
} from 'lucide-react';

interface DataPreviewTableProps {
  employees: Employee[];
  errors: ValidationError[];
  summary: EmployeeSummary;
  onUpdateEmployee: (updated: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  onBulkFixGenderUnspecified: () => void;
  onEditEmployeeInForm?: (employee: Employee) => void;
  onOpenAddEmployee?: () => void;
}

export function DataPreviewTable({
  employees,
  errors,
  summary,
  onUpdateEmployee,
  onDeleteEmployee,
  onBulkFixGenderUnspecified,
  onEditEmployeeInForm,
  onOpenAddEmployee,
}: DataPreviewTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<
    'all' | 'errors' | 'warnings' | 'guindy' | 'vandaloor'
  >('all');

  // Map errors and warnings by record ID for quick lookup
  const errorMap = useMemo(() => {
    const map = new Map<string, ValidationError[]>();
    errors.forEach((err) => {
      const list = map.get(err.recordId) || [];
      list.push(err);
      map.set(err.recordId, list);
    });
    return map;
  }, [errors]);

  // Duplicate count
  const duplicateErrors = useMemo(() => {
    return errors.filter((e) => e.field === 'duplicate');
  }, [errors]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const recErrors = errorMap.get(emp.id) || [];
      const hasErrors = recErrors.some((e) => e.severity === 'error');
      const hasWarnings = recErrors.some((e) => e.severity === 'warning');

      if (filterMode === 'errors' && !hasErrors) return false;
      if (filterMode === 'warnings' && !hasWarnings) return false;
      if (filterMode === 'guindy' && emp.office !== 'Guindy') return false;
      if (filterMode === 'vandaloor' && emp.office !== 'Vandaloor') return false;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        return (
          emp.name.toLowerCase().includes(query) ||
          emp.office.toLowerCase().includes(query) ||
          emp.gender.toLowerCase().includes(query) ||
          emp.id.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [employees, errorMap, filterMode, searchTerm]);

  return (
    <div className="bg-white rounded-xl shadow-2xs border border-slate-200/90 overflow-hidden">
      {/* 1. Pre-allocation Metrics Summary Cards */}
      <div className="p-5 border-b border-slate-200 bg-slate-50/70">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            Step 2: Employee Distribution &amp; Validation Summary
          </h3>

          {onOpenAddEmployee && (
            <button
              type="button"
              onClick={onOpenAddEmployee}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100/80 border border-blue-200 rounded-md transition-colors shadow-2xs cursor-pointer self-start sm:self-auto"
            >
              <UserPlus className="w-3.5 h-3.5" />
              + Add Employee Manually
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Roster
            </span>
            <span className="text-xl font-bold text-slate-900 mt-1 block">
              {summary.total}
            </span>
            <span className="text-[11px] text-slate-400">Total employees</span>
          </div>

          {/* Guindy */}
          <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs bg-emerald-50/20">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
              Guindy
            </span>
            <span className="text-xl font-bold text-emerald-700 mt-1 block">
              {summary.guindy}
            </span>
            <span className="text-[11px] text-emerald-600">
              {summary.total > 0
                ? `${Math.round((summary.guindy / summary.total) * 100)}% of roster`
                : '0%'}
            </span>
          </div>

          {/* Vandaloor */}
          <div className="bg-white p-3 rounded-lg border border-indigo-200 shadow-2xs bg-indigo-50/20">
            <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">
              Vandaloor
            </span>
            <span className="text-xl font-bold text-indigo-700 mt-1 block">
              {summary.vandaloor}
            </span>
            <span className="text-[11px] text-indigo-600">
              {summary.total > 0
                ? `${Math.round((summary.vandaloor / summary.total) * 100)}% of roster`
                : '0%'}
            </span>
          </div>

          {/* Men */}
          <div className="bg-white p-3 rounded-lg border border-blue-200 shadow-2xs bg-blue-50/20">
            <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
              Men
            </span>
            <span className="text-xl font-bold text-blue-700 mt-1 block">
              {summary.men}
            </span>
            <span className="text-[11px] text-blue-600">
              {summary.total > 0
                ? `${Math.round((summary.men / summary.total) * 100)}% of roster`
                : '0%'}
            </span>
          </div>

          {/* Women */}
          <div className="bg-white p-3 rounded-lg border border-rose-200 shadow-2xs bg-rose-50/20">
            <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
              Women
            </span>
            <span className="text-xl font-bold text-rose-700 mt-1 block">
              {summary.women}
            </span>
            <span className="text-[11px] text-rose-600">
              {summary.total > 0
                ? `${Math.round((summary.women / summary.total) * 100)}% of roster`
                : '0%'}
            </span>
          </div>

          {/* Unspecified / Issues */}
          <div
            className={`bg-white p-3 rounded-lg border shadow-2xs ${
              summary.hasErrors
                ? 'border-rose-300 bg-rose-50/30'
                : summary.warningCount > 0
                ? 'border-amber-300 bg-amber-50/30'
                : 'border-slate-200'
            }`}
          >
            <span
              className={`text-[10px] font-bold uppercase tracking-wider block ${
                summary.hasErrors
                  ? 'text-rose-800'
                  : summary.warningCount > 0
                  ? 'text-amber-800'
                  : 'text-slate-500'
              }`}
            >
              Audits &amp; Alerts
            </span>
            <span
              className={`text-xl font-bold mt-1 block ${
                summary.hasErrors
                  ? 'text-rose-600'
                  : summary.warningCount > 0
                  ? 'text-amber-600'
                  : 'text-slate-700'
              }`}
            >
              {summary.errorCount > 0
                ? summary.errorCount
                : summary.warningCount > 0
                ? summary.warningCount
                : summary.unspecified}
            </span>
            <span className="text-[11px] text-slate-500">
              {summary.errorCount > 0
                ? `${summary.errorCount} error(s) must fix`
                : summary.warningCount > 0
                ? `${summary.warningCount} duplicate warning(s)`
                : 'All clear'}
            </span>
          </div>
        </div>
      </div>

      {/* Critical error banner */}
      {summary.hasErrors && (
        <div className="mx-5 my-3.5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-rose-900">
                Action Required: {summary.errorCount} Critical Validation Error(s)
              </h4>
              <p className="text-[11px] text-rose-700 mt-0.5">
                Every employee record must have a valid Name, Gender, and Office before teams can be generated. You can edit them directly below.
              </p>
            </div>
          </div>

          {errors.some((e) => e.field === 'gender') && (
            <button
              type="button"
              onClick={onBulkFixGenderUnspecified}
              className="shrink-0 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-md shadow-2xs transition-colors cursor-pointer"
            >
              Classify Missing Genders as &quot;Unspecified&quot;
            </button>
          )}
        </div>
      )}

      {/* Duplicate Warning Guidance Banner */}
      {!summary.hasErrors && duplicateErrors.length > 0 && (
        <div className="mx-5 my-3.5 p-3.5 rounded-lg bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-amber-900">
                Notice: {duplicateErrors.length} Employee Record(s) Share Duplicate Names
              </h4>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Identical names (e.g. &quot;Vignesh S&quot;) are distinguished internally by unique IDs and will NOT be deleted. You can rename them (e.g. to &quot;Vignesh Srinivasan&quot; and &quot;Vignesh Subramaniam&quot;) below to clarify team rosters.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setFilterMode('warnings')}
            className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-md shadow-2xs transition-colors cursor-pointer"
          >
            Review Duplicates Only
          </button>
        </div>
      )}

      {/* Filter and Search toolbar */}
      <div className="p-3.5 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Filter buttons */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              filterMode === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All ({employees.length})
          </button>

          {summary.errorCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterMode('errors')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
                filterMode === 'errors'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              Errors ({summary.errorCount})
            </button>
          )}

          {summary.warningCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterMode('warnings')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
                filterMode === 'warnings'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Duplicates ({duplicateErrors.length})
            </button>
          )}

          <button
            type="button"
            onClick={() => setFilterMode('guindy')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              filterMode === 'guindy'
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            Guindy ({summary.guindy})
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('vandaloor')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              filterMode === 'vandaloor'
                ? 'bg-indigo-700 text-white'
                : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
            }`}
          >
            Vandaloor ({summary.vandaloor})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search name, office, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-100/90 text-slate-700 sticky top-0 z-10 border-b border-slate-200 font-semibold uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-3 w-10 text-center">#</th>
              <th className="py-2.5 px-3 w-28">Record ID</th>
              <th className="py-2.5 px-3 min-w-[200px]">Employee Name</th>
              <th className="py-2.5 px-3 w-36">Gender</th>
              <th className="py-2.5 px-3 w-36">Office Location</th>
              <th className="py-2.5 px-3 min-w-[160px]">Status / Alerts</th>
              <th className="py-2.5 px-3 w-24 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No employee records found matching your filter criteria.
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp, index) => {
                const recErrors = errorMap.get(emp.id) || [];
                const nameErr = recErrors.find((e) => e.field === 'name');
                const genderErr = recErrors.find((e) => e.field === 'gender');
                const officeErr = recErrors.find((e) => e.field === 'office');
                const dupWarn = recErrors.find((e) => e.field === 'duplicate');

                const hasError = recErrors.some((e) => e.severity === 'error');
                const hasWarning = recErrors.some((e) => e.severity === 'warning');

                return (
                  <tr
                    key={emp.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      hasError ? 'bg-rose-50/30' : hasWarning ? 'bg-amber-50/20' : ''
                    }`}
                  >
                    {/* Index */}
                    <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                      {emp.rowNumber ?? index + 1}
                    </td>

                    {/* Record ID Badge */}
                    <td className="py-2 px-3">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 truncate block max-w-[100px]" title={emp.id}>
                        {emp.id}
                      </span>
                    </td>

                    {/* Employee Name (editable directly inline) */}
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={emp.name}
                        onChange={(e) =>
                          onUpdateEmployee({ ...emp, name: e.target.value })
                        }
                        className={`w-full px-2 py-1 text-xs rounded border transition-colors ${
                          nameErr
                            ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:ring-rose-500'
                            : dupWarn
                            ? 'border-amber-300 bg-amber-50/30 text-amber-950 focus:border-amber-500'
                            : 'border-slate-200 bg-transparent hover:border-slate-300 focus:bg-white focus:border-blue-500'
                        }`}
                        placeholder="Enter full name"
                      />
                      {nameErr && (
                        <p className="text-[10px] text-rose-600 mt-0.5">
                          {nameErr.message}
                        </p>
                      )}
                    </td>

                    {/* Gender (editable directly inline) */}
                    <td className="py-2 px-3">
                      <select
                        value={emp.gender}
                        onChange={(e) =>
                          onUpdateEmployee({
                            ...emp,
                            gender: e.target.value as Gender,
                          })
                        }
                        className={`w-full px-2 py-1 text-xs rounded border transition-colors ${
                          genderErr
                            ? 'border-rose-400 bg-rose-50 text-rose-900 focus:ring-rose-500'
                            : 'border-slate-200 bg-white hover:border-slate-300 focus:border-blue-500'
                        }`}
                      >
                        <option value="Men">Men</option>
                        <option value="Women">Women</option>
                        <option value="Unspecified">Unspecified</option>
                      </select>
                      {genderErr && (
                        <p className="text-[10px] text-rose-600 mt-0.5">
                          {genderErr.message}
                        </p>
                      )}
                    </td>

                    {/* Office Location (editable directly inline) */}
                    <td className="py-2 px-3">
                      <select
                        value={emp.office}
                        onChange={(e) =>
                          onUpdateEmployee({
                            ...emp,
                            office: e.target.value as OfficeLocation,
                          })
                        }
                        className={`w-full px-2 py-1 text-xs rounded border transition-colors ${
                          officeErr
                            ? 'border-rose-400 bg-rose-50 text-rose-900 focus:ring-rose-500'
                            : 'border-slate-200 bg-white hover:border-slate-300 focus:border-blue-500'
                        }`}
                      >
                        <option value="Guindy">Guindy</option>
                        <option value="Vandaloor">Vandaloor</option>
                      </select>
                      {officeErr && (
                        <p className="text-[10px] text-rose-600 mt-0.5">
                          {officeErr.message}
                        </p>
                      )}
                    </td>

                    {/* Validation status badge */}
                    <td className="py-2 px-3">
                      {hasError ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          Fix Required
                        </span>
                      ) : dupWarn ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Duplicate Name
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          Valid
                        </span>
                      )}
                      {dupWarn && (
                        <p className="text-[10px] text-amber-700 mt-0.5 line-clamp-2">
                          {dupWarn.message}
                        </p>
                      )}
                    </td>

                    {/* Actions: Edit in form or Delete */}
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {onEditEmployeeInForm && (
                          <button
                            type="button"
                            onClick={() => onEditEmployeeInForm(emp)}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit employee in dedicated form"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onDeleteEmployee(emp.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Remove employee record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span>
          Showing {filteredEmployees.length} of {employees.length} records.
        </span>
        <span className="text-slate-400 text-[11px]">
          Edit names directly in the input box or click the pencil icon to edit in the form.
        </span>
      </div>
    </div>
  );
}
