"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { BriefcaseBusiness, CheckCircle2, CheckSquare, ChevronDown, Clock3, FolderKanban, Mail, MessageSquare, Plus, Search, Trash2, Users, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { DEFAULT_DEPARTMENTS, sortDepartmentNames } from "@/lib/departments";

type TeamUser = {
  id: string;
  name: string;
  email: string;
  role: "manager" | "employee";
  team: string;
  designation: string;
  avatar?: string;
  isActive: boolean;
  approvalStatus?: "pending" | "approved" | "declined";
  createdAt?: string;
  approvedAt?: string;
  declinedAt?: string;
  projectCount?: number;
  taskCount?: number;
  openTaskCount?: number;
  standaloneTaskCount?: number;
};

const ROLE_STYLES: Record<TeamUser["role"], string> = {
  manager: "bg-brand-primary/15 text-brand-primary",
  employee: "bg-cyan-500/10 text-cyan-500",
};

const TEAM_STYLES: Record<string, { section: string; header: string; icon: string; avatar: string; border: string }> = {
  PCB: {
    section: "border-cyan-500/30",
    header: "bg-gradient-to-r from-cyan-500/20 to-sky-500/10",
    icon: "bg-cyan-500/15 text-cyan-500",
    avatar: "from-cyan-100 to-sky-100 text-cyan-700",
    border: "hover:border-cyan-500/60",
  },
  Firmware: {
    section: "border-blue-500/30",
    header: "bg-gradient-to-r from-blue-500/20 to-cyan-500/10",
    icon: "bg-blue-500/15 text-blue-500",
    avatar: "from-cyan-100 to-emerald-100 text-cyan-700",
    border: "hover:border-blue-500/60",
  },
  AI: {
    section: "border-violet-500/30",
    header: "bg-gradient-to-r from-violet-500/20 to-blue-500/10",
    icon: "bg-violet-500/15 text-violet-500",
    avatar: "from-violet-100 to-blue-100 text-violet-700",
    border: "hover:border-violet-500/60",
  },
  Operations: {
    section: "border-emerald-500/30",
    header: "bg-gradient-to-r from-emerald-500/20 to-teal-500/10",
    icon: "bg-emerald-500/15 text-emerald-500",
    avatar: "from-emerald-100 to-lime-100 text-emerald-700",
    border: "hover:border-emerald-500/60",
  },
  "Graphic Design": {
    section: "border-fuchsia-500/30",
    header: "bg-gradient-to-r from-fuchsia-500/20 to-violet-500/10",
    icon: "bg-fuchsia-500/15 text-fuchsia-500",
    avatar: "from-violet-100 to-fuchsia-100 text-violet-700",
    border: "hover:border-fuchsia-500/60",
  },
  Sales: {
    section: "border-amber-500/30",
    header: "bg-gradient-to-r from-amber-500/20 to-orange-500/10",
    icon: "bg-amber-500/15 text-amber-500",
    avatar: "from-amber-100 to-orange-100 text-amber-700",
    border: "hover:border-amber-500/60",
  },
  "Web Development": {
    section: "border-emerald-500/30",
    header: "bg-gradient-to-r from-sky-500/20 to-emerald-500/10",
    icon: "bg-sky-500/15 text-sky-500",
    avatar: "from-emerald-100 to-lime-100 text-emerald-700",
    border: "hover:border-emerald-500/60",
  },
};

const DEFAULT_TEAM_STYLE = {
  section: "border-brand-primary/25",
  header: "bg-gradient-to-r from-brand-primary/20 to-cyan-500/10",
  icon: "bg-brand-primary/15 text-brand-primary",
  avatar: "from-blue-100 to-cyan-100 text-brand-primary",
  border: "hover:border-brand-primary",
};

