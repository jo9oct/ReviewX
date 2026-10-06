import 'dotenv/config';

const parseBoolean = (
  value,
  defaultValue = false,
) => {
  if (value === undefined) {
    return defaultValue;
  }

  return String(value)
    .trim()
    .toLowerCase() === 'true';
};

const parseInteger = (
  value,
  defaultValue,
) => {
  if (
    value === undefined ||
    value === ''
  ) {
    return defaultValue;
  }

  const parsed = Number.parseInt(
    value,
    10,
  );

  return Number.isInteger(parsed)
    ? parsed
    : defaultValue;
};

const parseFloatValue = (
  value,
  defaultValue,
) => {
  if (
    value === undefined ||
    value === ''
  ) {
    return defaultValue;
  }

  const parsed = Number.parseFloat(
    value,
  );

  return Number.isFinite(parsed)
    ? parsed
    : defaultValue;
};

const normalizeString = (
  value,
  defaultValue = '',
) => {
  if (
    value === undefined ||
    value === null
  ) {
    return defaultValue;
  }

  const normalized =
    String(value).trim();

  return normalized || defaultValue;
};

const nodeEnv = normalizeString(
  process.env.NODE_ENV,
  'development',
);

const supportedTiers = Object.freeze([
  'free',
  'pro',
  'enterprise',
]);

const userTier = normalizeString(
  process.env.USER_TIER,
  'free',
).toLowerCase();

if (!supportedTiers.includes(userTier)) {
  throw new Error(
    `Invalid USER_TIER "${userTier}". Supported tiers: ${supportedTiers.join(', ')}.`,
  );
}

const aiProvider = normalizeString(
  process.env.AI_PROVIDER,
  'groq',
).toLowerCase();

