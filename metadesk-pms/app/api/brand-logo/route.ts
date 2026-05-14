import { readdir, readFile, stat } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SEARCH_DIRS = ["brand", "images"];
const SUPPORTED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".svg", ".webp"];
const PREFERRED_NAMES = ["logo.png", "logo.jpg", "logo.jpeg", "logo.svg", "logo.webp"];

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

async function findLogoFile() {
  const publicDir = path.join(process.cwd(), "public");

  for (const dir of SEARCH_DIRS) {
    const folder = path.join(publicDir, dir);

    try {
      await stat(folder);
      const files = await readdir(folder);
      const imageFiles = files.filter((file) => SUPPORTED_EXTENSIONS.includes(path.extname(file).toLowerCase()));
      const preferred = PREFERRED_NAMES.find((name) => imageFiles.some((file) => file.toLowerCase() === name));
      const selected = preferred || imageFiles[0];

      if (selected) return path.join(folder, selected);
    } catch {
      // Try the next folder.
    }
  }

  return null;
}

export async function GET() {
  const logoPath = await findLogoFile();

  if (!logoPath) {
    return NextResponse.json({ error: "Logo file not found" }, { status: 404 });
  }

  const ext = path.extname(logoPath).toLowerCase();
  const file = await readFile(logoPath);

  return new NextResponse(file, {
    headers: {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": "no-store",
    },
  });
}
