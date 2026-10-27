import type { Metadata } from 'next';
import { SettingsView } from '@/components/SettingsView';
import { SectionTitle } from '@/components/ui';

export const metadata: Metadata = { title: 'Privacy and your data' };

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <SectionTitle as="h1" eyebrow="Privacy" title="Your data stays in this browser">
        This demo runs in guest mode: there are no accounts and no server-side storage of your
        wallet.
      </SectionTitle>
      <div className="mt-6">
        <SettingsView />
      </div>
    </div>
  );
}
