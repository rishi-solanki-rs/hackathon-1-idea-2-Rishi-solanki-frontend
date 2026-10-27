'use client';

import { useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { clearDemoData } from '@/lib/guestStore';
import { t } from '@/i18n/en';

export function DemoBanner() {
  const [done, setDone] = useState(false);
  return (
    <div className="bg-ink text-ivory">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 text-xs sm:text-sm">
        <p className="flex items-center gap-2">
          <FlaskConical aria-hidden className="size-4 shrink-0 text-gold-soft" />
          <span>{t.demoBanner}</span>
        </p>
        <div className="flex items-center gap-3">
          <span role="status" aria-live="polite" className="text-gold-soft">
            {done ? t.cleared : ''}
          </span>
          <button
            type="button"
            onClick={() => {
              clearDemoData();
              setDone(true);
              window.setTimeout(() => setDone(false), 4000);
            }}
            className="min-h-9 rounded-full border border-ivory/40 px-3 py-1 font-semibold hover:bg-ivory hover:text-ink"
          >
            {t.clearDemoData}
          </button>
        </div>
      </div>
    </div>
  );
}
