import { NextRequest } from "next/server";
import { z } from "zod";
import { successResponse, errorResponse } from "@/lib/utils";
import { createUser } from "@/lib/store";

const ALLOWED_EMAIL_DOMAINS = new Set([
  "metadeskglobal.com",
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
]);

function isAllowedEmailDomain(email: string) {
  const domain = email.split("@")[1]?.toLowerCase();
  return Boolean(domain && ALLOWED_EMAIL_DOMAINS.has(domain));
}

const registerSchema = z.object({
  name: z.string().min(2).max(50),
  username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/, "Lowercase letters, numbers, underscores only"),
  email: z
    .string()
    .email()
    .transform((email) => email.toLowerCase())
    .refine(isAllowedEmailDomain, {
      message: "Use @metadeskglobal.com, @gmail.com, @yahoo.com, @outlook.com, or @hotmail.com",
    }),
  password: z.string().min(8, "Password must be at least 8 characters"),
  team: z.string().min(2).max(50),
  designation: z.string().min(2).max(100),
});

function isMongoConnectionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return (
    message.includes("MongooseServerSelectionError") ||
    message.includes("Could not connect to any servers") ||
    message.includes("IP") && message.includes("whitelist")
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0].message, 422);
    }

    const { name, username, email, password, team, designation } = parsed.data;

    const { user, error: duplicateField } = await createUser({
      name,
      username,
      email,
      password,
      team,
      designation,
      role: "employee",
      approvalStatus: "pending",
    });

    if (duplicateField) {
      return errorResponse(`${duplicateField} is already registered`, 409);
    }
    if (!user) return errorResponse("Unable to create account", 500);

    return successResponse(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
        requiresApproval: true,
      },
      201
    );
  } catch (err) {
    console.error("[REGISTER]", err);
    if (isMongoConnectionError(err)) {
      return errorResponse("Database is not reachable. Add your current IP address in MongoDB Atlas Network Access, then restart the app.", 503);
    }
    return errorResponse("Something went wrong", 500);
  }
}