export default function TeamPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "employee";
  const currentUserId = (session?.user as any)?.id;
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [expandedId, setExpandedId] = useState("");
  const [newDepartment, setNewDepartment] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const res = await fetch("/api/users");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as { users: TeamUser[] };
    },
    enabled: role === "manager",
  });

  const { data: departmentData } = useQuery({
    queryKey: ["departments"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch("/api/departments");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as { departments: string[] };
    },
    enabled: role === "manager",
  });

  const users = useMemo(() => data?.users || [], [data?.users]);
  const pendingUsers = useMemo(() => users.filter((user) => user.approvalStatus === "pending"), [users]);
  const declinedUsers = useMemo(() => users.filter((user) => user.approvalStatus === "declined"), [users]);
  const reviewUsers = useMemo(() => [...pendingUsers, ...declinedUsers], [declinedUsers, pendingUsers]);
  const approvedUsers = useMemo(
    () => users.filter((user) => user.approvalStatus !== "pending" && user.approvalStatus !== "declined"),
    [users]
  );
  const managers = approvedUsers.filter((user) => user.role === "manager").length;
  const teams = useMemo(
    () => sortDepartmentNames([...(departmentData?.departments || DEFAULT_DEPARTMENTS), ...approvedUsers.map((user) => user.team)]),
    [approvedUsers, departmentData?.departments]
  );

  const updateUser = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addDepartment = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      setNewDepartment("");
      qc.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      setExpandedId("");
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filteredUsers = useMemo(() => {
    const term = search.toLowerCase().trim();
    return approvedUsers.filter((user) => {
      const matchesTeam = teamFilter === "all" || user.team === teamFilter;
      const matchesSearch =
        !term ||
        [user.name, user.email, user.designation, user.team, user.role].some((value) =>
          value.toLowerCase().includes(term)
        );
      return matchesTeam && matchesSearch;
    });
  }, [approvedUsers, search, teamFilter]);

  const grouped = useMemo(() => {
    const visibleDepartments = teamFilter === "all" ? teams : teams.filter((team) => team === teamFilter);
    const groups = visibleDepartments.reduce<Record<string, TeamUser[]>>((map, team) => {
      map[team] = [];
      return map;
    }, {});

    filteredUsers.forEach((user) => {
      groups[user.team] = groups[user.team] || [];
      groups[user.team].push(user);
    });

    return groups;
  }, [filteredUsers, teamFilter, teams]);

  if (role !== "manager") {
    return (
      <div className="max-w-xl">
        <div className="card p-8">
          <div className="w-12 h-12 rounded-lg bg-brand-primary/15 text-brand-primary flex items-center justify-center mb-5">
            <Users size={22} />
          </div>
          <h1 className="text-xl font-semibold text-white">Team directory is restricted</h1>
          <p className="text-brand-muted text-sm mt-2">
            Team visibility is available only to managers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-brand-border bg-brand-primary/10 px-3 py-1 text-xs text-brand-primary mb-3">
            <Users size={14} /> Metadesk Global Directory
          </div>
          <h1 className="text-2xl font-semibold text-white">Team</h1>
          <p className="text-brand-muted text-sm mt-1">
            View employees, departments, workload, roles, and account access.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[680px]">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <form
              className="flex min-w-0 flex-1 gap-2 sm:max-w-md"
              onSubmit={(event) => {
                event.preventDefault();
                if (!newDepartment.trim()) return;
                addDepartment.mutate(newDepartment);
              }}
            >
              <input
                className="input-base"
                placeholder="Add department"
                value={newDepartment}
                onChange={(event) => setNewDepartment(event.target.value)}
              />
              <button
                type="submit"
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-brand-border bg-brand-dark px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-brand-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                disabled={addDepartment.isPending || !newDepartment.trim()}
              >
                <Plus size={15} /> Add
              </button>
            </form>
            <Link href="/projects/new" className="btn-primary inline-flex items-center gap-2 text-sm">
              <Plus size={16} /> New project
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
              <input
                className="input-base pl-9"
                placeholder="Search employees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className="input-base" value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
              <option value="all">All departments</option>
              {teams.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Stat label="Approved users" value={approvedUsers.length} />
        <Stat label="Departments" value={teams.length} />
        <Stat label="Managers" value={managers} />
        <Stat label="Pending requests" value={pendingUsers.length} />
      </div>

      {reviewUsers.length > 0 && (
        <section className="card overflow-hidden border-amber-400/30">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-amber-400/10 px-5 py-4">
            <div>
              <div className="flex items-center gap-2 text-amber-300">
                <Clock3 size={17} />
                <h2 className="font-semibold text-white">Account approval requests</h2>
              </div>
              <p className="mt-1 text-sm text-brand-muted">Approve trusted users before they can sign in.</p>
            </div>
            <span className="badge bg-amber-400/15 text-amber-300">{pendingUsers.length} pending</span>
          </div>
          <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
            {reviewUsers.map((user) => (
              <article key={user.id} className="rounded-xl border border-brand-border bg-brand-dark p-4">
                <div className="flex items-start gap-3">
                  <Avatar name={user.name} avatar={user.avatar} />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-white">{user.name}</h3>
                    <p className="truncate text-sm text-brand-muted">{user.designation}</p>
                    <p className="mt-2 truncate text-xs text-slate-400">{user.email}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-slate-400">{user.team}</span>
                      <span className={`badge ${user.approvalStatus === "declined" ? "bg-red-500/15 text-red-300" : "bg-amber-400/15 text-amber-300"}`}>
                        {user.approvalStatus === "declined" ? "Declined" : "Pending"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-50"
                    disabled={updateUser.isPending}
                    onClick={() => updateUser.mutate({ id: user.id, approvalStatus: "approved" })}
                  >
                    <CheckCircle2 size={15} /> Approve
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/15 disabled:opacity-50"
                    disabled={updateUser.isPending}
                    onClick={() => updateUser.mutate({ id: user.id, approvalStatus: "declined" })}
                  >
                    <XCircle size={15} /> Decline
                  </button>
                </div>
                {user.approvalStatus === "declined" && (
                  <button
                    type="button"
                    className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-400/40 px-3 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                    disabled={deleteAccount.isPending}
                    onClick={() => {
                      if (!window.confirm(`Delete ${user.name}'s account request?`)) return;
                      deleteAccount.mutate(user.id);
                    }}
                  >
                    <Trash2 size={15} /> Delete request
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5 h-56 animate-pulse" />
          ))}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="card p-10 text-center">
          <Users size={32} className="mx-auto text-brand-muted mb-3" />
          <p className="text-white font-medium">No employees found</p>
          <p className="text-brand-muted text-sm mt-1">Try a different team or search term.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {Object.entries(grouped).map(([team, members]) => {
              const style = TEAM_STYLES[team] || DEFAULT_TEAM_STYLE;

              return (
              <section key={team} className={`card overflow-hidden ${style.section}`}>
                <div className={`border-b border-white/10 px-5 py-4 flex items-center justify-between gap-3 ${style.header}`}>
                  <div>
                    <h2 className="text-slate-950 font-semibold">{team}</h2>
                    <p className="text-brand-muted text-sm">
                      {members.length} employee{members.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${style.icon}`}>
                    <BriefcaseBusiness size={18} />
                  </div>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {members.length === 0 && (
                    <div className="team-empty-state rounded-lg border border-dashed px-4 py-5 text-sm md:col-span-2">
                      No employees in this department yet.
                    </div>
                  )}
                  {members.map((member) => {
                    const avatar = member.avatar;
                    return (
                      <article
                        key={member.id}
                        onClick={() => setExpandedId((current) => current === member.id ? "" : member.id)}
                        className={`cursor-pointer rounded-lg border border-slate-200 bg-white p-4 transition-colors ${style.border}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative shrink-0">
                            <div className={`w-14 h-14 rounded-lg bg-gradient-to-br border border-slate-200 flex items-center justify-center overflow-hidden ${style.avatar}`}>
                              {avatar ? (
                                <img src={avatar} alt={member.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-brand-primary font-semibold">
                                  {member.name
                                    .split(" ")
                                    .map((part) => part[0])
                                    .join("")
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h3 className="text-slate-950 font-medium truncate">{member.name}</h3>
                                <p className="text-brand-muted text-sm truncate">{member.designation}</p>
                              </div>
                              <span className={`badge capitalize shrink-0 ${ROLE_STYLES[member.role]}`}>
                                {member.role}
                              </span>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-2">
                              <MiniStat icon={FolderKanban} label="Projects" value={member.projectCount || 0} />
                              <MiniStat icon={CheckSquare} label="Open tasks" value={member.openTaskCount || 0} />
                            </div>

                            {expandedId === member.id && (
                              <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-white p-3">
                                <div className="flex items-center gap-2 text-xs text-brand-muted min-w-0">
                                  <Mail size={13} className="shrink-0" />
                                  <span className="truncate">{member.email}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <DetailStat label="Total tasks" value={member.taskCount || 0} />
                                  <DetailStat label="Standalone" value={member.standaloneTaskCount || 0} />
                                </div>

                                <Link
                                  href={`/messages?with=${member.id}`}
                                  onClick={(event) => event.stopPropagation()}
                                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-primary px-3 py-2 text-sm font-medium text-white hover:bg-blue-600"
                                >
                                  <MessageSquare size={15} /> Chat
                                </Link>

                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                  <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Account access</p>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <select
                                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-brand-primary"
                                      value={member.team}
                                      onChange={(event) => {
                                        event.stopPropagation();
                                        updateUser.mutate({ id: member.id, team: event.target.value });
                                      }}
                                      onClick={(event) => event.stopPropagation()}
                                    >
                                      {teams.map((department) => (
                                        <option key={department} value={department}>
                                          {department}
                                        </option>
                                      ))}
                                    </select>
                                    <select
                                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-brand-primary"
                                      value={member.role}
                                      onChange={(event) => {
                                        event.stopPropagation();
                                        updateUser.mutate({ id: member.id, role: event.target.value });
                                      }}
                                      onClick={(event) => event.stopPropagation()}
                                      disabled={member.id === currentUserId}
                                    >
                                      <option value="employee">Employee</option>
                                      <option value="manager">Manager</option>
                                    </select>
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        updateUser.mutate({ id: member.id, isActive: !member.isActive });
                                      }}
                                      disabled={member.id === currentUserId}
                                      className={`rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-40 ${
                                        member.isActive
                                          ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                                          : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                      }`}
                                    >
                                      {member.isActive ? "Deactivate" : "Reactivate"}
                                    </button>
                                    <span className={`badge ${member.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                                      {member.isActive ? "Active" : "Inactive"}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        if (!window.confirm(`Delete ${member.name}'s account? This removes them from live projects, tasks, messages, and notifications.`)) return;
                                        deleteAccount.mutate(member.id);
                                      }}
                                      disabled={member.id === currentUserId || deleteAccount.isPending}
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                      <Trash2 size={13} /> Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          <ChevronDown
                            size={16}
                            className={`mt-1 shrink-0 text-slate-400 transition-transform ${expandedId === member.id ? "rotate-180" : ""}`}
                          />
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <Icon size={12} />
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function Avatar({ name, avatar }: { name: string; avatar?: string }) {
  return (
    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-cyan-100 to-blue-100 text-brand-primary flex items-center justify-center">
      {avatar ? (
        <img src={avatar} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="font-semibold">
          {name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </span>
      )}
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-base font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-5">
      <p className="text-brand-muted text-sm">{label}</p>
      <p className="text-3xl font-bold text-white mt-2">{value}</p>
    </div>
  );
}
