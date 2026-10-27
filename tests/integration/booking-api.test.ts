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
      noOrders,
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

  it('a 5xx on order creation is OUTCOME_UNKNOWN (the order may exist) after exactly one attempt', async () => {
    let orderCalls = 0;
    server.use(
      http.get('https://api.duffel.com/air/offers/off_1', () => HttpResponse.json({ data: offer })),
      noOrders,
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
    ).rejects.toMatchObject({ code: 'OUTCOME_UNKNOWN' });
    expect(orderCalls).toBe(1);
  });

  const four = { ...offer, passengers: ['pas_a', 'pas_b', 'pas_c', 'pas_d'].map((id) => ({ id })) };
  const noOrders = http.get('https://api.duffel.com/air/orders', () =>
    HttpResponse.json({ data: [] }),
  );

  it('regression: 4 adults get 4 distinct fictional travellers (Duffel rejects duplicate names)', async () => {
    let sent:
      | {
          data: {
            passengers: { id: string; given_name: string; family_name: string }[];
            metadata?: Record<string, string>;
          };
        }
      | undefined;
    server.use(
      http.get('https://api.duffel.com/air/offers/off_1', () => HttpResponse.json({ data: four })),
      noOrders,
      http.post('https://api.duffel.com/air/orders', async ({ request }) => {
        sent = (await request.json()) as typeof sent;
        return HttpResponse.json({
          data: { id: 'ord_4', booking_reference: 'ZZ4444', live_mode: false },
        });
      }),
    );
    const res = await createTestOrder(
      {
        offerRef: 'off_1',
        confirmTotal: { minor: 50000, currency: 'EUR' },
        idempotencyKey: 'key-four-adults-aaaa',
      },
      { env: duffelEnv, now: NOW },
    );
    const names = sent!.data.passengers.map((p) => `${p.given_name} ${p.family_name}`);
    expect(sent!.data.passengers.map((p) => p.id)).toEqual(['pas_a', 'pas_b', 'pas_c', 'pas_d']);
    expect(new Set(names).size).toBe(4);
    expect(sent!.data.metadata?.aum_key).toBe('key-four-adults-aaaa');
    expect(res.data.passengers).toHaveLength(4);
  });

  it('regression: a Duffel 422 duplicate_passenger_names is a clear rejection, not "did not respond"', async () => {
    server.use(
      http.get('https://api.duffel.com/air/offers/off_1', () => HttpResponse.json({ data: four })),
      noOrders,
      http.post('https://api.duffel.com/air/orders', () =>
        HttpResponse.json(
          { errors: [{ code: 'duplicate_passenger_names', type: 'airline_error' }] },
          { status: 422 },
        ),
      ),
    );
    const err = await createTestOrder(
      {
        offerRef: 'off_1',
        confirmTotal: { minor: 50000, currency: 'EUR' },
        idempotencyKey: 'key-dup-names-aaaaa',
      },
      { env: duffelEnv, now: NOW },
    ).catch((e: BookingError) => e);
    expect(err).toMatchObject({ code: 'BOOKING_REJECTED' });
    expect((err as BookingError).message).toMatch(/traveller/i);
    expect((err as BookingError).message).not.toMatch(/did not respond/);
  });

  it('regression: pays exactly the amount that was price-checked (one offer fetch per order)', async () => {
    let gets = 0;
    let paid: string | undefined;
    server.use(
      http.get('https://api.duffel.com/air/offers/off_1', () => {
        gets++;
        return HttpResponse.json({
          data: { ...offer, total_amount: gets === 1 ? '500.00' : '520.00' },
        });
      }),
      noOrders,
      http.post('https://api.duffel.com/air/orders', async ({ request }) => {
        paid = ((await request.json()) as { data: { payments: { amount: string }[] } }).data
          .payments[0].amount;
        return HttpResponse.json({
          data: { id: 'ord_p', booking_reference: 'ZZPAID', live_mode: false },
        });
      }),
    );
    await createTestOrder(
      {
        offerRef: 'off_1',
        confirmTotal: { minor: 50000, currency: 'EUR' },
        idempotencyKey: 'key-paid-price-aaaa',
      },
      { env: duffelEnv, now: NOW },
    );
    expect(gets).toBe(1);
    expect(paid).toBe('500.00');
  });

  it('regression: a lost order response is OUTCOME_UNKNOWN, reconciled by key, and never re-posted', async () => {
    let posts = 0;
    let listed: {
      metadata: Record<string, string>;
      id: string;
      booking_reference: string;
      live_mode: boolean;
    }[] = [];
    server.use(
      http.get('https://api.duffel.com/air/offers/off_1', () => HttpResponse.json({ data: offer })),
      http.get('https://api.duffel.com/air/orders', () => HttpResponse.json({ data: listed })),
      http.post('https://api.duffel.com/air/orders', () => {
        posts++;
        return HttpResponse.error();
      }),
    );
    const req = {
      offerRef: 'off_1',
      confirmTotal: { minor: 50000, currency: 'EUR' },
      idempotencyKey: 'key-lost-order-aaaa',
    };
    const err = await createTestOrder(req, { env: duffelEnv, now: NOW }).catch(
      (e: BookingError) => e,
    );
    expect(err).toMatchObject({ code: 'OUTCOME_UNKNOWN' });
    expect((err as BookingError).message).not.toMatch(/no booking was made/i);
    // Checking again with the same key only looks the order up; it never creates a second one.
    const still = await createTestOrder(
      { ...req, checkOnly: true },
      { env: duffelEnv, now: NOW },
    ).catch((e: BookingError) => e);
    expect(still).toMatchObject({ code: 'OUTCOME_UNKNOWN' });
    listed = [
      {
        id: 'ord_l',
        booking_reference: 'ZZLATE',
        live_mode: false,
        metadata: { aum_key: req.idempotencyKey },
      },
    ];
    const found = await createTestOrder({ ...req, checkOnly: true }, { env: duffelEnv, now: NOW });
    expect(found.data.reference).toBe('ZZLATE');
    expect(posts).toBe(1);
  });

  it('regression: two concurrent requests with one key create one order', async () => {
    let posts = 0;
    server.use(
      http.get('https://api.duffel.com/air/offers/off_1', () => HttpResponse.json({ data: offer })),
      noOrders,
      http.post('https://api.duffel.com/air/orders', async () => {
        posts++;
        await new Promise((r) => setTimeout(r, 50));
        return HttpResponse.json({
          data: { id: 'ord_c', booking_reference: 'ZZCONC', live_mode: false },
        });
      }),
    );
    const req = {
      offerRef: 'off_1',
      confirmTotal: { minor: 50000, currency: 'EUR' },
      idempotencyKey: 'key-concurrent-aaaa',
    };
    const [a, b] = await Promise.all([
      createTestOrder(req, { env: duffelEnv, now: NOW }),
      createTestOrder(req, { env: duffelEnv, now: NOW }),
    ]);
    expect(a.data.reference).toBe('ZZCONC');
    expect(b.data.reference).toBe('ZZCONC');
    expect(posts).toBe(1);
  });

  it('fails closed when an order comes back as live mode', async () => {
    server.use(
      http.get('https://api.duffel.com/air/offers/off_1', () => HttpResponse.json({ data: offer })),
      noOrders,
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
