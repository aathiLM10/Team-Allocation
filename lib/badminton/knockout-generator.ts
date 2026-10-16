import { Participant } from '@/types/badminton';
import { TeamName, TEAM_NAMES, Employee } from '@/types/employee';
import { MatchCategory, SchedulingSettings } from '@/types/fixture';
import {
  KnockoutBracket,
  KnockoutMatch,
  KnockoutRound,
  KnockoutParticipantEntry,
  KnockoutConfigOptions,
  DoublesPair,
} from '@/types/knockout';
import { getComplementaryMatchup } from './auto-shuffle';

/**
 * Calculates bracket size (next power of 2: 2, 4, 8, 16, 32)
 */
export function calculateBracketSize(participantCount: number): number {
  if (participantCount <= 2) return 2;
  if (participantCount <= 4) return 4;
  if (participantCount <= 8) return 8;
  if (participantCount <= 16) return 16;
  return Math.pow(2, Math.ceil(Math.log2(participantCount)));
}

/**
 * Gets round names working backwards from the Final
 */
export function getKnockoutRoundNames(totalRounds: number): string[] {
  const names: string[] = [];
  for (let r = 0; r < totalRounds; r++) {
    const fromFinal = totalRounds - 1 - r;
    if (fromFinal === 0) names.push('Final');
    else if (fromFinal === 1) names.push('Semifinals');
    else if (fromFinal === 2) names.push('Quarterfinals');
    else if (fromFinal === 3) names.push('Round of 16');
    else if (fromFinal === 4) names.push('Round of 32');
    else names.push(`Round of ${Math.pow(2, fromFinal + 1)}`);
  }
  return names;
}

/**
 * Automatically creates or updates Doubles partner pairs per team.
 * Preserves any pairs marked with `isLocked === true`.
 */
export function generateDoublesPairs(
  participants: Participant[],
  existingPairs: DoublesPair[] = []
): DoublesPair[] {
  const eligibleDoubles = participants.filter((p) => p.doublesRegistered);
  const lockedPairs = existingPairs.filter((p) => p.isLocked);
  const lockedPlayerIds = new Set<string>();

  lockedPairs.forEach((pair) => {
    lockedPlayerIds.add(pair.player1.id);
    lockedPlayerIds.add(pair.player2.id);
  });

  const availableByTeam = new Map<TeamName, Participant[]>();
  TEAM_NAMES.forEach((t) => availableByTeam.set(t, []));

  eligibleDoubles.forEach((p) => {
    if (!lockedPlayerIds.has(p.id) && availableByTeam.has(p.team)) {
      availableByTeam.get(p.team)!.push(p);
    }
  });

  const newPairs: DoublesPair[] = [...lockedPairs];
  let pairCounter = lockedPairs.length + 1;

  TEAM_NAMES.forEach((team) => {
    const pool = availableByTeam.get(team) || [];
    // Sort pool in alphabetical order by name for fair deterministic pairing
    const sorted = [...pool].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

    for (let i = 0; i < sorted.length - 1; i += 2) {
      const p1 = sorted[i];
      const p2 = sorted[i + 1];

      newPairs.push({
        id: `PAIR_${String(pairCounter).padStart(2, '0')}`,
        team,
        player1: {
          id: p1.id,
          name: p1.name,
          gender: (p1.gender || 'Men') as any,
          office: (p1.office || 'Guindy') as any,
        },
        player2: {
          id: p2.id,
          name: p2.name,
          gender: (p2.gender || 'Men') as any,
          office: (p2.office || 'Guindy') as any,
        },
        isLocked: false,
        createdAt: Date.now(),
      });
      pairCounter++;
    }
  });

  return newPairs;
}

export interface DoublesGroupingSummary {
  pairs: DoublesPair[];
  unpairedByTeam: {
    team: TeamName;
    unpaired: Participant[];
  }[];
  totalUnpairedCount: number;
}

/**
 * Calculates pairing summary and detects any unpaired participants per team.
 */
