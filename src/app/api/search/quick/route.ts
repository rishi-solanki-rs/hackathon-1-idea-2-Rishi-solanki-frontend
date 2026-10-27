import { handleQuickSearch } from '@/server/handlers';

export async function POST(req: Request) {
  return handleQuickSearch(req);
}
