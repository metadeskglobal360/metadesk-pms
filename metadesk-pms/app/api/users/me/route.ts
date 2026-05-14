import { NextRequest } from "next/server";
import { z } from "zod";
import { findUserByEmail, updateUserAvatar, updateUserPassword } from "@/lib/store";
import { errorResponse, requireAuth, successResponse } from "@/lib/utils";

const updateMeSchema = z.object({
  avatar: z.string().max(2_500_000).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, "New password must be at least 8 characters").optional(),
});

export async function GET(req: NextRequest) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const email = session?.user?.email;
  if (!email) return errorResponse("User session is missing an email", 401);

  const user = await findUserByEmail(email);
  if (!user) return errorResponse("User not found", 404);

  return successResponse(user);
}

export async function PATCH(req: NextRequest) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const body = await req.json();
  const parsed = updateMeSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.errors[0].message, 422);

  if (typeof parsed.data.avatar === "string") {
    const user = await updateUserAvatar((session!.user as any).id, parsed.data.avatar);
    if (!user) return errorResponse("User not found", 404);
    return successResponse(user);
  }

  if (parsed.data.currentPassword || parsed.data.newPassword) {
    if (!parsed.data.currentPassword || !parsed.data.newPassword) {
      return errorResponse("Current password and new password are required", 422);
    }

    const result = await updateUserPassword((session!.user as any).id, parsed.data.currentPassword, parsed.data.newPassword);
    if (result.error) return errorResponse(result.error, result.error === "User not found" ? 404 : 400);
    return successResponse(result.user);
  }

  return errorResponse("Nothing to update", 400);
}
