import { Participant } from '@/types/badminton';
import { TeamName } from '@/types/employee';

/**
 * 28 Comprehensive fictional sample participants across White, Red, Blue, and Grey teams.
 * Meets all criteria:
 * - Mixed Guindy and Vandaloor offices.
 * - Independent Singles, Doubles, Both, and Neither registrations.
 * - Distinct player IDs with intentional duplicate display names to test identity handling.
 * - Ample Doubles-eligible players on all four teams to allow rich match combinations.
 */
export const SAMPLE_PARTICIPANTS: Participant[] = [
  // RED TEAM (7 Players: 4 Both, 2 Singles-only, 1 Doubles-only)
  {
    id: 'EMP001',
    name: 'Vignesh S',
    team: 'Red Team',
    office: 'Guindy',
    gender: 'Men',
    singlesRegistered: true,
    doublesRegistered: true,
    source: 'sample',
  },
  {
    id: 'EMP002',
    name: 'Suresh R',
    team: 'Red Team',
    office: 'Vandaloor',
    gender: 'Men',
    singlesRegistered: false,
    doublesRegistered: true,
    source: 'sample',
  },
  {
    id: 'EMP003',
    name: 'Ravi P',
    team: 'Red Team',
    office: 'Guindy',
    gender: 'Men',
    singlesRegistered: true,
    doublesRegistered: false,
    source: 'sample',
  },
  {
    id: 'EMP004',
    name: 'Kavitha R',
    team: 'Red Team',
    office: 'Vandaloor',
    gender: 'Women',
    singlesRegistered: true,
    doublesRegistered: true,
    source: 'sample',
  },
  {
    id: 'EMP005',
    name: 'Sneha P',
    team: 'Red Team',
    office: 'Guindy',
    gender: 'Women',
    singlesRegistered: true,
    doublesRegistered: true,
    source: 'sample',
  },
  {
    id: 'EMP006',
    name: 'Dinesh Kumar',
    team: 'Red Team',
    office: 'Vandaloor',
    gender: 'Men',
    singlesRegistered: true,
    doublesRegistered: false,
    source: 'sample',
  },
  {
    id: 'EMP007',
    name: 'Manojkumar B',
    team: 'Red Team',
    office: 'Guindy',
    gender: 'Men',
    singlesRegistered: true,
    doublesRegistered: true,
    source: 'sample',
  },

  // WHITE TEAM (7 Players: 4 Both, 1 Singles-only, 1 Doubles-only, 1 Neither)
  {
    id: 'EMP008',
    name: 'Arun Kumar',
    team: 'White Team',
    office: 'Vandaloor',
    gender: 'Men',
    singlesRegistered: true,
    doublesRegistered: false,
    source: 'sample',
  },
  {
    id: 'EMP009',
    name: 'Hariharan K',
    team: 'White Team',
    office: 'Guindy',
    gender: 'Men',
    singlesRegistered: false,
    doublesRegistered: true,
    source: 'sample',
  },
  {
    id: 'EMP010',
    name: 'Divya M',
    team: 'White Team',
    office: 'Vandaloor',
    gender: 'Women',
    singlesRegistered: true,
    doublesRegistered: true,
    source: 'sample',
  },
  {
    id: 'EMP011',
    name: 'Ananya S',
    team: 'White Team',
    office: 'Guindy',
    gender: 'Women',
    singlesRegistered: true,
    doublesRegistered: true,
    source: 'sample',
  },
  {
    id: 'EMP012',
    name: 'Srivatsa S M',
    team: 'White Team',
    office: 'Vandaloor',
    gender: 'Men',
    singlesRegistered: true,
    doublesRegistered: true,
    source: 'sample',
  },
  {
    id: 'EMP013',
    name: 'Pillaiyarsamy T',
    team: 'White Team',
    office: 'Guindy',
    gender: 'Men',
    singlesRegistered: true,
    doublesRegistered: true,
    source: 'sample',
  },
  {
    id: 'EMP014',
    name: 'Kumar S', // Unregistered employee example
    team: 'White Team',
    office: 'Guindy',
    gender: 'Men',
    singlesRegistered: false,
    doublesRegistered: false,
    source: 'sample',
  },

  // BLUE TEAM (7 Players: 4 Both, 2 Singles-only, 1 Doubles-only)
  {
    id: 'EMP015',
    name: 'Karthik M',
    team: 'Blue Team',
    office: 'Guindy',
    gender: 'Men',
    singlesRegistered: true,
    doublesRegistered: false,
    source: 'sample',
  },
  {
    id: 'EMP016',
    name: 'Naveen Kumar',
    team: 'Blue Team',
    office: 'Vandaloor',
    gender: 'Men',
    singlesRegistered: false,
    doublesRegistered: true,
    source: 'sample',
  },
  {
    id: 'EMP017',
    name: 'Elangovan G',
    team: 'Blue Team',
    office: 'Guindy',
    gender: 'Men',
    singlesRegistered: true,
    doublesRegistered: true,
    source: 'sample',
  },
  {
    id: 'EMP018',
    name: 'Sathiyanesan C',
    team: 'Blue Team',
    office: 'Vandaloor',
    gender: 'Men',
    singlesRegistered: true,
    doublesRegistered: true,
    source: 'sample',
  },
  {
    id: 'EMP019',
    name: 'Pooja R',
    team: 'Blue Team',
    office: 'Guindy',
    gender: 'Women',
    singlesRegistered: true,
    doublesRegistered: true,
    source: 'sample',
  },
  {
    id: 'EMP020',
    name: 'Deepa V',
    team: 'Blue Team',
    office: 'Vandaloor',
    gender: 'Women',
    singlesRegistered: true,
    doublesRegistered: true,
    source: 'sample',
  },
  {
    id: 'EMP021',
    name: 'Vignesh S', // Intentional duplicate name with distinct ID (EMP021 vs EMP001)!
    team: 'Blue Team',
    office: 'Guindy',
    gender: 'Men',
    singlesRegistered: true,
    doublesRegistered: false,
    source: 'sample',
  },

  // GREY TEAM (7 Players: 4 Both, 1 Singles-only, 1 Doubles-only, 1 Neither)
  {
    id: 'EMP022',
    name: 'Praveen T',
    team: 'Grey Team',
    office: 'Vandaloor',
    gender: 'Men',
    singlesRegistered: true,
    doublesRegistered: true,
    source: 'sample',
  },
  {
    id: 'EMP023',
    name: 'Sanjay V',
    team: 'Grey Team',
    office: 'Guindy',
    gender: 'Men',
    singlesRegistered: false,
    doublesRegistered: true,
    source: 'sample',
  },
  {
    id: 'EMP024',
    name: 'Sudhakar Durai',
    team: 'Grey Team',
    office: 'Vandaloor',
    gender: 'Men',
    singlesRegistered: true,
    doublesRegistered: true,
    source: 'sample',
  },
  {
    id: 'EMP025',
    name: 'Meena K',
    team: 'Grey Team',
    office: 'Guindy',
    gender: 'Women',
    singlesRegistered: true,
    doublesRegistered: true,
    source: 'sample',
  },
  {
    id: 'EMP026',
    name: 'Shalini N',
    team: 'Grey Team',
    office: 'Vandaloor',
    gender: 'Women',
    singlesRegistered: true,
    doublesRegistered: true,
    source: 'sample',
  },
  {
    id: 'EMP027',
    name: 'Mohan Raj',
    team: 'Grey Team',
    office: 'Guindy',
    gender: 'Men',
    singlesRegistered: true,
    doublesRegistered: false,
    source: 'sample',
  },
  {
    id: 'EMP028',
    name: 'Arun Kumar', // Intentional duplicate name with distinct ID (EMP028 vs EMP008)!
    team: 'Grey Team',
    office: 'Guindy',
    gender: 'Men',
    singlesRegistered: false,
    doublesRegistered: false,
    source: 'sample',
  },
];

