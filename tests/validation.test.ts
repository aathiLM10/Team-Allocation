import { describe, it, expect } from 'vitest';
import {
  validateEmployeeRecords,
  validateEmployeeList,
  normalizeGender,
  normalizeOffice,
} from '../lib/validation/employee-validation';
import { ColumnMapping, Employee } from '../types/employee';

describe('Employee Validation Service', () => {
  it('normalizes various gender representations correctly', () => {
    expect(normalizeGender('male').gender).toBe('Men');
    expect(normalizeGender('M').gender).toBe('Men');
    expect(normalizeGender('female').gender).toBe('Women');
    expect(normalizeGender('f').gender).toBe('Women');
    expect(normalizeGender('other').gender).toBe('Unspecified');
    expect(normalizeGender('non-binary').gender).toBe('Unspecified');
    expect(normalizeGender('unspecified').gender).toBe('Unspecified');
    expect(normalizeGender('').isValid).toBe(false);
    expect(normalizeGender('invalid-xyz').isValid).toBe(false);
  });

  it('normalizes office locations correctly', () => {
    expect(normalizeOffice('Guindy').office).toBe('Guindy');
    expect(normalizeOffice('guindy branch').office).toBe('Guindy');
    expect(normalizeOffice('Vandaloor').office).toBe('Vandaloor');
    expect(normalizeOffice('Vandalur').office).toBe('Vandaloor');
    expect(normalizeOffice('Bangalore').isValid).toBe(false);
    expect(normalizeOffice('', 'Guindy').office).toBe('Guindy');
  });

  it('identifies missing names, invalid values, and duplicate records', () => {
    const rawRows = [
      {
        rowNumber: 2,
        data: { 'Name': 'Alice Smith', 'Gender': 'Female', 'Office': 'Guindy' },
        sourceFile: 'file1.xlsx',
      },
      {
        rowNumber: 3,
        data: { 'Name': '', 'Gender': 'Male', 'Office': 'Guindy' }, // Missing name
        sourceFile: 'file1.xlsx',
      },
      {
        rowNumber: 4,
        data: { 'Name': 'Bob Jones', 'Gender': 'Alien', 'Office': 'Guindy' }, // Invalid gender
        sourceFile: 'file1.xlsx',
      },
      {
        rowNumber: 5,
        data: { 'Name': 'Charlie', 'Gender': 'Male', 'Office': 'Mumbai' }, // Invalid office
        sourceFile: 'file1.xlsx',
      },
      {
        rowNumber: 6,
        data: { 'Name': 'Alice Smith', 'Gender': 'Female', 'Office': 'Vandaloor' }, // Duplicate name
        sourceFile: 'file1.xlsx',
      },
    ];

    const mapping: ColumnMapping = {
      nameColumn: 'Name',
      genderColumn: 'Gender',
      officeColumn: 'Office',
    };

    const { employees, errors, summary } = validateEmployeeRecords(rawRows, mapping);

    expect(employees).toHaveLength(5);
    expect(summary.hasErrors).toBe(true);
    expect(summary.hasWarnings).toBe(true);

    const missingNameErr = errors.find((e) => e.field === 'name');
    expect(missingNameErr).toBeDefined();

    const invalidGenderErr = errors.find((e) => e.field === 'gender');
    expect(invalidGenderErr).toBeDefined();

    const invalidOfficeErr = errors.find((e) => e.field === 'office');
    expect(invalidOfficeErr).toBeDefined();

    const dupWarnings = errors.filter((e) => e.field === 'duplicate');
    expect(dupWarnings.length).toBe(2); // Both Alice entries flagged with warnings
  });

  it('allows duplicate names to be resolved via renaming (e.g. Vignesh S)', () => {
    // Initial state: two employees sharing "Vignesh S"
    const employees: Employee[] = [
      { id: 'emp-1', name: 'Vignesh S', gender: 'Men', office: 'Guindy', rowNumber: 1 },
      { id: 'emp-2', name: 'Vignesh S', gender: 'Men', office: 'Vandaloor', rowNumber: 2 },
      { id: 'emp-3', name: 'Kavitha R', gender: 'Women', office: 'Guindy', rowNumber: 3 },
    ];

    const { errors: initialErrors, summary: initialSummary } = validateEmployeeList(employees);
    expect(initialSummary.hasErrors).toBe(false);
    expect(initialSummary.hasWarnings).toBe(true);
    expect(initialErrors.filter((e) => e.field === 'duplicate').length).toBe(2);

    // Both employees are preserved (not deleted or rejected)
    expect(employees.length).toBe(3);

    // Organizer renames emp-1 to "Vignesh Srinivasan" and emp-2 to "Vignesh Subramaniam"
    const renamedList: Employee[] = [
      { ...employees[0], name: 'Vignesh Srinivasan' },
      { ...employees[1], name: 'Vignesh Subramaniam' },
      employees[2],
    ];

    const { errors: resolvedErrors, summary: resolvedSummary } = validateEmployeeList(renamedList);
    expect(resolvedSummary.hasWarnings).toBe(false);
    expect(resolvedErrors.filter((e) => e.field === 'duplicate').length).toBe(0);
    expect(resolvedSummary.total).toBe(3);
  });

  it('preserves distinct identity when adding manual employees with identical names', () => {
    const list: Employee[] = [
      { id: 'emp-manual-1', name: 'Rahul K', gender: 'Men', office: 'Guindy' },
      { id: 'emp-manual-2', name: 'Rahul K', gender: 'Men', office: 'Guindy' },
    ];

    const { errors, summary } = validateEmployeeList(list);
    // Both are preserved in list
    expect(summary.total).toBe(2);
    expect(errors.filter((e) => e.field === 'duplicate').length).toBe(2);
    // Unique IDs are maintained
    expect(list[0].id).not.toBe(list[1].id);
  });

  it('parses multi-sheet Excel files including Sheet 2 with intern employees', async () => {
    const XLSX = await import('xlsx');
    const { parseFileBuffer } = await import('../lib/import/employee-parser');

    // Create a 2-sheet workbook: Sheet 1 (Employees), Sheet 2 (Interns)
    const wb = XLSX.utils.book_new();

    const regularEmployees = [
      { 'Employee Name': 'Arun Kumar', 'Gender': 'Men', 'Office Location': 'Guindy' },
      { 'Employee Name': 'Priya S', 'Gender': 'Women', 'Office Location': 'Vandaloor' },
    ];
    const ws1 = XLSX.utils.json_to_sheet(regularEmployees);
    XLSX.utils.book_append_sheet(wb, ws1, 'Full-time Staff');

    const internEmployees = [
      { 'Employee Name': 'Vignesh Intern', 'Gender': 'Men', 'Office Location': 'Guindy' },
      { 'Employee Name': 'Divya Intern', 'Gender': 'Women', 'Office Location': 'Vandaloor' },
    ];
    const ws2 = XLSX.utils.json_to_sheet(internEmployees);
    XLSX.utils.book_append_sheet(wb, ws2, 'Interns');

    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const parsed = parseFileBuffer(buffer, 'Company_Roster_With_Interns.xlsx');

    // All employees across both sheets must be parsed
    expect(parsed.rows.length).toBe(4);
    expect(parsed.sheetNames).toEqual(['Full-time Staff', 'Interns']);
    expect(parsed.sheetBreakdown).toEqual([
      { sheetName: 'Full-time Staff', rowCount: 2 },
      { sheetName: 'Interns', rowCount: 2 },
    ]);

    // Check that interns are included
    const names = parsed.rows.map((r) => r['Employee Name']);
    expect(names).toContain('Arun Kumar');
    expect(names).toContain('Priya S');
    expect(names).toContain('Vignesh Intern');
    expect(names).toContain('Divya Intern');

    // Check sheet tagging
    expect(parsed.rows[2].__sheetName__).toBe('Interns');
  });

  it('correctly handles different column headers in Sheet 2 (Candidate Name) without errors', async () => {
    const XLSX = await import('xlsx');
    const { parseFileBuffer } = await import('../lib/import/employee-parser');
    const { validateEmployeeRecords } = await import('../lib/validation/employee-validation');

    // Replicate user exact workbook structure:
    // Sheet 1 (Emp): Emp Name, Gender, location
    // Sheet 2 (Intern): Candidate Name, Gender, location
    const wb = XLSX.utils.book_new();

    const empRows = [
      { 'S.no': 1, 'Emp Name': 'Srivatsa S M', 'Gender': 'Male', 'location': 'Vandalur' },
      { 'S.no': 2, 'Emp Name': 'Raagini Arun', 'Gender': 'Female', 'location': 'WFH' },
    ];
    const ws1 = XLSX.utils.json_to_sheet(empRows);
    XLSX.utils.book_append_sheet(wb, ws1, 'Emp');

    const internRows = [
      { 'S.no': 1, 'Candidate Name': 'Dinesh Kumar P', 'Gender': 'Male', 'location': 'Guindy' },
      { 'S.no': 2, 'Candidate Name': 'Hepzibah P', 'Gender': 'Female', 'location': 'Vandalur' },
    ];
    const ws2 = XLSX.utils.json_to_sheet(internRows);
    XLSX.utils.book_append_sheet(wb, ws2, 'Intern');

    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const parsed = parseFileBuffer(buffer, 'Emp_Data.xlsx');

    // Suggested mapping will match Sheet 1 ('Emp Name')
    const globalMapping = {
      nameColumn: 'Emp Name',
      genderColumn: 'Gender',
      officeColumn: 'location',
    };

    const rawRows = parsed.rows.map((row, idx) => ({
      rowNumber: idx + 2,
      data: row,
      sourceFile: `Emp_Data.xlsx [${row.__sheetName__}]`,
    }));

    const result = validateEmployeeRecords(rawRows, globalMapping);

    // Should have 0 name errors!
    const nameErrors = result.errors.filter((e) => e.field === 'name');
    expect(nameErrors).toHaveLength(0);
    expect(result.summary.hasErrors).toBe(false);

    // Verify all 4 employee names are correctly extracted
    const names = result.employees.map((e) => e.name);
    expect(names).toEqual([
      'Srivatsa S M',
      'Raagini Arun',
      'Dinesh Kumar P',
      'Hepzibah P',
    ]);

    // Verify WFH location resolved to Guindy
    expect(result.employees[1].office).toBe('Guindy');
  });
});


