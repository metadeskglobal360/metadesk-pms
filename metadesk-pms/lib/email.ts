import { Resend } from "resend";
import nodemailer from "nodemailer";

function usableEnv(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("your_") ||
    lower.startsWith("replace_") ||
    lower.includes("your-") ||
    lower.includes("your_") ||
    lower === "re_your_resend_api_key"
  ) {
    return "";
  }
  return trimmed;
}

const RESEND_API_KEY = usableEnv(process.env.RESEND_API_KEY);
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const SMTP_HOST = usableEnv(process.env.SMTP_HOST);
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = usableEnv(process.env.SMTP_USER);
const SMTP_PASS = usableEnv(process.env.SMTP_PASS);
const SMTP_SECURE = process.env.SMTP_SECURE === "true" || SMTP_PORT === 465;
const FROM = usableEnv(process.env.EMAIL_FROM) || (SMTP_USER ? `Metadesk PMS <${SMTP_USER}>` : "");
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Metadesk PMS";

type EmailSendResult =
  | { sent: true }
  | { sent: false; reason: "missing_email_config" | "send_failed"; message?: string };

export function isEmailDeliveryConfigured() {
  return Boolean((SMTP_HOST && SMTP_USER && SMTP_PASS && FROM) || (resend && FROM));
}

export function requiresRealEmailDelivery() {
  return process.env.NODE_ENV === "production" || process.env.METADESK_REQUIRE_EMAIL_DELIVERY === "true";
}

function baseTemplate(title: string, body: string, ctaText?: string, ctaUrl?: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Inter, Arial, sans-serif; background: #060a14; color: #e2e8f0; margin: 0; padding: 0; }
        .container { max-width: 560px; margin: 40px auto; background: #0d1426; border: 1px solid #1a2640; border-radius: 12px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #2563eb, #0ea5e9); padding: 24px 32px; }
        .header h1 { color: white; margin: 0; font-size: 20px; font-weight: 700; }
        .body { padding: 32px; }
        .body p { color: #94a3b8; line-height: 1.6; margin: 0 0 16px; }
        .cta { display: inline-block; background: #2563eb; color: white !important; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: 700; margin-top: 8px; }
        .footer { padding: 20px 32px; border-top: 1px solid #1a2640; text-align: center; }
        .footer p { color: #64748b; font-size: 13px; margin: 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>${APP_NAME}</h1></div>
        <div class="body">
          <p><strong style="color: #e2e8f0">${title}</strong></p>
          ${body}
          ${ctaText && ctaUrl ? `<a href="${ctaUrl}" class="cta">${ctaText}</a>` : ""}
        </div>
        <div class="footer"><p>Copyright ${new Date().getFullYear()} Metadesk Global. Internal system.</p></div>
      </div>
    </body>
    </html>
  `;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function sendEmail(to: string, subject: string, html: string): Promise<EmailSendResult> {
  if (SMTP_HOST && SMTP_USER && SMTP_PASS && FROM) {
    try {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: FROM,
        to,
        subject,
        html,
      });

      return { sent: true };
    } catch (error) {
      console.error("[EMAIL_SMTP]", error);
      const message = error instanceof Error ? error.message : "SMTP rejected the message";
      return { sent: false, reason: "send_failed", message };
    }
  }

  if (resend) {
    try {
      const result = await resend.emails.send({
        from: FROM,
        to,
        subject,
        html,
      });

      if ((result as any).error) {
        const message = (result as any).error?.message || "Email provider rejected the message";
        console.error("[EMAIL_RESEND]", (result as any).error);
        return { sent: false, reason: "send_failed", message };
      }

      return { sent: true };
    } catch (error) {
      console.error("[EMAIL_RESEND]", error);
      const message = error instanceof Error ? error.message : "Email provider rejected the message";
      return { sent: false, reason: "send_failed", message };
    }
  }

  return { sent: false, reason: "missing_email_config" };
}

export async function sendVerificationOtpEmail(
  to: string,
  userName: string,
  otp: string
): Promise<EmailSendResult> {
  if (process.env.NODE_ENV !== "production") {
    console.info(`[EMAIL VERIFICATION] ${to} OTP: ${otp}`);
  }

  const verificationUrl = `${APP_URL}/verify-email?email=${encodeURIComponent(to)}&code=${encodeURIComponent(otp)}`;
  const safeName = escapeHtml(userName);

  return sendEmail(
    to,
    `${APP_NAME} verification code`,
    baseTemplate(
      "Verify your email address",
      `<p>Hi ${safeName}, use this code to verify your Metadesk PMS account. It expires in 10 minutes.</p>
       <p style="font-size: 28px; letter-spacing: 8px; color: #e2e8f0; font-weight: 700; background: #0a0f1e; padding: 16px 20px; border-radius: 10px; text-align: center;">${otp}</p>
       <p>You can also click the verification button below.</p>
       <p>If you did not create this account, you can ignore this email.</p>`,
      "Verify Email",
      verificationUrl
    )
  );
}

export async function sendTaskAssignedEmail(
  to: string,
  assigneeName: string,
  taskTitle: string,
  projectTitle: string,
  taskId: string
) {
  await sendEmail(
    to,
    `Task assigned: ${taskTitle}`,
    baseTemplate(
      "You've been assigned a task",
      `<p>Hi ${escapeHtml(assigneeName)}, a new task has been assigned to you in <strong style="color: #3c78f0">${escapeHtml(projectTitle)}</strong>.</p>
       <p><strong style="color: #e2e8f0">Task:</strong> ${escapeHtml(taskTitle)}</p>`,
      "View Task",
      `${APP_URL}/tasks/${taskId}`
    )
  );
}

export async function sendDeadlineReminderEmail(
  to: string,
  userName: string,
  taskTitle: string,
  deadline: Date,
  taskId: string
) {
  const deadlineStr = deadline.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  await sendEmail(
    to,
    `Deadline reminder: ${taskTitle} is due soon`,
    baseTemplate(
      "Task deadline approaching",
      `<p>Hi ${escapeHtml(userName)}, the following task is due in less than 24 hours.</p>
       <p><strong style="color: #e2e8f0">Task:</strong> ${escapeHtml(taskTitle)}</p>
       <p><strong style="color: #ef4444">Deadline:</strong> ${escapeHtml(deadlineStr)}</p>`,
      "View Task",
      `${APP_URL}/tasks/${taskId}`
    )
  );
}

export async function sendMentionEmail(
  to: string,
  userName: string,
  mentionedBy: string,
  context: string,
  link: string
) {
  await sendEmail(
    to,
    `${mentionedBy} mentioned you`,
    baseTemplate(
      "You were mentioned",
      `<p>Hi ${escapeHtml(userName)}, <strong style="color: #3c78f0">${escapeHtml(mentionedBy)}</strong> mentioned you in a comment.</p>
       <p style="background: #0a0f1e; padding: 12px 16px; border-radius: 8px; border-left: 3px solid #3c78f0;">"${escapeHtml(context)}"</p>`,
      "View Comment",
      link
    )
  );
}

export async function sendProjectAssignedEmail(
  to: string,
  userName: string,
  projectTitle: string,
  projectId: string
) {
  await sendEmail(
    to,
    `You've been added to: ${projectTitle}`,
    baseTemplate(
      "Added to a new project",
      `<p>Hi ${escapeHtml(userName)}, you've been added as a member of <strong style="color: #3c78f0">${escapeHtml(projectTitle)}</strong>.</p>`,
      "View Project",
      `${APP_URL}/projects/${projectId}`
    )
  );
}
