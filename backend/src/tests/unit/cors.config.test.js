import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';

import {
  createCorsMiddleware,
  resolveFrontendOrigin,
} from '../../config/cors.config.js';

test('requires a valid frontend origin and rejects localhost in production', () => {
  assert.throws(
    () => resolveFrontendOrigin(undefined),
    /FRONTEND_URL is required/,
  );
  assert.throws(
    () => resolveFrontendOrigin('not-a-url'),
    /valid absolute HTTP\(S\) origin/,
  );
  assert.throws(
    () => resolveFrontendOrigin('http://localhost:5173', true),
    /public, non-local origin in production/,
  );
  assert.equal(
    resolveFrontendOrigin('http://localhost:5173'),
    'http://localhost:5173',
  );
});

test('handles credentialed authorization preflights for the configured origin', async () => {
  const app = express();

  app.use(
    createCorsMiddleware(
      'https://review-x.vercel.app',
    ),
  );
  app.post('/api/v1/auth/login', (_req, res) => {
    res.sendStatus(200);
  });

  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, resolve));

  try {
    const address = server.address();
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/v1/auth/login`,
      {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://review-x.vercel.app',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers':
            'authorization,content-type',
        },
      },
    );

    assert.equal(response.status, 204);
    assert.equal(
      response.headers.get('access-control-allow-origin'),
      'https://review-x.vercel.app',
    );
    assert.equal(
      response.headers.get('access-control-allow-credentials'),
      'true',
    );
    assert.match(
      response.headers.get('access-control-allow-headers'),
      /Authorization/i,
    );

    const rejectedResponse = await fetch(
      `http://127.0.0.1:${address.port}/api/v1/auth/login`,
      {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://untrusted.example',
          'Access-Control-Request-Method': 'POST',
        },
      },
    );

    assert.equal(
      rejectedResponse.headers.get('access-control-allow-origin'),
      null,
    );
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
});
