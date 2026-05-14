"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, Check, Plus } from "lucide-react";
import toast from "react-hot-toast";

export default function NewTaskPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "employee";
  const canCreate = role === "manager";
  const [form, setForm] = useState({
    title: "",
    description: "",
    project: "",
    priority: "medium",
    dueDate: "",
    assignedTo: [] as string[],
    subtasks: "",
    estimatedHours: "",
  });
  const [loading, setLoading] = useState(false);

  const usersQuery = useQuery({
    queryKey: ["users"],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const res = await fetch("/api/users");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: canCreate,
  });

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch("/api/projects");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: canCreate,
  });

  const users = useMemo(() => usersQuery.data?.users || [], [usersQuery.data?.users]);
  const projects = useMemo(() => projectsQuery.data?.projects || [], [projectsQuery.data?.projects]);
  const employees = useMemo(
    () => users.filter((user: any) => user.isActive && user.approvalStatus !== "pending" && user.approvalStatus !== "declined"),
    [users]
  );

  useEffect(() => {
    const projectId = new URLSearchParams(window.location.search).get("project");
    if (!projectId) return;
    setForm((current) => ({ ...current, project: projectId }));
  }, []);

  function update(key: string, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleAssignee(id: string) {
    setForm((current) => ({
      ...current,
      assignedTo: current.assignedTo.includes(id) ? current.assignedTo.filter((item) => item !== id) : [...current.assignedTo, id],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canCreate) return toast.error("Only managers can create tasks");

    setLoading(true);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        project: form.project || undefined,
        assignedTo: form.assignedTo,
        priority: form.priority,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
        labels: [],
        estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : undefined,
        subtasks: form.subtasks.split("\n").map((item) => item.trim()).filter(Boolean),
      }),
    });
    const json = await res.json();
    setLoading(false);
    if (!json.success) return toast.error(json.error || "Could not create task");
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["tasks"] }),
      qc.invalidateQueries({ queryKey: ["projects"] }),
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] }),
      qc.invalidateQueries({ queryKey: ["notifications"] }),
      form.project ? qc.invalidateQueries({ queryKey: ["project", form.project] }) : Promise.resolve(),
    ]);
    router.push(`/tasks/${json.data._id}`);
  }

  if (!canCreate) {
    return (
      <div className="card p-8 max-w-xl">
        <h1 className="text-xl font-semibold text-white">Task creation is restricted</h1>
        <p className="text-brand-muted text-sm mt-2">Only managers can create and assign tasks.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/tasks" className="inline-flex items-center gap-2 text-sm text-brand-muted hover:text-white">
        <ArrowLeft size={16} /> Tasks
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-white">Create task</h1>
        <p className="text-brand-muted text-sm mt-1">Create a project task or a standalone task assigned directly to employees.</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Title</label>
          <input className="input-base" value={form.title} onChange={(e) => update("title", e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Description</label>
          <textarea className="input-base min-h-24 resize-none" value={form.description} onChange={(e) => update("description", e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm text-slate-400 mb-1.5">Task type</label>
            <select className="input-base" value={form.project} onChange={(e) => update("project", e.target.value)}>
              <option value="">Standalone task - no project</option>
              {projects.map((project: any) => (
                <option key={project._id} value={project._id}>Project task - {project.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Priority</label>
            <select className="input-base" value={form.priority} onChange={(e) => update("priority", e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Due date and time</label>
            <input type="datetime-local" className="input-base" value={form.dueDate} onChange={(e) => update("dueDate", e.target.value)} />
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-2">Assignees</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {employees.map((user: any) => (
              <button
                type="button"
                key={user.id}
                onClick={() => toggleAssignee(user.id)}
                className={`text-left rounded-lg border p-4 transition-colors ${
                  form.assignedTo.includes(user.id) ? "border-brand-primary bg-brand-primary/10" : "border-brand-border bg-brand-dark hover:border-brand-primary/50"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-white font-medium">{user.name}</p>
                    <p className="text-brand-muted text-sm">{user.designation}</p>
                  </div>
                  {form.assignedTo.includes(user.id) && <Check size={16} className="text-brand-primary" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Subtasks</label>
            <textarea className="input-base min-h-24 resize-none" placeholder="One subtask per line" value={form.subtasks} onChange={(e) => update("subtasks", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Estimated hours</label>
            <input type="number" min="0" className="input-base" value={form.estimatedHours} onChange={(e) => update("estimatedHours", e.target.value)} />
          </div>
        </div>

        <button className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
          <Plus size={16} /> {loading ? "Creating..." : "Create task"}
        </button>
      </form>
    </div>
  );
}
