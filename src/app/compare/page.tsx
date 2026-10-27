import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CompareTabs } from '@/components/CompareTabs';
import { Skeleton, SectionTitle } from '@/components/ui';

export const metadata: Metadata = { title: 'Compare flights' };

export default function ComparePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <SectionTitle as="h1" eyebrow="Compare flights" title="Cash or points for a flight">
        A quick check without the full plan. For card advice and when to book, use Plan my trip.
      </SectionTitle>
      <div className="mt-6">
        <Suspense fallback={<Skeleton className="h-96" />}>
          <CompareTabs />
        </Suspense>
      </div>
    </div>
  );
}
