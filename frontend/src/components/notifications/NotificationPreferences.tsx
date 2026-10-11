/**
 * Notification preferences component.
 *
 * Settings page for managing notification channels, quiet hours,
 * and digest preferences.
 */

import React, { useState } from "react";
import { Bell, Mail, Moon, Clock, Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  usePreferences,
  useUpdatePreferences,
  type NotificationPreferences as Prefs,
  type NotificationType,
} from "@/lib/notification-api";
import { toast } from "sonner";

interface NotificationPreferencesProps {
  className?: string;
}

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  "review.queued": "Review Queued",
  "review.started": "Review Started",
  "review.completed": "Review Completed",
  "review.failed": "Review Failed",
  "finding.critical": "Critical Finding",
  "finding.new": "New Finding",
  "report.ready": "Report Ready",
  "report.failed": "Report Failed",
  "invitation.received": "Invitation Received",
  "invitation.accepted": "Invitation Accepted",
  "member.joined": "Member Joined",
  "member.removed": "Member Removed",
  "role.changed": "Role Changed",
  "subscription.expiring": "Subscription Expiring",
  "subscription.expired": "Subscription Expired",
  "payment.failed": "Payment Failed",
  "upgrade.requested": "Upgrade Requested",
  "upgrade.approved": "Upgrade Approved",
  "usage.warning": "Usage Warning",
  "security.alert": "Security Alert",
  "security.new_login": "New Login",
  "system.maintenance": "System Maintenance",
  "system.announcement": "Announcement",
};

const PRIORITY_TYPES: NotificationType[] = [
  "review.failed",
  "finding.critical",
  "payment.failed",
  "subscription.expired",
  "security.alert",
];

