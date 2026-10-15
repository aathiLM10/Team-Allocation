import { describe, it, expect } from 'vitest';
import {
  getComplementaryMatchup,
  generateTeamSchedule,
  autoShuffleFixtures,
  compareShuffles,
} from '@/lib/badminton/auto-shuffle';
import { SAMPLE_PARTICIPANTS } from '@/lib/badminton/sample-data';
import { DEFAULT_SCHEDULING_SETTINGS, BadmintonFixture } from '@/types/fixture';
import { Participant } from '@/types/badminton';
import { TeamName } from '@/types/employee';
import {
  generateFixturesCSV,
  generateParticipantsCSV,
  generateStyledMasterWorkbook,
} from '@/lib/export/fixture-export';

describe('Automatic Badminton Fixture Shuffle System', () => {
  // 1. Team Pairing Logic Tests
  describe('Team Pairing & Complementary Matchups', () => {
    it('correctly determines complementary matchups for all 6 team combinations', () => {
      // 1. Blue vs White -> Red vs Grey
      const comp1 = getComplementaryMatchup('Blue Team', 'White Team');
      expect(comp1.sort()).toEqual(['Grey Team', 'Red Team'].sort());

      // 2. Red vs White -> Blue vs Grey
      const comp2 = getComplementaryMatchup('Red Team', 'White Team');
      expect(comp2.sort()).toEqual(['Blue Team', 'Grey Team'].sort());

      // 3. Blue vs Red -> White vs Grey
      const comp3 = getComplementaryMatchup('Blue Team', 'Red Team');
      expect(comp3.sort()).toEqual(['Grey Team', 'White Team'].sort());

      // 4. White vs Grey -> Red vs Blue
      const comp4 = getComplementaryMatchup('White Team', 'Grey Team');
      expect(comp4.sort()).toEqual(['Blue Team', 'Red Team'].sort());

      // 5. Red vs Grey -> White vs Blue
      const comp5 = getComplementaryMatchup('Red Team', 'Grey Team');
      expect(comp5.sort()).toEqual(['Blue Team', 'White Team'].sort());

      // 6. Blue vs Grey -> Red vs White
      const comp6 = getComplementaryMatchup('Blue Team', 'Grey Team');
      expect(comp6.sort()).toEqual(['Red Team', 'White Team'].sort());
    });

    it('throws an error if identical teams are provided', () => {
      expect(() => getComplementaryMatchup('Blue Team', 'Blue Team')).toThrow();
    });
  });

  // 2. Schedule Generation (One Round, Multiple Rounds, Round Robin)
  describe('Schedule Mode Generation', () => {
    it('generates exactly one round with 2 matches for one-round mode', () => {
      const schedule = generateTeamSchedule('Blue Team', 'White Team', 'one-round');
      expect(schedule).toHaveLength(1);
      expect(schedule[0].matchups).toHaveLength(2);
      expect(schedule[0].matchups[0]).toEqual(['Blue Team', 'White Team']);
      expect(schedule[0].matchups[1].sort()).toEqual(['Grey Team', 'Red Team'].sort());
    });

    it('generates a complete 3-round round robin with 6 unique matchups', () => {
      const schedule = generateTeamSchedule('Blue Team', 'White Team', 'round-robin');
      expect(schedule).toHaveLength(3);

      const allMatchups: string[] = [];
      schedule.forEach((round) => {
        expect(round.matchups).toHaveLength(2);

        // Verify all 4 teams appear exactly once per round
        const teamsInRound = round.matchups.flat();
        expect(teamsInRound).toHaveLength(4);
        expect(new Set(teamsInRound).size).toBe(4);

        round.matchups.forEach(([tA, tB]) => {
          const key = [tA, tB].sort().join(' vs ');
          allMatchups.push(key);
        });
      });

      // All 6 matchups must be unique
      expect(allMatchups).toHaveLength(6);
      expect(new Set(allMatchups).size).toBe(6);
    });

    it('generates specified custom rounds in multiple-rounds mode', () => {
      const schedule = generateTeamSchedule('Red Team', 'Grey Team', 'multiple-rounds', 4);
      expect(schedule).toHaveLength(4);
      schedule.forEach((round) => {
        expect(round.matchups).toHaveLength(2);
        const teamsInRound = round.matchups.flat();
        expect(new Set(teamsInRound).size).toBe(4);
      });
    });
  });

  // 3. Automatic Singles Player Assignment
  describe('Automatic Singles Player Assignment', () => {
    it('assigns only singles-registered players and prevents simultaneous matches', () => {
      const result = autoShuffleFixtures(
        SAMPLE_PARTICIPANTS,
        {
          category: 'Singles',
          firstTeamA: 'Blue Team',
          firstTeamB: 'White Team',
          scheduleMode: 'round-robin',
        },
        DEFAULT_SCHEDULING_SETTINGS
      );

      expect(result.success).toBe(true);
      expect(result.fixtures).toHaveLength(6);

      result.fixtures.forEach((fixture) => {
        expect(fixture.category).toBe('Singles');
        expect(fixture.teamAPlayers).toHaveLength(1);
        expect(fixture.teamBPlayers).toHaveLength(1);

        const playerA = SAMPLE_PARTICIPANTS.find((p) => p.id === fixture.teamAPlayers[0].id);
        const playerB = SAMPLE_PARTICIPANTS.find((p) => p.id === fixture.teamBPlayers[0].id);

        expect(playerA?.singlesRegistered).toBe(true);
        expect(playerB?.singlesRegistered).toBe(true);
        expect(playerA?.team).toBe(fixture.teamA);
        expect(playerB?.team).toBe(fixture.teamB);
      });

      // Verify no player plays in simultaneous matches in the same round
      const rounds = ['Round 1', 'Round 2', 'Round 3'];
      rounds.forEach((roundName) => {
        const roundFixtures = result.fixtures.filter((f) => f.round === roundName);
        const playerIdsInRound = roundFixtures.flatMap((f) => [
          f.teamAPlayers[0].id,
          f.teamBPlayers[0].id,
        ]);
        expect(new Set(playerIdsInRound).size).toBe(playerIdsInRound.length);
      });
    });

    it('fails gracefully and reports an error if a team has 0 singles players', () => {
      const invalidParticipants: Participant[] = SAMPLE_PARTICIPANTS.map((p) => {
        if (p.team === 'Blue Team') {
          return { ...p, singlesRegistered: false };
        }
        return p;
      });

      const result = autoShuffleFixtures(
        invalidParticipants,
        {
          category: 'Singles',
          firstTeamA: 'Blue Team',
          firstTeamB: 'White Team',
          scheduleMode: 'one-round',
        },
        DEFAULT_SCHEDULING_SETTINGS
      );

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.includes('Blue Team has 0 registered Singles players'))).toBe(true);
    });
  });

  // 4. Automatic Doubles Partner Pairing
  describe('Automatic Doubles Partner Pairing', () => {
    it('assigns pairs belonging to the same team and uses only doubles-registered players', () => {
      const result = autoShuffleFixtures(
        SAMPLE_PARTICIPANTS,
        {
          category: 'Doubles',
          firstTeamA: 'Blue Team',
          firstTeamB: 'White Team',
          scheduleMode: 'round-robin',
        },
        DEFAULT_SCHEDULING_SETTINGS
      );

      expect(result.success).toBe(true);
      expect(result.fixtures).toHaveLength(6);

      result.fixtures.forEach((fixture) => {
        expect(fixture.category).toBe('Doubles');
        expect(fixture.teamAPlayers).toHaveLength(2);
        expect(fixture.teamBPlayers).toHaveLength(2);

        // Partners on Side A must belong to Team A
        fixture.teamAPlayers.forEach((player) => {
          const orig = SAMPLE_PARTICIPANTS.find((p) => p.id === player.id);
          expect(orig?.doublesRegistered).toBe(true);
          expect(orig?.team).toBe(fixture.teamA);
        });

        // Partners on Side B must belong to Team B
        fixture.teamBPlayers.forEach((player) => {
          const orig = SAMPLE_PARTICIPANTS.find((p) => p.id === player.id);
          expect(orig?.doublesRegistered).toBe(true);
          expect(orig?.team).toBe(fixture.teamB);
        });

        // No duplicate players within one match
        const allMatchPlayerIds = [
          ...fixture.teamAPlayers.map((p) => p.id),
          ...fixture.teamBPlayers.map((p) => p.id),
        ];
        expect(new Set(allMatchPlayerIds).size).toBe(4);
      });
    });

    it('reports an error if a team has fewer than 2 doubles players', () => {
      const invalidParticipants: Participant[] = SAMPLE_PARTICIPANTS.map((p) => {
        if (p.team === 'Grey Team') {
          return { ...p, doublesRegistered: false };
        }
        return p;
      });

      const result = autoShuffleFixtures(
        invalidParticipants,
        {
          category: 'Doubles',
          firstTeamA: 'Blue Team',
          firstTeamB: 'White Team',
          scheduleMode: 'one-round',
        },
        DEFAULT_SCHEDULING_SETTINGS
      );

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.includes('Grey Team has only 0 registered Doubles player(s)'))).toBe(true);
    });
  });

  // 5. Shuffle Again Movement Summary
  describe('Shuffle Again Behavior', () => {
    it('preserves matchups while generating a comparison log of player changes', () => {
      const shuffle1 = autoShuffleFixtures(
        SAMPLE_PARTICIPANTS,
        {
          category: 'Singles',
          firstTeamA: 'Blue Team',
          firstTeamB: 'White Team',
          scheduleMode: 'round-robin',
        },
        DEFAULT_SCHEDULING_SETTINGS
      );

      const shuffle2 = autoShuffleFixtures(
        SAMPLE_PARTICIPANTS,
        {
          category: 'Singles',
          firstTeamA: 'Blue Team',
          firstTeamB: 'White Team',
          scheduleMode: 'round-robin',
        },
        DEFAULT_SCHEDULING_SETTINGS
      );

      expect(shuffle1.success).toBe(true);
      expect(shuffle2.success).toBe(true);

      const comparison = compareShuffles(shuffle1.fixtures, shuffle2.fixtures);
      expect(typeof comparison.hasChanges).toBe('boolean');
      expect(Array.isArray(comparison.changes)).toBe(true);
    });
  });

  // 6. Exports Validation
  describe('Export Worksheets & CSVs', () => {
    it('generates valid CSV strings with proper headers for auto-generated fixtures', () => {
      const result = autoShuffleFixtures(
        SAMPLE_PARTICIPANTS,
        {
          category: 'Singles',
          firstTeamA: 'Blue Team',
          firstTeamB: 'White Team',
          scheduleMode: 'one-round',
        },
        DEFAULT_SCHEDULING_SETTINGS
      );

      const csv = generateFixturesCSV(result.fixtures, 'Singles');
      expect(csv).toContain('Match ID,Category,Team A,Player A1,Player A2,Team B,Player B1,Player B2,Court,Date,Time,Round,Status,Notes');
      expect(csv).toContain('M001,Singles');
      expect(csv).toContain('M002,Singles');
    });

    it('generates master Excel workbook with 6 worksheets', async () => {
      const result = autoShuffleFixtures(
        SAMPLE_PARTICIPANTS,
        {
          category: 'Doubles',
          firstTeamA: 'Blue Team',
          firstTeamB: 'White Team',
          scheduleMode: 'round-robin',
        },
        DEFAULT_SCHEDULING_SETTINGS
      );

      const workbook = await generateStyledMasterWorkbook(result.fixtures, SAMPLE_PARTICIPANTS, []);
      expect(workbook.worksheets).toHaveLength(6);

      const sheetNames = workbook.worksheets.map((ws) => ws.name);
      expect(sheetNames).toContain('Singles Fixtures');
      expect(sheetNames).toContain('Doubles Fixtures');
      expect(sheetNames).toContain('Singles Participants');
      expect(sheetNames).toContain('Doubles Participants');
      expect(sheetNames).toContain('Participation Summary');
      expect(sheetNames).toContain('Validation Report');
    });
  });
});
