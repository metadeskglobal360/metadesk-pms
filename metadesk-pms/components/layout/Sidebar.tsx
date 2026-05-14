"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Bell,
  CheckSquare,
  ChevronDown,
  FolderKanban,
  Home,
  ListTodo,
  MessageSquare,
  Plus,
  Users,
  type LucideIcon,
  X,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { useMessageSummary } from "@/hooks/useMessageSummary";
import { useNotifications } from "@/hooks/useData";

const HOME_ITEM = { href: "/dashboard", label: "Home", icon: Home };

const WORK_ITEMS = [
  { href: "/projects",        label: "Projects",         icon: FolderKanban },
  { href: "/tasks",           label: "My Tasks",         icon: CheckSquare  },
  { href: "/tasks?scope=standalone", label: "Standalone Tasks", icon: ListTodo },
];

const COMMUNICATE_ITEMS = [
  { href: "/messages",      label: "Messages",      icon: MessageSquare, badgeKey: "messages"      as const },
  { href: "/notifications", label: "Notifications", icon: Bell,          badgeKey: "notifications" as const },
];

const MANAGER_ITEMS = [
  { href: "/team", label: "Team Directory", icon: Users },
];

interface SidebarProps {
  user: any;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ user, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const role = user?.role || "employee";

  const { data: messageSummary }      = useMessageSummary();
  const { data: notificationSummary } = useNotifications();
  const unreadMessages      = messageSummary?.unreadCount      || 0;
  const unreadNotifications = notificationSummary?.unreadCount || 0;

  const badges = { messages: unreadMessages, notifications: unreadNotifications };

  function isActive(href: string) {
    if (href.includes("?")) {
      const [path, query] = href.split("?");
      const params = new URLSearchParams(query);
      const scope = params.get("scope") || "";
      return pathname === path && searchParams.get("scope") === scope;
    }
    if (href === "/tasks") return pathname === "/tasks" && !searchParams.get("scope");
    return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  }

  return (
    <aside
      className={`dashboard-sidebar fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col border-r border-slate-100 bg-white transition-transform duration-200 lg:static lg:z-auto lg:w-60 lg:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >

      {/* Workspace header */}
      <div className="px-3 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            onClick={onClose}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-slate-50 transition-colors group"
          >
            <BrandLogo compact />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-bold leading-tight text-slate-950">
                Metadesk Global
              </span>
              <span className="block truncate text-[11px] font-medium leading-tight text-slate-400">
                Workspace
              </span>
            </span>
            <ChevronDown size={13} className="text-slate-400 shrink-0" />
          </Link>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={17} />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-5">

        <NavSection label="Main">
          <NavLink item={HOME_ITEM} active={isActive(HOME_ITEM.href)} onNavigate={onClose} />
        </NavSection>

        <NavSection label="Work">
          {WORK_ITEMS.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} onNavigate={onClose} />
          ))}
        </NavSection>

        <NavSection label="Communicate">
          {COMMUNICATE_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(item.href)}
              badge={badges[item.badgeKey]}
              onNavigate={onClose}
            />
          ))}
        </NavSection>

        {role === "manager" && (
          <NavSection label="People">
            {MANAGER_ITEMS.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item.href)} onNavigate={onClose} />
            ))}
          </NavSection>
        )}
      </nav>

      {role === "manager" && (
        <div className="border-t border-slate-100 px-3 py-6">
          <div className="flex flex-col items-center gap-8">
            <Link
              href="/projects/new"
              onClick={onClose}
              className="action-orb action-orb-primary"
              aria-label="Create new project"
            >
              <span className="action-orb-core">
                <span className="action-orb-content">
                  <Plus className="action-orb-plus" size={34} strokeWidth={2.35} />
                  <span className="action-orb-label">New Project</span>
                </span>
              </span>
            </Link>
            <Link
              href="/tasks/new"
              onClick={onClose}
              className="action-orb action-orb-secondary"
              aria-label="Create new task"
            >
              <span className="action-orb-core">
                <span className="action-orb-content">
                  <Plus className="action-orb-plus" size={34} strokeWidth={2.35} />
                  <span className="action-orb-label">New Task</span>
                </span>
              </span>
            </Link>
          </div>
        </div>
      )}
    </aside>
  );
}

function NavSection({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div>
      <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">{label}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function NavLink({
  item,
  active,
  badge,
  onNavigate,
}: {
  item: { href: string; label: string; icon: LucideIcon };
  active: boolean;
  badge?: number;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-all ${
        active
          ? "bg-brand-primary/10 text-brand-primary font-semibold"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <Icon size={15} />
      <span className="flex-1">{item.label}</span>
      {badge && badge > 0 ? (
        <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-brand-primary px-1 py-px text-[10px] font-bold leading-none text-white">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </Link>
  );
}
