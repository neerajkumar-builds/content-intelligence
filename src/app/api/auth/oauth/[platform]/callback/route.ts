import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { verifyOAuthState } from "@/lib/connectors/oauth/state";
import { getOAuthConfig } from "@/lib/connectors/oauth/registry";
import {
  exchangeLinkedInCode,
  fetchLinkedInProfile,
} from "@/lib/connectors/oauth/linkedin";
import { encryptToken } from "@/lib/connectors/oauth/encrypt";
import { db } from "@/db";
import { connectors, oauthCredentials, workspaces } from "@/db/schema";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform } = await params;
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  const redirect = (path: string) =>
    NextResponse.redirect(new URL(path, req.url));

  if (error) return redirect(`/connectors?error=${encodeURIComponent(error)}`);
  if (!code || !state) return redirect("/connectors?error=missing_params");

  const statePayload = verifyOAuthState(state);
  if (!statePayload || statePayload.platform !== platform) {
    return redirect("/connectors?error=invalid_state");
  }

  const config = getOAuthConfig(platform);
  if (!config) return redirect("/connectors?error=unsupported_platform");

  try {
    let accessToken: string;
    let refreshToken: string | null = null;
    let expiresIn: number;
    let refreshExpiresIn: number | null = null;
    let scopes: string;
    let accountName: string;

    if (platform === "linkedin") {
      const tokens = await exchangeLinkedInCode(code);
      accessToken = tokens.access_token;
      refreshToken = tokens.refresh_token ?? null;
      expiresIn = tokens.expires_in;
      refreshExpiresIn = tokens.refresh_token_expires_in ?? null;
      scopes = tokens.scope;

      const profile = await fetchLinkedInProfile(accessToken);
      accountName = profile.name ?? profile.sub;
    } else {
      return redirect("/connectors?error=not_implemented");
    }

    const [ws] = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.clerkOrgId, statePayload.workspaceId))
      .limit(1);

    if (!ws) return redirect("/connectors?error=workspace_not_found");

    const encrypted = encryptToken(accessToken);
    const encryptedRefresh = refreshToken
      ? encryptToken(refreshToken)
      : null;

    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    const refreshExpiresAt = refreshExpiresIn
      ? new Date(Date.now() + refreshExpiresIn * 1000)
      : null;

    const [existingConn] = await db
      .select({ id: connectors.id })
      .from(connectors)
      .where(
        and(
          eq(connectors.workspaceId, ws.id),
          eq(connectors.platform, platform as any),
        ),
      )
      .limit(1);

    let connectorId: string;

    if (existingConn) {
      connectorId = existingConn.id;
      await db
        .update(connectors)
        .set({ state: "healthy", accountName })
        .where(eq(connectors.id, connectorId));

      await db
        .delete(oauthCredentials)
        .where(eq(oauthCredentials.connectorId, connectorId));
    } else {
      const [created] = await db
        .insert(connectors)
        .values({
          workspaceId: ws.id,
          platform: platform as any,
          tier: platform === "linkedin" ? "tier1" : "tier2",
          state: "healthy",
          accountName,
        })
        .returning();
      connectorId = created.id;
    }

    await db.insert(oauthCredentials).values({
      connectorId,
      encryptedAccessToken: encrypted.ciphertext,
      encryptedRefreshToken: encryptedRefresh?.ciphertext ?? null,
      tokenIv: encrypted.iv,
      tokenTag: encrypted.tag,
      scopes,
      expiresAt,
      refreshExpiresAt,
    });

    return redirect(`/connectors?connected=${platform}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`OAuth callback error [${platform}]:`, message);
    return redirect(`/connectors?error=${encodeURIComponent(message)}`);
  }
}
