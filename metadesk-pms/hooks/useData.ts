import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

export function useCurrentUser() {
  const { status } = useSession();

  return useQuery({
    queryKey: ["current-user"],
    enabled: status === "authenticated",
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const res = await fetch("/api/users/me");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });
}

// ─── Projects ─────────────────────────────────────────────
export function useProjects(status?: string) {
  return useQuery({
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
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ["project", id],
    staleTime: 30 * 1000,
    queryFn: async () => {
      const res = await fetch(`/api/projects/${id}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    enabled: !!id,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ─── Tasks ────────────────────────────────────────────────
export function useTasks(filters?: { project?: string; assignedTo?: string; status?: string }) {
  return useQuery({
    queryKey: ["tasks", filters],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.project) params.set("project", filters.project);
      if (filters?.assignedTo) params.set("assignedTo", filters.assignedTo);
      if (filters?.status) params.set("status", filters.status);
      const res = await fetch(`/api/tasks?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ─── Notifications ────────────────────────────────────────
export function useNotifications() {
  const { status } = useSession();

  return useQuery({
    queryKey: ["notifications"],
    enabled: status === "authenticated",
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    staleTime: 2_000,
    refetchInterval: 3_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
}
