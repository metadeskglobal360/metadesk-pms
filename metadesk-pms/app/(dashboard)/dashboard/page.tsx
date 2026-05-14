"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  CheckSquare,
  FolderKanban,
  ListTodo,
  TrendingUp,
} from "lucide-react";
import { formatExactDateTime } from "@/lib/date-format";

const EMPTY_STATS = {
  totalProjects: 0,
  activeProjects: 0,
  myTasks: 0,
  projectTasks: 0,
  standaloneTaskTotal: 0,
  overdueTasks: 0,
  recentProjects: [],
  standaloneTasks: [],
  upcomingTasks: [],
  activity: [],
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const user = session?.user as any;
  const firstName = user?.name?.split(" ")[0] || "there";
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    enabled: status === "authenticated",
    staleTime: 5_000,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as { stats: typeof EMPTY_STATS };
    },
  });

  const statsData = data?.stats || EMPTY_STATS;

  const summaryStats = [
    {
      label: "Total Projects",
      value: statsData.totalProjects,
      icon: FolderKanban,
      gradient: "from-[#ffd8cb] to-[#ffe8df]",
      shadow: "shadow-[#ffd8cb]/60",
      href: "/projects",
    },
    {
      label: "Active Projects",
      value: statsData.activeProjects,
      icon: TrendingUp,
      gradient: "from-[#7dd3fc] to-[#c7f0ff]",
      shadow: "shadow-sky-200/70",
      href: "/projects",
    },
    {
      label: "Project Tasks",
      value: statsData.projectTasks,
      icon: CheckSquare,
      gradient: "from-[#fde047] to-[#fff3a3]",
      shadow: "shadow-yellow-200/80",
      href: "/tasks",
    },
    {
      label: "Standalone Tasks",
      value: statsData.standaloneTaskTotal,
      icon: ListTodo,
      gradient: "from-[#e9ddff] to-[#f6efff]",
      shadow: "shadow-violet-200/70",
      href: "/tasks?scope=standalone",
    },
    {
      label: "Overdue",
      value: statsData.overdueTasks,
      icon: AlertTriangle,
      gradient: "from-[#ffd7d7] to-[#fff0f0]",
      shadow: "shadow-red-200/70",
      href: "/tasks",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            Good {getGreeting()},{" "}
            <span className="text-brand-primary">{firstName}</span>
          </h1>
          <p className="mt-1 text-sm text-brand-muted">
            {user?.role === "employee"
              ? "Your assigned projects, tasks, and deadlines."
              : "Workspace overview - projects, team workload, and recent activity."}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {summaryStats.map(({ label, value, icon: Icon, gradient, shadow, href }, i) => (
          <Link
            key={label}
            href={href}
            className={`relative min-h-[132px] overflow-hidden rounded-[20px] bg-gradient-to-br ${gradient} p-5 shadow-lg ${shadow} transition-all hover:-translate-y-1 stagger-${i + 1} animate-fade-in`}
            style={{ color: "#111827" }}
          >
            <div className="pointer-events-none absolute -right-3 -top-3 opacity-[0.14]">
              <Icon size={78} />
            </div>

            <div className="relative flex h-full flex-col justify-between">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/28">
                <Icon size={19} />
              </div>
              <div>
                <p className="text-4xl font-bold leading-none tracking-tight">{value}</p>
                <p className="mt-2 text-sm font-semibold text-slate-600">{label}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr_0.85fr] gap-5">

        {/* Projects */}
        <div className="card p-5 animate-fade-in stagger-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-white">Projects</h2>
            <Link href="/projects" className="text-xs font-medium text-brand-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {isLoading ? (
              <DashboardSkeleton rows={3} />
            ) : statsData.recentProjects.length === 0 ? (
              <p className="rounded-xl border border-brand-border bg-brand-dark p-5 text-sm text-brand-muted">
                No projects yet.
              </p>
            ) : (
              statsData.recentProjects.map((project: any) => (
                <Link
                  key={project._id}
                  href={`/projects/${project._id}`}
                  className="block rounded-xl border border-brand-border bg-brand-dark p-4 hover:border-brand-primary transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-white group-hover:text-brand-primary transition-colors truncate">
                        {project.title}
                      </p>
                      <p className="mt-0.5 text-sm text-brand-muted line-clamp-1">{project.description}</p>
                    </div>
                    <span className="badge bg-brand-primary/15 text-brand-primary capitalize shrink-0">
                      {project.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs text-brand-muted">Progress</span>
                      <span className="text-xs font-semibold text-brand-muted">{project.progress}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-brand-border">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-primary to-sky-400 transition-all"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Standalone Tasks */}
        <div className="card p-5 animate-fade-in stagger-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-white">Standalone Tasks</h2>
            <Link href="/tasks?scope=standalone" className="text-xs font-medium text-brand-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {isLoading ? (
              <DashboardSkeleton rows={3} />
            ) : statsData.standaloneTasks.length === 0 ? (
              <p className="rounded-xl border border-brand-border bg-brand-dark p-5 text-sm text-brand-muted">
                No standalone tasks yet.
              </p>
            ) : (
              statsData.standaloneTasks.map((task: any) => (
                <Link
                  key={task._id}
                  href={`/tasks/${task._id}`}
                  className="block rounded-xl border border-brand-border bg-brand-dark p-4 hover:border-brand-primary transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-white group-hover:text-brand-primary transition-colors truncate">
                        {task.title}
                      </p>
                      <p className="mt-0.5 text-xs text-brand-muted truncate">
                        {task.assignedTo?.map((m: any) => m.name).join(", ") || "Unassigned"}
                      </p>
                    </div>
                    <span className="badge bg-violet-500/15 text-violet-400 capitalize shrink-0">
                      {task.status.replace("_", " ")}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="card p-5 animate-fade-in stagger-4">
          <div className="mb-4">
            <h2 className="font-semibold text-white">Deadlines</h2>
          </div>
          <div className="space-y-3">
            {isLoading ? (
              <DashboardSkeleton rows={3} />
            ) : statsData.upcomingTasks.length === 0 ? (
              <p className="rounded-xl border border-brand-border bg-brand-dark p-5 text-sm text-brand-muted">
                No upcoming deadlines.
              </p>
            ) : (
              statsData.upcomingTasks.map((task: any) => {
                const overdue = task.dueDate && new Date(task.dueDate) < new Date();
                return (
                  <Link
                    key={task._id}
                    href={`/tasks/${task._id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-brand-border bg-brand-dark p-4 hover:border-brand-primary transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-white group-hover:text-brand-primary transition-colors truncate">
                        {task.title}
                      </p>
                      <p className="mt-0.5 text-xs text-brand-muted truncate">
                        {task.project?.title || "No project"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-xs font-semibold ${overdue ? "text-red-400" : "text-slate-400"}`}>
                        {task.dueDate ? formatExactDateTime(task.dueDate) : "No date"}
                      </p>
                      {task.dueDate && (
                        <p className={`mt-0.5 text-[11px] ${overdue ? "text-red-500" : "text-brand-muted"}`}>
                          {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

function DashboardSkeleton({ rows }: { rows: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-24 animate-pulse rounded-xl border border-brand-border bg-brand-dark" />
      ))}
    </>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
