'use client';

import React, { useState } from 'react';
import {
  Participant,
  ParticipantImportRow,
  ImportCategoryMode,
} from '@/types/badminton';
import {
  parseParticipantFile,
  processParticipantRows,
  generateErrorReportCSV,
} from '@/lib/badminton/participant-import';
import {
  generateCombinedParticipationCSV,
  generateSinglesOnlyCSV,
  generateDoublesOnlyCSV,
  generateBlankParticipationCSV,
} from '@/lib/badminton/sample-data';
import { downloadCSV } from '@/lib/export/team-export';
import {
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Download,
  Check,
  RotateCcw,
  FileText,
} from 'lucide-react';

interface ParticipantImportViewProps {
  existingParticipants: Participant[];
  onImportComplete: (newParticipants: Participant[], mode: 'replace' | 'append') => void;
  onCancel?: () => void;
}

export function ParticipantImportView({
  existingParticipants,
  onImportComplete,
  onCancel,
}: ParticipantImportViewProps) {
  const [importMode, setImportMode] = useState<ImportCategoryMode>('combined');
  const [saveStrategy, setSaveStrategy] = useState<'replace' | 'append'>('replace');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewRows, setPreviewRows] = useState<ParticipantImportRow[] | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setFileName(file.name);

    try {
      const rawRecords = await parseParticipantFile(file);
      const { rows } = processParticipantRows(rawRecords, importMode, existingParticipants);
      setPreviewRows(rows);
    } catch (err) {
      alert(`Error reading file: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRowDelete = (index: number) => {
    if (!previewRows) return;
    setPreviewRows(previewRows.filter((_, i) => i !== index));
  };

  const handleRowEdit = (index: number, field: keyof ParticipantImportRow, value: any) => {
    if (!previewRows) return;
    const updated = [...previewRows];
    updated[index] = { ...updated[index], [field]: value };
    // Re-validate row simply
    const r = updated[index];
    const errors: string[] = [];
    if (!r.id) errors.push('Missing ID');
    if (!r.name) errors.push('Missing Name');
    if (!r.team) errors.push('Missing Team');
    updated[index].errors = errors;
    updated[index].isValid = errors.length === 0;
    setPreviewRows(updated);
  };

  const handleConfirmImport = () => {
    if (!previewRows) return;
    const validRows = previewRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      alert('No valid rows found to import.');
      return;
    }

    const participantsToSave: Participant[] = validRows.map((r) => ({
      id: r.id,
      name: r.name,
      team: r.team as any,
      office: r.office || undefined,
      gender: r.gender || undefined,
      singlesRegistered: !!r.singles,
      doublesRegistered: !!r.doubles,
      source: 'upload',
      createdAt: Date.now(),
    }));

    onImportComplete(participantsToSave, saveStrategy);
  };

  const validCount = previewRows ? previewRows.filter((r) => r.isValid).length : 0;
  const errorCount = previewRows ? previewRows.filter((r) => !r.isValid).length : 0;

  const handleDownloadErrorReport = () => {
    if (!previewRows) return;
    const allErrors = previewRows.flatMap((r) =>
      r.errors.map((msg) => ({
        row: r.rowNumber,
        id: r.id || 'N/A',
        field: 'General',
        message: msg,
      }))
    );
    const csv = generateErrorReportCSV(allErrors);
    downloadCSV(csv, 'participant_import_errors.csv');
  };

  return (
    <div className="space-y-6">
      {/* Top Template Download Strip */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div>
          <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Official Badminton Participant Templates
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Download standard format templates to populate your players without format errors.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => downloadCSV(generateBlankParticipationCSV(), 'badminton_participation_template.csv')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Blank CSV Template
          </button>
          <button
            type="button"
            onClick={() => downloadCSV(generateCombinedParticipationCSV(), 'badminton_sample_combined.csv')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer shadow-2xs"
          >
            <FileText className="w-3.5 h-3.5 text-blue-500" />
            Sample Combined CSV
          </button>
          <button
            type="button"
            onClick={() => downloadCSV(generateSinglesOnlyCSV(), 'badminton_sample_singles.csv')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-indigo-500" />
            Singles-Only CSV
          </button>
          <button
            type="button"
            onClick={() => downloadCSV(generateDoublesOnlyCSV(), 'badminton_sample_doubles.csv')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-purple-500" />
            Doubles-Only CSV
          </button>
        </div>
      </div>

      {/* Upload & Configuration Card */}
      {!previewRows ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-blue-600" />
              Upload Participant Roster (.csv, .xlsx, .xls)
            </h3>

            {/* Import Mode Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  importMode === 'combined'
                    ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-300'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="importMode"
                  value="combined"
                  checked={importMode === 'combined'}
                  onChange={() => setImportMode('combined')}
                  className="sr-only"
                />
                <span className="font-bold text-xs text-slate-900 block">1. Combined Roster</span>
                <span className="text-[11px] text-slate-500 block mt-1">
                  Has separate &quot;Singles&quot; and &quot;Doubles&quot; columns (Yes/No).
                </span>
              </label>

              <label
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  importMode === 'singles-only'
                    ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-300'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="importMode"
                  value="singles-only"
                  checked={importMode === 'singles-only'}
                  onChange={() => setImportMode('singles-only')}
                  className="sr-only"
                />
                <span className="font-bold text-xs text-slate-900 block">2. Singles-Only File</span>
                <span className="text-[11px] text-slate-500 block mt-1">
                  Automatically registers all rows exclusively for Singles.
                </span>
              </label>

              <label
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  importMode === 'doubles-only'
                    ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-300'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="importMode"
                  value="doubles-only"
                  checked={importMode === 'doubles-only'}
                  onChange={() => setImportMode('doubles-only')}
                  className="sr-only"
                />
                <span className="font-bold text-xs text-slate-900 block">3. Doubles-Only File</span>
                <span className="text-[11px] text-slate-500 block mt-1">
                  Automatically registers all rows exclusively for Doubles.
                </span>
              </label>
            </div>

            {/* Re-import Strategy */}
            {existingParticipants.length > 0 && (
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 text-xs">
                <span className="font-bold text-amber-900 block">
                  Existing Data Detected ({existingParticipants.length} registered participants):
                </span>
                <div className="flex items-center gap-4 text-amber-800">
                  <label className="flex items-center gap-2 cursor-pointer font-medium">
                    <input
                      type="radio"
                      name="strategy"
                      value="replace"
                      checked={saveStrategy === 'replace'}
                      onChange={() => setSaveStrategy('replace')}
                    />
                    Replace existing participant roster
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-medium">
                    <input
                      type="radio"
                      name="strategy"
                      value="append"
                      checked={saveStrategy === 'append'}
                      onChange={() => setSaveStrategy('append')}
                    />
                    Append new participants (update existing IDs)
                  </label>
                </div>
              </div>
            )}

            {/* File Dropzone */}
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-blue-500 transition-colors bg-slate-50/50">
              <input
                type="file"
                id="participant-file-input"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isProcessing}
              />
              <label
                htmlFor="participant-file-input"
                className="cursor-pointer flex flex-col items-center justify-center space-y-2"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-xs">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="font-bold text-xs text-slate-900">
                  {isProcessing ? 'Processing participant file...' : 'Click to browse or drag & drop participation file'}
                </div>
                <div className="text-[11px] text-slate-500">
                  Accepts .CSV, .XLSX, and .XLS workbooks
                </div>
              </label>
            </div>
          </div>
        </div>
      ) : (
        /* Preview & Error Table */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden space-y-4">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/70">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Participant Preview: {fileName}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                  {previewRows.length} total rows
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Review imported rows before saving. You can edit invalid cells or remove bad rows inline.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewRows(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                Choose Different File
              </button>

              {errorCount > 0 && (
                <button
                  type="button"
                  onClick={handleDownloadErrorReport}
                  className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Error Report ({errorCount})
                </button>
              )}

              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={validCount === 0}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 rounded-lg transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Import {validCount} Valid Records
              </button>
            </div>
          </div>

          {/* Validation Metrics Summary */}
          <div className="px-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Parsed</span>
              <span className="text-lg font-bold text-slate-900">{previewRows.length} rows</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Valid Rows</span>
              <span className="text-lg font-bold text-emerald-800">{validCount} ready</span>
            </div>
            <div className={`p-3 rounded-xl border text-xs ${errorCount > 0 ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Errors</span>
              <span className={`text-lg font-bold ${errorCount > 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                {errorCount} need review
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-y border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">Row</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Player ID</th>
                  <th className="py-2.5 px-3">Player Name</th>
                  <th className="py-2.5 px-3">Team</th>
                  <th className="py-2.5 px-3">Office</th>
                  <th className="py-2.5 px-3">Singles</th>
                  <th className="py-2.5 px-3">Doubles</th>
                  <th className="py-2.5 px-3">Validation Notes</th>
                  <th className="py-2.5 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewRows.map((row, idx) => (
                  <tr key={idx} className={row.isValid ? 'hover:bg-slate-50/70' : 'bg-rose-50/40'}>
                    <td className="py-2 px-3 font-mono text-slate-500">{row.rowNumber}</td>
                    <td className="py-2 px-3">
                      {row.isValid ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Valid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700">
                          <AlertCircle className="w-3 h-3 text-rose-600" /> Error
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-900">
                      <input
                        type="text"
                        value={row.id}
                        onChange={(e) => handleRowEdit(idx, 'id', e.target.value)}
                        className="w-24 px-1.5 py-0.5 border border-slate-200 rounded text-xs bg-white"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => handleRowEdit(idx, 'name', e.target.value)}
                        className="w-36 px-1.5 py-0.5 border border-slate-200 rounded text-xs bg-white font-medium"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <select
                        value={row.team}
                        onChange={(e) => handleRowEdit(idx, 'team', e.target.value)}
                        className="px-1.5 py-0.5 border border-slate-200 rounded text-xs bg-white font-semibold"
                      >
                        <option value="White Team">White Team</option>
                        <option value="Red Team">Red Team</option>
                        <option value="Blue Team">Blue Team</option>
                        <option value="Grey Team">Grey Team</option>
                      </select>
                    </td>
                    <td className="py-2 px-3 text-slate-600">{row.office || 'N/A'}</td>
                    <td className="py-2 px-3">
                      <select
                        value={row.singles ? 'Yes' : 'No'}
                        onChange={(e) => handleRowEdit(idx, 'singles', e.target.value === 'Yes')}
                        className="px-1.5 py-0.5 border border-slate-200 rounded text-xs bg-white font-medium"
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <select
                        value={row.doubles ? 'Yes' : 'No'}
                        onChange={(e) => handleRowEdit(idx, 'doubles', e.target.value === 'Yes')}
                        className="px-1.5 py-0.5 border border-slate-200 rounded text-xs bg-white font-medium"
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </td>
                    <td className="py-2 px-3 text-[11px]">
                      {row.errors.length > 0 && (
                        <div className="text-rose-700 font-medium">{row.errors.join(', ')}</div>
                      )}
                      {row.warnings.length > 0 && (
                        <div className="text-amber-700">{row.warnings.join(', ')}</div>
                      )}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleRowDelete(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                        title="Remove row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
