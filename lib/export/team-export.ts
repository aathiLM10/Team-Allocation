import * as XLSX from 'xlsx';
import {
  TeamAllocation,
  AllocationValidationReport,
  EmployeeSummary,
} from '@/types/employee';

/**
 * Escape a CSV field value according to RFC 4180 standards.
 */
export function escapeCSVField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Triggers a browser download of a CSV file using a UTF-8 BOM Blob.
 * 100% reliable across modern browsers and opens seamlessly in Excel.
 */
export function downloadCSV(content: string, fileName: string): void {
  // UTF-8 BOM ensures Excel automatically detects UTF-8 encoding
  const bom = '\uFEFF';
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
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
}

/**
 * Generates CSV content for the Master Team Allocation roster.
 */
export function generateMasterAllocationCSV(allocations: TeamAllocation[]): string {
  const headers = ['Employee Name', 'Gender', 'Office Location', 'Assigned Team'];
  const rows: string[] = [headers.map(escapeCSVField).join(',')];

  const masterList = allocations.flatMap((team) =>
    team.members.map((m) => ({
      name: m.name,
      gender: m.gender,
      office: m.office,
      team: team.teamName,
    }))
  );

  // Alphabetical sort by employee name
  masterList.sort((a, b) => a.name.localeCompare(b.name));

  masterList.forEach((emp) => {
    rows.push(
      [
        escapeCSVField(emp.name),
        escapeCSVField(emp.gender),
        escapeCSVField(emp.office),
        escapeCSVField(emp.team),
      ].join(',')
    );
  });

  return rows.join('\r\n');
}

/**
 * Generates CSV content for a single team's employee roster.
 */
export function generateSingleTeamCSV(team: TeamAllocation): string {
  const headers = ['S.No', 'Employee Name', 'Gender', 'Office Location', 'Assigned Team'];
  const rows: string[] = [headers.map(escapeCSVField).join(',')];

  team.members.forEach((m, idx) => {
    rows.push(
      [
        escapeCSVField(idx + 1),
        escapeCSVField(m.name),
        escapeCSVField(m.gender),
        escapeCSVField(m.office),
        escapeCSVField(team.teamName),
      ].join(',')
    );
  });

  return rows.join('\r\n');
}

/**
 * Generates CSV content for the allocation distribution and validation summary.
 */