/**
 * Generates initial example fixtures using actual sample records.
 * Follows organizer-specified matchups:
 * - Match 1: Red vs White — Singles
 * - Match 2: Blue vs Grey — Singles
 * - Match 3: Red vs Blue — Doubles
 * - Match 4: White vs Grey — Doubles
 */
export function getSampleFixtures(participants: Participant[] = SAMPLE_PARTICIPANTS) {
  const getP = (id: string) => {
    const found = participants.find((p) => p.id === id);
    if (!found) throw new Error(`Sample participant ${id} missing`);
    return {
      id: found.id,
      name: found.name,
      gender: (found.gender || 'Men') as 'Men' | 'Women',
      office: (found.office || 'Guindy') as 'Guindy' | 'Vandaloor',
    };
  };

  return [
    {
      id: 'M001',
      category: 'Singles' as const,
      teamA: 'Red Team' as TeamName,
      teamAPlayers: [getP('EMP001')], // Vignesh S (Red)
      teamB: 'White Team' as TeamName,
      teamBPlayers: [getP('EMP008')], // Arun Kumar (White)
      court: 'Court 1',
      scheduledDate: '2026-10-25',
      scheduledTime: '10:00',
      round: 'Round 1',
      status: 'Scheduled' as const,
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: 'M002',
      category: 'Singles' as const,
      teamA: 'Blue Team' as TeamName,
      teamAPlayers: [getP('EMP015')], // Karthik M (Blue)
      teamB: 'Grey Team' as TeamName,
      teamBPlayers: [getP('EMP022')], // Praveen T (Grey)
      court: 'Court 2',
      scheduledDate: '2026-10-25',
      scheduledTime: '10:00',
      round: 'Round 1',
      status: 'Scheduled' as const,
      createdAt: 1100,
      updatedAt: 1100,
    },
    {
      id: 'M003',
      category: 'Doubles' as const,
      teamA: 'Red Team' as TeamName,
      teamAPlayers: [getP('EMP001'), getP('EMP002')], // Vignesh + Suresh (Red) - Cross-office pair!
      teamB: 'Blue Team' as TeamName,
      teamBPlayers: [getP('EMP017'), getP('EMP018')], // Elangovan + Sathiyanesan (Blue)
      court: 'Court 1',
      scheduledDate: '2026-10-25',
      scheduledTime: '10:45',
      round: 'Round 1',
      status: 'Scheduled' as const,
      createdAt: 1200,
      updatedAt: 1200,
    },
    {
      id: 'M004',
      category: 'Doubles' as const,
      teamA: 'White Team' as TeamName,
      teamAPlayers: [getP('EMP009'), getP('EMP010')], // Hariharan + Divya (White)
      teamB: 'Grey Team' as TeamName,
      teamBPlayers: [getP('EMP022'), getP('EMP023')], // Praveen + Sanjay (Grey)
      court: 'Court 2',
      scheduledDate: '2026-10-25',
      scheduledTime: '10:45',
      round: 'Round 1',
      status: 'Scheduled' as const,
      createdAt: 1300,
      updatedAt: 1300,
    },
  ];
}

