import {
  Employee,
  Gender,
  TeamAllocation,
  TeamName,
  TEAM_NAMES,
  AllocationDiff,
} from '@/types/employee';
import { calculateTeamStats } from './allocation-metrics';

/**
 * Mulberry32 PRNG for deterministic, reproducible pseudo-random numbers.
 */
export function createPRNG(seed?: number) {
  let s = (seed !== undefined ? seed : Math.floor(Math.random() * 2147483647)) >>> 0;
  return function next(): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Shuffle an array in-place using Fisher-Yates with custom PRNG.
 */
function shuffle<T>(array: T[], prng: () => number): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export interface AllocationOptions {
  seed?: number;
}

/**
 * Balanced Team Allocation Service
 *
 * Priorities:
 * 1. Assign every valid employee exactly once and balance total team sizes (delta <= 1).
 * 2. Balance Guindy and Vandaloor representation across all 4 teams (delta <= 1).
 * 3. Jointly balance gender representation across teams within the office constraints.
 * 4. Randomize among equally balanced options.
 */
export function allocateTeams(
  employees: Employee[],
  options?: AllocationOptions
): TeamAllocation[] {
  const prng = createPRNG(options?.seed);

  // If no employees, return empty teams
  if (employees.length === 0) {
    return TEAM_NAMES.map((name) => {
      const teamKey = name.split(' ')[0].toLowerCase() as 'white' | 'red' | 'blue' | 'grey';
      return {
        teamName: name,
        teamKey,
        members: [],
        stats: calculateTeamStats([]),
      };
    });
  }

  const numTeams = 4;

  const guindyEmployees = employees.filter((e) => e.office === 'Guindy');
  const vandaloorEmployees = employees.filter((e) => e.office === 'Vandaloor');

  const Ng = guindyEmployees.length;
  const Nv = vandaloorEmployees.length;

  // Step 1: Compute target quotas for (Team, Office)
  // Each office is divided: base = floor(N_O / 4), rem = N_O % 4
  const baseG = Math.floor(Ng / numTeams);
  const remG = Ng % numTeams;

  const baseV = Math.floor(Nv / numTeams);
  const remV = Nv % numTeams;

  // Determine which teams get the Guindy remainder and Vandaloor remainder
  // Start with randomized order of team indices [0, 1, 2, 3]
  const teamIndices = shuffle([0, 1, 2, 3], prng);

  const guindyQuotas = [baseG, baseG, baseG, baseG];
  const vandaloorQuotas = [baseV, baseV, baseV, baseV];

  // Give remG bonus slots to the first remG teams in teamIndices
  const gBonusTeams = new Set<number>();
  for (let i = 0; i < remG; i++) {
    guindyQuotas[teamIndices[i]] += 1;
    gBonusTeams.add(teamIndices[i]);
  }

  // To ensure max total size - min total size <= 1:
  // If (remG + remV) <= 4:
  // Vandaloor bonuses should go to teams that DID NOT get Guindy bonuses!
  // If (remG + remV) > 4:
  // All teams get at least 1 bonus, and (remG + remV - 4) teams get both bonuses.
  const nonGBonusTeams = [0, 1, 2, 3].filter((t) => !gBonusTeams.has(t));
  const gBonusList = Array.from(gBonusTeams);

  const vOrderCandidates = [
    ...shuffle(nonGBonusTeams, prng),
    ...shuffle(gBonusList, prng),
  ];

  for (let i = 0; i < remV; i++) {
    vandaloorQuotas[vOrderCandidates[i]] += 1;
  }

  // Verification of mathematical quotas
  // Total size for each team is guindyQuotas[i] + vandaloorQuotas[i]
  const totalQuotas = [0, 1, 2, 3].map((i) => guindyQuotas[i] + vandaloorQuotas[i]);
  const minTotalQ = Math.min(...totalQuotas);
  const maxTotalQ = Math.max(...totalQuotas);
  if (maxTotalQ - minTotalQ > 1) {
    // Fallback safety: adjust Vandaloor bonuses so total delta <= 1
    // (This ensures mathematical guarantee in all edge conditions)
    for (let i = 0; i < numTeams; i++) {
      vandaloorQuotas[i] = baseV;
    }
    const currentTotals = [0, 1, 2, 3].map((i) => guindyQuotas[i] + vandaloorQuotas[i]);
    // Greedily give Vandaloor bonuses to the teams with the smallest current totals
    const sortedByTotal = [0, 1, 2, 3].sort(
      (a, b) => currentTotals[a] - currentTotals[b] || prng() - 0.5
    );
    for (let i = 0; i < remV; i++) {
      vandaloorQuotas[sortedByTotal[i]] += 1;
    }
  }

  // Step 2: Separate employees by office and partition into gender groups
  function assignOfficeEmployees(
    officeEmps: Employee[],
    quotas: number[]
  ): Employee[][] {
    const result: Employee[][] = [[], [], [], []];
    if (officeEmps.length === 0) return result;

    // Group by gender
    const men = officeEmps.filter((e) => e.gender === 'Men');
    const women = officeEmps.filter((e) => e.gender === 'Women');
    const unspecified = officeEmps.filter((e) => e.gender === 'Unspecified');

    // Shuffle each gender group
    const shuffledMen = shuffle(men, prng);
    const shuffledWomen = shuffle(women, prng);
    const shuffledUnspecified = shuffle(unspecified, prng);

    // Process larger gender group first, then other, then unspecified
    const orderedGroups = [
      { gender: 'Men' as Gender, list: shuffledMen },
      { gender: 'Women' as Gender, list: shuffledWomen },
      { gender: 'Unspecified' as Gender, list: shuffledUnspecified },
    ].sort((a, b) => b.list.length - a.list.length);

    orderedGroups.forEach(({ gender, list }) => {
      list.forEach((emp) => {
        // Find best team among teams that still have capacity for this office
        let bestTeam = -1;
        let bestScore = Infinity;

        const candidateTeams = shuffle([0, 1, 2, 3], prng);
        for (const t of candidateTeams) {
          if (result[t].length < quotas[t]) {
            // Count current count of this gender in team t
            const genderCount = result[t].filter((m) => m.gender === gender).length;
            // Also consider team fill ratio
            const fillRatio = result[t].length / (quotas[t] || 1);
            const score = genderCount * 10 + fillRatio + prng() * 0.1;
            if (score < bestScore) {
              bestScore = score;
              bestTeam = t;
            }
          }
        }

        if (bestTeam !== -1) {
          result[bestTeam].push(emp);
        } else {
          // Safety fallback: put in first team with quota room
          for (let t = 0; t < numTeams; t++) {
            if (result[t].length < quotas[t]) {
              result[t].push(emp);
              break;
            }
          }
        }
      });
    });

    return result;
  }

  const assignedGuindy = assignOfficeEmployees(guindyEmployees, guindyQuotas);
  const assignedVandaloor = assignOfficeEmployees(vandaloorEmployees, vandaloorQuotas);

  // Combine into team rosters
  const teamMembers: Employee[][] = [0, 1, 2, 3].map((i) => [
    ...assignedGuindy[i],
    ...assignedVandaloor[i],
  ]);

  // Step 3: Local Refinement / Optimization via Swapping within same office
  // Swapping two members of the SAME OFFICE between two teams NEVER alters the office
  // quota or the team size! It only alters the gender distribution.
  // We use this to minimize the overall variance of men and women across teams.
  function computeGenderVariance(rosters: Employee[][]): number {
    const menCounts = rosters.map((r) => r.filter((e) => e.gender === 'Men').length);
    const womenCounts = rosters.map((r) => r.filter((e) => e.gender === 'Women').length);

    const meanMen = menCounts.reduce((a, b) => a + b, 0) / numTeams;
    const meanWomen = womenCounts.reduce((a, b) => a + b, 0) / numTeams;

    const varMen = menCounts.reduce((sum, c) => sum + (c - meanMen) ** 2, 0);
    const varWomen = womenCounts.reduce((sum, c) => sum + (c - meanWomen) ** 2, 0);

    return varMen + varWomen;
  }

  let currentVar = computeGenderVariance(teamMembers);
  let improved = true;
  let iterations = 0;

  while (improved && iterations < 50) {
    improved = false;
    iterations++;

    // Try all pairs of teams (t1, t2)
    for (let t1 = 0; t1 < numTeams; t1++) {
      for (let t2 = t1 + 1; t2 < numTeams; t2++) {
        // Try all pairs of employees (e1 in t1, e2 in t2)
        for (let i = 0; i < teamMembers[t1].length; i++) {
          for (let j = 0; j < teamMembers[t2].length; j++) {
            const e1 = teamMembers[t1][i];
            const e2 = teamMembers[t2][j];

            // Only swap if they belong to the same office AND have different genders
            if (e1.office === e2.office && e1.gender !== e2.gender) {
              // Try swap
              teamMembers[t1][i] = e2;
              teamMembers[t2][j] = e1;

              const newVar = computeGenderVariance(teamMembers);
              if (newVar < currentVar - 0.001) {
                currentVar = newVar;
                improved = true;
                break;
              } else {
                // Revert swap
                teamMembers[t1][i] = e1;
                teamMembers[t2][j] = e2;
              }
            }
          }
          if (improved) break;
        }
        if (improved) break;
      }
      if (improved) break;
    }
  }

  // Sort members alphabetically within each team for clean presentation
  teamMembers.forEach((roster) => {
    roster.sort((a, b) => a.name.localeCompare(b.name));
  });

  // Construct TeamAllocation objects
  const allocations: TeamAllocation[] = TEAM_NAMES.map((teamName, index) => {
    const teamKey = teamName.split(' ')[0].toLowerCase() as 'white' | 'red' | 'blue' | 'grey';
    const members = teamMembers[index];
    const stats = calculateTeamStats(members);

    return {
      teamName,
      teamKey,
      members,
      stats,
    };
  });

  return allocations;
}

/**
 * Compare previous allocations with new allocations to detect movements.
 */
export function calculateAllocationDiff(
  previousAllocations: TeamAllocation[],
  newAllocations: TeamAllocation[]
): AllocationDiff[] {
  const previousMap = new Map<string, TeamName>();
  previousAllocations.forEach((team) => {
    team.members.forEach((member) => {
      previousMap.set(member.id, team.teamName);
    });
  });

  const diffs: AllocationDiff[] = [];

  newAllocations.forEach((newTeam) => {
    newTeam.members.forEach((member) => {
      const prevTeamName = previousMap.get(member.id);
      if (prevTeamName && prevTeamName !== newTeam.teamName) {
        diffs.push({
          employeeId: member.id,
          employeeName: member.name,
          office: member.office,
          gender: member.gender,
          previousTeam: prevTeamName,
          newTeam: newTeam.teamName,
        });
      }
    });
  });

  return diffs.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
}
