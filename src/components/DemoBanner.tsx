import { FlaskConical } from 'lucide-react';
import { t } from '@/i18n/en';

export function DemoBanner() {
  return (
    <div className="border-b border-[#3e4370]/40 bg-[#1c1e36] text-[#eeebda]">
      <p className="mx-auto flex max-w-5xl items-center justify-center gap-2 px-4 py-1.5 text-center text-xs font-medium tracking-wide">
        <FlaskConical aria-hidden className="size-3.5 shrink-0 text-[#f0cf80]" />
        {t.demoBanner}
      </p>
    </div>
  );
}
