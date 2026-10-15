import { TeamName, Employee } from './employee';

export type MatchCategory = 'Singles' | 'Doubles';

export type MatchStatus = 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';

export interface BadmintonFixture {
  id: string; // e.g. "M001", "M002"
  category: MatchCategory;
  teamA: TeamName;
  teamAPlayers: Employee[]; // 1 for Singles, 2 for Doubles
  teamB: TeamName;
  teamBPlayers: Employee[]; // 1 for Singles, 2 for Doubles
  court: string; // e.g. "Court 1", "Court 2"
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:MM
  round: string; // e.g. "Round 1", "Round 2", "Quarterfinals", "Semifinals", "Finals"
  status: MatchStatus;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface FixtureDraft {
  id?: string;
  category: MatchCategory;
  teamA: TeamName | '';
  teamAPlayerIds: string[]; // 1 for Singles, 2 for Doubles
  teamB: TeamName | '';
  teamBPlayerIds: string[]; // 1 for Singles, 2 for Doubles
  court: string;
  scheduledDate: string;
  scheduledTime: string;
  round: string;
  status: MatchStatus;
  notes?: string;
}

export interface SchedulingSettings {
  totalCourts: number;
  courtNames: string[];
  defaultDate: string;
  defaultTime: string;
  defaultRound: string;
  allowRematches: boolean;
  allowPlayerMultipleInRound: boolean;
  allowSimultaneousMatches: boolean;
}

export const DEFAULT_SCHEDULING_SETTINGS: SchedulingSettings = {
  totalCourts: 3,
  courtNames: ['Court 1', 'Court 2', 'Court 3'],
  defaultDate: new Date().toISOString().split('T')[0],
  defaultTime: '10:00',
  defaultRound: 'Round 1',
  allowRematches: false,
  allowPlayerMultipleInRound: true,
  allowSimultaneousMatches: false,
};

export interface FixtureConflict {
  type: 'player_simultaneous' | 'court_simultaneous' | 'player_same_round' | 'duplicate_matchup' | 'repeated_partners';
  severity: 'error' | 'warning';
  message: string;
  fixtureId: string;
  conflictingFixtureId?: string;
  playerIds?: string[];
  playerNames?: string[];
}

export interface FixtureValidationReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  conflicts: FixtureConflict[];
}
