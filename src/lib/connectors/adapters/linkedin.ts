import { Platform } from "@/lib/platforms";
import { BaseAdapter } from "../adapter";
import type {
  PublishInput,
  PublishResult,
  VerifyResult,
  HealthResult,
  TokenResult,
  OAuthCredential,
  AuthMethod,
  LinkedInPublishInput,
} from "../types";
import { AppError, ErrorCodes } from "@/lib/errors/app-error";
import { createLogger } from "@/lib/logging";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LINKEDIN_API_BASE = "https://api.linkedin.com/rest";
const LINKEDIN_OAUTH_BASE = "https://www.linkedin.com/oauth/v2";
const LINKEDIN_API_VERSION = "202604";
const LINKEDIN_POST_URL_PREFIX = "https://www.linkedin.com/feed/update/";

/** Timeout for all LinkedIn API calls (ms). */
const REQUEST_TIMEOUT_MS = 15_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function linkedInHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "LinkedIn-Version": LINKEDIN_API_VERSION,
    "X-Restli-Protocol-Version": "2.0.0",
  };
}

function encodeUrn(urn: string): string {
  // LinkedIn REST API requires parenthesized URN encoding in URL paths.
  // e.g. urn:li:share:123 -> (urn:li:share:123)
  // The URN itself contains colons that must NOT be double-encoded.
  return `(${encodeURIComponent(urn)})`;
}