export function NotificationPreferences({ className }: NotificationPreferencesProps) {
  const { data, isLoading } = usePreferences();
  const updatePreferences = useUpdatePreferences();

  const [localPrefs, setLocalPrefs] = useState<Prefs | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize local state when data loads
  const prefs = localPrefs || data?.preferences;

  const handleToggleGlobal = (key: "emailEnabled" | "inAppEnabled") => {
    if (!prefs) return;
    setLocalPrefs({ ...prefs, [key]: !prefs[key] });
  };

  const handleToggleType = (type: string, channel: "email" | "inApp") => {
    if (!prefs) return;

    const existingIndex = prefs.types.findIndex((t) => t.type === type);

    if (existingIndex >= 0) {
      const newTypes = [...prefs.types];
      newTypes[existingIndex] = {
        ...newTypes[existingIndex],
        [channel]: !newTypes[existingIndex][channel],
      };
      setLocalPrefs({ ...prefs, types: newTypes });
    } else {
      setLocalPrefs({
        ...prefs,
        types: [
          ...prefs.types,
          {
            type: type as NotificationType,
            email: channel === "email",
            inApp: channel === "inApp",
          },
        ],
      });
    }
  };

  const handleQuietHoursChange = (updates: Partial<Prefs["quietHours"]>) => {
    if (!prefs) return;
    setLocalPrefs({
      ...prefs,
      quietHours: { ...prefs.quietHours, ...updates },
    });
  };

  const handleDigestChange = (updates: Partial<Prefs["digest"]>) => {
    if (!prefs) return;
    setLocalPrefs({
      ...prefs,
      digest: { ...prefs.digest, ...updates },
    });
  };

  const handleSave = async () => {
    if (!prefs) return;

    setIsSaving(true);
    try {
      await updatePreferences.mutateAsync(prefs);
      toast.success("Notification preferences saved");
    } catch (error) {
      toast.error("Failed to save preferences");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setLocalPrefs(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!prefs) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Unable to load preferences
      </div>
    );
  }

  const hasChanges = localPrefs !== null;

  return (
    <div className={cn("space-y-8", className)}>
      {/* Global Toggles */}
      <section>
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <Bell className="h-4 w-4" />
          Notification Channels
        </h3>
        <div className="space-y-3">
          <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border p-4 hover:bg-accent/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">In-App Notifications</p>
                <p className="text-xs text-muted-foreground">
                  Show notifications in the notification center
                </p>
              </div>
            </div>
            <div
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors",
                prefs.inAppEnabled ? "bg-primary" : "bg-muted",
              )}
              onClick={() => handleToggleGlobal("inAppEnabled")}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  prefs.inAppEnabled ? "left-[22px]" : "left-0.5",
                )}
              />
            </div>
          </label>

          <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border p-4 hover:bg-accent/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Email Notifications</p>
                <p className="text-xs text-muted-foreground">Receive notifications via email</p>
              </div>
            </div>
            <div
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors",
                prefs.emailEnabled ? "bg-primary" : "bg-muted",
              )}
              onClick={() => handleToggleGlobal("emailEnabled")}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  prefs.emailEnabled ? "left-[22px]" : "left-0.5",
                )}
              />
            </div>
          </label>
        </div>
      </section>

      {/* Per-Type Preferences */}
      <section>
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <Mail className="h-4 w-4" />
          Notification Types
        </h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Choose which notifications you want to receive and how. Critical notifications always
          bypass quiet hours.
        </p>

        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-accent/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                  Notification Type
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">
                  In-App
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">
                  Email
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Object.entries(NOTIFICATION_TYPE_LABELS).map(([type, label]) => {
                const typePref = prefs.types.find((t) => t.type === type);
                const isCritical = PRIORITY_TYPES.includes(type as NotificationType);
                const inAppEnabled = typePref?.inApp ?? true;
                const emailEnabled = typePref?.email ?? false;

                return (
                  <tr key={type} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{label}</span>
                        {isCritical && (
                          <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400">
                            Critical
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={inAppEnabled}
                        onChange={() => handleToggleType(type, "inApp")}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary/50"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={emailEnabled}
                        onChange={() => handleToggleType(type, "email")}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary/50"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Quiet Hours */}
      <section>
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <Moon className="h-4 w-4" />
          Quiet Hours
        </h3>
        <p className="mb-4 text-xs text-muted-foreground">
          During quiet hours, email notifications will be deferred. Critical notifications are
          always delivered immediately.
        </p>

        <div className="space-y-4 rounded-lg border border-border p-4">
          <label className="flex cursor-pointer items-center justify-between">
            <span className="text-sm font-medium">Enable Quiet Hours</span>
            <div
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors",
                prefs.quietHours.enabled ? "bg-primary" : "bg-muted",
              )}
              onClick={() => handleQuietHoursChange({ enabled: !prefs.quietHours.enabled })}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  prefs.quietHours.enabled ? "left-[22px]" : "left-0.5",
                )}
              />
            </div>
          </label>

          {prefs.quietHours.enabled && (
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Start Time</label>
                <input
                  type="time"
                  value={prefs.quietHours.start}
                  onChange={(e) => handleQuietHoursChange({ start: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">End Time</label>
                <input
                  type="time"
                  value={prefs.quietHours.end}
                  onChange={(e) => handleQuietHoursChange({ end: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Timezone</label>
                <input
                  type="text"
                  value={prefs.quietHours.timezone}
                  onChange={(e) => handleQuietHoursChange({ timezone: e.target.value })}
                  placeholder="UTC"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Digest Settings */}
      <section>
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <Clock className="h-4 w-4" />
          Email Digest
        </h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Receive a summary of your notifications instead of individual emails.
        </p>

        <div className="space-y-4 rounded-lg border border-border p-4">
          <label className="flex cursor-pointer items-center justify-between">
            <span className="text-sm font-medium">Enable Digest</span>
            <div
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors",
                prefs.digest.enabled ? "bg-primary" : "bg-muted",
              )}
              onClick={() => handleDigestChange({ enabled: !prefs.digest.enabled })}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  prefs.digest.enabled ? "left-[22px]" : "left-0.5",
                )}
              />
            </div>
          </label>

          {prefs.digest.enabled && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Frequency</label>
                <select
                  value={prefs.digest.frequency}
                  onChange={(e) =>
                    handleDigestChange({ frequency: e.target.value as "daily" | "weekly" })
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Delivery Time</label>
                <input
                  type="time"
                  value={prefs.digest.time}
                  onChange={(e) => handleDigestChange({ time: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Save / Reset */}
      {hasChanges && (
        <div className="flex items-center justify-end gap-3 border-t border-border pt-6">
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
