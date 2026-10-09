import Link from 'next/link';

import { Logo } from './logo';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';

export function AppHeader() {
  return (
    <header className="bg-background/80 supports-backdrop-filter:bg-background/65 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/patients"
          className="focus-visible:ring-ring/40 rounded-md focus-visible:outline-none focus-visible:ring-[3px]"
        >
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
