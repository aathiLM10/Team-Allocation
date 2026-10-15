import ExcelJS from 'exceljs';
import { KnockoutBracket, KnockoutMatch, DoublesPair } from '@/types/knockout';
import { Participant } from '@/types/badminton';

/**
 * Helper to escape CSV cell contents
 */
function escapeCSV(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Formats a knockout match into a CSV row
 */
function matchToCSVRow(match: KnockoutMatch): string[] {
  const sideAName = match.sideA.participant
    ? match.sideA.participant.displayName
    : match.sideA.placeholderText || 'TBD';
  const sideBName = match.sideB.participant
    ? match.sideB.participant.displayName
    : match.sideB.placeholderText || 'TBD';

  const teamA = match.sideA.participant?.team || '';
  const teamB = match.sideB.participant?.team || '';

  const playerIdsA = match.sideA.participant?.players.map((p) => p.id).join(';') || '';
  const playerIdsB = match.sideB.participant?.players.map((p) => p.id).join(';') || '';

  const winner = match.winnerId
    ? match.sideA.isWinner
      ? sideAName
      : sideBName
    : '';

  return [
    match.id,
    match.category,
    match.roundName,
    sideAName,
    sideBName,
    teamA,
    teamB,
    playerIdsA,
    playerIdsB,
    match.sideA.score || match.sideB.score || '',
    match.status,
    winner,
    match.nextMatchId || '',
    match.court,
    match.scheduledDate,
    match.scheduledTime,
  ];
}

const BRACKET_CSV_HEADER = [
  'Match ID',
  'Category',
  'Round',
  'Side A',
  'Side B',
  'Team A',
  'Team B',
  'Player IDs Side A',
  'Player IDs Side B',
  'Score',
  'Status',
  'Winner',
  'Next Match ID',
  'Court',
  'Date',
  'Time',
];

/**
 * Exports a single bracket (Singles or Doubles) to CSV
 */
export function generateKnockoutBracketCSV(bracket: KnockoutBracket): string {
  const rows: string[][] = [BRACKET_CSV_HEADER];

  bracket.rounds.forEach((round) => {
    round.matches.forEach((match) => {
      rows.push(matchToCSVRow(match));
    });
  });

  return rows.map((r) => r.map(escapeCSV).join(',')).join('\n');
}

/**
 * Exports complete bracket CSV (both Singles and Doubles)
 */
export function generateCompleteKnockoutCSV(
  singlesBracket?: KnockoutBracket | null,
  doublesBracket?: KnockoutBracket | null
): string {
  const rows: string[][] = [BRACKET_CSV_HEADER];

  if (singlesBracket) {
    singlesBracket.rounds.forEach((round) => {
      round.matches.forEach((match) => rows.push(matchToCSVRow(match)));
    });
  }

  if (doublesBracket) {
    doublesBracket.rounds.forEach((round) => {
      round.matches.forEach((match) => rows.push(matchToCSVRow(match)));
    });
  }

  return rows.map((r) => r.map(escapeCSV).join(',')).join('\n');
}

/**
 * Exports match results CSV (only completed or walkover matches)
 */
export function generateMatchResultsCSV(
  singlesBracket?: KnockoutBracket | null,
  doublesBracket?: KnockoutBracket | null
): string {
  const rows: string[][] = [
    [
      'Match ID',
      'Category',
      'Round',
      'Side A',
      'Side B',
      'Score',
      'Winner',
      'Status',
      'Court',
      'Date',
    ],
  ];

  const allMatches: KnockoutMatch[] = [];
  if (singlesBracket) {
    singlesBracket.rounds.forEach((r) => allMatches.push(...r.matches));
  }
  if (doublesBracket) {
    doublesBracket.rounds.forEach((r) => allMatches.push(...r.matches));
  }

  allMatches
    .filter((m) => m.status === 'Completed' || m.status === 'Walkover')
    .forEach((m) => {
      const winnerName = m.sideA.isWinner
        ? m.sideA.participant?.displayName || ''
        : m.sideB.participant?.displayName || '';

      rows.push([
        m.id,
        m.category,
        m.roundName,
        m.sideA.participant?.displayName || m.sideA.placeholderText || '',
        m.sideB.participant?.displayName || m.sideB.placeholderText || '',
        m.sideA.score || '',
        winnerName,
        m.status,
        m.court,
        m.scheduledDate,
      ]);
    });

  return rows.map((r) => r.map(escapeCSV).join(',')).join('\n');
}

/**
 * Exports Champion Summary CSV
 */
export function generateChampionSummaryCSV(
  singlesBracket?: KnockoutBracket | null,
  doublesBracket?: KnockoutBracket | null
): string {
  const rows: string[][] = [
    ['Tournament Category', 'Champion Name', 'Champion Team', 'Player Roster', 'Status'],
    [
      'Badminton Singles',
      singlesBracket?.champion ? singlesBracket.champion.displayName : 'Not Decided',
      singlesBracket?.champion ? singlesBracket.champion.team : '-',
      singlesBracket?.champion
        ? singlesBracket.champion.players.map((p) => `${p.name} (${p.id})`).join('; ')
        : '-',
      singlesBracket?.champion ? 'CHAMPION DECLARED' : 'In Progress',
    ],
    [
      'Badminton Doubles',
      doublesBracket?.champion ? doublesBracket.champion.displayName : 'Not Decided',
      doublesBracket?.champion ? doublesBracket.champion.team : '-',
      doublesBracket?.champion
        ? doublesBracket.champion.players.map((p) => `${p.name} (${p.id})`).join('; ')
        : '-',
      doublesBracket?.champion ? 'CHAMPION DECLARED' : 'In Progress',
    ],
  ];

  return rows.map((r) => r.map(escapeCSV).join(',')).join('\n');
}

/**
 * Generates Master Styled Excel Workbook (.xlsx) with 7 worksheets:
 * 1. Singles Bracket
 * 2. Doubles Bracket
 * 3. Singles Participants
 * 4. Doubles Participants
 * 5. Doubles Partner Pairs
 * 6. Match Results
 * 7. Tournament Summary
 */
export async function generateMasterKnockoutWorkbook(
  singlesBracket: KnockoutBracket | null | undefined,
  doublesBracket: KnockoutBracket | null | undefined,
  participants: Participant[],
  doublesPairs: DoublesPair[]
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Team Studio - Automatic Badminton Knockout Generator';
  workbook.created = new Date();

  // Color Palettes
  const navyHeader = {
    type: 'pattern' as const,
    pattern: 'solid' as const,
    fgColor: { argb: 'FF1E293B' },
  };

  const blueHeader = {
    type: 'pattern' as const,
    pattern: 'solid' as const,
    fgColor: { argb: 'FF1D4ED8' },
  };

  const purpleHeader = {
    type: 'pattern' as const,
    pattern: 'solid' as const,
    fgColor: { argb: 'FF6D28D9' },
  };

  const headerFont = {
    name: 'Segoe UI',
    size: 10,
    bold: true,
    color: { argb: 'FFFFFFFF' },
  };

  // Helper to format a worksheet table
  const styleHeaderRow = (ws: ExcelJS.Worksheet, fill: any) => {
    const row = ws.getRow(1);
    row.height = 24;
    row.eachCell((cell) => {
      cell.fill = fill;
      cell.font = headerFont;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
  };

  // 1. Singles Bracket Sheet
  const wsSingles = workbook.addWorksheet('Singles Bracket');
  wsSingles.columns = [
    { header: 'Match ID', key: 'id', width: 12 },
    { header: 'Round', key: 'round', width: 16 },
    { header: 'Side A', key: 'sideA', width: 22 },
    { header: 'Team A', key: 'teamA', width: 14 },
    { header: 'Side B', key: 'sideB', width: 22 },
    { header: 'Team B', key: 'teamB', width: 14 },
    { header: 'Score', key: 'score', width: 16 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Winner', key: 'winner', width: 22 },
    { header: 'Court', key: 'court', width: 12 },
    { header: 'Date & Time', key: 'dateTime', width: 18 },
    { header: 'Next Match ID', key: 'nextMatchId', width: 14 },
  ];
  styleHeaderRow(wsSingles, blueHeader);

  if (singlesBracket) {
    singlesBracket.rounds.forEach((round) => {
      round.matches.forEach((m) => {
        const sideAName = m.sideA.participant?.displayName || m.sideA.placeholderText || 'TBD';
        const sideBName = m.sideB.participant?.displayName || m.sideB.placeholderText || 'TBD';
        const winner = m.winnerId ? (m.sideA.isWinner ? sideAName : sideBName) : '';

        wsSingles.addRow({
          id: m.id,
          round: m.roundName,
          sideA: sideAName,
          teamA: m.sideA.participant?.team || '',
          sideB: sideBName,
          teamB: m.sideB.participant?.team || '',
          score: m.sideA.score || '',
          status: m.status,
          winner,
          court: m.court,
          dateTime: `${m.scheduledDate} ${m.scheduledTime}`,
          nextMatchId: m.nextMatchId || '',
        });
      });
    });
  }

  // 2. Doubles Bracket Sheet
  const wsDoubles = workbook.addWorksheet('Doubles Bracket');
  wsDoubles.columns = [
    { header: 'Match ID', key: 'id', width: 12 },
    { header: 'Round', key: 'round', width: 16 },
    { header: 'Side A (Pair)', key: 'sideA', width: 28 },
    { header: 'Team A', key: 'teamA', width: 14 },
    { header: 'Side B (Pair)', key: 'sideB', width: 28 },
    { header: 'Team B', key: 'teamB', width: 14 },
    { header: 'Score', key: 'score', width: 16 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Winner', key: 'winner', width: 28 },
    { header: 'Court', key: 'court', width: 12 },
    { header: 'Date & Time', key: 'dateTime', width: 18 },
    { header: 'Next Match ID', key: 'nextMatchId', width: 14 },
  ];
  styleHeaderRow(wsDoubles, purpleHeader);

  if (doublesBracket) {
    doublesBracket.rounds.forEach((round) => {
      round.matches.forEach((m) => {
        const sideAName = m.sideA.participant?.displayName || m.sideA.placeholderText || 'TBD';
        const sideBName = m.sideB.participant?.displayName || m.sideB.placeholderText || 'TBD';
        const winner = m.winnerId ? (m.sideA.isWinner ? sideAName : sideBName) : '';

        wsDoubles.addRow({
          id: m.id,
          round: m.roundName,
          sideA: sideAName,
          teamA: m.sideA.participant?.team || '',
          sideB: sideBName,
          teamB: m.sideB.participant?.team || '',
          score: m.sideA.score || '',
          status: m.status,
          winner,
          court: m.court,
          dateTime: `${m.scheduledDate} ${m.scheduledTime}`,
          nextMatchId: m.nextMatchId || '',
        });
      });
    });
  }

  // 3. Singles Participants Sheet
  const wsSinglesPart = workbook.addWorksheet('Singles Participants');
  wsSinglesPart.columns = [
    { header: 'Player ID', key: 'id', width: 14 },
    { header: 'Player Name', key: 'name', width: 24 },
    { header: 'Team', key: 'team', width: 16 },
    { header: 'Office Location', key: 'office', width: 16 },
    { header: 'Gender', key: 'gender', width: 12 },
  ];
  styleHeaderRow(wsSinglesPart, navyHeader);

  participants
    .filter((p) => p.singlesRegistered)
    .forEach((p) => {
      wsSinglesPart.addRow({
        id: p.id,
        name: p.name,
        team: p.team,
        office: p.office || 'Guindy',
        gender: p.gender || 'Men',
      });
    });

  // 4. Doubles Participants Sheet
  const wsDoublesPart = workbook.addWorksheet('Doubles Participants');
  wsDoublesPart.columns = [
    { header: 'Player ID', key: 'id', width: 14 },
    { header: 'Player Name', key: 'name', width: 24 },
    { header: 'Team', key: 'team', width: 16 },
    { header: 'Office Location', key: 'office', width: 16 },
    { header: 'Gender', key: 'gender', width: 12 },
  ];
  styleHeaderRow(wsDoublesPart, navyHeader);

  participants
    .filter((p) => p.doublesRegistered)
    .forEach((p) => {
      wsDoublesPart.addRow({
        id: p.id,
        name: p.name,
        team: p.team,
        office: p.office || 'Guindy',
        gender: p.gender || 'Men',
      });
    });

  // 5. Doubles Partner Pairs Sheet
  const wsPairs = workbook.addWorksheet('Doubles Partner Pairs');
  wsPairs.columns = [
    { header: 'Pair ID', key: 'pairId', width: 14 },
    { header: 'Team', key: 'team', width: 16 },
    { header: 'Player 1 ID', key: 'p1Id', width: 14 },
    { header: 'Player 1 Name', key: 'p1Name', width: 22 },
    { header: 'Player 2 ID', key: 'p2Id', width: 14 },
    { header: 'Player 2 Name', key: 'p2Name', width: 22 },
    { header: 'Locked Status', key: 'locked', width: 16 },
  ];
  styleHeaderRow(wsPairs, navyHeader);

  doublesPairs.forEach((pair) => {
    wsPairs.addRow({
      pairId: pair.id,
      team: pair.team,
      p1Id: pair.player1.id,
      p1Name: pair.player1.name,
      p2Id: pair.player2.id,
      p2Name: pair.player2.name,
      locked: pair.isLocked ? 'Approved & Locked' : 'Auto-paired (Unlocked)',
    });
  });

  // 6. Match Results Sheet
  const wsResults = workbook.addWorksheet('Match Results');
  wsResults.columns = [
    { header: 'Match ID', key: 'id', width: 12 },
    { header: 'Category', key: 'category', width: 14 },
    { header: 'Round', key: 'round', width: 16 },
    { header: 'Side A', key: 'sideA', width: 24 },
    { header: 'Side B', key: 'sideB', width: 24 },
    { header: 'Score', key: 'score', width: 16 },
    { header: 'Winner', key: 'winner', width: 24 },
    { header: 'Result Type', key: 'type', width: 14 },
  ];
  styleHeaderRow(wsResults, navyHeader);

  const completedMatches: KnockoutMatch[] = [];
  if (singlesBracket) {
    singlesBracket.rounds.forEach((r) => completedMatches.push(...r.matches));
  }
  if (doublesBracket) {
    doublesBracket.rounds.forEach((r) => completedMatches.push(...r.matches));
  }

  completedMatches
    .filter((m) => m.status === 'Completed' || m.status === 'Walkover')
    .forEach((m) => {
      const winnerName = m.sideA.isWinner
        ? m.sideA.participant?.displayName || ''
        : m.sideB.participant?.displayName || '';

      wsResults.addRow({
        id: m.id,
        category: m.category,
        round: m.roundName,
        sideA: m.sideA.participant?.displayName || m.sideA.placeholderText || '',
        sideB: m.sideB.participant?.displayName || m.sideB.placeholderText || '',
        score: m.sideA.score || '',
        winner: winnerName,
        type: m.status,
      });
    });

  // 7. Tournament Summary Sheet
  const wsSummary = workbook.addWorksheet('Tournament Summary');
  wsSummary.columns = [
    { header: 'Tournament Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'val', width: 35 },
  ];
  styleHeaderRow(wsSummary, navyHeader);

  const totalMatchesCount =
    (singlesBracket?.rounds.flatMap((r) => r.matches).length || 0) +
    (doublesBracket?.rounds.flatMap((r) => r.matches).length || 0);

  const completedCount = completedMatches.filter(
    (m) => m.status === 'Completed' || m.status === 'Walkover'
  ).length;

  wsSummary.addRow({ metric: 'Format', val: 'Single-Elimination Knockout Championship' });
  wsSummary.addRow({ metric: 'Total Registered Participants', val: participants.length });
  wsSummary.addRow({
    metric: 'Singles Knockout Participants',
    val: participants.filter((p) => p.singlesRegistered).length,
  });
  wsSummary.addRow({
    metric: 'Doubles Knockout Participants',
    val: participants.filter((p) => p.doublesRegistered).length,
  });
  wsSummary.addRow({ metric: 'Configured Doubles Pairs', val: doublesPairs.length });
  wsSummary.addRow({ metric: 'Total Scheduled Matches', val: totalMatchesCount });
  wsSummary.addRow({ metric: 'Completed Matches', val: completedCount });
  wsSummary.addRow({
    metric: 'Singles Knockout Champion',
    val: singlesBracket?.champion
      ? `${singlesBracket.champion.displayName} (${singlesBracket.champion.team})`
      : 'In Progress (Not Decided)',
  });
  wsSummary.addRow({
    metric: 'Doubles Knockout Champions',
    val: doublesBracket?.champion
      ? `${doublesBracket.champion.displayName} (${doublesBracket.champion.team})`
      : 'In Progress (Not Decided)',
  });
  wsSummary.addRow({
    metric: 'Common Office Tournament',
    val: 'Guindy & Vandaloor (Common participation, no office barriers)',
  });

  return workbook;
}

/**
 * Browser download helper for Knockout Excel Workbook
 */
export async function downloadMasterKnockoutExcel(
  singlesBracket: KnockoutBracket | null | undefined,
  doublesBracket: KnockoutBracket | null | undefined,
  participants: Participant[],
  doublesPairs: DoublesPair[],
  filename: string = 'badminton_knockout_master.xlsx'
) {
  const workbook = await generateMasterKnockoutWorkbook(
    singlesBracket,
    doublesBracket,
    participants,
    doublesPairs
  );

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}
