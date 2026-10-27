import type { Metadata } from 'next';
import { PlanWizard } from '@/components/planner/PlanWizard';
import { SectionTitle } from '@/components/ui';

export const metadata: Metadata = { title: 'Plan my trip' };

export default function PlanPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <SectionTitle as="h1" eyebrow="Plan my trip" title="Your trip, your cards, your points">
        Four short steps. We use only what you tell us, show where every number comes from, and
        never suggest spending you would not do anyway.
      </SectionTitle>
      <div className="mt-6">
        <PlanWizard />
      </div>
    </div>
  );
}
