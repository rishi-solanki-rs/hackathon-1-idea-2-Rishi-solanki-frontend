import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ResultsSkeleton, ResultsView } from '@/components/results/ResultsView';

export const metadata: Metadata = { title: 'Results' };

export default function ResultsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Suspense fallback={<ResultsSkeleton />}>
        <ResultsView />
      </Suspense>
    </div>
  );
}
