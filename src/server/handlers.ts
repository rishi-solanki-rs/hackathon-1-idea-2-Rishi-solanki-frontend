import 'server-only';
import { PlanSearchRequestSchema, QuickSearchRequestSchema } from '@/contracts/search';
import { clientKey, errorResponse, okResponse, rateLimit, readJson, zodIssues } from './http';
import { runPlanSearch, runQuickSearch, type SearchDeps } from './search';

export async function handleQuickSearch(req: Request, deps: SearchDeps = {}) {
  const rl = rateLimit(`search:${clientKey(req)}`);
  if (!rl.ok)
    return errorResponse('RATE_LIMITED', 'Too many searches. Try again shortly.', undefined, {
      'Retry-After': String(rl.retryAfter),
    });
  const body = await readJson(req);
  if (!body.ok) return errorResponse('VALIDATION_ERROR', 'The request body is not valid JSON.');
  const parsed = QuickSearchRequestSchema.safeParse(body.value);
  if (!parsed.success)
    return errorResponse(
      'VALIDATION_ERROR',
      'Some fields need attention.',
      zodIssues(parsed.error),
    );
  try {
    return okResponse(await runQuickSearch(parsed.data, deps));
  } catch (e) {
    console.error('quick search failed', (e as Error).name);
    return errorResponse('INTERNAL', 'Something went wrong while comparing prices.');
  }
}

export async function handlePlanSearch(req: Request, deps: SearchDeps = {}) {
  const rl = rateLimit(`search:${clientKey(req)}`);
  if (!rl.ok)
    return errorResponse('RATE_LIMITED', 'Too many searches. Try again shortly.', undefined, {
      'Retry-After': String(rl.retryAfter),
    });
  const body = await readJson(req);
  if (!body.ok) return errorResponse('VALIDATION_ERROR', 'The request body is not valid JSON.');
  const raw = body.value as { legs?: unknown[] } | null;
  if (raw && Array.isArray(raw.legs) && raw.legs.length > 6)
    return errorResponse('UNPROCESSABLE', 'A trip can have at most 6 flights.');
  const parsed = PlanSearchRequestSchema.safeParse(body.value);
  if (!parsed.success)
    return errorResponse(
      'VALIDATION_ERROR',
      'Some fields need attention.',
      zodIssues(parsed.error),
    );
  try {
    return okResponse(await runPlanSearch(parsed.data, deps));
  } catch (e) {
    console.error('plan search failed', (e as Error).name);
    return errorResponse('INTERNAL', 'Something went wrong while planning the trip.');
  }
}
