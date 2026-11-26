// STATUS: UPDATED

import crypto from 'node:crypto';

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

  return next();
};

export {
  securityMiddleware
};