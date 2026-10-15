import { describe, it, expect } from 'vitest';
import {
  validateDraftFixture,
  detectAllFixtureConflicts,
  suggestDoublesPartners,
  generateNextMatchId,
} from '@/lib/fixtures/fixture-validation';
import {
  generateFixturesCSV,
  generateParticipantsCSV,
  generateStyledMasterWorkbook,
} from '@/lib/export/fixture-export';
import {
  processParticipantRows,
  parseFlexibleBoolean,
  normalizeTeamName,
} from '@/lib/badminton/participant-import';
import {
  SAMPLE_PARTICIPANTS,
  getSampleFixtures,
  generateCombinedParticipationCSV,
} from '@/lib/badminton/sample-data';
import {
  BadmintonFixture,
  FixtureDraft,
  DEFAULT_SCHEDULING_SETTINGS,
  SchedulingSettings,
} from '@/types/fixture';
import { Participant } from '@/types/badminton';
import { TeamAllocation, Employee } from '@/types/employee';

describe('Badminton Fixture & Participant System', () => {
  const mockWhiteMembers: Employee[] = [
    { id: 'w1', name: 'Arun Kumar', gender: 'Men', office: 'Guindy' },
    { id: 'w2', name: 'Hariharan K', gender: 'Men', office: 'Vandaloor' },
    { id: 'w3', name: 'Divya M', gender: 'Women', office: 'Guindy' },
    { id: 'w4', name: 'Ananya S', gender: 'Women', office: 'Vandaloor' },
  ];

  const mockRedMembers: Employee[] = [
    { id: 'r1', name: 'Vignesh S', gender: 'Men', office: 'Guindy' },
    { id: 'r2', name: 'Suresh R', gender: 'Men', office: 'Vandaloor' },
    { id: 'r3', name: 'Kavitha R', gender: 'Women', office: 'Guindy' },
    { id: 'r4', name: 'Sneha P', gender: 'Women', office: 'Vandaloor' },
  ];

  const mockBlueMembers: Employee[] = [
    { id: 'b1', name: 'Karthik M', gender: 'Men', office: 'Guindy' },
    { id: 'b2', name: 'Naveen Kumar', gender: 'Men', office: 'Vandaloor' },
  ];

  const mockGreyMembers: Employee[] = [
    { id: 'g1', name: 'Praveen T', gender: 'Men', office: 'Guindy' },
    { id: 'g2', name: 'Elangovan G', gender: 'Men', office: 'Vandaloor' },
  ];

  const mockAllocations: TeamAllocation[] = [
    {
      teamName: 'White Team',
      teamKey: 'white',
      members: mockWhiteMembers,
      stats: { total: 4, guindy: 2, vandaloor: 2, men: 2, women: 2, unspecified: 0 },
    },
    {
      teamName: 'Red Team',
      teamKey: 'red',
      members: mockRedMembers,
      stats: { total: 4, guindy: 2, vandaloor: 2, men: 2, women: 2, unspecified: 0 },
    },
    {
      teamName: 'Blue Team',
      teamKey: 'blue',
      members: mockBlueMembers,
      stats: { total: 2, guindy: 1, vandaloor: 1, men: 2, women: 0, unspecified: 0 },
    },
    {
      teamName: 'Grey Team',
      teamKey: 'grey',
      members: mockGreyMembers,
      stats: { total: 2, guindy: 1, vandaloor: 1, men: 2, women: 0, unspecified: 0 },
    },
  ];

  const mockParticipants: Participant[] = [
    // Red: r1 (Both), r2 (Doubles only), r3 (Singles only), r4 (Neither)
    { id: 'r1', name: 'Vignesh S', team: 'Red Team', office: 'Guindy', singlesRegistered: true, doublesRegistered: true },
    { id: 'r2', name: 'Suresh R', team: 'Red Team', office: 'Vandaloor', singlesRegistered: false, doublesRegistered: true },
    { id: 'r3', name: 'Kavitha R', team: 'Red Team', office: 'Guindy', singlesRegistered: true, doublesRegistered: false },
    { id: 'r4', name: 'Sneha P', team: 'Red Team', office: 'Vandaloor', singlesRegistered: false, doublesRegistered: false },

    // White: w1 (Both), w2 (Doubles only), w3 (Singles only)
    { id: 'w1', name: 'Arun Kumar', team: 'White Team', office: 'Vandaloor', singlesRegistered: true, doublesRegistered: true },
    { id: 'w2', name: 'Hariharan K', team: 'White Team', office: 'Guindy', singlesRegistered: false, doublesRegistered: true },
    { id: 'w3', name: 'Divya M', team: 'White Team', office: 'Vandaloor', singlesRegistered: true, doublesRegistered: false },

    // Blue: b1 (Singles only), b2 (Neither)
    { id: 'b1', name: 'Karthik M', team: 'Blue Team', office: 'Guindy', singlesRegistered: true, doublesRegistered: false },
    { id: 'b2', name: 'Naveen Kumar', team: 'Blue Team', office: 'Vandaloor', singlesRegistered: false, doublesRegistered: false },
  ];

  const baseSettings: SchedulingSettings = { ...DEFAULT_SCHEDULING_SETTINGS };

  // -------------------------------------------------------------
  // 1. INDEPENDENT CATEGORY REGISTRATION VALIDATION
  // -------------------------------------------------------------
  describe('Independent Singles & Doubles Registration', () => {
    it('allows a Singles-registered player in a Singles fixture', () => {
      const draft: FixtureDraft = {
        category: 'Singles',
        teamA: 'Red Team',
        teamAPlayerIds: ['r1'], // r1 is Singles registered
        teamB: 'White Team',
        teamBPlayerIds: ['w1'], // w1 is Singles registered
        court: 'Court 1',
        scheduledDate: '2026-10-25',
        scheduledTime: '10:00',
        round: 'Round 1',
        status: 'Scheduled',
      };

      const result = validateDraftFixture(draft, [], mockAllocations, baseSettings, mockParticipants);
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('rejects a Doubles-only player from participating in a Singles fixture', () => {
      const draft: FixtureDraft = {
        category: 'Singles',
        teamA: 'Red Team',
        teamAPlayerIds: ['r2'], // r2 is Doubles only!
        teamB: 'White Team',
        teamBPlayerIds: ['w1'],
        court: 'Court 1',
        scheduledDate: '2026-10-25',
        scheduledTime: '10:00',
        round: 'Round 1',
        status: 'Scheduled',
      };

      const result = validateDraftFixture(draft, [], mockAllocations, baseSettings, mockParticipants);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('not registered for Singles'))).toBe(true);
    });

    it('rejects a Singles-only player from participating in a Doubles fixture', () => {
      const draft: FixtureDraft = {
        category: 'Doubles',
        teamA: 'Red Team',
        teamAPlayerIds: ['r1', 'r3'], // r3 is Singles only!
        teamB: 'White Team',
        teamBPlayerIds: ['w1', 'w2'],
        court: 'Court 1',
        scheduledDate: '2026-10-25',
        scheduledTime: '10:00',
        round: 'Round 1',
        status: 'Scheduled',
      };

      const result = validateDraftFixture(draft, [], mockAllocations, baseSettings, mockParticipants);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('not registered for Doubles'))).toBe(true);
    });

    it('rejects a player who is registered for Neither category', () => {
      const draft: FixtureDraft = {
        category: 'Singles',
        teamA: 'Red Team',
        teamAPlayerIds: ['r4'], // r4 is Neither!
        teamB: 'White Team',
        teamBPlayerIds: ['w1'],
        court: 'Court 1',
        scheduledDate: '2026-10-25',
        scheduledTime: '10:00',
        round: 'Round 1',
        status: 'Scheduled',
      };

      const result = validateDraftFixture(draft, [], mockAllocations, baseSettings, mockParticipants);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('not registered for Singles'))).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // 2. COMMON TOURNAMENT: NO OFFICE RESTRICTIONS
  // -------------------------------------------------------------
  describe('Common Tournament: Cross-Office Partnerships & Opponents', () => {
    it('accepts cross-office partners from the same team (Guindy + Vandaloor)', () => {
      // r1 (Guindy) and r2 (Vandaloor) are both Red Team
      const draft: FixtureDraft = {
        category: 'Doubles',
        teamA: 'Red Team',
        teamAPlayerIds: ['r1', 'r2'], // Cross-office partnership!
        teamB: 'White Team',
        teamBPlayerIds: ['w1', 'w2'], // Cross-office partnership!
        court: 'Court 1',
        scheduledDate: '2026-10-25',
        scheduledTime: '10:00',
        round: 'Round 1',
        status: 'Scheduled',
      };

      const result = validateDraftFixture(draft, [], mockAllocations, baseSettings, mockParticipants);
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('accepts cross-office opponents (Guindy vs Vandaloor)', () => {
      // r1 (Guindy) vs w1 (Vandaloor)
      const draft: FixtureDraft = {
        category: 'Singles',
        teamA: 'Red Team',
        teamAPlayerIds: ['r1'],
        teamB: 'White Team',
        teamBPlayerIds: ['w1'],
        court: 'Court 1',
        scheduledDate: '2026-10-25',
        scheduledTime: '10:00',
        round: 'Round 1',
        status: 'Scheduled',
      };

      const result = validateDraftFixture(draft, [], mockAllocations, baseSettings, mockParticipants);
      expect(result.isValid).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // 3. INSUFFICIENT PARTICIPANTS & AUTO-PAIR
  // -------------------------------------------------------------
  describe('Insufficient Doubles Participants & Auto-pairing', () => {
    it('returns null and reports insufficient participants when a team has < 2 Doubles players', () => {
      // Blue Team in mockParticipants only has b1 (Singles only) and b2 (Neither) -> 0 doubles players
      const pair = suggestDoublesPartners('Blue Team', mockAllocations, [], mockParticipants);
      expect(pair).toBeNull();
    });

    it('suggests a valid pair when a team has at least 2 Doubles players', () => {
      // Red Team has r1 and r2 registered for Doubles
      const pair = suggestDoublesPartners('Red Team', mockAllocations, [], mockParticipants);
      expect(pair).not.toBeNull();
      expect(pair!.length).toBe(2);
      expect(pair![0].id).not.toBe(pair![1].id);
    });
  });

  // -------------------------------------------------------------
  // 4. DUPLICATE IDS VS DUPLICATE NAMES
  // -------------------------------------------------------------
  describe('Identity Handling: Duplicate IDs vs Duplicate Names', () => {
    it('rejects duplicate Player IDs within the imported file', () => {
      const rawRows = [
        { 'Player ID': 'EMP001', 'Player Name': 'Vignesh S', Team: 'Red', Singles: 'Yes', Doubles: 'Yes' },
        { 'Player ID': 'EMP001', 'Player Name': 'Different Person', Team: 'Blue', Singles: 'Yes', Doubles: 'No' },
      ];

      const { result } = processParticipantRows(rawRows, 'combined');
      expect(result.validRows).toBe(1);
      expect(result.errorRows).toBe(1);
      expect(result.errors.some((e) => e.message.includes('appears multiple times'))).toBe(true);
    });

    it('accepts duplicate display names when Player IDs are distinct', () => {
      const rawRows = [
        { 'Player ID': 'EMP001', 'Player Name': 'Vignesh S', Team: 'Red', Singles: 'Yes', Doubles: 'Yes' },
        { 'Player ID': 'EMP015', 'Player Name': 'Vignesh S', Team: 'Blue', Singles: 'Yes', Doubles: 'No' },
      ];

      const { result } = processParticipantRows(rawRows, 'combined');
      expect(result.validRows).toBe(2);
      expect(result.errorRows).toBe(0);
      expect(result.participants.length).toBe(2);
      expect(result.participants[0].id).toBe('EMP001');
      expect(result.participants[1].id).toBe('EMP015');
      // Warns about duplicate name without merging
      expect(result.warnings.some((w) => w.message.includes('Duplicate name "Vignesh S"'))).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // 5. IMPORT MODES & BOOLEAN PARSING
  // -------------------------------------------------------------
  describe('Import Modes & Flexible Boolean Parsing', () => {
    it('parses flexible boolean formats accurately', () => {
      expect(parseFlexibleBoolean('Yes')).toBe(true);
      expect(parseFlexibleBoolean('Y')).toBe(true);
      expect(parseFlexibleBoolean('true')).toBe(true);
      expect(parseFlexibleBoolean('1')).toBe(true);

      expect(parseFlexibleBoolean('No')).toBe(false);
      expect(parseFlexibleBoolean('N')).toBe(false);
      expect(parseFlexibleBoolean('false')).toBe(false);
      expect(parseFlexibleBoolean('0')).toBe(false);

      expect(parseFlexibleBoolean('')).toBeNull();
      expect(parseFlexibleBoolean(null)).toBeNull();
    });

    it('flags an error when Singles or Doubles is left blank in combined file', () => {
      const rawRows = [
        { 'Player ID': 'EMP001', 'Player Name': 'Arun', Team: 'Red', Singles: '', Doubles: 'Yes' },
      ];
      const { result } = processParticipantRows(rawRows, 'combined');
      expect(result.errorRows).toBe(1);
      expect(result.errors.some((e) => e.message.includes('cannot be blank'))).toBe(true);
    });

    it('handles singles-only import mode automatically', () => {
      const rawRows = [
        { 'Player ID': 'EMP001', 'Player Name': 'Arun', Team: 'Red Team' },
      ];
      const { result } = processParticipantRows(rawRows, 'singles-only');
      expect(result.validRows).toBe(1);
      expect(result.participants[0].singlesRegistered).toBe(true);
      expect(result.participants[0].doublesRegistered).toBe(false);
    });

    it('handles doubles-only import mode automatically', () => {
      const rawRows = [
        { 'Player ID': 'EMP002', 'Player Name': 'Suresh', Team: 'White Team' },
      ];
      const { result } = processParticipantRows(rawRows, 'doubles-only');
      expect(result.validRows).toBe(1);
      expect(result.participants[0].singlesRegistered).toBe(false);
      expect(result.participants[0].doublesRegistered).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // 6. SAMPLE DATA & EXPORT INTEGRITY
  // -------------------------------------------------------------
  describe('Sample Data & 6-Sheet Master Excel Export', () => {
    it('SAMPLE_PARTICIPANTS contains at least 24 participants across 4 teams with mixed registrations', () => {
      expect(SAMPLE_PARTICIPANTS.length).toBeGreaterThanOrEqual(24);
      const teams = new Set(SAMPLE_PARTICIPANTS.map((p) => p.team));
      expect(teams.size).toBe(4);

      const singlesOnly = SAMPLE_PARTICIPANTS.filter((p) => p.singlesRegistered && !p.doublesRegistered);
      const doublesOnly = SAMPLE_PARTICIPANTS.filter((p) => !p.singlesRegistered && p.doublesRegistered);
      const both = SAMPLE_PARTICIPANTS.filter((p) => p.singlesRegistered && p.doublesRegistered);
      const neither = SAMPLE_PARTICIPANTS.filter((p) => !p.singlesRegistered && !p.doublesRegistered);

      expect(singlesOnly.length).toBeGreaterThan(0);
      expect(doublesOnly.length).toBeGreaterThan(0);
      expect(both.length).toBeGreaterThan(0);
      expect(neither.length).toBeGreaterThan(0);
    });

    it('generates all 6 worksheets in Master Excel export', async () => {
      const sampleFixtures = getSampleFixtures(SAMPLE_PARTICIPANTS);
      const wb = await generateStyledMasterWorkbook(sampleFixtures, SAMPLE_PARTICIPANTS, []);

      const sheetNames = wb.worksheets.map((s) => s.name);
      expect(sheetNames).toContain('Singles Fixtures');
      expect(sheetNames).toContain('Doubles Fixtures');
      expect(sheetNames).toContain('Singles Participants');
      expect(sheetNames).toContain('Doubles Participants');
      expect(sheetNames).toContain('Participation Summary');
      expect(sheetNames).toContain('Validation Report');
    });

    it('generates valid participant CSV text', () => {
      const csv = generateParticipantsCSV(SAMPLE_PARTICIPANTS, 'Singles');
      expect(csv).toContain('Player ID,Player Name,Team,Office,Singles,Doubles,Gender');
      expect(csv).toContain('EMP001');
    });
  });
});
