import { NextRequest } from "next/server";
import { z } from "zod";
import { createDirectMessage, deleteDirectMessageThread, listDirectMessages, listMessageContacts } from "@/lib/store";
import { errorResponse, requireAuth, successResponse } from "@/lib/utils";

const createMessageSchema = z.object({
  recipientId: z.string().min(1),
  body: z.string().min(1).max(3000),
  replyTo: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const userId = (session!.user as any).id as string;
  const { searchParams } = new URL(req.url);
  const contactId = searchParams.get("with");
  const messages = await listDirectMessages(userId, contactId);

  return successResponse({
    contacts: await listMessageContacts(userId),
    messages,
  });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const body = await req.json();
  const parsed = createMessageSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.errors[0].message, 422);

  const message = await createDirectMessage({
    senderId: (session!.user as any).id,
    recipientId: parsed.data.recipientId,
    body: parsed.data.body.trim(),
    replyTo: parsed.data.replyTo,
  });

  if (!message) return errorResponse("Recipient not found", 404);

  return successResponse(message, 201);
}

export async function DELETE(req: NextRequest) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const userId = (session!.user as any).id as string;
  const { searchParams } = new URL(req.url);
  const contactId = searchParams.get("with");
  const result = await deleteDirectMessageThread(userId, contactId);

  if (!result.deleted) return errorResponse(result.error || "Chat not found", 404);

  return successResponse({ message: "Chat cleared for your account" });
}
