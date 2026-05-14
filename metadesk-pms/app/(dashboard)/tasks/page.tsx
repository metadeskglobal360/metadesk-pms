"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  Calendar,
  CheckSquare,
  LayoutGrid,
  List,
  MessageSquare,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import { formatExactDateTime } from "@/lib/date-format";
import { useNotifications } from "@/hooks/useData";

const KANBAN_COLUMNS = [
  { id: "todo",        label: "To Do",       dot: "bg-slate-400",   badge: "bg-slate-100 text-slate-600"   },
  { id: "in_progress", label: "In Progress", dot: "bg-sky-500",     badge: "bg-sky-100 text-sky-700"       },
  { id: "review",      label: "In Review",   dot: "bg-amber-500",   badge: "bg-amber-100 text-amber-700"   },
  { id: "done",        label: "Done",        dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700"},
];

const STATUS_LABELS: Record<string, string> = {
  todo: "To do",
  in_progress: "In progress",
  review: "Review",
  done: "Done",
};

const STATUS_STYLES: Record<string, string> = {
  todo:        "bg-slate-100 text-slate-600",
  in_progress: "bg-sky-100 text-sky-700",
  review:      "bg-amber-100 text-amber-700",
  done:        "bg-emerald-100 text-emerald-700",
};

const PRIORITY_BADGE: Record<string, string> = {
  low:      "bg-emerald-50 text-emerald-700",
  medium:   "bg-amber-50 text-amber-700",
  high:     "bg-orange-50 text-orange-700",
  critical: "bg-red-50 text-red-700",
};

const PRIORITY_DOT: Record<string, string> = {
  low:      "bg-emerald-500",
  medium:   "bg-amber-400",
  high:     "bg-orange-500",
  critical: "bg-rose-500",
};

export default function TasksPage() {
  const [status, setStatus]       = useState("");
  const [search, setSearch]       = useState("");
  const [taskScope, setTaskScope] = useState("all");
  const [view, setView]           = useState<"list" | "board">("board");
  const router                    = useRouter();
  const searchParams              = useSearchParams();
  const { data: session }         = useSession();
  const role                      = (session?.user as any)?.role || "employee";
  const canCreate                 = role === "manager";
  const qc                        = useQueryClient();
  const { data: notificationData } = useNotifications();

  useEffect(() => {
    const scope = searchParams.get("scope");
    if (scope === "standalone" || scope === "project") setTaskScope(scope);
    else setTaskScope("all");
  }, [searchParams]);

  function selectTaskScope(scope: string) {
    setTaskScope(scope);
    router.replace(scope === "all" ? "/tasks" : `/tasks?scope=${scope}`, { scroll: false });
  }

  const { data, isLoading } = useQuery({
    queryKey: ["tasks"],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const res  = await fetch("/api/tasks");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const tasks = useMemo(() => data?.tasks || [], [data?.tasks]);

  const tasksWithUnreadComments = useMemo(() => {
    const taskIds = new Set<string>();
    (notificationData?.notifications || []).forEach((n: any) => {
      if (n.isRead) return;
      if (n.type !== "comment_added" && n.type !== "comment_reply") return;
      const match = n.link?.match(/^\/tasks\/([^/?#]+)/);
      if (match?.[1]) taskIds.add(match[1]);
    });
    return taskIds;
  }, [notificationData?.notifications]);

  const filteredTasks = useMemo(() => {
    const term = search.toLowerCase().trim();
    return tasks.filter((task: any) => {
      if (taskScope === "project"    && !task.project) return false;
      if (taskScope === "standalone" &&  task.project) return false;
      if (!term) return true;
      const assignees = (task.assignedTo || []).map((u: any) => u.name).join(" ");
      return [task.title, task.description, task.project?.title, task.status, task.priority, assignees]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [search, taskScope, tasks]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, nextStatus }: { id: string; nextStatus: string }) => {
      const res  = await fetch(`/api/tasks/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError:   (err: Error) => toast.error(err.message),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function confirmDeleteTask(task: any) {
    if (!canCreate) return;
    if (window.confirm(`Delete task "${task.title}"?`)) deleteTask.mutate(task._id);
  }

  const STATUS_TABS = [
    { value: "",            label: "All",         count: filteredTasks.length },
    { value: "todo",        label: "To Do",       count: filteredTasks.filter((t: any) => t.status === "todo").length },
    { value: "in_progress", label: "In Progress", count: filteredTasks.filter((t: any) => t.status === "in_progress").length },
    { value: "review",      label: "In Review",   count: filteredTasks.filter((t: any) => t.status === "review").length },
    { value: "done",        label: "Done",        count: filteredTasks.filter((t: any) => t.status === "done").length },
  ];

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.22em] text-brand-primary">Delivery</p>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            {taskScope === "standalone" ? "Standalone Tasks" : taskScope === "project" ? "Project Tasks" : "Tasks"}
          </h1>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              className="input-base h-9 w-full pl-9 text-sm"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Scope buttons */}
          <div className="flex max-w-full items-center overflow-x-auto rounded-lg border border-slate-200 bg-white">
            {[
              { value: "all",        label: "All"        },
              { value: "project",    label: "Project"    },
              { value: "standalone", label: "Standalone" },
            ].map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => selectTaskScope(s.value)}
                className={`px-3 py-2 text-[13px] font-medium transition-colors ${
                  taskScope === s.value
                    ? "bg-brand-primary text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* View toggle */}
          <div className="flex max-w-full items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => setView("board")}
              className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition-colors ${
                view === "board" ? "bg-brand-primary text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
              title="Board view"
            >
              <LayoutGrid size={15} /> Board
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition-colors ${
                view === "list" ? "bg-brand-primary text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
              title="List view"
            >
              <List size={15} /> List
            </button>
          </div>

          {canCreate && (
            <Link
              href="/tasks/new"
              className="btn-primary inline-flex h-9 w-full items-center justify-center gap-1.5 text-sm sm:w-auto"
            >
              <Plus size={15} /> New task
            </Link>
          )}
        </div>
      </div>

      {/* Status filter tabs (list view only) */}
      {view === "list" && (
        <div className="flex items-center gap-1 overflow-x-auto">
          {STATUS_TABS.map(({ value, label, count }) => (
            <button
              key={value || "all"}
              type="button"
              onClick={() => setStatus(value)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                status === value
                  ? "bg-brand-primary text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label}
              <span className={`rounded-full px-1.5 py-px text-[11px] font-bold ${
                status === value ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ===== BOARD VIEW ===== */}
      {view === "board" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter((t: any) => {
              if (status && t.status !== status) return false;
              return t.status === col.id;
            });

            return (
              <div
                key={col.id}
                className="flex-shrink-0 w-72 rounded-2xl bg-slate-50 p-3 animate-fade-in"
              >
                {/* Column header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                    <span className="text-sm font-semibold text-slate-800">{col.label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${col.badge}`}>
                      {colTasks.length}
                    </span>
                  </div>
                  {canCreate && (
                    <Link
                      href="/tasks/new"
                      className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-brand-primary transition-colors"
                      title="Add task"
                    >
                      <Plus size={15} />
                    </Link>
                  )}
                </div>

                {/* Cards */}
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-28 animate-pulse rounded-xl bg-white/70" />
                    ))}
                  </div>
                ) : colTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <CheckSquare size={24} className="mb-2 text-slate-300" />
                    <p className="text-xs text-slate-400">No tasks</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {colTasks.map((task: any) => (
                      <KanbanCard
                        key={task._id}
                        task={task}
                        hasUnread={tasksWithUnreadComments.has(task._id)}
                        canDelete={canCreate}
                        onDelete={() => confirmDeleteTask(task)}
                        onStatusChange={(nextStatus) =>
                          updateStatus.mutate({ id: task._id, nextStatus })
                        }
                      />
                    ))}
                  </div>
                )}

                {/* Add task button */}
                {canCreate && (
                  <Link
                    href="/tasks/new"
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2.5 text-xs font-medium text-slate-400 transition-colors hover:border-brand-primary hover:text-brand-primary hover:bg-white"
                  >
                    <Plus size={13} />
                    Add task
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ===== LIST VIEW ===== */}
      {view === "list" && (
        <div className="card overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-950">
              {taskScope === "project" ? "Project Tasks" : taskScope === "standalone" ? "Standalone Tasks" : canCreate ? "All Tasks" : "Assigned To Me"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
              {status ? ` - ${STATUS_LABELS[status]}` : ""}
            </p>
          </div>

          {isLoading ? (
            <div className="divide-y divide-slate-200">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 animate-pulse bg-white" />
              ))}
            </div>
          ) : filteredTasks.filter((t: any) => !status || t.status === status).length === 0 ? (
            <div className="p-12 text-center">
              <CheckSquare size={32} className="mx-auto mb-3 text-slate-400" />
              <p className="font-medium text-slate-950">No tasks found</p>
              <p className="text-sm text-brand-muted">Try a different search or status filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Task</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Assigned to</th>
                    <th className="px-5 py-4">Priority</th>
                    <th className="px-5 py-4">Due date</th>
                    <th className="px-5 py-4">Update</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredTasks
                    .filter((t: any) => !status || t.status === status)
                    .map((task: any) => {
                      const isOverdue      = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";
                      const assignees      = task.assignedTo || [];
                      const hasUnread      = tasksWithUnreadComments.has(task._id);

                      return (
                        <tr key={task._id} className={hasUnread ? "bg-blue-50/40 hover:bg-blue-50" : "hover:bg-slate-50"}>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <span className={`h-2 w-2 rounded-full shrink-0 ${PRIORITY_DOT[task.priority] || PRIORITY_DOT.medium}`} />
                              <Link href={`/tasks/${task._id}`} className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className={`font-medium ${task.status === "done" ? "text-slate-400 line-through" : "text-slate-950"}`}>
                                    {task.title}
                                  </p>
                                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                    task.project ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-700"
                                  }`}>
                                    {task.project ? "Project" : "Standalone"}
                                  </span>
                                  {hasUnread && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-primary px-2 py-0.5 text-[11px] font-semibold text-white">
                                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                                      New comment
                                    </span>
                                  )}
                                </div>
                                <p className="mt-0.5 truncate text-xs text-brand-muted">
                                  {task.project?.title || "Direct assignment"}
                                </p>
                              </Link>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex rounded-lg px-3 py-1 text-xs font-medium ${STATUS_STYLES[task.status]}`}>
                              {STATUS_LABELS[task.status] || task.status}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {assignees.length === 0 ? (
                              <span className="text-sm text-brand-muted">Unassigned</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="flex -space-x-2">
                                  {assignees.slice(0, 3).map((u: any) => (
                                    <AvatarCircle key={u.id} user={u} />
                                  ))}
                                </div>
                                <span className="truncate text-sm text-slate-700">
                                  {assignees[0]?.name}{assignees.length > 1 ? ` +${assignees.length - 1}` : ""}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.medium}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[task.priority] || PRIORITY_DOT.medium}`} />
                              {task.priority}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {task.dueDate ? (
                              <div className="space-y-0.5">
                                <div className={`flex items-center gap-1.5 text-xs font-medium ${isOverdue ? "text-red-600" : "text-slate-700"}`}>
                                  {isOverdue ? <AlertCircle size={12} /> : <Calendar size={12} />}
                                  {formatExactDateTime(task.dueDate)}
                                </div>
                                <p className={`text-xs ${isOverdue ? "text-red-400" : "text-slate-400"}`}>
                                  {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                                </p>
                              </div>
                            ) : (
                              <span className="text-xs text-brand-muted">No date</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <select
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-brand-primary"
                                value={task.status}
                                onChange={(e) => updateStatus.mutate({ id: task._id, nextStatus: e.target.value })}
                              >
                                <option value="todo">To do</option>
                                <option value="in_progress">In progress</option>
                                <option value="review">Review</option>
                                <option value="done">Done</option>
                              </select>
                              {canCreate && (
                                <button
                                  type="button"
                                  onClick={() => confirmDeleteTask(task)}
                                  disabled={deleteTask.isPending}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                                  title="Delete task"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Kanban Card ─────────────────────────────────────── */
function KanbanCard({
  task,
  hasUnread,
  canDelete,
  onDelete,
  onStatusChange,
}: {
  task: any;
  hasUnread: boolean;
  canDelete: boolean;
  onDelete: () => void;
  onStatusChange: (status: string) => void;
}) {
  const assignees = task.assignedTo || [];
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";

  return (
    <div className={`group rounded-xl border bg-white p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all ${
      hasUnread ? "border-brand-primary/40 bg-blue-50/30" : "border-slate-200"
    }`}>
      {/* Priority + project label */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
          PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.medium
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[task.priority] || PRIORITY_DOT.medium}`} />
          {task.priority}
        </span>
        <div className="flex items-center gap-1">
          {hasUnread && (
            <span className="rounded-full bg-brand-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
              New
            </span>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg p-1 text-slate-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
              title="Delete task"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <Link href={`/tasks/${task._id}`}>
        <h3 className={`text-sm font-semibold leading-snug hover:text-brand-primary transition-colors ${
          task.status === "done" ? "line-through text-slate-400" : "text-slate-900"
        }`}>
          {task.title}
        </h3>
      </Link>

      {/* Project */}
      <p className="mt-0.5 text-[11px] text-slate-400 truncate">
        {task.project?.title || "Standalone task"}
      </p>

      {/* Due date */}
      {task.dueDate && (
        <div className={`mt-2 flex items-center gap-1 text-[11px] ${isOverdue ? "text-red-500" : "text-slate-400"}`}>
          <Calendar size={11} />
          <span>{formatExactDateTime(task.dueDate)}</span>
        </div>
      )}

      {/* Bottom row */}
      <div className="mt-3 flex items-center justify-between">
        {/* Assignees */}
        <div className="flex -space-x-1.5">
          {assignees.slice(0, 3).map((u: any) => (
            <div
              key={u.id}
              className="h-6 w-6 rounded-full border-2 border-white bg-gradient-to-br from-blue-400 to-brand-primary flex items-center justify-center text-[10px] font-bold text-white"
              title={u.name}
            >
              {u.name?.charAt(0)?.toUpperCase()}
            </div>
          ))}
          {assignees.length > 3 && (
            <div className="h-6 w-6 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-semibold text-slate-600">
              +{assignees.length - 3}
            </div>
          )}
          {assignees.length === 0 && (
            <span className="text-[11px] text-slate-400">Unassigned</span>
          )}
        </div>

        {/* Quick status change */}
        <select
          className="rounded-lg border-0 bg-transparent text-[11px] text-slate-400 outline-none cursor-pointer hover:text-slate-700 transition-colors"
          value={task.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          <option value="todo">To do</option>
          <option value="in_progress">In progress</option>
          <option value="review">In review</option>
          <option value="done">Done</option>
        </select>
      </div>
    </div>
  );
}

/* ─── Avatar ──────────────────────────────────────────── */
function AvatarCircle({ user }: { user: any }) {
  const initials = user.name?.split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="h-7 w-7 overflow-hidden rounded-full border-2 border-white bg-blue-100 text-[11px] font-semibold text-brand-primary">
      {user.avatar ? (
        <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">{initials || "U"}</div>
      )}
    </div>
  );
}
