import { Participant } from '@/types/badminton';
import { BadmintonFixture, MatchCategory, SchedulingSettings } from '@/types/fixture';
import { TeamName, TEAM_NAMES } from '@/types/employee';

export type ScheduleMode = 'one-round' | 'multiple-rounds' | 'round-robin';

export interface AutoShuffleOptions {
  category: MatchCategory;
  firstTeamA: TeamName;
  firstTeamB: TeamName;
  scheduleMode: ScheduleMode;
  roundsCount?: number; // Used when scheduleMode === 'multiple-rounds'
  totalCourts?: number;
  startDate?: string;
  startTime?: string;
  matchDurationMinutes?: number;
  seed?: number;
}

export interface AutoShuffleResult {
  success: boolean;
  fixtures: BadmintonFixture[];
  errors: string[];
  warnings: string[];
  stats: {
    totalMatches: number;
    totalRounds: number;
    assignedPlayersCount: number;
    unassignedSinglesCount: number;
    unassignedDoublesCount: number;
  };
}

/**
 * Returns the complementary pair of teams from the 4 teams.
 * When Team A and Team B are picked, the remaining two teams form the complementary match.
 */
export function getComplementaryMatchup(teamA: TeamName, teamB: TeamName): [TeamName, TeamName] {
  const remaining = TEAM_NAMES.filter((t) => t !== teamA && t !== teamB);
  if (remaining.length !== 2) {
    throw new Error(`Invalid teams provided: ${teamA}, ${teamB}`);
  }
  return [remaining[0], remaining[1]];
}

export interface RoundTeamMatches {
  roundNumber: number;
  roundName: string;
  matchups: [TeamName, TeamName][];
}

/**
 * Generates all round-level team pairings based on the user's initial selection.
 */
export function generateTeamSchedule(
  firstTeamA: TeamName,
  firstTeamB: TeamName,
  scheduleMode: ScheduleMode,
  customRoundsCount: number = 1
): RoundTeamMatches[] {
  // Complementary matchup for round 1
  const comp1 = getComplementaryMatchup(firstTeamA, firstTeamB);

  // All 3 non-overlapping round combinations of 4 teams:
  // Combination 1: (A vs B) & (C vs D)
  const round1Matchups: [TeamName, TeamName][] = [
    [firstTeamA, firstTeamB],
    [comp1[0], comp1[1]],
  ];

  // Combination 2: (A vs C) & (B vs D)
  const round2Matchups: [TeamName, TeamName][] = [
    [firstTeamA, comp1[0]],
    [firstTeamB, comp1[1]],
  ];

  // Combination 3: (A vs D) & (B vs C)
  const round3Matchups: [TeamName, TeamName][] = [
    [firstTeamA, comp1[1]],
    [firstTeamB, comp1[0]],
  ];

  const roundRobinCycle: [TeamName, TeamName][][] = [
    round1Matchups,
    round2Matchups,
    round3Matchups,
  ];

  if (scheduleMode === 'one-round') {
    return [
      {
        roundNumber: 1,
        roundName: 'Round 1',
        matchups: round1Matchups,
      },
    ];
  }

  if (scheduleMode === 'round-robin') {
    return [
      { roundNumber: 1, roundName: 'Round 1', matchups: round1Matchups },
      { roundNumber: 2, roundName: 'Round 2', matchups: round2Matchups },
      { roundNumber: 3, roundName: 'Round 3', matchups: round3Matchups },
    ];
  }

  // Multiple rounds (configurable count)
  const rounds: RoundTeamMatches[] = [];
  const targetRounds = Math.max(1, Math.min(10, customRoundsCount));

  for (let r = 0; r < targetRounds; r++) {
    const cycleIndex = r % 3;
    rounds.push({
      roundNumber: r + 1,
      roundName: `Round ${r + 1}`,
      matchups: roundRobinCycle[cycleIndex],
    });
  }

  return rounds;
}

/**
 * Main Automatic Fixture Shuffle Engine
 */