export function getDoublesPairingSummary(
  participants: Participant[],
  doublesPairs: DoublesPair[]
): DoublesGroupingSummary {
  const eligibleDoubles = participants.filter((p) => p.doublesRegistered);
  const pairedPlayerIds = new Set<string>();
  doublesPairs.forEach((pair) => {
    pairedPlayerIds.add(pair.player1.id);
    pairedPlayerIds.add(pair.player2.id);
  });

  const unpairedByTeam = TEAM_NAMES.map((team) => {
    const unpaired = eligibleDoubles.filter(
      (p) => p.team === team && !pairedPlayerIds.has(p.id)
    );
    return { team, unpaired };
  });

  const totalUnpairedCount = unpairedByTeam.reduce(
    (sum, t) => sum + t.unpaired.length,
    0
  );

  return {
    pairs: doublesPairs,
    unpairedByTeam,
    totalUnpairedCount,
  };
}

/**
 * Swaps two partners between two pairs of the same team.
 */
export function swapDoublesPartners(
  pairs: DoublesPair[],
  pairId1: string,
  playerNum1: 1 | 2,
  pairId2: string,
  playerNum2: 1 | 2
): DoublesPair[] {
  const pair1 = pairs.find((p) => p.id === pairId1);
  const pair2 = pairs.find((p) => p.id === pairId2);
  if (!pair1 || !pair2) return pairs;
  if (pair1.team !== pair2.team) {
    throw new Error('Partners can only be swapped between pairs of the same team.');
  }

  const p1 = playerNum1 === 1 ? pair1.player1 : pair1.player2;
  const p2 = playerNum2 === 1 ? pair2.player1 : pair2.player2;

  return pairs.map((pair) => {
    if (pair.id === pairId1) {
      return {
        ...pair,
        player1: playerNum1 === 1 ? p2 : pair.player1,
        player2: playerNum1 === 2 ? p2 : pair.player2,
      };
    }
    if (pair.id === pairId2) {
      return {
        ...pair,
        player1: playerNum2 === 1 ? p1 : pair.player1,
        player2: playerNum2 === 2 ? p1 : pair.player2,
      };
    }
    return pair;
  });
}

/**
 * Replaces a partner in a pair with an unpaired participant from the same team.
 */
export function replaceDoublesPartnerWithUnpaired(
  pairs: DoublesPair[],
  pairId: string,
  playerNum: 1 | 2,
  unpairedParticipant: Participant
): DoublesPair[] {
  const pair = pairs.find((p) => p.id === pairId);
  if (!pair) return pairs;
  if (pair.team !== unpairedParticipant.team) {
    throw new Error('Partners must belong to the same team.');
  }

  const newPlayer = {
    id: unpairedParticipant.id,
    name: unpairedParticipant.name,
    gender: (unpairedParticipant.gender || 'Men') as any,
    office: (unpairedParticipant.office || 'Guindy') as any,
  };

  return pairs.map((p) => {
    if (p.id === pairId) {
      return {
        ...p,
        player1: playerNum === 1 ? newPlayer : p.player1,
        player2: playerNum === 2 ? newPlayer : p.player2,
      };
    }
    return p;
  });
}

/**
 * Prepares participant entries for the bracket.
 * For Singles: 1 player per entry.
 * For Doubles: 2 players per entry (using generated pairs).
 */
export function prepareKnockoutEntries(
  category: MatchCategory,
  participants: Participant[],
  doublesPairs: DoublesPair[] = []
): KnockoutParticipantEntry[] {
  if (category === 'Singles') {
    return participants
      .filter((p) => p.singlesRegistered)
      .map((p, idx) => ({
        id: p.id,
        displayName: p.name,
        team: p.team,
        players: [
          {
            id: p.id,
            name: p.name,
            gender: (p.gender || 'Men') as any,
            office: (p.office || 'Guindy') as any,
          },
        ],
        seed: idx + 1,
      }));
  }

  // Doubles entries
  return doublesPairs.map((pair, idx) => ({
    id: pair.id,
    displayName: `${pair.player1.name} & ${pair.player2.name}`,
    team: pair.team,
    players: [pair.player1, pair.player2],
    seed: idx + 1,
  }));
}

