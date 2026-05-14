"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import toast from "react-hot-toast";
import BrandLogo from "@/components/BrandLogo";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const result = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      toast.error("Invalid credentials, inactive account, or waiting for manager approval");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="auth-modern-bg min-h-screen flex items-center justify-center p-4 sm:p-8">
      <div className="auth-modern-shell grid w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-[0_35px_120px_rgba(0,0,0,0.45)] lg:grid-cols-[0.95fr_1.05fr]">
        <section className="relative flex min-h-[660px] flex-col justify-between px-8 py-8 sm:px-16">
          <div className="flex items-center gap-3">
            <BrandLogo compact />
            <div>
              <p className="text-base font-bold leading-tight text-slate-950">Metadesk Global</p>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-primary">Internal PMS</p>
            </div>
          </div>

          <div className="mx-auto w-full max-w-md">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-brand-primary">Workspace access</p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Welcome back</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Sign in to manage projects, standalone tasks, team updates, messages, and deadlines.
            </p>

            <form onSubmit={handleSubmit} className="mt-10 space-y-4">
              <div>
                <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Email address
                </label>
                <div className="auth-field">
                  <Mail size={17} className="text-slate-400 shrink-0" />
                  <input
                    type="email"
                    className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400"
                    placeholder="Enter your email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Password
                </label>
                <div className="auth-field">
                  <Lock size={17} className="text-slate-400 shrink-0" />
                  <input
                    type={showPassword ? "text" : "password"}
                    className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400"
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <Eye size={17} /> : <EyeOff size={17} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="inline-flex items-center gap-2 text-slate-500 cursor-pointer select-none">
                  <input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300 text-brand-primary focus:ring-brand-primary" />
                  Remember me
                </label>
                <Link href="/register" className="font-semibold text-brand-primary hover:underline">
                  Create an account
                </Link>
              </div>

              <button
                type="submit"
                className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-primary px-5 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(37,99,235,0.3)] transition hover:bg-blue-600 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign in"}
                <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
              </button>
            </form>
          </div>

          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} Metadesk Global. All rights reserved.
          </p>
        </section>

        <section className="auth-brand-panel relative hidden min-h-[660px] overflow-hidden lg:block">
          <div className="auth-brand-curve" />
          <div className="relative z-10 flex h-full flex-col items-center justify-center px-12 py-12 text-center">
            <div className="absolute left-1/2 top-10 -translate-x-1/2 rounded-full border border-white/20 bg-white/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
              Innovation & Technology
            </div>

            <div className="flex max-w-[440px] flex-col items-center">
              <div className="mb-9 rounded-2xl bg-white/10 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.12)]">
                <BrandLogo />
              </div>
              <h2 className="text-balance text-4xl font-semibold leading-tight tracking-tight text-white">
                Project work, team communication, and delivery in one place.
              </h2>
              <p className="mt-5 max-w-sm text-sm leading-6 text-cyan-50/85">
                A focused internal workspace for Metadesk Global managers and employees.
              </p>
            </div>

            <div className="absolute bottom-10 left-1/2 grid w-full max-w-[510px] -translate-x-1/2 grid-cols-3 gap-3 px-8 text-center text-xs font-semibold text-cyan-50/90">
              <div className="flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">Projects</div>
              <div className="flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">Tasks</div>
              <div className="flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">Messages</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
