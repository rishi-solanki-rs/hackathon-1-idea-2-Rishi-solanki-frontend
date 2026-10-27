import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AwardStepsView } from '@/components/AwardSteps';
import { ResultsSkeleton } from '@/components/results/ResultsView';

export const metadata: Metadata = { title: 'Award booking steps' };

export default function AwardStepsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Suspense fallback={<ResultsSkeleton />}>
        <AwardStepsView />
      </Suspense>
    </div>
  );
}
