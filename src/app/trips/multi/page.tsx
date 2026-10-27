import type { Metadata } from 'next';
import { PlanBuilder } from '@/components/plan/PlanBuilder';
import { SectionTitle } from '@/components/ui';

export const metadata: Metadata = { title: 'Full Trip Plan' };

export default function PlanPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <SectionTitle as="h1" eyebrow="Full Trip Plan" title="Plan a trip with several flights">
        Add up to 6 flights. We compare one-way, open-jaw and multi-city tickets, cash and points,
        and share your points across the whole trip.
      </SectionTitle>
      <div className="mt-6">
        <PlanBuilder />
      </div>
    </div>
  );
}
