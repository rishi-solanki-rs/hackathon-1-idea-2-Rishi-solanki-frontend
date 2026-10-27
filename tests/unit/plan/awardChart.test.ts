import { describe, expect, it } from 'vitest';
import { estimateAwardPoints } from '@/domain/awardChart';
import { estimateAward } from '@/server/plan';
import { PlanRequestSchema } from '@/contracts/plan';
import { haversineKm } from '@/domain/bookingWindow';
import { airportByIata } from '@/fixtures/catalogue';

const km = (a: string, b: string) => haversineKm(airportByIata(a)!, airportByIata(b)!);

describe('official Iberia award chart (correction 1)', () => {
  it('MAD-JFK (about 3,580 miles) economy return, 2 adults: band 5, 19,500 peak / 16,000 off-peak per leg', () => {
    const r = estimateAwardPoints({
      program: 'iberia_club',
      distanceKm: km('MAD', 'JFK'),
      cabin: 'economy',
      legs: 2,
      adults: 2,
    });
    expect(r).toMatchObject({
      ok: true,
      estimate: { band: 5, points: 78000, offPeakPoints: 64000 },
    });
  });

  it('MAD-PEK economy is band 7 (5,501-6,500 miles): 29,250 peak per leg', () => {
    const r = estimateAwardPoints({
      program: 'iberia_club',
      distanceKm: km('MAD', 'PEK'),
      cabin: 'economy',
      legs: 1,
      adults: 1,
    });
    expect(r).toMatchObject({
      ok: true,
      estimate: { band: 7, points: 29250, offPeakPoints: 24000 },
    });
  });

  it('regression: no estimate for First class, other programmes or missing short-haul Premium', () => {
    expect(
      estimateAwardPoints({
        program: 'iberia_club',
        distanceKm: km('MAD', 'SCL'),
        cabin: 'first',
        legs: 1,
        adults: 4,
      }).ok,
    ).toBe(false);
    expect(
      estimateAwardPoints({
        program: 'flying_blue',
        distanceKm: 5000,
        cabin: 'economy',
        legs: 1,
        adults: 1,
      }).ok,
    ).toBe(false);
    expect(
      estimateAwardPoints({
        program: 'iberia_club',
        distanceKm: km('MAD', 'LHR'),
        cabin: 'premium_economy',
        legs: 1,
        adults: 1,
      }).ok,
    ).toBe(false);
  });

  it('regression: the server never estimates without an explicit programme and never defaults to Iberia', () => {
    const base = {
      trip: {
        origin: 'MAD',
        destination: 'SCL',
        tripType: 'one_way',
        earliestDepart: '2027-02-01',
        latestDepart: '2027-03-01',
        adults: 4,
        cabin: 'first',
        objective: 'B_ECONOMIC_COST',
      },
      profile: {
        cards: [],
        noCards: true,
        balances: [{ program: 'iberia_club', kind: 'exact', points: 1200 }],
        noPoints: false,
        monthly: [],
        purchases: [],
        finance: { paysInFull: true },
        valuations: [],
      },
      award: null,
      estimateAward: true,
    };
    const noProgram = estimateAward(PlanRequestSchema.parse(base));
    expect(noProgram.award).toBeNull();
    expect(noProgram.note).toMatch(/Choose the programme/);
    const first = estimateAward(
      PlanRequestSchema.parse({ ...base, estimateProgram: 'iberia_club' }),
    );
    expect(first.award).toBeNull();
    expect(first.note).toMatch(/First/);
    const economy = estimateAward(
      PlanRequestSchema.parse({
        ...base,
        estimateProgram: 'iberia_club',
        trip: { ...base.trip, cabin: 'economy' },
      }),
    );
    expect(economy.award).toMatchObject({ program: 'iberia_club', source: 'ILLUSTRATIVE' });
    expect(economy.note).toMatch(/official chart/);
  });
});
