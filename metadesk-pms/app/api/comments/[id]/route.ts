import { NextRequest } from "next/server";
import { z } from "zod";
import { deleteComment, updateComment } from "@/lib/store";
import { errorResponse, requireAuth, successResponse } from "@/lib/utils";

const updateCommentSchema = z.object({
  body: z.string().min(1).max(5000),
  mentions: z.array(z.string()).optional().default([]),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const parsed = updateCommentSchema.safeParse(await req.json());
  if (!parsed.success) return errorResponse(parsed.error.errors[0].message, 422);

  const result = await updateComment(params.id, parsed.data, (session!.user as any).id, (session!.user as any).role);
  if (!result.comment) {
    const status = result.error?.includes("only edit") ? 403 : 404;
    return errorResponse(result.error || "Comment not found", status);
  }

  return successResponse(result.comment);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const result = await deleteComment(params.id, (session!.user as any).id, (session!.user as any).role);
  if (!result.deleted) {
    const status = result.error?.includes("authorized") ? 403 : 404;
    return errorResponse(result.error || "Comment not found", status);
  }

  return successResponse({ message: "Comment deleted successfully" });
}
