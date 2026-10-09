'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  Employee,
  ValidationError,
  EmployeeSummary,
  TeamAllocation,
  ColumnMapping,
  AllocationDiff,
  OfficeLocation,
} from '@/types/employee';
import { RawParsedSheet } from '@/lib/import/employee-parser';
import {
  validateEmployeeRecords,
  validateEmployeeList,
} from '@/lib/validation/employee-validation';
import {
  allocateTeams,
  calculateAllocationDiff,
} from '@/lib/allocation/team-allocation';
import { validateAllocation } from '@/lib/allocation/allocation-metrics';
import {
  exportMasterAllocationCSV,
  exportTeamsToStyledExcel,
} from '@/lib/export/team-export';

import { WorkflowSteps, WorkflowStepId } from '@/components/navigation/workflow-steps';
import { EmployeeUpload } from '@/components/upload/employee-upload';
import { ColumnMapper } from '@/components/upload/column-mapper';
import { DataPreviewTable } from '@/components/upload/data-preview-table';
import { ManualEmployeeForm } from '@/components/upload/manual-employee-form';
import { TeamCard } from '@/components/teams/team-card';
import { TeamSummary } from '@/components/teams/team-summary';
import { ValidationSummary } from '@/components/teams/validation-summary';
import { AllocationDiffModal } from '@/components/teams/allocation-diff-modal';

import {
  Shuffle,
  Download,
  Lock,
  Unlock,
  Sparkles,
  AlertTriangle,
  Info,
  HelpCircle,
  RotateCcw,
  Layers,
  FileCheck2,
  FileSpreadsheet,
} from 'lucide-react';

