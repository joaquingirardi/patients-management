import { type PrismaClient, type Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

export const PASSWORD = 'Correct-Horse-9';

export interface SeededWorld {
  northwind: { id: string; adminEmail: string; userEmail: string };
  contoso: { id: string; adminEmail: string };
  patients: { id: string; firstName: string; lastName: string; dob: string }[];
  foreignPatientId: string;
}

const NORTHWIND_PATIENTS = [
  { firstName: 'Ada', lastName: 'Lovelace', dob: '1985-12-10' },
  { firstName: 'Grace', lastName: 'Hopper', dob: '1906-12-09' },
  { firstName: 'Alan', lastName: 'Turing', dob: '1912-06-23' },
  { firstName: 'Katherine', lastName: 'Johnson', dob: '1918-08-26' },
  { firstName: 'Margaret', lastName: 'Hamilton', dob: '1936-08-17' },
  { firstName: 'Barbara', lastName: 'Liskov', dob: '1939-11-07' },
  { firstName: 'Donald', lastName: 'Knuth', dob: '1938-01-10' },
  { firstName: 'Edsger', lastName: 'Dijkstra', dob: '1930-05-11' },
  { firstName: 'Frances', lastName: 'Allen', dob: '1932-08-04' },
  { firstName: 'John', lastName: 'Hopper', dob: '1950-03-15' },
  { firstName: 'Linus', lastName: 'Torvalds', dob: '1969-12-28' },
  { firstName: 'Radia', lastName: 'Perlman', dob: '1951-12-18' },
];

/** Resets the database to a known world: two tenants, three users, a dozen patients. */
export async function seedWorld(prisma: PrismaClient): Promise<SeededWorld> {
  await prisma.$executeRawUnsafe('TRUNCATE patients, users, organizations CASCADE');
  const passwordHash = await bcrypt.hash(PASSWORD, 4);

  const user = (email: string, role: Role, organizationId: string) =>
    prisma.user.create({
      data: { email, role, name: email.split('@')[0] ?? email, passwordHash, organizationId },
    });

  const northwind = await prisma.organization.create({
    data: { name: 'Northwind', slug: 'northwind' },
  });
  const contoso = await prisma.organization.create({ data: { name: 'Contoso', slug: 'contoso' } });
  await user('admin@northwind.test', 'admin', northwind.id);
  await user('user@northwind.test', 'user', northwind.id);
  await user('admin@contoso.test', 'admin', contoso.id);

  const patients = [];
  for (const [i, p] of NORTHWIND_PATIENTS.entries()) {
    const row = await prisma.patient.create({
      data: {
        ...p,
        dob: new Date(`${p.dob}T00:00:00Z`),
        email: `${p.firstName.toLowerCase()}@example.com`,
        phoneNumber: `+1415555010${i % 10}`,
        organizationId: northwind.id,
      },
    });
    patients.push({ id: row.id, firstName: p.firstName, lastName: p.lastName, dob: p.dob });
  }
  const foreign = await prisma.patient.create({
    data: {
      firstName: 'Secret',
      lastName: 'Contoso',
      email: 'secret@example.com',
      phoneNumber: '+14155550199',
      dob: new Date('1980-01-01T00:00:00Z'),
      organizationId: contoso.id,
    },
  });

  return {
    northwind: {
      id: northwind.id,
      adminEmail: 'admin@northwind.test',
      userEmail: 'user@northwind.test',
    },
    contoso: { id: contoso.id, adminEmail: 'admin@contoso.test' },
    patients,
    foreignPatientId: foreign.id,
  };
}
