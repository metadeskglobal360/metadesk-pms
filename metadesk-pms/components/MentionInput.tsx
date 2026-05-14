"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type MentionUser = {
  id: string;
  name: string;
  username?: string;
  email?: string;
  avatar?: string;
  designation?: string;
  team?: string;
};

type MentionInputProps = {
  value: string;
  onChange: (value: string) => void;
  users: MentionUser[];
  placeholder?: string;
  disabled?: boolean;
  onSubmit?: () => void;
};

function getMentionTrigger(value: string, cursor: number) {
  const beforeCursor = value.slice(0, cursor);
  const match = beforeCursor.match(/(^|\s)@([a-zA-Z0-9._-]*)$/);

  if (!match) return null;

  return {
    start: beforeCursor.length - match[2].length - 1,
    query: match[2].toLowerCase(),
  };
}

function getHandle(user: MentionUser) {
  return (user.username || user.email?.split("@")[0] || user.name.split(/\s+/)[0] || "user")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");
}

export default function MentionInput({ value, onChange, users, placeholder, disabled, onSubmit }: MentionInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cursor, setCursor] = useState(0);
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const trigger = focused ? getMentionTrigger(value, cursor) : null;

  const suggestions = useMemo(() => {
    if (!trigger) return [];

    const uniqueUsers = Array.from(new Map(users.map((user) => [user.id, user])).values());
    return uniqueUsers
      .filter((user) => {
        if (!trigger.query) return true;
        const haystack = [user.name, user.username, user.email, user.designation, user.team]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(trigger.query);
      });
  }, [trigger, users]);

  const showSuggestions = Boolean(trigger && suggestions.length > 0);

  useEffect(() => {
    setActiveIndex(0);
  }, [trigger?.query]);

  function updateCursor() {
    const nextCursor = inputRef.current?.selectionStart ?? value.length;
    setCursor(nextCursor);
  }

  function selectUser(user: MentionUser) {
    if (!trigger) return;

    const handle = getHandle(user);
    const before = value.slice(0, trigger.start);
    const after = value.slice(cursor);
    const nextValue = `${before}@${handle} ${after}`;
    const nextCursor = before.length + handle.length + 2;

    onChange(nextValue);
    setCursor(nextCursor);

    window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(nextCursor, nextCursor);
    }, 0);
  }

  return (
    <div className="relative flex-1">
      <input
        ref={inputRef}
        className="input-base"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          onChange(event.target.value);
          setCursor(event.target.selectionStart ?? event.target.value.length);
        }}
        onClick={updateCursor}
        onKeyUp={updateCursor}
        onFocus={() => {
          setFocused(true);
          updateCursor();
        }}
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        onKeyDown={(event) => {
          if (showSuggestions) {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((index) => (index + 1) % suggestions.length);
              return;
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) => (index - 1 + suggestions.length) % suggestions.length);
              return;
            }
            if (event.key === "Enter" || event.key === "Tab") {
              event.preventDefault();
              selectUser(suggestions[activeIndex]);
              return;
            }
            if (event.key === "Escape") {
              setFocused(false);
              return;
            }
          }

          if (event.key === "Enter" && onSubmit) {
            event.preventDefault();
            onSubmit();
          }
        }}
      />

      {showSuggestions && (
        <div className="absolute left-0 top-full z-[80] mt-2 w-full max-w-md overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-3 py-2 text-xs font-medium text-slate-500">
            Mention project member
          </div>
          <div className="max-h-80 overflow-y-auto p-1">
            {suggestions.map((user, index) => (
              <button
                key={user.id}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectUser(user);
                }}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left ${
                  index === activeIndex ? "bg-blue-50" : "hover:bg-slate-50"
                }`}
              >
                <Avatar user={user} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-950">{user.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    @{getHandle(user)}{user.designation ? ` - ${user.designation}` : ""}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Avatar({ user }: { user: MentionUser }) {
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-blue-100 text-xs font-semibold text-brand-primary">
      {user.avatar ? (
        <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">{initials || "U"}</div>
      )}
    </div>
  );
}