export function autoShuffleFixtures(
  participants: Participant[],
  options: AutoShuffleOptions,
  settings: SchedulingSettings
): AutoShuffleResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const {
    category,
    firstTeamA,
    firstTeamB,
    scheduleMode,
    roundsCount = 1,
    startDate = settings.defaultDate,
    startTime = settings.defaultTime,
    matchDurationMinutes = 35,
  } = options;

  // 1. Team validation
  if (!firstTeamA || !firstTeamB || firstTeamA === firstTeamB) {
    errors.push('Team A and Team B must be two different teams.');
    return {
      success: false,
      fixtures: [],
      errors,
      warnings,
      stats: {
        totalMatches: 0,
        totalRounds: 0,
        assignedPlayersCount: 0,
        unassignedSinglesCount: 0,
        unassignedDoublesCount: 0,
      },
    };
  }

  // 2. Validate participant counts per team
  const teamsMap = new Map<TeamName, Participant[]>();
  TEAM_NAMES.forEach((t) => teamsMap.set(t, []));

  participants.forEach((p) => {
    if (teamsMap.has(p.team)) {
      teamsMap.get(p.team)!.push(p);
    }
  });

  TEAM_NAMES.forEach((tName) => {
    const teamMembers = teamsMap.get(tName) || [];
    if (category === 'Singles') {
      const eligible = teamMembers.filter((p) => p.singlesRegistered);
      if (eligible.length === 0) {
        errors.push(`${tName} has 0 registered Singles players. Please upload or register at least 1 Singles player for this team.`);
      }
    } else {
      const eligible = teamMembers.filter((p) => p.doublesRegistered);
      if (eligible.length < 2) {
        errors.push(`${tName} has only ${eligible.length} registered Doubles player(s). At least 2 are required to form a Doubles side.`);
      }
    }
  });

  if (errors.length > 0) {
    return {
      success: false,
      fixtures: [],
      errors,
      warnings,
      stats: {
        totalMatches: 0,
        totalRounds: 0,
        assignedPlayersCount: 0,
        unassignedSinglesCount: participants.filter((p) => p.singlesRegistered).length,
        unassignedDoublesCount: participants.filter((p) => p.doublesRegistered).length,
      },
    };
  }

  // 3. Generate schedule structure
  const roundSchedules = generateTeamSchedule(firstTeamA, firstTeamB, scheduleMode, roundsCount);

  // 4. Player Tracking
  const playerMatchCounts = new Map<string, number>();
  participants.forEach((p) => playerMatchCounts.set(p.id, 0));

  const headToHeadCounts = new Map<string, number>();
  const partnerPairCounts = new Map<string, number>();

  const assignedPlayerIdsSet = new Set<string>();
  const generatedFixtures: BadmintonFixture[] = [];

  let matchIndex = 1;

  // Helper to calculate match time across rounds
  const getTimeForMatch = (roundIdx: number, matchInRoundIdx: number) => {
    // If multiple courts are available, matches in same round can run simultaneously on different courts
    const totalCourts = settings.courtNames.length || 2;
    const courtName = settings.courtNames[matchInRoundIdx % totalCourts] || `Court ${(matchInRoundIdx % totalCourts) + 1}`;

    // Base start time
    const [startH, startM] = (startTime || '10:00').split(':').map((s) => parseInt(s, 10) || 0);

    // If court overflow exists in same round, advance time, else advance time per round
    const extraSlots = Math.floor(matchInRoundIdx / totalCourts);
    const totalMinuteOffset = roundIdx * matchDurationMinutes + extraSlots * matchDurationMinutes;

    const totalMinutes = startH * 60 + startM + totalMinuteOffset;
    const finalH = Math.floor(totalMinutes / 60) % 24;
    const finalM = totalMinutes % 60;
    const formattedTime = `${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`;

    return { courtName, formattedTime };
  };

  // Helper to shuffle array with pseudo-randomness
  const shuffleArray = <T>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  // 5. Generate Fixtures Round by Round
  roundSchedules.forEach((round, roundIdx) => {
    // Keep track of players already assigned in this round to prevent simultaneous play
    const playersInCurrentRound = new Set<string>();

    round.matchups.forEach((matchup, matchInRoundIdx) => {
      const [teamA, teamB] = matchup;
      const matchId = `M${String(matchIndex).padStart(3, '0')}`;
      const { courtName, formattedTime } = getTimeForMatch(roundIdx, matchInRoundIdx);

      if (category === 'Singles') {
        // --- SINGLES ASSIGNMENT ---
        const eligibleA = (teamsMap.get(teamA) || []).filter((p) => p.singlesRegistered);
        const eligibleB = (teamsMap.get(teamB) || []).filter((p) => p.singlesRegistered);

        // Sort candidates: favor players not yet in this round, then players with lowest match count, with randomized tie-breaking
        const candidatePoolA = shuffleArray(eligibleA).sort((a, b) => {
          const inRoundA = playersInCurrentRound.has(a.id) ? 1 : 0;
          const inRoundB = playersInCurrentRound.has(b.id) ? 1 : 0;
          if (inRoundA !== inRoundB) return inRoundA - inRoundB;
          return (playerMatchCounts.get(a.id) || 0) - (playerMatchCounts.get(b.id) || 0);
        });

        const candidatePoolB = shuffleArray(eligibleB).sort((a, b) => {
          const inRoundA = playersInCurrentRound.has(a.id) ? 1 : 0;
          const inRoundB = playersInCurrentRound.has(b.id) ? 1 : 0;
          if (inRoundA !== inRoundB) return inRoundA - inRoundB;
          return (playerMatchCounts.get(a.id) || 0) - (playerMatchCounts.get(b.id) || 0);
        });

        const playerA = candidatePoolA[0];
        const playerB = candidatePoolB[0];

        if (!playerA || !playerB) {
          errors.push(`Could not assign singles players for ${teamA} vs ${teamB} in ${round.roundName}.`);
          return;
        }

        // Record tracking
        playersInCurrentRound.add(playerA.id);
        playersInCurrentRound.add(playerB.id);
        assignedPlayerIdsSet.add(playerA.id);
        assignedPlayerIdsSet.add(playerB.id);

        playerMatchCounts.set(playerA.id, (playerMatchCounts.get(playerA.id) || 0) + 1);
        playerMatchCounts.set(playerB.id, (playerMatchCounts.get(playerB.id) || 0) + 1);

        const h2hKey = [playerA.id, playerB.id].sort().join('::');
        headToHeadCounts.set(h2hKey, (headToHeadCounts.get(h2hKey) || 0) + 1);

        generatedFixtures.push({
          id: matchId,
          category: 'Singles',
          teamA,
          teamAPlayers: [
            {
              id: playerA.id,
              name: playerA.name,
              gender: (playerA.gender || 'Men') as any,
              office: (playerA.office || 'Guindy') as any,
            },
          ],
          teamB,
          teamBPlayers: [
            {
              id: playerB.id,
              name: playerB.name,
              gender: (playerB.gender || 'Men') as any,
              office: (playerB.office || 'Guindy') as any,
            },
          ],
          court: courtName,
          scheduledDate: startDate,
          scheduledTime: formattedTime,
          round: round.roundName,
          status: 'Scheduled',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      } else {
        // --- DOUBLES ASSIGNMENT ---
        const eligibleA = (teamsMap.get(teamA) || []).filter((p) => p.doublesRegistered);
        const eligibleB = (teamsMap.get(teamB) || []).filter((p) => p.doublesRegistered);

        // Best pair for Team A:
        const pickBestPair = (candidates: Participant[]): [Participant, Participant] => {
          let best: [Participant, Participant] = [candidates[0], candidates[1]];
          let lowestScore = Infinity;

          const shuffled = shuffleArray(candidates);

          for (let i = 0; i < shuffled.length; i++) {
            for (let j = i + 1; j < shuffled.length; j++) {
              const p1 = shuffled[i];
              const p2 = shuffled[j];

              // Penalize if player is already playing in current round
              const inRoundPenalty =
                (playersInCurrentRound.has(p1.id) ? 500 : 0) +
                (playersInCurrentRound.has(p2.id) ? 500 : 0);

              const pairKey = [p1.id, p2.id].sort().join('::');
              const pairTimes = partnerPairCounts.get(pairKey) || 0;
              const matchTimes1 = playerMatchCounts.get(p1.id) || 0;
              const matchTimes2 = playerMatchCounts.get(p2.id) || 0;

              const score = inRoundPenalty + pairTimes * 100 + matchTimes1 * 10 + matchTimes2 * 10;
              if (score < lowestScore) {
                lowestScore = score;
                best = [p1, p2];
              }
            }
          }

          return best;
        };

        const pairA = pickBestPair(eligibleA);
        const pairB = pickBestPair(eligibleB);

        // Record tracking
        pairA.forEach((p) => {
          playersInCurrentRound.add(p.id);
          assignedPlayerIdsSet.add(p.id);
          playerMatchCounts.set(p.id, (playerMatchCounts.get(p.id) || 0) + 1);
        });

        pairB.forEach((p) => {
          playersInCurrentRound.add(p.id);
          assignedPlayerIdsSet.add(p.id);
          playerMatchCounts.set(p.id, (playerMatchCounts.get(p.id) || 0) + 1);
        });

        const pairKeyA = [pairA[0].id, pairA[1].id].sort().join('::');
        partnerPairCounts.set(pairKeyA, (partnerPairCounts.get(pairKeyA) || 0) + 1);

        const pairKeyB = [pairB[0].id, pairB[1].id].sort().join('::');
        partnerPairCounts.set(pairKeyB, (partnerPairCounts.get(pairKeyB) || 0) + 1);

        generatedFixtures.push({
          id: matchId,
          category: 'Doubles',
          teamA,
          teamAPlayers: [
            {
              id: pairA[0].id,
              name: pairA[0].name,
              gender: (pairA[0].gender || 'Men') as any,
              office: (pairA[0].office || 'Guindy') as any,
            },
            {
              id: pairA[1].id,
              name: pairA[1].name,
              gender: (pairA[1].gender || 'Men') as any,
              office: (pairA[1].office || 'Guindy') as any,
            },
          ],
          teamB,
          teamBPlayers: [
            {
              id: pairB[0].id,
              name: pairB[0].name,
              gender: (pairB[0].gender || 'Men') as any,
              office: (pairB[0].office || 'Guindy') as any,
            },
            {
              id: pairB[1].id,
              name: pairB[1].name,
              gender: (pairB[1].gender || 'Men') as any,
              office: (pairB[1].office || 'Guindy') as any,
            },
          ],
          court: courtName,
          scheduledDate: startDate,
          scheduledTime: formattedTime,
          round: round.roundName,
          status: 'Scheduled',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      matchIndex++;
    });
  });

  const singlesPool = participants.filter((p) => p.singlesRegistered);
  const doublesPool = participants.filter((p) => p.doublesRegistered);

  const unassignedSingles = singlesPool.filter((p) => (playerMatchCounts.get(p.id) || 0) === 0).length;
  const unassignedDoubles = doublesPool.filter((p) => (playerMatchCounts.get(p.id) || 0) === 0).length;

  return {
    success: errors.length === 0,
    fixtures: generatedFixtures,
    errors,
    warnings,
    stats: {
      totalMatches: generatedFixtures.length,
      totalRounds: roundSchedules.length,
      assignedPlayersCount: assignedPlayerIdsSet.size,
      unassignedSinglesCount: category === 'Singles' ? unassignedSingles : 0,
      unassignedDoublesCount: category === 'Doubles' ? unassignedDoubles : 0,
    },
  };
}

/**
 * Compare two fixture sets on "Shuffle Again" to generate a user-facing movement summary.
 */
export function compareShuffles(
  prevFixtures: BadmintonFixture[],
  newFixtures: BadmintonFixture[]
): {
  hasChanges: boolean;
  changedMatchesCount: number;
  changes: string[];
} {
  const changes: string[] = [];
  let changedMatchesCount = 0;

  const prevMap = new Map<string, BadmintonFixture>();
  prevFixtures.forEach((f) => prevMap.set(f.id, f));

  newFixtures.forEach((newF) => {
    const oldF = prevMap.get(newF.id);
    if (!oldF) return;

    const oldA = oldF.teamAPlayers.map((p) => p.name).join(' + ');
    const newA = newF.teamAPlayers.map((p) => p.name).join(' + ');
    const oldB = oldF.teamBPlayers.map((p) => p.name).join(' + ');
    const newB = newF.teamBPlayers.map((p) => p.name).join(' + ');

    if (oldA !== newA || oldB !== newB) {
      changedMatchesCount++;
      changes.push(
        `${newF.id} (${newF.round}): ${newF.teamA} changed from [${oldA}] to [${newA}], ${newF.teamB} changed from [${oldB}] to [${newB}]`
      );
    }
  });

  return {
    hasChanges: changedMatchesCount > 0,
    changedMatchesCount,
    changes,
  };
}
