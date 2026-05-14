import { NextRequest } from "next/server";
import { getStats } from "@/lib/store";
import { requireAuth, successResponse } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const user = session!.user as any;
  const stats = await getStats(user.id, user.role);

  return successResponse({ stats });
}
