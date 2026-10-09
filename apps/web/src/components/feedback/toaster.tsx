'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';

/** Toasts are rendered in an ARIA live region by Sonner, so they are announced to screen readers. */
export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      position="bottom-right"
      richColors
      closeButton
      duration={5000}
      toastOptions={{ classNames: { toast: 'font-sans shadow-lg', description: 'text-[13px]' } }}
    />
  );
}
