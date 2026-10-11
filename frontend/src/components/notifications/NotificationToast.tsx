/**
 * Notification toast component.
 *
 * Displays real-time toast notifications for high-priority events.
 * Uses the existing sonner toaster with custom styling.
 */

import { toast } from "sonner";
import { useSSENotifications, type SSEEvent, type Notification } from "@/lib/notification-api";
import { useNotificationStore, getNotificationIcon } from "@/lib/notification-store";

export function NotificationToastHandler() {
  const addToast = useNotificationStore((state) => state.addToast);
  const incrementUnreadCount = useNotificationStore((state) => state.incrementUnreadCount);
  const setLastNotification = useNotificationStore((state) => state.setLastNotification);

  // Handle incoming SSE notifications
  const handleNotification = (data: SSEEvent["data"]) => {
    if (!data) return;

    // The SSE payload is a partial notification; hydrate it for the store.
    const notification = data as unknown as Notification;

    // Add to toast queue
    addToast(notification);
    incrementUnreadCount();
    setLastNotification(notification);

    // Show toast for high/critical priority
    if (data.priority === "high" || data.priority === "critical") {
      const icon = getNotificationIcon(data.type || "system.announcement");

      toast.custom(
        (t) => (
          <div className="panel flex items-start gap-3 p-4 shadow-xl">
            <span className="text-xl">{icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{data.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{data.message}</p>
              {data.actionUrl && (
                <a
                  href={data.actionUrl}
                  onClick={() => toast.dismiss(t)}
                  className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
                >
                  {data.actionLabel || "View Details"} →
                </a>
              )}
            </div>
            <button
              type="button"
              onClick={() => toast.dismiss(t)}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
        ),
        {
          duration: 10000,
          position: "top-right",
        },
      );
    }
  };

  // Initialize SSE connection
  useSSENotifications(handleNotification);

  return null;
}