export function generateSummaryCSV(
  allocations: TeamAllocation[],
  report: AllocationValidationReport,
  summary: EmployeeSummary
): string {
  const lines: string[] = [];

  lines.push('Team Allocation Distribution Matrix');
  lines.push(
    [
      'Metric',
      'White Team',
      'Red Team',
      'Blue Team',
      'Grey Team',
      'Overall Total',
      'Max Delta',
    ]
      .map(escapeCSVField)
      .join(',')
  );

  const white = allocations.find((a) => a.teamKey === 'white');
  const red = allocations.find((a) => a.teamKey === 'red');
  const blue = allocations.find((a) => a.teamKey === 'blue');
  const grey = allocations.find((a) => a.teamKey === 'grey');

  const matrix = [
    {
      metric: 'Total Employees',
      w: white?.stats.total ?? 0,
      r: red?.stats.total ?? 0,
      b: blue?.stats.total ?? 0,
      g: grey?.stats.total ?? 0,
      tot: summary.total,
      delta: report.maxTeamSizeDelta,
    },
    {
      metric: 'Guindy Office',
      w: white?.stats.guindy ?? 0,
      r: red?.stats.guindy ?? 0,
      b: blue?.stats.guindy ?? 0,
      g: grey?.stats.guindy ?? 0,
      tot: summary.guindy,
      delta: report.maxGuindyDelta,
    },
    {
      metric: 'Vandaloor Office',
      w: white?.stats.vandaloor ?? 0,
      r: red?.stats.vandaloor ?? 0,
      b: blue?.stats.vandaloor ?? 0,
      g: grey?.stats.vandaloor ?? 0,
      tot: summary.vandaloor,
      delta: report.maxVandaloorDelta,
    },
    {
      metric: 'Men',
      w: white?.stats.men ?? 0,
      r: red?.stats.men ?? 0,
      b: blue?.stats.men ?? 0,
      g: grey?.stats.men ?? 0,
      tot: summary.men,
      delta: report.maxMenDelta,
    },
    {
      metric: 'Women',
      w: white?.stats.women ?? 0,
      r: red?.stats.women ?? 0,
      b: blue?.stats.women ?? 0,
      g: grey?.stats.women ?? 0,
      tot: summary.women,
      delta: report.maxWomenDelta,
    },
    {
      metric: 'Unspecified / Other',
      w: white?.stats.unspecified ?? 0,
      r: red?.stats.unspecified ?? 0,
      b: blue?.stats.unspecified ?? 0,
      g: grey?.stats.unspecified ?? 0,
      tot: summary.unspecified,
      delta: 0,
    },
  ];

  matrix.forEach((m) => {
    lines.push(
      [
        escapeCSVField(m.metric),
        escapeCSVField(m.w),
        escapeCSVField(m.r),
        escapeCSVField(m.b),
        escapeCSVField(m.g),
        escapeCSVField(m.tot),
        escapeCSVField(m.delta),
      ].join(',')
    );
  });

  lines.push('');
  lines.push('Allocation Validation & Integrity Checks');
  lines.push(['Check Description', 'Status'].map(escapeCSVField).join(','));
  lines.push(
    [
      escapeCSVField('Audit Status'),
      escapeCSVField(report.isValid ? 'PASSED (Optimal)' : 'NOTICE'),
    ].join(',')
  );
  lines.push(
    [
      escapeCSVField('Total Source Employees'),
      escapeCSVField(report.totalEmployees),
    ].join(',')
  );
  lines.push(
    [
      escapeCSVField('Total Assigned Employees'),
      escapeCSVField(report.totalAssigned),
    ].join(',')
  );
  lines.push(
    [
      escapeCSVField('Unassigned Employees'),
      escapeCSVField(report.unassignedCount),
    ].join(',')
  );
  lines.push(
    [
      escapeCSVField('Duplicate Assignments'),
      escapeCSVField(report.duplicateAssignmentCount),
    ].join(',')
  );

  report.passedChecks.forEach((check) => {
    lines.push([escapeCSVField(check), escapeCSVField('PASSED')].join(','));
  });

  if (report.unavoidableImbalances.length > 0) {
    lines.push('');
    lines.push('Mathematical Remainder Transparency Notes');
    report.unavoidableImbalances.forEach((note) => {
      lines.push(escapeCSVField(note));
    });
  }

  return lines.join('\r\n');
}

/**
 * Downloads the master allocation list as a CSV file.
 */
export function exportMasterAllocationCSV(
  allocations: TeamAllocation[],
  fileName: string = 'All_Teams_Allocation.csv'
): void {
  const csv = generateMasterAllocationCSV(allocations);
  downloadCSV(csv, fileName);
}

/**
 * Downloads a single team roster as a CSV file.
 */
export function exportSingleTeamCSV(
  team: TeamAllocation,
  fileName?: string
): void {
  const actualName = fileName || `${team.teamName.replace(/\s+/g, '_')}_Roster.csv`;
  const csv = generateSingleTeamCSV(team);
  downloadCSV(csv, actualName);
}

/**
 * Downloads the distribution summary as a CSV file.
 */
export function exportSummaryCSV(
  allocations: TeamAllocation[],
  report: AllocationValidationReport,
  summary: EmployeeSummary,
  fileName: string = 'Team_Allocation_Summary.csv'
): void {
  const csv = generateSummaryCSV(allocations, report, summary);
  downloadCSV(csv, fileName);
}

// ----------------------------------------------------------------------
// Styled Multi-Sheet Master Excel Workbook Generation (ExcelJS)
// ----------------------------------------------------------------------

import ExcelJS from 'exceljs';

export const TEAM_EXCEL_THEMES: Record<
  string,
  {
    headerFill: string;
    headerFont: string;
    headerBorder: string;
    tabColor: string;
    badgeFill: string;
    badgeFont: string;
    stripeFill: string;
  }
