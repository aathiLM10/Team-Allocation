import { describe, it, expect } from 'vitest';
import { allocateTeams, calculateAllocationDiff } from '../lib/allocation/team-allocation';
import { validateAllocation } from '../lib/allocation/allocation-metrics';
import { Employee } from '../types/employee';

function generateEmployees(
  guindyMen: number,
  guindyWomen: number,
  vandaloorMen: number,
  vandaloorWomen: number,
  unspecifiedCount = 0
): Employee[] {
  const employees: Employee[] = [];
  let id = 1;

  for (let i = 0; i < guindyMen; i++) {
    employees.push({
      id: `emp-${id++}`,
      name: `Guindy Man ${i + 1}`,
      gender: 'Men',
      office: 'Guindy',
    });
  }

  for (let i = 0; i < guindyWomen; i++) {
    employees.push({
      id: `emp-${id++}`,
      name: `Guindy Woman ${i + 1}`,
      gender: 'Women',
      office: 'Guindy',
    });
  }

  for (let i = 0; i < vandaloorMen; i++) {
    employees.push({
      id: `emp-${id++}`,
      name: `Vandaloor Man ${i + 1}`,
      gender: 'Men',
      office: 'Vandaloor',
    });
  }

  for (let i = 0; i < vandaloorWomen; i++) {
    employees.push({
      id: `emp-${id++}`,
      name: `Vandaloor Woman ${i + 1}`,
      gender: 'Women',
      office: 'Vandaloor',
    });
  }

  for (let i = 0; i < unspecifiedCount; i++) {
    employees.push({
      id: `emp-${id++}`,
      name: `Unspecified Member ${i + 1}`,
      gender: 'Unspecified',
      office: i % 2 === 0 ? 'Guindy' : 'Vandaloor',
    });
  }

  return employees;
}

describe('Balanced Team Allocation Algorithm', () => {
  it('handles empty dataset gracefully', () => {
    const teams = allocateTeams([]);
    expect(teams).toHaveLength(4);
    teams.forEach((t) => {
      expect(t.members).toHaveLength(0);
      expect(t.stats.total).toBe(0);
    });
  });

  it('handles small datasets with fewer than 4 employees (< 4)', () => {
    // 1 employee
    const emps1 = generateEmployees(1, 0, 0, 0);
    const teams1 = allocateTeams(emps1, { seed: 42 });
    const report1 = validateAllocation(emps1, teams1);
    expect(report1.totalAssigned).toBe(1);
    expect(report1.maxTeamSizeDelta).toBe(1);
    expect(report1.isValid).toBe(true);

    // 2 employees
    const emps2 = generateEmployees(1, 0, 0, 1);
    const teams2 = allocateTeams(emps2, { seed: 42 });
    const report2 = validateAllocation(emps2, teams2);
    expect(report2.totalAssigned).toBe(2);
    expect(report2.maxTeamSizeDelta).toBe(1);
    expect(report2.isValid).toBe(true);

    // 3 employees
    const emps3 = generateEmployees(1, 1, 1, 0);
    const teams3 = allocateTeams(emps3, { seed: 42 });
    const report3 = validateAllocation(emps3, teams3);
    expect(report3.totalAssigned).toBe(3);
    expect(report3.maxTeamSizeDelta).toBe(1);
    expect(report3.isValid).toBe(true);
  });

  it('allocates perfectly equal counts across 4 teams when divisible by 4', () => {
    // 40 Guindy Men, 20 Guindy Women, 20 Vandaloor Men, 20 Vandaloor Women = 100 total (25 per team)
    const employees = generateEmployees(40, 20, 20, 20);
    const teams = allocateTeams(employees, { seed: 100 });
    const report = validateAllocation(employees, teams);

    expect(report.isValid).toBe(true);
    expect(report.totalAssigned).toBe(100);
    expect(report.unassignedCount).toBe(0);
    expect(report.duplicateAssignmentCount).toBe(0);
    expect(report.maxTeamSizeDelta).toBe(0);
    expect(report.maxGuindyDelta).toBe(0); // 60 / 4 = 15 each
    expect(report.maxVandaloorDelta).toBe(0); // 40 / 4 = 10 each
    expect(report.maxMenDelta).toBeLessThanOrEqual(1);
    expect(report.maxWomenDelta).toBeLessThanOrEqual(1);

    teams.forEach((t) => {
      expect(t.stats.total).toBe(25);
      expect(t.stats.guindy).toBe(15);
      expect(t.stats.vandaloor).toBe(10);
    });
  });

  it('allocates unequal totals with team size delta <= 1', () => {
    // 33 Guindy, 18 Vandaloor = 51 total. 51 % 4 = 3 (three teams of 13, one team of 12)
    const employees = generateEmployees(20, 13, 10, 8);
    const teams = allocateTeams(employees, { seed: 1234 });
    const report = validateAllocation(employees, teams);

    expect(report.isValid).toBe(true);
    expect(report.totalAssigned).toBe(51);
    expect(report.maxTeamSizeDelta).toBe(1);
    expect(report.maxGuindyDelta).toBe(1); // 33 / 4 -> three 8s, one 9
    expect(report.maxVandaloorDelta).toBe(1); // 18 / 4 -> two 5s, two 4s
  });

  it('handles skewed office distributions (e.g. 100% Guindy or heavily skewed)', () => {
    // 43 Guindy, 0 Vandaloor
    const employees = generateEmployees(23, 20, 0, 0);
    const teams = allocateTeams(employees, { seed: 99 });
    const report = validateAllocation(employees, teams);

    expect(report.isValid).toBe(true);
    expect(report.maxTeamSizeDelta).toBe(1);
    expect(report.maxGuindyDelta).toBe(1);
    expect(report.maxVandaloorDelta).toBe(0);
  });

  it('handles skewed gender ratios and unspecified gender', () => {
    // 30 Men, 2 Women, 5 Unspecified = 37 total
    const employees = generateEmployees(15, 1, 15, 1, 5);
    const teams = allocateTeams(employees, { seed: 777 });
    const report = validateAllocation(employees, teams);

    expect(report.isValid).toBe(true);
    expect(report.totalAssigned).toBe(37);
    expect(report.maxTeamSizeDelta).toBe(1);
    expect(report.maxGuindyDelta).toBeLessThanOrEqual(1);
    expect(report.maxVandaloorDelta).toBeLessThanOrEqual(1);
    // Women total is 2, so at most 2 teams can have 1 woman and 2 have 0 -> delta is 1
    expect(report.maxWomenDelta).toBe(1);
  });

  it('produces reproducible results with the same random seed', () => {
    const employees = generateEmployees(12, 12, 12, 12);
    const run1 = allocateTeams(employees, { seed: 55555 });
    const run2 = allocateTeams(employees, { seed: 55555 });

    for (let i = 0; i < 4; i++) {
      expect(run1[i].teamName).toBe(run2[i].teamName);
      const names1 = run1[i].members.map((m) => m.id);
      const names2 = run2[i].members.map((m) => m.id);
      expect(names1).toEqual(names2);
    }
  });

  it('calculates differences upon reshuffling (Shuffle Again)', () => {
    const employees = generateEmployees(12, 12, 12, 12);
    const run1 = allocateTeams(employees, { seed: 11111 });
    const run2 = allocateTeams(employees, { seed: 22222 });

    const diffs = calculateAllocationDiff(run1, run2);
    expect(diffs.length).toBeGreaterThan(0);
    diffs.forEach((d) => {
      expect(d.previousTeam).not.toBe(d.newTeam);
    });
  });
});
