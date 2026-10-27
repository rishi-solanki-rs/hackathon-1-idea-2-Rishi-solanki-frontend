import { Database, FlaskConical, Info } from 'lucide-react';
import type { Availability, Provenance } from '@/domain/types';
import { t } from '@/i18n/en';
import { Badge } from './ui';

export function ProvenanceBadge({ p }: { p: Provenance }) {
  const tone =
    p === 'LIVE_TEST_DUFFEL' ? 'sea' : p === 'ESTIMATE' || p === 'CACHED' ? 'warn' : 'gold';
  const Icon = p === 'LIVE_TEST_DUFFEL' ? FlaskConical : Database;
  return (
    <Badge tone={tone} title="Where this number comes from">
      <Icon aria-hidden className="size-3" />
      {t.provenance[p]}
    </Badge>
  );
}

export function AvailabilityBadge({ a }: { a: Availability }) {
  return (
    <Badge tone={a === 'VERIFIED_RESULT' ? 'saving' : a === 'CACHED' ? 'warn' : 'neutral'}>
      <Info aria-hidden className="size-3" />
      {t.availability[a]}
    </Badge>
  );
}
