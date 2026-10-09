'use client';

import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  X,
  FileCheck,
} from 'lucide-react';
import { parseFileBuffer, detectColumnMapping, RawParsedSheet } from '@/lib/import/employee-parser';
import { ColumnMapping, OfficeLocation } from '@/types/employee';
import { SAMPLE_EMPLOYEES, downloadSampleCSV } from './sample-data';

interface EmployeeUploadProps {
  onDataParsed: (
    parsedSheets: RawParsedSheet[],
    suggestedMapping: ColumnMapping
  ) => void;
  onReset?: () => void;
  activeFileName?: string | null;
}

export function EmployeeUpload({
  onDataParsed,
  onReset,
  activeFileName,
}: EmployeeUploadProps) {
  const [uploadMode, setUploadMode] = useState<'single' | 'separate'>('single');
  const [singleFile, setSingleFile] = useState<File | null>(null);
  const [guindyFile, setGuindyFile] = useState<File | null>(null);
  const [vandaloorFile, setVandaloorFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const singleInputRef = useRef<HTMLInputElement>(null);
  const guindyInputRef = useRef<HTMLInputElement>(null);
  const vandaloorInputRef = useRef<HTMLInputElement>(null);

  const handleProcessFiles = async (
    filesToProcess: { file: File; office?: OfficeLocation }[]
  ) => {
    setIsProcessing(true);
    setUploadError(null);

    try {
      const parsedSheets: RawParsedSheet[] = [];

      for (const item of filesToProcess) {
        const buffer = await item.file.arrayBuffer();
        const sheet = parseFileBuffer(buffer, item.file.name, item.office);

        if (sheet.rows.length === 0) {
          throw new Error(
            `File "${item.file.name}" has no data rows. Please ensure rows follow the header line.`
          );
        }
        parsedSheets.push(sheet);
      }

      const allHeaders = Array.from(
        new Set(parsedSheets.flatMap((s) => s.headers))
      );
      const suggestedMapping = detectColumnMapping(
        allHeaders,
        filesToProcess.length > 1 ? 'Guindy' : undefined
      );

      onDataParsed(parsedSheets, suggestedMapping);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to parse file. Please verify CSV or Excel format.';
      setUploadError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSingleSubmit = () => {
    if (!singleFile) {
      setUploadError('Please select a CSV or Excel employee roster to proceed.');
      return;
    }
    handleProcessFiles([{ file: singleFile }]);
  };

  const handleSeparateSubmit = () => {
    if (!guindyFile || !vandaloorFile) {
      setUploadError('Please select both the Guindy and Vandaloor employee files.');
      return;
    }
    handleProcessFiles([
      { file: guindyFile, office: 'Guindy' },
      { file: vandaloorFile, office: 'Vandaloor' },
    ]);
  };

  const handleLoadSampleData = () => {
    setIsProcessing(true);
    setUploadError(null);
    setSingleFile(null);
    setGuindyFile(null);
    setVandaloorFile(null);

    const sheet: RawParsedSheet = {
      headers: ['Employee Name', 'Gender', 'Office Location'],
      rows: SAMPLE_EMPLOYEES,
      fileName: 'Enterprise_Roster_Demo.csv',
    };

    const mapping = detectColumnMapping(sheet.headers);
    onDataParsed([sheet], mapping);
    setIsProcessing(false);
  };

  const clearSingleFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSingleFile(null);
    setUploadError(null);
    if (singleInputRef.current) singleInputRef.current.value = '';
    if (onReset) onReset();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
      {/* Header bar */}
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Step 1: Employee Data Ingestion
            </h2>
            {activeFileName && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <FileCheck className="w-3.5 h-3.5" />
                Active: {activeFileName}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            Upload CSV rosters containing Employee Name, Gender, and Office Location.
          </p>
        </div>

        {/* Quick action tools */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLoadSampleData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100/80 border border-blue-200/80 rounded-md transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            Load Sample Dataset (56 Emps)
          </button>

          <button
            type="button"
            onClick={() => downloadSampleCSV('single')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Download CSV Template
          </button>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Upload Mode Selector */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg w-fit text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setUploadMode('single');
              setUploadError(null);
            }}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              uploadMode === 'single'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Single Combined CSV
          </button>
          <button
            type="button"
            onClick={() => {
              setUploadMode('separate');
              setUploadError(null);
            }}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              uploadMode === 'separate'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Separate Office Files (Guindy &amp; Vandaloor)
          </button>
        </div>

        {/* Upload Error Alert */}
        {uploadError && (
          <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-semibold text-rose-900">Upload Issue: </span>
              <span className="text-rose-700">{uploadError}</span>
            </div>
          </div>
        )}

        {/* Dropzone Container */}
        {uploadMode === 'single' ? (
          <div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files?.[0]) {
                  setSingleFile(e.dataTransfer.files[0]);
                  setUploadError(null);
                }
              }}
              onClick={() => singleInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/50'
                  : singleFile
                  ? 'border-emerald-400 bg-emerald-50/20'
                  : 'border-slate-300 hover:border-blue-400 bg-slate-50/40 hover:bg-slate-50'
              }`}
            >
              <input
                ref={singleInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setSingleFile(e.target.files[0]);
                    setUploadError(null);
                  }
                }}
              />

              {singleFile ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-emerald-200 shadow-2xs text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {singleFile.name}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {formatFileSize(singleFile.size)} • Ready to validate
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={clearSingleFile}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-11 h-11 mx-auto rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-blue-600 hover:underline">
                      Click to browse
                    </span>{' '}
                    <span className="text-xs text-slate-600">
                      or drag and drop your employee CSV file here
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Standard format: CSV (.csv) or Excel (.xlsx) with Name, Gender, Office columns.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <span className="text-[11px] text-slate-500">
                Supports auto-mapping if headers differ from standard format.
              </span>

              <button
                type="button"
                disabled={!singleFile || isProcessing}
                onClick={handleSingleSubmit}
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white disabled:text-slate-400 text-xs font-semibold rounded-lg shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Parsing &amp; Validating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Process &amp; Inspect Employee Roster
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Guindy Upload Box */}
              <div
                onClick={() => guindyInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4.5 text-center cursor-pointer transition-all ${
                  guindyFile
                    ? 'border-emerald-400 bg-emerald-50/20'
                    : 'border-slate-300 hover:border-blue-400 bg-slate-50/40'
                }`}
              >
                <input
                  ref={guindyInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setGuindyFile(e.target.files[0]);
                      setUploadError(null);
                    }
                  }}
                />
                <div className="w-9 h-9 mx-auto mb-2 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-800">Guindy Office CSV</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                  {guindyFile ? `${guindyFile.name} (${formatFileSize(guindyFile.size)})` : 'Click to select Guindy CSV'}
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadSampleCSV('guindy');
                  }}
                  className="mt-2 text-[11px] text-blue-600 hover:underline font-medium block mx-auto"
                >
                  Download Guindy CSV Template
                </button>
              </div>

              {/* Vandaloor Upload Box */}
              <div
                onClick={() => vandaloorInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4.5 text-center cursor-pointer transition-all ${
                  vandaloorFile
                    ? 'border-indigo-400 bg-indigo-50/20'
                    : 'border-slate-300 hover:border-blue-400 bg-slate-50/40'
                }`}
              >
                <input
                  ref={vandaloorInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setVandaloorFile(e.target.files[0]);
                      setUploadError(null);
                    }
                  }}
                />
                <div className="w-9 h-9 mx-auto mb-2 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-800">Vandaloor Office CSV</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                  {vandaloorFile ? `${vandaloorFile.name} (${formatFileSize(vandaloorFile.size)})` : 'Click to select Vandaloor CSV'}
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadSampleCSV('vandaloor');
                  }}
                  className="mt-2 text-[11px] text-blue-600 hover:underline font-medium block mx-auto"
                >
                  Download Vandaloor CSV Template
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <span className="text-[11px] text-slate-500">
                Office location will be automatically assigned based on file.
              </span>

              <button
                type="button"
                disabled={!guindyFile || !vandaloorFile || isProcessing}
                onClick={handleSeparateSubmit}
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white disabled:text-slate-400 text-xs font-semibold rounded-lg shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Parsing &amp; Validating Both Files...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Process &amp; Combine Both Files
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
