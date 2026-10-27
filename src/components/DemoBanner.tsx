'use client';

import { useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { clearDemoData } from '@/lib/guestStore';
import { resetPlanCache } from '@/lib/planStore';
import { useSync } from '@/lib/sync';
import { t } from '@/i18n/en';

export function DemoBanner() {
  const [done, setDone] = useState(false);
  const sync = useSync();
  return (
    <div className="bg-[#0b1420] text-[#f5efe4]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 text-xs sm:text-sm">
        <p className="flex items-center gap-2">
          <FlaskConical aria-hidden className="size-4 shrink-0 text-[#f6ecd2]" />
          <span>{t.demoBanner}</span>
        </p>
        <div className="flex items-center gap-3">
          <span role="status" aria-live="polite" className="text-[#f6ecd2]">
            {done ? t.cleared : ''}
          </span>
          <button
            type="button"
            onClick={async () => {
              await sync.deleteRemote().catch(() => undefined);
              clearDemoData();
              resetPlanCache();
              setDone(true);
              window.setTimeout(() => setDone(false), 4000);
            }}
            className="min-h-9 rounded-full border border-[#f5efe4]/40 px-3 py-1 font-semibold hover:bg-[#f5efe4] hover:text-[#0b1420]"
          >
            {t.clearDemoData}
          </button>
        </div>
      </div>
    </div>
  );
}
