const githubConfig = {
  apiBaseUrl:
    process.env.GITHUB_API_BASE_URL ||
    'https://api.github.com',

  oauthBaseUrl:
    process.env.GITHUB_OAUTH_BASE_URL ||
    'https://github.com',

  apiVersion:
    process.env.GITHUB_API_VERSION ||
    '2022-11-28',

  clientId:
    process.env.GITHUB_CLIENT_ID ||
    '',

  clientSecret:
    process.env.GITHUB_CLIENT_SECRET ||
    '',

  redirectUri:
    process.env.GITHUB_REDIRECT_URI ||
    '',

  timeoutMs:
    Number(
      process.env.GITHUB_TIMEOUT_MS ||
      30000,
    ),

  maxFiles:
    Number(
      process.env.GITHUB_MAX_FILES ||
      1000,
    ),

  maxFileBytes:
    Number(
      process.env.GITHUB_MAX_FILE_BYTES ||
      5242880,
    ),

  maxTotalBytes:
    Number(
      process.env.GITHUB_MAX_TOTAL_BYTES ||
      52428800,
    ),

  webhookSecret:
    process.env.GITHUB_WEBHOOK_SECRET ||
    '',

  allowedHosts: [
    'github.com',
    'api.github.com',
    'raw.githubusercontent.com',
  ],
};

export default githubConfig;