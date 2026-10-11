/**
 * Notification controller.
 *
 * Handles HTTP requests for notification operations.
 */

import {
  notificationService,
} from '../services/notification.service.js';

import {
  createResponse,
} from '../utils/response.js';

import {
  AppError,
} from '../utils/errors.js';

import {
  getSSEManager,
} from '../utils/sseManager.js';

const notificationController = {
  /**
   * GET /api/v1/notifications
   * List notifications for the authenticated user.
   */
  async list(req, res, next) {
    try {
      const {
        unreadOnly,
        type,
        limit = '20',
        offset = '0',
      } = req.query;

      const notifications = await notificationService.getForUser(
        req.user.id,
        {
          unreadOnly: unreadOnly === 'true',
          type: type || null,
          limit: Math.min(parseInt(limit, 10) || 20, 100),
          offset: parseInt(offset, 10) || 0,
        },
      );

      return res.status(200).json(
        createResponse({
          success: true,
          data: {
            notifications,
            pagination: {
              limit: parseInt(limit, 10) || 20,
              offset: parseInt(offset, 10) || 0,
              total: notifications.length,
            },
          },
          meta: {
            requestId: req.requestId,
          },
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/notifications/unread-count
   * Get unread notification count.
   */
  async getUnreadCount(req, res, next) {
    try {
      const count = await notificationService.getUnreadCount(req.user.id);

      return res.status(200).json(
        createResponse({
          success: true,
          data: { count },
          meta: {
            requestId: req.requestId,
          },
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/notifications/:id
   * Get a single notification.
   */
  async getById(req, res, next) {
    try {
      const notification = await notificationService.getById(
        req.params.id,
        req.user.id,
      );

      return res.status(200).json(
        createResponse({
          success: true,
          data: { notification },
          meta: {
            requestId: req.requestId,
          },
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/v1/notifications/:id/read
   * Mark a notification as read.
   */
  async markAsRead(req, res, next) {
    try {
      const notification = await notificationService.markAsRead(
        req.params.id,
        req.user.id,
      );

      return res.status(200).json(
        createResponse({
          success: true,
          data: { notification },
          meta: {
            requestId: req.requestId,
          },
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/v1/notifications/read-all
   * Mark all notifications as read.
   */
  async markAllAsRead(req, res, next) {
    try {
      const result = await notificationService.markAllAsRead(req.user.id);

      return res.status(200).json(
        createResponse({
          success: true,
          data: {
            modifiedCount: result.modifiedCount,
          },
          meta: {
            requestId: req.requestId,
          },
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/v1/notifications/:id
   * Delete a notification.
   */
  async delete(req, res, next) {
    try {
      await notificationService.delete(req.params.id, req.user.id);

      return res.status(200).json(
        createResponse({
          success: true,
          data: null,
          meta: {
            requestId: req.requestId,
          },
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/notifications/preferences
   * Get notification preferences.
   */
  async getPreferences(req, res, next) {
    try {
      const preferences = await notificationService.getPreferences(req.user.id);

      return res.status(200).json(
        createResponse({
          success: true,
          data: { preferences },
          meta: {
            requestId: req.requestId,
          },
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/v1/notifications/preferences
   * Update notification preferences.
   */
  async updatePreferences(req, res, next) {
    try {
      const {
        emailEnabled,
        inAppEnabled,
        types,
        quietHours,
        digest,
      } = req.body;

      const preferences = await notificationService.updatePreferences(
        req.user.id,
        {
          emailEnabled,
          inAppEnabled,
          types,
          quietHours,
          digest,
        },
      );

      return res.status(200).json(
        createResponse({
          success: true,
          data: { preferences },
          meta: {
            requestId: req.requestId,
          },
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/notifications/stream
   * SSE endpoint for real-time notifications.
   */
  async stream(req, res, next) {
    try {
      // Set SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });

      // Send initial connection event
      res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

      // Register connection with SSE manager
      const sseManager = getSSEManager();
      sseManager.addConnection(req.user.id, res);

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`);
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // Clean up on close
      req.on('close', () => {
        clearInterval(heartbeatInterval);
        sseManager.removeConnection(req.user.id, res);
      });
    } catch (error) {
      next(error);
    }
  },
};

export {
  notificationController,
};

export default notificationController;
