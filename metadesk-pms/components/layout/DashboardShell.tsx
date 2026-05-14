"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";

type ThemeMode = "light" | "dark";
const THEME_STORAGE_KEY = "metadesk-theme-v2";

export default function DashboardShell({ children, user }: { children: React.ReactNode; user: any }) {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    const routes = [
      "/dashboard",
      "/projects",
      "/tasks",
      "/tasks?scope=standalone",
      "/messages",
      "/notifications",
      "/team",
      "/settings",
      "/profile",
    ];

    const timer = window.setTimeout(() => {
      routes.forEach((route) => router.prefetch(route));
    }, 250);

    return () => window.clearTimeout(timer);
  }, [router]);

  function toggleTheme() {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }

  return (
    <div
      className={`dashboard-shell dashboard-${theme} flex h-screen overflow-hidden ${
        theme === "dark" ? "bg-[#111111] text-slate-100" : "bg-[#f6f7fb] text-slate-950"
      }`}
    >
      <Sidebar user={user} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[1px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar user={user} theme={theme} onToggleTheme={toggleTheme} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7">
          {children}
        </main>
      </div>
    </div>
  );
}
