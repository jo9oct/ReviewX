/**
 * Auth controller — thin HTTP layer.
 *
 * Validates request shape with Joi (via the validate middleware applied in the
 * router), delegates all business logic to auth.service.js, and formats the
 * HTTP response. No business logic lives here.
 */

import * as authService from '../services/auth.service.js';

/**
 * POST /api/v1/auth/register
 *
 * Body: { name, email, password }
 * Returns: 201 { success, data: { token, expiresIn, user } }
 */
export const register = async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json({ success: true, data: result });
};

/**
 * POST /api/v1/auth/login
 *
 * Body: { email, password }
 * Returns: 200 { success, data: { token, expiresIn, user } }
 */
export const login = async (req, res) => {
  const result = await authService.login(req.body);
  res.status(200).json({ success: true, data: result });
};

/**
 * GET /api/v1/auth/me
 *
 * Requires: valid JWT in Authorization: Bearer <token>
 * Returns: 200 { success, data: { user } }
 */
export const getMe = async (req, res) => {
  const user = await authService.getMe(req.user.id);
  res.status(200).json({ success: true, data: { user } });
};
