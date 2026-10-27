import { handlePlanSearch } from '@/server/handlers';

export async function POST(req: Request) {
  return handlePlanSearch(req);
}
