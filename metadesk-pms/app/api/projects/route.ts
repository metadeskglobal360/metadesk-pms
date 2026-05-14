import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, successResponse, errorResponse, getPagination } from "@/lib/utils";
import { createProject, listProjects } from "@/lib/store";

const createProjectSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(2000).optional().default(""),
  members: z.array(z.string()).optional().default([]),
  status: z.enum(["planning", "active", "on_hold", "completed"]).default("planning"),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  startDate: z.string().datetime(),
  deadline: z.string().datetime(),
  tags: z.array(z.string()).optional().default([]),
  coverColor: z.string().optional().default("#3c78f0"),
});

// GET /api/projects — fetch all projects visible to the current user
export async function GET(req: NextRequest) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const { limit, page } = getPagination(searchParams);
  const status = searchParams.get("status");
  const userId = (session!.user as any).id as string;
  const role = (session!.user as any).role;

  return successResponse(await listProjects({ status, page, limit, userId, role }));
}

// POST /api/projects — create a project
export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  const role = (session!.user as any).role;
  if (role !== "manager") {
    return errorResponse("Only managers can create projects", 403);
  }

  try {
    const body = await req.json();
    const parsed = createProjectSchema.safeParse(body);

    if (!parsed.success) return errorResponse(parsed.error.errors[0].message, 422);

    const { title, description, members, status, priority, startDate, deadline, tags, coverColor } =
      parsed.data;

    const project = await createProject({
      title,
      description,
      ownerId: (session!.user as any).id,
      memberIds: members,
      status,
      priority,
      startDate,
      deadline,
      tags,
      coverColor,
    });

    return successResponse(project, 201);
  } catch (err) {
    console.error("[CREATE_PROJECT]", err);
    return errorResponse("Failed to create project", 500);
  }
}
