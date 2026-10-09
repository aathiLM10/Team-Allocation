import {
  Employee,
  TeamAllocation,
  AllocationValidationReport,
  TeamStats,
} from '@/types/employee';

export function calculateTeamStats(members: Employee[]): TeamStats {
  let guindy = 0;
  let vandaloor = 0;
  let men = 0;
  let women = 0;
  let unspecified = 0;

  for (const emp of members) {
    if (emp.office === 'Guindy') guindy++;
    else if (emp.office === 'Vandaloor') vandaloor++;

    if (emp.gender === 'Men') men++;
    else if (emp.gender === 'Women') women++;
    else unspecified++;
  }

  return {
    total: members.length,
    guindy,
    vandaloor,
    men,
    women,
    unspecified,
  };
}

export function validateAllocation(
  sourceEmployees: Employee[],
  allocations: TeamAllocation[]
): AllocationValidationReport {
  const totalEmployees = sourceEmployees.length;
  const assignedIds = new Set<string>();
  const duplicateIds = new Set<string>();

  let totalAssigned = 0;

  allocations.forEach((team) => {
    team.members.forEach((member) => {
      totalAssigned++;
      if (assignedIds.has(member.id)) {
        duplicateIds.add(member.id);
      } else {
        assignedIds.add(member.id);
      }
    });
  });

  const unassignedCount = totalEmployees - assignedIds.size;
  const duplicateAssignmentCount = duplicateIds.size;

  // Team sizes
  const sizes = allocations.map((t) => t.members.length);
  const minSize = Math.min(...sizes);
  const maxSize = Math.max(...sizes);
  const maxTeamSizeDelta = maxSize - minSize;
  const isTeamSizeBalanced = maxTeamSizeDelta <= 1;

  // Guindy representation
  const guindyCounts = allocations.map((t) => t.stats.guindy);
  const minGuindy = Math.min(...guindyCounts);
  const maxGuindy = Math.max(...guindyCounts);
  const maxGuindyDelta = maxGuindy - minGuindy;
  const isGuindyBalanced = maxGuindyDelta <= 1;

  // Vandaloor representation
  const vandaloorCounts = allocations.map((t) => t.stats.vandaloor);
  const minVandaloor = Math.min(...vandaloorCounts);
  const maxVandaloor = Math.max(...vandaloorCounts);
  const maxVandaloorDelta = maxVandaloor - minVandaloor;
  const isVandaloorBalanced = maxVandaloorDelta <= 1;

  // Gender representation
  const menCounts = allocations.map((t) => t.stats.men);
  const minMen = Math.min(...menCounts);
  const maxMen = Math.max(...menCounts);
  const maxMenDelta = maxMen - minMen;

  const womenCounts = allocations.map((t) => t.stats.women);
  const minWomen = Math.min(...womenCounts);
  const maxWomen = Math.max(...womenCounts);
  const maxWomenDelta = maxWomen - minWomen;

  const isGenderBalanced = maxMenDelta <= 1 && maxWomenDelta <= 1;
  const isOfficeBalanced = isGuindyBalanced && isVandaloorBalanced;

  const unavoidableImbalances: string[] = [];
  const passedChecks: string[] = [];
  const warnings: string[] = [];

  // Total source counts
  const totalGuindy = sourceEmployees.filter((e) => e.office === 'Guindy').length;
  const totalVandaloor = sourceEmployees.filter((e) => e.office === 'Vandaloor').length;
  const totalMen = sourceEmployees.filter((e) => e.gender === 'Men').length;
  const totalWomen = sourceEmployees.filter((e) => e.gender === 'Women').length;
  const totalUnspecified = sourceEmployees.filter((e) => e.gender === 'Unspecified').length;

  if (totalEmployees % 4 !== 0) {
    unavoidableImbalances.push(
      `Total count (${totalEmployees}) is not divisible by 4. ${totalEmployees % 4} team(s) have 1 extra member.`
    );
  }

  if (totalGuindy % 4 !== 0) {
    unavoidableImbalances.push(
      `Guindy total (${totalGuindy}) is not divisible by 4. Difference of ${totalGuindy % 4} across teams is mathematically optimal.`
    );
  }

  if (totalVandaloor % 4 !== 0) {
    unavoidableImbalances.push(
      `Vandaloor total (${totalVandaloor}) is not divisible by 4. Difference of ${totalVandaloor % 4} across teams is mathematically optimal.`
    );
  }

  if (totalMen % 4 !== 0) {
    unavoidableImbalances.push(
      `Men total (${totalMen}) is not divisible by 4 (${totalMen % 4} remainder).`
    );
  }

  if (totalWomen % 4 !== 0) {
    unavoidableImbalances.push(
      `Women total (${totalWomen}) is not divisible by 4 (${totalWomen % 4} remainder).`
    );
  }

  if (totalUnspecified > 0 && totalUnspecified % 4 !== 0) {
    unavoidableImbalances.push(
      `Unspecified gender total (${totalUnspecified}) is not divisible by 4 (${totalUnspecified % 4} remainder).`
    );
  }

  // Integrity checks
  if (totalAssigned === totalEmployees && unassignedCount === 0) {
    passedChecks.push(`All ${totalEmployees} employees assigned exactly once.`);
  } else {
    warnings.push(
      `Integrity Mismatch: ${unassignedCount} employee(s) unassigned out of ${totalEmployees}.`
    );
  }

  if (duplicateAssignmentCount === 0) {
    passedChecks.push('Zero duplicate team assignments detected.');
  } else {
    warnings.push(
      `Duplicate Error: ${duplicateAssignmentCount} employee(s) assigned to multiple teams.`
    );
  }

  if (isTeamSizeBalanced) {
    passedChecks.push(
      `Team sizes are balanced (delta: ${maxTeamSizeDelta}, sizes: ${sizes.join(', ')}).`
    );
  } else {
    warnings.push(
      `Team sizes deviate by ${maxTeamSizeDelta} (sizes: ${sizes.join(', ')}).`
    );
  }

  if (isGuindyBalanced) {
    passedChecks.push(
      `Guindy representation is balanced across teams (delta: ${maxGuindyDelta}).`
    );
  } else {
    warnings.push(
      `Guindy representation differs by ${maxGuindyDelta} across teams.`
    );
  }

  if (isVandaloorBalanced) {
    passedChecks.push(
      `Vandaloor representation is balanced across teams (delta: ${maxVandaloorDelta}).`
    );
  } else {
    warnings.push(
      `Vandaloor representation differs by ${maxVandaloorDelta} across teams.`
    );
  }

  if (isGenderBalanced) {
    passedChecks.push(
      `Gender representation is balanced (Men delta: ${maxMenDelta}, Women delta: ${maxWomenDelta}).`
    );
  } else {
    warnings.push(
      `Gender representation has variation (Men delta: ${maxMenDelta}, Women delta: ${maxWomenDelta}).`
    );
  }

  const isValid =
    unassignedCount === 0 &&
    duplicateAssignmentCount === 0 &&
    isTeamSizeBalanced &&
    isOfficeBalanced;

  return {
    isValid,
    totalEmployees,
    totalAssigned,
    unassignedCount,
    duplicateAssignmentCount,
    isTeamSizeBalanced,
    maxTeamSizeDelta,
    isOfficeBalanced,
    maxGuindyDelta,
    maxVandaloorDelta,
    isGenderBalanced,
    maxMenDelta,
    maxWomenDelta,
    unavoidableImbalances,
    passedChecks,
    warnings,
  };
}
