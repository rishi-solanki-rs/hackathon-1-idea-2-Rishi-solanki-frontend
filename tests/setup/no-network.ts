import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './msw';

// Any request without an explicit handler fails the test: CI never touches the real network.
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
