import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { BadmintonFixture, MatchCategory } from '@/types/fixture';
import { escapeCSVField, downloadCSV } from './team-export';

/**
 * Generate CSV text for fixtures, optionally filtered by category.
 */
export function generateFixturesCSV(
  fixtures: BadmintonFixture[],
  categoryFilter?: MatchCategory
): string {
  const filtered = categoryFilter
    ? fixtures.filter((f) => f.category === categoryFilter)
    : fixtures;

  const headers = [
    'Match ID',
    'Category',
    'Team A',
    'Player A1',
    'Player A2',
    'Team B',
    'Player B1',
    'Player B2',
    'Court',
    'Date',
    'Time',
    'Round',
    'Status',
    'Notes',
  ];

  const rows: string[] = [headers.map(escapeCSVField).join(',')];

  filtered.forEach((f) => {
    const isDoubles = f.category === 'Doubles';
    rows.push(
      [
        escapeCSVField(f.id),
        escapeCSVField(f.category),
        escapeCSVField(f.teamA),
        escapeCSVField(f.teamAPlayers[0]?.name || ''),
        escapeCSVField(isDoubles ? f.teamAPlayers[1]?.name || '' : ''),
        escapeCSVField(f.teamB),
        escapeCSVField(f.teamBPlayers[0]?.name || ''),
        escapeCSVField(isDoubles ? f.teamBPlayers[1]?.name || '' : ''),
        escapeCSVField(f.court),
        escapeCSVField(f.scheduledDate),
        escapeCSVField(f.scheduledTime),
        escapeCSVField(f.round),
        escapeCSVField(f.status),
        escapeCSVField(f.notes || ''),
      ].join(',')
    );
  });

  return rows.join('\r\n');
}

/**
 * Export fixtures directly to CSV.
 */
export function exportFixturesToCSV(
  fixtures: BadmintonFixture[],
  categoryFilter?: MatchCategory,
  fileName?: string
): void {
  const actualFileName =
    fileName ||
    (categoryFilter
      ? `Badminton_${categoryFilter}_Fixtures.csv`
      : 'Badminton_Master_Fixtures.csv');

  const content = generateFixturesCSV(fixtures, categoryFilter);
  downloadCSV(content, actualFileName);
}

/**
 * Generates styled ExcelJS workbook for Badminton Fixtures.
 * Contains:
 * - Singles worksheet (with team color badges and clear match layout)
 * - Doubles worksheet (with partners clearly designated)
 * - Summary worksheet (match counts, court schedule, team matchup stats)
 */
