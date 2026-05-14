import { NextRequest } from "next/server";
import { z } from "zod";
import { deleteDirectMessage, updateDirectMessage } from "@/lib/store";
import { errorResponse, requireAuth, successResponse } from "@/lib/utils";

const updateMessageSchema = z.object({
  body: z.string().min(1).max(3000),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const parsed = updateMessageSchema.safeParse(await req.json());
  if (!parsed.success) return errorResponse(parsed.error.errors[0].message, 422);

  const result = await updateDirectMessage(params.id, parsed.data.body.trim(), (session!.user as any).id);
  if (!result.message) {
    const status = result.error?.includes("only edit") ? 403 : 404;
    return errorResponse(result.error || "Message not found", status);
  }

  return successResponse(result.message);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const result = await deleteDirectMessage(params.id, (session!.user as any).id, (session!.user as any).role);
  if (!result.deleted) {
    const status = result.error?.includes("authorized") ? 403 : 404;
    return errorResponse(result.error || "Message not found", status);
  }

  return successResponse({ message: "Message deleted successfully" });
}
