/**
 * Notification center page component.
 *
 * Full-page view with filtering, bulk actions, and infinite scroll.
 */

import React, { useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  X,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  type Notification,
  type NotificationType,
} from "@/lib/notification-api";

function formatDistanceToNow(date: Date, _options?: { addSuffix?: boolean }): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface NotificationCenterProps {
  onBack?: () => void;
}

const NOTIFICATION_TYPE_OPTIONS: { value: NotificationType | "all"; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "review.completed", label: "Review Completed" },
  { value: "review.failed", label: "Review Failed" },
  { value: "finding.critical", label: "Critical Finding" },
  { value: "report.ready", label: "Report Ready" },
  { value: "invitation.received", label: "Invitations" },
  { value: "member.joined", label: "Team Updates" },
  { value: "payment.failed", label: "Payment Issues" },
  { value: "subscription.expiring", label: "Subscription" },
  { value: "usage.warning", label: "Usage Warnings" },
  { value: "security.alert", label: "Security" },
];

const PRIORITY_ICONS: Record<string, React.ReactNode> = {
  low: <Info className="h-4 w-4 text-blue-400" />,
  normal: <CheckCircle className="h-4 w-4 text-green-400" />,
  high: <AlertTriangle className="h-4 w-4 text-yellow-400" />,
  critical: <XCircle className="h-4 w-4 text-red-400" />,
};

export function NotificationCenter({ onBack }: NotificationCenterProps) {
  const [selectedType, setSelectedType] = useState<NotificationType | "all">("all");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useNotifications({
    limit: 20,
    unreadOnly: showUnreadOnly,
    type: selectedType === "all" ? undefined : selectedType,
  });

  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();

  const notifications = data?.notifications || [];

  const handleSelectAll = () => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map((n) => n._id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkMarkAsRead = async () => {
    await Promise.all(Array.from(selectedIds).map((id) => markAsRead.mutateAsync(id)));
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    await Promise.all(Array.from(selectedIds).map((id) => deleteNotification.mutateAsync(id)));
    setSelectedIds(new Set());
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <Bell className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Notifications</h1>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <>
              <button
                type="button"
                onClick={handleBulkMarkAsRead}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark {selectedIds.size} read
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => markAllAsRead.mutate()}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Check className="h-3.5 w-3.5" />
            Mark all read
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 border-b border-border px-6 py-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as NotificationType | "all")}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {NOTIFICATION_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={showUnreadOnly}
            onChange={(e) => setShowUnreadOnly(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary/50"
          />
          <span className="text-sm text-muted-foreground">Unread only</span>
        </label>

        <div className="ml-auto">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={selectedIds.size === notifications.length && notifications.length > 0}
              onChange={handleSelectAll}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/50"
            />
            <span className="text-sm text-muted-foreground">Select all</span>
          </label>
        </div>
      </div>

      {/* Notification List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Bell className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-sm">No notifications found</p>
            <p className="text-xs mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification._id}
                notification={notification}
                isSelected={selectedIds.has(notification._id)}
                onSelect={() => handleSelectOne(notification._id)}
                onMarkAsRead={() => markAsRead.mutate(notification._id)}
                onDelete={() => deleteNotification.mutate(notification._id)}
              />
            ))}
          </div>
        )}

        {/* Load More */}
        {hasNextPage && (
          <div className="flex justify-center py-4">
            <button
              type="button"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
            >
              {isFetchingNextPage ? "Loading..." : "Load more"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Notification Item ────────────────────────────────────────────────────────

interface NotificationItemProps {
  notification: Notification;
  isSelected: boolean;
  onSelect: () => void;
  onMarkAsRead: () => void;
  onDelete: () => void;
}

function NotificationItem({
  notification,
  isSelected,
  onSelect,
  onMarkAsRead,
  onDelete,
}: NotificationItemProps) {
  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead();
    }

    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  return (
    <div
      className={cn(
        "group flex cursor-pointer items-start gap-4 px-6 py-4 transition-colors hover:bg-accent/30",
        !notification.read && "bg-primary/5",
        isSelected && "bg-accent/50",
      )}
      onClick={handleClick}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onSelect}
        onClick={(e) => e.stopPropagation()}
        className="mt-1 h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary/50"
      />

      {/* Priority Icon */}
      <div className="mt-0.5 shrink-0">{PRIORITY_ICONS[notification.priority]}</div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p
              className={cn(
                "text-sm",
                notification.read ? "text-muted-foreground" : "font-medium text-foreground",
              )}
            >
              {notification.title}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">{notification.message}</p>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {!notification.read && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead();
                }}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                title="Mark as read"
              >
                <Check className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Meta */}
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</span>
          <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium uppercase">
            {notification.type.replace(".", " ")}
          </span>
          {notification.actionUrl && (
            <span className="flex items-center gap-1 text-primary">
              <ExternalLink className="h-3 w-3" />
              {notification.actionLabel || "View"}
            </span>
          )}
        </div>
      </div>

      {/* Unread Indicator */}
      {!notification.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
    </div>
  );
}
