import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";
import type {
  Platform,
  OAuthCredential,
  TokenResult,
} from "@/lib/connectors/types";
import { TOKEN_REFRESH_CONFIG } from "@/lib/connectors/types";
import { AppError, ErrorCodes } from "@/lib/errors/app-error";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;

interface EncryptedPayload {
  iv: string;
  data: string;
  tag: string;
  salt: string;
  v: 1;
}

interface TokenRow {
  id: string;
  workspace_id: string;
  platform: string;
  encrypted_access_token: Buffer;
  encrypted_refresh_token: Buffer | null;
  access_token_expires_at: Date | null;
  refresh_token_expires_at: Date | null;
  scopes: string[];
  last_refreshed_at: Date | null;
  refresh_failure_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface TokenManagerDb {
  getToken(
    workspaceId: string,
    platform: Platform,
  ): Promise<TokenRow | null>;
  upsertToken(
    row: Partial<TokenRow> & { workspace_id: string; platform: string },
  ): Promise<void>;
  getTokensNeedingRefresh(horizonMs: number): Promise<TokenRow[]>;
  deleteToken(workspaceId: string, platform: Platform): Promise<void>;
}

type RefreshFn = (credential: OAuthCredential) => Promise<TokenResult>;

export class TokenManager {
  private readonly db: TokenManagerDb;
  private readonly encryptionKey: string;
  private readonly refreshFns: Map<Platform, RefreshFn>;

  constructor(
    db: TokenManagerDb,
    encryptionKey: string,
    refreshFns?: Map<Platform, RefreshFn>,
  ) {
    if (!encryptionKey || encryptionKey.length < 32) {
      throw new Error("Encryption key must be at least 32 characters");
    }
    this.db = db;
    this.encryptionKey = encryptionKey;
    this.refreshFns = refreshFns ?? new Map();
  }

  registerRefreshFn(platform: Platform, fn: RefreshFn): void {
    this.refreshFns.set(platform, fn);
  }

  encrypt(plaintext: string): Buffer {
    const salt = randomBytes(SALT_LENGTH);
    const key = scryptSync(this.encryptionKey, salt, KEY_LENGTH);
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag();

    const payload: EncryptedPayload = {
      iv: iv.toString("hex"),
      data: encrypted,
      tag: tag.toString("hex"),
      salt: salt.toString("hex"),
      v: 1,
    };

    return Buffer.from(JSON.stringify(payload), "utf8");
  }

