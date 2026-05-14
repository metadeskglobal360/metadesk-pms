import { NextRequest } from "next/server";
import { listUsers } from "@/lib/store";
import { requireAuth, successResponse } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  return successResponse({
    users: (await listUsers())
      .filter((user) => user.isActive)
      .map((user) => ({
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        designation: user.designation,
        team: user.team,
      })),
  });
}
