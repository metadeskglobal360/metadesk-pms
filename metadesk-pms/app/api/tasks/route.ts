import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, successResponse, errorResponse, getPagination } from "@/lib/utils";
import { createTask, listTasks } from "@/lib/store";

const createTaskSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(5000).optional().default(""),
  project: z.string().optional(),
  assignedTo: z.array(z.string()).optional().default([]),
  status: z.enum(["todo", "in_progress", "review", "done"]).default("todo"),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  dueDate: z.string().datetime().optional(),
  labels: z.array(z.string()).optional().default([]),
  estimatedHours: z.number().min(0).optional(),
  subtasks: z.array(z.string()).optional().default([]),
});

// GET /api/tasks — fetch tasks for the current user or a specific project
export async function GET(req: NextRequest) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const { limit, page } = getPagination(searchParams);
  const projectId = searchParams.get("project");
  const assignedTo = searchParams.get("assignedTo");
  const status = searchParams.get("status");
  const userId = (session!.user as any).id as string;
  const role = (session!.user as any).role;

  return successResponse(await listTasks({ project: projectId, assignedTo, status, page, limit, userId, role }));
}

// POST /api/tasks — create a task
export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const role = (session!.user as any).role;
  if (role !== "manager") {
    return errorResponse("Only managers can create tasks", 403);
  }

  try {
    const body = await req.json();
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.errors[0].message, 422);

    const { title, description, project, assignedTo, status, priority, dueDate, labels, estimatedHours, subtasks } =
      parsed.data;

    const task = await createTask({
      title,
      description,
      project,
      assignedTo,
      status,
      priority,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      labels,
      estimatedHours,
      subtasks,
      createdBy: (session!.user as any).id,
    });

    return successResponse(task, 201);
  } catch (err) {
    console.error("[CREATE_TASK]", err);
    return errorResponse("Failed to create task", 500);
  }
}
