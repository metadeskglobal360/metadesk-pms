import { NextRequest } from "next/server";
import { z } from "zod";
import { deleteProject, getProject, updateProject } from "@/lib/store";
import { requireAuth, successResponse, errorResponse } from "@/lib/utils";

const updateProjectSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(["planning", "active", "on_hold", "completed", "archived"]).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  deadline: z.string().datetime().optional(),
  coverColor: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const data = await getProject(params.id, (session!.user as any).id, (session!.user as any).role);
  if (!data) return errorResponse("Project not found", 404);

  return successResponse(data);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const role = (session!.user as any).role;
  if (role !== "manager") return errorResponse("Not authorized to update this project", 403);

  const body = await req.json();
  const parsed = updateProjectSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.errors[0].message, 422);

  const project = await updateProject(params.id, parsed.data, (session!.user as any).id);
  if (!project) return errorResponse("Project not found", 404);

  return successResponse(project);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const role = (session!.user as any).role;
  if (role !== "manager") return errorResponse("Only managers can delete projects", 403);

  const deleted = await deleteProject(params.id, (session!.user as any).id);
  if (!deleted) return errorResponse("Project not found", 404);

  return successResponse({ message: "Project deleted successfully" });
}
