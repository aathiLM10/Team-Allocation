import { describe, it, expect } from 'vitest';
import { allocateTeams } from '../lib/allocation/team-allocation';
import { validateAllocation } from '../lib/allocation/allocation-metrics';
import { calculateSummary } from '../lib/validation/employee-validation';
import {
  generateTeamsWorkbook,
  generateMasterAllocationCSV,
  generateSingleTeamCSV,
  generateSummaryCSV,
  escapeCSVField,
} from '../lib/export/team-export';
import { Employee } from '../types/employee';

describe('Export Services (CSV & Excel)', () => {
  const sampleEmployees: Employee[] = [
    { id: '1', name: 'Dev 1, Senior', gender: 'Men', office: 'Guindy' },
    { id: '2', name: 'Dev 2 "The Boss"', gender: 'Women', office: 'Guindy' },
    { id: '3', name: 'Dev 3', gender: 'Men', office: 'Vandaloor' },
    { id: '4', name: 'Dev 4', gender: 'Women', office: 'Vandaloor' },
  ];

  it('escapes CSV fields properly according to RFC 4180', () => {
    expect(escapeCSVField('Simple Text')).toBe('Simple Text');
    expect(escapeCSVField('Text, With Comma')).toBe('"Text, With Comma"');
    expect(escapeCSVField('Text "With Quotes"')).toBe('"Text ""With Quotes"""');
    expect(escapeCSVField(123)).toBe('123');
    expect(escapeCSVField(null)).toBe('');
  });

  it('generates master allocation CSV with all employees and correct headers', () => {
    const allocations = allocateTeams(sampleEmployees, { seed: 1 });
    const csv = generateMasterAllocationCSV(allocations);

    expect(csv).toContain('Employee Name,Gender,Office Location,Assigned Team');
    expect(csv).toContain('"Dev 1, Senior",Men,Guindy');
    expect(csv).toContain('"Dev 2 ""The Boss""",Women,Guindy');
    expect(csv).toContain('Dev 3,Men,Vandaloor');
    expect(csv).toContain('Dev 4,Women,Vandaloor');
  });

  it('generates single team CSV with serial numbers and assigned team', () => {
    const allocations = allocateTeams(sampleEmployees, { seed: 1 });
    const whiteTeam = allocations[0];
    const csv = generateSingleTeamCSV(whiteTeam);

    expect(csv).toContain('S.No,Employee Name,Gender,Office Location,Assigned Team');
    expect(csv).toContain(whiteTeam.teamName);
  });

  it('generates summary CSV with distribution matrix and validation results', () => {
    const allocations = allocateTeams(sampleEmployees, { seed: 1 });
    const report = validateAllocation(sampleEmployees, allocations);
    const summary = calculateSummary(sampleEmployees, []);
    const csv = generateSummaryCSV(allocations, report, summary);

    expect(csv).toContain('Team Allocation Distribution Matrix');
    expect(csv).toContain('Total Employees');
    expect(csv).toContain('Guindy Office');
    expect(csv).toContain('Vandaloor Office');
    expect(csv).toContain('Allocation Validation & Integrity Checks');
  });

  it('generates an Excel workbook with exactly 6 required sheets (backward compatibility)', () => {
    const allocations = allocateTeams(sampleEmployees, { seed: 1 });
    const report = validateAllocation(sampleEmployees, allocations);
    const summary = calculateSummary(sampleEmployees, []);

    const workbook = generateTeamsWorkbook(allocations, report, summary);

    expect(workbook.SheetNames).toEqual([
      'Team Allocation',
      'White Team',
      'Red Team',
      'Blue Team',
      'Grey Team',
      'Summary',
    ]);
  });

  it('generates a styled ExcelJS workbook with 4 team sheets and colored column headers', async () => {
    const { generateStyledTeamsWorkbook } = await import('../lib/export/team-export');
    const allocations = allocateTeams(sampleEmployees, { seed: 1 });
    const report = validateAllocation(sampleEmployees, allocations);
    const summary = calculateSummary(sampleEmployees, []);

    const wb = await generateStyledTeamsWorkbook(allocations, report, summary);

    // Verify all 6 sheets are present
    const sheetNames = wb.worksheets.map((ws) => ws.name);
    expect(sheetNames).toContain('Master Allocation');
    expect(sheetNames).toContain('White Team');
    expect(sheetNames).toContain('Red Team');
    expect(sheetNames).toContain('Blue Team');
    expect(sheetNames).toContain('Grey Team');
    expect(sheetNames).toContain('Summary Matrix');

    // Verify Red Team header color
    const redSheet = wb.getWorksheet('Red Team');
    expect(redSheet).toBeDefined();
    const redHeader = redSheet!.getRow(1);
    const redCellFill = redHeader.getCell(1).fill as { type: string; fgColor?: { argb?: string } };
    expect(redCellFill?.fgColor?.argb).toBe('FFDC2626');

    // Verify Blue Team header color
    const blueSheet = wb.getWorksheet('Blue Team');
    expect(blueSheet).toBeDefined();
    const blueHeader = blueSheet!.getRow(1);
    const blueCellFill = blueHeader.getCell(1).fill as { type: string; fgColor?: { argb?: string } };
    expect(blueCellFill?.fgColor?.argb).toBe('FF2563EB');

    // Verify Grey Team header color
    const greySheet = wb.getWorksheet('Grey Team');
    expect(greySheet).toBeDefined();
    const greyHeader = greySheet!.getRow(1);
    const greyCellFill = greyHeader.getCell(1).fill as { type: string; fgColor?: { argb?: string } };
    expect(greyCellFill?.fgColor?.argb).toBe('FF475569');

    // Verify White Team header color
    const whiteSheet = wb.getWorksheet('White Team');
    expect(whiteSheet).toBeDefined();
    const whiteHeader = whiteSheet!.getRow(1);
    const whiteCellFill = whiteHeader.getCell(1).fill as { type: string; fgColor?: { argb?: string } };
    expect(whiteCellFill?.fgColor?.argb).toBe('FFE2E8F0');

    // Verify buffer generation produces valid binary
    const buffer = await wb.xlsx.writeBuffer();
    expect(buffer.byteLength).toBeGreaterThan(1000);
  });
});

