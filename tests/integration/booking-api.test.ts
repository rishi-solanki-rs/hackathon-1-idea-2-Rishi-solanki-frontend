import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw/http';
import { server } from '../setup/msw';
import { BookingError, createTestOrder, reprice } from '@/server/booking';
import type { ServerEnv } from '@/server/env';
import { TEST_BOOKING_LABEL } from '@/contracts/booking';

const NOW = new Date('2026-10-27T10:00:00Z');
const env: ServerEnv = {
  AUTH_MODE: 'guest',
  PROVIDER_MODE: 'fixture',
  FX_LIVE: 'off',
  duffelEnabled: false,
};
const duffelEnv: ServerEnv = {
  ...env,
  PROVIDER_MODE: 'duffel_test',
  DUFFEL_ACCESS_TOKEN: 'duffel_test_x',
  duffelEnabled: true,
};
const future = '2026-10-27T10:30:00.000Z';

describe('reprice and simulated test orders', () => {
  it('T-INT-004: FX-CASH-06 reprices €702 → €719 and the order refuses the stale price (409)', async () => {
    const offerRef = 'fixture:MAD-PEK-return-economy:plus2';
    const r = await reprice(
      { offerRef, quotedTotal: { minor: 70200, currency: 'EUR' }, expiresAt: future },
      { env, now: NOW },
    );
    expect(r.data).toMatchObject({
      priceChanged: true,
      total: { minor: 71900, currency: 'EUR' },
      mode: 'SIMULATED',
    });
    await expect(
      createTestOrder(
        {
          offerRef,
          confirmTotal: { minor: 70200, currency: 'EUR' },
          expiresAt: future,
          idempotencyKey: 'key-aaaaaaaaaaaaaaaa',
        },
        { env, now: NOW },
      ),
    ).rejects.toMatchObject({ code: 'PRICE_CHANGED' });
    const ok = await createTestOrder(
      {
        offerRef,
        confirmTotal: { minor: 71900, currency: 'EUR' },
        expiresAt: future,
        idempotencyKey: 'key-bbbbbbbbbbbbbbbb',
      },
      { env, now: NOW },
    );
    expect(ok.data.label).toBe(TEST_BOOKING_LABEL);
    expect(ok.data.reference).toMatch(/^SIM-/);
  });

  it('410 OFFER_EXPIRED for an expired offer', async () => {
    await expect(
      reprice(
        {
          offerRef: 'fixture:x:exact',
          quotedTotal: { minor: 100, currency: 'EUR' },
          expiresAt: '2026-10-27T09:00:00.000Z',
        },
        { env, now: NOW },
      ),
    ).rejects.toBeInstanceOf(BookingError);
  });

  it('is idempotent: the same key returns the first booking', async () => {
    const req = {
      offerRef: 'fixture:a:exact',
      confirmTotal: { minor: 50000, currency: 'EUR' },
      expiresAt: future,
      idempotencyKey: 'key-cccccccccccccccc',
    };
    const a = await createTestOrder(req, { env, now: NOW });
    const b = await createTestOrder(req, { env, now: new Date('2026-10-27T10:05:00Z') });
    expect(b).toEqual(a);
  });
});

describe('Duffel test orders (msw)', () => {
  const offer = {
    id: 'off_1',
    live_mode: false,
    total_amount: '500.00',
    total_currency: 'EUR',
    expires_at: '2026-10-27T10:30:00Z',
    passengers: [{ id: 'pas_1' }],
    slices: [],
  };

  it('creates a balance-paid test order with the synthetic traveller and never retries the mutation', async () => {
    let orderCalls = 0;
    let sent:
      { data: { payments: { type: string }[]; passengers: { given_name: string }[] } } | undefined;
    server.use(
      http.get('https://api.duffel.com/air/offers/off_1', () => HttpResponse.json({ data: offer })),
      http.post('https://api.duffel.com/air/orders', async ({ request }) => {
        orderCalls++;
        sent = (await request.json()) as typeof sent;
        return HttpResponse.json({
          data: { id: 'ord_1', booking_reference: 'ZZ1234', live_mode: false },
        });
      }),
    );
    const res = await createTestOrder(
      {
        offerRef: 'off_1',
        confirmTotal: { minor: 50000, currency: 'EUR' },
        idempotencyKey: 'key-dddddddddddddddd',
      },
      { env: duffelEnv, now: new Date('2026-10-27T10:00:00Z') },
    );
    expect(res.data).toMatchObject({
      reference: 'ZZ1234',
      mode: 'DUFFEL_TEST',
      label: TEST_BOOKING_LABEL,
    });
    expect(orderCalls).toBe(1);
    expect(sent?.data.payments[0].type).toBe('balance');
    expect(sent?.data.passengers[0].given_name).toBe('Lucia');
  });

  it('a failed order is reported as PROVIDER_ERROR after exactly one attempt', async () => {
    let orderCalls = 0;
    server.use(
      http.get('https://api.duffel.com/air/offers/off_1', () => HttpResponse.json({ data: offer })),
      http.post('https://api.duffel.com/air/orders', () => {
        orderCalls++;
        return HttpResponse.json({ errors: [{ code: 'internal' }] }, { status: 500 });
      }),
    );
    await expect(
      createTestOrder(
        {
          offerRef: 'off_1',
          confirmTotal: { minor: 50000, currency: 'EUR' },
          idempotencyKey: 'key-eeeeeeeeeeeeeeee',
        },
        { env: duffelEnv, now: NOW },
      ),
    ).rejects.toMatchObject({ code: 'PROVIDER_ERROR' });
    expect(orderCalls).toBe(1);
  });

  it('fails closed when an order comes back as live mode', async () => {
    server.use(
      http.get('https://api.duffel.com/air/offers/off_1', () => HttpResponse.json({ data: offer })),
      http.post('https://api.duffel.com/air/orders', () =>
        HttpResponse.json({ data: { id: 'ord_2', live_mode: true } }),
      ),
    );
    await expect(
      createTestOrder(
        {
          offerRef: 'off_1',
          confirmTotal: { minor: 50000, currency: 'EUR' },
          idempotencyKey: 'key-ffffffffffffffff',
        },
        { env: duffelEnv, now: NOW },
      ),
    ).rejects.toMatchObject({ code: 'TEST_MODE_REQUIRED' });
  });
});
