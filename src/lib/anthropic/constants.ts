export const ANTHROPIC_OAUTH = {
  CLIENT_ID: '9d1c250a-e61b-44d9-88ed-5944d1962f5e',
  AUTH_ENDPOINT: 'https://claude.ai/oauth/authorize',
  TOKEN_ENDPOINT: 'https://console.anthropic.com/v1/oauth/token',
  REDIRECT_URI: 'https://console.anthropic.com/oauth/code/callback',
  SCOPES: ['user:inference', 'user:profile'],
  TOKEN_LIFETIME_MS: (7 * 60 + 50) * 60 * 1000, // 7 hours 50 minutes
  TOKEN_WARNING_MS: 60 * 60 * 1000, // Warn when 1 hour left
} as const;

export const ANTHROPIC_API = {
  USER_AGENT: 'claude-cli/1.0.30 (external, cli)',
  BETA_HEADER: 'oauth-2025-04-20',
} as const;