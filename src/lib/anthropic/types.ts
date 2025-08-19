export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  account: {
    email_address: string;
  };
}

export interface Credentials {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  email: string;
  scope: string;
}

export interface AuthURLResult {
  authURL: string;
  verifier: string;
}

export interface AnthropicHeaders {
  'User-Agent': string;
  'Authorization': string;
  'anthropic-beta': string;
}