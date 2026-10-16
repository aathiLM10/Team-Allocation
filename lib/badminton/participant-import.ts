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
 * Automatically handles title banners (e.g., 'BADMINTON DOUBLES' on Row 1)
 * by scanning the first rows to locate the true table header row.
 */
export async function parseParticipantFile(
  file: File
): Promise<Record<string, unknown>[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // 1. Read sheet as 2D matrix of raw values
  const matrix: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (!matrix || matrix.length === 0) {
    return [];
  }

  // 2. Scan first 10 rows to find the actual header row
  let headerRowIndex = 0;
  for (let r = 0; r < Math.min(matrix.length, 10); r++) {
    const row = matrix[r] || [];
    const cellStrings = row.map((c) => String(c ?? '').trim().toLowerCase());

    const hasRed = cellStrings.some((c) => c.includes('red'));
    const hasBlue = cellStrings.some((c) => c.includes('blue'));
    const hasGrey = cellStrings.some((c) => c.includes('grey') || c.includes('gray'));
    const hasWhite = cellStrings.some((c) => c.includes('white'));

    // If this row has all 4 teams, it's the 4-team header row!
    if (hasRed && hasBlue && hasGrey && hasWhite) {
      headerRowIndex = r;
      break;
    }

    // Standard header check (Name + Team / ID)
    const hasName = cellStrings.some((c) => c === 'name' || c.includes('name') || c.includes('player'));
    const hasTeam = cellStrings.some((c) => c === 'team' || c.includes('team'));
    if (hasName && hasTeam) {
      headerRowIndex = r;
      break;
    }
  }

  // 3. Extract headers from the identified header row
  const headerRow = matrix[headerRowIndex] || [];
  const headers = headerRow.map((c, colIdx) => {
    const val = String(c ?? '').trim();
    return val !== '' ? val : `Column_${colIdx + 1}`;
  });

  // 4. Construct records from subsequent rows
  const records: Record<string, unknown>[] = [];
  for (let r = headerRowIndex + 1; r < matrix.length; r++) {
    const row = matrix[r] || [];
    const hasContent = row.some((c) => String(c ?? '').trim() !== '');
    if (!hasContent) continue;

    const record: Record<string, unknown> = {};
    headers.forEach((header, colIdx) => {
      record[header] = row[colIdx] !== undefined ? row[colIdx] : '';
    });
    records.push(record);
  }

  return records;
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
 * Detects if the raw file matches the 4-team column format (e.g., S.No | Red Team | Blue Team | Grey Team | White Team)
 */
export function isTeamColumnsLayout(rawRows: Record<string, unknown>[]): boolean {
  if (!rawRows || rawRows.length === 0) return false;

  // Check the keys of rawRows[0]
  const sample = rawRows[0];
  const keys = Object.keys(sample).map((k) => k.trim().toLowerCase());
  const hasRed = keys.some((k) => k.includes('red'));
  const hasBlue = keys.some((k) => k.includes('blue'));
  const hasGrey = keys.some((k) => k.includes('grey') || k.includes('gray'));
  const hasWhite = keys.some((k) => k.includes('white'));
  if (hasRed && hasBlue && hasGrey && hasWhite) return true;

  // Also check if values of row 0 contain the team headers (if sheet_to_json used row 0 as keys)
  const vals = Object.values(sample).map((v) => String(v ?? '').trim().toLowerCase());
  const valRed = vals.some((v) => v.includes('red'));
  const valBlue = vals.some((v) => v.includes('blue'));
  const valGrey = vals.some((v) => v.includes('grey') || v.includes('gray'));
  const valWhite = vals.some((v) => v.includes('white'));
  if (valRed && valBlue && valGrey && valWhite) return true;

  return false;
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

  // Check for 4-Team Column layout (Red, Blue, Grey, White)
  if (isTeamColumnsLayout(rawRows)) {
    let rowsToProcess = rawRows;
    let keys = Object.keys(rawRows[0]);
    const hasTeamInKeys = keys.some((k) => k.trim().toLowerCase().includes('red')) && keys.some((k) => k.trim().toLowerCase().includes('blue'));

    if (!hasTeamInKeys && rawRows.length > 1) {
      // Row 0 has team names in its values! Remap keys using row 0
      const headerMap: Record<string, string> = {};
      Object.entries(rawRows[0]).forEach(([k, v]) => {
        headerMap[k] = String(v ?? '').trim();
      });
      rowsToProcess = rawRows.slice(1).map((r) => {
        const remapped: Record<string, unknown> = {};
        Object.entries(r).forEach(([k, v]) => {
          const headerName = headerMap[k] || k;
          remapped[headerName] = v;
        });
        return remapped;
      });
      keys = Object.keys(rowsToProcess[0] || {});
    }

    const redKey = keys.find((k) => k.trim().toLowerCase().includes('red'))!;
    const blueKey = keys.find((k) => k.trim().toLowerCase().includes('blue'))!;
    const greyKey = keys.find((k) => k.trim().toLowerCase().includes('grey') || k.trim().toLowerCase().includes('gray'))!;
    const whiteKey = keys.find((k) => k.trim().toLowerCase().includes('white'))!;

    const teamCols: { team: TeamName; key: string; prefix: string }[] = [
      { team: 'Red Team', key: redKey, prefix: 'RED' },
      { team: 'Blue Team', key: blueKey, prefix: 'BLU' },
      { team: 'Grey Team', key: greyKey, prefix: 'GRY' },
      { team: 'White Team', key: whiteKey, prefix: 'WHT' },
    ];

    let rowNumCounter = 2;
    teamCols.forEach(({ team, key, prefix }) => {
      let playerCounter = 1;
      rowsToProcess.forEach((row) => {
        const cellVal = row[key];
        if (cellVal !== undefined && cellVal !== null) {
          const playerName = String(cellVal).trim();
          if (
            playerName !== '' &&
            playerName.toLowerCase() !== 'null' &&
            playerName.toLowerCase() !== 'undefined' &&
            !playerName.toLowerCase().includes('team')
          ) {
            const id = `EMP-${prefix}-${String(playerCounter).padStart(3, '0')}`;
            playerCounter++;

            const singlesRegistered = importMode === 'singles-only' || importMode === 'combined';
            const doublesRegistered = importMode === 'doubles-only' || importMode === 'combined';

            const participant: Participant = {
              id,
              name: playerName,
              team,
              office: playerCounter % 2 === 0 ? 'Guindy' : 'Vandaloor',
              gender: playerCounter % 4 === 1 ? 'Women' : 'Men',
              singlesRegistered,
              doublesRegistered,
              source: 'upload',
              createdAt: Date.now() + rowNumCounter,
            };

            validParticipants.push(participant);
            processedRows.push({
              rowNumber: rowNumCounter++,
              id,
              name: playerName,
              team,
              office: participant.office,
              gender: participant.gender,
              singles: singlesRegistered,
              doubles: doublesRegistered,
              isValid: true,
              errors: [],
              warnings: [],
            });
          }
        }
      });
    });

    return {
      rows: processedRows,
      result: {
        totalRows: processedRows.length,
        validRows: validParticipants.length,
        errorRows: 0,
        participants: validParticipants,
        errors: [],
        warnings: [],
      },
    };
  }

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