/**
 * Generate CSV text for Combined Participation template
 */
export function generateCombinedParticipationCSV(participants: Participant[] = SAMPLE_PARTICIPANTS): string {
  const headers = ['Player ID', 'Player Name', 'Team', 'Office', 'Singles', 'Doubles'];
  const rows = [headers.join(',')];

  participants.forEach((p) => {
    rows.push(
      [
        p.id,
        `"${p.name.replace(/"/g, '""')}"`,
        p.team,
        p.office || '',
        p.singlesRegistered ? 'Yes' : 'No',
        p.doublesRegistered ? 'Yes' : 'No',
      ].join(',')
    );
  });

  return rows.join('\r\n');
}

/**
 * Generate CSV text for Singles-only Participation template
 */
export function generateSinglesOnlyCSV(participants: Participant[] = SAMPLE_PARTICIPANTS): string {
  const headers = ['Player ID', 'Player Name', 'Team', 'Office'];
  const rows = [headers.join(',')];

  participants
    .filter((p) => p.singlesRegistered)
    .forEach((p) => {
      rows.push([p.id, `"${p.name.replace(/"/g, '""')}"`, p.team, p.office || ''].join(','));
    });

  return rows.join('\r\n');
}

/**
 * Generate CSV text for Doubles-only Participation template
 */
export function generateDoublesOnlyCSV(participants: Participant[] = SAMPLE_PARTICIPANTS): string {
  const headers = ['Player ID', 'Player Name', 'Team', 'Office'];
  const rows = [headers.join(',')];

  participants
    .filter((p) => p.doublesRegistered)
    .forEach((p) => {
      rows.push([p.id, `"${p.name.replace(/"/g, '""')}"`, p.team, p.office || ''].join(','));
    });

  return rows.join('\r\n');
}

/**
 * Generate Blank Participation Template CSV
 */
export function generateBlankParticipationCSV(): string {
  const headers = ['Player ID', 'Player Name', 'Team', 'Office', 'Singles', 'Doubles'];
  const examples = [
    'EMP001,Vignesh S,Red Team,Guindy,Yes,Yes',
    'EMP002,Arun Kumar,White Team,Vandaloor,Yes,No',
    'EMP003,Suresh R,Red Team,Vandaloor,No,Yes',
  ];
  return [headers.join(','), ...examples].join('\r\n');
}
