import { NextRequest } from "next/server";
import { deactivateUser, deleteUser, listUsers, updateUserApproval, updateUserRole, updateUserTeam } from "@/lib/store";
import { errorResponse, requireAuth, successResponse } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const role = (session!.user as any).role;
  if (role !== "manager") {
    return errorResponse("Only managers can view the team directory", 403);
  }

  return successResponse({ users: await listUsers() });
}

export async function PATCH(req: NextRequest) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const role = (session!.user as any).role;
  if (role !== "manager") return errorResponse("Only managers can manage user access", 403);

  const body = await req.json();
  const managerId = String((session!.user as any).id || "");

  if (body.id && typeof body.approvalStatus === "string") {
    if (body.approvalStatus !== "approved" && body.approvalStatus !== "declined") {
      return errorResponse("Approval status must be approved or declined", 422);
    }
    if (body.id === managerId) return errorResponse("You cannot change approval for your own account", 422);
    const user = await updateUserApproval(body.id, body.approvalStatus, managerId);
    if (!user) return errorResponse("User not found", 404);
    return successResponse(user);
  }

  if (body.id && typeof body.isActive === "boolean") {
    const user = await deactivateUser(body.id, body.isActive);
    if (!user) return errorResponse("User not found", 404);
    return successResponse(user);
  }

  if (body.id && body.role) {
    if (body.role !== "manager" && body.role !== "employee") {
      return errorResponse("Role must be manager or employee", 422);
    }
    const user = await updateUserRole(body.id, body.role);
    if (!user) return errorResponse("User not found", 404);
    return successResponse(user);
  }

  if (body.id && typeof body.team === "string") {
    const team = body.team.trim();
    if (team.length < 2 || team.length > 50) return errorResponse("Department name must be 2-50 characters", 422);
    const user = await updateUserTeam(body.id, team);
    if (!user) return errorResponse("User not found", 404);
    return successResponse(user);
  }

  return errorResponse("Invalid request", 400);
}

export async function DELETE(req: NextRequest) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const role = (session!.user as any).role;
  if (role !== "manager") return errorResponse("Only managers can delete accounts", 403);

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  const managerId = String((session!.user as any).id || "");

  if (!id) return errorResponse("User id is required", 422);
  if (id === managerId) return errorResponse("You cannot delete your own account while signed in", 422);

  const deleted = await deleteUser(id, managerId);
  if (!deleted) return errorResponse("User not found", 404);

  return successResponse({ deleted: true });
}
