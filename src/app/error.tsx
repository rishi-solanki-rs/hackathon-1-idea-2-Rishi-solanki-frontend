'use client';

import { Button, ButtonLink } from '@/components/ui';

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="font-display text-3xl">Something went wrong on this page</h1>
      <p className="mt-2 text-ink-soft">
        Your data in this browser is safe. Try again, or start a new search.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/" variant="secondary">
          New search
        </ButtonLink>
      </div>
    </div>
  );
}
