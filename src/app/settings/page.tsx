import type { Metadata } from 'next';
import { SettingsView } from '@/components/SettingsView';
import { SectionTitle } from '@/components/ui';

export const metadata: Metadata = { title: 'Privacy and your data' };

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <SectionTitle as="h1" eyebrow="Privacy" title="Privacy and your data">
        Without logging in, your answers stay in this browser. If you log in, your answers and saved
        plans are also kept in your account, readable only by you.
      </SectionTitle>
      <div className="mt-6">
        <SettingsView />
      </div>
    </div>
  );
}
