"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, KeyRound, Mail, Shield, X } from "lucide-react";
import toast from "react-hot-toast";
import { useCurrentUser } from "@/hooks/useData";

const PREFS = [
  ["taskAssigned", "Task assigned"],
  ["deadlineReminder", "Deadline reminders"],
  ["projectUpdate", "Project updates"],
  ["commentMention", "Comment mentions"],
  ["fileUploaded", "File uploads"],
];

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const { data: currentUser } = useCurrentUser();
  const qc = useQueryClient();
  const user = (currentUser || session?.user) as any;
  const [avatar, setAvatar] = useState("");
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false);
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    taskAssigned: true,
    deadlineReminder: true,
    projectUpdate: true,
    commentMention: true,
    fileUploaded: false,
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const savedPrefs = window.localStorage.getItem("metadesk-notification-prefs");
    if (savedPrefs) setPrefs(JSON.parse(savedPrefs));
  }, []);

  useEffect(() => {
    setAvatar(user?.avatar || "");
  }, [user?.avatar]);

  const updateAvatarMutation = useMutation({
    mutationFn: async (nextAvatar: string) => {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: nextAvatar }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: async (updatedUser: any) => {
      setAvatar(updatedUser.avatar || "");
      qc.setQueryData(["current-user"], updatedUser);
      await updateSession();
      qc.invalidateQueries({ queryKey: ["current-user"] });
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["mentions"] });
      qc.invalidateQueries({ queryKey: ["messages"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function updateAvatar(file?: File) {
    if (!file) return;
    if (file.size > 1_500_000) {
      toast.error("Please choose an image under 1.5 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateAvatarMutation.mutate(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function togglePref(key: string) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    window.localStorage.setItem("metadesk-notification-prefs", JSON.stringify(next));
  }

  function updatePasswordField(key: string, value: string) {
    setPasswordForm((current) => ({ ...current, [key]: value }));
  }

  function handlePasswordSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (passwordForm.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    updatePasswordMutation.mutate();
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Profile</h1>
        <p className="text-brand-muted text-sm mt-1">Account details, display picture, and notification preferences.</p>
      </div>

      <div className="card p-6">
        <div className="flex items-start gap-5">
          <div className="relative">
            <button
              type="button"
              onClick={() => avatar && setAvatarPreviewOpen(true)}
              className="w-20 h-20 rounded-xl bg-brand-primary/20 text-brand-primary flex items-center justify-center text-lg font-semibold overflow-hidden border border-brand-border transition hover:ring-4 hover:ring-brand-primary/15"
              title={avatar ? "View display picture" : "Add display picture"}
            >
              {avatar ? <img src={avatar} alt={user?.name || "Profile"} className="w-full h-full object-cover" /> : user?.name?.charAt(0) || "U"}
            </button>
            <label className="absolute -right-2 -bottom-2 w-8 h-8 rounded-lg bg-brand-primary text-white flex items-center justify-center cursor-pointer border border-brand-border shadow-lg transition hover:bg-blue-700">
              <Camera size={15} />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => updateAvatar(e.target.files?.[0])} />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            <Field label="Name" value={user?.name || "Demo User"} />
            <Field label="Role" value={user?.role || "employee"} icon={<Shield size={14} />} />
            <Field label="Email" value={user?.email || "demo@example.com"} icon={<Mail size={14} />} />
            <Field label="Team" value={user?.team || "Demo"} />
            <Field label="Designation" value={user?.designation || "Tester"} />
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-white font-medium mb-4">Email Notification Preferences</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PREFS.map(([key, label]) => (
            <label key={key} className="flex items-center justify-between gap-3 rounded-lg border border-brand-border bg-brand-dark p-4">
              <span className="text-slate-200 text-sm">{label}</span>
              <input type="checkbox" checked={prefs[key]} onChange={() => togglePref(key)} />
            </label>
          ))}
        </div>
      </div>

      <form onSubmit={handlePasswordSubmit} className="card p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
            <KeyRound size={18} />
          </div>
          <div>
            <h2 className="text-white font-medium">Change Password</h2>
            <p className="text-sm text-brand-muted">Update the password used for your Metadesk account.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Current password</label>
            <input
              type="password"
              className="input-base"
              placeholder="Enter current password"
              value={passwordForm.currentPassword}
              onChange={(event) => updatePasswordField("currentPassword", event.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">New password</label>
            <input
              type="password"
              className="input-base"
              placeholder="Enter new password"
              value={passwordForm.newPassword}
              onChange={(event) => updatePasswordField("newPassword", event.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-slate-400">Confirm password</label>
            <input
              type="password"
              className="input-base"
              placeholder="Confirm new password"
              value={passwordForm.confirmPassword}
              onChange={(event) => updatePasswordField("confirmPassword", event.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn-primary mt-5"
          disabled={updatePasswordMutation.isPending}
        >
          {updatePasswordMutation.isPending ? "Changing..." : "Change password"}
        </button>
      </form>

      {avatarPreviewOpen && avatar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl dashboard-dark:bg-[#151515]">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dashboard-dark:border-white/10">
              <div>
                <h2 className="text-sm font-semibold text-slate-950 dashboard-dark:text-white">Display picture</h2>
                <p className="text-xs text-slate-500 dashboard-dark:text-slate-400">{user?.name || "Profile"}</p>
              </div>
              <button
                type="button"
                onClick={() => setAvatarPreviewOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-950 dashboard-dark:hover:bg-white/10 dashboard-dark:hover:text-white"
                aria-label="Close display picture preview"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex items-center justify-center bg-slate-50 p-6 dashboard-dark:bg-[#101010]">
              <img
                src={avatar}
                alt={user?.name || "Display picture"}
                className="max-h-[60vh] w-full rounded-2xl object-contain shadow-xl"
              />
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3 dashboard-dark:border-white/10">
              <label className="btn-primary cursor-pointer">
                Change picture
                <input type="file" accept="image/*" className="hidden" onChange={(e) => updateAvatar(e.target.files?.[0])} />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div>
      <p className="text-brand-muted text-sm">{label}</p>
      <p className="text-white capitalize mt-1 flex items-center gap-2">{icon}{value}</p>
    </div>
  );
}
