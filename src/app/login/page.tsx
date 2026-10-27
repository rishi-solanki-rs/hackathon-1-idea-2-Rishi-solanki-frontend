import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '@/components/account/LoginForm';
import { Skeleton } from '@/components/ui';

export const metadata: Metadata = { title: 'Log in' };

export default function LoginPage() {
  return (
    <div className="mx-auto grid max-w-md gap-6 px-4 py-10">
      <div>
        <h1 className="font-display text-3xl">Your account</h1>
        <p className="mt-1 text-ink-soft">Log in to keep your plans and see them on any device.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-72" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
