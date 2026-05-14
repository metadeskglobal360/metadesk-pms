import { NextRequest } from "next/server";
import { z } from "zod";
import { deleteTask, getTask, toggleSubtask, updateTask } from "@/lib/store";
import { errorResponse, requireAuth, successResponse } from "@/lib/utils";

const updateTaskSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(5000).optional(),
  project: z.string().nullable().optional(),
  assignedTo: z.array(z.string()).optional(),
  status: z.enum(["todo", "in_progress", "review", "done"]).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  labels: z.array(z.string()).optional(),
  estimatedHours: z.number().min(0).nullable().optional(),
  loggedHours: z.number().min(0).optional(),
  subtasks: z.array(z.string()).optional(),
  subtaskId: z.string().optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const data = await getTask(params.id, (session!.user as any).id, (session!.user as any).role);
  if (!data) return errorResponse("Task not found", 404);

  return successResponse(data);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const userId = (session!.user as any).id as string;
  const role = (session!.user as any).role;
  const visibleTask = await getTask(params.id, userId, role);
  if (!visibleTask) return errorResponse("Task not found", 404);

  const body = await req.json();
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.errors[0].message, 422);

  if (role === "employee") {
    const allowed = Object.keys(parsed.data).every((key) => ["status", "subtaskId", "loggedHours"].includes(key));
    if (!allowed) return errorResponse("Employees can only update task status, hours, and subtasks", 403);
  }

  if (parsed.data.subtaskId) {
    const task = await toggleSubtask(params.id, parsed.data.subtaskId);
    if (!task) return errorResponse("Task not found", 404);
    return successResponse(task);
  }

  const task = await updateTask(params.id, parsed.data, userId);
  if (!task) return errorResponse("Task not found", 404);

  return successResponse(task);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const role = (session!.user as any).role;
  if (role !== "manager") return errorResponse("Only managers can delete tasks", 403);

  const deleted = await deleteTask(params.id, (session!.user as any).id);
  if (!deleted) return errorResponse("Task not found", 404);

  return successResponse({ message: "Task deleted successfully" });
}
