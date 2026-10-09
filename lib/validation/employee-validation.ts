import {
  Employee,
  Gender,
  OfficeLocation,
  ValidationError,
  EmployeeSummary,
  ColumnMapping,
} from '@/types/employee';

export interface RawRowWithMeta {
  rowNumber: number;
  data: Record<string, unknown>;
  sourceFile: string;
  defaultOffice?: OfficeLocation;
  sheetMapping?: ColumnMapping;
}

export function normalizeGender(val: unknown): {
  gender: Gender;
  isValid: boolean;
  raw: string;
} {
  const raw = String(val ?? '').trim();
  const lower = raw.toLowerCase();

  if (!raw) {
    return { gender: 'Unspecified', isValid: false, raw: '' };
  }

  if (['male', 'm', 'men', 'man', 'boy'].includes(lower)) {
    return { gender: 'Men', isValid: true, raw };
  }

  if (['female', 'f', 'women', 'woman', 'girl'].includes(lower)) {
    return { gender: 'Women', isValid: true, raw };
  }

  if (
    [
      'unspecified',
      'other',
      'non-binary',
      'nonbinary',
      'nb',
      'na',
      'n/a',
      'prefer not to say',
      'unknown',
      '-',
    ].includes(lower)
  ) {
    return { gender: 'Unspecified', isValid: true, raw };
  }

  // Not recognized
  return { gender: 'Unspecified', isValid: false, raw };
}

export function normalizeOffice(
  val: unknown,
  defaultOffice?: OfficeLocation
): {
  office: OfficeLocation | null;
  isValid: boolean;
  raw: string;
} {
  const raw = String(val ?? '').trim();
  const lower = raw.toLowerCase();

  if (!raw && defaultOffice) {
    return { office: defaultOffice, isValid: true, raw: defaultOffice };
  }

  if (!raw) {
    return { office: null, isValid: false, raw: '' };
  }

  if (lower === 'guindy' || lower.includes('guindy')) {
    return { office: 'Guindy', isValid: true, raw };
  }

  if (
    lower === 'vandaloor' ||
    lower === 'vandalur' ||
    lower.includes('vandal')
  ) {
    return { office: 'Vandaloor', isValid: true, raw };
  }

  if (
    lower === 'wfh' ||
    lower.includes('wfh') ||
    lower.includes('remote') ||
    lower.includes('home')
  ) {
    return { office: 'Guindy', isValid: true, raw };
  }

  return { office: null, isValid: false, raw };
}

export function calculateSummary(
  employees: Employee[],
  errors: ValidationError[]
): EmployeeSummary {
  let guindy = 0;
  let vandaloor = 0;
  let men = 0;
  let women = 0;
  let unspecified = 0;

  for (const emp of employees) {
    if (emp.office === 'Guindy') guindy++;
    else if (emp.office === 'Vandaloor') vandaloor++;

    if (emp.gender === 'Men') men++;
    else if (emp.gender === 'Women') women++;
    else unspecified++;
  }

  const errorCount = errors.filter((e) => e.severity === 'error').length;
  const warningCount = errors.filter((e) => e.severity === 'warning').length;

  return {
    total: employees.length,
    guindy,
    vandaloor,
    men,
    women,
    unspecified,
    hasErrors: errorCount > 0,
    hasWarnings: warningCount > 0,
    errorCount,
    warningCount,
  };
}

/**
 * Validates a list of Employee domain objects and detects duplicate names.
 * Distinguishes employees by their unique ID `emp.id`.
 */