> = {
  'White Team': {
    headerFill: 'FFE2E8F0', // Platinum Silver
    headerFont: 'FF0F172A', // Slate-900 Bold
    headerBorder: 'FF94A3B8',
    tabColor: 'FF94A3B8',
    badgeFill: 'FFF1F5F9',
    badgeFont: 'FF0F172A',
    stripeFill: 'FFF8FAFC',
  },
  'Red Team': {
    headerFill: 'FFDC2626', // Crimson Red
    headerFont: 'FFFFFFFF', // Pure White Bold
    headerBorder: 'FFB91C1C',
    tabColor: 'FFEF4444',
    badgeFill: 'FFFEE2E2',
    badgeFont: 'FF991B1B',
    stripeFill: 'FFFEF2F2',
  },
  'Blue Team': {
    headerFill: 'FF2563EB', // Royal Blue
    headerFont: 'FFFFFFFF', // Pure White Bold
    headerBorder: 'FF1D4ED8',
    tabColor: 'FF3B82F6',
    badgeFill: 'FFDBEAFE',
    badgeFont: 'FF1E40AF',
    stripeFill: 'FFEFF6FF',
  },
  'Grey Team': {
    headerFill: 'FF475569', // Slate Charcoal
    headerFont: 'FFFFFFFF', // Pure White Bold
    headerBorder: 'FF334155',
    tabColor: 'FF64748B',
    badgeFill: 'FFF3F4F6',
    badgeFont: 'FF374151',
    stripeFill: 'FFF8FAFC',
  },
};

/**
 * Creates a fully styled Excel workbook featuring:
 * 1. Sheet 1: Master Allocation (all employees with team badges)
 * 2. Sheets 2-5: Individual Team Sheets (White, Red, Blue, Grey) with column headers
 *    styled in their respective team colors.
 * 3. Sheet 6: Executive Summary Matrix & Balance Verification.
 */
