/**
 * Notification routes.
 *
 * API endpoints for managing notifications and preferences.
 */

import { Router } from 'express';

import {
  notificationController,
} from '../controllers/notification.controller.js';

import {
  authenticate,
} from '../middleware/authenticate.js';

const router = Router();

// EventSource (used for SSE) cannot set request headers, so allow the JWT to
// be supplied via a `?token=` query param. This MUST run before `authenticate`.
router.use(
  (req, res, next) => {
    if (!req.headers.authorization && req.query.token) {
      req.headers.authorization = `Bearer ${req.query.token}`;
    }
    next();
  },
);

// All notification routes require authentication
router.use(authenticate);

// ── Notification CRUD ────────────────────────────────────────────────────────

/**
 * GET /api/v1/notifications
 * List notifications for the authenticated user.
 */
router.get(
  '/',
  notificationController.list,
);

/**
 * GET /api/v1/notifications/unread-count
 * Get unread notification count.
 */
router.get(
  '/unread-count',
  notificationController.getUnreadCount,
);

// ── Preferences ──────────────────────────────────────────────────────────────
// NOTE: these static paths must be registered BEFORE the `/:id` route below,
// otherwise Express matches `/preferences` (and `/stream`) as an `:id`.

/**
 * GET /api/v1/notifications/preferences
 * Get notification preferences.
 */
router.get(
  '/preferences',
  notificationController.getPreferences,
);

/**
 * PATCH /api/v1/notifications/preferences
 * Update notification preferences.
 */
router.patch(
  '/preferences',
  notificationController.updatePreferences,
);

// ── SSE (Server-Sent Events) ─────────────────────────────────────────────────

/**
 * GET /api/v1/notifications/stream
 * SSE endpoint for real-time notifications.
 * Accepts token via query param (for EventSource) or Authorization header —
 * the query-param handling is applied globally above.
 */
router.get(
  '/stream',
  notificationController.stream,
);

// ── Single-notification routes (must come after static paths) ────────────────

/**
 * PATCH /api/v1/notifications/read-all
 * Mark all notifications as read.
 */
router.patch(
  '/read-all',
  notificationController.markAllAsRead,
);

/**
 * GET /api/v1/notifications/:id
 * Get a single notification.
 */
router.get(
  '/:id',
  notificationController.getById,
);

/**
 * PATCH /api/v1/notifications/:id/read
 * Mark a notification as read.
 */
router.patch(
  '/:id/read',
  notificationController.markAsRead,
);

/**
 * DELETE /api/v1/notifications/:id
 * Delete a notification.
 */
router.delete(
  '/:id',
  notificationController.delete,
);

export default router;
