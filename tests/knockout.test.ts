import { describe, it, expect } from 'vitest';
import {
  calculateBracketSize,
  getKnockoutRoundNames,
  generateDoublesPairs,
  prepareKnockoutEntries,
  createKnockoutBracket,
  recordMatchResult,
  shuffleKnockoutBracket,
  resetKnockoutBracket,
} from '@/lib/badminton/knockout-generator';
import {
  generateKnockoutBracketCSV,
  generateCompleteKnockoutCSV,
  generateMatchResultsCSV,
  generateChampionSummaryCSV,
  generateMasterKnockoutWorkbook,
} from '@/lib/export/knockout-export';
import { SAMPLE_PARTICIPANTS } from '@/lib/badminton/sample-data';
import { DEFAULT_SCHEDULING_SETTINGS } from '@/types/fixture';
import { Participant } from '@/types/badminton';
import { DoublesPair } from '@/types/knockout';

describe('Knockout Tournament Generator System', () => {
  // 1. Bracket Size and Mathematical Structure Tests
  describe('Bracket Sizing and Byes Handling', () => {
    it('calculates correct bracket sizes for powers of two and non-powers of two', () => {
      expect(calculateBracketSize(2)).toBe(2);
      expect(calculateBracketSize(3)).toBe(4);
      expect(calculateBracketSize(4)).toBe(4);
      expect(calculateBracketSize(5)).toBe(8);
      expect(calculateBracketSize(8)).toBe(8);
      expect(calculateBracketSize(9)).toBe(16);
      expect(calculateBracketSize(16)).toBe(16);
    });

    it('returns appropriate round names based on bracket depth', () => {
      expect(getKnockoutRoundNames(1)).toEqual(['Final']);
      expect(getKnockoutRoundNames(2)).toEqual(['Semifinals', 'Final']);
      expect(getKnockoutRoundNames(3)).toEqual(['Quarterfinals', 'Semifinals', 'Final']);
      expect(getKnockoutRoundNames(4)).toEqual(['Round of 16', 'Quarterfinals', 'Semifinals', 'Final']);
    });

    it('generates a 2-participant bracket (Final only, exactly 1 match)', () => {
      const twoParticipants = SAMPLE_PARTICIPANTS.filter((p) => p.singlesRegistered).slice(0, 2);
      const bracket = createKnockoutBracket('Singles', twoParticipants, [], { category: 'Singles' }, DEFAULT_SCHEDULING_SETTINGS);

      expect(bracket.bracketSize).toBe(2);
      expect(bracket.byesCount).toBe(0);
      expect(bracket.rounds).toHaveLength(1);
      expect(bracket.rounds[0].roundName).toBe('Final');
      expect(bracket.rounds[0].matches).toHaveLength(1);
      expect(bracket.rounds[0].matches[0].sideA.participant?.id).toBe(twoParticipants[0].id);
      expect(bracket.rounds[0].matches[0].sideB.participant?.id).toBe(twoParticipants[1].id);
    });

    it('generates a 3-participant bracket with exactly 1 bye (N - 1 = 2 actual matches played)', () => {
      const threeParticipants = SAMPLE_PARTICIPANTS.filter((p) => p.singlesRegistered).slice(0, 3);
      const bracket = createKnockoutBracket('Singles', threeParticipants, [], { category: 'Singles' }, DEFAULT_SCHEDULING_SETTINGS);

      expect(bracket.bracketSize).toBe(4);
      expect(bracket.byesCount).toBe(1);
      expect(bracket.rounds).toHaveLength(2); // Semifinals and Final
      expect(bracket.rounds[0].matches).toHaveLength(2);

      // One match is a bye match, one is played
      const byeMatch = bracket.rounds[0].matches.find((m) => m.isByeMatch);
      expect(byeMatch).toBeDefined();
      expect(byeMatch?.status).toBe('Bye');

      // The bye participant is automatically advanced to the Final
      const finalMatch = bracket.rounds[1].matches[0];
      const hasAutoAdvanced =
        finalMatch.sideA.participant !== undefined || finalMatch.sideB.participant !== undefined;
      expect(hasAutoAdvanced).toBe(true);
    });

    it('generates a 4-participant bracket (2 Semifinals and 1 Final, 3 total matches)', () => {
      const fourParticipants = SAMPLE_PARTICIPANTS.filter((p) => p.singlesRegistered).slice(0, 4);
      const bracket = createKnockoutBracket('Singles', fourParticipants, [], { category: 'Singles' }, DEFAULT_SCHEDULING_SETTINGS);

      expect(bracket.bracketSize).toBe(4);
      expect(bracket.byesCount).toBe(0);
      expect(bracket.rounds).toHaveLength(2);
      expect(bracket.rounds[0].matches).toHaveLength(2); // SF1, SF2
      expect(bracket.rounds[1].matches).toHaveLength(1); // Final

      // 4 participants = 4 - 1 = 3 matches
      const totalMatches = bracket.rounds.flatMap((r) => r.matches).length;
      expect(totalMatches).toBe(3);
    });

    it('generates a 5-participant bracket with 3 byes (N - 1 = 4 actual matches to determine champion)', () => {
      const fiveParticipants = SAMPLE_PARTICIPANTS.filter((p) => p.singlesRegistered).slice(0, 5);
      const bracket = createKnockoutBracket('Singles', fiveParticipants, [], { category: 'Singles' }, DEFAULT_SCHEDULING_SETTINGS);

      expect(bracket.bracketSize).toBe(8);
      expect(bracket.byesCount).toBe(3);
      expect(bracket.rounds).toHaveLength(3); // QF, SF, Final

      const qfMatches = bracket.rounds[0].matches;
      expect(qfMatches).toHaveLength(4);

      const byeMatches = qfMatches.filter((m) => m.isByeMatch);
      expect(byeMatches).toHaveLength(3);

      const playedMatches = qfMatches.filter((m) => !m.isByeMatch);
      expect(playedMatches).toHaveLength(1);
    });

    it('generates an 8-participant bracket (4 QF, 2 SF, 1 Final = 7 matches)', () => {
      const eightParticipants = SAMPLE_PARTICIPANTS.filter((p) => p.singlesRegistered).slice(0, 8);
      const bracket = createKnockoutBracket('Singles', eightParticipants, [], { category: 'Singles' }, DEFAULT_SCHEDULING_SETTINGS);

      expect(bracket.bracketSize).toBe(8);
      expect(bracket.byesCount).toBe(0);
      expect(bracket.rounds).toHaveLength(3);
      expect(bracket.rounds[0].matches).toHaveLength(4); // QF1-4
      expect(bracket.rounds[1].matches).toHaveLength(2); // SF1-2
      expect(bracket.rounds[2].matches).toHaveLength(1); // Final

      const totalMatches = bracket.rounds.flatMap((r) => r.matches).length;
      expect(totalMatches).toBe(7);
    });

    it('generates a 16-participant bracket (8 R16, 4 QF, 2 SF, 1 Final = 15 matches)', () => {
      const sixteen = SAMPLE_PARTICIPANTS.filter((p) => p.singlesRegistered).slice(0, 16);
      const bracket = createKnockoutBracket('Singles', sixteen, [], { category: 'Singles' }, DEFAULT_SCHEDULING_SETTINGS);

      expect(bracket.bracketSize).toBe(16);
      expect(bracket.byesCount).toBe(0);
      expect(bracket.rounds).toHaveLength(4);
      expect(bracket.rounds[0].matches).toHaveLength(8);
      expect(bracket.rounds[1].matches).toHaveLength(4);
      expect(bracket.rounds[2].matches).toHaveLength(2);
      expect(bracket.rounds[3].matches).toHaveLength(1);

      const totalMatches = bracket.rounds.flatMap((r) => r.matches).length;
      expect(totalMatches).toBe(15);
    });
  });

  // 2. Singles Knockout Eligibility & Structure
  describe('Singles Knockout Validation', () => {
    it('uses only singles-registered players and each player appears only once in round 1', () => {
      const bracket = createKnockoutBracket(
        'Singles',
        SAMPLE_PARTICIPANTS,
        [],
        { category: 'Singles', firstTeamA: 'Blue Team', firstTeamB: 'White Team' },
        DEFAULT_SCHEDULING_SETTINGS
      );

      const round1Matches = bracket.rounds[0].matches;
      const seenPlayerIds = new Set<string>();

      round1Matches.forEach((m) => {
        if (m.sideA.participant) {
          expect(seenPlayerIds.has(m.sideA.participant.id)).toBe(false);
          seenPlayerIds.add(m.sideA.participant.id);
          const orig = SAMPLE_PARTICIPANTS.find((p) => p.id === m.sideA.participant!.id);
          expect(orig?.singlesRegistered).toBe(true);
        }
        if (m.sideB.participant) {
          expect(seenPlayerIds.has(m.sideB.participant.id)).toBe(false);
          seenPlayerIds.add(m.sideB.participant.id);
          const orig = SAMPLE_PARTICIPANTS.find((p) => p.id === m.sideB.participant!.id);
          expect(orig?.singlesRegistered).toBe(true);
        }
      });
    });

    it('places preferred opening matchup teams in Match 1 and complementary teams in Match 2', () => {
      const bracket = createKnockoutBracket(
        'Singles',
        SAMPLE_PARTICIPANTS,
        [],
        { category: 'Singles', firstTeamA: 'Blue Team', firstTeamB: 'White Team' },
        DEFAULT_SCHEDULING_SETTINGS
      );

      const match1 = bracket.rounds[0].matches[0];
      expect(match1.sideA.participant?.team).toBe('Blue Team');
      expect(match1.sideB.participant?.team).toBe('White Team');

      if (bracket.rounds[0].matches.length >= 2) {
        const match2 = bracket.rounds[0].matches[1];
        // Match 2 should feature the complementary teams (Red and Grey)
        const teams = [match2.sideA.participant?.team, match2.sideB.participant?.team];
        expect(teams).toContain('Red Team');
        expect(teams).toContain('Grey Team');
      }
    });
  });

  // 3. Doubles Partner Pairing & Validation
  describe('Doubles Knockout & Pair Management', () => {
    it('creates doubles partner pairs where both partners belong to the same team', () => {
      const pairs = generateDoublesPairs(SAMPLE_PARTICIPANTS, []);
      expect(pairs.length).toBeGreaterThan(0);

      pairs.forEach((pair) => {
        const p1 = SAMPLE_PARTICIPANTS.find((p) => p.id === pair.player1.id);
        const p2 = SAMPLE_PARTICIPANTS.find((p) => p.id === pair.player2.id);

        expect(p1?.doublesRegistered).toBe(true);
        expect(p2?.doublesRegistered).toBe(true);
        expect(p1?.team).toBe(pair.team);
        expect(p2?.team).toBe(pair.team);
      });
    });

    it('preserves approved locked pairs when regenerating remaining pairs', () => {
      const initialPairs = generateDoublesPairs(SAMPLE_PARTICIPANTS, []);
      expect(initialPairs.length).toBeGreaterThan(1);

      // Lock the first pair
      const lockedPair: DoublesPair = { ...initialPairs[0], isLocked: true };
      const updatedList = [lockedPair, ...initialPairs.slice(1)];

      // Regenerate pairs
      const regenerated = generateDoublesPairs(SAMPLE_PARTICIPANTS, updatedList);
      const foundLocked = regenerated.find((p) => p.id === lockedPair.id);

      expect(foundLocked).toBeDefined();
      expect(foundLocked?.isLocked).toBe(true);
      expect(foundLocked?.player1.id).toBe(lockedPair.player1.id);
      expect(foundLocked?.player2.id).toBe(lockedPair.player2.id);
    });

    it('generates a doubles bracket where opponents belong to different teams', () => {
      const pairs = generateDoublesPairs(SAMPLE_PARTICIPANTS, []);
      const bracket = createKnockoutBracket(
        'Doubles',
        SAMPLE_PARTICIPANTS,
        pairs,
        { category: 'Doubles', firstTeamA: 'Red Team', firstTeamB: 'Grey Team' },
        DEFAULT_SCHEDULING_SETTINGS
      );

      const match1 = bracket.rounds[0].matches[0];
      expect(match1.sideA.participant?.team).toBe('Red Team');
      expect(match1.sideB.participant?.team).toBe('Grey Team');
      expect(match1.sideA.participant?.team).not.toBe(match1.sideB.participant?.team);
    });
  });

  // 4. Automatic Progression & Winner Advancement
  describe('Automatic Progression & Champion Declaration', () => {
    it('advances the winner to the correct next-round match and eliminates the loser', () => {
      const fourParticipants = SAMPLE_PARTICIPANTS.filter((p) => p.singlesRegistered).slice(0, 4);
      let bracket = createKnockoutBracket('Singles', fourParticipants, [], { category: 'Singles' }, DEFAULT_SCHEDULING_SETTINGS);

      const sf1 = bracket.rounds[0].matches[0];
      const winningPlayer = sf1.sideA.participant!;
      const losingPlayer = sf1.sideB.participant!;

      // Record SF1 result: Side A wins 21-15, 21-17
      bracket = recordMatchResult(bracket, sf1.id, 'sideA', '21-15, 21-17');

      // Verify SF1 updated
      const updatedSf1 = bracket.rounds[0].matches[0];
      expect(updatedSf1.status).toBe('Completed');
      expect(updatedSf1.winnerId).toBe(winningPlayer.id);
      expect(updatedSf1.sideA.isWinner).toBe(true);
      expect(updatedSf1.sideB.isWinner).toBe(false);

      // Verify Final match received winner into correct slot
      const finalMatch = bracket.rounds[1].matches[0];
      expect(finalMatch.sideA.participant?.id).toBe(winningPlayer.id);
      expect(finalMatch.sideA.participant?.id).not.toBe(losingPlayer.id);
    });

    it('disallows recording results for a match whose participants are not yet determined', () => {
      const eightParticipants = SAMPLE_PARTICIPANTS.filter((p) => p.singlesRegistered).slice(0, 8);
      const bracket = createKnockoutBracket('Singles', eightParticipants, [], { category: 'Singles' }, DEFAULT_SCHEDULING_SETTINGS);

      // Try to record result directly for Final before SFs are played
      const finalMatch = bracket.rounds[2].matches[0];
      expect(() => recordMatchResult(bracket, finalMatch.id, 'sideA', '21-10')).toThrow(
        /Both participants must be determined/
      );
    });

    it('declares the tournament champion when the Final match is completed', () => {
      const fourParticipants = SAMPLE_PARTICIPANTS.filter((p) => p.singlesRegistered).slice(0, 4);
      let bracket = createKnockoutBracket('Singles', fourParticipants, [], { category: 'Singles' }, DEFAULT_SCHEDULING_SETTINGS);

      // Play SF1
      bracket = recordMatchResult(bracket, 'SF1', 'sideA', '21-18, 21-16');
      // Play SF2
      bracket = recordMatchResult(bracket, 'SF2', 'sideB', '21-19, 21-17');

      expect(bracket.champion).toBeUndefined();

      // Play Final
      bracket = recordMatchResult(bracket, 'FINAL', 'sideA', '21-14, 21-19');

      expect(bracket.champion).toBeDefined();
      expect(bracket.champion?.id).toBe(bracket.rounds[1].matches[0].sideA.participant?.id);
    });
  });

  // 5. Reset and Shuffle Bracket Behavior
  describe('Bracket Reset and Shuffle', () => {
    it('resets match scores and progresses back to initial round state', () => {
      const fourParticipants = SAMPLE_PARTICIPANTS.filter((p) => p.singlesRegistered).slice(0, 4);
      let bracket = createKnockoutBracket('Singles', fourParticipants, [], { category: 'Singles' }, DEFAULT_SCHEDULING_SETTINGS);

      bracket = recordMatchResult(bracket, 'SF1', 'sideA', '21-10, 21-12');
      expect(bracket.hasStarted).toBe(true);

      const reset = resetKnockoutBracket(bracket);
      expect(reset.hasStarted).toBe(false);
      expect(reset.champion).toBeUndefined();
      expect(reset.rounds[0].matches[0].status).toBe('Scheduled');
      expect(reset.rounds[0].matches[0].winnerId).toBeUndefined();
    });

    it('prevents shuffling a bracket after matches have started without reset', () => {
      const fourParticipants = SAMPLE_PARTICIPANTS.filter((p) => p.singlesRegistered).slice(0, 4);
      let bracket = createKnockoutBracket('Singles', fourParticipants, [], { category: 'Singles' }, DEFAULT_SCHEDULING_SETTINGS);

      bracket = recordMatchResult(bracket, 'SF1', 'sideA', '21-10, 21-12');
      expect(() =>
        shuffleKnockoutBracket(bracket, fourParticipants, [], { category: 'Singles' }, DEFAULT_SCHEDULING_SETTINGS)
      ).toThrow(/Cannot shuffle a bracket after matches have started/);
    });
  });

  // 6. Knockout Export Verification
  describe('Knockout Exports (CSVs and Master Workbook)', () => {
    it('generates valid Knockout Bracket CSV with placeholders and match IDs', () => {
      const fourParticipants = SAMPLE_PARTICIPANTS.filter((p) => p.singlesRegistered).slice(0, 4);
      const bracket = createKnockoutBracket('Singles', fourParticipants, [], { category: 'Singles' }, DEFAULT_SCHEDULING_SETTINGS);

      const csv = generateKnockoutBracketCSV(bracket);
      expect(csv).toContain('Match ID,Category,Round,Side A,Side B');
      expect(csv).toContain('SF1,Singles,Semifinals');
      expect(csv).toContain('FINAL,Singles,Final');
    });

    it('generates complete bracket CSV and champion summary CSV', () => {
      const fourParticipants = SAMPLE_PARTICIPANTS.filter((p) => p.singlesRegistered).slice(0, 4);
      let bracket = createKnockoutBracket('Singles', fourParticipants, [], { category: 'Singles' }, DEFAULT_SCHEDULING_SETTINGS);

      bracket = recordMatchResult(bracket, 'SF1', 'sideA', '21-15, 21-10');
      bracket = recordMatchResult(bracket, 'SF2', 'sideA', '21-15, 21-10');
      bracket = recordMatchResult(bracket, 'FINAL', 'sideA', '21-15, 21-10');

      const resultsCSV = generateMatchResultsCSV(bracket, null);
      expect(resultsCSV).toContain('SF1,Singles,Semifinals');
      expect(resultsCSV).toContain('FINAL,Singles,Final');

      const champCSV = generateChampionSummaryCSV(bracket, null);
      expect(champCSV).toContain('CHAMPION DECLARED');
      expect(champCSV).toContain(bracket.champion!.displayName);
    });

    it('generates master Excel workbook with 7 worksheets', async () => {
      const fourParticipants = SAMPLE_PARTICIPANTS.filter((p) => p.singlesRegistered).slice(0, 4);
      const pairs = generateDoublesPairs(SAMPLE_PARTICIPANTS, []);

      const singlesB = createKnockoutBracket('Singles', fourParticipants, [], { category: 'Singles' }, DEFAULT_SCHEDULING_SETTINGS);
      const doublesB = createKnockoutBracket('Doubles', SAMPLE_PARTICIPANTS, pairs, { category: 'Doubles' }, DEFAULT_SCHEDULING_SETTINGS);

      const workbook = await generateMasterKnockoutWorkbook(singlesB, doublesB, SAMPLE_PARTICIPANTS, pairs);
      expect(workbook.worksheets).toHaveLength(7);

      const sheetNames = workbook.worksheets.map((ws) => ws.name);
      expect(sheetNames).toContain('Singles Bracket');
      expect(sheetNames).toContain('Doubles Bracket');
      expect(sheetNames).toContain('Singles Participants');
      expect(sheetNames).toContain('Doubles Participants');
      expect(sheetNames).toContain('Doubles Partner Pairs');
      expect(sheetNames).toContain('Match Results');
      expect(sheetNames).toContain('Tournament Summary');
    });
  });
});
