import type { Metadata } from 'next';
import { MyPlans } from '@/components/account/MyPlans';
import { ButtonLink } from '@/components/ui';

export const metadata: Metadata = { title: 'My plans' };

export default function MyPlansPage() {
  return (
    <div className="mx-auto grid max-w-3xl gap-6 px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">My plans</h1>
          <p className="mt-1 text-ink-soft">Every plan you build while logged in, newest first.</p>
        </div>
        <ButtonLink href="/plan">New plan</ButtonLink>
      </div>
      <MyPlans />
    </div>
  );
}
