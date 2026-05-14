"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, AtSign, Briefcase, CheckCircle2, ChevronDown, Lock, Mail, User, Users } from "lucide-react";
import toast from "react-hot-toast";
import BrandLogo from "@/components/BrandLogo";
import { DEFAULT_DEPARTMENTS } from "@/lib/departments";

const ALLOWED_EMAIL_DOMAINS = [
  "metadeskglobal.com",
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
];

const ALLOWED_EMAIL_MESSAGE =
  "Use @metadeskglobal.com, @gmail.com, @yahoo.com, @outlook.com, or @hotmail.com";

function hasAllowedEmailDomain(email: string) {
  const domain = email.split("@")[1]?.toLowerCase();
  return Boolean(domain && ALLOWED_EMAIL_DOMAINS.includes(domain));
}

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<string[]>([...DEFAULT_DEPARTMENTS]);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    team: "",
    designation: "",
  });

  useEffect(() => {
    let active = true;
    fetch("/api/departments", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (active && json.success && Array.isArray(json.data?.departments)) {
          setDepartments(json.data.departments);
        }
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, []);

  function update(key: string, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.team) return toast.error("Please select a team");
    if (form.password.length < 8) return toast.error("Password must be at least 8 characters");
    if (!hasAllowedEmailDomain(form.email)) return toast.error(ALLOWED_EMAIL_MESSAGE);

    setLoading(true);
    const res = await fetch("/api/users/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      toast.error(data.error || "Registration failed");
      return;
    }

    setSubmittedEmail(form.email);
    toast.success("Access request sent to managers");
  }

  return (
    <div className="auth-modern-bg min-h-screen flex items-center justify-center p-4 sm:p-8">
      <div className="auth-modern-shell grid w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-[0_35px_120px_rgba(0,0,0,0.45)] lg:grid-cols-2">
        <section className="flex min-h-[680px] flex-col px-6 py-8 sm:px-14">
          <div className="flex items-center gap-3">
            <BrandLogo compact />
            <div>
              <p className="text-base font-bold leading-tight text-slate-950">Metadesk Global</p>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-primary">Internal PMS</p>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center py-6">
            {submittedEmail ? (
              <div className="w-full text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-brand-primary">
                  <CheckCircle2 size={28} />
                </div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-brand-primary">Request sent</p>
                <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Waiting for approval</h1>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">
                  Your account request for <span className="font-semibold text-slate-700">{submittedEmail}</span> was sent to the managers.
                  You can sign in after a manager approves it.
                </p>
                <Link
                  href="/login"
                  className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-primary px-5 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(37,99,235,0.28)] transition hover:bg-blue-600"
                >
                  Back to sign in
                  <ArrowRight size={17} />
                </Link>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-brand-primary">Get Started</p>
                  <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Create account</h1>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    Already have an account?{" "}
                    <Link href="/login" className="font-medium text-brand-primary hover:underline">
                      Sign in
                    </Link>
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="mt-8 w-full space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Full name
                      </label>
                      <div className="auth-field">
                        <User size={16} className="text-slate-400 shrink-0" />
                        <input
                          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400"
                          placeholder="Enter full name"
                          value={form.name}
                          onChange={(e) => update("name", e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Username
                      </label>
                      <div className="auth-field">
                        <AtSign size={16} className="text-slate-400 shrink-0" />
                        <input
                          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400"
                          placeholder="Choose username"
                          value={form.username}
                          onChange={(e) => update("username", e.target.value.toLowerCase())}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Email address
                    </label>
                    <div className="auth-field">
                      <Mail size={16} className="text-slate-400 shrink-0" />
                      <input
                        type="email"
                        className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400"
                        placeholder="Enter email address"
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                        required
                        autoComplete="email"
                      />
                    </div>
                    <p className="mt-1.5 px-1 text-[11px] font-medium text-slate-400">
                      Allowed: @metadeskglobal.com, @gmail.com, @yahoo.com, @outlook.com, @hotmail.com.
                    </p>
                  </div>

                  <div>
                    <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Password
                    </label>
                    <div className="auth-field">
                      <Lock size={16} className="text-slate-400 shrink-0" />
                      <input
                        type="password"
                        className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400"
                        placeholder="Minimum 8 characters"
                        value={form.password}
                        onChange={(e) => update("password", e.target.value)}
                        required
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Team
                      </label>
                      <div className="auth-field auth-select-native">
                        <Users size={16} className="text-slate-400 shrink-0" />
                        <select
                          className={`min-w-0 flex-1 appearance-none bg-transparent text-sm font-semibold outline-none ${
                            form.team ? "text-slate-950" : "text-slate-400"
                          }`}
                          value={form.team}
                          onChange={(e) => update("team", e.target.value)}
                          required
                        >
                          <option value="" disabled>Select team</option>
                          {departments.map((department) => (
                            <option key={department} value={department}>
                              {department}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={15} className="pointer-events-none shrink-0 text-slate-400" />
                      </div>
                    </div>
                    <div>
                      <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Designation
                      </label>
                      <div className="auth-field">
                        <Briefcase size={16} className="text-slate-400 shrink-0" />
                        <input
                          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400"
                          placeholder="e.g. Developer"
                          value={form.designation}
                          onChange={(e) => update("designation", e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-700">
                    New accounts stay locked until a manager approves the access request.
                  </div>

                  <button
                    type="submit"
                    className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-primary px-5 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(37,99,235,0.28)] transition hover:bg-blue-600 disabled:opacity-50"
                    disabled={loading}
                  >
                    {loading ? "Sending request..." : "Request access"}
                    <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
                  </button>
                </form>
              </>
            )}
          </div>

          <p className="text-center text-xs text-slate-400">
            &copy; {new Date().getFullYear()} Metadesk Global. All rights reserved.
          </p>
        </section>

        <section className="auth-brand-panel relative hidden min-h-[680px] overflow-hidden lg:block">
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
                Join your team after manager approval.
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
