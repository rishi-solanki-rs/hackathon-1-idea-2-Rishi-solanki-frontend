'use client';

import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import {
  PROGRAMS,
  REFERENCE_EUR_PER_POINT,
  TRANSFER_ROUTES,
  programById,
  verificationLabel,
} from '@/fixtures/catalogue';
import {
  applyPreset,
  PRESETS,
  useGuest,
  useHydrated,
  writeGuest,
  type GuestWallet,
} from '@/lib/guestStore';
import { usableFor } from '@/domain/wallet';
import { Alert, Badge, Button, Card, Skeleton, fieldClass } from './ui';
import { pts } from './format';

const MAX_POINTS = 50_000_000;

export function WalletView() {
  const hydrated = useHydrated();
  const guest = useGuest();
  const [saved, setSaved] = useState('');
  if (!hydrated) return <Skeleton className="h-96" />;
  const w = guest.wallet;
  const update = (fn: (w: GuestWallet) => GuestWallet, msg = 'Saved in this browser.') => {
    writeGuest((s) => ({ ...s, wallet: { ...fn(s.wallet), profile: 'custom' } }));
    setSaved(msg);
  };

  return (
    <div className="grid gap-8">
      <section aria-labelledby="presets">
        <h2 id="presets" className="font-display text-xl">
          Demo wallets
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Fictional profiles for trying the app. Pick one, or enter your own numbers below. Nothing
          leaves this browser.
        </p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {Object.entries(PRESETS).map(([id, p]) => {
            const active = w.profile === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    applyPreset(id);
                    setSaved(`Loaded ${p.label}.`);
                  }}
                  className="flex h-full w-full flex-col items-start rounded-2xl border border-line bg-white p-4 text-left shadow-[var(--shadow-card)] hover:border-sea aria-pressed:border-sea aria-pressed:ring-1 aria-pressed:ring-sea/30"
                >
                  <span className="flex items-center gap-2 font-semibold">
                    {active ? <Check aria-hidden className="size-4 text-sea" /> : null}
                    {p.label}
                  </span>
                  <span className="mt-1 text-sm text-ink-soft">{p.description}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <p role="status" aria-live="polite" className="text-sm font-medium text-saving">
        {saved}
      </p>

      <section aria-labelledby="balances">
        <h2 id="balances" className="font-display text-xl">
          Points by programme
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Each programme is kept separate: Avios, Miles and bank points are different currencies, so
          we never add them together.
        </p>
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {PROGRAMS.map((prog) => {
            const bal = w.balances.find((b) => b.program === prog.id)?.points ?? 0;
            const v = w.valuations.find((x) => x.program === prog.id);
            const noValue = w.noValuePrograms.includes(prog.id);
            const usable = usableFor(
              prog.id,
              w.balances.map((b) => ({ ...b, asOf: '', source: 'DEMO' as const })),
              TRANSFER_ROUTES,
            );
            return (
              <li key={prog.id} className="min-w-0">
                <Card className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">{prog.name}</h3>
                    <Badge tone="sea">{prog.unit}</Badge>
                  </div>
                  <div>
                    <label htmlFor={`bal-${prog.id}`} className="text-sm font-semibold">
                      Balance ({prog.unit})
                    </label>
                    <input
                      id={`bal-${prog.id}`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={MAX_POINTS}
                      step={1}
                      value={bal}
                      onChange={(e) => {
                        const n = Math.max(
                          0,
                          Math.min(MAX_POINTS, Math.floor(Number(e.target.value) || 0)),
                        );
                        update((x) => ({
                          ...x,
                          balances: [
                            ...x.balances.filter((b) => b.program !== prog.id),
                            ...(n > 0 ? [{ program: prog.id, points: n }] : []),
                          ],
                        }));
                      }}
                      className={fieldClass}
                    />
                  </div>
                  {prog.kind === 'airline' ? (
                    <div>
                      <label htmlFor={`val-${prog.id}`} className="text-sm font-semibold">
                        Value per {prog.unit === 'Avios' ? 'Avios' : 'point'} (€)
                      </label>
                      <select
                        id={`val-${prog.id}`}
                        className={fieldClass}
                        value={noValue ? 'none' : (v?.eurPerPoint ?? 'ref')}
                        onChange={(e) => {
                          const val = e.target.value;
                          update((x) => ({
                            ...x,
                            valuations: [
                              ...x.valuations.filter((y) => y.program !== prog.id),
                              ...(val !== 'ref' && val !== 'none'
                                ? [{ program: prog.id, eurPerPoint: val }]
                                : []),
                            ],
                            noValuePrograms:
                              val === 'none'
                                ? [...new Set([...x.noValuePrograms, prog.id])]
                                : x.noValuePrograms.filter((p) => p !== prog.id),
                          }));
                        }}
                      >
                        <option value="ref">Reference value (€{REFERENCE_EUR_PER_POINT})</option>
                        {['0.006', '0.008', '0.012', '0.015'].map((x) => (
                          <option key={x} value={x}>
                            €{x} (my value)
                          </option>
                        ))}
                        <option value="none">No value (break-even only)</option>
                      </select>
                    </div>
                  ) : (
                    <p className="text-sm text-ink-soft">
                      Bank and fintech points are valued through the airline programme you transfer
                      them to.
                    </p>
                  )}
                  {usable.viaTransfers.length ? (
                    <p className="text-sm text-ink-soft">
                      Usable for awards: {pts(usable.total, prog.id)} ({pts(usable.direct, prog.id)}{' '}
                      held + up to {pts(usable.total - usable.direct, prog.id)} by transfer, only
                      after you confirm a seat).
                    </p>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="routes">
        <h2 id="routes" className="font-display text-xl">
          Transfer routes we know about
        </h2>
        <Alert kind="warn" title="Transfer rules change and are not verified here" className="mt-3">
          These routes are for the demo. Before moving points, confirm the ratio, minimum and
          conditions on the official programme page. Transfers usually cannot be reversed.
        </Alert>
        <ul className="mt-3 grid gap-3">
          {TRANSFER_ROUTES.map((r) => (
            <li key={r.id}>
              <Card className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {programById(r.from)?.name}{' '}
                  <ArrowRight aria-hidden className="size-4 text-ink-muted" />{' '}
                  {programById(r.to)?.name}
                  <span className="text-sm text-ink-soft">
                    {r.num}:{r.den} · min {r.min.toLocaleString('en-IE')} · steps of{' '}
                    {r.increment.toLocaleString('en-IE')}
                  </span>
                </p>
                <Badge tone={r.verification === 'VERIFIED' ? 'saving' : 'warn'}>
                  {verificationLabel(r.verification)}
                </Badge>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <div>
        <Button
          variant="secondary"
          onClick={() => {
            applyPreset('empty');
            setSaved('Wallet emptied.');
          }}
        >
          Empty my wallet
        </Button>
      </div>
    </div>
  );
}
