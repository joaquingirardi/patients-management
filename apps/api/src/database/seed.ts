/* eslint-disable no-console -- CLI script: console output is the UI. */
import { PrismaClient, type Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

/**
 * Idempotent demo seed: two organizations (to demonstrate tenant isolation), an admin and a
 * read-only user, and a deterministic set of patients (same data on every machine).
 *
 *   pnpm db:seed                                  (dev, via tsx --force)
 *   SEED_DEMO_DATA=true node dist/database/seed   (container; skipped unless opted in)
 */
export const DEMO_PASSWORD = 'Password123!';

const ORGANIZATIONS = [
  {
    slug: 'northwind',
    name: 'Northwind Clinic',
    patients: 137,
    users: [
      { email: 'admin@northwind.test', name: 'Maya Chen', role: 'admin' },
      { email: 'user@northwind.test', name: 'Leo Park', role: 'user' },
    ],
  },
  {
    slug: 'contoso',
    name: 'Contoso Health',
    patients: 24,
    users: [{ email: 'admin@contoso.test', name: 'Sam Rivera', role: 'admin' }],
  },
] satisfies {
  slug: string;
  name: string;
  patients: number;
  users: { email: string; name: string; role: Role }[];
}[];

const FIRST_NAMES = [
  'Olivia',
  'Liam',
  'Amara',
  'Noah',
  'Sofia',
  'Mateo',
  'Aisha',
  'Lucas',
  'Yuki',
  'Ethan',
  'Priya',
  'Mason',
  'Zoe',
  'Diego',
  'Hannah',
  'Kwame',
  'Elena',
  'Omar',
  'Chloe',
  'Ravi',
  'Isabella',
  'Jonah',
  'Fatima',
  'Henry',
  'Mei',
  'Gabriel',
  'Ingrid',
  'Tariq',
  'Lucía',
  'Felix',
  'Nadia',
  'Theo',
  'Anaïs',
  'Kai',
  'Grace',
  'Santiago',
  'Leila',
  'Arjun',
  'Freya',
  'Malik',
];
const LAST_NAMES = [
  'Smith',
  'García',
  'Okafor',
  'Nguyen',
  'Müller',
  'Rossi',
  'Tanaka',
  'Kowalski',
  'Haddad',
  'Silva',
  'Johansson',
  'Patel',
  "O'Connor",
  'Dubois',
  'Kim',
  'Fernández',
  'Mensah',
  'Novak',
  'Cohen',
  'Ivanova',
  'Andersen',
  'Moreau',
  'Yilmaz',
  'Brown',
  'Costa',
  'Lindqvist',
  'Wójcik',
  'Abara',
  'Schmidt',
  'Hughes',
  'Van der Berg',
  'Morales',
  'Sato',
  'Chen-Lee',
  'Murphy',
  'Ortiz',
  'Nakamura',
  'Bianchi',
  'Walker',
  'Reyes',
];

/** Small deterministic PRNG (mulberry32), so the data is reproducible without faker. */
function prng(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ascii = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .toLowerCase();

function buildPatients(count: number, seed: number) {
  const random = prng(seed);
  const pick = <T>(items: readonly T[]) => items[Math.floor(random() * items.length)] as T;
  const day = 24 * 60 * 60 * 1000;
  const from = Date.UTC(1938, 0, 1);
  const to = Date.UTC(2024, 11, 31);

  return Array.from({ length: count }, (_, index) => {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const dob = new Date(Math.floor((from + random() * (to - from)) / day) * day);
    return {
      firstName,
      lastName,
      // example.com is reserved for documentation (RFC 2606): never a real inbox.
      email: `${ascii(firstName)}.${ascii(lastName)}${index}@example.com`,
      // 555-01xx is the North American range reserved for fictional use.
      phoneNumber: `+1${pick(['212', '415', '617', '312', '206'])}55501${String(index % 100).padStart(2, '0')}`,
      dob,
    };
  });
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  try {
    for (const [index, org] of ORGANIZATIONS.entries()) {
      const organization = await prisma.organization.upsert({
        where: { slug: org.slug },
        update: { name: org.name },
        create: { slug: org.slug, name: org.name },
      });

      for (const user of org.users) {
        await prisma.user.upsert({
          where: { email: user.email },
          update: { name: user.name, role: user.role, organizationId: organization.id },
          create: { ...user, passwordHash, organizationId: organization.id },
        });
      }

      const existing = await prisma.patient.count({ where: { organizationId: organization.id } });
      if (existing === 0) {
        await prisma.patient.createMany({
          data: buildPatients(org.patients, 42 + index).map((patient) => ({
            ...patient,
            organizationId: organization.id,
          })),
        });
      }
      console.log(
        `✓ ${org.name}: ${org.users.length} users, ${Math.max(existing, org.patients)} patients`,
      );
    }
    console.log(`\nDemo password for every account: ${DEMO_PASSWORD}`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  // The migrator image runs this after every deploy; demo accounts with a published password
  // must never appear in a real environment unless explicitly requested.
  if (process.argv.includes('--force') || process.env['SEED_DEMO_DATA'] === 'true') {
    main().catch((error: unknown) => {
      console.error(error);
      process.exit(1);
    });
  } else {
    console.log('Skipping demo seed (set SEED_DEMO_DATA=true to load demo accounts and patients).');
  }
}
