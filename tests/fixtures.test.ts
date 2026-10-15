import { describe, it, expect } from 'vitest';
import {
  validateDraftFixture,
  detectAllFixtureConflicts,
  suggestDoublesPartners,
  generateNextMatchId,
} from '@/lib/fixtures/fixture-validation';
import {
  generateFixturesCSV,
  generateStyledFixturesWorkbook,
} from '@/lib/export/fixture-export';
import {
  BadmintonFixture,
  FixtureDraft,
  DEFAULT_SCHEDULING_SETTINGS,
  SchedulingSettings,
} from '@/types/fixture';
import { TeamAllocation, Employee } from '@/types/employee';

describe('Badminton Fixture Validation & Management', () => {
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

  const baseSettings: SchedulingSettings = { ...DEFAULT_SCHEDULING_SETTINGS };

  // -------------------------------------------------------------
  // 1. DIFFERENT-TEAM ENFORCEMENT
  // -------------------------------------------------------------
  describe('Different-Team Enforcement', () => {
    it('rejects a fixture where Team A and Team B are identical', () => {
      const draft: FixtureDraft = {
        category: 'Singles',
        teamA: 'Red Team',
        teamAPlayerIds: ['r1'],
        teamB: 'Red Team', // SAME TEAM!
        teamBPlayerIds: ['r2'],
        court: 'Court 1',
        scheduledDate: '2026-10-20',
        scheduledTime: '10:00',
        round: 'Round 1',
        status: 'Scheduled',
      };

      const result = validateDraftFixture(draft, [], mockAllocations, baseSettings);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('different teams'))).toBe(true);
    });

    it('accepts a fixture where Team A and Team B are different teams', () => {
      const draft: FixtureDraft = {
        category: 'Singles',
        teamA: 'Red Team',
        teamAPlayerIds: ['r1'],
        teamB: 'White Team',
        teamBPlayerIds: ['w1'],
        court: 'Court 1',
        scheduledDate: '2026-10-20',
        scheduledTime: '10:00',
        round: 'Round 1',
        status: 'Scheduled',
      };

      const result = validateDraftFixture(draft, [], mockAllocations, baseSettings);
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  // -------------------------------------------------------------
  // 2. SINGLES FIXTURE VALIDATION
  // -------------------------------------------------------------
  describe('Singles Fixture Validation', () => {
    it('requires exactly 1 player per side in Singles', () => {
      // 0 players on Team A
      const draftZero: FixtureDraft = {
        category: 'Singles',
        teamA: 'Red Team',
        teamAPlayerIds: [],
        teamB: 'White Team',
        teamBPlayerIds: ['w1'],
        court: 'Court 1',
        scheduledDate: '2026-10-20',
        scheduledTime: '10:00',
        round: 'Round 1',
        status: 'Scheduled',
      };
      expect(validateDraftFixture(draftZero, [], mockAllocations, baseSettings).isValid).toBe(false);

      // 2 players on Team A (invalid for Singles)
      const draftTwo: FixtureDraft = {
        ...draftZero,
        teamAPlayerIds: ['r1', 'r2'],
      };
      const resTwo = validateDraftFixture(draftTwo, [], mockAllocations, baseSettings);
      expect(resTwo.isValid).toBe(false);
      expect(resTwo.errors.some((e) => e.includes('requires exactly 1 player'))).toBe(true);
    });

    it('rejects a player who does not belong to the selected team', () => {
      const draftForeignPlayer: FixtureDraft = {
        category: 'Singles',
        teamA: 'Red Team',
        teamAPlayerIds: ['w1'], // w1 belongs to White Team, not Red Team!
        teamB: 'White Team',
        teamBPlayerIds: ['w2'],
        court: 'Court 1',
        scheduledDate: '2026-10-20',
        scheduledTime: '10:00',
        round: 'Round 1',
        status: 'Scheduled',
      };

      const result = validateDraftFixture(draftForeignPlayer, [], mockAllocations, baseSettings);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('does not belong to Red Team'))).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // 3. DOUBLES FIXTURE VALIDATION
  // -------------------------------------------------------------
  describe('Doubles Fixture Validation', () => {
    it('requires exactly 2 players per side in Doubles', () => {
      const draftIncomplete: FixtureDraft = {
        category: 'Doubles',
        teamA: 'Red Team',
        teamAPlayerIds: ['r1'], // Only 1 player!
        teamB: 'White Team',
        teamBPlayerIds: ['w1', 'w2'],
        court: 'Court 1',
        scheduledDate: '2026-10-20',
        scheduledTime: '10:00',
        round: 'Round 1',
        status: 'Scheduled',
      };

      const result = validateDraftFixture(draftIncomplete, [], mockAllocations, baseSettings);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('requires exactly 2 players'))).toBe(true);
    });

    it('rejects duplicate player positions in the same fixture', () => {
      // Same player selected as Partner 1 and Partner 2
      const draftSamePlayer: FixtureDraft = {
        category: 'Doubles',
        teamA: 'Red Team',
        teamAPlayerIds: ['r1', 'r1'], // Duplicate!
        teamB: 'White Team',
        teamBPlayerIds: ['w1', 'w2'],
        court: 'Court 1',
        scheduledDate: '2026-10-20',
        scheduledTime: '10:00',
        round: 'Round 1',
        status: 'Scheduled',
      };

      const result = validateDraftFixture(draftSamePlayer, [], mockAllocations, baseSettings);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('cannot occupy more than one position'))).toBe(true);
    });

    it('accepts valid Doubles fixture with 2 distinct partners per side', () => {
      const draftValid: FixtureDraft = {
        category: 'Doubles',
        teamA: 'Red Team',
        teamAPlayerIds: ['r1', 'r2'],
        teamB: 'White Team',
        teamBPlayerIds: ['w1', 'w2'],
        court: 'Court 1',
        scheduledDate: '2026-10-20',
        scheduledTime: '10:00',
        round: 'Round 1',
        status: 'Scheduled',
      };

      const result = validateDraftFixture(draftValid, [], mockAllocations, baseSettings);
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  // -------------------------------------------------------------
  // 4. DUPLICATE MATCHUPS & REMATCH CONTROLS
  // -------------------------------------------------------------
  describe('Duplicate Matchups & Rematches', () => {
    const existingFixture: BadmintonFixture = {
      id: 'M001',
      category: 'Singles',
      teamA: 'Red Team',
      teamAPlayers: [mockRedMembers[0]], // Vignesh
      teamB: 'White Team',
      teamBPlayers: [mockWhiteMembers[0]], // Arun
      court: 'Court 1',
      scheduledDate: '2026-10-20',
      scheduledTime: '10:00',
      round: 'Round 1',
      status: 'Scheduled',
      createdAt: 1000,
      updatedAt: 1000,
    };

    it('detects duplicate matchup when rematch is disallowed', () => {
      const duplicateDraft: FixtureDraft = {
        category: 'Singles',
        teamA: 'White Team',
        teamAPlayerIds: ['w1'], // Arun
        teamB: 'Red Team',
        teamBPlayerIds: ['r1'], // Vignesh (same matchup, flipped sides)
        court: 'Court 2',
        scheduledDate: '2026-10-20',
        scheduledTime: '11:00',
        round: 'Round 2',
        status: 'Scheduled',
      };

      const noRematchSettings = { ...baseSettings, allowRematches: false };
      const result = validateDraftFixture(duplicateDraft, [existingFixture], mockAllocations, noRematchSettings);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Rematches are currently disallowed'))).toBe(true);
    });

    it('allows rematch with warning when allowRematches is enabled', () => {
      const duplicateDraft: FixtureDraft = {
        category: 'Singles',
        teamA: 'White Team',
        teamAPlayerIds: ['w1'],
        teamB: 'Red Team',
        teamBPlayerIds: ['r1'],
        court: 'Court 2',
        scheduledDate: '2026-10-20',
        scheduledTime: '11:00',
        round: 'Round 2',
        status: 'Scheduled',
      };

      const rematchAllowedSettings = { ...baseSettings, allowRematches: true };
      const result = validateDraftFixture(duplicateDraft, [existingFixture], mockAllocations, rematchAllowedSettings);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some((w) => w.includes('Rematch permitted'))).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // 5. SCHEDULING CONFLICTS
  // -------------------------------------------------------------
  describe('Scheduling Conflicts', () => {
    const fixture1: BadmintonFixture = {
      id: 'M001',
      category: 'Singles',
      teamA: 'Red Team',
      teamAPlayers: [mockRedMembers[0]], // r1 (Vignesh)
      teamB: 'White Team',
      teamBPlayers: [mockWhiteMembers[0]], // w1 (Arun)
      court: 'Court 1',
      scheduledDate: '2026-10-20',
      scheduledTime: '10:00',
      round: 'Round 1',
      status: 'Scheduled',
      createdAt: 1000,
      updatedAt: 1000,
    };

    it('flags an error when the same player is scheduled in another match at the same time', () => {
      const overlappingDraft: FixtureDraft = {
        category: 'Singles',
        teamA: 'Red Team',
        teamAPlayerIds: ['r1'], // r1 (Vignesh) again!
        teamB: 'Blue Team',
        teamBPlayerIds: ['b1'],
        court: 'Court 2',
        scheduledDate: '2026-10-20',
        scheduledTime: '10:00', // SAME TIME!
        round: 'Round 1',
        status: 'Scheduled',
      };

      const result = validateDraftFixture(overlappingDraft, [fixture1], mockAllocations, baseSettings);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('already scheduled in Match M001'))).toBe(true);
    });

    it('flags a court conflict when two matches are scheduled on the same court at the same time', () => {
      const courtConflictDraft: FixtureDraft = {
        category: 'Singles',
        teamA: 'Blue Team',
        teamAPlayerIds: ['b1'],
        teamB: 'Grey Team',
        teamBPlayerIds: ['g1'],
        court: 'Court 1', // SAME COURT 1!
        scheduledDate: '2026-10-20',
        scheduledTime: '10:00', // SAME TIME!
        round: 'Round 1',
        status: 'Scheduled',
      };

      const result = validateDraftFixture(courtConflictDraft, [fixture1], mockAllocations, baseSettings);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Court Conflict: Court 1 is already booked'))).toBe(true);
    });

    it('detectAllFixtureConflicts returns mapped conflicts across existing fixture list', () => {
      const fixture2: BadmintonFixture = {
        id: 'M002',
        category: 'Doubles',
        teamA: 'Red Team',
        teamAPlayers: [mockRedMembers[0], mockRedMembers[1]], // r1 overlap at 10:00
        teamB: 'Blue Team',
        teamBPlayers: [mockBlueMembers[0], mockBlueMembers[1]],
        court: 'Court 2',
        scheduledDate: '2026-10-20',
        scheduledTime: '10:00',
        round: 'Round 1',
        status: 'Scheduled',
        createdAt: 2000,
        updatedAt: 2000,
      };

      const conflicts = detectAllFixtureConflicts([fixture1, fixture2], baseSettings);
      expect(conflicts.get('M001')?.length).toBeGreaterThan(0);
      expect(conflicts.get('M002')?.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------
  // 6. AUTO-PAIR PARTNERS & SEQUENTIAL ID
  // -------------------------------------------------------------
  describe('Auto-pair Partners & Sequential Match ID', () => {
    it('suggestDoublesPartners suggests 2 valid team members', () => {
      const pair = suggestDoublesPartners('White Team', mockAllocations, []);
      expect(pair).not.toBeNull();
      expect(pair!.length).toBe(2);
      expect(pair![0].id).not.toBe(pair![1].id);
      expect(mockWhiteMembers.some((m) => m.id === pair![0].id)).toBe(true);
      expect(mockWhiteMembers.some((m) => m.id === pair![1].id)).toBe(true);
    });

    it('generateNextMatchId increments sequentially', () => {
      expect(generateNextMatchId([])).toBe('M001');
      const fixtures = [
        { id: 'M001' } as BadmintonFixture,
        { id: 'M002' } as BadmintonFixture,
        { id: 'M005' } as BadmintonFixture,
      ];
      expect(generateNextMatchId(fixtures)).toBe('M006');
    });
  });

  // -------------------------------------------------------------
  // 7. EXPORT CSV & EXCEL WORKBOOK GENERATION
  // -------------------------------------------------------------
  describe('Export Generation', () => {
    const sampleFixtures: BadmintonFixture[] = [
      {
        id: 'M001',
        category: 'Singles',
        teamA: 'Red Team',
        teamAPlayers: [mockRedMembers[0]],
        teamB: 'White Team',
        teamBPlayers: [mockWhiteMembers[0]],
        court: 'Court 1',
        scheduledDate: '2026-10-20',
        scheduledTime: '10:00',
        round: 'Round 1',
        status: 'Scheduled',
        createdAt: 1000,
        updatedAt: 1000,
      },
      {
        id: 'M002',
        category: 'Doubles',
        teamA: 'Blue Team',
        teamAPlayers: [mockBlueMembers[0], mockBlueMembers[1]],
        teamB: 'Grey Team',
        teamBPlayers: [mockGreyMembers[0], mockGreyMembers[1]],
        court: 'Court 2',
        scheduledDate: '2026-10-20',
        scheduledTime: '10:45',
        round: 'Round 1',
        status: 'Scheduled',
        createdAt: 2000,
        updatedAt: 2000,
      },
    ];

    it('generates valid CSV containing Singles and Doubles records', () => {
      const csv = generateFixturesCSV(sampleFixtures);
      expect(csv).toContain('Match ID');
      expect(csv).toContain('M001');
      expect(csv).toContain('Singles');
      expect(csv).toContain('M002');
      expect(csv).toContain('Doubles');
    });

    it('generates styled Excel workbook with Singles, Doubles, and Summary worksheets', async () => {
      const wb = await generateStyledFixturesWorkbook(sampleFixtures);
      const sheetNames = wb.worksheets.map((ws) => ws.name);
      expect(sheetNames).toContain('Singles');
      expect(sheetNames).toContain('Doubles');
      expect(sheetNames).toContain('Summary');

      // Check Singles sheet rows
      const singlesSheet = wb.getWorksheet('Singles');
      expect(singlesSheet).toBeDefined();
      expect(singlesSheet!.rowCount).toBeGreaterThanOrEqual(3);

      // Check Doubles sheet rows
      const doublesSheet = wb.getWorksheet('Doubles');
      expect(doublesSheet).toBeDefined();
      expect(doublesSheet!.rowCount).toBeGreaterThanOrEqual(3);
    });
  });
});