function assertLinkedInInput(
  input: PublishInput,
): asserts input is LinkedInPublishInput {
  if (input.platform !== Platform.LinkedIn) {
    throw new AppError({
      code: ErrorCodes.VALIDATION_ERROR,
      message: `Expected LinkedIn input, got ${input.platform}`,
      errorClass: "permanent",
      retryable: false,
      platform: Platform.LinkedIn,
      httpStatus: null,
    });
  }
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class LinkedInAdapter extends BaseAdapter {
  readonly platform = Platform.LinkedIn;
  readonly supportsPublish = true;
  readonly supportsDelete = true;
  readonly authMethod: AuthMethod = "oauth2";

  // -----------------------------------------------------------------------
  // publish
  // -----------------------------------------------------------------------

  async publish(
    input: PublishInput,
    token: string,
    idempotencyKey: string,
  ): Promise<PublishResult> {
    assertLinkedInInput(input);

    const log = createLogger({ platform: Platform.LinkedIn });
    log.info("linkedin.publish.start", { idempotencyKey, authorUrn: input.authorUrn });

    const body = {
      author: input.authorUrn,
      commentary: input.commentary,
      visibility: input.visibility,
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
    };

    const res = await fetch(`${LINKEDIN_API_BASE}/posts`, {
      method: "POST",
      headers: {
        ...linkedInHeaders(token),
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => null);
      log.error("linkedin.publish.failed", null, {
        status: res.status,
        errorBody,
      });
      throw this.mapError(res.status, errorBody);
    }

    // LinkedIn returns the post URN in the x-restli-id HEADER, not JSON body.
    const postUrn = res.headers.get("x-restli-id");

    if (!postUrn) {
      log.error("linkedin.publish.no_urn", null, {
        headers: Object.fromEntries(res.headers.entries()),
      });
      throw new AppError({
        code: ErrorCodes.PUBLISH_FAILED,
        message: "LinkedIn returned 201 but no x-restli-id header",
        errorClass: "ambiguous",
        retryable: false,
        platform: Platform.LinkedIn,
        httpStatus: 201,
      });
    }

    const platformUrl = `${LINKEDIN_POST_URL_PREFIX}${postUrn}`;
    const publishedAt = new Date();

    log.info("linkedin.publish.success", {
      idempotencyKey,
      postUrn,
      platformUrl,
    });

    return {
      success: true,
      platform: Platform.LinkedIn,
      platformPostId: postUrn,
      platformUrl,
      publishedAt,
      idempotencyKey,
      raw: { postUrn, responseStatus: 201 },
    };
  }

  // -----------------------------------------------------------------------
  // verify
  // -----------------------------------------------------------------------

  async verify(platformPostId: string, token: string): Promise<VerifyResult> {
    const log = createLogger({ platform: Platform.LinkedIn });
    log.info("linkedin.verify.start", { platformPostId });

    const encodedId = encodeUrn(platformPostId);
    const res = await fetch(`${LINKEDIN_API_BASE}/posts/${encodedId}`, {
      method: "GET",
      headers: linkedInHeaders(token),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (res.status === 404) {
      log.warn("linkedin.verify.not_found", { platformPostId });
      return {
        exists: false,
        visible: false,
        platformPostId,
        checkedAt: new Date(),
      };
    }

    if (!res.ok) {
      const errorBody = await res.json().catch(() => null);
      log.error("linkedin.verify.failed", null, {
        status: res.status,
        errorBody,
      });
      throw this.mapError(res.status, errorBody);
    }

    const data = (await res.json()) as Record<string, unknown>;
    const lifecycleState = data.lifecycleState as string | undefined;

    log.info("linkedin.verify.success", {
      platformPostId,
      lifecycleState,
    });

    return {
      exists: true,
      visible: lifecycleState === "PUBLISHED",
      platformPostId,
      checkedAt: new Date(),
    };
  }

  // -----------------------------------------------------------------------
  // deletePost
  // -----------------------------------------------------------------------

  async deletePost(platformPostId: string, token: string): Promise<void> {
    const log = createLogger({ platform: Platform.LinkedIn });
    log.info("linkedin.delete.start", { platformPostId });

    const encodedId = encodeUrn(platformPostId);
    const res = await fetch(`${LINKEDIN_API_BASE}/posts/${encodedId}`, {
      method: "DELETE",
      headers: linkedInHeaders(token),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (res.status === 404) {
      // Already deleted -- treat as success (idempotent).
      log.info("linkedin.delete.already_gone", { platformPostId });
      return;
    }

    if (!res.ok) {
      const errorBody = await res.json().catch(() => null);
      log.error("linkedin.delete.failed", null, {
        status: res.status,
        errorBody,
      });
      throw this.mapError(res.status, errorBody);
    }

    log.info("linkedin.delete.success", { platformPostId });
  }

  // -----------------------------------------------------------------------
  // refreshToken
  // -----------------------------------------------------------------------

  async refreshToken(credential: OAuthCredential): Promise<TokenResult> {
    const log = createLogger({ platform: Platform.LinkedIn });
    log.info("linkedin.refresh_token.start");

    if (!credential.refreshToken) {
      throw new AppError({
        code: ErrorCodes.TOKEN_REFRESH_FAILED,
        message: "No refresh token available for LinkedIn credential",
        errorClass: "permanent",
        retryable: false,
        platform: Platform.LinkedIn,
        httpStatus: null,
      });
    }

    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new AppError({
        code: ErrorCodes.TOKEN_REFRESH_FAILED,
        message: "LINKEDIN_CLIENT_ID or LINKEDIN_CLIENT_SECRET not configured",
        errorClass: "permanent",
        retryable: false,
        platform: Platform.LinkedIn,
        httpStatus: null,
      });
    }

    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: credential.refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const res = await fetch(`${LINKEDIN_OAUTH_BASE}/accessToken`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => null);
      log.error("linkedin.refresh_token.failed", null, {
        status: res.status,
        errorBody,
      });
      throw new AppError({
        code: ErrorCodes.TOKEN_REFRESH_FAILED,
        message: `LinkedIn token refresh returned ${res.status}`,
        errorClass: res.status >= 500 ? "transient" : "permanent",
        retryable: res.status >= 500,
        platform: Platform.LinkedIn,
        httpStatus: res.status,
        raw: errorBody,
      });
    }

    const data = (await res.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
      refresh_token_expires_in?: number;
    };

    const now = Date.now();
    const expiresAt = new Date(now + data.expires_in * 1000);

    // LinkedIn refresh token TTL does NOT reset on refresh — counts down from
    // the original 365-day grant. If a new refresh token is issued, use it;
    // otherwise preserve the existing one.
    const refreshTokenExpiresAt = data.refresh_token_expires_in
      ? new Date(now + data.refresh_token_expires_in * 1000)
      : credential.refreshTokenExpiresAt;

    log.info("linkedin.refresh_token.success", {
      expiresAt: expiresAt.toISOString(),
      newRefreshTokenIssued: !!data.refresh_token,
    });

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? credential.refreshToken,
      expiresAt,
      refreshTokenExpiresAt,
      scopes: credential.scopes,
    };
  }

  // -----------------------------------------------------------------------
  // healthProbe
  // -----------------------------------------------------------------------

  async healthProbe(): Promise<HealthResult> {
    const start = Date.now();

    // Health probe uses a dummy token to distinguish "API reachable but 401"
    // (degraded) from "API unreachable" (down).
    try {
      const res = await fetch(`${LINKEDIN_API_BASE}/me`, {
        method: "GET",
        headers: {
          Authorization: "Bearer health_probe_check",
          "LinkedIn-Version": LINKEDIN_API_VERSION,
          "X-Restli-Protocol-Version": "2.0.0",
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      const latencyMs = Date.now() - start;

      if (res.status === 200) {
        return {
          platform: Platform.LinkedIn,
          status: "healthy",
          latencyMs,
          checkedAt: new Date(),
        };
      }

      if (res.status === 401) {
        // API is reachable but token invalid -- expected for health probe.
        return {
          platform: Platform.LinkedIn,
          status: "degraded",
          latencyMs,
          checkedAt: new Date(),
          details: "API reachable, token expired or invalid",
        };
      }

      return {
        platform: Platform.LinkedIn,
        status: "degraded",
        latencyMs,
        checkedAt: new Date(),
        details: `Unexpected status ${res.status}`,
      };
    } catch (err) {
      const latencyMs = Date.now() - start;
      return {
        platform: Platform.LinkedIn,
        status: "down",
        latencyMs,
        checkedAt: new Date(),
        details: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
