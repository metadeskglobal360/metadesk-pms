"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { Edit3, MessageSquare, Reply, Search, Send, Smile, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { useCurrentUser } from "@/hooks/useData";

type MessageContact = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  designation: string;
  team: string;
  role: string;
  unreadCount: number;
  lastMessage?: {
    body: string;
    createdAt: string;
    senderId: string;
  } | null;
};

type DirectMessage = {
  _id: string;
  sender: MessageContact;
  recipient: MessageContact;
  body: string;
  replyTo?: { id: string; body: string; authorName: string };
  isRead: boolean;
  isEdited?: boolean;
  createdAt: string;
  updatedAt?: string;
};

function msgTime(iso: string) {
  const d = new Date(iso);
  if (isToday(d))     return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
}

export default function MessagesPage() {
  const { data: session }    = useSession();
  const { data: currentUser } = useCurrentUser();
  const liveUser              = (currentUser || session?.user) as any;
  const searchParams         = useSearchParams();
  const requestedContactId   = searchParams.get("with") || "";
  const currentUserId        = liveUser?.id;
  const currentRole          = liveUser?.role || "employee";
  const qc                   = useQueryClient();
  const messagesEndRef        = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId]     = useState("");
  const [search, setSearch]             = useState("");
  const [draft, setDraft]               = useState("");
  const [replyingTo, setReplyingTo]     = useState<DirectMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<DirectMessage | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["messages", selectedId],
    staleTime: 0,
    queryFn: async () => {
      const url  = selectedId ? `/api/messages?with=${selectedId}` : "/api/messages";
      const res  = await fetch(url);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as { contacts: MessageContact[]; messages: DirectMessage[] };
    },
    refetchInterval: selectedId ? 2_000 : 3_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  const contacts = useMemo(() => data?.contacts || [], [data?.contacts]);
  const messages = useMemo(() => data?.messages || [], [data?.messages]);

  useEffect(() => {
    fetch("/api/notifications", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ link: "/messages" }),
    }).then(() => qc.invalidateQueries({ queryKey: ["notifications"] }));
  }, [qc]);

  useEffect(() => {
    if (requestedContactId && contacts.some((c) => c.id === requestedContactId) && selectedId !== requestedContactId) {
      setSelectedId(requestedContactId);
      return;
    }
    if (!selectedId && contacts.length > 0) setSelectedId(contacts[0].id);
  }, [contacts, requestedContactId, selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, selectedId]);

  useEffect(() => {
    setReplyingTo(null);
    setEditingMessage(null);
    setDraft("");
  }, [selectedId]);

  const filteredContacts = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return contacts;
    return contacts.filter((c) =>
      [c.name, c.email, c.designation, c.team, c.role].some((v) => v.toLowerCase().includes(term))
    );
  }, [contacts, search]);

  /* Group contacts by message recency */
  const grouped = useMemo(() => {
    const today: MessageContact[]     = [];
    const yesterday: MessageContact[] = [];
    const older: MessageContact[]     = [];

    filteredContacts.forEach((c) => {
      if (!c.lastMessage) { older.push(c); return; }
      const d = new Date(c.lastMessage.createdAt);
      if (isToday(d))     today.push(c);
      else if (isYesterday(d)) yesterday.push(c);
      else older.push(c);
    });
    return { today, yesterday, older };
  }, [filteredContacts]);

  const selectedContact = contacts.find((c) => c.id === selectedId);

  const sendMessage = useMutation({
    mutationFn: async ({ body, replyTo }: { body: string; replyTo?: DirectMessage | null }) => {
      const res  = await fetch("/api/messages", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ recipientId: selectedId, body, replyTo: replyTo?._id }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onMutate: async ({ body, replyTo }) => {
      if (!selectedContact || !currentUserId) return {};
      const queryKey = ["messages", selectedId];
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<{ contacts: MessageContact[]; messages: DirectMessage[] }>(queryKey);
      const createdAt = new Date().toISOString();
      const optimisticMessage: DirectMessage = {
        _id: `temp-${createdAt}`,
        sender: {
          id: currentUserId,
          name: liveUser?.name || "You",
          email: liveUser?.email || "",
          avatar: liveUser?.avatar || "",
          designation: liveUser?.designation || "",
          team: liveUser?.team || "",
          role: currentRole,
          unreadCount: 0,
        },
        recipient: selectedContact,
        body,
        replyTo: replyTo ? { id: replyTo._id, body: replyTo.body, authorName: replyTo.sender.name } : undefined,
        isRead: false,
        createdAt,
      };

      qc.setQueryData(queryKey, (current: any) => {
        if (!current) return current;
        return {
          ...current,
          contacts: (current.contacts || []).map((contact: MessageContact) =>
            contact.id === selectedId
              ? { ...contact, lastMessage: { body, createdAt, senderId: currentUserId } }
              : contact
          ),
          messages: [...(current.messages || []), optimisticMessage],
        };
      });

      setDraft("");
      setReplyingTo(null);
      return { previous, queryKey };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err: Error, _vars, context: any) => {
      if (context?.queryKey && context?.previous) qc.setQueryData(context.queryKey, context.previous);
      toast.error(err.message);
    },
  });

  const updateMessage = useMutation({
    mutationFn: async () => {
      if (!editingMessage) throw new Error("No message selected");
      const res = await fetch(`/api/messages/${editingMessage._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft.trim() }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      setDraft("");
      setEditingMessage(null);
      qc.invalidateQueries({ queryKey: ["messages"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMessage = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/messages/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      setReplyingTo(null);
      setEditingMessage(null);
      qc.invalidateQueries({ queryKey: ["messages"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteChat = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/messages?with=${selectedId}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onMutate: async () => {
      const queryKey = ["messages", selectedId];
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<{ contacts: MessageContact[]; messages: DirectMessage[] }>(queryKey);
      qc.setQueryData(queryKey, (current: any) => {
        if (!current) return current;
        return {
          ...current,
          contacts: (current.contacts || []).map((contact: MessageContact) =>
            contact.id === selectedId ? { ...contact, unreadCount: 0, lastMessage: null } : contact
          ),
          messages: [],
        };
      });
      return { previous, queryKey };
    },
    onSuccess: () => {
      setDraft("");
      setReplyingTo(null);
      setEditingMessage(null);
      qc.invalidateQueries({ queryKey: ["messages"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err: Error, _vars, context: any) => {
      if (context?.queryKey && context?.previous) qc.setQueryData(context.queryKey, context.previous);
      toast.error(err.message);
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedId) return toast.error("Select a member first");
    if (!draft.trim()) return;
    if (editingMessage) {
      updateMessage.mutate();
      return;
    }
    sendMessage.mutate({ body: draft.trim(), replyTo: replyingTo });
  }

  function startEdit(message: DirectMessage) {
    setReplyingTo(null);
    setEditingMessage(message);
    setDraft(message.body);
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e as any); }
  }

  return (
    <div className="flex h-[calc(100vh-88px)] min-h-[620px] flex-col animate-fade-in sm:min-h-0">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-white">Messages</h1>
        <p className="mt-1 text-sm text-brand-muted">Direct conversations with every active Metadesk member.</p>
      </div>

      <div className="card flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] lg:grid lg:grid-cols-[320px_1fr]">

        {/* ─── Contact list ──────────────────────────────── */}
        <aside className="flex max-h-[38vh] min-h-0 flex-col border-b border-slate-100 bg-white lg:max-h-none lg:border-b-0 lg:border-r">
          {/* Search */}
          <div className="border-b border-slate-100 p-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                className="w-full rounded-full border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-[13px] text-slate-900 placeholder-slate-400 outline-none focus:border-brand-primary focus:bg-white transition-colors"
                placeholder="Search chat"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-1 p-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-10 text-center">
                <MessageSquare size={28} className="mb-3 text-slate-300" />
                <p className="font-medium text-slate-600">No members found</p>
              </div>
            ) : (
              <>
                <ContactGroup label={`Today (${grouped.today.length} Messages)`} contacts={grouped.today} selectedId={selectedId} currentUserId={currentUserId} onSelect={setSelectedId} />
                <ContactGroup label={`Yesterday (${grouped.yesterday.length} Messages)`} contacts={grouped.yesterday} selectedId={selectedId} currentUserId={currentUserId} onSelect={setSelectedId} />
                <ContactGroup label="Earlier" contacts={grouped.older} selectedId={selectedId} currentUserId={currentUserId} onSelect={setSelectedId} />
              </>
            )}
          </div>
        </aside>

        {/* ─── Chat panel ────────────────────────────────── */}
        <section className="flex min-h-0 flex-1 flex-col bg-slate-50">
          {selectedContact ? (
            <>
              {/* Chat header */}
              <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 bg-white px-5 py-4">
                <ContactAvatar user={selectedContact} size="lg" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-bold text-slate-950">{selectedContact.name}</h2>
                  <p className="text-xs text-slate-400">{selectedContact.designation}</p>
                </div>
                <button
                  type="button"
                  onClick={() => window.confirm(`Clear this chat with ${selectedContact.name} for you only?`) && deleteChat.mutate()}
                  disabled={deleteChat.isPending || messages.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-40"
                  title="Clear chat for me"
                >
                  <Trash2 size={14} /> Clear chat
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <MessageSquare size={36} className="mx-auto mb-3 text-slate-300" />
                      <p className="font-medium text-slate-600">Start the conversation</p>
                      <p className="mt-1 text-sm text-slate-400">Send a message to {selectedContact.name}.</p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const mine = msg.sender.id === currentUserId;
                    const canDelete = mine || currentRole === "manager";
                    return (
                      <div key={msg._id} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                        {!mine && (
                          <ContactAvatar user={msg.sender} size="sm" />
                        )}
                        <div className={`group max-w-[72%]`}>
                          {msg.replyTo && (
                            <div className={`mb-1.5 rounded-xl border-l-4 px-3 py-2 text-xs ${
                              mine
                                ? "border-brand-primary bg-blue-50 text-slate-700"
                                : "border-brand-primary bg-white text-slate-600"
                            }`}>
                              <p className="font-semibold">{msg.replyTo.authorName}</p>
                              <p className="line-clamp-2 mt-0.5">{msg.replyTo.body}</p>
                            </div>
                          )}
                          <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                            mine
                              ? "rounded-br-md bg-brand-primary text-white"
                              : "rounded-bl-md border border-slate-100 bg-white text-slate-950"
                          }`}>
                            {msg.body}
                          </div>
                          <div className={`mt-1 flex items-center gap-2 text-[11px] ${mine ? "justify-end" : "justify-start"} text-slate-400`}>
                            <span>{format(new Date(msg.createdAt), "h:mm a")}</span>
                            {msg.isEdited && <span>Edited</span>}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMessage(null);
                                setReplyingTo(msg);
                                setDraft("");
                              }}
                              className="hidden group-hover:flex items-center gap-1 hover:text-brand-primary transition-colors"
                            >
                              <Reply size={11} /> Reply
                            </button>
                            {mine && (
                              <button
                                type="button"
                                onClick={() => startEdit(msg)}
                                className="hidden group-hover:flex items-center gap-1 hover:text-brand-primary transition-colors"
                              >
                                <Edit3 size={11} /> Edit
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => window.confirm("Delete this message for everyone?") && deleteMessage.mutate(msg._id)}
                                className="hidden group-hover:flex items-center gap-1 hover:text-red-600 transition-colors"
                              >
                                <Trash2 size={11} /> Delete
                              </button>
                            )}
                          </div>
                        </div>
                        {mine && (
                          <ContactAvatar user={msg.sender} size="sm" />
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <form onSubmit={handleSubmit} className="shrink-0 border-t border-slate-100 bg-white px-4 py-3">
                {replyingTo && (
                  <div className="mb-2 flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
                    <div className="min-w-0 border-l-4 border-brand-primary pl-3">
                      <p className="text-xs font-semibold text-slate-800">
                        Replying to {replyingTo.sender.id === currentUserId ? "yourself" : replyingTo.sender.name}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{replyingTo.body}</p>
                    </div>
                    <button type="button" onClick={() => setReplyingTo(null)} className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                )}
                {editingMessage && (
                  <div className="mb-2 flex items-start justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5">
                    <div className="min-w-0 border-l-4 border-brand-primary pl-3">
                      <p className="text-xs font-semibold text-slate-800">Editing message</p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{editingMessage.body}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMessage(null);
                        setDraft("");
                      }}
                      className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="shrink-0 rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    title="Emoji (coming soon)"
                  >
                    <Smile size={18} />
                  </button>
                  <input
                    className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-brand-primary focus:bg-white transition-colors"
                    placeholder={editingMessage ? "Edit your message..." : `Message ${selectedContact.name}...`}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKey}
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || sendMessage.isPending || updateMessage.isPending}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white shadow-[0_8px_18px_rgba(37,99,235,0.28)] transition-all hover:bg-blue-600 disabled:opacity-40"
                    title="Send message"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-center">
              <div>
                <MessageSquare size={36} className="mx-auto mb-3 text-slate-300" />
                <p className="font-medium text-slate-600">Select a member</p>
                <p className="mt-1 text-sm text-slate-400">Choose someone from the list to start messaging.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* ─── Contact group ───────────────────────────────────── */
function ContactGroup({
  label, contacts, selectedId, currentUserId, onSelect,
}: {
  label: string;
  contacts: MessageContact[];
  selectedId: string;
  currentUserId: string;
  onSelect: (id: string) => void;
}) {
  if (contacts.length === 0) return null;
  return (
    <div>
      <p className="px-4 pt-4 pb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      {contacts.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onSelect(c.id)}
          className={`w-full px-3 py-3 text-left transition-colors ${
            selectedId === c.id ? "bg-brand-primary/10" : "hover:bg-slate-50"
          }`}
        >
          <div className="flex items-center gap-3">
            <ContactAvatar user={c} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[13px] font-semibold text-slate-950">{c.name}</p>
                <span className="shrink-0 text-[11px] text-slate-400">
                  {c.lastMessage ? msgTime(c.lastMessage.createdAt) : ""}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-400">
                {c.lastMessage
                  ? (c.lastMessage.senderId === currentUserId ? `You: ${c.lastMessage.body}` : c.lastMessage.body)
                  : "No messages yet"}
              </p>
            </div>
            {c.unreadCount > 0 && (
              <span className="shrink-0 rounded-full bg-brand-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                {c.unreadCount}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

/* ─── Avatar ──────────────────────────────────────────── */
function ContactAvatar({ user, size = "md" }: { user: { name: string; avatar?: string }; size?: "sm" | "md" | "lg" }) {
  const initials = user.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  const cls = size === "sm" ? "h-7 w-7 text-[10px]" : size === "lg" ? "h-10 w-10 text-sm" : "h-9 w-9 text-xs";
  return (
    <div className={`${cls} shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-blue-400 to-brand-primary font-bold text-white`}>
      {user.avatar ? (
        <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">{initials || "U"}</div>
      )}
    </div>
  );
}
