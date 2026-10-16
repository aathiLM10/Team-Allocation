import { describe, it, expect } from 'vitest';
import {
  DoublesEmployee,
  generateDoublesPairsForTeam,
  generateAllDoublesPairs,
  shuffleTeamDoublesPairs,
} from '@/lib/badminton/doubles-pairing';
import { createDoublesPairsWorkbook } from '@/lib/export/doubles-excel-export';
import { getRealCompanyParticipants } from '@/lib/badminton/sample-data';
import { TeamName } from '@/types/employee';

describe('Badminton Doubles Pairing Service', () => {
  it('pairs employees randomly within their own team only and never crosses teams', () => {
    const mockEmployees: DoublesEmployee[] = [
      { id: 'R1', name: 'Red 1', team: 'Red Team' },
      { id: 'R2', name: 'Red 2', team: 'Red Team' },
      { id: 'R3', name: 'Red 3', team: 'Red Team' },
      { id: 'R4', name: 'Red 4', team: 'Red Team' },
      { id: 'B1', name: 'Blue 1', team: 'Blue Team' },
      { id: 'B2', name: 'Blue 2', team: 'Blue Team' },
    ];

    const result = generateAllDoublesPairs(mockEmployees, { shuffle: true });

    // Check Red Team
    const redSummary = result.teams['Red Team'];
    expect(redSummary.totalPairs).toBe(2);
    expect(redSummary.unpairedEmployee).toBeNull();
    redSummary.pairs.forEach((pair) => {
      expect(pair.player1.team).toBe('Red Team');
      expect(pair.player2.team).toBe('Red Team');
      expect(pair.displayNames).toBe(`${pair.player1.name} + ${pair.player2.name}`);
    });

    // Check Blue Team
    const blueSummary = result.teams['Blue Team'];
    expect(blueSummary.totalPairs).toBe(1);
    expect(blueSummary.unpairedEmployee).toBeNull();
    blueSummary.pairs.forEach((pair) => {
      expect(pair.player1.team).toBe('Blue Team');
      expect(pair.player2.team).toBe('Blue Team');
    });

    // Check Grey and White
    expect(result.teams['Grey Team'].totalPairs).toBe(0);
    expect(result.teams['White Team'].totalPairs).toBe(0);
  });

  it('correctly identifies and flags unpaired employee when a team has an odd count', () => {
    const oddTeamEmployees: DoublesEmployee[] = [
      { id: 'B1', name: 'Blue 1', team: 'Blue Team' },
      { id: 'B2', name: 'Blue 2', team: 'Blue Team' },
      { id: 'B3', name: 'Blue 3', team: 'Blue Team' },
      { id: 'B4', name: 'Blue 4', team: 'Blue Team' },
      { id: 'B5', name: 'Blue 5', team: 'Blue Team' },
    ];

    const { pairs, unpaired } = generateDoublesPairsForTeam(oddTeamEmployees, 'Blue Team', {
      shuffle: true,
    });

    expect(pairs).toHaveLength(2); // 4 players form 2 pairs
    expect(unpaired).toBeDefined();
    expect(unpaired?.team).toBe('Blue Team');

    // Verify all 5 players are accounted for (4 in pairs, 1 unpaired)
    const pairedIds = new Set<string>();
    pairs.forEach((p) => {
      pairedIds.add(p.player1.id);
      pairedIds.add(p.player2.id);
    });
    expect(pairedIds.size).toBe(4);
    expect(pairedIds.has(unpaired!.id)).toBe(false);
  });

  it('shuffling a single team does not affect other teams', () => {
    const realEmployees = getRealCompanyParticipants('doubles').map((p) => ({
      id: p.id,
      name: p.name,
      team: p.team,
    }));

    const initial = generateAllDoublesPairs(realEmployees, { shuffle: true });

    const blueBefore = initial.teams['Blue Team'].pairs.map((p) => p.displayNames);
    const greyBefore = initial.teams['Grey Team'].pairs.map((p) => p.displayNames);
    const whiteBefore = initial.teams['White Team'].pairs.map((p) => p.displayNames);

    // Shuffle only Red Team
    const updated = shuffleTeamDoublesPairs(initial, 'Red Team', realEmployees);

    // Red Team total pairs remains 6 (13 players)
    expect(updated.teams['Red Team'].totalPairs).toBe(6);

    // Blue, Grey, and White remain completely identical
    const blueAfter = updated.teams['Blue Team'].pairs.map((p) => p.displayNames);
    const greyAfter = updated.teams['Grey Team'].pairs.map((p) => p.displayNames);
    const whiteAfter = updated.teams['White Team'].pairs.map((p) => p.displayNames);

    expect(blueAfter).toEqual(blueBefore);
    expect(greyAfter).toEqual(greyBefore);
    expect(whiteAfter).toEqual(whiteBefore);
  });

  it('generates a valid styled Excel workbook with single sheet Badminton Doubles', async () => {
    const realEmployees = getRealCompanyParticipants('doubles').map((p) => ({
      id: p.id,
      name: p.name,
      team: p.team,
    }));

    const result = generateAllDoublesPairs(realEmployees, { shuffle: true });
    const workbook = await createDoublesPairsWorkbook(result);

    // Must have exactly one worksheet named 'Badminton Doubles'
    expect(workbook.worksheets).toHaveLength(1);
    const sheet = workbook.getWorksheet('Badminton Doubles');
    expect(sheet).toBeDefined();

    // Title at A1
    expect(sheet!.getCell('A1').value).toBe('Badminton Doubles Pairing');

    // Header row at row 4
    expect(sheet!.getCell('A4').value).toBe('S.No');
    expect(sheet!.getCell('B4').value).toBe('Red Team');
    expect(sheet!.getCell('C4').value).toBe('Blue Team');
    expect(sheet!.getCell('D4').value).toBe('Grey Team');
    expect(sheet!.getCell('E4').value).toBe('White Team');

    // Check Row 5 (Pair 1)
    expect(sheet!.getCell('A5').value).toBe(1);
    expect(sheet!.getCell('B5').value).toContain(' + ');
    expect(sheet!.getCell('C5').value).toContain(' + ');
    expect(sheet!.getCell('D5').value).toContain(' + ');
    expect(sheet!.getCell('E5').value).toContain(' + ');

    // Blue has 23 players -> 11 pairs, 1 unpaired
    // Find unpaired section
    let hasUnpairedSection = false;
    sheet!.eachRow((row) => {
      if (String(row.getCell(1).value).includes('Unpaired Employees')) {
        hasUnpairedSection = true;
      }
    });
    expect(hasUnpairedSection).toBe(true);
  });
});
