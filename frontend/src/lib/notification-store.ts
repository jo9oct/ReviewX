/**
 * Notification store (Zustand).
 *
 * Manages client-side notification state including
 * unread count, toast queue, and real-time updates.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Notification, NotificationType } from "./notification-api";

interface NotificationState {
  // Unread count (global)
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  incrementUnreadCount: () => void;
  decrementUnreadCount: () => void;

  // Toast queue (for real-time notifications)
  toasts: Notification[];
  addToast: (notification: Notification) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  // SSE connection status
  isConnected: boolean;
  setConnected: (connected: boolean) => void;

  // Last notification (for sound effects, etc.)
  lastNotification: Notification | null;
  setLastNotification: (notification: Notification | null) => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      // Unread count
      unreadCount: 0,
      setUnreadCount: (count) => set({ unreadCount: Math.max(0, count) }),
      incrementUnreadCount: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
      decrementUnreadCount: () =>
        set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),

      // Toast queue
      toasts: [],
      addToast: (notification) =>
        set((state) => ({
          toasts: [...state.toasts.slice(-4), notification], // Keep max 5 toasts
        })),
      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t._id !== id),
        })),
      clearToasts: () => set({ toasts: [] }),

      // SSE connection
      isConnected: false,
      setConnected: (connected) => set({ isConnected: connected }),

      // Last notification
      lastNotification: null,
      setLastNotification: (notification) => set({ lastNotification: notification }),
    }),
    {
      name: "notification-store",
      partialize: (state) => ({
        unreadCount: state.unreadCount,
        isConnected: state.isConnected,
      }),
    },
  ),
);

// ── Selectors ────────────────────────────────────────────────────────────────

export const selectUnreadCount = (state: NotificationState) => state.unreadCount;
export const selectToasts = (state: NotificationState) => state.toasts;
export const selectIsConnected = (state: NotificationState) => state.isConnected;

// ── Helpers ──────────────────────────────────────────────────────────────────

export const getNotificationIcon = (type: NotificationType): string => {
  const icons: Record<NotificationType, string> = {
    "review.queued": "⏳",
    "review.started": "🔄",
    "review.completed": "✅",
    "review.failed": "❌",
    "finding.critical": "🚨",
    "finding.new": "🔍",
    "report.ready": "📄",
    "report.failed": "⚠️",
    "invitation.received": "📨",
    "invitation.accepted": "🎉",
    "member.joined": "👋",
    "member.removed": "👋",
    "role.changed": "🔑",
    "subscription.expiring": "⏰",
    "subscription.expired": "⚠️",
    "payment.failed": "💳",
    "upgrade.requested": "⬆️",
    "upgrade.approved": "✅",
    "usage.warning": "📊",
    "security.alert": "🔒",
    "security.new_login": "🔐",
    "system.maintenance": "🔧",
    "system.announcement": "📢",
  };

  return icons[type] || "🔔";
};

export const getPriorityColor = (priority: string): string => {
  const colors: Record<string, string> = {
    low: "text-blue-400",
    normal: "text-green-400",
    high: "text-yellow-400",
    critical: "text-red-400",
  };

  return colors[priority] || "text-gray-400";
};
