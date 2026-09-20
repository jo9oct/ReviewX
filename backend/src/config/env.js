import dotenv from "dotenv";

dotenv.config();

function getString(name, fallback = "") {
  const value = process.env[name];

  if (value === undefined || value === "") {
    return fallback;
  }

  return value.trim();
}

function getNumber(name, fallback) {
  const value = process.env[name];

  if (value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Environment variable ${name} must be a valid number.`);
  }

  return parsed;
}

function getPositiveNumber(name, fallback) {
  const value = getNumber(name, fallback);

  if (value <= 0) {
    throw new Error(`Environment variable ${name} must be greater than zero.`);
  }

  return value;
}

const maxJsonSize =
  getString(
    "MAX_JSON_SIZE",
    "2mb"
  );

const nodeEnv = getString("NODE_ENV", "development");

if (!["development", "test", "production"].includes(nodeEnv)) {
  throw new Error(
    "NODE_ENV must be one of: development, test, production."
  );
}

const corsOrigins = getString(
  "CORS_ORIGINS",
  "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const env = Object.freeze({
  nodeEnv,

  port: getPositiveNumber("PORT", 5000),

  apiPrefix: getString("API_PREFIX", "/api"),

  corsOrigins,

  maxJsonSize,

  requestTimeoutMs: getPositiveNumber(
    "REQUEST_TIMEOUT_MS",
    30000
  ),

  rateLimit: Object.freeze({
    windowMs: getPositiveNumber(
      "RATE_LIMIT_WINDOW_MS",
      60000
    ),

    maxRequests: getPositiveNumber(
      "RATE_LIMIT_MAX_REQUESTS",
      100
    )
  }),

  logLevel: getString("LOG_LEVEL", "info"),

  mongodb: Object.freeze({
    uri: getString("MONGODB_URI"),
    databaseName: getString(
      "MONGODB_DB_NAME",
      "code_review_platform"
    )
  }),

  cloudinary: Object.freeze({
    cloudName: getString("CLOUDINARY_CLOUD_NAME"),
    apiKey: getString("CLOUDINARY_API_KEY"),
    apiSecret: getString("CLOUDINARY_API_SECRET")
  }),

  ai: Object.freeze({
    provider: getString("AI_PROVIDER", "groq"),

    groqApiKey: getString("GROQ_API_KEY"),

    groqModel: getString(
      "GROQ_MODEL",
      "openai/gpt-oss-20b"
    ),

    openaiApiKey: getString("OPENAI_API_KEY"),

    openaiModel: getString("OPENAI_MODEL"),

    maxFindings: getPositiveNumber(
      "MAX_AI_FINDINGS",
      20
    ),

    maxInputChars: getPositiveNumber(
      "MAX_AI_INPUT_CHARS",
      24000
    )
  }),

  upload: Object.freeze({
    maxFileSize: getPositiveNumber(
      "UPLOAD_MAX_FILE_SIZE",
      2000000
    ),

    maxFiles: getPositiveNumber(
      "UPLOAD_MAX_FILES",
      1
    )
  })
});