"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { ArrowLeft, Check, Plus } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

const STATUS_OPTIONS = [
  { value: "planning", label: "Planning" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On hold" },
  { value: "completed", label: "Completed" },
];
const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { value: "medium", label: "Medium", className: "border-amber-200 bg-amber-50 text-amber-700" },
  { value: "high", label: "High", className: "border-orange-200 bg-orange-50 text-orange-700" },
  { value: "critical", label: "Critical", className: "border-rose-200 bg-rose-50 text-rose-700" },
];

export default function NewProjectPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "employee";
  const canCreateProject = role === "manager";
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    status: "planning",
    startDate: new Date().toISOString().slice(0, 10),
    deadline: "",
    coverColor: "#2563eb",
    members: [] as string[],
  });

  const { data: usersData } = useQuery({
    queryKey: ["users"],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const res = await fetch("/api/users");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const users = useMemo(
    () =>
      (usersData?.users || []).filter(
        (user: any) => user.isActive && user.approvalStatus !== "pending" && user.approvalStatus !== "declined"
      ),
    [usersData]
  );

  function update(key: string, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleMember(id: string) {
    setForm((current) => ({
      ...current,
      members: current.members.includes(id)
        ? current.members.filter((memberId) => memberId !== id)
        : [...current.members, id],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!canCreateProject) {
      toast.error("Only managers can create projects");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        startDate: new Date(form.startDate).toISOString(),
        deadline: new Date(form.deadline).toISOString(),
        tags: ["demo"],
      }),
    });

    setLoading(false);
    const json = await res.json();

    if (!json.success) {
      toast.error(json.error || "Could not create project");
      return;
    }

    await Promise.all([
      qc.invalidateQueries({ queryKey: ["projects"] }),
      qc.invalidateQueries({ queryKey: ["tasks"] }),
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] }),
      qc.invalidateQueries({ queryKey: ["notifications"] }),
    ]);
    router.push(`/projects/${json.data._id}`);
  }

  if (!canCreateProject) {
    return (
      <div className="max-w-xl space-y-6">
        <Link href="/projects" className="inline-flex items-center gap-2 text-sm text-brand-muted hover:text-white">
          <ArrowLeft size={16} /> Projects
        </Link>
        <div className="card p-8">
          <h1 className="text-xl font-semibold text-white">Project creation is restricted</h1>
          <p className="text-brand-muted text-sm mt-2">
            Only managers can create projects.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href="/projects" className="inline-flex items-center gap-2 text-sm text-brand-muted hover:text-white mb-3">
            <ArrowLeft size={16} /> Projects
          </Link>
          <h1 className="text-2xl font-semibold text-white">Create project</h1>
          <p className="text-brand-muted text-sm mt-1">
            Managers can create projects, set deadlines, assign members, and choose priority.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Title</label>
          <input className="input-base" value={form.title} onChange={(e) => update("title", e.target.value)} required />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Description</label>
          <textarea
            className="input-base min-h-28 resize-none"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Start date</label>
            <input
              type="date"
              className="input-base"
              value={form.startDate}
              onChange={(e) => update("startDate", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Deadline date and time</label>
            <input
              type="datetime-local"
              className="input-base"
              value={form.deadline}
              onChange={(e) => update("deadline", e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => update("status", option.value)}
                  className={`select-none rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                    form.status === option.value
                      ? "border-brand-primary bg-blue-50 text-brand-primary"
                      : "border-slate-200 bg-white text-slate-600 hover:border-brand-primary/50 hover:text-slate-950"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Priority</label>
            <div className="grid grid-cols-2 gap-2">
              {PRIORITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => update("priority", option.value)}
                  className={`select-none rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                    form.priority === option.value
                      ? option.className
                      : "border-slate-200 bg-white text-slate-600 hover:border-brand-primary/50 hover:text-slate-950"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-2">Project members</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {users.map((user: any) => (
              <button
                type="button"
                key={user.id}
                onClick={() => toggleMember(user.id)}
                className={`select-none text-left rounded-lg border p-4 transition-colors ${
                  form.members.includes(user.id)
                    ? "border-brand-primary bg-blue-50"
                    : "border-slate-200 bg-white hover:border-brand-primary/50"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-white font-medium">{user.name}</p>
                    <p className="text-brand-muted text-sm">{user.designation}</p>
                  </div>
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                    form.members.includes(user.id)
                      ? "border-brand-primary bg-brand-primary text-white"
                      : "border-slate-300 bg-white"
                  }`}>
                    {form.members.includes(user.id) && <Check size={14} />}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <button className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
          <Plus size={16} /> {loading ? "Creating..." : "Create project"}
        </button>
      </form>
    </div>
  );
}
