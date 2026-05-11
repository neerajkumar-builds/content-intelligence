export interface OAuthPlatformConfig {
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientIdEnv: string;
  clientSecretEnv: string;
  accessTokenLifetimeMs: number;
  refreshTokenLifetimeMs: number | null;
}

const OAUTH_PLATFORMS: Record<string, OAuthPlatformConfig> = {
  linkedin: {
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scopes: ["openid", "profile", "w_member_social"],
    clientIdEnv: "LINKEDIN_CLIENT_ID",
    clientSecretEnv: "LINKEDIN_CLIENT_SECRET",
    accessTokenLifetimeMs: 60 * 24 * 60 * 60 * 1000,
    refreshTokenLifetimeMs: 365 * 24 * 60 * 60 * 1000,
  },
};

export function getOAuthConfig(platform: string): OAuthPlatformConfig | null {
  return OAUTH_PLATFORMS[platform] ?? null;
}

export function getRedirectUri(platform: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/api/auth/oauth/${platform}/callback`;
}

export function getSupportedOAuthPlatforms(): string[] {
  return Object.keys(OAUTH_PLATFORMS);
}
