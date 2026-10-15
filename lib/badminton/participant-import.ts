import * as XLSX from 'xlsx';
import {
  Participant,
  ParticipantImportRow,
  ParticipantImportResult,
  ImportCategoryMode,
} from '@/types/badminton';
import { TeamName, TEAM_NAMES } from '@/types/employee';

/**
 * Normalizes text to standard TeamName
 */
export function normalizeTeamName(raw: string | undefined): TeamName | null {
  if (!raw) return null;
  const cleaned = raw.trim().toLowerCase();

  if (cleaned.includes('white')) return 'White Team';
  if (cleaned.includes('red')) return 'Red Team';
  if (cleaned.includes('blue')) return 'Blue Team';
  if (cleaned.includes('grey') || cleaned.includes('gray')) return 'Grey Team';

  // Exact match check
  const exact = TEAM_NAMES.find((t) => t.toLowerCase() === cleaned);
  return exact || null;
}

/**
 * Parses flexible boolean strings: Yes/No, Y/N, True/False, 1/0
 */
export function parseFlexibleBoolean(val: unknown): boolean | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val === 1 ? true : val === 0 ? false : null;

  const str = String(val).trim().toLowerCase();
  if (str === '') return null;
  if (['yes', 'y', 'true', '1'].includes(str)) return true;
  if (['no', 'n', 'false', '0'].includes(str)) return false;

  return null;
}

/**
 * Parses raw file buffer/array (CSV, XLSX, XLS) into raw record rows.
 */
export async function parseParticipantFile(
  file: File
): Promise<Record<string, unknown>[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
  });
  return rawRows;
}

/**
 * Finds the matching header key from various column aliases.
 */
function findHeaderValue(row: Record<string, unknown>, aliases: string[]): string {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const match = keys.find((k) => k.trim().toLowerCase() === alias.toLowerCase());
    if (match && row[match] !== undefined) {
      return String(row[match]).trim();
    }
  }
  return '';
}

/**
 * Validates and processes parsed participant rows.
 */
