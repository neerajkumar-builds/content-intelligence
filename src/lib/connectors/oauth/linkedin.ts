import { getOAuthConfig, getRedirectUri } from "./registry";

interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope: string;
}

interface LinkedInProfile {
  sub: string;
  name: string;
  email?: string;
}

export function buildLinkedInAuthUrl(state: string): string {
  const config = getOAuthConfig("linkedin")!;
  const clientId = process.env[config.clientIdEnv];
  if (!clientId) throw new Error("LINKEDIN_CLIENT_ID not set");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: getRedirectUri("linkedin"),
    state,
    scope: config.scopes.join(" "),
  });

  return `${config.authUrl}?${params.toString()}`;
}

export async function exchangeLinkedInCode(
  code: string,
): Promise<LinkedInTokenResponse> {
  const config = getOAuthConfig("linkedin")!;
  const clientId = process.env[config.clientIdEnv];
  const clientSecret = process.env[config.clientSecretEnv];

  if (!clientId || !clientSecret) {
    throw new Error("LinkedIn OAuth credentials not configured");
  }

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getRedirectUri("linkedin"),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LinkedIn token exchange failed: ${response.status} ${error}`);
  }

  return response.json();
}

export async function fetchLinkedInProfile(
  accessToken: string,
): Promise<LinkedInProfile> {
  const response = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`LinkedIn profile fetch failed: ${response.status}`);
  }

  return response.json();
}
