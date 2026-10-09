import { type Patient } from '@pm/contracts';

const FIRST = [
  'Ada',
  'Grace',
  'Alan',
  'Katherine',
  'Margaret',
  'Barbara',
  'Donald',
  'Edsger',
  'Frances',
  'Linus',
  'Radia',
  'John',
];
const LAST = [
  'Lovelace',
  'Hopper',
  'Turing',
  'Johnson',
  'Hamilton',
  'Liskov',
  'Knuth',
  'Dijkstra',
  'Allen',
  'Torvalds',
  'Perlman',
  'Hopper',
];

export function makePatients(count = 12): Patient[] {
  return Array.from({ length: count }, (_, i) => {
    const firstName = FIRST[i % FIRST.length] ?? 'Test';
    const lastName = LAST[i % LAST.length] ?? 'Patient';
    return {
      id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      phoneNumber: `+1415555${String(100 + i).padStart(4, '0')}`,
      dob: `19${String(50 + i)}-0${String((i % 9) + 1)}-1${String(i % 9)}`,
      version: 1,
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-02T10:00:00.000Z',
    };
  });
}
