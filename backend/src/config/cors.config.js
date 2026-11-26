import cors from 'cors';

const isLoopbackHostname = (hostname) => {
  const normalizedHostname = hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, '');

  return (
    normalizedHostname === 'localhost' ||
    normalizedHostname.endsWith('.localhost') ||
    normalizedHostname === '::1' ||
    /^127(?:\.\d{1,3}){3}$/.test(normalizedHostname) ||
    normalizedHostname === '0.0.0.0'
  );
};

const isProductionEnvironment = () => {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.RENDER === 'true' ||
    Boolean(process.env.RENDER_SERVICE_ID)
  );
};

const resolveFrontendOrigin = (
  frontendUrl,
  production = false,
) => {
  const configuredUrl = frontendUrl?.trim();

  if (!configuredUrl) {
    throw new Error(
      'FRONTEND_URL is required. Set it to the frontend HTTP(S) origin before starting the API.',
    );
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(configuredUrl);
  } catch {
    throw new Error(
      'FRONTEND_URL must be a valid absolute HTTP(S) origin.',
    );
  }

  if (
    !['http:', 'https:'].includes(parsedUrl.protocol) ||
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.pathname !== '/' ||
    parsedUrl.search ||
    parsedUrl.hash
  ) {
    throw new Error(
      'FRONTEND_URL must be a valid absolute HTTP(S) origin without credentials, path, query, or fragment.',
    );
  }

  if (production && isLoopbackHostname(parsedUrl.hostname)) {
    throw new Error(
      'FRONTEND_URL must use a public, non-local origin in production.',
    );
  }

  return parsedUrl.origin;
};

const createCorsMiddleware = (frontendOrigin) => {
  return cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, false);
      }

      return callback(null, origin === frontendOrigin);
    },
    credentials: true,
    methods: [
      'GET',
      'HEAD',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
    ],
  });
};

export {
  createCorsMiddleware,
  isProductionEnvironment,
  resolveFrontendOrigin,
};