export async function generateStyledFixturesWorkbook(
  fixtures: BadmintonFixture[]
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Solidpro Team Studio';
  workbook.created = new Date();

  const singlesFixtures = fixtures.filter((f) => f.category === 'Singles');
  const doublesFixtures = fixtures.filter((f) => f.category === 'Doubles');

  const defaultBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  };

  // Helper for applying team colors
  const getTeamColor = (teamName: string): { fg: string; text: string } => {
    switch (teamName) {
      case 'Red Team':
        return { fg: 'FFFEE2E2', text: 'FF991B1B' };
      case 'Blue Team':
        return { fg: 'FFDBEAFE', text: 'FF1E40AF' };
      case 'Grey Team':
        return { fg: 'FFF1F5F9', text: 'FF334155' };
      case 'White Team':
      default:
        return { fg: 'FFFFFFFF', text: 'FF0F172A' };
    }
  };

  // -------------------------------------------------------------
  // 1. SINGLES WORKSHEET
  // -------------------------------------------------------------
  const singlesSheet = workbook.addWorksheet('Singles', {
    views: [{ state: 'frozen', ySplit: 2 }],
    properties: { tabColor: { argb: 'FF2563EB' } },
  });

  // Title Row
  singlesSheet.mergeCells('A1:K1');
  const sTitle = singlesSheet.getCell('A1');
  sTitle.value = `🏸 Solidpro Badminton Tournament — Singles Fixtures (${singlesFixtures.length} Matches)`;
  sTitle.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
  sTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
  sTitle.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  singlesSheet.getRow(1).height = 36;

  // Header Row
  const sHeaders = [
    'Match ID',
    'Round',
    'Team A',
    'Player A1',
    'VS',
    'Team B',
    'Player B1',
    'Court',
    'Date',
    'Time',
    'Status',
  ];
  const sRow2 = singlesSheet.getRow(2);
  sRow2.values = sHeaders;
  sRow2.height = 26;
  sRow2.eachCell((cell) => {
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = defaultBorder;
  });

  singlesSheet.columns = [
    { key: 'id', width: 12 },
    { key: 'round', width: 16 },
    { key: 'teamA', width: 16 },
    { key: 'playerA1', width: 24 },
    { key: 'vs', width: 8 },
    { key: 'teamB', width: 16 },
    { key: 'playerB1', width: 24 },
    { key: 'court', width: 14 },
    { key: 'date', width: 14 },
    { key: 'time', width: 12 },
    { key: 'status', width: 16 },
  ];

  singlesFixtures.forEach((f, i) => {
    const row = singlesSheet.addRow({
      id: f.id,
      round: f.round,
      teamA: f.teamA,
      playerA1: f.teamAPlayers[0]?.name || '',
      vs: 'VS',
      teamB: f.teamB,
      playerB1: f.teamBPlayers[0]?.name || '',
      court: f.court,
      date: f.scheduledDate,
      time: f.scheduledTime,
      status: f.status,
    });
    row.height = 24;
    const isEven = i % 2 === 0;
    const bg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.border = defaultBorder;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF1E293B' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Highlight Player names
      if (colNumber === 4 || colNumber === 7) {
        cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      }

      // Team colors
      if (colNumber === 3) {
        const c = getTeamColor(f.teamA);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.fg } };
        cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: c.text } };
      }
      if (colNumber === 6) {
        const c = getTeamColor(f.teamB);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.fg } };
        cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: c.text } };
      }
      if (colNumber === 5) {
        cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF94A3B8' } };
      }
    });
  });

  // -------------------------------------------------------------
  // 2. DOUBLES WORKSHEET
  // -------------------------------------------------------------
  const doublesSheet = workbook.addWorksheet('Doubles', {
    views: [{ state: 'frozen', ySplit: 2 }],
    properties: { tabColor: { argb: 'FF7C3AED' } },
  });

  doublesSheet.mergeCells('A1:M1');
  const dTitle = doublesSheet.getCell('A1');
  dTitle.value = `🏸 Solidpro Badminton Tournament — Doubles Fixtures (${doublesFixtures.length} Matches)`;
  dTitle.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FF581C87' } };
  dTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3FF' } };
  dTitle.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  doublesSheet.getRow(1).height = 36;

  const dHeaders = [
    'Match ID',
    'Round',
    'Team A',
    'Partner A1',
    'Partner A2',
    'VS',
    'Team B',
    'Partner B1',
    'Partner B2',
    'Court',
    'Date',
    'Time',
    'Status',
  ];
  const dRow2 = doublesSheet.getRow(2);
  dRow2.values = dHeaders;
  dRow2.height = 26;
  dRow2.eachCell((cell) => {
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6D28D9' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = defaultBorder;
  });

  doublesSheet.columns = [
    { key: 'id', width: 12 },
    { key: 'round', width: 16 },
    { key: 'teamA', width: 16 },
    { key: 'partnerA1', width: 22 },
    { key: 'partnerA2', width: 22 },
    { key: 'vs', width: 8 },
    { key: 'teamB', width: 16 },
    { key: 'partnerB1', width: 22 },
    { key: 'partnerB2', width: 22 },
    { key: 'court', width: 14 },
    { key: 'date', width: 14 },
    { key: 'time', width: 12 },
    { key: 'status', width: 16 },
  ];

  doublesFixtures.forEach((f, i) => {
    const row = doublesSheet.addRow({
      id: f.id,
      round: f.round,
      teamA: f.teamA,
      partnerA1: f.teamAPlayers[0]?.name || '',
      partnerA2: f.teamAPlayers[1]?.name || '',
      vs: 'VS',
      teamB: f.teamB,
      partnerB1: f.teamBPlayers[0]?.name || '',
      partnerB2: f.teamBPlayers[1]?.name || '',
      court: f.court,
      date: f.scheduledDate,
      time: f.scheduledTime,
      status: f.status,
    });
    row.height = 24;
    const isEven = i % 2 === 0;
    const bg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.border = defaultBorder;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF1E293B' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };

      // Highlight partner names
      if ([4, 5, 8, 9].includes(colNumber)) {
        cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      }

      // Team colors
      if (colNumber === 3) {
        const c = getTeamColor(f.teamA);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.fg } };
        cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: c.text } };
      }
      if (colNumber === 7) {
        const c = getTeamColor(f.teamB);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.fg } };
        cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: c.text } };
      }
      if (colNumber === 6) {
        cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF94A3B8' } };
      }
    });
  });

  // -------------------------------------------------------------
  // 3. MASTER SUMMARY WORKSHEET
  // -------------------------------------------------------------
  const summarySheet = workbook.addWorksheet('Summary', {
    properties: { tabColor: { argb: 'FF059669' } },
  });

  summarySheet.mergeCells('A1:F1');
  const sumTitle = summarySheet.getCell('A1');
  sumTitle.value = '🏸 Tournament Fixtures Summary & Court Allocation Matrix';
  sumTitle.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FF064E3B' } };
  sumTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
  sumTitle.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  summarySheet.getRow(1).height = 36;

  // Key KPI Cards
  summarySheet.columns = [
    { width: 24 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
  ];

  const statRows = [
    ['Total Configured Fixtures', fixtures.length],
    ['Singles Matches', singlesFixtures.length],
    ['Doubles Matches', doublesFixtures.length],
    [
      'Scheduled Status',
      fixtures.filter((f) => f.status === 'Scheduled').length,
    ],
    [
      'In Progress Status',
      fixtures.filter((f) => f.status === 'In Progress').length,
    ],
    [
      'Completed Status',
      fixtures.filter((f) => f.status === 'Completed').length,
    ],
  ];

  summarySheet.addRow([]);
  const sHead = summarySheet.addRow(['Metric', 'Count']);
  sHead.eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF047857' } };
    c.border = defaultBorder;
  });

  statRows.forEach(([metric, val]) => {
    const r = summarySheet.addRow([metric, val]);
    r.eachCell((c) => {
      c.border = defaultBorder;
      c.font = { name: 'Segoe UI', size: 10 };
    });
  });

  // Team Participation Matrix
  summarySheet.addRow([]);
  summarySheet.addRow(['Team Matchup Frequency Matrix']).font = { bold: true, size: 12 };
  const teamNames = ['White Team', 'Red Team', 'Blue Team', 'Grey Team'];
  const matrixHeader = ['Team', ...teamNames, 'Total Matches'];
  const mHRow = summarySheet.addRow(matrixHeader);
  mHRow.eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    c.border = defaultBorder;
    c.alignment = { horizontal: 'center' };
  });

  teamNames.forEach((tA) => {
    const rowCounts: (string | number)[] = [tA];
    let teamTotal = 0;
    teamNames.forEach((tB) => {
      if (tA === tB) {
        rowCounts.push('-');
      } else {
        const count = fixtures.filter(
          (f) =>
            (f.teamA === tA && f.teamB === tB) || (f.teamA === tB && f.teamB === tA)
        ).length;
        rowCounts.push(count);
        teamTotal += count;
      }
    });
    rowCounts.push(teamTotal);
    const mRow = summarySheet.addRow(rowCounts);
    mRow.eachCell((c) => {
      c.border = defaultBorder;
      c.alignment = { horizontal: 'center' };
      c.font = { name: 'Segoe UI', size: 10 };
    });
  });

  return workbook;
}

