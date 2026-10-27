import { TestOrderRequestSchema } from '@/contracts/booking';
import { BookingError, createTestOrder } from '@/server/booking';
import {
  clientKey,
  errorResponse,
  okResponse,
  rateLimit,
  readJson,
  zodIssues,
} from '@/server/http';

export async function POST(req: Request) {
  const rl = rateLimit(`order:${clientKey(req)}`);
  if (!rl.ok)
    return errorResponse('RATE_LIMITED', 'Too many booking attempts.', undefined, {
      'Retry-After': String(rl.retryAfter),
    });
  const body = await readJson(req);
  if (!body.ok) return errorResponse('VALIDATION_ERROR', 'The request body is not valid JSON.');
  const parsed = TestOrderRequestSchema.safeParse(body.value);
  if (!parsed.success)
    return errorResponse(
      'VALIDATION_ERROR',
      'Some fields need attention.',
      zodIssues(parsed.error),
    );
  try {
    return okResponse(await createTestOrder(parsed.data));
  } catch (e) {
    if (e instanceof BookingError) return errorResponse(e.code, e.message, e.details);
    return errorResponse('INTERNAL', 'Could not create the test booking. No booking was made.');
  }
}
