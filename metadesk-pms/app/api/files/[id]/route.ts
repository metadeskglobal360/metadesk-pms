import { NextRequest, NextResponse } from "next/server";
import { getFileById, getProject, getTask } from "@/lib/store";
import { errorResponse, requireAuth } from "@/lib/utils";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const file = await getFileById(params.id);
  if (!file) return errorResponse("File not found", 404);
  const userId = (session!.user as any).id as string;
  const role = (session!.user as any).role;

  if (file.project && !(await getProject(file.project, userId, role))) {
    return errorResponse("File not found", 404);
  }

  if (file.task && !(await getTask(file.task, userId, role))) {
    return errorResponse("File not found", 404);
  }

  if (!file.project && !file.task) {
    return errorResponse("File not found", 404);
  }

  const payload = readDemoFile(file);
  const safeFileName = file.fileName.replace(/["\r\n]/g, "");

  return new NextResponse(payload.body, {
    headers: {
      "Content-Type": payload.contentType,
      "Content-Disposition": `attachment; filename="${safeFileName}"`,
      "Cache-Control": "no-store",
    },
  });
}

function readDemoFile(file: { fileName: string; mimeType: string; dataUrl?: string; uploadedBy: { name: string }; createdAt?: string }) {
  const match = file.dataUrl?.match(/^data:(.*?);base64,(.*)$/);

  if (match?.[2]) {
    return {
      contentType: match[1] || file.mimeType || "application/octet-stream",
      body: new Uint8Array(Buffer.from(match[2], "base64")),
    };
  }

  const fallback = [
    `Demo file: ${file.fileName}`,
    `Uploaded by: ${file.uploadedBy.name}`,
    `Created: ${file.createdAt ? new Date(file.createdAt).toLocaleString() : "Unknown"}`,
    "",
    "This seeded demo file has metadata only. Newly uploaded files download with their original content.",
  ].join("\n");

  return {
    contentType: file.mimeType || "text/plain; charset=utf-8",
    body: new TextEncoder().encode(fallback),
  };
}
