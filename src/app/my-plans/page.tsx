import type { Metadata } from 'next';
import { MyPlans } from '@/components/account/MyPlans';
import { ButtonLink, SectionTitle } from '@/components/ui';

export const metadata: Metadata = { title: 'My plans' };

export default function MyPlansPage() {
  return (
    <div className="mx-auto grid max-w-3xl gap-6 px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionTitle as="h1" eyebrow="Saved history" title="My plans">
          Every plan you build while logged in, newest first.
        </SectionTitle>
        <ButtonLink href="/plan">New plan</ButtonLink>
      </div>
      <MyPlans />
    </div>
  );
}
