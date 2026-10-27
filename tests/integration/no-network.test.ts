import { describe, expect, it } from 'vitest';

describe('test isolation', () => {
  it('an unmocked outbound request fails instead of reaching the internet', async () => {
    await expect(
      fetch('https://api.duffel.com/air/offer_requests', { method: 'POST' }),
    ).rejects.toThrow();
  });
});
