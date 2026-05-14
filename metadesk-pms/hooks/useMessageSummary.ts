"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

export type MessageSummaryContact = {
  id: string;
  name: string;
  avatar?: string;
  unreadCount: number;
  lastMessage?: {
    body: string;
    createdAt: string;
    senderId: string;
  } | null;
};

export function useMessageSummary() {
  const { status } = useSession();

  return useQuery({
    queryKey: ["messages", "summary"],
    enabled: status === "authenticated",
    staleTime: 2_000,
    refetchInterval: 3_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const res = await fetch("/api/messages");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      const contacts = (json.data.contacts || []) as MessageSummaryContact[];
      return {
        contacts,
        unreadCount: contacts.reduce((total, contact) => total + (contact.unreadCount || 0), 0),
      };
    },
  });
}
