import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { BadmintonFixture, MatchCategory, FixtureConflict } from '@/types/fixture';
import { Participant } from '@/types/badminton';
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
 * Export fixtures directly to CSV with specified filenames.
 */
export function exportFixturesToCSV(
  fixtures: BadmintonFixture[],
  categoryFilter?: MatchCategory,
  fileName?: string
): void {
  const actualFileName =
    fileName ||
    (categoryFilter === 'Singles'
      ? 'badminton_singles_fixtures.csv'
      : categoryFilter === 'Doubles'
      ? 'badminton_doubles_fixtures.csv'
      : 'badminton_all_fixtures.csv');

  const content = generateFixturesCSV(fixtures, categoryFilter);
  downloadCSV(content, actualFileName);
}

/**
 * Generate CSV text for participants, optionally filtered by category eligibility.
 */
export function generateParticipantsCSV(
  participants: Participant[],
  categoryFilter?: 'Singles' | 'Doubles' | 'All'
): string {
  const headers = ['Player ID', 'Player Name', 'Team', 'Office', 'Singles', 'Doubles', 'Gender'];
  const rows: string[] = [headers.map(escapeCSVField).join(',')];

  const filtered = participants.filter((p) => {
    if (categoryFilter === 'Singles') return p.singlesRegistered;
    if (categoryFilter === 'Doubles') return p.doublesRegistered;
    return true;
  });

  filtered.forEach((p) => {
    rows.push(
      [
        escapeCSVField(p.id),
        escapeCSVField(p.name),
        escapeCSVField(p.team),
        escapeCSVField(p.office || ''),
        escapeCSVField(p.singlesRegistered ? 'Yes' : 'No'),
        escapeCSVField(p.doublesRegistered ? 'Yes' : 'No'),
        escapeCSVField(p.gender || ''),
      ].join(',')
    );
  });

  return rows.join('\r\n');
}

/**
 * Export participants directly to CSV.
 */
export function exportParticipantsToCSV(
  participants: Participant[],
  categoryFilter: 'Singles' | 'Doubles' | 'All' = 'All',
  fileName?: string
): void {
  const actualFileName =
    fileName ||
    (categoryFilter === 'Singles'
      ? 'badminton_singles_participants.csv'
      : categoryFilter === 'Doubles'
      ? 'badminton_doubles_participants.csv'
      : 'badminton_all_participants.csv');

  const content = generateParticipantsCSV(participants, categoryFilter);
  downloadCSV(content, actualFileName);
}

/**
 * Generates styled ExcelJS workbook with all 6 required worksheets:
 * 1. Singles Fixtures
 * 2. Doubles Fixtures
 * 3. Singles Participants
 * 4. Doubles Participants
 * 5. Participation Summary
 * 6. Validation Report
 */
