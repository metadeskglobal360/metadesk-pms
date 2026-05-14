import { NextRequest } from "next/server";
import { z } from "zod";
import { createComment, getProject, getTask, listComments } from "@/lib/store";
import { errorResponse, requireAuth, successResponse } from "@/lib/utils";

const createCommentSchema = z.object({
  project: z.string().optional(),
  task: z.string().optional(),
  body: z.string().min(1).max(5000),
  mentions: z.array(z.string()).optional().default([]),
  replyTo: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const project = searchParams.get("project");
  const task = searchParams.get("task");
  const contextError = await authorizeCommentContext(project, task, (session!.user as any).id, (session!.user as any).role);
  if (contextError) return contextError;

  return successResponse({ comments: await listComments(project, task) });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const body = await req.json();
  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.errors[0].message, 422);

  const contextError = await authorizeCommentContext(parsed.data.project || null, parsed.data.task || null, (session!.user as any).id, (session!.user as any).role);
  if (contextError) return contextError;

  const comment = await createComment({
    ...parsed.data,
    authorId: (session!.user as any).id,
  });

  return successResponse(comment, 201);
}

async function authorizeCommentContext(project: string | null, task: string | null, userId: string, role: any) {
  if (!project && !task) return errorResponse("Project or task is required", 422);
  if (project && task) return errorResponse("Choose either project or task", 422);

  if (project && !(await getProject(project, userId, role))) return errorResponse("Project not found", 404);
  if (task && !(await getTask(task, userId, role))) return errorResponse("Task not found", 404);

  return null;
}