export async function generateStyledTeamsWorkbook(
  allocations: TeamAllocation[],
  validationReport: AllocationValidationReport,
  employeeSummary: EmployeeSummary
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Team Allocation Enterprise System';
  workbook.created = new Date();

  const defaultBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  };

  // -------------------------------------------------------------
  // 1. MASTER ALLOCATION SHEET (All Employees)
  // -------------------------------------------------------------
  const masterSheet = workbook.addWorksheet('Master Allocation', {
    views: [{ state: 'frozen', ySplit: 1 }],
    properties: { tabColor: { argb: 'FF1E3A8A' } },
  });

  masterSheet.columns = [
    { header: 'Employee Name', key: 'name', width: 32 },
    { header: 'Gender', key: 'gender', width: 16 },
    { header: 'Office Location', key: 'office', width: 22 },
    { header: 'Assigned Team', key: 'team', width: 22 },
  ];

  const masterHeaderRow = masterSheet.getRow(1);
  masterHeaderRow.height = 26;
  masterHeaderRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }, // Deep Navy
    };
    cell.font = {
      name: 'Segoe UI',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
    };
  });

  const masterList = allocations.flatMap((team) =>
    team.members.map((m) => ({
      name: m.name,
      gender: m.gender,
      office: m.office,
      team: team.teamName,
    }))
  );
  masterList.sort((a, b) => a.name.localeCompare(b.name));

  masterList.forEach((emp, index) => {
    const row = masterSheet.addRow(emp);
    row.height = 22;

    const isEven = index % 2 === 0;
    const rowBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

    // Cell A: Name
    const cellA = row.getCell(1);
    cellA.alignment = { vertical: 'middle', horizontal: 'left' };
    cellA.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
    cellA.border = defaultBorder;
    cellA.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0F172A' } };

    // Cell B: Gender
    const cellB = row.getCell(2);
    cellB.alignment = { vertical: 'middle', horizontal: 'center' };
    cellB.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
    cellB.border = defaultBorder;
    cellB.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF334155' } };

    // Cell C: Office
    const cellC = row.getCell(3);
    cellC.alignment = { vertical: 'middle', horizontal: 'center' };
    cellC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
    cellC.border = defaultBorder;
    cellC.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF334155' } };

    // Cell D: Assigned Team (Styled with team badge color!)
    const theme = TEAM_EXCEL_THEMES[emp.team] || {
      badgeFill: 'FFF1F5F9',
      badgeFont: 'FF0F172A',
      headerBorder: 'FFCBD5E1',
    };
    const cellD = row.getCell(4);
    cellD.alignment = { vertical: 'middle', horizontal: 'center' };
    cellD.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: theme.badgeFill },
    };
    cellD.font = {
      name: 'Segoe UI',
      size: 10,
      bold: true,
      color: { argb: theme.badgeFont },
    };
    cellD.border = {
      top: { style: 'thin', color: { argb: theme.headerBorder } },
      left: { style: 'thin', color: { argb: theme.headerBorder } },
      bottom: { style: 'thin', color: { argb: theme.headerBorder } },
      right: { style: 'thin', color: { argb: theme.headerBorder } },
    };
  });

  // -------------------------------------------------------------
  // 2. 4 DEDICATED TEAM SHEETS (Column color matches team color)
  // -------------------------------------------------------------
  allocations.forEach((team) => {
    const theme = TEAM_EXCEL_THEMES[team.teamName] || {
      headerFill: 'FF3B82F6',
      headerFont: 'FFFFFFFF',
      headerBorder: 'FF1D4ED8',
      tabColor: 'FF3B82F6',
      stripeFill: 'FFEFF6FF',
    };

    const teamSheet = workbook.addWorksheet(team.teamName, {
      views: [{ state: 'frozen', ySplit: 1 }],
      properties: { tabColor: { argb: theme.tabColor } },
    });

    teamSheet.columns = [
      { header: 'S.No', key: 'sno', width: 10 },
      { header: 'Employee Name', key: 'name', width: 34 },
      { header: 'Gender', key: 'gender', width: 16 },
      { header: 'Office Location', key: 'office', width: 22 },
      { header: 'Assigned Team', key: 'team', width: 22 },
    ];

    // Styled Header Row with Team Color
    const headerRow = teamSheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: theme.headerFill },
      };
      cell.font = {
        name: 'Segoe UI',
        size: 11,
        bold: true,
        color: { argb: theme.headerFont },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'medium', color: { argb: theme.headerBorder } },
        left: { style: 'thin', color: { argb: theme.headerBorder } },
        bottom: { style: 'medium', color: { argb: theme.headerBorder } },
        right: { style: 'thin', color: { argb: theme.headerBorder } },
      };
    });

    // Populate members
    team.members.forEach((m, idx) => {
      const row = teamSheet.addRow({
        sno: idx + 1,
        name: m.name,
        gender: m.gender,
        office: m.office,
        team: team.teamName,
      });
      row.height = 22;

      const isEven = idx % 2 === 0;
      const rowBg = isEven ? 'FFFFFFFF' : theme.stripeFill;

      // S.No
      const c1 = row.getCell(1);
      c1.alignment = { vertical: 'middle', horizontal: 'center' };
      c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      c1.border = defaultBorder;
      c1.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF64748B' } };

      // Name
      const c2 = row.getCell(2);
      c2.alignment = { vertical: 'middle', horizontal: 'left' };
      c2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      c2.border = defaultBorder;
      c2.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0F172A' } };

      // Gender
      const c3 = row.getCell(3);
      c3.alignment = { vertical: 'middle', horizontal: 'center' };
      c3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      c3.border = defaultBorder;
      c3.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF334155' } };

      // Office
      const c4 = row.getCell(4);
      c4.alignment = { vertical: 'middle', horizontal: 'center' };
      c4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      c4.border = defaultBorder;
      c4.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF334155' } };

      // Team
      const c5 = row.getCell(5);
      c5.alignment = { vertical: 'middle', horizontal: 'center' };
      c5.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      c5.border = defaultBorder;
      c5.font = {
        name: 'Segoe UI',
        size: 10,
        bold: true,
        color: { argb: theme.badgeFont || 'FF0F172A' },
      };
    });
  });

  // -------------------------------------------------------------
  // 3. SUMMARY MATRIX SHEET
  // -------------------------------------------------------------
  const summarySheet = workbook.addWorksheet('Summary Matrix', {
    views: [{ state: 'frozen', ySplit: 1 }],
    properties: { tabColor: { argb: 'FF0F172A' } },
  });

  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 24 },
    { header: 'White Team', key: 'white', width: 16 },
    { header: 'Red Team', key: 'red', width: 16 },
    { header: 'Blue Team', key: 'blue', width: 16 },
    { header: 'Grey Team', key: 'grey', width: 16 },
    { header: 'Overall Total', key: 'total', width: 18 },
    { header: 'Max Delta', key: 'delta', width: 14 },
  ];

  const sumHeaderRow = summarySheet.getRow(1);
  sumHeaderRow.height = 26;
  sumHeaderRow.eachCell((cell, colNumber) => {
    let bg = 'FF1E293B';
    let fg = 'FFFFFFFF';
    if (colNumber === 2) {
      bg = 'FFE2E8F0';
      fg = 'FF0F172A';
    } else if (colNumber === 3) {
      bg = 'FFDC2626';
    } else if (colNumber === 4) {
      bg = 'FF2563EB';
    } else if (colNumber === 5) {
      bg = 'FF475569';
    }

    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: fg } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const matrixRows = [
    {
      metric: 'Total Employees',
      white: allocations[0]?.stats.total ?? 0,
      red: allocations[1]?.stats.total ?? 0,
      blue: allocations[2]?.stats.total ?? 0,
      grey: allocations[3]?.stats.total ?? 0,
      total: employeeSummary.total,
      delta: validationReport.maxTeamSizeDelta,
    },
    {
      metric: 'Guindy Office',
      white: allocations[0]?.stats.guindy ?? 0,
      red: allocations[1]?.stats.guindy ?? 0,
      blue: allocations[2]?.stats.guindy ?? 0,
      grey: allocations[3]?.stats.guindy ?? 0,
      total: employeeSummary.guindy,
      delta: validationReport.maxGuindyDelta,
    },
    {
      metric: 'Vandaloor Office',
      white: allocations[0]?.stats.vandaloor ?? 0,
      red: allocations[1]?.stats.vandaloor ?? 0,
      blue: allocations[2]?.stats.vandaloor ?? 0,
      grey: allocations[3]?.stats.vandaloor ?? 0,
      total: employeeSummary.vandaloor,
      delta: validationReport.maxVandaloorDelta,
    },
    {
      metric: 'Men',
      white: allocations[0]?.stats.men ?? 0,
      red: allocations[1]?.stats.men ?? 0,
      blue: allocations[2]?.stats.men ?? 0,
      grey: allocations[3]?.stats.men ?? 0,
      total: employeeSummary.men,
      delta: validationReport.maxMenDelta,
    },
    {
      metric: 'Women',
      white: allocations[0]?.stats.women ?? 0,
      red: allocations[1]?.stats.women ?? 0,
      blue: allocations[2]?.stats.women ?? 0,
      grey: allocations[3]?.stats.women ?? 0,
      total: employeeSummary.women,
      delta: validationReport.maxWomenDelta,
    },
    {
      metric: 'Unspecified / Other',
      white: allocations[0]?.stats.unspecified ?? 0,
      red: allocations[1]?.stats.unspecified ?? 0,
      blue: allocations[2]?.stats.unspecified ?? 0,
      grey: allocations[3]?.stats.unspecified ?? 0,
      total: employeeSummary.unspecified,
      delta: 0,
    },
  ];

  matrixRows.forEach((r, idx) => {
    const row = summarySheet.addRow(r);
    row.height = 22;
    const isEven = idx % 2 === 0;
    const rowBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

    row.eachCell((cell, colNum) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      cell.border = defaultBorder;
      cell.alignment = {
        vertical: 'middle',
        horizontal: colNum === 1 ? 'left' : 'center',
      };
      cell.font = {
        name: 'Segoe UI',
        size: 10,
        bold: colNum === 1 || colNum === 6,
        color: { argb: 'FF0F172A' },
      };
    });
  });

  return workbook;
}