export function validateEmployeeList(employees: Employee[]): {
  errors: ValidationError[];
  summary: EmployeeSummary;
} {
  const errors: ValidationError[] = [];
  const nameOccurrences = new Map<
    string,
    { id: string; rowNumber: number; displayName: string }[]
  >();

  employees.forEach((emp, index) => {
    const rowNumber = emp.rowNumber ?? index + 1;
    const trimmedName = (emp.name ?? '').trim();

    // 1. Validate Name
    if (!trimmedName || trimmedName.startsWith('[Unnamed Employee')) {
      errors.push({
        id: `err-name-${emp.id}`,
        recordId: emp.id,
        rowNumber,
        field: 'name',
        severity: 'error',
        message: 'Employee Name cannot be empty.',
        rawValue: emp.name,
      });
    }

    // 2. Validate Gender
    if (!['Men', 'Women', 'Unspecified'].includes(emp.gender)) {
      errors.push({
        id: `err-gender-${emp.id}`,
        recordId: emp.id,
        rowNumber,
        field: 'gender',
        severity: 'error',
        message: `Unsupported gender value "${emp.gender}". Must be Men, Women, or Unspecified.`,
        rawValue: emp.gender,
      });
    }

    // 3. Validate Office
    if (!['Guindy', 'Vandaloor'].includes(emp.office)) {
      errors.push({
        id: `err-office-${emp.id}`,
        recordId: emp.id,
        rowNumber,
        field: 'office',
        severity: 'error',
        message: `Invalid office location "${emp.office}". Must be Guindy or Vandaloor.`,
        rawValue: emp.office,
      });
    }

    // Track duplicate names (case-insensitive)
    if (trimmedName && !trimmedName.startsWith('[Unnamed Employee')) {
      const lower = trimmedName.toLowerCase();
      const existing = nameOccurrences.get(lower) || [];
      existing.push({ id: emp.id, rowNumber, displayName: trimmedName });
      nameOccurrences.set(lower, existing);
    }
  });

  // Generate duplicate warnings for employees sharing identical names
  nameOccurrences.forEach((matches) => {
    if (matches.length > 1) {
      const rowList = matches.map((m) => `Row ${m.rowNumber}`).join(', ');
      matches.forEach((m) => {
        errors.push({
          id: `warn-dup-${m.id}`,
          recordId: m.id,
          rowNumber: m.rowNumber,
          field: 'duplicate',
          severity: 'warning',
          message: `Duplicate name detected ("${m.displayName}"). Found on ${rowList}. Consider renaming to differentiate (e.g. "Vignesh Srinivasan").`,
          rawValue: m.displayName,
        });
      });
    }
  });

  const summary = calculateSummary(employees, errors);

  return { errors, summary };
}

