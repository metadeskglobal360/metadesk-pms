import { NextRequest } from "next/server";
import { createDepartment, listDepartments } from "@/lib/store";
import { errorResponse, requireAuth, successResponse } from "@/lib/utils";
import { normalizeDepartmentName } from "@/lib/departments";

export async function GET() {
  return successResponse({ departments: await listDepartments() });
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth(req);
  if (error) return error;

  if ((session!.user as any).role !== "manager") {
    return errorResponse("Only managers can add departments", 403);
  }

  const body = await req.json();
  const name = normalizeDepartmentName(String(body.name || ""));
  if (name.length < 2 || name.length > 50) {
    return errorResponse("Department name must be 2-50 characters", 422);
  }

  const department = await createDepartment(name);
  if (!department) return errorResponse("Could not create department", 500);
  return successResponse(department, 201);
}
