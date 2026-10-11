/**
 * Notification API client and React Query hooks.
 *
 * Provides typed access to the notification backend API
 * and real-time updates via SSE.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { getApiBaseUrl, getAuthToken, request } from "./api";

// ── Types ────────────────────────────────────────────────────────────────────

export type NotificationType =
  | "review.queued"
  | "review.started"
  | "review.completed"
  | "review.failed"
  | "finding.critical"
  | "finding.new"
  | "report.ready"
  | "report.failed"
  | "invitation.received"
  | "invitation.accepted"
  | "member.joined"
  | "member.removed"
  | "role.changed"
  | "subscription.expiring"
  | "subscription.expired"
  | "payment.failed"
  | "upgrade.requested"
  | "upgrade.approved"
  | "usage.warning"
  | "security.alert"
  | "security.new_login"
  | "system.maintenance"
  | "system.announcement";

export type NotificationPriority = "low" | "normal" | "high" | "critical";

export interface Notification {
  _id: string;
  user: string;
  company?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  priority: NotificationPriority;
  channels: string[];
  deliveryStatus: {
    inApp: "pending" | "delivered" | "failed";
    email: "pending" | "delivered" | "failed" | "skipped";
  };
  read: boolean;
  readAt?: string | null;
  actionUrl?: string | null;
  actionLabel?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  types: Array<{
    type: NotificationType;
    email: boolean;
    inApp: boolean;
  }>;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  digest: {
    enabled: boolean;
    frequency: "daily" | "weekly";
    time: string;
  };
}

export interface NotificationListParams {
  unreadOnly?: boolean;
  type?: NotificationType;
  limit?: number;
  offset?: number;
}

export interface NotificationListResponse {
  notifications: Notification[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

// ── API Functions ────────────────────────────────────────────────────────────

export async function fetchNotifications(
  params: NotificationListParams = {},
): Promise<NotificationListResponse> {
  const searchParams = new URLSearchParams();
  if (params.unreadOnly) searchParams.set("unreadOnly", "true");
  if (params.type) searchParams.set("type", params.type);
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.offset) searchParams.set("offset", String(params.offset));

  const query = searchParams.toString();
  return request<NotificationListResponse>(`/notifications${query ? `?${query}` : ""}`);
}

export async function fetchUnreadCount(): Promise<{ count: number }> {
  return request<{ count: number }>("/notifications/unread-count");
}

export async function markNotificationAsRead(id: string): Promise<{ notification: Notification }> {
  return request<{ notification: Notification }>(`/notifications/${id}/read`, {
    method: "PATCH",
  });
}

export async function markAllNotificationsAsRead(): Promise<{ modifiedCount: number }> {
  return request<{ modifiedCount: number }>("/notifications/read-all", {
    method: "PATCH",
  });
}

export async function deleteNotification(id: string): Promise<null> {
  return request<null>(`/notifications/${id}`, {
    method: "DELETE",
  });
}

export async function fetchPreferences(): Promise<{ preferences: NotificationPreferences }> {
  return request<{ preferences: NotificationPreferences }>("/notifications/preferences");
}

export async function updatePreferences(
  updates: Partial<NotificationPreferences>,
): Promise<{ preferences: NotificationPreferences }> {
  return request<{ preferences: NotificationPreferences }>("/notifications/preferences", {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

// ── React Query Hooks ────────────────────────────────────────────────────────

export function useNotifications(params: NotificationListParams = {}) {
  return useQuery({
    queryKey: ["notifications", params],
    queryFn: () => fetchNotifications(params),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Auto-refetch every minute
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: fetchUnreadCount,
    staleTime: 15000, // 15 seconds
    refetchInterval: 30000, // Auto-refetch every 30 seconds
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markNotificationAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function usePreferences() {
  return useQuery({
    queryKey: ["notifications", "preferences"],
    queryFn: fetchPreferences,
    staleTime: 300000, // 5 minutes
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Partial<NotificationPreferences>) => updatePreferences(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", "preferences"] });
    },
  });
}

// ── SSE (Server-Sent Events) ─────────────────────────────────────────────────

export interface SSEEvent {
  type: "connected" | "heartbeat" | "notification.created" | "notification.read";
  data?: {
    id?: string;
    type?: NotificationType;
    title?: string;
    message?: string;
    priority?: NotificationPriority;
    actionUrl?: string;
    actionLabel?: string;
    data?: Record<string, unknown>;
    createdAt?: string;
  };
  timestamp?: string;
}

export function useSSENotifications(
  onNotification?: (notification: SSEEvent["data"]) => void,
  enabled: boolean = true,
) {
  const queryClient = useQueryClient();

  // Keep the latest callback in a ref so the connection effect does not
  // re-run (and re-open the stream) on every render.
  const callbackRef = useRef(onNotification);
  callbackRef.current = onNotification;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const token = getAuthToken();
    if (!token) return;

    const eventSource = new EventSource(
      `${getApiBaseUrl()}/notifications/stream?token=${encodeURIComponent(token)}`,
    );

    eventSource.onmessage = (event) => {
      try {
        const parsed: SSEEvent = JSON.parse(event.data);

        if (parsed.type === "notification.created" && parsed.data) {
          // Refresh the notification lists and unread badge.
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          callbackRef.current?.(parsed.data);
        }
      } catch (err) {
        console.error("[SSE] Failed to parse message:", err);
      }
    };

    eventSource.onerror = () => {
      // EventSource reconnects automatically; only log for debugging.
      console.warn("[SSE] Connection interrupted, reconnecting…");
    };

    return () => {
      eventSource.close();
    };
  }, [enabled, queryClient]);
}
