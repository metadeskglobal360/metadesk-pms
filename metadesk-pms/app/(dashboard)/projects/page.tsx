"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { FolderKanban, Plus, Search, SlidersHorizontal } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  planning:  "bg-pink-50 text-pink-600",
  active:    "bg-blue-50 text-blue-600",
  on_hold:   "bg-orange-50 text-orange-600",
  completed: "bg-emerald-50 text-emerald-700",
  archived:  "bg-slate-100 text-slate-600",
};

const STATUS_LABELS: Record<string, string> = {
  planning:  "Backlog",
  active:    "In Progress",
  on_hold:   "Pause",
  completed: "Done",
  archived:  "Archived",
};

function progressColor(progress: number) {
  if (progress >= 70) return "bg-emerald-500";
  if (progress >= 30) return "bg-amber-400";
  return "bg-rose-500";
}

export default function ProjectsPage() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "employee";
  const canCreateProject = role === "manager";

  const { data, isLoading } = useQuery({
    queryKey: ["projects", status],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const url = status ? `/api/projects?status=${status}` : "/api/projects";
      const res = await fetch(url);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const projects = useMemo(() => {
    const term = search.toLowerCase().trim();
    const items = data?.projects || [];
    if (!term) return items;
    return items.filter((project: any) =>
      [project.title, project.description, project.status, project.priority, ...(project.tags || [])]
        .filter(Boolean)
        .some((value: string) => value.toLowerCase().includes(term))
    );
  }, [data?.projects, search]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-brand-primary">Workspace</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Projects</h1>
          <p className="mt-2 text-sm text-brand-muted">
            Track client work, team members, delivery status, and progress.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 xl:w-auto lg:flex-row lg:items-center">
          <div className="relative w-full lg:w-72 xl:w-80">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for projects"
              className="input-base h-11 w-full pl-12"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="input-base h-11 min-w-36 flex-1 sm:flex-none sm:w-40"
            >
              <option value="">All status</option>
              <option value="planning">Backlog</option>
              <option value="active">In Progress</option>
              <option value="on_hold">Pause</option>
              <option value="completed">Done</option>
              <option value="archived">Archived</option>
            </select>

            <button className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-50 sm:flex-none">
              <SlidersHorizontal size={17} /> Filters
            </button>

            {canCreateProject && (
              <Link href="/projects/new" className="btn-primary inline-flex h-11 flex-1 items-center justify-center gap-2 text-sm sm:flex-none">
                <Plus size={17} /> New project
              </Link>
            )}
          </div>
        </div>
      </div>

      {!canCreateProject && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Project creation is available to managers. Employees can view projects they are assigned to.
        </div>
      )}

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-5">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Project list</h2>
            <p className="mt-1 text-xs text-brand-muted">{projects.length} shown from {data?.total ?? 0} total</p>
          </div>
          <span className="badge bg-brand-primary/15 text-brand-primary">Table</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-4">Name</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">About</th>
                <th className="px-5 py-4">Members</th>
                <th className="px-5 py-4">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="px-5 py-5">
                      <div className="h-10 animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <FolderKanban size={34} className="mx-auto mb-3 text-slate-400" />
                    <p className="font-medium text-slate-950">No projects found</p>
                    <p className="mt-1 text-sm text-slate-500">Try changing the search or filter.</p>
                  </td>
                </tr>
              ) : (
                projects.map((project: any) => {
                  const progress = project.progress || 0;
                  const visibleMembers = project.members?.slice(0, 5) || [];
                  const extraMembers = Math.max(0, (project.members?.length || 0) - visibleMembers.length);

                  return (
                    <tr key={project._id} className="hover:bg-slate-50">
                      {/* Name */}
                      <td className="px-5 py-4">
                        <Link href={`/projects/${project._id}`} className="flex items-center gap-3">
                          <div
                            className="h-11 w-11 shrink-0 rounded-xl flex items-center justify-center text-white font-semibold shadow-[0_10px_28px_rgba(37,99,235,0.2)]"
                            style={{ backgroundColor: project.coverColor || "#2563eb" }}
                          >
                            {project.title?.charAt(0)?.toUpperCase() || "P"}
                          </div>
                          <div>
                            <p className="font-medium text-slate-950">{project.title}</p>
                            <p className="text-sm text-slate-500">{project.tags?.[0] || "metadesk.internal"}</p>
                          </div>
                        </Link>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-lg px-3 py-1 text-xs font-medium ${STATUS_STYLES[project.status] || STATUS_STYLES.planning}`}>
                          {STATUS_LABELS[project.status] || project.status}
                        </span>
                      </td>

                      {/* About */}
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-950">
                          {project.priority === "critical" ? "Critical Delivery"
                            : project.priority === "high" ? "High Priority"
                            : "Project Work"}
                        </p>
                        <p className="max-w-xs truncate text-sm text-slate-500">{project.description || "No description"}</p>
                      </td>

                      {/* Members */}
                      <td className="px-5 py-4">
                        <div className="flex items-center">
                          {visibleMembers.map((member: any, index: number) => (
                            <div
                              key={member.id}
                              className="h-7 w-7 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[11px] font-semibold text-slate-700"
                              style={{ marginLeft: index === 0 ? 0 : -8 }}
                              title={member.name}
                            >
                              {member.name?.split(" ").map((p: string) => p[0]).join("").slice(0, 2)}
                            </div>
                          ))}
                          {extraMembers > 0 && (
                            <span className="ml-2 text-sm text-slate-500">+{extraMembers}</span>
                          )}
                        </div>
                      </td>

                      {/* Progress */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${progressColor(progress)}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="min-w-[36px] text-sm text-slate-950">{progress}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
