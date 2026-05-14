import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// ─── Standard API responses ───────────────────────────────
export function successResponse(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

// ─── Auth guard for API routes ────────────────────────────
export async function requireAuth(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return { error: errorResponse("Unauthorized", 401), session: null };
  }
  return { error: null, session };
}

// ─── Role guards ──────────────────────────────────────────
export function isManagerOrAbove(role: string) {
  return role === "manager";
}

// ─── Pagination helper ────────────────────────────────────
export function getPagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") || "20"));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

// ─── Format bytes for display ─────────────────────────────
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// ─── Allowed file types ───────────────────────────────────
export const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-rar-compressed",
  "text/plain",
  "text/csv",
];

export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