export function validateEmployeeRecords(
  rows: RawRowWithMeta[],
  mapping: ColumnMapping
): {
  employees: Employee[];
  errors: ValidationError[];
  summary: EmployeeSummary;
} {
  const employees: Employee[] = [];
  const rawErrors: ValidationError[] = [];

  rows.forEach((rowMeta, index) => {
    const recordId = `emp-${index + 1}`;
    const rowNumber = rowMeta.rowNumber;
    const sourceFile = rowMeta.sourceFile;

    // 1. Resolve Employee Name (using global mapping, row sheet mapping, or column name heuristics)
    let rawName = String(rowMeta.data[mapping.nameColumn] ?? '').trim();

    if (!rawName) {
      const rowSheetMapping =
        (rowMeta.data.__sheetMapping__ as ColumnMapping) || rowMeta.sheetMapping;
      if (rowSheetMapping?.nameColumn && rowMeta.data[rowSheetMapping.nameColumn]) {
        rawName = String(rowMeta.data[rowSheetMapping.nameColumn] ?? '').trim();
      }
    }

    if (!rawName) {
      for (const k of Object.keys(rowMeta.data)) {
        if (k.startsWith('__')) continue;
        const lower = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (
          lower.includes('name') ||
          lower.includes('candidate') ||
          lower.includes('intern') ||
          lower.includes('emp') ||
          lower.includes('member')
        ) {
          const val = String(rowMeta.data[k] ?? '').trim();
          if (val) {
            rawName = val;
            break;
          }
        }
      }
    }

    // 2. Resolve Gender
    let rawGenderVal = rowMeta.data[mapping.genderColumn];
    if (rawGenderVal === undefined || rawGenderVal === null || String(rawGenderVal).trim() === '') {
      const rowSheetMapping =
        (rowMeta.data.__sheetMapping__ as ColumnMapping) || rowMeta.sheetMapping;
      if (rowSheetMapping?.genderColumn && rowMeta.data[rowSheetMapping.genderColumn] !== undefined) {
        rawGenderVal = rowMeta.data[rowSheetMapping.genderColumn];
      } else {
        for (const k of Object.keys(rowMeta.data)) {
          if (k.startsWith('__')) continue;
          const lower = k.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (lower.includes('gender') || lower === 'sex' || lower === 'mf') {
            rawGenderVal = rowMeta.data[k];
            break;
          }
        }
      }
    }
    const genderResult = normalizeGender(rawGenderVal);

    // 3. Resolve Office Location
    let rawOfficeVal =
      mapping.officeColumn === '__DEFAULT_OFFICE__'
        ? rowMeta.defaultOffice
        : rowMeta.data[mapping.officeColumn];

    if (rawOfficeVal === undefined || rawOfficeVal === null || String(rawOfficeVal).trim() === '') {
      const rowSheetMapping =
        (rowMeta.data.__sheetMapping__ as ColumnMapping) || rowMeta.sheetMapping;
      if (rowSheetMapping?.officeColumn && rowMeta.data[rowSheetMapping.officeColumn] !== undefined) {
        rawOfficeVal = rowMeta.data[rowSheetMapping.officeColumn];
      } else {
        for (const k of Object.keys(rowMeta.data)) {
          if (k.startsWith('__')) continue;
          const lower = k.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (
            lower.includes('office') ||
            lower.includes('location') ||
            lower.includes('branch') ||
            lower.includes('site')
          ) {
            rawOfficeVal = rowMeta.data[k];
            break;
          }
        }
      }
    }
    const officeResult = normalizeOffice(rawOfficeVal, rowMeta.defaultOffice);

    if (!rawName) {
      rawErrors.push({
        id: `err-name-${recordId}`,
        recordId,
        rowNumber,
        field: 'name',
        severity: 'error',
        message: 'Employee Name is missing or empty.',
        rawValue: '',
      });
    }

    if (!genderResult.isValid) {
      rawErrors.push({
        id: `err-gender-${recordId}`,
        recordId,
        rowNumber,
        field: 'gender',
        severity: 'error',
        message: genderResult.raw
          ? `Unsupported gender value "${genderResult.raw}". Please set to Men, Women, or Unspecified.`
          : 'Gender is missing. Please specify Men, Women, or Unspecified.',
        rawValue: genderResult.raw,
      });
    }

    if (!officeResult.isValid || !officeResult.office) {
      rawErrors.push({
        id: `err-office-${recordId}`,
        recordId,
        rowNumber,
        field: 'office',
        severity: 'error',
        message: officeResult.raw
          ? `Invalid office location "${officeResult.raw}". Must be "Guindy" or "Vandaloor".`
          : 'Office location is missing. Must be "Guindy" or "Vandaloor".',
        rawValue: officeResult.raw,
      });
    }

    const emp: Employee = {
      id: recordId,
      name: rawName || `[Unnamed Employee #${rowNumber}]`,
      gender: genderResult.gender,
      rawGender: genderResult.raw,
      office: officeResult.office ?? 'Guindy',
      rawOffice: officeResult.raw,
      sourceFile,
      rowNumber,
    };

    employees.push(emp);
  });

  const { errors: listErrors } = validateEmployeeList(employees);

  // Combine raw format errors with duplicate warnings, avoiding duplicate keys
  const combinedErrorsMap = new Map<string, ValidationError>();
  rawErrors.forEach((e) => combinedErrorsMap.set(e.id, e));
  listErrors.forEach((e) => combinedErrorsMap.set(e.id, e));

  const allErrors = Array.from(combinedErrorsMap.values());
  const summary = calculateSummary(employees, allErrors);

  return {
    employees,
    errors: allErrors,
    summary,
  };
}