  decrypt(cipherBuffer: Buffer): string {
    try {
      const payload: EncryptedPayload = JSON.parse(
        cipherBuffer.toString("utf8"),
      );

      if (payload.v !== 1) {
        throw new Error(`Unsupported encryption version: ${payload.v}`);
      }

      const salt = Buffer.from(payload.salt, "hex");
      const key = scryptSync(this.encryptionKey, salt, KEY_LENGTH);
      const iv = Buffer.from(payload.iv, "hex");
      const tag = Buffer.from(payload.tag, "hex");

      const decipher = createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(payload.data, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      throw new AppError({
        code: ErrorCodes.TOKEN_DECRYPT_FAILED,
        message: "Failed to decrypt token",
        errorClass: "permanent",
        retryable: false,
        platform: "linkedin" as Platform,
        httpStatus: null,
        cause: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  async storeToken(
    workspaceId: string,
    platform: Platform,
    tokenResult: TokenResult,
  ): Promise<void> {
    const encryptedAccess = this.encrypt(tokenResult.accessToken);
    const encryptedRefresh = tokenResult.refreshToken
      ? this.encrypt(tokenResult.refreshToken)
      : null;

    await this.db.upsertToken({
      workspace_id: workspaceId,
      platform,
      encrypted_access_token: encryptedAccess,
      encrypted_refresh_token: encryptedRefresh,
      access_token_expires_at: tokenResult.expiresAt,
      refresh_token_expires_at: tokenResult.refreshTokenExpiresAt,
      scopes: tokenResult.scopes,
      last_refreshed_at: new Date(),
      refresh_failure_count: 0,
    });
  }

  async getDecryptedToken(
    workspaceId: string,
    platform: Platform,
  ): Promise<{
    accessToken: string;
    refreshToken: string | null;
    expiresAt: Date | null;
    refreshTokenExpiresAt: Date | null;
    scopes: string[];
    needsRefresh: boolean;
    refreshTokenExpiring: boolean;
  } | null> {
    const row = await this.db.getToken(workspaceId, platform);
    if (!row) return null;

    const accessToken = this.decrypt(row.encrypted_access_token);
    const refreshToken = row.encrypted_refresh_token
      ? this.decrypt(row.encrypted_refresh_token)
      : null;

    const config = TOKEN_REFRESH_CONFIG[platform];
    const now = new Date();

    let needsRefresh = false;
    if (config.accessTokenLifetimeMs && row.access_token_expires_at) {
      const lifetime = config.accessTokenLifetimeMs;
      const refreshAt = new Date(
        row.access_token_expires_at.getTime() -
          lifetime * (1 - config.refreshAtPercent),
      );
      needsRefresh = now >= refreshAt;
    }

    let refreshTokenExpiring = false;
    if (row.refresh_token_expires_at && config.refreshTokenLifetimeMs) {
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      refreshTokenExpiring =
        row.refresh_token_expires_at.getTime() - now.getTime() < thirtyDays;
    }

    return {
      accessToken,
      refreshToken,
      expiresAt: row.access_token_expires_at,
      refreshTokenExpiresAt: row.refresh_token_expires_at,
      scopes: row.scopes,
      needsRefresh,
      refreshTokenExpiring,
    };
  }

  async deleteToken(
    workspaceId: string,
    platform: Platform,
  ): Promise<void> {
    await this.db.deleteToken(workspaceId, platform);
  }

  async getValidToken(
    workspaceId: string,
    platform: Platform,
  ): Promise<string> {
    const token = await this.getDecryptedToken(workspaceId, platform);

    if (!token) {
      throw new AppError({
        code: ErrorCodes.AUTH_EXPIRED,
        message: `No stored credential for ${platform}`,
        errorClass: "permanent",
        retryable: false,
        platform,
        httpStatus: 401,
      });
    }

    const config = TOKEN_REFRESH_CONFIG[platform];
    if (!config.accessTokenLifetimeMs) {
      return token.accessToken;
    }

    if (token.expiresAt && new Date() >= token.expiresAt) {
      return this.refreshAndStore(workspaceId, platform, token);
    }

    if (token.needsRefresh) {
      try {
        return await this.refreshAndStore(workspaceId, platform, token);
      } catch {
        if (token.expiresAt && new Date() < token.expiresAt) {
          return token.accessToken;
        }
        throw new AppError({
          code: ErrorCodes.TOKEN_REFRESH_FAILED,
          message: `Token refresh failed for ${platform} and current token is expired`,
          errorClass: "transient",
          retryable: true,
          platform,
          httpStatus: null,
        });
      }
    }

    return token.accessToken;
  }

  private async refreshAndStore(
    workspaceId: string,
    platform: Platform,
    currentToken: {
      accessToken: string;
      refreshToken: string | null;
      scopes: string[];
    },
  ): Promise<string> {
    const refreshFn = this.refreshFns.get(platform);
    if (!refreshFn) {
      throw new AppError({
        code: ErrorCodes.NOT_IMPLEMENTED,
        message: `No refresh function registered for ${platform}`,
        errorClass: "permanent",
        retryable: false,
        platform,
        httpStatus: null,
      });
    }

    const credential: OAuthCredential = {
      workspaceId,
      platform,
      accessToken: currentToken.accessToken,
      refreshToken: currentToken.refreshToken,
      expiresAt: null,
      refreshTokenExpiresAt: null,
      scopes: currentToken.scopes,
      encryptedPayload: Buffer.alloc(0),
    };

    try {
      const result = await refreshFn(credential);
      await this.storeToken(workspaceId, platform, result);
      return result.accessToken;
    } catch (error) {
      const row = await this.db.getToken(workspaceId, platform);
      if (row) {
        await this.db.upsertToken({
          workspace_id: workspaceId,
          platform,
          refresh_failure_count: row.refresh_failure_count + 1,
        });
      }
      throw error;
    }
  }

  async refreshDueTokens(
    horizonMs: number = 15 * 60 * 1000,
  ): Promise<{
    refreshed: Array<{ workspaceId: string; platform: Platform }>;
    failed: Array<{
      workspaceId: string;
      platform: Platform;
      error: string;
    }>;
    skipped: Array<{
      workspaceId: string;
      platform: Platform;
      reason: string;
    }>;
  }> {
    const rows = await this.db.getTokensNeedingRefresh(horizonMs);
    const refreshed: Array<{ workspaceId: string; platform: Platform }> = [];
    const failed: Array<{
      workspaceId: string;
      platform: Platform;
      error: string;
    }> = [];
    const skipped: Array<{
      workspaceId: string;
      platform: Platform;
      reason: string;
    }> = [];

    for (const row of rows) {
      const platform = row.platform as Platform;
      const config = TOKEN_REFRESH_CONFIG[platform];

      if (!config.accessTokenLifetimeMs) {
        skipped.push({
          workspaceId: row.workspace_id,
          platform,
          reason: "Platform does not require token refresh",
        });
        continue;
      }

      if (row.refresh_failure_count >= 5) {
        skipped.push({
          workspaceId: row.workspace_id,
          platform,
          reason: `Too many refresh failures (${row.refresh_failure_count})`,
        });
        continue;
      }

      try {
        await this.getValidToken(row.workspace_id, platform);
        refreshed.push({ workspaceId: row.workspace_id, platform });
      } catch (error) {
        failed.push({
          workspaceId: row.workspace_id,
          platform,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { refreshed, failed, skipped };
  }

  async checkRefreshTokenHealth(
    workspaceId: string,
    platform: Platform,
  ): Promise<{
    healthy: boolean;
    daysUntilExpiry: number | null;
    warning: string | null;
    action: "none" | "warn_user" | "require_reauth";
  }> {
    const token = await this.getDecryptedToken(workspaceId, platform);
    if (!token) {
      return {
        healthy: false,
        daysUntilExpiry: null,
        warning: "No stored credential",
        action: "require_reauth",
      };
    }

    if (!token.refreshTokenExpiresAt) {
      return {
        healthy: true,
        daysUntilExpiry: null,
        warning: null,
        action: "none",
      };
    }

    const now = new Date();
    const msUntilExpiry =
      token.refreshTokenExpiresAt.getTime() - now.getTime();
    const daysUntilExpiry = Math.floor(msUntilExpiry / (24 * 60 * 60 * 1000));

    if (daysUntilExpiry <= 0) {
      return {
        healthy: false,
        daysUntilExpiry: 0,
        warning: `Refresh token for ${platform} has expired. Re-authentication required.`,
        action: "require_reauth",
      };
    }

    if (daysUntilExpiry <= 30) {
      return {
        healthy: false,
        daysUntilExpiry,
        warning: `Refresh token for ${platform} expires in ${daysUntilExpiry} days. User should re-authenticate.`,
        action: "warn_user",
      };
    }

    if (daysUntilExpiry <= 90) {
      return {
        healthy: true,
        daysUntilExpiry,
        warning: `Refresh token for ${platform} expires in ${daysUntilExpiry} days.`,
        action: "none",
      };
    }

    return {
      healthy: true,
      daysUntilExpiry,
      warning: null,
      action: "none",
    };
  }
}
