/**
 * Shared sessionStorage / localStorage key constants.
 * Always import from here — never use magic strings inline.
 */

export const STORAGE_KEYS = {
  /** The active demo account id, written to sessionStorage on login. */
  ACTIVE_ACCOUNT: "reviewx-active-account",
  /** The resolved display name for the current session. */
  PROFILE_NAME: "reviewx-profile-name",
  /** The redirect destination stored before an OAuth hand-off. */
  AUTH_NEXT: "reviewx-auth-next",
  /** The user's preferred colour theme, persisted across sessions. */
  THEME: "reviewx-theme",
  /** Short-lived backend GitHub connection id; never contains the OAuth token. */
  GITHUB_CONNECTION_ID: "reviewx-github-connection-id",
  /** Local display/access preview selected by the user. The backend tier remains authoritative. */
  SUBSCRIPTION_TIER: "reviewx-subscription-tier",
} as const;