export function processParticipantRows(
  rawRows: Record<string, unknown>[],
  importMode: ImportCategoryMode = 'combined',
  existingParticipants: Participant[] = []
): {
  rows: ParticipantImportRow[];
  result: ParticipantImportResult;
} {
  const processedRows: ParticipantImportRow[] = [];
  const validParticipants: Participant[] = [];
  const errorsList: { row: number; id: string; field: string; message: string }[] = [];
  const warningsList: { row: number; id: string; field: string; message: string }[] = [];

  const seenIdsInFile = new Set<string>();
  const seenNamesInFile = new Set<string>();
  const existingIdSet = new Set(existingParticipants.map((p) => p.id.toLowerCase()));
  const existingNameSet = new Set(existingParticipants.map((p) => p.name.toLowerCase()));

  rawRows.forEach((row, idx) => {
    const rowNumber = idx + 2; // Row 1 is header
    const rowErrors: string[] = [];
    const rowWarnings: string[] = [];

    // Extract values with flexible aliases
    const id = findHeaderValue(row, ['Player ID', 'PlayerID', 'ID', 'Emp ID', 'EmpID', 'Employee ID']);
    const name = findHeaderValue(row, ['Player Name', 'PlayerName', 'Name', 'Employee Name', 'Emp Name']);
    const rawTeam = findHeaderValue(row, ['Team', 'Team Name', 'TeamName', 'Assigned Team']);
    const office = findHeaderValue(row, ['Office', 'Office Location', 'Location', 'Branch']);
    const gender = findHeaderValue(row, ['Gender', 'Sex']);
    const rawSingles = findHeaderValue(row, ['Singles', 'Singles Registration', 'Singles Registered']);
    const rawDoubles = findHeaderValue(row, ['Doubles', 'Doubles Registration', 'Doubles Registered']);

    // 1. ID Validation
    if (!id) {
      rowErrors.push('Missing Player ID.');
    } else {
      const lowerId = id.toLowerCase();
      if (seenIdsInFile.has(lowerId)) {
        rowErrors.push(`Duplicate Player ID "${id}" appears multiple times in this file.`);
      } else {
        seenIdsInFile.add(lowerId);
      }
      if (existingIdSet.has(lowerId)) {
        rowWarnings.push(`Player ID "${id}" matches an existing registered participant and will update it if appended.`);
      }
    }

    // 2. Name Validation
    if (!name) {
      rowErrors.push('Missing Player Name.');
    } else {
      const lowerName = name.toLowerCase();
      if (seenNamesInFile.has(lowerName)) {
        rowWarnings.push(`Duplicate name "${name}" detected with distinct ID. Not merged.`);
      } else {
        seenNamesInFile.add(lowerName);
      }
      if (existingNameSet.has(lowerName)) {
        rowWarnings.push(`Player with name "${name}" already exists in roster (different ID).`);
      }
    }

    // 3. Team Validation & Normalization
    const team = normalizeTeamName(rawTeam);
    if (!rawTeam) {
      rowErrors.push('Missing Team assignment (must be White, Red, Blue, or Grey Team).');
    } else if (!team) {
      rowErrors.push(`Invalid Team "${rawTeam}". Must be White Team, Red Team, Blue Team, or Grey Team.`);
    }

    // 4. Category Registration Determination
    let singlesRegistered = false;
    let doublesRegistered = false;

    if (importMode === 'singles-only') {
      singlesRegistered = true;
      doublesRegistered = false;
    } else if (importMode === 'doubles-only') {
      singlesRegistered = false;
      doublesRegistered = true;
    } else {
      // Combined file
      const singlesBool = parseFlexibleBoolean(rawSingles);
      const doublesBool = parseFlexibleBoolean(rawDoubles);

      if (singlesBool === null) {
        rowErrors.push(`Singles participation cannot be blank. Specify Yes/No (got "${rawSingles}").`);
      } else {
        singlesRegistered = singlesBool;
      }

      if (doublesBool === null) {
        rowErrors.push(`Doubles participation cannot be blank. Specify Yes/No (got "${rawDoubles}").`);
      } else {
        doublesRegistered = doublesBool;
      }
    }

    const isValid = rowErrors.length === 0;

    rowErrors.forEach((err) => {
      errorsList.push({ row: rowNumber, id: id || 'N/A', field: 'General', message: err });
    });
    rowWarnings.forEach((warn) => {
      warningsList.push({ row: rowNumber, id: id || 'N/A', field: 'General', message: warn });
    });

    processedRows.push({
      rowNumber,
      id,
      name,
      team: team || rawTeam,
      office,
      gender,
      singles: singlesRegistered,
      doubles: doublesRegistered,
      isValid,
      errors: rowErrors,
      warnings: rowWarnings,
    });

    if (isValid && team) {
      validParticipants.push({
        id,
        name,
        team,
        office: office || undefined,
        gender: gender || undefined,
        singlesRegistered,
        doublesRegistered,
        source: 'upload',
        createdAt: Date.now(),
      });
    }
  });

  return {
    rows: processedRows,
    result: {
      totalRows: processedRows.length,
      validRows: validParticipants.length,
      errorRows: processedRows.length - validParticipants.length,
      participants: validParticipants,
      errors: errorsList,
      warnings: warningsList,
    },
  };
}

/**
 * Generate CSV Error Report for download
 */
export function generateErrorReportCSV(
  errors: { row: number; id: string; field: string; message: string }[]
): string {
  const headers = ['Row Number', 'Player ID', 'Field', 'Error Message'];
  const rows = [headers.join(',')];

  errors.forEach((e) => {
    rows.push([e.row, `"${e.id}"`, `"${e.field}"`, `"${e.message.replace(/"/g, '""')}"`].join(','));
  });

  return rows.join('\r\n');
}
