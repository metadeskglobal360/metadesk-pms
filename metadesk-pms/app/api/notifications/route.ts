import { NextRequest } from "next/server";
import { requireAuth, successResponse, errorResponse } from "@/lib/utils";
import { listNotifications, markNotificationsRead, markNotificationsReadByLink } from "@/lib/store";

// GET /api/notifications — fetch notifications for current user
export async function GET(req: NextRequest) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const userId = (session!.user as any).id as string;
  return successResponse(await listNotifications(userId));
}

// PATCH /api/notifications — mark all as read
export async function PATCH(req: NextRequest) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const userId = (session!.user as any).id as string;
  const body = await req.json();

  if (body.markAllRead) {
    await markNotificationsRead(userId);
    return successResponse({ message: "All notifications marked as read" });
  }

  if (body.id) {
    const notif = await markNotificationsRead(userId, body.id);
    if (!notif) return errorResponse("Notification not found", 404);
    return successResponse(notif);
  }

  if (typeof body.link === "string" && body.link) {
    await markNotificationsReadByLink(userId, body.link);
    return successResponse({ message: "Notifications marked as read" });
  }

  return errorResponse("Invalid request", 400);
}
