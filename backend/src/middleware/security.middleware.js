// STATUS: UPDATED

import crypto from 'node:crypto';

import environment from '../config/environment.js';

const createRequestId = () => {
  return crypto.randomUUID();
};

const securityMiddleware = (req, res, next) => {
  const requestId = req.get('x-request-id') || createRequestId();

  req.requestId = requestId;

  res.setHeader('X-Request-ID', requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none'"
  );

  const configuredOrigin = environment.security.corsOrigin;

  if (configuredOrigin !== '*') {
    res.setHeader('Access-Control-Allow-Origin', configuredOrigin);
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');

  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,POST,PUT,PATCH,DELETE,OPTIONS'
  );

  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Request-ID'
  );

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  return next();
};

export {
  securityMiddleware
};