/**
 * Triggers a browser download of the styled multi-sheet Excel file.
 * Automatically falls back to the native SheetJS engine if ExcelJS encounters
 * browser environment constraints in production.
 */
export async function exportTeamsToStyledExcel(
  allocations: TeamAllocation[],
  validationReport: AllocationValidationReport,
  employeeSummary: EmployeeSummary,
  fileName: string = 'Master_Employee_Team_Allocation.xlsx'
): Promise<void> {
  try {
    const workbook = await generateStyledTeamsWorkbook(
      allocations,
      validationReport,
      employeeSummary
    );
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
    console.warn(
      'Styled ExcelJS export encountered an issue in this browser, using reliable SheetJS fallback:',
      err
    );
    const wb = generateTeamsWorkbook(allocations, validationReport, employeeSummary);
    XLSX.writeFile(wb, fileName);
  }
}

// ----------------------------------------------------------------------
// Backward Compatibility / Plain Excel Generation (SheetJS)
// ----------------------------------------------------------------------

export function generateTeamsWorkbook(
  allocations: TeamAllocation[],
  validationReport: AllocationValidationReport,
  employeeSummary: EmployeeSummary
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // Master sheet
  const masterData = allocations.flatMap((team) =>
    team.members.map((m) => ({
      'Employee Name': m.name,
      'Gender': m.gender,
      'Office Location': m.office,
      'Assigned Team': team.teamName,
    }))
  );
  masterData.sort((a, b) => a['Employee Name'].localeCompare(b['Employee Name']));
  const masterSheet = XLSX.utils.json_to_sheet(masterData);
  masterSheet['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 18 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, masterSheet, 'Team Allocation');

  // Team sheets
  allocations.forEach((team) => {
    const teamData = team.members.map((m, idx) => ({
      'S.No': idx + 1,
      'Employee Name': m.name,
      'Gender': m.gender,
      'Office Location': m.office,
    }));
    const teamSheet = XLSX.utils.json_to_sheet(teamData);
    teamSheet['!cols'] = [{ wch: 8 }, { wch: 28 }, { wch: 14 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, teamSheet, team.teamName);
  });

  // Summary sheet
  const summaryRows: Record<string, string | number>[] = [
    {
      'Metric': 'Total Employees',
      'White Team': allocations[0]?.stats.total ?? 0,
      'Red Team': allocations[1]?.stats.total ?? 0,
      'Blue Team': allocations[2]?.stats.total ?? 0,
      'Grey Team': allocations[3]?.stats.total ?? 0,
      'Overall Total': employeeSummary.total,
    },
    {
      'Metric': 'Guindy Office',
      'White Team': allocations[0]?.stats.guindy ?? 0,
      'Red Team': allocations[1]?.stats.guindy ?? 0,
      'Blue Team': allocations[2]?.stats.guindy ?? 0,
      'Grey Team': allocations[3]?.stats.guindy ?? 0,
      'Overall Total': employeeSummary.guindy,
    },
    {
      'Metric': 'Vandaloor Office',
      'White Team': allocations[0]?.stats.vandaloor ?? 0,
      'Red Team': allocations[1]?.stats.vandaloor ?? 0,
      'Blue Team': allocations[2]?.stats.vandaloor ?? 0,
      'Grey Team': allocations[3]?.stats.vandaloor ?? 0,
      'Overall Total': employeeSummary.vandaloor,
    },
    {
      'Metric': 'Men',
      'White Team': allocations[0]?.stats.men ?? 0,
      'Red Team': allocations[1]?.stats.men ?? 0,
      'Blue Team': allocations[2]?.stats.men ?? 0,
      'Grey Team': allocations[3]?.stats.men ?? 0,
      'Overall Total': employeeSummary.men,
    },
    {
      'Metric': 'Women',
      'White Team': allocations[0]?.stats.women ?? 0,
      'Red Team': allocations[1]?.stats.women ?? 0,
      'Blue Team': allocations[2]?.stats.women ?? 0,
      'Grey Team': allocations[3]?.stats.women ?? 0,
      'Overall Total': employeeSummary.women,
    },
    {
      'Metric': 'Unspecified / Other',
      'White Team': allocations[0]?.stats.unspecified ?? 0,
      'Red Team': allocations[1]?.stats.unspecified ?? 0,
      'Blue Team': allocations[2]?.stats.unspecified ?? 0,
      'Grey Team': allocations[3]?.stats.unspecified ?? 0,
      'Overall Total': employeeSummary.unspecified,
    },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  summarySheet['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  return wb;
}

export function exportTeamsToExcel(
  allocations: TeamAllocation[],
  validationReport: AllocationValidationReport,
  employeeSummary: EmployeeSummary,
  fileName: string = 'Master_Employee_Team_Allocation.xlsx'
): void {
  // Uses the modern ExcelJS styled multi-sheet exporter
  exportTeamsToStyledExcel(allocations, validationReport, employeeSummary, fileName).catch((err) => {
    console.error('Failed to export styled Excel, falling back to basic workbook:', err);
    const wb = generateTeamsWorkbook(allocations, validationReport, employeeSummary);
    XLSX.writeFile(wb, fileName);
  });
}

