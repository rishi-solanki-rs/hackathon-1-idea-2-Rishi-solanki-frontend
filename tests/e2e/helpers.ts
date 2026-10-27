import { expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export async function expectNoHorizontalOverflow(page: Page) {
  const { scroll, inner } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    inner: window.innerWidth,
  }));
  expect(scroll, `page is ${scroll}px wide in a ${inner}px viewport`).toBeLessThanOrEqual(inner);
}

export async function expectAccessible(page: Page) {
  const r = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const summary = r.violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.nodes
        .slice(0, 3)
        .map((n) => n.target.join(' '))
        .join(' | ')}`,
  );
  expect(summary, summary.join('\n')).toEqual([]);
}

export const STORE = 'aum.plan.v1';

/** Seeds the user's own planner balances (what Quick Flight and award steps read) before the first load. */
export async function seedWallet(
  page: Page,
  wallet: {
    profile: string;
    balances: { program: string; points: number }[];
    valuations?: { program: string; eurPerPoint: string }[];
  },
) {
  await page.addInitScript(
    ([key, w]) => {
      const x = w as { balances: { program: string; points: number }[]; valuations?: unknown[] };
      if (!window.localStorage.getItem(key as string))
        window.localStorage.setItem(
          key as string,
          JSON.stringify({
            version: 1,
            step: 0,
            trip: {
              origin: 'MAD',
              destination: '',
              tripType: 'return',
              earliestDepart: '',
              latestDepart: '',
              minNights: '7',
              maxNights: '10',
              adults: 1,
              cabin: 'economy',
              objective: 'B_ECONOMIC_COST',
              directOnly: false,
              bookBy: '',
            },
            profile: {
              cards: [],
              noCards: false,
              balances: x.balances.map((b) => ({
                program: b.program,
                kind: 'exact',
                points: b.points,
              })),
              noPoints: false,
              monthly: [],
              purchases: [],
              finance: { paysInFull: null },
              valuations: x.valuations ?? [],
            },
            award: {
              mode: 'none',
              program: 'iberia_club',
              points: '',
              taxesEur: '',
              seenAvailable: false,
            },
            updatedAt: new Date().toISOString(),
          }),
        );
    },
    [STORE, wallet] as const,
  );
}

export const LUCIA = {
  profile: 'lucia',
  balances: [
    { program: 'iberia_club', points: 120_000 },
    { program: 'amex_mr_es', points: 15_000 },
  ],
  valuations: [{ program: 'iberia_club', eurPerPoint: '0.012' }],
};

export function future(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const scl = () => `/results?o=MAD&d=SCL&t=ow&dd=${future(60)}&a=1&c=business&f=0&n=0&g=B`;
export const pek = () =>
  `/results?o=MAD&d=PEK&t=rt&dd=${future(50)}&rd=${future(64)}&a=1&c=economy&f=2&n=1&g=B`;
export const jfk = () =>
  `/results?o=BCN&d=JFK&t=rt&dd=${future(70)}&rd=${future(80)}&a=1&c=economy&f=0&n=0&g=B`;
export const trip = () =>
  `/trips/multi/results?legs=MAD-PEK-${future(90)},PEK-PVG-${future(95)},PVG-MAD-${future(101)}&a=1&c=economy&g=B`;
