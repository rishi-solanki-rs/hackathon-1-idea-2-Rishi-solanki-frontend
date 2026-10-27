import type { Metadata } from 'next';
import { PlanWizard } from '@/components/planner/PlanWizard';
export const metadata: Metadata = { title: 'Plan my trip' };

export default function PlanPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <h1 className="font-display text-2xl sm:text-3xl">Plan my trip</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Four short steps. We only use what you tell us and never suggest extra spending.
      </p>
      <div className="mt-5">
        <PlanWizard />
      </div>
    </div>
  );
}
