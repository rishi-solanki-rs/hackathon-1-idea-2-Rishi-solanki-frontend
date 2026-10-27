import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PlanBook } from '@/components/planner/PlanBook';
import { Skeleton } from '@/components/ui';

export const metadata: Metadata = { title: 'Test booking' };

export default function PlanBookPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Suspense fallback={<Skeleton className="h-64" />}>
        <PlanBook />
      </Suspense>
    </div>
  );
}
