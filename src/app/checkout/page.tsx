import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CheckoutView } from '@/components/Checkout';
import { ResultsSkeleton } from '@/components/results/ResultsView';

export const metadata: Metadata = { title: 'Test checkout' };

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="grid gap-6">
        <Suspense fallback={<ResultsSkeleton />}>
          <CheckoutView />
        </Suspense>
      </div>
    </div>
  );
}
