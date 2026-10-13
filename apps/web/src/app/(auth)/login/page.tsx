import { Clock, HeartPulse, Lock, Users } from 'lucide-react';
import type { Metadata } from 'next';

import { Logo } from '@/components/layout/logo';
import { getDemoAccounts } from '@/features/auth/demo-accounts';
import { LoginForm } from '@/features/auth/login-form';

export const metadata: Metadata = { title: 'Sign in' };

const HIGHLIGHTS = [
  { icon: Users, text: 'Every patient record in one searchable place' },
  { icon: Lock, text: 'Role-based access: admins edit, everyone else views' },
  { icon: HeartPulse, text: 'Built to stay usable when the network is not' },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reason?: string }>;
}) {
  const { next, reason } = await searchParams;

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="bg-primary text-primary-foreground relative hidden overflow-hidden p-10 lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] [background-size:22px_22px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -right-24 size-96 rounded-full bg-white/10 blur-3xl"
        />
        <Logo className="relative text-lg [&_path]:stroke-white [&_rect]:fill-white/15" />
        <div className="relative max-w-md">
          <p className="text-balance text-3xl font-semibold leading-tight tracking-tight">
            Calm, reliable patient management for busy clinics.
          </p>
          <ul className="mt-8 grid gap-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-[15px] text-white/90">
                <span className="flex size-8 items-center justify-center rounded-full bg-white/15">
                  <Icon className="size-4" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/70">Demo environment · fictional data only</p>
      </aside>

      <main id="main-content" className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="animate-in fade-in slide-in-from-bottom-2 w-full max-w-sm duration-500">
          <Logo className="mb-10 text-lg lg:hidden" />
          <h1>Welcome back</h1>
          <p className="text-muted-foreground mb-8 mt-1.5 text-sm">
            Sign in to manage your patients.
          </p>

          {reason === 'expired' && (
            <div
              role="status"
              className="border-warning/40 bg-warning-subtle text-warning-foreground dark:text-warning mb-6 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm"
            >
              <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
              Your session expired. Please sign in again to continue.
            </div>
          )}

          <LoginForm next={next} demoAccounts={getDemoAccounts()} />
        </div>
      </main>
    </div>
  );
}
