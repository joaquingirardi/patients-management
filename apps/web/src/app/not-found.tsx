import { FileQuestion } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/feedback/empty-state';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center">
      <EmptyState
        icon={<FileQuestion />}
        title="Page not found"
        description="The page you are looking for does not exist or has moved."
        action={
          <Button asChild variant="outline">
            <Link href="/patients">Back to patients</Link>
          </Button>
        }
      />
    </main>
  );
}
