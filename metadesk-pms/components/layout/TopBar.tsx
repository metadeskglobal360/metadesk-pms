"use client";

import {
  Bell,
  BellRing,
  CheckSquare,
  FolderKanban,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Search,
  Settings,
  Sun,
  UserRound,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useMessageSummary } from "@/hooks/useMessageSummary";
import { useCurrentUser, useNotifications } from "@/hooks/useData";

export default function TopBar({
  user,
  theme,
  onToggleTheme,
  onMenuClick,
}: {
  user: any;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onMenuClick?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [desktopPermission, setDesktopPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [now, setNow] = useState(() => new Date());
  const [clockReady, setClockReady] = useState(false);
  const { data: currentUser } = useCurrentUser();
  const profileUser = currentUser || user;

  const { data: messageSummary }      = useMessageSummary();
  const { data: notificationSummary } = useNotifications();
  const unreadMessages      = messageSummary?.unreadCount      || 0;
  const unreadNotifications = notificationSummary?.unreadCount || 0;

  const { data: searchData } = useQuery({
    queryKey: ["global-search-data"],
    enabled: searchOpen && search.trim().length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [projectsRes, tasksRes, membersRes] = await Promise.all([
        fetch("/api/projects?limit=50"),
        fetch("/api/tasks?limit=50"),
        fetch("/api/mentions"),
      ]);
      const [projectsJson, tasksJson, membersJson] = await Promise.all([
        projectsRes.json(),
        tasksRes.json(),
        membersRes.json(),
      ]);
      return {
        projects: projectsJson.success ? projectsJson.data.projects || [] : [],
        tasks:    tasksJson.success    ? tasksJson.data.tasks       || [] : [],
        members:  membersJson.success  ? membersJson.data.users     || [] : [],
      };
    },
  });

  const searchResults = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];

    const matches = (values: unknown[]) =>
      values.filter(Boolean).some((v) => String(v).toLowerCase().includes(term));

    const projects = (searchData?.projects || [])
      .filter((p: any) => matches([p.title, p.description, p.status, p.priority, ...(p.tags || [])]))
      .slice(0, 4)
      .map((p: any) => ({
        id: `project-${p._id}`,
        type: "Project",
        title: p.title,
        subtitle: p.description || p.status,
        href: `/projects/${p._id}`,
        icon: FolderKanban,
      }));

    const tasks = (searchData?.tasks || [])
      .filter((t: any) => matches([t.title, t.description, t.status, t.priority, t.project?.title]))
      .slice(0, 4)
      .map((t: any) => ({
        id: `task-${t._id}`,
        type: t.project ? "Project task" : "Standalone task",
        title: t.title,
        subtitle: t.project?.title || "Direct assignment",
        href: `/tasks/${t._id}`,
        icon: CheckSquare,
      }));

    const members = (searchData?.members || [])
      .filter((m: any) => matches([m.name, m.email, m.designation, m.team, m.username]))
      .slice(0, 4)
      .map((m: any) => ({
        id: `member-${m.id}`,
        type: "Member",
        title: m.name,
        subtitle: `${m.designation} - ${m.team}`,
        href: `/messages?with=${m.id}`,
        icon: UserRound,
      }));

    return [...projects, ...tasks, ...members].slice(0, 10);
  }, [search, searchData]);

  useEffect(() => {
    if (!("Notification" in window)) return;
    setDesktopPermission(Notification.permission);
  }, []);

  useEffect(() => {
    setClockReady(true);
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const clockTime = useMemo(() => {
    const pad = (value: number) => String(value).padStart(2, "0");
    const hours24 = now.getHours();
    const hours12 = hours24 % 12 || 12;
    return {
      hours: pad(hours12),
      minutes: pad(now.getMinutes()),
      seconds: pad(now.getSeconds()),
      period: hours24 >= 12 ? "PM" : "AM",
    };
  }, [now]);

  const clockDate = useMemo(() => {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "2-digit",
    }).format(now);
  }, [now]);

  const visibleClockTime = clockReady
    ? clockTime
    : { hours: "--", minutes: "--", seconds: "--", period: "--" };
  const visibleClockDate = clockReady ? clockDate : "Loading";

  async function enableDesktopNotifications() {
    if (!("Notification" in window)) {
      toast.error("This browser does not support desktop notifications");
      return;
    }
    if (Notification.permission === "denied") {
      toast.error("Desktop notifications are blocked in your browser settings");
      setDesktopPermission("denied");
      return;
    }
    const permission = await Notification.requestPermission();
    setDesktopPermission(permission);
    if (permission !== "granted") {
      toast.error("Desktop notifications were not enabled");
    }
  }

  return (
    <header className="dashboard-topbar relative h-[74px] bg-white/90 border-b border-slate-100 px-3 sm:px-5 flex items-center gap-2 sm:gap-4 shrink-0 backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-950 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>

        <div className="topbar-world-clock hidden 2xl:block">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-500">Metadesk Time</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">{visibleClockDate}</span>
          </div>
          <div className="mt-0.5 flex items-end leading-none">
            <span className="topbar-clock-digits">{visibleClockTime.hours}</span>
            <span className="topbar-clock-colon">:</span>
            <span className="topbar-clock-digits">{visibleClockTime.minutes}</span>
            <span className="topbar-clock-seconds">:{visibleClockTime.seconds}</span>
            <span className="topbar-clock-period">{visibleClockTime.period}</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="absolute left-1/2 top-1/2 hidden w-[min(460px,42vw)] -translate-x-1/2 -translate-y-1/2 sm:block">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search projects, tasks, members..."
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-4 text-[13px]
                     text-slate-900 placeholder-slate-400
                     focus:outline-none focus:border-brand-primary focus:bg-white transition-colors"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setSearchOpen(true); }}
          onFocus={() => setSearchOpen(true)}
          onBlur={() => window.setTimeout(() => setSearchOpen(false), 120)}
        />
        {/* Dropdown */}
        {searchOpen && search.trim() && (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl animate-scale-in">
            {searchResults.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">No results found</div>
            ) : (
              <div className="max-h-96 overflow-y-auto p-1.5">
                {searchResults.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => { setSearch(""); setSearchOpen(false); }}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-slate-50 transition-colors"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-brand-primary">
                        <Icon size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-slate-950">{item.title}</span>
                        <span className="block truncate text-xs text-slate-400">{item.type} - {item.subtitle}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1 sm:gap-1.5 ml-auto">

        {/* Desktop notification opt-in */}
        {desktopPermission !== "unsupported" && desktopPermission !== "granted" && (
          <button
            type="button"
            onClick={enableDesktopNotifications}
            className="hidden lg:inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-brand-primary hover:bg-blue-100 transition-colors"
            title="Enable Windows desktop popups"
          >
            <BellRing size={13} />
            {desktopPermission === "denied" ? "Alerts blocked" : "Enable alerts"}
          </button>
        )}

        {/* Theme toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-950 transition-colors"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Messages */}
        <Link
          href="/messages"
          className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-950 transition-colors"
          title="Messages"
        >
          <MessageSquare size={16} />
          {unreadMessages > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[16px] items-center justify-center rounded-full bg-brand-primary px-1 text-[9px] font-bold leading-none text-white py-px">
              {unreadMessages > 9 ? "9+" : unreadMessages}
            </span>
          )}
        </Link>

        {/* Notifications */}
        <Link
          href="/notifications"
          className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-950 transition-colors"
          title="Notifications"
        >
          <Bell size={16} />
          {unreadNotifications > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[16px] items-center justify-center rounded-full bg-brand-primary px-1 text-[9px] font-bold leading-none text-white py-px">
              {unreadNotifications > 9 ? "9+" : unreadNotifications}
            </span>
          )}
        </Link>

        <Link
          href="/settings"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-950 transition-colors"
          title="Settings"
        >
          <Settings size={16} />
        </Link>

        <div className="mx-2 h-6 w-px bg-slate-200" />

        <Link
          href="/profile"
          className="ml-1 flex h-11 min-w-[178px] shrink-0 items-center gap-2.5 rounded-full border border-slate-200 bg-white px-1.5 pr-3 text-slate-950 transition-colors hover:bg-slate-50"
          title="Profile"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-400 to-brand-primary">
            {profileUser?.avatar ? (
              <img src={profileUser.avatar} alt={profileUser?.name || "Profile"} className="h-full w-full rounded-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-white">
                {profileUser?.name?.charAt(0)?.toUpperCase() || "U"}
              </span>
            )}
          </div>
          <div className="hidden min-w-0 text-left lg:block">
            <p className="max-w-[145px] truncate text-[13px] font-bold leading-tight text-slate-950">
              {profileUser?.name || "Profile"}
            </p>
            <p className="truncate text-[10px] font-semibold capitalize leading-tight text-slate-400">
              {profileUser?.role || "employee"}
            </p>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          title="Sign out"
        >
          <LogOut size={17} />
        </button>

      </div>
    </header>
  );
}
