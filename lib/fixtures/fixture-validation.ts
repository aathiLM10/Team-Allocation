import {
  BadmintonFixture,
  FixtureDraft,
  SchedulingSettings,
  FixtureValidationReport,
  FixtureConflict,
} from '@/types/fixture';
import { TeamAllocation, Employee, TeamName } from '@/types/employee';

/**
 * Generate a sequential match ID (e.g. M001, M002) that doesn't collide with existing IDs.
 */
export function generateNextMatchId(existingFixtures: BadmintonFixture[]): string {
  const existingNumbers = existingFixtures
    .map((f) => {
      const match = f.id.match(/^M(\d+)$/i);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => !isNaN(n) && n > 0);

  const nextNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
  return `M${String(nextNum).padStart(3, '0')}`;
}

/**
 * Validates a single draft fixture before saving or updating.
 */
export function validateDraftFixture(
  draft: FixtureDraft,
  existingFixtures: BadmintonFixture[],
  allocations: TeamAllocation[],
  settings: SchedulingSettings
): FixtureValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const conflicts: FixtureConflict[] = [];

  // 1. Category validation
  if (!draft.category || !['Singles', 'Doubles'].includes(draft.category)) {
    errors.push('Match category must be selected as Singles or Doubles.');
  }

  // 2. Team selection and different teams requirement
  if (!draft.teamA) {
    errors.push('Team A must be selected.');
  }
  if (!draft.teamB) {
    errors.push('Team B must be selected.');
  }
  if (draft.teamA && draft.teamB && draft.teamA === draft.teamB) {
    errors.push('Team A and Team B must be different teams. Opposing sides cannot belong to the same team.');
  }

  // Map allocations for quick lookup
  const teamMembersMap = new Map<TeamName, Map<string, Employee>>();
  allocations.forEach((team) => {
    const map = new Map<string, Employee>();
    team.members.forEach((m) => map.set(m.id, m));
    teamMembersMap.set(team.teamName, map);
  });

  const expectedPlayerCount = draft.category === 'Singles' ? 1 : 2;

  // 3. Team A player count & validation
  if (!draft.teamAPlayerIds || draft.teamAPlayerIds.length === 0) {
    errors.push(`Please select ${expectedPlayerCount} player${expectedPlayerCount > 1 ? 's' : ''} for Team A.`);
  } else if (draft.teamAPlayerIds.length !== expectedPlayerCount) {
    errors.push(
      `Team A requires exactly ${expectedPlayerCount} player${expectedPlayerCount > 1 ? 's' : ''} for ${draft.category}. Currently selected: ${draft.teamAPlayerIds.length}.`
    );
  } else {
    // Check membership
    const teamAMembers = draft.teamA ? teamMembersMap.get(draft.teamA) : null;
    draft.teamAPlayerIds.forEach((id) => {
      if (teamAMembers && !teamAMembers.has(id)) {
        errors.push(`Selected player does not belong to ${draft.teamA}.`);
      }
    });
  }

  // 4. Team B player count & validation
  if (!draft.teamBPlayerIds || draft.teamBPlayerIds.length === 0) {
    errors.push(`Please select ${expectedPlayerCount} player${expectedPlayerCount > 1 ? 's' : ''} for Team B.`);
  } else if (draft.teamBPlayerIds.length !== expectedPlayerCount) {
    errors.push(
      `Team B requires exactly ${expectedPlayerCount} player${expectedPlayerCount > 1 ? 's' : ''} for ${draft.category}. Currently selected: ${draft.teamBPlayerIds.length}.`
    );
  } else {
    // Check membership
    const teamBMembers = draft.teamB ? teamMembersMap.get(draft.teamB) : null;
    draft.teamBPlayerIds.forEach((id) => {
      if (teamBMembers && !teamBMembers.has(id)) {
        errors.push(`Selected player does not belong to ${draft.teamB}.`);
      }
    });
  }

  // 5. Unique players within the same fixture
  const allSelectedPlayerIds = [...(draft.teamAPlayerIds || []), ...(draft.teamBPlayerIds || [])];
  const uniquePlayerIds = new Set(allSelectedPlayerIds);
  if (uniquePlayerIds.size < allSelectedPlayerIds.length) {
    errors.push('A player cannot occupy more than one position in the same match.');
  }

  // Filter out this draft if editing an existing fixture
  const otherFixtures = existingFixtures.filter((f) => f.id !== draft.id);

  // 6. Duplicate Matchup Check
  if (
    draft.teamAPlayerIds?.length === expectedPlayerCount &&
    draft.teamBPlayerIds?.length === expectedPlayerCount
  ) {
    const draftSideA = new Set(draft.teamAPlayerIds);
    const draftSideB = new Set(draft.teamBPlayerIds);

    const duplicateFixture = otherFixtures.find((f) => {
      if (f.category !== draft.category) return false;
      const fSideA = new Set(f.teamAPlayers.map((p) => p.id));
      const fSideB = new Set(f.teamBPlayers.map((p) => p.id));

      const sameOrder =
        setsAreEqual(draftSideA, fSideA) && setsAreEqual(draftSideB, fSideB);
      const reversedOrder =
        setsAreEqual(draftSideA, fSideB) && setsAreEqual(draftSideB, fSideA);

      return sameOrder || reversedOrder;
    });

    if (duplicateFixture) {
      const conflictMsg = `This exact matchup already exists as Match ${duplicateFixture.id}.`;
      if (!settings.allowRematches) {
        errors.push(`${conflictMsg} Rematches are currently disallowed in scheduling settings.`);
      } else {
        warnings.push(`${conflictMsg} (Rematch permitted by settings).`);
      }
      conflicts.push({
        type: 'duplicate_matchup',
        severity: settings.allowRematches ? 'warning' : 'error',
        message: conflictMsg,
        fixtureId: draft.id || 'draft',
        conflictingFixtureId: duplicateFixture.id,
      });
    }
  }

  // 7. Repeated Partner Combinations in Doubles
  if (draft.category === 'Doubles' && draft.teamAPlayerIds?.length === 2) {
    const pairA = new Set(draft.teamAPlayerIds);
    const otherWithPairA = otherFixtures.filter((f) => {
      if (f.category !== 'Doubles') return false;
      const a = new Set(f.teamAPlayers.map((p) => p.id));
      const b = new Set(f.teamBPlayers.map((p) => p.id));
      return setsAreEqual(pairA, a) || setsAreEqual(pairA, b);
    });

    if (otherWithPairA.length > 0) {
      warnings.push(
        `Team A's partner combination is already paired in ${otherWithPairA.map((f) => f.id).join(', ')}.`
      );
    }
  }

  if (draft.category === 'Doubles' && draft.teamBPlayerIds?.length === 2) {
    const pairB = new Set(draft.teamBPlayerIds);
    const otherWithPairB = otherFixtures.filter((f) => {
      if (f.category !== 'Doubles') return false;
      const a = new Set(f.teamAPlayers.map((p) => p.id));
      const b = new Set(f.teamBPlayers.map((p) => p.id));
      return setsAreEqual(pairB, a) || setsAreEqual(pairB, b);
    });

    if (otherWithPairB.length > 0) {
      warnings.push(
        `Team B's partner combination is already paired in ${otherWithPairB.map((f) => f.id).join(', ')}.`
      );
    }
  }

  // 8. Simultaneous Player & Court Scheduling Conflicts
  if (draft.scheduledDate && draft.scheduledTime) {
    const currentPlayers = new Set(allSelectedPlayerIds);

    otherFixtures.forEach((other) => {
      if (
        other.scheduledDate === draft.scheduledDate &&
        other.scheduledTime === draft.scheduledTime
      ) {
        // Check player overlap
        const otherPlayerIds = [
          ...other.teamAPlayers.map((p) => p.id),
          ...other.teamBPlayers.map((p) => p.id),
        ];
        const sharedPlayers = otherPlayerIds.filter((id) => currentPlayers.has(id));

        if (sharedPlayers.length > 0) {
          const names = sharedPlayers
            .map((id) => {
              for (const team of allocations) {
                const found = team.members.find((m) => m.id === id);
                if (found) return found.name;
              }
              return id;
            })
            .join(', ');

          const msg = `Scheduling Conflict: ${names} is already scheduled in Match ${other.id} on ${draft.scheduledDate} at ${draft.scheduledTime}.`;

          if (!settings.allowSimultaneousMatches) {
            errors.push(msg);
          } else {
            warnings.push(msg);
          }

          conflicts.push({
            type: 'player_simultaneous',
            severity: settings.allowSimultaneousMatches ? 'warning' : 'error',
            message: msg,
            fixtureId: draft.id || 'draft',
            conflictingFixtureId: other.id,
            playerIds: sharedPlayers,
          });
        }

        // Check court overlap
        if (draft.court && other.court && draft.court === other.court) {
          const courtMsg = `Court Conflict: ${draft.court} is already booked for Match ${other.id} on ${draft.scheduledDate} at ${draft.scheduledTime}.`;
          errors.push(courtMsg);
          conflicts.push({
            type: 'court_simultaneous',
            severity: 'error',
            message: courtMsg,
            fixtureId: draft.id || 'draft',
            conflictingFixtureId: other.id,
          });
        }
      }

      // Check player in same round
      if (draft.round && other.round && draft.round === other.round) {
        const otherPlayerIds = [
          ...other.teamAPlayers.map((p) => p.id),
          ...other.teamBPlayers.map((p) => p.id),
        ];
        const sharedInRound = otherPlayerIds.filter((id) => currentPlayers.has(id));
        if (sharedInRound.length > 0 && !settings.allowPlayerMultipleInRound) {
          const roundMsg = `Player in Same Round: Player(s) already participate in Match ${other.id} in ${draft.round}.`;
          warnings.push(roundMsg);
          conflicts.push({
            type: 'player_same_round',
            severity: 'warning',
            message: roundMsg,
            fixtureId: draft.id || 'draft',
            conflictingFixtureId: other.id,
          });
        }
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    conflicts,
  };
}

/**
 * Detect all conflicts across the entire fixture list.
 */
export function detectAllFixtureConflicts(
  fixtures: BadmintonFixture[],
  settings: SchedulingSettings
): Map<string, FixtureConflict[]> {
  const conflictMap = new Map<string, FixtureConflict[]>();

  fixtures.forEach((f) => conflictMap.set(f.id, []));

  for (let i = 0; i < fixtures.length; i++) {
    const fixA = fixtures[i];
    const playersA = [
      ...fixA.teamAPlayers.map((p) => p.id),
      ...fixA.teamBPlayers.map((p) => p.id),
    ];
    const playersASet = new Set(playersA);

    for (let j = i + 1; j < fixtures.length; j++) {
      const fixB = fixtures[j];
      const playersB = [
        ...fixB.teamAPlayers.map((p) => p.id),
        ...fixB.teamBPlayers.map((p) => p.id),
      ];

      // 1. Simultaneous match conflict (same date & time)
      if (
        fixA.scheduledDate &&
        fixB.scheduledDate &&
        fixA.scheduledDate === fixB.scheduledDate &&
        fixA.scheduledTime &&
        fixB.scheduledTime &&
        fixA.scheduledTime === fixB.scheduledTime
      ) {
        // Player overlap
        const shared = playersB.filter((id) => playersASet.has(id));
        if (shared.length > 0) {
          const conflict: FixtureConflict = {
            type: 'player_simultaneous',
            severity: settings.allowSimultaneousMatches ? 'warning' : 'error',
            message: `Simultaneous match conflict between ${fixA.id} and ${fixB.id} at ${fixA.scheduledTime}`,
            fixtureId: fixA.id,
            conflictingFixtureId: fixB.id,
            playerIds: shared,
          };
          conflictMap.get(fixA.id)?.push(conflict);
          conflictMap.get(fixB.id)?.push({ ...conflict, fixtureId: fixB.id, conflictingFixtureId: fixA.id });
        }

        // Court conflict
        if (fixA.court && fixB.court && fixA.court === fixB.court) {
          const courtConflict: FixtureConflict = {
            type: 'court_simultaneous',
            severity: 'error',
            message: `Court conflict: ${fixA.court} is double-booked for ${fixA.id} and ${fixB.id}`,
            fixtureId: fixA.id,
            conflictingFixtureId: fixB.id,
          };
          conflictMap.get(fixA.id)?.push(courtConflict);
          conflictMap.get(fixB.id)?.push({ ...courtConflict, fixtureId: fixB.id, conflictingFixtureId: fixA.id });
        }
      }

      // 2. Duplicate matchup check
      if (fixA.category === fixB.category) {
        const sideA1 = new Set(fixA.teamAPlayers.map((p) => p.id));
        const sideA2 = new Set(fixA.teamBPlayers.map((p) => p.id));
        const sideB1 = new Set(fixB.teamAPlayers.map((p) => p.id));
        const sideB2 = new Set(fixB.teamBPlayers.map((p) => p.id));

        const isMatchupIdentical =
          (setsAreEqual(sideA1, sideB1) && setsAreEqual(sideA2, sideB2)) ||
          (setsAreEqual(sideA1, sideB2) && setsAreEqual(sideA2, sideB1));

        if (isMatchupIdentical) {
          const dupConflict: FixtureConflict = {
            type: 'duplicate_matchup',
            severity: settings.allowRematches ? 'warning' : 'error',
            message: `Duplicate matchup between ${fixA.id} and ${fixB.id}`,
            fixtureId: fixA.id,
            conflictingFixtureId: fixB.id,
          };
          conflictMap.get(fixA.id)?.push(dupConflict);
          conflictMap.get(fixB.id)?.push({ ...dupConflict, fixtureId: fixB.id, conflictingFixtureId: fixA.id });
        }
      }
    }
  }

  return conflictMap;
}

/**
 * Intelligent helper to auto-suggest pairs for a team in Doubles.
 * Evaluates team members and suggests two available players that have not been paired frequently.
 */
export function suggestDoublesPartners(
  teamName: TeamName,
  allocations: TeamAllocation[],
  existingFixtures: BadmintonFixture[]
): [Employee, Employee] | null {
  const team = allocations.find((t) => t.teamName === teamName);
  if (!team || team.members.length < 2) return null;

  // Track how many times each pair has been formed in doubles
  const pairCounts = new Map<string, number>();

  existingFixtures
    .filter((f) => f.category === 'Doubles')
    .forEach((f) => {
      if (f.teamA === teamName && f.teamAPlayers.length === 2) {
        const key = getPairKey(f.teamAPlayers[0].id, f.teamAPlayers[1].id);
        pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
      }
      if (f.teamB === teamName && f.teamBPlayers.length === 2) {
        const key = getPairKey(f.teamBPlayers[0].id, f.teamBPlayers[1].id);
        pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
      }
    });

  // Track individual participation count
  const playerMatchCounts = new Map<string, number>();
  team.members.forEach((m) => playerMatchCounts.set(m.id, 0));

  existingFixtures.forEach((f) => {
    f.teamAPlayers.forEach((p) => {
      if (playerMatchCounts.has(p.id)) {
        playerMatchCounts.set(p.id, (playerMatchCounts.get(p.id) || 0) + 1);
      }
    });
    f.teamBPlayers.forEach((p) => {
      if (playerMatchCounts.has(p.id)) {
        playerMatchCounts.set(p.id, (playerMatchCounts.get(p.id) || 0) + 1);
      }
    });
  });

  // Find candidate pair with lowest pair count and balanced player participation
  let bestPair: [Employee, Employee] | null = null;
  let lowestScore = Infinity;

  const members = [...team.members].sort(
    (a, b) => (playerMatchCounts.get(a.id) || 0) - (playerMatchCounts.get(b.id) || 0)
  );

  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const p1 = members[i];
      const p2 = members[j];
      const pairKey = getPairKey(p1.id, p2.id);
      const pairCount = pairCounts.get(pairKey) || 0;
      const count1 = playerMatchCounts.get(p1.id) || 0;
      const count2 = playerMatchCounts.get(p2.id) || 0;

      // Score: heavily penalize repeated pairing, favor players with fewer matches
      const score = pairCount * 100 + count1 + count2;

      if (score < lowestScore) {
        lowestScore = score;
        bestPair = [p1, p2];
      }
    }
  }

  return bestPair;
}

function getPairKey(id1: string, id2: string): string {
  return [id1, id2].sort().join('::');
}

function setsAreEqual<T>(setA: Set<T>, setB: Set<T>): boolean {
  if (setA.size !== setB.size) return false;
  for (const item of setA) {
    if (!setB.has(item)) return false;
  }
  return true;
}
