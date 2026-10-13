import 'server-only';

import { env } from '@/lib/env';

export interface DemoAccount {
  label: string;
  hint: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
}

/** Seeded demo accounts (see apps/api/src/database/seed.ts). */
const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: 'Admin',
    hint: 'Full access',
    email: 'admin@northwind.test',
    password: 'Password123!',
    role: 'admin',
  },
  {
    label: 'Viewer',
    hint: 'Read-only',
    email: 'user@northwind.test',
    password: 'Password123!',
    role: 'user',
  },
];

// Kept on the server so hosted builds never ship the credentials, not just hide the buttons.
export function getDemoAccounts(): DemoAccount[] {
  return env.DEMO_ACCOUNTS ? DEMO_ACCOUNTS : [];
}
