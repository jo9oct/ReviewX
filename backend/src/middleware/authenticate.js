import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { findById } from '../repositories/user.repository.js';

function authError(res, message, code = 'UNAUTHORIZED') {
  return res.status(401).json({
    success: false,
    error: { message, code }
  });
}

export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return authError(res, 'No token provided. Include "Authorization: Bearer <token>"');
  }

  const token = authHeader.slice(7).trim();

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return authError(res, 'Token has expired — please log in again', 'TOKEN_EXPIRED');
    }
    return authError(res, 'Invalid token', 'INVALID_TOKEN');
  }

  const userId = payload.userId || payload.sub;
  const user = await findById(userId);

  if (!user) {
    return authError(
      res,
      'The account associated with this token no longer exists',
      'USER_NOT_FOUND',
    );
  }

  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      error: { message: 'Your account has been deactivated', code: 'ACCOUNT_DISABLED' },
    });
  }

  req.user = {
    _id: user._id.toString(),
    id: user._id.toString(),
    userId: user._id.toString(),
    role: user.role,
    company: user.company ? user.company.toString() : null,
  };

  next();
}

export async function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const userId = payload.userId || payload.sub;
    const user = await findById(userId);

    if (user && user.isActive) {
      req.user = {
        _id: user._id.toString(),
        id: user._id.toString(),
        userId: user._id.toString(),
        role: user.role,
        company: user.company ? user.company.toString() : null,
      };
    } else {
      req.user = null;
    }
  } catch (_err) {
    req.user = null;
  }

  next();
}

export const protect = authenticate;

