import * as XLSX from 'xlsx';
import { ColumnMapping, OfficeLocation } from '@/types/employee';

export interface SheetBreakdown {
  sheetName: string;
  rowCount: number;
}

export interface RawParsedSheet {
  headers: string[];
  rows: Record<string, unknown>[];
  fileName: string;
  defaultOffice?: OfficeLocation;
  sheetNames?: string[];
  sheetBreakdown?: SheetBreakdown[];
}

/**
 * Parses an Excel or CSV file buffer.
 * Automatically iterates through ALL sheets in the workbook (e.g. Sheet 1 regular employees, Sheet 2 interns)
 * and combines them into a unified roster.
 */
export function parseFileBuffer(
  buffer: ArrayBuffer,
  fileName: string,
  defaultOffice?: OfficeLocation
): RawParsedSheet {
  const workbook = XLSX.read(buffer, { type: 'array' });
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error(`File "${fileName}" does not contain any sheets.`);
  }

  const allRows: Record<string, unknown>[] = [];
  const headersSet = new Set<string>();
  const parsedSheetNames: string[] = [];
  const sheetBreakdown: SheetBreakdown[] = [];

  // Iterate through EVERY sheet in the workbook
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    const sheetRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: '',
      raw: false,
      blankrows: false,
    });

    if (sheetRows.length > 0) {
      parsedSheetNames.push(sheetName);
      sheetBreakdown.push({
        sheetName,
        rowCount: sheetRows.length,
      });

      // Detect column mapping specific to THIS sheet (e.g. Sheet 1: Emp Name, Sheet 2: Candidate Name)
      const sheetHeaders = Object.keys(sheetRows[0]).filter((k) => k.trim() && !k.startsWith('__'));
      const sheetMapping = detectColumnMapping(sheetHeaders, defaultOffice);

      sheetRows.forEach((row) => {
        // Check if row has at least one substantive value (not just an S.No or blank formula)
        const substantiveKeys = Object.keys(row).filter((k) => {
          const l = k.toLowerCase().replace(/[^a-z0-9]/g, '');
          return l !== 'sno' && l !== 'no' && l !== 'slno' && !k.startsWith('__');
        });
        const hasContent = substantiveKeys.some((k) => String(row[k] ?? '').trim().length > 0);
        if (!hasContent) {
          // Skip empty trailing rows
          return;
        }

        // Tag row with source sheet name and sheet-specific mapping for robust resolution
        const taggedRow = {
          ...row,
          __sheetName__: sheetName,
          __sheetMapping__: sheetMapping,
        };
        allRows.push(taggedRow);

        // Collect header names
        Object.keys(row).forEach((k) => {
          const trimmed = k.trim();
          if (trimmed && !trimmed.startsWith('__')) {
            headersSet.add(trimmed);
          }
        });
      });
    }
  }

  if (allRows.length === 0) {
    return {
      headers: [],
      rows: [],
      fileName,
      defaultOffice,
      sheetNames: [],
      sheetBreakdown: [],
    };
  }

  const headers = Array.from(headersSet);

  return {
    headers,
    rows: allRows,
    fileName,
    defaultOffice,
    sheetNames: parsedSheetNames,
    sheetBreakdown,
  };
}

export function detectColumnMapping(
  headers: string[],
  defaultOffice?: OfficeLocation
): ColumnMapping {
  const normalizedHeaders = headers.map((h) => ({
    original: h,
    lower: h.toLowerCase().replace(/[^a-z0-9]/g, ''),
  }));

  const nameMatches = [
    'employeename',
    'candidatename',
    'candidate',
    'name',
    'empname',
    'fullname',
    'member',
    'employee',
    'internname',
    'intern',
    'trainee',
  ];
  const genderMatches = ['gender', 'sex', 'mf'];
  const officeMatches = ['officelocation', 'office', 'location', 'branch', 'site', 'workplace'];

  let nameColumn = '';
  let genderColumn = '';
  let officeColumn = '';

  for (const item of normalizedHeaders) {
    if (!nameColumn && nameMatches.some((m) => item.lower === m || item.lower.includes('name') || item.lower.includes('candidate'))) {
      nameColumn = item.original;
      break;
    }
  }

  for (const item of normalizedHeaders) {
    if (!genderColumn && genderMatches.some((m) => item.lower === m)) {
      genderColumn = item.original;
      break;
    }
  }

  for (const item of normalizedHeaders) {
    if (!officeColumn && officeMatches.some((m) => item.lower === m || item.lower.includes('office') || item.lower.includes('location') || item.lower.includes('branch'))) {
      officeColumn = item.original;
      break;
    }
  }

  // Fallbacks if not detected
  if (!nameColumn && headers.length > 0) nameColumn = headers[0];
  if (!genderColumn && headers.length > 1) genderColumn = headers[1];
  if (!officeColumn && headers.length > 2) officeColumn = headers[2];

  // If dual file has defaultOffice and no officeColumn found, set to '__DEFAULT_OFFICE__'
  if (!officeColumn && defaultOffice) {
    officeColumn = '__DEFAULT_OFFICE__';
  }

  return {
    nameColumn,
    genderColumn,
    officeColumn,
  };
}
