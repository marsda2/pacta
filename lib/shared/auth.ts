export interface SessionUser {
  id: string;
  whopUserId: string;
  name: string;
  email?: string;
  picture?: string;
}

export interface WhopTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  obtained_at: number;
}

export interface LoginAttempt {
  url: string;
  state: string;
  nonce: string;
  codeVerifier: string;
  redirectUri: string;
  createdAt: number;
}
