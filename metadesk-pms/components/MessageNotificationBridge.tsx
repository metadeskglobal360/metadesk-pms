"use client";

import { useEffect, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { useNotifications } from "@/hooks/useData";

export default function MessageNotificationBridge() {
  const { status } = useSession();
  const { data } = useNotifications();
  const initializedRef = useRef(false);
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const unreadNotifications = useMemo(() => {
    return [...(data?.notifications || [])]
      .filter((notification: any) => !notification.isRead)
      .sort((a: any, b: any) => +new Date(a.createdAt) - +new Date(b.createdAt));
  }, [data?.notifications]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        registrationRef.current = registration;
      })
      .catch(() => {
        registrationRef.current = null;
      });
  }, []);

  useEffect(() => {
    const unlockAudio = () => {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        const audio = new Audio("/sounds/notification.mp3");
        audio.muted = true;
        audio.play().finally(() => {
          audio.pause();
          audio.currentTime = 0;
        }).catch(() => null);
        return;
      }

      const context = new AudioContextClass();
      context.resume().finally(() => context.close().catch(() => null));
    };

    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  useEffect(() => {
    if (status !== "authenticated") {
      initializedRef.current = false;
      seenNotificationIdsRef.current.clear();
      return;
    }

    if (!initializedRef.current) {
      initializedRef.current = true;
      unreadNotifications.forEach((notification: any) => {
        if (notification?._id) seenNotificationIdsRef.current.add(notification._id);
      });
      return;
    }

    const freshNotifications = unreadNotifications
      .filter((notification: any) => notification?._id && !seenNotificationIdsRef.current.has(notification._id))
      .slice(-6);

    if (freshNotifications.length === 0) return;

    freshNotifications.forEach((notification: any) => {
      seenNotificationIdsRef.current.add(notification._id);
    });

    freshNotifications.forEach((notification: any, index: number) => {
      window.setTimeout(() => {
        notifyActivity(notification, registrationRef.current);
      }, index * 450);
    });
  }, [unreadNotifications, status]);

  return null;
}

function notifyActivity(notification: any, currentRegistration: ServiceWorkerRegistration | null) {
  const title = notificationTitle(notification.type);
  const body = notification.message || "Open Metadesk PMS to view the update.";
  const url = notification.link || "/dashboard";

  playNotificationSound();

  if (!("Notification" in window)) return;

  const showDesktopNotification = async () => {
    const options: NotificationOptions & { renotify?: boolean } = {
      body,
      icon: "/api/brand-logo",
      badge: "/api/brand-logo",
      tag: notification._id,
      renotify: true,
      silent: true,
      data: { url },
    };

    const registration =
      currentRegistration ||
      (navigator.serviceWorker ? await navigator.serviceWorker.ready.catch(() => null) : null);

    if (registration?.showNotification) {
      registration.showNotification(title, options);
      return;
    }

    const desktopNotification = new Notification(title, options);

    desktopNotification.onclick = () => {
      window.focus();
      window.location.href = url;
    };
  };

  if (Notification.permission === "granted") {
    showDesktopNotification();
  } else if (Notification.permission === "default") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") showDesktopNotification();
    });
  }
}

function notificationTitle(type: string) {
  if (type === "direct_message") return "New message";
  if (type === "comment_reply") return "New reply";
  if (type === "comment_added") return "New comment";
  if (type === "file_uploaded") return "File uploaded";
  if (type === "task_assigned") return "Task assigned";
  if (type === "task_completed") return "Task completed";
  if (type === "task_status_changed") return "Task updated";
  if (type === "project_update") return "Project updated";
  if (type === "project_assigned") return "Project assigned";
  if (type === "account_request") return "Account approval request";
  return "Metadesk PMS notification";
}

function playNotificationSound() {
  if (typeof window === "undefined") return;

  const audio = new Audio("/sounds/notification.mp3");
  let usedFallback = false;
  const fallbackOnce = () => {
    if (usedFallback) return;
    usedFallback = true;
    playFallbackTone();
  };

  audio.volume = 0.65;
  audio.addEventListener("error", fallbackOnce, { once: true });
  audio.play().catch(fallbackOnce);
}

function playFallbackTone() {
  if (typeof window === "undefined") return;

  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(660, context.currentTime + 0.18);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.24);
  window.setTimeout(() => context.close().catch(() => null), 320);
}
