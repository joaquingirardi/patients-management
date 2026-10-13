'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ErrorCode, type LoginRequest, LoginRequestSchema } from '@pm/contracts';
import { AlertCircle, Eye, EyeOff, ShieldCheck, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { toApiError } from '@/lib/api/problem';
import { safeRedirectPath } from '@/lib/safe-redirect';

import type { DemoAccount } from './demo-accounts';

export function LoginForm({
  next,
  demoAccounts,
}: {
  next: string | undefined;
  demoAccounts: DemoAccount[];
}) {
  const router = useRouter();
  const [showPassword, setShowPassword] = React.useState(false);
  const form = useForm<LoginRequest>({
    resolver: zodResolver(LoginRequestSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: LoginRequest) {
    let response: Response;
    try {
      response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
    } catch {
      form.setError('root', { message: 'We could not reach the server. Check your connection.' });
      return;
    }

    if (!response.ok) {
      const error = await toApiError(response);
      const message =
        error.code === ErrorCode.InvalidCredentials
          ? 'Invalid email or password.'
          : error.code === ErrorCode.RateLimited
            ? `Too many attempts. Try again in ${String(error.retryAfterSeconds ?? 60)} seconds.`
            : error.message;
      form.setError('root', { message });
      form.setFocus('password');
      return;
    }

    router.replace(safeRedirectPath(next) as '/patients');
    router.refresh();
  }

  function fillDemoAccount({ email, password }: DemoAccount) {
    form.reset({ email, password });
    form.clearErrors();
  }

  return (
    <div className="grid gap-6">
      <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        {errors.root?.message && (
          <div
            role="alert"
            className="border-destructive/30 bg-destructive-subtle text-destructive animate-in fade-in slide-in-from-top-1 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {errors.root.message}
          </div>
        )}

        <FormField label="Email" error={errors.email?.message}>
          {(field) => (
            <Input
              {...field}
              {...form.register('email')}
              type="email"
              autoComplete="username"
              inputMode="email"
              placeholder="you@clinic.com"
              // Signing in is the page's only purpose; landing in the field saves every user a step.
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
          )}
        </FormField>

        <FormField label="Password" error={errors.password?.message}>
          {(field) => (
            <div className="relative">
              <Input
                {...field}
                {...form.register('password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/40 absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-[3px]"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden />
                ) : (
                  <Eye className="size-4" aria-hidden />
                )}
              </button>
            </div>
          )}
        </FormField>

        <Button type="submit" size="lg" className="mt-1 w-full" loading={isSubmitting}>
          Sign in
        </Button>
      </form>

      {demoAccounts.length > 0 && (
        <section aria-labelledby="demo-accounts" className="grid gap-3">
          <div className="flex items-center gap-3">
            <span className="bg-border h-px flex-1" />
            <h2
              id="demo-accounts"
              className="text-muted-foreground text-xs font-medium uppercase tracking-wide"
            >
              Demo accounts
            </h2>
            <span className="bg-border h-px flex-1" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {demoAccounts.map((account) => {
              const Icon = account.role === 'admin' ? ShieldCheck : UserRound;
              return (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => fillDemoAccount(account)}
                  className="bg-card hover:border-primary/40 hover:bg-accent/60 focus-visible:ring-ring/40 shadow-xs group flex items-center gap-2.5 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-[3px]"
                >
                  <Icon
                    className="text-primary size-4 shrink-0 transition-transform group-hover:scale-110"
                    aria-hidden
                  />
                  <span className="grid">
                    <span className="text-sm font-medium">{account.label}</span>
                    <span className="text-muted-foreground text-xs">{account.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
