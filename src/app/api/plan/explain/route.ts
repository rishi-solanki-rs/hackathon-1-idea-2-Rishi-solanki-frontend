import { handleExplain } from '@/server/explain';

export async function POST(req: Request) {
  return handleExplain(req);
}
