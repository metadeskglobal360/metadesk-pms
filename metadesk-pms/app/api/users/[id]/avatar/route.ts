import { NextRequest, NextResponse } from "next/server";
import { getUserAvatarData } from "@/lib/store";
import { errorResponse, requireAuth } from "@/lib/utils";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAuth(req);
  if (error) return error;

  const dataUrl = await getUserAvatarData(params.id);
  if (!dataUrl) return errorResponse("Avatar not found", 404);

  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!match?.[2]) return errorResponse("Avatar not found", 404);

  return new NextResponse(new Uint8Array(Buffer.from(match[2], "base64")), {
    headers: {
      "Content-Type": match[1] || "image/png",
      "Cache-Control": "no-store",
    },
  });
}
