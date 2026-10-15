import { TeamName } from './employee';
import { MatchCategory, MatchStatus, BadmintonFixture, SchedulingSettings } from './fixture';

export type OfficeLocation = 'Guindy' | 'Vandaloor' | string;

export interface Participant {
  id: string; // Unique Player ID (e.g. EMP001)
  name: string; // Player Name
  team: TeamName; // White Team | Red Team | Blue Team | Grey Team
  office?: string; // Informational only: Guindy, Vandaloor, or other
  gender?: 'Men' | 'Women' | 'Unspecified' | string;
  singlesRegistered: boolean; // Yes/No for Singles
  doublesRegistered: boolean; // Yes/No for Doubles
  availability?: 'Available' | 'Unavailable';
  notes?: string;
  source?: 'upload' | 'sample' | 'manual';
  createdAt?: number;
}

export interface ParticipantImportRow {
  rowNumber: number;
  id: string;
  name: string;
  team: string;
  office?: string;
  gender?: string;
  singles: string | boolean;
  doubles: string | boolean;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ParticipantImportResult {
  totalRows: number;
  validRows: number;
  errorRows: number;
  participants: Participant[];
  errors: { row: number; id: string; field: string; message: string }[];
  warnings: { row: number; id: string; field: string; message: string }[];
}

export type ImportCategoryMode = 'combined' | 'singles-only' | 'doubles-only';

export interface TournamentSummaryStats {
  totalParticipants: number;
  singlesParticipants: number;
  doublesParticipants: number;
  bothCategoriesCount: number;
  neitherCategoryCount: number;
  totalFixtures: number;
  singlesFixtures: number;
  doublesFixtures: number;
  scheduledFixtures: number;
  inProgressFixtures: number;
  completedFixtures: number;
  activeConflictsCount: number;
  teamDistribution: Record<TeamName, { total: number; singles: number; doubles: number }>;
}

export interface BadmintonTournamentState {
  participants: Participant[];
  fixtures: BadmintonFixture[];
  settings: SchedulingSettings;
  activeTab: 'singles-fixtures' | 'doubles-fixtures' | 'singles-participants' | 'doubles-participants' | 'all-participants' | 'import-data';
}
