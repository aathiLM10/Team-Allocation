export type OfficeLocation = 'Guindy' | 'Vandaloor';

export type Gender = 'Men' | 'Women' | 'Unspecified';

export type TeamName = 'White Team' | 'Red Team' | 'Blue Team' | 'Grey Team';

export const TEAM_NAMES: TeamName[] = [
  'White Team',
  'Red Team',
  'Blue Team',
  'Grey Team',
];

export interface Employee {
  id: string;
  name: string;
  gender: Gender;
  rawGender?: string;
  office: OfficeLocation;
  rawOffice?: string;
  sourceFile?: string;
  rowNumber?: number;
}

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationError {
  id: string;
  recordId: string;
  rowNumber: number;
  field: 'name' | 'gender' | 'office' | 'duplicate';
  severity: ValidationSeverity;
  message: string;
  rawValue?: string;
}

export interface EmployeeSummary {
  total: number;
  guindy: number;
  vandaloor: number;
  men: number;
  women: number;
  unspecified: number;
  hasErrors: boolean;
  hasWarnings: boolean;
  errorCount: number;
  warningCount: number;
}

export interface TeamStats {
  total: number;
  guindy: number;
  vandaloor: number;
  men: number;
  women: number;
  unspecified: number;
}

export interface TeamAllocation {
  teamName: TeamName;
  teamKey: 'white' | 'red' | 'blue' | 'grey';
  members: Employee[];
  stats: TeamStats;
}

export interface AllocationDiff {
  employeeId: string;
  employeeName: string;
  office: OfficeLocation;
  gender: Gender;
  previousTeam: TeamName;
  newTeam: TeamName;
}

export interface AllocationValidationReport {
  isValid: boolean;
  totalEmployees: number;
  totalAssigned: number;
  unassignedCount: number;
  duplicateAssignmentCount: number;
  isTeamSizeBalanced: boolean;
  maxTeamSizeDelta: number;
  isOfficeBalanced: boolean;
  maxGuindyDelta: number;
  maxVandaloorDelta: number;
  isGenderBalanced: boolean;
  maxMenDelta: number;
  maxWomenDelta: number;
  unavoidableImbalances: string[];
  passedChecks: string[];
  warnings: string[];
}

export interface ColumnMapping {
  nameColumn: string;
  genderColumn: string;
  officeColumn: string;
}
