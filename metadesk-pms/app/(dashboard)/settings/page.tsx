"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Moon, Palette, Sun, UserRound, Users } from "lucide-react";
import { useSession } from "next-auth/react";

type ThemeMode = "light" | "dark";

export default function SettingsPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "employee";
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const saved = window.localStorage.getItem("metadesk-theme");
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);

  function applyTheme(next: ThemeMode) {
    setTheme(next);
    window.localStorage.setItem("metadesk-theme", next);
    const shell = document.querySelector(".dashboard-shell");
    if (shell) {
      shell.classList.remove("dashboard-light", "dashboard-dark");
      shell.classList.add(`dashboard-${next}`);
      if (next === "dark") {
        shell.classList.remove("bg-[#f6f7fb]", "text-slate-950");
        shell.classList.add("bg-[#111111]", "text-slate-100");
      } else {
        shell.classList.remove("bg-[#111111]", "text-slate-100");
        shell.classList.add("bg-[#f6f7fb]", "text-slate-950");
      }
    }
  }

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.22em] text-brand-primary">Preferences</p>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="mt-1 text-sm text-brand-muted">Manage your workspace appearance and preferences.</p>
      </div>

      {/* Appearance */}
      <div className="card p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
            <Palette size={18} />
          </div>
          <div>
            <h2 className="font-semibold text-white">Appearance</h2>
            <p className="text-sm text-brand-muted">Choose how the workspace looks for you.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
          {/* Light */}
          <button
            type="button"
            onClick={() => applyTheme("light")}
            className={`group flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all ${
              theme === "light"
                ? "border-brand-primary bg-brand-primary/5"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
              theme === "light" ? "bg-brand-primary text-white" : "bg-slate-100 text-slate-500"
            }`}>
              <Sun size={20} />
            </div>
            <div className="text-center">
              <p className={`text-sm font-semibold ${theme === "light" ? "text-brand-primary" : "text-white"}`}>Light</p>
              <p className="mt-0.5 text-xs text-brand-muted">Bright and clean</p>
            </div>
            {theme === "light" && (
              <span className="rounded-full bg-brand-primary px-2 py-0.5 text-[10px] font-bold text-white">Active</span>
            )}
          </button>

          {/* Dark */}
          <button
            type="button"
            onClick={() => applyTheme("dark")}
            className={`group flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all ${
              theme === "dark"
                ? "border-brand-primary bg-brand-primary/5"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
              theme === "dark" ? "bg-brand-primary text-white" : "bg-slate-100 text-slate-500"
            }`}>
              <Moon size={20} />
            </div>
            <div className="text-center">
              <p className={`text-sm font-semibold ${theme === "dark" ? "text-brand-primary" : "text-white"}`}>Dark</p>
              <p className="mt-0.5 text-xs text-brand-muted">Easy on the eyes</p>
            </div>
            {theme === "dark" && (
              <span className="rounded-full bg-brand-primary px-2 py-0.5 text-[10px] font-bold text-white">Active</span>
            )}
          </button>
        </div>
      </div>

      {/* Quick links */}
      <div className="card divide-y divide-slate-100 overflow-hidden p-0">
        <div className="px-6 py-4">
          <h2 className="font-semibold text-white">Account</h2>
        </div>

        <Link
          href="/profile"
          className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-slate-50"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
            <UserRound size={16} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Profile & Password</p>
            <p className="text-xs text-brand-muted">Update display picture, name, and password</p>
          </div>
          <span className="text-xs text-brand-muted">→</span>
        </Link>

        <Link
          href="/notifications"
          className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-slate-50"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <Bell size={16} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Notifications</p>
            <p className="text-xs text-brand-muted">View and manage your notifications</p>
          </div>
          <span className="text-xs text-brand-muted">→</span>
        </Link>

        {role === "manager" && (
          <Link
            href="/team"
            className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-slate-50"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Users size={16} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Team Directory</p>
              <p className="text-xs text-brand-muted">Manage team members, roles, and permissions</p>
            </div>
            <span className="text-xs text-brand-muted">→</span>
          </Link>
        )}
      </div>
    </div>
  );
}
