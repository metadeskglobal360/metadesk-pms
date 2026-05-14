import { NextRequest } from "next/server";
import { z } from "zod";
import { createFile, getProject, getTask, listFiles } from "@/lib/store";
import { errorResponse, requireAuth, successResponse } from "@/lib/utils";

const createFileSchema = z.object({
  project: z.string().optional(),
  task: z.string().optional(),
  fileName: z.string().min(1),
  mimeType: z.string().default("application/octet-stream"),
  size: z.number().min(0).default(0),
  dataUrl: z.string().max(8_000_000).optional(),
});

export async function GET(req: NextRequest) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const project = searchParams.get("project");
  const task = searchParams.get("task");
  const contextError = await authorizeFileContext(project, task, (session!.user as any).id, (session!.user as any).role);
  if (contextError) return contextError;

  return successResponse({ files: await listFiles(project, task) });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const body = await req.json();
  const parsed = createFileSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.errors[0].message, 422);

  const contextError = await authorizeFileContext(parsed.data.project || null, parsed.data.task || null, (session!.user as any).id, (session!.user as any).role);
  if (contextError) return contextError;

  const file = await createFile({ ...parsed.data, uploadedBy: (session!.user as any).id });
  return successResponse(file, 201);
}

async function authorizeFileContext(project: string | null, task: string | null, userId: string, role: any) {
  if (!project && !task) return errorResponse("Project or task is required", 422);
  if (project && task) return errorResponse("Choose either project or task", 422);

  if (project && !(await getProject(project, userId, role))) return errorResponse("Project not found", 404);
  if (task && !(await getTask(task, userId, role))) return errorResponse("Task not found", 404);

  return null;
}
