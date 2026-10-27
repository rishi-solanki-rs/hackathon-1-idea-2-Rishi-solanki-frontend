import type { Metadata } from 'next';
import { PlanWizard } from '@/components/planner/PlanWizard';
import { SectionTitle } from '@/components/ui';

export const metadata: Metadata = { title: 'Plan my trip' };

export default function PlanPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <SectionTitle as="h1" eyebrow="Personalised planner" title="Plan my trip">
        Four short steps. We only use what you tell us and never suggest extra spending.
      </SectionTitle>
      <div className="mt-6">
        <PlanWizard />
      </div>
    </div>
  );
}
