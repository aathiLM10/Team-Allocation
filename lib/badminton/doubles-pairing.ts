import { TeamName, TEAM_NAMES } from '@/types/employee';

export interface DoublesEmployee {
  id: string;
  name: string;
  team: TeamName;
  office?: string;
  gender?: string;
}

export interface GeneratedDoublesPair {
  id: string; // e.g. "PAIR-RED-1"
  pairNumber: number; // 1, 2, 3...
  team: TeamName;
  player1: DoublesEmployee;
  player2: DoublesEmployee;
  displayNames: string; // e.g. "Employee A + Employee B"
  createdAt: number;
}

export interface TeamDoublesSummary {
  team: TeamName;
  totalEmployees: number;
  totalPairs: number;
  unpairedEmployee: DoublesEmployee | null;
  pairs: GeneratedDoublesPair[];
}

export interface TeamDoublesResult {
  teams: Record<TeamName, TeamDoublesSummary>;
  totalEmployees: number;
  totalPairs: number;
  totalUnpaired: number;
  generatedAt: number;
}

/**
 * Modern Fisher-Yates array shuffle for unbiased random distribution.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Generates doubles pairs randomly within a single team.
 * Never pairs employees across different teams.
 * If team has an odd count, the remaining employee is designated as unpairedEmployee.
 */
export function generateDoublesPairsForTeam(
  employees: DoublesEmployee[],
  team: TeamName,
  options: { shuffle?: boolean } = { shuffle: true }
): { pairs: GeneratedDoublesPair[]; unpaired: DoublesEmployee | null } {
  const teamMembers = employees.filter((e) => e.team === team);
  const pool = options.shuffle !== false ? shuffleArray(teamMembers) : [...teamMembers];

  const pairs: GeneratedDoublesPair[] = [];
  const fullPairCount = Math.floor(pool.length / 2);

  for (let i = 0; i < fullPairCount; i++) {
    const p1 = pool[i * 2];
    const p2 = pool[i * 2 + 1];
    const pairNumber = i + 1;

    pairs.push({
      id: `PAIR-${team.substring(0, 3).toUpperCase()}-${pairNumber}`,
      pairNumber,
      team,
      player1: p1,
      player2: p2,
      displayNames: `${p1.name} + ${p2.name}`,
      createdAt: Date.now() + i,
    });
  }

  const unpaired = pool.length % 2 === 1 ? pool[pool.length - 1] : null;

  return { pairs, unpaired };
}

/**
 * Generates doubles pairs independently for all four teams (Red, Blue, Grey, White).
 */
export function generateAllDoublesPairs(
  employees: DoublesEmployee[],
  options: { shuffle?: boolean } = { shuffle: true }
): TeamDoublesResult {
  const teamsMap = {} as Record<TeamName, TeamDoublesSummary>;
  let totalPairs = 0;
  let totalUnpaired = 0;

  TEAM_NAMES.forEach((team) => {
    const teamMembers = employees.filter((e) => e.team === team);
    const { pairs, unpaired } = generateDoublesPairsForTeam(teamMembers, team, options);

    teamsMap[team] = {
      team,
      totalEmployees: teamMembers.length,
      totalPairs: pairs.length,
      unpairedEmployee: unpaired,
      pairs,
    };

    totalPairs += pairs.length;
    if (unpaired) totalUnpaired += 1;
  });

  return {
    teams: teamsMap,
    totalEmployees: employees.length,
    totalPairs,
    totalUnpaired,
    generatedAt: Date.now(),
  };
}

/**
 * Shuffles and regenerates pairs for a single specified team.
 * Leaves all other three teams completely unchanged.
 */
export function shuffleTeamDoublesPairs(
  currentResult: TeamDoublesResult,
  teamToShuffle: TeamName,
  allEmployees: DoublesEmployee[]
): TeamDoublesResult {
  const teamMembers = allEmployees.filter((e) => e.team === teamToShuffle);
  const { pairs, unpaired } = generateDoublesPairsForTeam(teamMembers, teamToShuffle, {
    shuffle: true,
  });

  const updatedTeams = {
    ...currentResult.teams,
    [teamToShuffle]: {
      team: teamToShuffle,
      totalEmployees: teamMembers.length,
      totalPairs: pairs.length,
      unpairedEmployee: unpaired,
      pairs,
    },
  };

  const totalPairs = Object.values(updatedTeams).reduce((sum, t) => sum + t.totalPairs, 0);
  const totalUnpaired = Object.values(updatedTeams).reduce(
    (sum, t) => sum + (t.unpairedEmployee ? 1 : 0),
    0
  );

  return {
    ...currentResult,
    teams: updatedTeams,
    totalPairs,
    totalUnpaired,
    generatedAt: Date.now(),
  };
}
