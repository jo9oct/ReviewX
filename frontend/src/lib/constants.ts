/**
 * Shared sessionStorage / localStorage key constants.
 * Always import from here — never use magic strings inline.
 */

export const STORAGE_KEYS = {
  /** The resolved display name for the current session. */
  PROFILE_NAME: "reviewx-profile-name",
  /** The redirect destination stored before an OAuth hand-off. */
  AUTH_NEXT: "reviewx-auth-next",
  /** The user's preferred colour theme, persisted across sessions. */
  THEME: "reviewx-theme",
  /** Active review ID if a review is currently in flight. */
  ACTIVE_REVIEW_ID: "reviewx-active-review-id",
  /** Active review status if in flight (pending/parsing/analyzing/etc). */
  ACTIVE_REVIEW_STATUS: "reviewx-active-review-status",
  /** JWT access token key in localStorage. */
  AUTH_TOKEN: "reviewx_token",
} as const;