export default function TeamsPage() {
  // Parsing & Mapping State
  const [parsedSheets, setParsedSheets] = useState<RawParsedSheet[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    nameColumn: '',
    genderColumn: '',
    officeColumn: '',
  });

  // Employee & Validation State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [summary, setSummary] = useState<EmployeeSummary>({
    total: 0,
    guindy: 0,
    vandaloor: 0,
    men: 0,
    women: 0,
    unspecified: 0,
    hasErrors: false,
    hasWarnings: false,
    errorCount: 0,
    warningCount: 0,
  });

  // Manual Add / Edit State
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Allocation State
  const [allocations, setAllocations] = useState<TeamAllocation[] | null>(null);
  const [, setPreviousAllocations] = useState<TeamAllocation[] | null>(null);
  const [diffs, setDiffs] = useState<AllocationDiff[]>([]);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Settings
  const [customSeed, setCustomSeed] = useState<string>('');
  const [showSeedInput, setShowSeedInput] = useState(false);
  const [showAlgorithmDocs, setShowAlgorithmDocs] = useState(false);

  // Active file name
  const activeFileName = parsedSheets.length > 0 ? parsedSheets[0].fileName : null;

  // Available headers from parsed sheets
  const availableHeaders = useMemo(() => {
    const set = new Set<string>();
    parsedSheets.forEach((s) => s.headers.forEach((h) => set.add(h)));
    return Array.from(set);
  }, [parsedSheets]);

  // Has default office from separate files?
  const hasDefaultOffice = parsedSheets.some((s) => !!s.defaultOffice);

  // Current workflow step calculation
  const currentStep: WorkflowStepId = useMemo(() => {
    if (employees.length === 0) return 1;
    if (!allocations) {
      return summary.hasErrors ? 2 : 3;
    }
    return 4;
  }, [employees.length, allocations, summary.hasErrors]);

  // Handle data parsed from file upload
  const handleDataParsed = (
    sheets: RawParsedSheet[],
    suggestedMapping: ColumnMapping
  ) => {
    setParsedSheets(sheets);
    setMapping(suggestedMapping);

    const rawRowsWithMeta: {
      rowNumber: number;
      data: Record<string, unknown>;
      sourceFile: string;
      defaultOffice?: OfficeLocation;
    }[] = [];

    let overallRowNumber = 2;
    sheets.forEach((sheet) => {
      sheet.rows.forEach((row) => {
        const sheetName = (row.__sheetName__ as string) || '';
        const sourceLabel = sheetName ? `${sheet.fileName} [${sheetName}]` : sheet.fileName;
        rawRowsWithMeta.push({
          rowNumber: overallRowNumber++,
          data: row,
          sourceFile: sourceLabel,
          defaultOffice: sheet.defaultOffice,
        });
      });
    });

    const validation = validateEmployeeRecords(rawRowsWithMeta, suggestedMapping);
    setEmployees(validation.employees);
    setErrors(validation.errors);
    setSummary(validation.summary);

    setAllocations(null);
    setPreviousAllocations(null);
    setDiffs([]);
    setIsApproved(false);
    setEditingEmployee(null);
  };

  // Reset entire workflow
  const handleReset = () => {
    setParsedSheets([]);
    setEmployees([]);
    setErrors([]);
    setAllocations(null);
    setPreviousAllocations(null);
    setDiffs([]);
    setIsApproved(false);
    setEditingEmployee(null);
    setSummary({
      total: 0,
      guindy: 0,
      vandaloor: 0,
      men: 0,
      women: 0,
      unspecified: 0,
      hasErrors: false,
      hasWarnings: false,
      errorCount: 0,
      warningCount: 0,
    });
  };

  // Re-apply column mapping if changed
  const handleApplyMapping = () => {
    const rawRowsWithMeta: {
      rowNumber: number;
      data: Record<string, unknown>;
      sourceFile: string;
      defaultOffice?: OfficeLocation;
    }[] = [];

    let overallRowNumber = 2;
    parsedSheets.forEach((sheet) => {
      sheet.rows.forEach((row) => {
        const sheetName = (row.__sheetName__ as string) || '';
        const sourceLabel = sheetName ? `${sheet.fileName} [${sheetName}]` : sheet.fileName;
        rawRowsWithMeta.push({
          rowNumber: overallRowNumber++,
          data: row,
          sourceFile: sourceLabel,
          defaultOffice: sheet.defaultOffice,
        });
      });
    });

    const validation = validateEmployeeRecords(rawRowsWithMeta, mapping);
    setEmployees(validation.employees);
    setErrors(validation.errors);
    setSummary(validation.summary);
    setAllocations(null);
  };

  // Update employee details (direct inline edits or table cell changes)
  const handleUpdateEmployee = (updated: Employee) => {
    const updatedList = employees.map((emp) =>
      emp.id === updated.id ? updated : emp
    );
    setEmployees(updatedList);

    // Re-validate complete list to dynamically resolve or flag duplicate names
    const { errors: newErrors, summary: newSummary } = validateEmployeeList(updatedList);
    setErrors(newErrors);
    setSummary(newSummary);

    // Invalidate existing allocation so changes are guaranteed in new teams & CSV
    if (allocations) {
      setAllocations(null);
    }
  };

  // Add employee manually via generalized Add Employee form
  const handleAddManualEmployee = (newEmpData: Omit<Employee, 'id'>) => {
    const newId = `emp-manual-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newEmp: Employee = {
      ...newEmpData,
      id: newId,
      rowNumber: employees.length + 1,
    };
    const updatedList = [...employees, newEmp];
    setEmployees(updatedList);

    const { errors: newErrors, summary: newSummary } = validateEmployeeList(updatedList);
    setErrors(newErrors);
    setSummary(newSummary);

    if (allocations) {
      setAllocations(null);
    }
  };

  // Save changes from Edit Employee form
  const handleSaveManualEmployee = (savedEmp: Employee) => {
    const updatedList = employees.map((emp) =>
      emp.id === savedEmp.id ? savedEmp : emp
    );
    setEmployees(updatedList);

    const { errors: newErrors, summary: newSummary } = validateEmployeeList(updatedList);
    setErrors(newErrors);
    setSummary(newSummary);
    setEditingEmployee(null);

    if (allocations) {
      setAllocations(null);
    }
  };

  // Delete employee record
  const handleDeleteEmployee = (id: string) => {
    const updatedList = employees.filter((e) => e.id !== id);
    setEmployees(updatedList);

    const { errors: newErrors, summary: newSummary } = validateEmployeeList(updatedList);
    setErrors(newErrors);
    setSummary(newSummary);

    if (editingEmployee?.id === id) {
      setEditingEmployee(null);
    }
    if (allocations) {
      setAllocations(null);
    }
  };

  // Start editing employee in dedicated form
  const handleStartEditEmployeeInForm = (emp: Employee) => {
    setEditingEmployee(emp);
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    setEditingEmployee(null);
  };

  // Bulk fix: set all unrecognized or missing genders to 'Unspecified'
  const handleBulkFixGenderUnspecified = () => {
    const updatedList = employees.map((emp) => {
      const hasGenderErr = errors.some(
        (e) => e.recordId === emp.id && e.field === 'gender'
      );
      if (hasGenderErr) {
        return { ...emp, gender: 'Unspecified' as const };
      }
      return emp;
    });

    const { errors: newErrors, summary: newSummary } = validateEmployeeList(updatedList);
    setEmployees(updatedList);
    setErrors(newErrors);
    setSummary(newSummary);
  };

  // Perform allocation
  const executeAllocation = () => {
    if (summary.hasErrors) return;

    const seedNum = customSeed.trim() ? parseInt(customSeed, 10) : undefined;
    const newAlloc = allocateTeams(employees, { seed: isNaN(seedNum as number) ? undefined : seedNum });

    if (allocations) {
      const movements = calculateAllocationDiff(allocations, newAlloc);
      setPreviousAllocations(allocations);
      setDiffs(movements);
      setShowDiffModal(true);
    }

    setAllocations(newAlloc);
    setShowConfirmModal(false);
  };

  const handleGenerateClick = () => {
    if (isApproved) {
      setShowConfirmModal(true);
      return;
    }
    executeAllocation();
  };

  // Reshuffle action
  const handleShuffleAgain = () => {
    if (isApproved) {
      setShowConfirmModal(true);
      return;
    }
    const newAlloc = allocateTeams(employees);
    if (allocations) {
      const movements = calculateAllocationDiff(allocations, newAlloc);
      setPreviousAllocations(allocations);
      setDiffs(movements);
      setShowDiffModal(true);
    }
    setAllocations(newAlloc);
  };

  // Master CSV Export (Flat CSV)
  const handleExportMasterCSV = () => {
    if (!allocations) return;
    exportMasterAllocationCSV(allocations, 'All_Teams_Employee_Allocation.csv');
  };

  // State for Excel generation
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Master Excel Export (4 Color-coded Team Sheets + Master Allocation Sheet + Summary Matrix)
  const handleExportExcel = async () => {
    if (!allocations) return;
    setIsExportingExcel(true);
    try {
      const report = validateAllocation(employees, allocations);
      await exportTeamsToStyledExcel(
        allocations,
        report,
        summary,
        'Master_Employee_Team_Allocation.xlsx'
      );
    } catch (err) {
      console.error('Failed to export styled Excel:', err);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Current validation report
  const currentValidationReport = useMemo(() => {
    if (!allocations) return null;
    return validateAllocation(employees, allocations);
  }, [employees, allocations]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 selection:bg-blue-100 selection:text-blue-900">
      {/* Top Enterprise Application Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center font-bold shadow-xs">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 leading-tight">
                  Team Allocation &amp; Shuffle
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                  Enterprise SaaS
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Guindy &amp; Vandaloor Offices • White, Red, Blue, Grey Teams
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {employees.length > 0 && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-md transition-colors cursor-pointer"
                title="Reset application to upload new file"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Start Over</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowAlgorithmDocs(!showAlgorithmDocs)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer border border-blue-200/80"
            >
              <Info className="w-3.5 h-3.5 text-blue-600" />
              <span>Algorithm Specs</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Step Indicator Header */}
        <WorkflowSteps
          currentStep={currentStep}
          hasFileUploaded={employees.length > 0}
          hasErrors={summary.hasErrors}
          hasAllocated={!!allocations}
        />

        {/* Algorithm Specifications Modal / Accordion */}
        {showAlgorithmDocs && (
          <div className="bg-white rounded-xl border border-blue-200 p-6 shadow-xs animate-in fade-in duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Balanced Allocation Algorithm Architecture &amp; Guarantees
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAlgorithmDocs(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold cursor-pointer"
              >
                Close ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs text-slate-700 leading-relaxed">
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Allocation Priority Order
                </h4>
                <ol className="list-decimal pl-4 space-y-1.5 text-slate-700">
                  <li>
                    <strong>Exact Single Assignment:</strong> Every valid employee is assigned to exactly one team (zero omissions, zero duplicates).
                  </li>
                  <li>
                    <strong>Total Team Size Balance:</strong> Maximum difference across team sizes is strictly ≤ 1.
                  </li>
                  <li>
                    <strong>Guindy &amp; Vandaloor Office Representation:</strong> Guindy employees and Vandaloor employees are partitioned such that each office&apos;s delta across all four teams is strictly ≤ 1.
                  </li>
                  <li>
                    <strong>Joint Gender Distribution:</strong> Men and women within each office stratum are jointly optimized using multi-criteria scoring and local hill-climbing swaps.
                  </li>
                  <li>
                    <strong>Fair Randomization:</strong> Seeded PRNG ensures reproducibility while providing unbiased permutations among equally optimal assignments.
                  </li>
                </ol>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Mathematical Limitations &amp; Transparency
                </h4>
                <p>
                  When employee counts are not divisible by 4, an exact integer split is mathematically impossible. The algorithm guarantees the tightest possible bounds:
                </p>
                <ul className="list-disc pl-4 space-y-1.5 text-slate-700">
                  <li>
                    If Guindy count = 57, 57 % 4 = 1. One team receives 15 and three receive 14 (optimal delta = 1).
                  </li>
                  <li>
                    If Vandaloor count = 38, 38 % 4 = 2. Two teams receive 10 and two receive 9 (optimal delta = 1).
                  </li>
                  <li>
                    The algorithm coordinates office remainder slots so that total team sizes remain balanced within ±1 employee.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: File Upload */}
        <EmployeeUpload
          onDataParsed={handleDataParsed}
          onReset={handleReset}
          activeFileName={activeFileName}
        />

        {/* GENERALIZED ADD / EDIT EMPLOYEE SECTION */}
        <div ref={formRef}>
          <ManualEmployeeForm
            onAddEmployee={handleAddManualEmployee}
            onSaveEmployee={handleSaveManualEmployee}
            editingEmployee={editingEmployee}
            onCancelEdit={handleCancelEdit}
            isOpenDefault={employees.length === 0}
          />
        </div>

        {/* STEP 2: Column Mapping & Data Preview (When data exists) */}
        {employees.length > 0 && (
          <div className="space-y-6">
            {/* Multi-Sheet Notification Banner */}
            {parsedSheets.some((s) => (s.sheetBreakdown?.length || 0) > 1) && (
              <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 shadow-2xs">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1.5 text-xs text-emerald-950 flex-1">
                  <div className="font-bold flex items-center gap-2">
                    <span>Multi-Sheet Workbook Automatically Processed</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-800 text-[10px] font-semibold">
                      All Sheets Included
                    </span>
                  </div>
                  <p className="text-emerald-800 leading-relaxed">
                    All sheets from your uploaded workbook have been detected and combined into the active roster (including Sheet 1 regular employees and Sheet 2 interns).
                  </p>
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {parsedSheets
                      .flatMap((s) => s.sheetBreakdown || [])
                      .map((brk, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-emerald-300 text-emerald-900 font-medium text-[11px] shadow-2xs"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <strong>{brk.sheetName}</strong>: {brk.rowCount} rows
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* Column Mapper (shown when file headers exist) */}
            {availableHeaders.length > 0 && (
              <ColumnMapper
                availableHeaders={availableHeaders}
                mapping={mapping}
                hasDefaultOffice={hasDefaultOffice}
                onMappingChange={setMapping}
                onApplyMapping={handleApplyMapping}
              />
            )}

            {/* Data Preview, Editing & Duplicate Detection Table */}
            <DataPreviewTable
              employees={employees}
              errors={errors}
              summary={summary}
              onUpdateEmployee={handleUpdateEmployee}
              onDeleteEmployee={handleDeleteEmployee}
              onBulkFixGenderUnspecified={handleBulkFixGenderUnspecified}
              onEditEmployeeInForm={handleStartEditEmployeeInForm}
              onOpenAddEmployee={() => {
                setEditingEmployee(null);
                if (formRef.current) {
                  formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
            />

            {/* STEP 3: Generation Trigger Card */}
            <div className="bg-white rounded-xl shadow-2xs border border-slate-200/90 p-5 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  Step 3: Generate Balanced Teams
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {summary.hasErrors
                    ? `Blocked: Please resolve all ${summary.errorCount} critical validation error(s) above before generating teams.`
                    : `${summary.total} validated employees ready to be distributed across White, Red, Blue, and Grey teams.`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Seed toggle for testing / reproducibility */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSeedInput(!showSeedInput)}
                    className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    {showSeedInput ? 'Hide Seed' : 'Configurable Seed (Optional)'}
                  </button>
                  {showSeedInput && (
                    <input
                      type="number"
                      placeholder="Random Seed"
                      value={customSeed}
                      onChange={(e) => setCustomSeed(e.target.value)}
                      className="w-28 px-2 py-1 text-xs border border-slate-300 rounded-md bg-white focus:outline-hidden focus:border-blue-500"
                    />
                  )}
                </div>

                <button
                  type="button"
                  disabled={summary.hasErrors || employees.length === 0}
                  onClick={handleGenerateClick}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white disabled:text-slate-400 text-xs font-bold rounded-lg shadow-2xs transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed uppercase tracking-wider"
                >
                  <Sparkles className="w-4 h-4 text-blue-200" />
                  Generate Balanced Teams
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Team Results Dashboard (When generated) */}
        {allocations && currentValidationReport && (
          <div className="space-y-6 pt-2">
            {/* Dashboard Action Shell */}
            <div className="bg-white rounded-xl shadow-2xs border border-slate-200/90 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-emerald-600" />
                    Step 4: Review, Shuffle &amp; CSV Exports
                  </h2>
                  {isApproved && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <Lock className="w-3 h-3" />
                      Approved &amp; Locked
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Distributed {summary.total} employees across 4 teams with joint office &amp; gender parity.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Lock / Approve Toggle */}
                <button
                  type="button"
                  onClick={() => setIsApproved(!isApproved)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border transition-colors shadow-2xs cursor-pointer ${
                    isApproved
                      ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                  title={isApproved ? 'Unlock allocation' : 'Lock allocation to prevent accidental overwrite'}
                >
                  {isApproved ? (
                    <>
                      <Unlock className="w-3.5 h-3.5 text-amber-600" />
                      Unlock Allocation
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      Approve &amp; Lock
                    </>
                  )}
                </button>

                {/* Reshuffle */}
                <button
                  type="button"
                  onClick={handleShuffleAgain}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-md transition-colors shadow-2xs cursor-pointer"
                >
                  <Shuffle className="w-3.5 h-3.5 text-blue-600" />
                  Shuffle Again
                </button>

                {/* Primary: Export Master Excel (.xlsx) */}
                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={isExportingExcel}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow-2xs transition-colors cursor-pointer tracking-wide disabled:opacity-50"
                  title="Download Master Excel containing 4 color-coded team sheets and master allocation"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
                  <span>
                    {isExportingExcel ? 'Exporting Excel...' : 'Export Master Excel (.xlsx)'}
                  </span>
                  <span className="hidden xl:inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-700/80 text-emerald-100">
                    4 Colored Sheets
                  </span>
                </button>

                {/* Secondary: Download Master CSV */}
                <button
                  type="button"
                  onClick={handleExportMasterCSV}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-md shadow-2xs transition-colors cursor-pointer"
                  title="Download master allocation list as standard UTF-8 CSV"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span>Master CSV</span>
                </button>
              </div>
            </div>

            {/* 4 Team Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {allocations.map((team) => (
                <TeamCard key={team.teamName} allocation={team} />
              ))}
            </div>

            {/* Comparison Table with direct CSV download */}
            <TeamSummary
              allocations={allocations}
              validationReport={currentValidationReport}
              summary={summary}
            />

            {/* Audit & Verification Report */}
            <ValidationSummary report={currentValidationReport} />
          </div>
        )}

        {/* Reshuffle Movement Log Modal */}
        <AllocationDiffModal
          isOpen={showDiffModal}
          onClose={() => setShowDiffModal(false)}
          diffs={diffs}
          totalEmployees={summary.total}
        />

        {/* Overwrite Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in duration-150">
              <div className="flex items-center gap-3 text-amber-600 mb-3">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-base font-bold text-slate-900">
                  Overwrite Approved Allocation?
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-5">
                This allocation has been approved and locked. Regenerating or shuffling will replace the existing team rosters and member assignments. Do you want to proceed?
              </p>
              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeAllocation}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer"
                >
                  Yes, Overwrite &amp; Shuffle
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
