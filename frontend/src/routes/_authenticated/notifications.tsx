/**
 * Notifications page route.
 *
 * Full-page notification center with filtering and preferences.
 */

import { createFileRoute } from "@tanstack/react-router";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { NotificationPreferences } from "@/components/notifications/NotificationPreferences";
import { useState } from "react";
import { Bell, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Notifications — ReviewX" },
      {
        name: "description",
        content: "Manage your ReviewX notifications and preferences.",
      },
    ],
  }),
  component: NotificationsPage,
});

type Tab = "notifications" | "preferences";

function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("notifications");

  return (
    <div className="flex h-full flex-col">
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-border px-6 pt-4">
        <button
          type="button"
          onClick={() => setActiveTab("notifications")}
          className={cn(
            "flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
            activeTab === "notifications"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <Bell className="h-4 w-4" />
          Notifications
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("preferences")}
          className={cn(
            "flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
            activeTab === "preferences"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <Settings className="h-4 w-4" />
          Preferences
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "notifications" ? (
          <NotificationCenter />
        ) : (
          <div className="h-full overflow-y-auto p-6">
            <div className="mx-auto max-w-3xl">
              <NotificationPreferences />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
