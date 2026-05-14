"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, CheckSquare, Download, MessageSquare, Paperclip, Reply, Search, Trash2, Upload, UserPlus, Users, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import MentionInput, { type MentionUser } from "@/components/MentionInput";
import { formatDateTimeInputValue, formatExactDateTime } from "@/lib/date-format";
import { useCurrentUser } from "@/hooks/useData";

export default function TaskDetailPage({ params }: { params: { id: string } }) {
  const qc = useQueryClient();
  const router = useRouter();
  const { data: session } = useSession();
  const { data: currentUser } = useCurrentUser();
  const liveUser = (currentUser || session?.user) as any;
  const role = liveUser?.role || "employee";
  const currentUserId = liveUser?.id;
  const canManage = role === "manager";
  const [comment, setComment] = useState("");
  const [replyingToComment, setReplyingToComment] = useState<any>(null);
  const [editingComment, setEditingComment] = useState<any>(null);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["task", params.id],
    staleTime: 0,
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${params.id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    refetchInterval: 3_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const { data: mentionData } = useQuery({
    queryKey: ["mentions"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch("/api/mentions");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as { users: MentionUser[] };
    },
  });

  const { data: projectData } = useQuery({
    queryKey: ["projects", "task-edit"],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch("/api/projects?limit=50");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: canManage,
  });
  const task = data?.task;

  useEffect(() => {
    fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ link: `/tasks/${params.id}` }),
    }).then(() => qc.invalidateQueries({ queryKey: ["notifications"] }));
  }, [params.id, qc]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [data?.comments?.length, params.id]);

  const updateTask = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(`/api/tasks/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task", params.id] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addComment = useMutation({
    mutationFn: async ({ body, replyTo }: { body: string; replyTo?: any }) => {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: params.id, body, replyTo: replyTo?._id }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onMutate: async ({ body, replyTo }) => {
      const queryKey = ["task", params.id];
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData(queryKey);
      const createdAt = new Date().toISOString();
      const optimisticComment = {
        _id: `temp-${createdAt}`,
        task: params.id,
        author: {
          id: currentUserId,
          name: liveUser?.name || "You",
          avatar: liveUser?.avatar || "",
          designation: liveUser?.designation || "",
        },
        body,
        mentions: [],
        replyTo: replyTo ? { id: replyTo._id, body: replyTo.body, authorName: replyTo.author?.name || "Comment" } : undefined,
        isEdited: false,
        createdAt,
      };

      qc.setQueryData(queryKey, (current: any) => {
        if (!current) return current;
        return { ...current, comments: [...(current.comments || []), optimisticComment] };
      });
      setComment("");
      setReplyingToComment(null);
      setEditingComment(null);
      return { previous, queryKey };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task", params.id] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err: Error, _vars, context: any) => {
      if (context?.queryKey) qc.setQueryData(context.queryKey, context.previous);
      toast.error(err.message);
    },
  });

  const updateComment = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/comments/${editingComment._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: comment }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      setComment("");
      setEditingComment(null);
      qc.invalidateQueries({ queryKey: ["task", params.id] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      setReplyingToComment(null);
      setEditingComment(null);
      qc.invalidateQueries({ queryKey: ["task", params.id] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteTask = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tasks/${params.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      router.push(task?.project?._id ? `/projects/${task.project._id}` : "/tasks?scope=standalone");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  async function uploadFile(file?: File) {
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    const res = await fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: params.id, fileName: file.name, mimeType: file.type || "application/octet-stream", size: file.size, dataUrl }),
    });
    const json = await res.json();
    if (!json.success) return toast.error(json.error || "Upload failed");
    qc.invalidateQueries({ queryKey: ["task", params.id] });
  }

  if (isLoading) return <div className="card p-6 h-48 animate-pulse" />;

  if (!task) {
    return (
      <div className="card p-8">
        <p className="text-white font-medium">Task not found</p>
        <Link href="/tasks" className="text-brand-primary text-sm mt-2 inline-block">Back to tasks</Link>
      </div>
    );
  }
  const mentionUsers = mentionData?.users || task.assignedTo || [];
  const taskComments = [...(data.comments || [])].sort((a: any, b: any) => +new Date(a.createdAt) - +new Date(b.createdAt));
  const projects = projectData?.projects || [];
  const selectedAssigneeIds = new Set<string>((task.assignedTo || []).map((user: any) => user.id));
  const selectedAssignees = task.assignedTo || [];
  const availableAssignees = mentionUsers.filter((user: any) => {
    const term = assigneeSearch.toLowerCase().trim();
    const matchesSearch =
      !term ||
      [user.name, user.email, user.designation, user.team].some((value: string) =>
        String(value || "").toLowerCase().includes(term)
      );
    return !selectedAssigneeIds.has(user.id) && matchesSearch;
  });

  function updateAssignees(nextIds: string[]) {
    updateTask.mutate({ assignedTo: nextIds });
  }

  function addAssignee(id: string) {
    if (selectedAssigneeIds.has(id)) return;
    updateAssignees([...Array.from(selectedAssigneeIds), id]);
    setAssigneeSearch("");
  }

  function removeAssignee(id: string) {
    updateAssignees(Array.from(selectedAssigneeIds).filter((item) => item !== id));
  }

  function submitComment() {
    if (!comment.trim() || addComment.isPending || updateComment.isPending) return;
    if (editingComment) {
      updateComment.mutate();
      return;
    }
    addComment.mutate({ body: comment.trim(), replyTo: replyingToComment });
  }

  return (
    <div className="space-y-6">
      <Link href="/tasks" className="inline-flex items-center gap-2 text-sm text-brand-muted hover:text-white">
        <ArrowLeft size={16} /> Tasks
      </Link>

      <div className="card p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">{task.title}</h1>
            <p className="text-brand-muted mt-2 max-w-3xl">{task.description || "No description"}</p>
          </div>
          <select
            className="input-base lg:w-44"
            value={task.status}
            onChange={(e) => updateTask.mutate({ status: e.target.value })}
          >
            <option value="todo">To do</option>
            <option value="in_progress">In progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6">
          <Info label="Project" value={task.project?.title || "No project"} />
          <Info label="Priority" value={task.priority} />
          <Info label="Target completion" value={task.dueDate ? formatExactDateTime(task.dueDate) : "No date"} icon={<Calendar size={15} />} />
          {task.completedAt && <Info label="Completed at" value={formatExactDateTime(task.completedAt)} />}
          <Info label="Hours" value={`${task.loggedHours || 0}${task.estimatedHours ? ` / ${task.estimatedHours}` : ""}`} />
          <Info label="Assigned" value={task.assignedTo?.length ? `${task.assignedTo.length} people` : "Unassigned"} icon={<Users size={15} />} />
        </div>

        {canManage && (
          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-semibold text-slate-950">Manager controls</h2>
              <button
                type="button"
                onClick={() => window.confirm(`Delete task "${task.title}"?`) && deleteTask.mutate()}
                disabled={deleteTask.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
              >
                <Trash2 size={13} /> Delete task
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">Project</label>
                <select
                  className="input-base"
                  value={task.project?._id || ""}
                  onChange={(event) => updateTask.mutate({ project: event.target.value || null })}
                >
                  <option value="">Standalone task</option>
                  {projects.map((project: any) => (
                    <option key={project._id} value={project._id}>{project.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">Priority</label>
                <select className="input-base" value={task.priority} onChange={(event) => updateTask.mutate({ priority: event.target.value })}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">Completion target</label>
                <input
                  type="datetime-local"
                  className="input-base"
                  value={formatDateTimeInputValue(task.dueDate)}
                  onChange={(event) => updateTask.mutate({ dueDate: event.target.value ? new Date(event.target.value).toISOString() : null })}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">Estimated hours</label>
                <input
                  type="number"
                  min="0"
                  className="input-base"
                  value={task.estimatedHours || ""}
                  onChange={(event) => updateTask.mutate({ estimatedHours: event.target.value ? Number(event.target.value) : null })}
                  placeholder="No estimate"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="card p-6">
          <h2 className="text-white font-medium mb-4 flex items-center gap-2">
            <Users size={17} /> Assigned To
          </h2>
          {canManage ? (
            <div className="space-y-4">
              <div className="space-y-2">
                {selectedAssignees.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-brand-muted">
                    No one is assigned yet.
                  </div>
                ) : (
                  selectedAssignees.map((user: any) => (
                    <div key={user.id} className="flex w-full items-center gap-3 rounded-lg border border-brand-primary/40 bg-blue-50 p-3">
                    <Avatar user={user} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-950">{user.name}</span>
                      <span className="block truncate text-xs text-brand-muted">{user.designation}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAssignee(user.id)}
                      disabled={updateTask.isPending}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>
                  ))
                )}
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Add members
                </label>
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                  <input
                    className="input-base pl-9"
                    placeholder="Search by name, role, or department"
                    value={assigneeSearch}
                    onChange={(event) => setAssigneeSearch(event.target.value)}
                  />
                </div>
                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {availableAssignees.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-sm text-brand-muted">
                      No more available members.
                    </p>
                  ) : (
                    availableAssignees.map((user: any) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => addAssignee(user.id)}
                        disabled={updateTask.isPending}
                        className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left transition-colors hover:border-brand-primary disabled:opacity-50"
                      >
                        <Avatar user={user} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-950">{user.name}</span>
                          <span className="block truncate text-xs text-brand-muted">
                            {[user.designation, user.team].filter(Boolean).join(" - ")}
                          </span>
                        </span>
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-primary text-white">
                          <UserPlus size={15} />
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : !task.assignedTo?.length ? (
            <p className="text-brand-muted text-sm">No assignees selected.</p>
          ) : (
            <div className="space-y-3">
              {task.assignedTo.map((user: any) => (
                <div key={user.id} className="rounded-lg border border-brand-border bg-brand-dark p-4 flex items-center gap-3">
                  <Avatar user={user} />
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{user.name}</p>
                    <p className="text-brand-muted text-xs truncate">{user.designation}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="text-white font-medium mb-4 flex items-center gap-2">
            <CheckSquare size={17} /> Subtasks
          </h2>
          {task.subtasks.length === 0 ? (
            <p className="text-brand-muted text-sm">No subtasks yet.</p>
          ) : (
            <div className="space-y-2">
              {task.subtasks.map((subtask: any) => (
                <button
                  key={subtask._id}
                  onClick={() => updateTask.mutate({ subtaskId: subtask._id })}
                  className="w-full flex items-center gap-3 rounded-lg border border-brand-border bg-brand-dark p-3 text-left"
                >
                  <span className={`w-4 h-4 rounded border ${subtask.isCompleted ? "bg-brand-primary border-brand-primary" : "border-brand-muted"}`} />
                  <span className={subtask.isCompleted ? "line-through text-brand-muted" : "text-slate-200"}>{subtask.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="text-white font-medium mb-4 flex items-center gap-2">
            <Paperclip size={17} /> Files
          </h2>
          <label className="btn-primary inline-flex items-center gap-2 text-sm cursor-pointer mb-4">
            <Upload size={15} /> Upload file
            <input type="file" className="hidden" onChange={(e) => uploadFile(e.target.files?.[0])} />
          </label>
          <div className="space-y-2">
            {data.files.length === 0 ? (
              <p className="text-brand-muted text-sm">No files uploaded.</p>
            ) : (
              data.files.map((file: any) => (
                <a key={file._id} href={`/api/files/${file._id}`} className="group flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 hover:border-brand-primary hover:bg-white">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-950">{file.fileName}</p>
                    <p className="text-xs text-slate-500">{file.fileType} - {Math.round(file.size / 1024)} KB</p>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 group-hover:bg-brand-primary group-hover:text-white">
                    <Download size={16} />
                  </span>
                </a>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card flex min-h-[560px] flex-col overflow-hidden p-0">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <MessageSquare size={18} /> Comments
          </h2>
          <p className="text-sm text-brand-muted">Task: {task.title}</p>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50 p-5">
          {taskComments.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <MessageSquare size={28} className="mx-auto mb-3 text-slate-300" />
              <p className="font-medium text-slate-600">No comments yet</p>
              <p className="mt-1 text-sm text-slate-400">Start the task conversation.</p>
            </div>
          ) : (
            <>
              {taskComments.map((item: any) => (
                <TaskCommentBubble
                  key={item._id}
                  item={item}
                  taskTitle={task.title}
                  currentUserId={currentUserId}
                  canManage={canManage}
                  onReply={() => {
                    setEditingComment(null);
                    setReplyingToComment(item);
                  }}
                  onEdit={() => {
                    setReplyingToComment(null);
                    setEditingComment(item);
                    setComment(item.body);
                  }}
                  onDelete={() => window.confirm("Delete this comment for everyone?") && deleteComment.mutate(item._id)}
                />
              ))}
              <div ref={commentsEndRef} />
            </>
          )}
        </div>

        <div className="border-t border-slate-200 bg-white px-6 py-4">
          {replyingToComment && (
            <div className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="min-w-0 border-l-4 border-brand-primary pl-3">
                <p className="text-xs font-semibold text-slate-950">Replying to {replyingToComment.author?.name || "comment"}</p>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{replyingToComment.body}</p>
              </div>
              <button type="button" onClick={() => setReplyingToComment(null)} className="rounded-lg p-1 text-slate-500 hover:bg-white hover:text-slate-950">
                <X size={16} />
              </button>
            </div>
          )}
          {editingComment && (
            <div className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
              <div className="min-w-0 border-l-4 border-brand-primary pl-3">
                <p className="text-xs font-semibold text-slate-950">Editing comment</p>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{editingComment.body}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingComment(null);
                  setComment("");
                }}
                className="rounded-lg p-1 text-slate-500 hover:bg-white hover:text-slate-950"
              >
                <X size={16} />
              </button>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Avatar user={session?.user} />
            <MentionInput
              value={comment}
              onChange={setComment}
              users={mentionUsers}
              placeholder="Write a task comment. Type @ to mention someone..."
              onSubmit={submitComment}
            />
            <button
              className="btn-primary h-12 shrink-0 rounded-full px-5"
              onClick={submitComment}
              disabled={!comment.trim() || addComment.isPending || updateComment.isPending}
            >
              {editingComment ? "Save" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function Info({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="bg-brand-dark border border-brand-border rounded-lg p-4">
      <p className="text-brand-muted text-sm">{label}</p>
      <p className="text-white capitalize mt-1 flex items-center gap-2">
        {icon} {value}
      </p>
    </div>
  );
}

function Avatar({ user }: { user: any }) {
  const initials = user?.name
    ?.split(" ")
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="h-10 w-10 overflow-hidden rounded-lg border border-brand-border bg-brand-primary/15 text-brand-primary flex items-center justify-center text-sm font-semibold shrink-0">
      {user?.avatar ? <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" /> : initials || "U"}
    </div>
  );
}

function TaskCommentBubble({
  item,
  taskTitle,
  currentUserId,
  canManage,
  onReply,
  onEdit,
  onDelete,
}: {
  item: any;
  taskTitle: string;
  currentUserId: string;
  canManage: boolean;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const mine = item.author?.id === currentUserId;
  const canDelete = mine || canManage;

  return (
    <div className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
      {!mine && <Avatar user={item.author} />}

      <div className={`group max-w-[78%] ${mine ? "text-right" : "text-left"}`}>
        <div className={`mb-1 flex flex-wrap items-center gap-2 text-xs text-slate-400 ${mine ? "justify-end" : "justify-start"}`}>
          <span className="font-semibold text-slate-700">{mine ? "You" : item.author?.name || "User"}</span>
          <span>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-brand-primary">
            {taskTitle}
          </span>
        </div>

        {item.replyTo && (
          <div className={`mb-1.5 rounded-xl border-l-4 border-brand-primary px-3 py-2 text-xs shadow-sm ${mine ? "bg-blue-50 text-slate-700" : "bg-white text-slate-600"}`}>
            <p className="font-semibold">{item.replyTo.authorName}</p>
            <p className="mt-0.5 line-clamp-2">{item.replyTo.body}</p>
          </div>
        )}

        <div className={`inline-block min-w-[96px] max-w-full rounded-2xl px-4 py-3 text-left text-sm leading-6 shadow-sm ${mine ? "rounded-br-md bg-brand-primary text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-950"}`}>
          <p className="whitespace-pre-wrap break-words">{item.body}</p>
          {item.isEdited && <p className={`mt-1 text-[11px] ${mine ? "text-white/70" : "text-slate-400"}`}>Edited</p>}
        </div>

        {item.mentions?.length > 0 && (
          <p className={`mt-1 text-[11px] text-brand-primary ${mine ? "text-right" : "text-left"}`}>
            Mentioned {item.mentions.length} user{item.mentions.length !== 1 ? "s" : ""}
          </p>
        )}

        <div className={`mt-1 flex items-center gap-3 text-[11px] text-slate-400 ${mine ? "justify-end" : "justify-start"}`}>
          <button type="button" onClick={onReply} className="inline-flex items-center gap-1 transition-colors hover:text-brand-primary">
            <Reply size={11} /> Reply
          </button>
          {mine && (
            <button type="button" onClick={onEdit} className="transition-colors hover:text-brand-primary">
              Edit
            </button>
          )}
          {canDelete && (
            <button type="button" onClick={onDelete} className="transition-colors hover:text-red-600">
              Delete
            </button>
          )}
        </div>
      </div>

      {mine && <Avatar user={item.author} />}
    </div>
  );
}