/**
 * Creates a complete Single-Elimination Knockout Bracket with placeholder progression.
 */
export function createKnockoutBracket(
  category: MatchCategory,
  participants: Participant[],
  doublesPairs: DoublesPair[] = [],
  options: KnockoutConfigOptions = { category: 'Singles' },
  settings: SchedulingSettings
): KnockoutBracket {
  const entries = prepareKnockoutEntries(category, participants, doublesPairs);
  const totalParticipants = entries.length;

  if (totalParticipants < 2) {
    throw new Error(
      `Cannot generate a knockout bracket with only ${totalParticipants} participant(s). At least 2 eligible participants are required.`
    );
  }

  const bracketSize = calculateBracketSize(totalParticipants);
  const byesCount = bracketSize - totalParticipants;
  const totalRounds = Math.log2(bracketSize);
  const roundNames = getKnockoutRoundNames(totalRounds);

  // Group participants by team
  const entriesByTeam = new Map<TeamName, KnockoutParticipantEntry[]>();
  TEAM_NAMES.forEach((t) => entriesByTeam.set(t, []));
  entries.forEach((e) => {
    if (entriesByTeam.has(e.team)) {
      entriesByTeam.get(e.team)!.push(e);
    }
  });

  // Arrange first-round seeds respecting initial team pairing
  const { firstTeamA = 'Blue Team', firstTeamB = 'White Team' } = options;
  let compA: TeamName = 'Red Team';
  let compB: TeamName = 'Grey Team';

  try {
    const comp = getComplementaryMatchup(firstTeamA, firstTeamB);
    compA = comp[0];
    compB = comp[1];
  } catch {
    // Default fallback
  }

  // Total matches in Round 1
  const totalMatchesInR1 = bracketSize / 2;
  const matchesWithByes = byesCount;
  const playedMatchesInR1 = totalMatchesInR1 - matchesWithByes;

  const finalSeededSlots: (KnockoutParticipantEntry | null)[] = new Array(bracketSize).fill(null);

  // Sort pool of entries per team in alphabetical order
  const sortAlpha = (a: KnockoutParticipantEntry, b: KnockoutParticipantEntry) =>
    a.displayName.localeCompare(b.displayName) || a.id.localeCompare(b.id);

  const poolA = [...(entriesByTeam.get(firstTeamA) || [])].sort(sortAlpha);
  const poolB = [...(entriesByTeam.get(firstTeamB) || [])].sort(sortAlpha);
  const poolC = [...(entriesByTeam.get(compA) || [])].sort(sortAlpha);
  const poolD = [...(entriesByTeam.get(compB) || [])].sort(sortAlpha);

  const popNext = (list: KnockoutParticipantEntry[]): KnockoutParticipantEntry | null => {
    return list.length > 0 ? list.shift()! : null;
  };

  // Pair played matches alternating between (Team A vs Team B) and (Team C vs Team D) in alphabetical order
  for (let m = 0; m < playedMatchesInR1; m++) {
    if (m % 2 === 0) {
      // Primary matchup: Team A vs Team B
      if (poolA.length > 0 && poolB.length > 0) {
        finalSeededSlots[m * 2] = popNext(poolA);
        finalSeededSlots[m * 2 + 1] = popNext(poolB);
      } else if (poolC.length > 0 && poolD.length > 0) {
        finalSeededSlots[m * 2] = popNext(poolC);
        finalSeededSlots[m * 2 + 1] = popNext(poolD);
      }
    } else {
      // Complementary matchup: Team C vs Team D
      if (poolC.length > 0 && poolD.length > 0) {
        finalSeededSlots[m * 2] = popNext(poolC);
        finalSeededSlots[m * 2 + 1] = popNext(poolD);
      } else if (poolA.length > 0 && poolB.length > 0) {
        finalSeededSlots[m * 2] = popNext(poolA);
        finalSeededSlots[m * 2 + 1] = popNext(poolB);
      }
    }
  }

  // Collect all remaining unplaced entries in alphabetical order
  const usedIds = new Set<string>();
  finalSeededSlots.forEach((s) => {
    if (s) usedIds.add(s.id);
  });
  const unplacedEntries = entries
    .filter((e) => !usedIds.has(e.id))
    .sort(sortAlpha);
  let unplacedIdx = 0;

  // Fill remaining slots in played matches:
  for (let m = 0; m < playedMatchesInR1; m++) {
    if (finalSeededSlots[m * 2] === null && unplacedIdx < unplacedEntries.length) {
      finalSeededSlots[m * 2] = unplacedEntries[unplacedIdx++];
    }
    if (finalSeededSlots[m * 2 + 1] === null && unplacedIdx < unplacedEntries.length) {
      finalSeededSlots[m * 2 + 1] = unplacedEntries[unplacedIdx++];
    }
  }

  // For bye matches (playedMatchesInR1 to totalMatchesInR1 - 1): slot 2m gets participant, slot 2m+1 remains null (BYE)
  for (let m = playedMatchesInR1; m < totalMatchesInR1; m++) {
    if (finalSeededSlots[m * 2] === null && unplacedIdx < unplacedEntries.length) {
      finalSeededSlots[m * 2] = unplacedEntries[unplacedIdx++];
    }
    finalSeededSlots[m * 2 + 1] = null; // BYE
  }

  // Helper for match scheduling time
  const [startH, startM] = (options.startTime || settings.defaultTime || '10:00')
    .split(':')
    .map((s) => parseInt(s, 10) || 0);
  const matchDuration = options.matchDurationMinutes || 40;
  const courts = settings.courtNames.length > 0 ? settings.courtNames : ['Court 1', 'Court 2'];

  let globalMatchCounter = 1;
  const rounds: KnockoutRound[] = [];

  // Generate matches round by round
  for (let r = 0; r < totalRounds; r++) {
    const roundName = roundNames[r];
    const matchesInRound = bracketSize / Math.pow(2, r + 1);
    const roundMatches: KnockoutMatch[] = [];

    for (let m = 0; m < matchesInRound; m++) {
      // Calculate match ID
      let matchId = '';
      if (roundName === 'Final') {
        matchId = 'FINAL';
      } else if (roundName === 'Semifinals') {
        matchId = `SF${m + 1}`;
      } else if (roundName === 'Quarterfinals') {
        matchId = `QF${m + 1}`;
      } else if (roundName === 'Round of 16') {
        matchId = `R16-${m + 1}`;
      } else {
        matchId = `M${String(globalMatchCounter).padStart(3, '0')}`;
      }

      // Next match reference
      let nextMatchId: string | undefined;
      let nextMatchSlot: 'sideA' | 'sideB' | undefined;
      if (r < totalRounds - 1) {
        const nextRoundName = roundNames[r + 1];
        const nextMatchIdx = Math.floor(m / 2);
        nextMatchSlot = m % 2 === 0 ? 'sideA' : 'sideB';

        if (nextRoundName === 'Final') nextMatchId = 'FINAL';
        else if (nextRoundName === 'Semifinals') nextMatchId = `SF${nextMatchIdx + 1}`;
        else if (nextRoundName === 'Quarterfinals') nextMatchId = `QF${nextMatchIdx + 1}`;
        else nextMatchId = `R${r + 2}-${nextMatchIdx + 1}`;
      }

      // Time & Court
      const courtIdx = (m + r) % courts.length;
      const totalMinutesOffset = r * matchDuration * 2 + Math.floor(m / courts.length) * matchDuration;
      const totalMin = startH * 60 + startM + totalMinutesOffset;
      const hour = Math.floor(totalMin / 60) % 24;
      const minute = totalMin % 60;
      const scheduledTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      const scheduledDate = options.startDate || settings.defaultDate;

      if (r === 0) {
        // Round 1: seeded participants
        const slotA = finalSeededSlots[m * 2];
        const slotB = finalSeededSlots[m * 2 + 1];

        const isByeMatch = !slotA || !slotB;
        const winner = slotA && !slotB ? slotA : slotB && !slotA ? slotB : undefined;

        roundMatches.push({
          id: matchId,
          category,
          roundName,
          roundIndex: r,
          matchIndex: m,
          sideA: {
            participant: slotA || undefined,
            placeholderText: slotA ? undefined : 'BYE',
            isWinner: isByeMatch && winner === slotA,
          },
          sideB: {
            participant: slotB || undefined,
            placeholderText: slotB ? undefined : 'BYE',
            isWinner: isByeMatch && winner === slotB,
          },
          winnerId: winner?.id,
          status: isByeMatch ? 'Bye' : 'Scheduled',
          court: courts[courtIdx],
          scheduledDate,
          scheduledTime,
          nextMatchId,
          nextMatchSlot,
          isByeMatch,
          updatedAt: Date.now(),
        });
      } else {
        // Subsequent rounds: placeholders linking back to previous round
        const prevRound = rounds[r - 1];
        const prevMatchA = prevRound.matches[m * 2];
        const prevMatchB = prevRound.matches[m * 2 + 1];

        // If previous match was a Bye, automatically advance the winner into this match!
        const autoAdvA = prevMatchA?.isByeMatch ? prevMatchA.sideA.participant || prevMatchA.sideB.participant : undefined;
        const autoAdvB = prevMatchB?.isByeMatch ? prevMatchB.sideA.participant || prevMatchB.sideB.participant : undefined;

        roundMatches.push({
          id: matchId,
          category,
          roundName,
          roundIndex: r,
          matchIndex: m,
          sideA: {
            participant: autoAdvA,
            sourceMatchId: prevMatchA?.id,
            placeholderText: autoAdvA ? undefined : `Winner of ${prevMatchA?.id}`,
          },
          sideB: {
            participant: autoAdvB,
            sourceMatchId: prevMatchB?.id,
            placeholderText: autoAdvB ? undefined : `Winner of ${prevMatchB?.id}`,
          },
          status: 'Scheduled',
          court: courts[courtIdx],
          scheduledDate,
          scheduledTime,
          nextMatchId,
          nextMatchSlot,
          isByeMatch: false,
          updatedAt: Date.now(),
        });
      }

      globalMatchCounter++;
    }

    rounds.push({
      roundName,
      roundIndex: r,
      matches: roundMatches,
    });
  }

  return {
    id: `KB_${category.toUpperCase()}_${Date.now()}`,
    category,
    totalParticipants,
    bracketSize,
    byesCount,
    rounds,
    isLocked: false,
    hasStarted: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Records a match result, validates participants, and propagates winner to the next round.
 */
export function recordMatchResult(
  bracket: KnockoutBracket,
  matchId: string,
  winnerSide: 'sideA' | 'sideB',
  score: string = '',
  isWalkover: boolean = false
): KnockoutBracket {
  // Deep clone bracket to preserve immutability
  const updatedBracket: KnockoutBracket = JSON.parse(JSON.stringify(bracket));

  let targetMatch: KnockoutMatch | undefined;
  let targetRoundIdx = -1;

  for (let r = 0; r < updatedBracket.rounds.length; r++) {
    const match = updatedBracket.rounds[r].matches.find((m) => m.id === matchId);
    if (match) {
      targetMatch = match;
      targetRoundIdx = r;
      break;
    }
  }

  if (!targetMatch) {
    throw new Error(`Match ${matchId} not found in tournament bracket.`);
  }

  // Validate both participants are present
  const sideA = targetMatch.sideA;
  const sideB = targetMatch.sideB;

  if (!sideA.participant || !sideB.participant) {
    throw new Error(
      `Cannot record result for ${matchId}. Both participants must be determined before recording results.`
    );
  }

  const winningParticipant = winnerSide === 'sideA' ? sideA.participant : sideB.participant;
  const losingParticipant = winnerSide === 'sideA' ? sideB.participant : sideA.participant;

  sideA.isWinner = winnerSide === 'sideA';
  sideB.isWinner = winnerSide === 'sideB';
  sideA.score = score;
  sideB.score = score;

  targetMatch.winnerId = winningParticipant.id;
  targetMatch.status = isWalkover ? 'Walkover' : 'Completed';
  targetMatch.updatedAt = Date.now();
  updatedBracket.hasStarted = true;

  // Propagate to next match
  if (targetMatch.nextMatchId && targetMatch.nextMatchSlot) {
    const nextMatchId = targetMatch.nextMatchId;
    const nextSlot = targetMatch.nextMatchSlot;

    // Find next match in subsequent round
    for (let r = targetRoundIdx + 1; r < updatedBracket.rounds.length; r++) {
      const nextMatch = updatedBracket.rounds[r].matches.find((m) => m.id === nextMatchId);
      if (nextMatch) {
        if (nextSlot === 'sideA') {
          nextMatch.sideA.participant = winningParticipant;
          nextMatch.sideA.placeholderText = undefined;
        } else {
          nextMatch.sideB.participant = winningParticipant;
          nextMatch.sideB.placeholderText = undefined;
        }
        nextMatch.updatedAt = Date.now();
        break;
      }
    }
  }

  // If this was the final match, set the Champion!
  if (targetMatch.roundName === 'Final') {
    updatedBracket.champion = winningParticipant;
  }

  updatedBracket.updatedAt = Date.now();
  return updatedBracket;
}

/**
 * Shuffles bracket player placements while preserving category eligibility and locked doubles pairs.
 */
export function shuffleKnockoutBracket(
  bracket: KnockoutBracket,
  participants: Participant[],
  doublesPairs: DoublesPair[],
  options: KnockoutConfigOptions,
  settings: SchedulingSettings
): KnockoutBracket {
  if (bracket.hasStarted) {
    throw new Error('Cannot shuffle a bracket after matches have started or completed.');
  }

  // Create new bracket with randomized order
  const shuffledParticipants = [...participants].sort(() => Math.random() - 0.5);
  return createKnockoutBracket(
    bracket.category,
    shuffledParticipants,
    doublesPairs,
    options,
    settings
  );
}

/**
 * Resets all scores and progress in a knockout bracket back to initial state.
 */
export function resetKnockoutBracket(bracket: KnockoutBracket): KnockoutBracket {
  const reset: KnockoutBracket = JSON.parse(JSON.stringify(bracket));
  reset.hasStarted = false;
  reset.champion = undefined;

  reset.rounds.forEach((round, rIdx) => {
    round.matches.forEach((match) => {
      if (rIdx === 0) {
        if (!match.isByeMatch) {
          match.status = 'Scheduled';
          match.winnerId = undefined;
          match.sideA.isWinner = false;
          match.sideB.isWinner = false;
          match.sideA.score = undefined;
          match.sideB.score = undefined;
        }
      } else {
        match.status = 'Scheduled';
        match.winnerId = undefined;
        match.sideA.isWinner = false;
        match.sideB.isWinner = false;
        match.sideA.score = undefined;
        match.sideB.score = undefined;
        // Reset non-bye placeholders
        const prevRound = reset.rounds[rIdx - 1];
        const prevA = prevRound.matches[match.matchIndex * 2];
        const prevB = prevRound.matches[match.matchIndex * 2 + 1];

        if (!prevA?.isByeMatch) {
          match.sideA.participant = undefined;
          match.sideA.placeholderText = `Winner of ${prevA?.id}`;
        }
        if (!prevB?.isByeMatch) {
          match.sideB.participant = undefined;
          match.sideB.placeholderText = `Winner of ${prevB?.id}`;
        }
      }
    });
  });

  reset.updatedAt = Date.now();
  return reset;
}