/**
 * Native SheetJS Fallback for master fixtures workbook.
 */
export function generateSheetJSFixturesWorkbook(fixtures: BadmintonFixture[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // Singles
  const singles = fixtures.filter((f) => f.category === 'Singles');
  const singlesData = singles.map((f) => ({
    'Match ID': f.id,
    'Category': f.category,
    'Team A': f.teamA,
    'Player A1': f.teamAPlayers[0]?.name || '',
    'Player A2': '',
    'Team B': f.teamB,
    'Player B1': f.teamBPlayers[0]?.name || '',
    'Player B2': '',
    'Court': f.court,
    'Date': f.scheduledDate,
    'Time': f.scheduledTime,
    'Round': f.round,
    'Status': f.status,
  }));
  const singlesSheet = XLSX.utils.json_to_sheet(singlesData);
  XLSX.utils.book_append_sheet(wb, singlesSheet, 'Singles');

  // Doubles
  const doubles = fixtures.filter((f) => f.category === 'Doubles');
  const doublesData = doubles.map((f) => ({
    'Match ID': f.id,
    'Category': f.category,
    'Team A': f.teamA,
    'Player A1': f.teamAPlayers[0]?.name || '',
    'Player A2': f.teamAPlayers[1]?.name || '',
    'Team B': f.teamB,
    'Player B1': f.teamBPlayers[0]?.name || '',
    'Player B2': f.teamBPlayers[1]?.name || '',
    'Court': f.court,
    'Date': f.scheduledDate,
    'Time': f.scheduledTime,
    'Round': f.round,
    'Status': f.status,
  }));
  const doublesSheet = XLSX.utils.json_to_sheet(doublesData);
  XLSX.utils.book_append_sheet(wb, doublesSheet, 'Doubles');

  // Summary
  const summaryData = [
    { Metric: 'Total Configured Fixtures', Count: fixtures.length },
    { Metric: 'Singles Matches', Count: singles.length },
    { Metric: 'Doubles Matches', Count: doubles.length },
    { Metric: 'Scheduled Status', Count: fixtures.filter((f) => f.status === 'Scheduled').length },
    { Metric: 'In Progress Status', Count: fixtures.filter((f) => f.status === 'In Progress').length },
    { Metric: 'Completed Status', Count: fixtures.filter((f) => f.status === 'Completed').length },
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  return wb;
}

/**
 * Triggers a browser download of the Master Fixtures Excel file.
 */
export async function exportMasterFixturesExcel(
  fixtures: BadmintonFixture[],
  fileName: string = 'Badminton_Tournament_Master_Fixtures.xlsx'
): Promise<void> {
  try {
    const workbook = await generateStyledFixturesWorkbook(fixtures);
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  } catch (err) {
    console.warn('Falling back to SheetJS for fixtures workbook:', err);
    const wb = generateSheetJSFixturesWorkbook(fixtures);
    XLSX.writeFile(wb, fileName);
  }
}