export async function generateStyledMasterWorkbook(
  fixtures: BadmintonFixture[],
  participants: Participant[],
  conflicts: FixtureConflict[] = []
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Solidpro Badminton Tournament Studio';
  workbook.created = new Date();

  const singlesFixtures = fixtures.filter((f) => f.category === 'Singles');
  const doublesFixtures = fixtures.filter((f) => f.category === 'Doubles');
  const singlesParticipants = participants.filter((p) => p.singlesRegistered);
  const doublesParticipants = participants.filter((p) => p.doublesRegistered);

  const defaultBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  };

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
  // 1. SINGLES FIXTURES WORKSHEET
  // -------------------------------------------------------------
  const singlesSheet = workbook.addWorksheet('Singles Fixtures', {
    views: [{ state: 'frozen', ySplit: 2 }],
    properties: { tabColor: { argb: 'FF2563EB' } },
  });

  singlesSheet.mergeCells('A1:K1');
  const sTitle = singlesSheet.getCell('A1');
  sTitle.value = `🏸 Solidpro Badminton Tournament — Singles Fixtures (${singlesFixtures.length} Matches)`;
  sTitle.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FF1E3A8A' } };
  sTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
  sTitle.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  singlesSheet.getRow(1).height = 36;

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

      if (colNumber === 4 || colNumber === 7) {
        cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      }
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
  // 2. DOUBLES FIXTURES WORKSHEET
  // -------------------------------------------------------------
  const doublesSheet = workbook.addWorksheet('Doubles Fixtures', {
    views: [{ state: 'frozen', ySplit: 2 }],
    properties: { tabColor: { argb: 'FF7C3AED' } },
  });

  doublesSheet.mergeCells('A1:M1');
  const dTitle = doublesSheet.getCell('A1');
  dTitle.value = `🏸 Solidpro Badminton Tournament — Doubles Fixtures (${doublesFixtures.length} Matches)`;
  dTitle.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FF581C87' } };
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

      if ([4, 5, 8, 9].includes(colNumber)) {
        cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      }
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
  // 3. SINGLES PARTICIPANTS WORKSHEET
  // -------------------------------------------------------------
  const spSheet = workbook.addWorksheet('Singles Participants', {
    views: [{ state: 'frozen', ySplit: 1 }],
    properties: { tabColor: { argb: 'FF0284C7' } },
  });
  spSheet.columns = [
    { header: 'Player ID', key: 'id', width: 14 },
    { header: 'Player Name', key: 'name', width: 26 },
    { header: 'Team', key: 'team', width: 18 },
    { header: 'Office (Informational)', key: 'office', width: 22 },
    { header: 'Gender', key: 'gender', width: 14 },
    { header: 'Singles Status', key: 'status', width: 16 },
  ];
  spSheet.getRow(1).height = 26;
  spSheet.getRow(1).eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0369A1' } };
    c.border = defaultBorder;
    c.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  singlesParticipants.forEach((p, i) => {
    const row = spSheet.addRow({
      id: p.id,
      name: p.name,
      team: p.team,
      office: p.office || 'N/A',
      gender: p.gender || 'N/A',
      status: 'Registered',
    });
    row.height = 22;
    row.eachCell((c) => {
      c.border = defaultBorder;
      c.font = { name: 'Segoe UI', size: 10 };
    });
  });

  // -------------------------------------------------------------
  // 4. DOUBLES PARTICIPANTS WORKSHEET
  // -------------------------------------------------------------
  const dpSheet = workbook.addWorksheet('Doubles Participants', {
    views: [{ state: 'frozen', ySplit: 1 }],
    properties: { tabColor: { argb: 'FF9333EA' } },
  });
  dpSheet.columns = [
    { header: 'Player ID', key: 'id', width: 14 },
    { header: 'Player Name', key: 'name', width: 26 },
    { header: 'Team', key: 'team', width: 18 },
    { header: 'Office (Informational)', key: 'office', width: 22 },
    { header: 'Gender', key: 'gender', width: 14 },
    { header: 'Doubles Status', key: 'status', width: 16 },
  ];
  dpSheet.getRow(1).height = 26;
  dpSheet.getRow(1).eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7E22CE' } };
    c.border = defaultBorder;
    c.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  doublesParticipants.forEach((p) => {
    const row = dpSheet.addRow({
      id: p.id,
      name: p.name,
      team: p.team,
      office: p.office || 'N/A',
      gender: p.gender || 'N/A',
      status: 'Registered',
    });
    row.height = 22;
    row.eachCell((c) => {
      c.border = defaultBorder;
      c.font = { name: 'Segoe UI', size: 10 };
    });
  });

  // -------------------------------------------------------------
  // 5. PARTICIPATION SUMMARY WORKSHEET
  // -------------------------------------------------------------
  const summarySheet = workbook.addWorksheet('Participation Summary', {
    properties: { tabColor: { argb: 'FF059669' } },
  });

  summarySheet.mergeCells('A1:F1');
  const sumTitle = summarySheet.getCell('A1');
  sumTitle.value = '🏸 Tournament Fixtures & Participation Summary Matrix';
  sumTitle.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FF064E3B' } };
  sumTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
  sumTitle.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  summarySheet.getRow(1).height = 36;

  summarySheet.columns = [
    { width: 28 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
  ];

  const statRows = [
    ['Total Registered Participants', participants.length],
    ['Singles Eligible Players', singlesParticipants.length],
    ['Doubles Eligible Players', doublesParticipants.length],
    ['Registered for Both Categories', participants.filter((p) => p.singlesRegistered && p.doublesRegistered).length],
    ['Total Configured Fixtures', fixtures.length],
    ['Singles Fixtures Count', singlesFixtures.length],
    ['Doubles Fixtures Count', doublesFixtures.length],
    ['Scheduled Matches', fixtures.filter((f) => f.status === 'Scheduled').length],
    ['Completed Matches', fixtures.filter((f) => f.status === 'Completed').length],
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

  // Team Participation Breakdown
  summarySheet.addRow([]);
  summarySheet.addRow(['Team Participation Roster Breakdown']).font = { bold: true, size: 12 };
  const teamBreakdownHeader = ['Team', 'Total Players', 'Singles Players', 'Doubles Players', 'Both Categories'];
  const tBRow = summarySheet.addRow(teamBreakdownHeader);
  tBRow.eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    c.border = defaultBorder;
    c.alignment = { horizontal: 'center' };
  });

  const teamList = ['White Team', 'Red Team', 'Blue Team', 'Grey Team'];
  teamList.forEach((tName) => {
    const tPlayers = participants.filter((p) => p.team === tName);
    const r = summarySheet.addRow([
      tName,
      tPlayers.length,
      tPlayers.filter((p) => p.singlesRegistered).length,
      tPlayers.filter((p) => p.doublesRegistered).length,
      tPlayers.filter((p) => p.singlesRegistered && p.doublesRegistered).length,
    ]);
    r.eachCell((c) => {
      c.border = defaultBorder;
      c.alignment = { horizontal: 'center' };
      c.font = { name: 'Segoe UI', size: 10 };
    });
  });

  // -------------------------------------------------------------
  // 6. VALIDATION REPORT WORKSHEET
  // -------------------------------------------------------------
  const valSheet = workbook.addWorksheet('Validation Report', {
    views: [{ state: 'frozen', ySplit: 1 }],
    properties: { tabColor: { argb: 'FFE11D48' } },
  });
  valSheet.columns = [
    { header: 'Fixture ID', key: 'fixtureId', width: 14 },
    { header: 'Severity', key: 'severity', width: 14 },
    { header: 'Conflict Type', key: 'type', width: 24 },
    { header: 'Validation Message', key: 'message', width: 50 },
    { header: 'Conflicting Match', key: 'conflictMatch', width: 18 },
  ];
  valSheet.getRow(1).height = 26;
  valSheet.getRow(1).eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE11D48' } };
    c.border = defaultBorder;
    c.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  if (conflicts.length === 0) {
    const r = valSheet.addRow({
      fixtureId: 'N/A',
      severity: 'Passed',
      type: 'Clean Validation',
      message: 'All fixtures and participant rosters passed tournament validation with zero conflicts.',
      conflictMatch: 'None',
    });
    r.eachCell((c) => {
      c.border = defaultBorder;
      c.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF059669' } };
    });
  } else {
    conflicts.forEach((c) => {
      const r = valSheet.addRow({
        fixtureId: c.fixtureId,
        severity: c.severity.toUpperCase(),
        type: c.type,
        message: c.message,
        conflictMatch: c.conflictingFixtureId || 'N/A',
      });
      r.eachCell((cell) => {
        cell.border = defaultBorder;
        cell.font = { name: 'Segoe UI', size: 10 };
      });
    });
  }

  return workbook;
}

/**
 * Triggers browser download of Master Fixtures Excel file (with all 6 sheets).
 */
export async function exportMasterFixturesExcel(
  fixtures: BadmintonFixture[],
  participants: Participant[] = [],
  conflicts: FixtureConflict[] = [],
  fileName: string = 'badminton_master_fixtures.xlsx'
): Promise<void> {
  try {
    const workbook = await generateStyledMasterWorkbook(fixtures, participants, conflicts);
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
    console.warn('Falling back to SheetJS for master fixtures workbook:', err);
    const wb = XLSX.utils.book_new();

    const singlesData = fixtures.filter((f) => f.category === 'Singles').map((f) => ({
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
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(singlesData), 'Singles Fixtures');

    const doublesData = fixtures.filter((f) => f.category === 'Doubles').map((f) => ({
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
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(doublesData), 'Doubles Fixtures');

    const participantsData = participants.map((p) => ({
      'Player ID': p.id,
      'Player Name': p.name,
      'Team': p.team,
      'Office': p.office || '',
      'Singles': p.singlesRegistered ? 'Yes' : 'No',
      'Doubles': p.doublesRegistered ? 'Yes' : 'No',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(participantsData), 'Participants');

    XLSX.writeFile(wb, fileName);
  }
}
