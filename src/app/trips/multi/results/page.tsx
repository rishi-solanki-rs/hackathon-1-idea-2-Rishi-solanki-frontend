import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PlanResults } from '@/components/plan/PlanResults';
import { ResultsSkeleton } from '@/components/results/ResultsView';

export const metadata: Metadata = { title: 'Trip plan results' };

export default function PlanResultsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Suspense fallback={<ResultsSkeleton />}>
        <PlanResults />
      </Suspense>
    </div>
  );
}
