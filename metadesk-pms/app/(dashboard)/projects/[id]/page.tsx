"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Calendar, ChevronLeft, Download, FileText, MessageSquare, Plus, Reply, Trash2, Upload, UserPlus, Users, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import MentionInput, { type MentionUser } from "@/components/MentionInput";
import { formatDateTimeInputValue, formatExactDateTime } from "@/lib/date-format";
import { useCurrentUser } from "@/hooks/useData";

const STATUS = ["planning", "active", "on_hold", "completed", "archived"];
const PRIORITIES = ["low", "medium", "high", "critical"];

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const { data: currentUser } = useCurrentUser();
  const liveUser = (currentUser || session?.user) as any;
  const role = liveUser?.role || "employee";
  const currentUserId = liveUser?.id;
  const canManage = role === "manager";
  const canDelete = role === "manager";
  const [comment, setComment] = useState("");
  const [replyingToComment, setReplyingToComment] = useState<any>(null);
  const [editingComment, setEditingComment] = useState<any>(null);
  const [memberToAdd, setMemberToAdd] = useState("");
  const feedEndRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["project", params.id],
    staleTime: 0,
    queryFn: async () => {
      const res = await fetch(`/api/projects/${params.id}`);
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

  useEffect(() => {
    fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ link: `/projects/${params.id}` }),
    }).then(() => qc.invalidateQueries({ queryKey: ["notifications"] }));
  }, [params.id, qc]);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [data?.comments?.length, data?.activity?.length, params.id]);

  const updateProject = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(`/api/projects/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", params.id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteProject = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${params.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      window.location.href = "/projects";
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addComment = useMutation({
    mutationFn: async ({ body, replyTo }: { body: string; replyTo?: any }) => {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: params.id, body, replyTo: replyTo?.id }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onMutate: async ({ body, replyTo }) => {
      const queryKey = ["project", params.id];
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData(queryKey);
      const createdAt = new Date().toISOString();
      const optimisticComment = {
        _id: `temp-${createdAt}`,
        project: params.id,
        author: {
          id: currentUserId,
          name: liveUser?.name || "You",
          avatar: liveUser?.avatar || "",
          designation: liveUser?.designation || "",
        },
        body,
        mentions: [],
        replyTo: replyTo ? { id: replyTo.id, body: replyTo.body, authorName: replyTo.actor?.name || "Comment" } : undefined,
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
      qc.invalidateQueries({ queryKey: ["project", params.id] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err: Error, _vars, context: any) => {
      if (context?.queryKey) qc.setQueryData(context.queryKey, context.previous);
      toast.error(err.message);
    },
  });

  const updateComment = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/comments/${editingComment.id}`, {
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
      qc.invalidateQueries({ queryKey: ["project", params.id] });
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
      setEditingComment(null);
      setReplyingToComment(null);
      qc.invalidateQueries({ queryKey: ["project", params.id] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", params.id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  async function uploadFile(file?: File) {
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    const res = await fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project: params.id, fileName: file.name, mimeType: file.type || "application/octet-stream", size: file.size, dataUrl }),
    });
    const json = await res.json();
    if (!json.success) return toast.error(json.error || "Upload failed");
    qc.invalidateQueries({ queryKey: ["project", params.id] });
  }

  if (isLoading) return <div className="card p-6 h-48 animate-pulse" />;

  const project = data?.project;
  if (!project) {
    return (
      <div className="card p-8">
        <p className="text-white font-medium">Project not found</p>
        <Link href="/projects" className="text-brand-primary text-sm mt-2 inline-block">Back to projects</Link>
      </div>
    );
  }

  const risk = project.progress < 30 && new Date(project.deadline).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000;
  const mentionUsers = project.members || [];
  const projectMemberIds = new Set(project.members.map((member: any) => member.id));
  const availableMembers = (mentionData?.users || []).filter((user: any) => !projectMemberIds.has(user.id));
  const projectTasks = data.tasks || [];
  const completedProjectTasks = projectTasks.filter((task: any) => task.status === "done").length;
  const progressDetail = projectTasks.length
    ? `${completedProjectTasks} of ${projectTasks.length} project tasks done`
    : "Add project tasks and mark them Done to increase progress.";
  const feedItems = [
    ...(data.comments || []).map((item: any) => ({
      id: item._id,
      type: "comment",
      actor: item.author,
      body: item.body,
      mentions: item.mentions || [],
      replyTo: item.replyTo,
      isEdited: item.isEdited,
      createdAt: item.createdAt,
    })),
    ...(data.activity || []).map((item: any) => ({
      id: item._id,
      type: "activity",
      actor: item.user,
      body: formatActivity(item),
      targetTitle: item.targetTitle,
      createdAt: item.createdAt,
    })).filter((item: any) => item.body),
  ].sort((a: any, b: any) => +new Date(a.createdAt) - +new Date(b.createdAt));

  function updateProjectMembers(nextIds: string[]) {
    updateProject.mutate({ memberIds: nextIds });
  }

  function addProjectMember() {
    if (!memberToAdd) return;
    updateProjectMembers([...project.members.map((member: any) => member.id), memberToAdd]);
    setMemberToAdd("");
  }

  function removeProjectMember(id: string) {
    updateProjectMembers(project.members.filter((member: any) => member.id !== id).map((member: any) => member.id));
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
      <Link href="/projects" className="inline-flex items-center gap-2 text-sm text-brand-muted hover:text-white">
        <ChevronLeft size={16} /> Projects
      </Link>

      <div className="card p-6">
        <div className="w-10 h-1.5 rounded-full mb-5" style={{ backgroundColor: project.coverColor }} />
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">{project.title}</h1>
            <p className="text-brand-muted mt-2 max-w-3xl">{project.description}</p>
            {risk && <p className="text-red-400 text-sm mt-3">Overdue risk: low progress and deadline is close.</p>}
          </div>

          {canManage && (
            <div className="grid grid-cols-2 gap-2 min-w-[320px]">
              <select className="input-base" value={project.status} onChange={(e) => updateProject.mutate({ status: e.target.value })}>
                {STATUS.map((item) => <option key={item} value={item}>{item.replace("_", " ")}</option>)}
              </select>
              <select className="input-base" value={project.priority} onChange={(e) => updateProject.mutate({ priority: e.target.value })}>
                {PRIORITIES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <input
                type="datetime-local"
                className="input-base col-span-2"
                value={formatDateTimeInputValue(project.deadline)}
                onChange={(e) => updateProject.mutate({ deadline: new Date(e.target.value).toISOString() })}
              />
              {canDelete && (
                <button onClick={() => deleteProject.mutate()} className="col-span-2 flex items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300 hover:bg-red-500/15">
                  <Trash2 size={15} /> Delete project
                </button>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <Info label="Priority" value={project.priority} />
          <Info label="Status" value={project.status.replace("_", " ")} />
          <Info label="Deadline" value={formatExactDateTime(project.deadline)} icon={<Calendar size={15} />} />
          <Info label="Members" value={String(project.members.length)} icon={<Users size={15} />} />
        </div>

        <div className="mt-6">
          <div className="h-2 bg-brand-border rounded-full overflow-hidden">
            <div className="h-full bg-brand-primary" style={{ width: `${project.progress}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm text-brand-muted">
            <p>{project.progress}% complete</p>
            <p>{progressDetail}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-white font-medium">Project Tasks</h2>
              <p className="mt-1 text-sm text-brand-muted">Progress is calculated from completed project tasks.</p>
            </div>
            {canManage && (
              <Link href={`/tasks/new?project=${project._id}`} className="btn-primary inline-flex items-center justify-center gap-2 text-sm">
                <Plus size={15} /> New task
              </Link>
            )}
          </div>
          <div className="space-y-2">
            {projectTasks.length === 0 ? <p className="text-brand-muted text-sm">No tasks yet.</p> : projectTasks.map((task: any) => (
              <div key={task._id} className="flex items-center justify-between gap-4 rounded-lg border border-brand-border bg-brand-dark p-3 transition-colors hover:border-brand-primary">
                <Link href={`/tasks/${task._id}`} className="min-w-0 flex-1">
                  <p className="text-white text-sm truncate">{task.title}</p>
                  <p className="text-brand-muted text-xs capitalize">{task.status.replace("_", " ")}</p>
                  <p className="text-brand-muted text-xs mt-1 truncate">
                    Assigned to: {task.assignedTo?.length ? task.assignedTo.map((user: any) => user.name).join(", ") : "Unassigned"}
                  </p>
                  <p className="text-brand-muted text-xs mt-1">
                    Target: {task.dueDate ? formatExactDateTime(task.dueDate) : "No date"}
                  </p>
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="badge bg-brand-primary/15 text-brand-primary capitalize">{task.priority}</span>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => window.confirm(`Delete task "${task.title}"?`) && deleteTask.mutate(task._id)}
                      disabled={deleteTask.isPending}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                      title="Delete task"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-white font-medium">Project Team</h2>
            {canManage && (
              <div className="flex gap-2">
                <select
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none"
                  value={memberToAdd}
                  onChange={(event) => setMemberToAdd(event.target.value)}
                >
                  <option value="">Add member</option>
                  {availableMembers.map((member: any) => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addProjectMember}
                  disabled={!memberToAdd}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-primary px-3 text-sm font-medium text-white disabled:opacity-50"
                >
                  <UserPlus size={15} /> Add
                </button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {project.members.map((member: any) => (
              <div key={member.id} className="flex items-start justify-between gap-3 rounded-lg border border-brand-border bg-brand-dark p-4">
                <div className="min-w-0">
                  <p className="text-white font-medium truncate">{member.name}</p>
                  <p className="text-brand-muted text-sm truncate">{member.designation}</p>
                </div>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => removeProjectMember(member.id)}
                    className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            {project.members.length === 0 && <p className="text-sm text-brand-muted">No project members assigned.</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
        <div className="card p-6">
          <h2 className="text-white font-medium mb-4 flex items-center gap-2"><FileText size={17} /> Files</h2>
          <label className="btn-primary inline-flex items-center gap-2 text-sm cursor-pointer mb-4">
            <Upload size={15} /> Upload file
            <input type="file" className="hidden" onChange={(e) => uploadFile(e.target.files?.[0])} />
          </label>
          <div className="space-y-2">
            {data.files.length === 0 ? <p className="text-brand-muted text-sm">No files uploaded.</p> : data.files.map((file: any) => (
              <a key={file._id} href={`/api/files/${file._id}`} className="group flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 hover:border-brand-primary hover:bg-white">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-950">{file.fileName}</p>
                  <p className="text-xs text-slate-500">{file.fileType} - {Math.round(file.size / 1024)} KB - {file.uploadedBy?.name || "Uploaded"}</p>
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 group-hover:bg-brand-primary group-hover:text-white">
                  <Download size={16} />
                </span>
              </a>
            ))}
          </div>
        </div>

        <div className="card flex min-h-[560px] flex-col overflow-hidden p-0">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-white font-medium flex items-center gap-2"><MessageSquare size={17} /> Project Feed</h2>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 p-5">
            {feedItems.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white p-10 text-center">
                <MessageSquare size={30} className="mx-auto text-brand-muted mb-3" />
                <p className="text-white font-medium">No updates yet</p>
              </div>
            ) : (
              <>
                {feedItems.map((item: any) => (
                  <ProjectFeedItem
                    key={`${item.type}-${item.id}`}
                    item={item}
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
                    onDelete={() => window.confirm("Delete this comment for everyone?") && deleteComment.mutate(item.id)}
                  />
                ))}
                <div ref={feedEndRef} />
              </>
            )}
          </div>

          <div className="border-t border-slate-200 bg-white px-6 py-4">
            {replyingToComment && (
              <div className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="min-w-0 border-l-4 border-brand-primary pl-3">
                  <p className="text-xs font-semibold text-slate-950">Replying to {replyingToComment.actor?.name || "comment"}</p>
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
              <FeedAvatar user={session?.user} />
              <MentionInput
                value={comment}
                onChange={setComment}
                users={mentionUsers}
                placeholder="Message the project..."
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

function formatActivity(item: any) {
  if (item.targetType === "comment") return "";
  const title = item.targetTitle ? ` ${item.targetTitle}` : "";

  if (item.action === "uploaded") return `Uploaded ${item.targetType}${title}`;
  if (item.action === "created") return `Created ${item.targetType}${title}`;
  if (item.action === "updated") return `Updated ${item.targetType}${title}`;
  if (item.action === "deleted") return `Deleted ${item.targetType}${title}`;

  return `${item.action} ${item.targetType}${title}`;
}

function FeedAvatar({ user }: { user: any }) {
  const initials = user?.name
    ?.split(" ")
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-blue-100 text-sm font-semibold text-brand-primary">
      {user?.avatar ? (
        <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">{initials || "M"}</div>
      )}
    </div>
  );
}

function ProjectFeedItem({
  item,
  currentUserId,
  canManage,
  onReply,
  onEdit,
  onDelete,
}: {
  item: any;
  currentUserId: string;
  canManage: boolean;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  if (item.type !== "comment") {
    return (
      <div className="flex justify-center">
        <div className="max-w-[80%] rounded-full border border-slate-200 bg-white px-4 py-2 text-center text-xs text-slate-500 shadow-sm">
          {item.body}
        </div>
      </div>
    );
  }

  const mine = item.actor?.id === currentUserId;
  const canDelete = mine || canManage;

  return (
    <div className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
      {!mine && <FeedAvatar user={item.actor} />}

      <div className={`group max-w-[78%] ${mine ? "text-right" : "text-left"}`}>
        <div className={`mb-1 flex items-center gap-2 text-xs text-slate-400 ${mine ? "justify-end" : "justify-start"}`}>
          <span className="font-semibold text-slate-700">{mine ? "You" : item.actor?.name || "System"}</span>
          <span>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
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

      {mine && <FeedAvatar user={item.actor} />}
    </div>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="bg-brand-dark border border-brand-border rounded-lg p-4">
      <p className="text-brand-muted text-sm">{label}</p>
      <p className="text-white capitalize mt-1 flex items-center gap-2">{icon}{value}</p>
    </div>
  );
}
