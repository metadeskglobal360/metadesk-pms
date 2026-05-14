"use client";

import { useNotifications } from "@/hooks/useData";
import {
  ArrowRight,
  AtSign,
  Bell,
  Check,
  CheckCircle2,
  FileText,
  FolderKanban,
  ListChecks,
  MessageSquare,
  Reply,
  UserPlus,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type NotificationMeta = {
  label: string;
  icon: typeof Bell;
  tone: string;
  iconTone: string;
};

const NOTIFICATION_META: Record<string, NotificationMeta> = {
  direct_message: {
    label: "Message",
    icon: MessageSquare,
    tone: "bg-sky-50 text-sky-700 border-sky-100",
    iconTone: "bg-sky-100 text-sky-700",
  },
  comment_added: {
    label: "Comment",
    icon: MessageSquare,
    tone: "bg-blue-50 text-blue-700 border-blue-100",
    iconTone: "bg-blue-100 text-blue-700",
  },
  comment_reply: {
    label: "Reply",
    icon: Reply,
    tone: "bg-indigo-50 text-indigo-700 border-indigo-100",
    iconTone: "bg-indigo-100 text-indigo-700",
  },
  comment_mention: {
    label: "Mention",
    icon: AtSign,
    tone: "bg-violet-50 text-violet-700 border-violet-100",
    iconTone: "bg-violet-100 text-violet-700",
  },
  file_uploaded: {
    label: "File",
    icon: FileText,
    tone: "bg-cyan-50 text-cyan-700 border-cyan-100",
    iconTone: "bg-cyan-100 text-cyan-700",
  },
  task_assigned: {
    label: "Task",
    icon: ListChecks,
    tone: "bg-amber-50 text-amber-700 border-amber-100",
    iconTone: "bg-amber-100 text-amber-700",
  },
  task_completed: {
    label: "Completed",
    icon: CheckCircle2,
    tone: "bg-emerald-50 text-emerald-700 border-emerald-100",
    iconTone: "bg-emerald-100 text-emerald-700",
  },
  task_status_changed: {
    label: "Task update",
    icon: ListChecks,
    tone: "bg-orange-50 text-orange-700 border-orange-100",
    iconTone: "bg-orange-100 text-orange-700",
  },
  project_update: {
    label: "Project",
    icon: FolderKanban,
    tone: "bg-blue-50 text-blue-700 border-blue-100",
    iconTone: "bg-blue-100 text-blue-700",
  },
  project_assigned: {
    label: "Project",
    icon: FolderKanban,
    tone: "bg-teal-50 text-teal-700 border-teal-100",
    iconTone: "bg-teal-100 text-teal-700",
  },
  account_request: {
    label: "Access request",
    icon: UserPlus,
    tone: "bg-pink-50 text-pink-700 border-pink-100",
    iconTone: "bg-pink-100 text-pink-700",
  },
};

export default function NotificationsPage() {
  const { data, isLoading } = useNotifications();
  const qc = useQueryClient();
  const router = useRouter();

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  const markAllRead = useMutation({
    mutationFn: async () => {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  async function openNotification(notification: any) {
    if (!notification.isRead) {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notification._id }),
      });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    }

    router.push(notification.link || "/dashboard");
  }

  return (
    <div className="animate-fade-in">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-primary">Workspace</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Notifications</h1>
            <p className="mt-1 text-sm text-brand-muted">Activity from messages, tasks, projects, files, and account requests.</p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-brand-primary/30 hover:text-brand-primary disabled:opacity-60"
              disabled={markAllRead.isPending}
            >
              <Check size={15} />
              Mark all read
            </button>
          )}
        </header>

        <section className="card overflow-hidden rounded-[28px]">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary">
                <Bell size={20} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-950">Notification center</h2>
                <p className="text-xs text-brand-muted">Auto-refreshes while your workspace is open.</p>
              </div>
            </div>
            {unreadCount > 0 && (
              <span className="rounded-full bg-brand-primary px-2.5 py-1 text-xs font-semibold text-white">
                {unreadCount} new
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3 p-5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center p-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-500">
                <Bell size={30} />
              </div>
              <p className="text-lg font-semibold text-slate-950">You are all caught up</p>
              <p className="mt-1 max-w-sm text-sm leading-6 text-brand-muted">
                New comments, uploads, task updates, and messages will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3 p-4 sm:p-5">
              {notifications.map((notification: any) => (
                <NotificationRow
                  key={notification._id}
                  notification={notification}
                  onOpen={() => openNotification(notification)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function NotificationRow({ notification, onOpen }: { notification: any; onOpen: () => void }) {
  const meta = NOTIFICATION_META[notification.type] || {
    label: "Update",
    icon: Bell,
    tone: "bg-slate-100 text-slate-600 border-slate-100",
    iconTone: "bg-slate-100 text-slate-600",
  };
  const Icon = meta.icon;
  const senderName = notification.sender?.name || "Metadesk PMS";

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`notification-row group flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-brand-primary/30 hover:shadow-[0_16px_45px_rgba(15,23,42,0.08)] ${
        notification.isRead
          ? "notification-row-read border-slate-100 bg-slate-50/70"
          : "notification-row-unread border-blue-100 bg-gradient-to-r from-blue-50 to-white"
      }`}
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${meta.iconTone}`}>
        <Icon size={19} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.tone}`}>
            {meta.label}
          </span>
          {!notification.isRead && (
            <span className="rounded-full bg-brand-primary/10 px-2 py-1 text-[11px] font-semibold text-brand-primary">
              New
            </span>
          )}
        </div>
        <p className="mt-3 text-sm font-medium leading-6 text-slate-950">{notification.message}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-brand-muted">
          <span>{senderName}</span>
          <span>{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 pt-1">
        {!notification.isRead && <span className="h-2.5 w-2.5 rounded-full bg-brand-primary" />}
        <ArrowRight size={17} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-primary" />
      </div>
    </button>
  );
}
