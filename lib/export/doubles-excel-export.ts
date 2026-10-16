import ExcelJS from 'exceljs';
import { TeamDoublesResult } from '@/lib/badminton/doubles-pairing';

/**
 * Creates a professionally styled ExcelJS workbook for Badminton Doubles Pairing.
 * Contains a single worksheet named 'Badminton Doubles'.
 */
export async function createDoublesPairsWorkbook(
  result: TeamDoublesResult
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Solidpro Team Studio';
  workbook.lastModifiedBy = 'Solidpro Team Studio';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Badminton Doubles', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 4 }],
    properties: { defaultRowHeight: 22 },
  });

  // Column definitions with generous readable widths
  worksheet.columns = [
    { key: 'sNo', width: 10 },
    { key: 'red', width: 42 },
    { key: 'blue', width: 42 },
    { key: 'grey', width: 42 },
    { key: 'white', width: 42 },
  ];

  // Thin border style
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  };

  // 1. TITLE BANNER (Row 1)
  const titleRow = worksheet.addRow(['Badminton Doubles Pairing']);
  worksheet.mergeCells('A1:E1');
  titleRow.height = 34;
  const titleCell = worksheet.getCell('A1');
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' }, // Slate 900
  };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // 2. SUBTITLE / SUMMARY INFO (Row 2)
  const dateStr = new Date(result.generatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const summaryText = `Total Employees: ${result.totalEmployees}  |  Total Complete Pairs: ${result.totalPairs}  |  Unpaired Employees: ${result.totalUnpaired}  |  Generated on ${dateStr}`;
  const subRow = worksheet.addRow([summaryText]);
  worksheet.mergeCells('A2:E2');
  subRow.height = 20;
  const subCell = worksheet.getCell('A2');
  subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } };
  subCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF8FAFC' },
  };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // 3. BLANK SPACER ROW (Row 3)
  const spacerRow = worksheet.addRow([]);
  spacerRow.height = 10;

  // 4. TABLE HEADERS (Row 4)
  const headerRow = worksheet.addRow([
    'S.No',
    'Red Team',
    'Blue Team',
    'Grey Team',
    'White Team',
  ]);
  headerRow.height = 28;

  const headerColors = [
    { cell: 'A4', fill: 'FF334155', fontColor: 'FFFFFFFF' }, // Slate 700 (S.No)
    { cell: 'B4', fill: 'FFE11D48', fontColor: 'FFFFFFFF' }, // Rose 600 (Red Team)
    { cell: 'C4', fill: 'FF2563EB', fontColor: 'FFFFFFFF' }, // Blue 600 (Blue Team)
    { cell: 'D4', fill: 'FF475569', fontColor: 'FFFFFFFF' }, // Slate 600 (Grey Team)
    { cell: 'E4', fill: 'FFE2E8F0', fontColor: 'FF0F172A' }, // Slate 200 (White Team)
  ];

  headerColors.forEach(({ cell, fill, fontColor }) => {
    const c = worksheet.getCell(cell);
    c.font = { name: 'Calibri', size: 11, bold: true, color: { argb: fontColor } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = thinBorder;
  });

  // Extract pairs per team
  const redPairs = result.teams['Red Team']?.pairs || [];
  const bluePairs = result.teams['Blue Team']?.pairs || [];
  const greyPairs = result.teams['Grey Team']?.pairs || [];
  const whitePairs = result.teams['White Team']?.pairs || [];

  const maxPairs = Math.max(
    redPairs.length,
    bluePairs.length,
    greyPairs.length,
    whitePairs.length
  );

  // 5. PAIR ROWS
  for (let i = 0; i < maxPairs; i++) {
    const sNo = i + 1;
    const redPair = redPairs[i]?.displayNames || '';
    const bluePair = bluePairs[i]?.displayNames || '';
    const greyPair = greyPairs[i]?.displayNames || '';
    const whitePair = whitePairs[i]?.displayNames || '';

    const row = worksheet.addRow([sNo, redPair, bluePair, greyPair, whitePair]);
    row.height = 24;

    const isEven = i % 2 === 1;
    const rowBg = isEven ? 'FFF8FAFC' : 'FFFFFFFF';

    // Style each cell in the row
    for (let col = 1; col <= 5; col++) {
      const cell = row.getCell(col);
      cell.border = thinBorder;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF1E293B' } };

      if (col === 1) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF64748B' } };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      }
    }
  }

  // 6. UNPAIRED EMPLOYEES SECTION (If any odd-count teams exist)
  if (result.totalUnpaired > 0) {
    // Spacer row
    const emptyRow1 = worksheet.addRow([]);
    emptyRow1.height = 14;

    // Unpaired Section Header
    const unpHeaderRow = worksheet.addRow([
      'Unpaired Employees (Odd Participant Count in Team)',
    ]);
    const unpHeaderRowNum = unpHeaderRow.number;
    worksheet.mergeCells(`A${unpHeaderRowNum}:E${unpHeaderRowNum}`);
    unpHeaderRow.height = 24;

    const unpHeaderCell = worksheet.getCell(`A${unpHeaderRowNum}`);
    unpHeaderCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF92400E' } }; // Amber 800
    unpHeaderCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFEF3C7' }, // Amber 100
    };
    unpHeaderCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    unpHeaderCell.border = thinBorder;

    // List each team and its unpaired employee status
    const teamsWithUnpaired = Object.values(result.teams).filter(
      (t) => t.unpairedEmployee !== null
    );

    teamsWithUnpaired.forEach((t) => {
      const uEmp = t.unpairedEmployee!;
      const row = worksheet.addRow([
        '',
        t.team,
        uEmp.name,
        'Remaining participant (odd team count)',
        '',
      ]);
      row.height = 22;

      for (let col = 1; col <= 5; col++) {
        const cell = row.getCell(col);
        cell.border = thinBorder;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } }; // Light amber
        cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF78350F' } };
      }

      const teamCell = row.getCell(2);
      teamCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF78350F' } };
      const nameCell = row.getCell(3);
      nameCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    });
  }

  return workbook;
}

/**
 * Triggers a browser download of the generated Doubles Pairs Excel file.
 */
export async function downloadDoublesPairsExcel(
  result: TeamDoublesResult,
  fileName: string = 'badminton_doubles_pairs.xlsx'
): Promise<void> {
  const workbook = await createDoublesPairsWorkbook(result);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
