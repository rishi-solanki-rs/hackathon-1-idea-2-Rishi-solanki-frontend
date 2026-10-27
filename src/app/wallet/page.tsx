import type { Metadata } from 'next';
import { WalletView } from '@/components/WalletView';
import { SectionTitle } from '@/components/ui';

export const metadata: Metadata = { title: 'Wallet' };

export default function WalletPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <SectionTitle as="h1" eyebrow="Guest wallet" title="Your points, kept separate">
        Enter balances only. Never enter card numbers, CVV, PINs or passwords: A Una Milla does not
        need them and will never ask.
      </SectionTitle>
      <div className="mt-6">
        <WalletView />
      </div>
    </div>
  );
}
