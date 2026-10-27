import { FlaskConical } from 'lucide-react';
import { t } from '@/i18n/en';

export function DemoBanner() {
  return (
    <div className="bg-[#0b1420] text-[#f5efe4]">
      <p className="mx-auto flex max-w-5xl items-center justify-center gap-2 px-4 py-1.5 text-center text-xs">
        <FlaskConical aria-hidden className="size-3.5 shrink-0 text-[#f6ecd2]" />
        {t.demoBanner}
      </p>
    </div>
  );
}
