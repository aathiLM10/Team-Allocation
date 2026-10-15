import { TeamName, Employee } from './employee';
import { MatchCategory, MatchStatus, SchedulingSettings } from './fixture';
import { Participant } from './badminton';

export interface DoublesPair {
  id: string; // e.g. "PAIR_01"
  team: TeamName;
  player1: Employee;
  player2: Employee;
  isLocked: boolean; // Locked pairs remain unchanged during fixture regeneration/shuffling
  createdAt: number;
}

export interface KnockoutParticipantEntry {
  id: string; // Player ID (singles) or Pair ID (doubles)
  displayName: string;
  team: TeamName;
  players: Employee[]; // 1 for singles, 2 for doubles
  seed?: number;
  isBye?: boolean;
}

export interface KnockoutSide {
  participant?: KnockoutParticipantEntry;
  sourceMatchId?: string; // e.g. "QF1"
  placeholderText?: string; // e.g. "Winner of QF1"
  score?: string; // e.g. "21-18, 21-19"
  isWinner?: boolean;
}

export interface KnockoutMatch {
  id: string; // e.g. "R16-1", "QF1", "SF1", "FINAL"
  category: MatchCategory;
  roundName: string; // "Round of 16" | "Quarterfinals" | "Semifinals" | "Final"
  roundIndex: number; // 0, 1, 2, 3...
  matchIndex: number; // Index in round: 0, 1, 2...
  sideA: KnockoutSide;
  sideB: KnockoutSide;
  winnerId?: string;
  status: MatchStatus | 'Walkover' | 'Bye';
  court: string;
  scheduledDate: string;
  scheduledTime: string;
  nextMatchId?: string;
  nextMatchSlot?: 'sideA' | 'sideB';
  isByeMatch?: boolean;
  notes?: string;
  updatedAt: number;
}

export interface KnockoutRound {
  roundName: string;
  roundIndex: number;
  matches: KnockoutMatch[];
}

export interface KnockoutBracket {
  id: string;
  category: MatchCategory;
  totalParticipants: number;
  bracketSize: number; // 2, 4, 8, 16
  byesCount: number;
  rounds: KnockoutRound[];
  isLocked: boolean; // Locked bracket prevents accidental reshuffle
  hasStarted: boolean;
  champion?: KnockoutParticipantEntry;
  createdAt: number;
  updatedAt: number;
}

export interface KnockoutConfigOptions {
  category: MatchCategory;
  firstTeamA?: TeamName;
  firstTeamB?: TeamName;
  startDate?: string;
  startTime?: string;
  matchDurationMinutes?: number;
}
