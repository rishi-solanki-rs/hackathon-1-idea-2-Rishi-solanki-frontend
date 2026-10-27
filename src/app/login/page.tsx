import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '@/components/account/LoginForm';
import { SectionTitle, Skeleton } from '@/components/ui';

export const metadata: Metadata = { title: 'Log in' };

export default function LoginPage() {
  return (
    <div className="mx-auto grid max-w-md gap-6 px-4 py-10">
      <SectionTitle as="h1" eyebrow="Account sync" title="Your account">
        Log in to keep your plans and see them on any device.
      </SectionTitle>
      <Suspense fallback={<Skeleton className="h-72" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
