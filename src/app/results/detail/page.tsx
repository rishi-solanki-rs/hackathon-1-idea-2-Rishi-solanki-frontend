import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OptionDetail } from '@/components/results/OptionDetail';
import { ResultsSkeleton } from '@/components/results/ResultsView';

export const metadata: Metadata = { title: 'Option detail' };

export default function DetailPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Suspense fallback={<ResultsSkeleton />}>
        <OptionDetail />
      </Suspense>
    </div>
  );
}
