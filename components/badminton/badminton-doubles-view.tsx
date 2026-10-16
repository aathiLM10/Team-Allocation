'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TeamName, TEAM_NAMES } from '@/types/employee';
import {
  DoublesEmployee,
  GeneratedDoublesPair,
  TeamDoublesResult,
  generateAllDoublesPairs,
  shuffleTeamDoublesPairs,
} from '@/lib/badminton/doubles-pairing';
import {
  parseParticipantFile,
  processParticipantRows,
} from '@/lib/badminton/participant-import';
import {
  getRealCompanyParticipants,
  generateTeamColumnsCSV,
} from '@/lib/badminton/sample-data';
import { downloadDoublesPairsExcel } from '@/lib/export/doubles-excel-export';
import { downloadCSV } from '@/lib/export/team-export';

import {
  Users,
  UploadCloud,
  Sparkles,
  Download,
  Shuffle,
  FileSpreadsheet,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  User,
  Shield,
  Layers,
  HelpCircle,
  FileText,
} from 'lucide-react';

export function BadmintonDoublesView() {
  // 1. Employee Roster State
  const [employees, setEmployees] = useState<DoublesEmployee[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  // 2. Generated Doubles Result State
  const [doublesResult, setDoublesResult] = useState<TeamDoublesResult | null>(null);

  // 3. UI State
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage on mount if existing data exists
  useEffect(() => {
    try {
      const savedEmps = localStorage.getItem('badminton_doubles_employees_v1');
      const savedResult = localStorage.getItem('badminton_doubles_result_v1');

      if (savedEmps) {
        const parsedEmps: DoublesEmployee[] = JSON.parse(savedEmps);
        if (Array.isArray(parsedEmps) && parsedEmps.length > 0) {
          setEmployees(parsedEmps);
        }
      }
      if (savedResult) {
        const parsedResult: TeamDoublesResult = JSON.parse(savedResult);
        if (parsedResult && parsedResult.teams) {
          setDoublesResult(parsedResult);
        }
      }
    } catch (e) {
      console.warn('Error reading from localStorage:', e);
    }
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      if (employees.length > 0) {
        localStorage.setItem('badminton_doubles_employees_v1', JSON.stringify(employees));
      } else {
        localStorage.removeItem('badminton_doubles_employees_v1');
      }
    } catch (e) {}
  }, [employees]);

  useEffect(() => {
    try {
      if (doublesResult) {
        localStorage.setItem('badminton_doubles_result_v1', JSON.stringify(doublesResult));
      } else {
        localStorage.removeItem('badminton_doubles_result_v1');
      }
    } catch (e) {}
  }, [doublesResult]);

  // Derived counts per team
  const employeeCountsByTeam = useMemo(() => {
    const counts: Record<TeamName, number> = {
      'Red Team': 0,
      'Blue Team': 0,
      'Grey Team': 0,
      'White Team': 0,
    };
    employees.forEach((e) => {
      if (counts[e.team] !== undefined) {
        counts[e.team]++;
      }
    });
    return counts;
  }, [employees]);

  // ACTION: Handle file upload (CSV / Excel)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rawRecords = await parseParticipantFile(file);
      const { rows, result } = processParticipantRows(rawRecords, 'doubles-only', []);

      if (result.errors && result.errors.length > 0) {
        setValidationErrors(result.errors.map((err) => `Row ${err.row}: ${err.message}`));
      } else {
        setValidationErrors([]);
      }

      if (result.warnings && result.warnings.length > 0) {
        setValidationWarnings(result.warnings.map((w) => `Row ${w.row}: ${w.message}`));
      } else {
        setValidationWarnings([]);
      }

      const validEmployees: DoublesEmployee[] = rows
        .filter((r) => r.isValid)
        .map((r) => ({
          id: r.id,
          name: r.name,
          team: r.team as TeamName,
          office: r.office,
          gender: r.gender,
        }));

      if (validEmployees.length === 0) {
        alert(
          'No valid employee records found. Please ensure the file contains employee names under team columns (Red, Blue, Grey, White) or standard team assignments.'
        );
        return;
      }

      // Check duplicates
      const seen = new Set<string>();
      const dedupedEmployees: DoublesEmployee[] = [];
      validEmployees.forEach((emp) => {
        const key = `${emp.name.toLowerCase()}__${emp.team}`;
        if (!seen.has(key)) {
          seen.add(key);
          dedupedEmployees.push(emp);
        }
      });

      setEmployees(dedupedEmployees);
      setDoublesResult(null); // Reset previously generated pairs on new file upload
    } catch (err: any) {
      alert(`Error reading file: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ACTION: Load 69 company employees from tournament roster
  const handleLoadSampleData = () => {
    if (employees.length > 0 && doublesResult) {
      if (!window.confirm('Current employees and pairs will be replaced with the 69 company roster. Continue?')) {
        return;
      }
    }
    const sampleParticipants = getRealCompanyParticipants('doubles');
    const sampleEmployees: DoublesEmployee[] = sampleParticipants.map((p) => ({
      id: p.id,
      name: p.name,
      team: p.team,
      office: p.office,
      gender: p.gender,
    }));

    setEmployees(sampleEmployees);
    setDoublesResult(null);
    setValidationErrors([]);
    setValidationWarnings([]);
  };

  // ACTION: Download CSV Template (4-Team format)
  const handleDownloadTemplate = () => {
    downloadCSV(generateTeamColumnsCSV(), 'badminton_doubles_template.csv');
  };

  // ACTION: Generate Doubles Pairs (Primary Action)
  const handleGeneratePairs = () => {
    if (employees.length < 2) {
      alert('At least 2 employees are required to generate doubles pairs.');
      return;
    }

    const result = generateAllDoublesPairs(employees, { shuffle: true });
    setDoublesResult(result);
  };

  // ACTION: Shuffle All Pairs
  const handleShuffleAllPairs = () => {
    if (doublesResult) {
      if (!window.confirm('Shuffle all pairs? The current partnerships for all four teams will be randomly regenerated.')) {
        return;
      }
    }
    const result = generateAllDoublesPairs(employees, { shuffle: true });
    setDoublesResult(result);
  };

  // ACTION: Shuffle Single Team Pairs
  const handleShuffleSingleTeam = (team: TeamName) => {
    if (doublesResult) {
      if (!window.confirm(`Shuffle pairs for ${team}? Other teams will not be affected.`)) {
        return;
      }
      const updated = shuffleTeamDoublesPairs(doublesResult, team, employees);
      setDoublesResult(updated);
    }
  };

  // ACTION: Export to Excel
  const handleExportToExcel = async () => {
    if (!doublesResult) return;
    try {
      setIsExportingExcel(true);
      await downloadDoublesPairsExcel(doublesResult, 'badminton_doubles_pairs.xlsx');
    } catch (err: any) {
      alert(`Error exporting to Excel: ${err?.message || String(err)}`);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // ACTION: Clear and Reset
  const handleClearAll = () => {
    if (!window.confirm('Reset all employee records and generated doubles pairs?')) {
      return;
    }
    setEmployees([]);
    setDoublesResult(null);
    setValidationErrors([]);
    setValidationWarnings([]);
    localStorage.removeItem('badminton_doubles_employees_v1');
    localStorage.removeItem('badminton_doubles_result_v1');
  };

  // Helper for Team color badges
  const getTeamStyles = (team: TeamName) => {
    switch (team) {
      case 'Red Team':
        return {
          badge: 'bg-rose-600 text-white',
          headerBg: 'bg-rose-50/80 border-rose-200 text-rose-950',
          border: 'border-rose-300',
          chip: 'bg-rose-100 text-rose-800',
          button: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20',
        };
      case 'Blue Team':
        return {
          badge: 'bg-blue-600 text-white',
          headerBg: 'bg-blue-50/80 border-blue-200 text-blue-950',
          border: 'border-blue-300',
          chip: 'bg-blue-100 text-blue-800',
          button: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20',
        };
      case 'Grey Team':
        return {
          badge: 'bg-slate-700 text-white',
          headerBg: 'bg-slate-100 border-slate-300 text-slate-900',
          border: 'border-slate-300',
          chip: 'bg-slate-200 text-slate-800',
          button: 'bg-slate-700 hover:bg-slate-800 text-white shadow-slate-700/20',
        };
      case 'White Team':
        return {
          badge: 'bg-white text-slate-900 border border-slate-300',
          headerBg: 'bg-slate-50 border-slate-200 text-slate-900',
          border: 'border-slate-300',
          chip: 'bg-slate-100 text-slate-700 border border-slate-200',
          button: 'bg-slate-800 hover:bg-slate-900 text-white shadow-slate-800/20',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* ========================================================================= */}
      {/* 1. APPLICATION HEADER */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl border border-slate-800">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-400/30 flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>Doubles Module</span>
            </span>
            <span className="text-xs text-slate-400">Solidpro Sports &amp; Recreation</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Users className="w-7 h-7 text-purple-400" />
            <span>Badminton Doubles Pairing</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Upload your employee roster, randomly pair partners strictly within their assigned teams (Red, Blue, Grey, White), and export the final pairings directly to Excel.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-200 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-colors cursor-pointer"
            title="Download CSV spreadsheet template"
          >
            <Download className="w-3.5 h-3.5 text-slate-300" />
            <span>CSV Template</span>
          </button>

          {employees.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-300 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 rounded-xl transition-colors cursor-pointer"
              title="Clear all loaded employees and pairs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. INITIAL VIEW: UPLOAD & SAMPLE DATA CONTROLS (WHEN NO DATA LOADED) */}
      {/* ========================================================================= */}
      {employees.length === 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 sm:p-12 text-center space-y-8 animate-in fade-in duration-200">
          <div className="max-w-xl mx-auto space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center mx-auto text-3xl shadow-lg shadow-purple-600/20">
              🏸
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              Get Started: Load Employee List
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Upload your employee spreadsheet from Excel or CSV (supports 4 team columns: <strong>Red</strong>, <strong>Blue</strong>, <strong>Grey</strong>, <strong>White</strong>), or load the company sample data to generate doubles pairs.
            </p>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto text-left">
            {/* Card 1: Upload Employee List */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-6 rounded-2xl border-2 border-dashed border-purple-300 hover:border-purple-600 bg-purple-50/40 hover:bg-purple-50/80 transition-all cursor-pointer group space-y-3"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-900 text-base group-hover:text-purple-700 transition-colors">
                  Upload Employee List
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Upload an Excel (.xlsx) or CSV file with employee names under Red, Blue, Grey, and White teams.
                </p>
              </div>
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 group-hover:underline">
                  <span>Browse files or drop here</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* Card 2: Load Sample Data */}
            <div
              onClick={handleLoadSampleData}
              className="p-6 rounded-2xl border-2 border-slate-200 hover:border-indigo-500 bg-slate-50/60 hover:bg-indigo-50/40 transition-all cursor-pointer group space-y-3"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-900 text-base group-hover:text-indigo-700 transition-colors">
                  Load Sample Data
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Try the pairing studio instantly with the 69 company employees across Red (10), Blue (23), Grey (18), and White (18).
                </p>
              </div>
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 group-hover:underline">
                  <span>Load 69 Company Players</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>

          {/* Download CSV Template Helper */}
          <div className="pt-2 border-t border-slate-100 max-w-md mx-auto text-center">
            <span className="text-xs text-slate-500">
              Need a sample spreadsheet format?{' '}
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="font-bold text-purple-600 hover:text-purple-800 underline cursor-pointer"
              >
                Download CSV Template
              </button>
            </span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. EMPLOYEE SUMMARY & GENERATE PAIRS (WHEN DATA IS LOADED) */}
      {/* ========================================================================= */}
      {employees.length > 0 && (
        <div className="space-y-6">
          {/* Validation Messages if any */}
          {validationErrors.length > 0 && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Validation Notices ({validationErrors.length})</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-rose-700">
                {validationErrors.slice(0, 5).map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Employee Summary Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-100 text-purple-800">
                  Step 1: Loaded Employees
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  Employee Summary ({employees.length} Total Employees)
                </h3>
                <p className="text-xs text-slate-500">
                  Employees from Guindy and Vandaloor combined under their assigned teams.
                </p>
              </div>

              {/* Upload New File Action */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-xl cursor-pointer flex items-center gap-1.5"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                  <span>Upload Different File</span>
                </button>
              </div>
            </div>

            {/* Team Breakdown Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {TEAM_NAMES.map((team) => {
                const count = employeeCountsByTeam[team] || 0;
                const completePairs = Math.floor(count / 2);
                const hasUnpaired = count % 2 === 1;
                const styles = getTeamStyles(team);

                return (
                  <div
                    key={team}
                    className={`p-4 rounded-2xl border ${styles.headerBg} space-y-1.5`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${styles.badge}`}>
                        {team}
                      </span>
                      <span className="text-lg font-black text-slate-900">{count}</span>
                    </div>
                    <div className="text-[11px] text-slate-600 flex items-center justify-between">
                      <span>Pairs: <strong>{completePairs}</strong></span>
                      {hasUnpaired && (
                        <span className="text-amber-700 font-extrabold">1 Unpaired</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* PRIMARY BUTTON: GENERATE DOUBLES PAIRS (IF NOT YET GENERATED) */}
            {!doublesResult && (
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-slate-500">
                  Click the button to randomly pair employees strictly within their respective teams.
                </p>

                <button
                  type="button"
                  onClick={handleGeneratePairs}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-2xl font-black text-sm bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2.5 cursor-pointer transition-all hover:scale-[1.02]"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Generate Doubles Pairs</span>
                </button>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 4. DISPLAY GENERATED PAIRS (AFTER PAIR GENERATION) */}
          {/* ========================================================================= */}
          {doublesResult && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Toolbar Actions Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Pairs Generated</span>
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {doublesResult.totalPairs} Complete Pairs Across 4 Teams
                  </span>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Shuffle All Pairs Button */}
                  <button
                    type="button"
                    onClick={handleShuffleAllPairs}
                    className="px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    title="Randomly regenerate pairs for all four teams"
                  >
                    <Shuffle className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Shuffle All Pairs</span>
                  </button>

                  {/* Export to Excel Button */}
                  <button
                    type="button"
                    onClick={handleExportToExcel}
                    disabled={isExportingExcel}
                    className="px-4 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer flex items-center gap-2 shadow-md shadow-emerald-600/20"
                    title="Export pairs to a formatted Excel workbook"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>{isExportingExcel ? 'Exporting...' : 'Export to Excel'}</span>
                  </button>
                </div>
              </div>

              {/* FOUR TEAM COLUMNS WITH NUMBERED PAIRS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {TEAM_NAMES.map((team) => {
                  const summary = doublesResult.teams[team];
                  const pairs = summary?.pairs || [];
                  const unpaired = summary?.unpairedEmployee;
                  const styles = getTeamStyles(team);

                  return (
                    <div
                      key={team}
                      className="bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between overflow-hidden"
                    >
                      {/* Team Card Header */}
                      <div className={`p-4 border-b ${styles.headerBg} space-y-2.5`}>
                        <div className="flex items-center justify-between">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${styles.badge}`}>
                            {team}
                          </span>
                          {/* Shuffle Individual Team Button */}
                          <button
                            type="button"
                            onClick={() => handleShuffleSingleTeam(team)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white/70 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                            title={`Shuffle only ${team} pairs`}
                          >
                            <Shuffle className="w-3 h-3 text-slate-500" />
                            <span>Shuffle</span>
                          </button>
                        </div>

                        {/* Team Metrics Summary */}
                        <div className="flex items-center justify-between text-[11px] text-slate-600">
                          <span>Total: <strong>{summary?.totalEmployees || 0}</strong></span>
                          <span>Pairs: <strong>{pairs.length}</strong></span>
                          <span>
                            Unpaired:{' '}
                            <strong className={unpaired ? 'text-amber-700' : 'text-slate-700'}>
                              {unpaired ? 1 : 0}
                            </strong>
                          </span>
                        </div>
                      </div>

                      {/* Numbered Pairs Rows */}
                      <div className="p-3.5 space-y-2 flex-1">
                        {pairs.length === 0 ? (
                          <div className="py-6 text-center text-xs text-slate-400">
                            No pairs generated yet
                          </div>
                        ) : (
                          pairs.map((pair) => (
                            <div
                              key={pair.id}
                              className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                  Pair {pair.pairNumber}
                                </span>
                              </div>
                              <div className="text-xs font-bold text-slate-800 leading-snug">
                                {pair.displayNames}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Unpaired Employee Banner (if odd count in this team) */}
                      {unpaired && (
                        <div className="p-3 bg-amber-50 border-t border-amber-200 space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-200 text-amber-900 border border-amber-300">
                              Unpaired Employee
                            </span>
                            <span className="text-[10px] text-amber-700 font-semibold italic">
                              Odd team count
                            </span>
                          </div>
                          <div className="font-extrabold text-slate-900">
                            {unpaired.name}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
