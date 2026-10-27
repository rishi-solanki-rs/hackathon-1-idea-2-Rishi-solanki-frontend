import { handlePlanCompute } from '@/server/plan';

export async function POST(req: Request) {
  return handlePlanCompute(req);
}