const environment = Object.freeze({
  app: Object.freeze({
    name: normalizeString(
      process.env.APP_NAME,
      'professional-ai-code-review',
    ),

    environment: nodeEnv,

    version: normalizeString(
      process.env.APP_VERSION,
      '1.0.0',
    ),

    host: normalizeString(
      process.env.HOST,
      '0.0.0.0',
    ),

    port: parseInteger(
      process.env.PORT,
      5000,
    ),

    apiPrefix: normalizeString(
      process.env.API_PREFIX,
      '/api/v1',
    ),
  }),

  http: Object.freeze({
    bodyLimit: normalizeString(
      process.env.HTTP_BODY_LIMIT,
      '10mb',
    ),

    parameterLimit: parseInteger(
      process.env.HTTP_PARAMETER_LIMIT,
      1000,
    ),

    requestTimeout: parseInteger(
      process.env.HTTP_REQUEST_TIMEOUT,
      120000,
    ),

    keepAliveTimeout: parseInteger(
      process.env.HTTP_KEEP_ALIVE_TIMEOUT,
      65000,
    ),

    headersTimeout: parseInteger(
      process.env.HTTP_HEADERS_TIMEOUT,
      66000,
    ),
  }),

  database: Object.freeze({
    uri: normalizeString(
      process.env.MONGODB_URI ||
        process.env.DATABASE_URL,
      process.env.NODE_ENV === 'production'
        ? ''
        : 'mongodb://127.0.0.1:27017/reviewx',
    ),

    name: normalizeString(
      process.env.MONGODB_DB_NAME,
      'code_review',
    ),

    maxPoolSize: parseInteger(
      process.env.MONGODB_MAX_POOL_SIZE,
      10,
    ),

    minPoolSize: parseInteger(
      process.env.MONGODB_MIN_POOL_SIZE,
      2,
    ),

    serverSelectionTimeoutMS:
      parseInteger(
        process.env.MONGODB_SERVER_SELECTION_TIMEOUT,
        5000,
      ),

    socketTimeoutMS: parseInteger(
      process.env.MONGODB_SOCKET_TIMEOUT,
      45000,
    ),

    autoIndex: parseBoolean(
      process.env.MONGODB_AUTO_INDEX,
      true,
    ),
  }),

  access: Object.freeze({
    userTier,

    free: Object.freeze({
      maxLines: parseInteger(
        process.env.FREE_MAX_LINES,
        500,
      ),

      maxFiles: parseInteger(
        process.env.FREE_MAX_FILES,
        1,
      ),

      maxConcurrency: parseInteger(
        process.env.FREE_MAX_CONCURRENCY,
        1,
      ),

      allowArchive: parseBoolean(
        process.env.FREE_ALLOW_ARCHIVE,
        false,
      ),

      allowGitHub: parseBoolean(
        process.env.FREE_ALLOW_GITHUB,
        false,
      ),

      allowAdvancedAnalysis:
        parseBoolean(
          process.env.FREE_ALLOW_ADVANCED_ANALYSIS,
          false,
        ),

      allowAiRemediation:
        parseBoolean(
          process.env.FREE_ALLOW_AI_REMEDIATION,
          false,
        ),

      allowHtmlReport: parseBoolean(
        process.env.FREE_ALLOW_HTML_REPORT,
        false,
      ),
    }),

    pro: Object.freeze({
      maxLines: parseInteger(
        process.env.PRO_MAX_LINES,
        5000,
      ),

      maxFiles: parseInteger(
        process.env.PRO_MAX_FILES,
        100,
      ),

      maxConcurrency: parseInteger(
        process.env.PRO_MAX_CONCURRENCY,
        3,
      ),

      allowArchive: parseBoolean(
        process.env.PRO_ALLOW_ARCHIVE,
        true,
      ),

      allowGitHub: parseBoolean(
        process.env.PRO_ALLOW_GITHUB,
        true,
      ),

      allowAdvancedAnalysis:
        parseBoolean(
          process.env.PRO_ALLOW_ADVANCED_ANALYSIS,
          true,
        ),

      allowAiRemediation:
        parseBoolean(
          process.env.PRO_ALLOW_AI_REMEDIATION,
          true,
        ),

      allowHtmlReport: parseBoolean(
        process.env.PRO_ALLOW_HTML_REPORT,
        true,
      ),
    }),

    enterprise: Object.freeze({
      maxLines: parseInteger(
        process.env.ENTERPRISE_MAX_LINES,
        1000000,
      ),

      maxFiles: parseInteger(
        process.env.ENTERPRISE_MAX_FILES,
        10000,
      ),

      maxConcurrency: parseInteger(
        process.env.ENTERPRISE_MAX_CONCURRENCY,
        10,
      ),

      allowArchive: true,

      allowGitHub: true,

      allowAdvancedAnalysis: true,

      allowAiRemediation: true,

      allowHtmlReport: true,
    }),
  }),

  input: Object.freeze({
    maxSourceBytes: parseInteger(
      process.env.MAX_SOURCE_BYTES,
      10 * 1024 * 1024,
    ),

    maxArchiveBytes: parseInteger(
      process.env.MAX_ARCHIVE_BYTES,
      50 * 1024 * 1024,
    ),

    maxFilesPerSource: parseInteger(
      process.env.MAX_FILES_PER_SOURCE,
      1000,
    ),

    maxFileBytes: parseInteger(
      process.env.MAX_FILE_BYTES,
      5 * 1024 * 1024,
    ),

    maxPathLength: parseInteger(
      process.env.MAX_PATH_LENGTH,
      512,
    ),

    maxFilenameLength: parseInteger(
      process.env.MAX_FILENAME_LENGTH,
      255,
    ),
  }),

  security: Object.freeze({
    trustProxy: parseBoolean(
      process.env.TRUST_PROXY,
      false,
    ),

    corsOrigin: normalizeString(
      process.env.CORS_ORIGIN,
      '*',
    ),

    maxArchiveFiles: parseInteger(
      process.env.MAX_ARCHIVE_FILES,
      1000,
    ),

    maxArchiveBytes: parseInteger(
      process.env.MAX_ARCHIVE_BYTES,
      50 * 1024 * 1024,
    ),

    maxFileBytes: parseInteger(
      process.env.MAX_FILE_BYTES,
      5 * 1024 * 1024,
    ),

    maxSourceBytes: parseInteger(
      process.env.MAX_SOURCE_BYTES,
      10 * 1024 * 1024,
    ),
  }),

  parser: Object.freeze({
    maxFiles: parseInteger(
      process.env.PARSER_MAX_FILES,
      1000,
    ),

    maxSourceBytes: parseInteger(
      process.env.PARSER_MAX_SOURCE_BYTES,
      10 * 1024 * 1024,
    ),

    maxAstNodes: parseInteger(
      process.env.PARSER_MAX_AST_NODES,
      100000,
    ),

    maxTraversalDepth: parseInteger(
      process.env.PARSER_MAX_TRAVERSAL_DEPTH,
      1000,
    ),
  }),

  ai: Object.freeze({
    enabled: parseBoolean(
      process.env.AI_ENABLED,
      false,
    ),

    provider: aiProvider,

    timeout: parseInteger(
      process.env.AI_TIMEOUT,
      30000,
    ),

    maxFindings: parseInteger(
      process.env.AI_MAX_FINDINGS,
      25,
    ),

    maxSourceBytes: parseInteger(
      process.env.AI_MAX_SOURCE_BYTES,
      50000,
    ),

    maxContextBytes: parseInteger(
      process.env.AI_MAX_CONTEXT_BYTES,
      200000,
    ),

    temperature: parseFloatValue(
      process.env.AI_TEMPERATURE,
      0,
    ),

    maxOutputTokens: parseInteger(
      process.env.AI_MAX_OUTPUT_TOKENS,
      3000,
    ),

    groq: Object.freeze({
      apiKey: normalizeString(
        process.env.GROQ_API_KEY,
        '',
      ),

      model: normalizeString(
        process.env.GROQ_MODEL,
        'llama-3.3-70b-versatile',
      ),
    }),

    openai: Object.freeze({
      apiKey: normalizeString(
        process.env.OPENAI_API_KEY,
        '',
      ),

      model: normalizeString(
        process.env.OPENAI_MODEL,
        'gpt-4o-mini',
      ),
    }),
  }),

  github: Object.freeze({
    baseUrl: normalizeString(
      process.env.GITHUB_API_BASE_URL,
      'https://api.github.com',
    ),

    token: normalizeString(
      process.env.GITHUB_TOKEN,
      '',
    ),

    apiVersion: normalizeString(
      process.env.GITHUB_API_VERSION,
      '2022-11-28',
    ),

    timeout: parseInteger(
      process.env.GITHUB_TIMEOUT,
      30000,
    ),

    maxFiles: parseInteger(
      process.env.GITHUB_MAX_FILES,
      1000,
    ),

    maxFileBytes: parseInteger(
      process.env.GITHUB_MAX_FILE_BYTES,
      5 * 1024 * 1024,
    ),

    maxTotalBytes: parseInteger(
      process.env.GITHUB_MAX_TOTAL_BYTES,
      50 * 1024 * 1024,
    ),
  }),

  cloudinary: Object.freeze({
    cloudName: normalizeString(
      process.env.CLOUDINARY_CLOUD_NAME,
      '',
    ),

    apiKey: normalizeString(
      process.env.CLOUDINARY_API_KEY,
      '',
    ),

    apiSecret: normalizeString(
      process.env.CLOUDINARY_API_SECRET,
      '',
    ),

    secure: parseBoolean(
      process.env.CLOUDINARY_SECURE,
      true,
    ),

    folder: normalizeString(
      process.env.CLOUDINARY_FOLDER,
      'code-review/reports',
    ),
  }),

  queue: Object.freeze({
    redisUrl: normalizeString(
      process.env.REDIS_URL,
      'redis://127.0.0.1:6379',
    ),

    reviewQueue: normalizeString(
      process.env.REVIEW_QUEUE_NAME,
      'review',
    ),

    reportQueue: normalizeString(
      process.env.REPORT_QUEUE_NAME,
      'report',
    ),

    cleanupQueue: normalizeString(
      process.env.CLEANUP_QUEUE_NAME,
      'cleanup',
    ),

    concurrency: parseInteger(
      process.env.QUEUE_CONCURRENCY,
      3,
    ),

    attempts: parseInteger(
      process.env.QUEUE_ATTEMPTS,
      3,
    ),

    backoff: parseInteger(
      process.env.QUEUE_BACKOFF,
      5000,
    ),
  }),

  sourceStore: Object.freeze({
    prefix: normalizeString(
      process.env.REVIEW_SOURCE_REDIS_PREFIX,
      'review:source',
    ),

    ttlSeconds: parseInteger(
      process.env.REVIEW_SOURCE_TTL_SECONDS,
      3600,
    ),
  }),

  scheduler: Object.freeze({
    enabled: parseBoolean(
      process.env.SCHEDULER_ENABLED,
      true,
    ),

    minIntervalSeconds:
      parseInteger(
        process.env.SCHEDULER_MIN_INTERVAL_SECONDS,
        60,
      ),
  }),
});

const validateEnvironment = () => {
  if (
    !environment.database.uri
  ) {
    throw new Error(
      'MONGODB_URI or DATABASE_URL is required.',
    );
  }

  if (
    !Number.isInteger(
      environment.database.maxPoolSize,
    ) ||
    environment.database.maxPoolSize < 1
  ) {
    throw new Error(
      'MONGODB_MAX_POOL_SIZE must be a positive integer.',
    );
  }

  if (
    environment.database.minPoolSize < 0 ||
    environment.database.minPoolSize >
      environment.database.maxPoolSize
  ) {
    throw new Error(
      'MONGODB_MIN_POOL_SIZE must be between 0 and MONGODB_MAX_POOL_SIZE.',
    );
  }

  if (
    !Number.isInteger(
      environment.database.serverSelectionTimeoutMS,
    ) ||
    environment.database
      .serverSelectionTimeoutMS < 1000
  ) {
    throw new Error(
      'MONGODB_SERVER_SELECTION_TIMEOUT must be at least 1000 milliseconds.',
    );
  }

  if (
    !Number.isInteger(
      environment.sourceStore.ttlSeconds,
    ) ||
    environment.sourceStore.ttlSeconds < 60
  ) {
    throw new Error(
      'REVIEW_SOURCE_TTL_SECONDS must be at least 60 seconds.',
    );
  }

  const supportedAiProviders = [
    'groq',
    'openai',
  ];

  if (
    !supportedAiProviders.includes(
      environment.ai.provider,
    )
  ) {
    throw new Error(
      `Invalid AI_PROVIDER "${environment.ai.provider}". Supported providers: ${supportedAiProviders.join(', ')}.`,
    );
  }

  if (
    environment.ai.enabled &&
    environment.ai.provider === 'groq' &&
    !environment.ai.groq.apiKey
  ) {
    throw new Error(
      'GROQ_API_KEY is required when AI_PROVIDER=groq and AI_ENABLED=true.',
    );
  }

  if (
    environment.ai.enabled &&
    environment.ai.provider === 'openai' &&
    !environment.ai.openai.apiKey
  ) {
    throw new Error(
      'OPENAI_API_KEY is required when AI_PROVIDER=openai and AI_ENABLED=true.',
    );
  }
};

validateEnvironment();

export {
  environment,
  validateEnvironment,
};

export default environment;