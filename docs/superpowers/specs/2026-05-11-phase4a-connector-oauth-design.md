# Phase 4A: Connector OAuth — Design Spec

## Context

Phases 0-3.5 built foundation, tRPC, brand brief, onboarding. Phase 4A wires OAuth login flows so users can connect publishing channels. Token manager (AES-256-GCM) and connector schema already exist from Phase 0. This phase builds the OAuth flow framework + LinkedIn as first connector.

## Scope

- Generic OAuth flow infrastructure (routes, state management, token storage)
- LinkedIn OAuth implementation (first connector, proves the pattern)
- Beehiiv API key storage (no OAuth, just key input)
- Connector management tRPC procedures (connect, disconnect, health check)
- Updated connectors page UI with working Connect/Reconnect buttons

Other platforms (X, YouTube, Instagram, TikTok) added incrementally after framework is proven.

## Architecture

```
User clicks "Connect LinkedIn"
  → tRPC connectors.getOAuthUrl({ platform: "linkedin" })
  → Server generates state token + returns LinkedIn auth URL
  → User redirected to LinkedIn consent screen
  → LinkedIn redirects to /api/auth/oauth/linkedin/callback?code=XXX&state=YYY
  → Server verifies state, exchanges code for tokens
  → Encrypts tokens via token-manager, stores in oauth_credentials
  → Creates/updates connector record (state: "healthy")
  → Redirects user to /connectors?connected=linkedin
```

## Files to Create

| File | Purpose |
|------|---------|
| `src/app/api/auth/oauth/[platform]/callback/route.ts` | OAuth callback handler (generic, dispatches per platform) |
| `src/lib/connectors/oauth/linkedin.ts` | LinkedIn-specific OAuth logic (auth URL, token exchange, scopes) |
| `src/lib/connectors/oauth/registry.ts` | Platform OAuth config registry |
| `src/lib/connectors/oauth/state.ts` | State token generation + verification |

## Files to Modify

| File | Change |
|------|--------|
| `src/server/routers/connectors.ts` | Add getOAuthUrl, disconnect, getHealth procedures |
| `src/app/(app)/connectors/page.tsx` | Replace placeholder with connector cards UI |

## OAuth Flow Details

### State Management

State token = `{ platform, workspaceId, userId, timestamp }` → HMAC-signed with OAUTH_ENCRYPTION_KEY → base64url encoded. Verified on callback. Expires in 10 minutes.

### LinkedIn OAuth

- Auth URL: `https://www.linkedin.com/oauth/v2/authorization`
- Token URL: `https://www.linkedin.com/oauth/v2/accessToken`
- Scopes: `openid profile w_member_social`
- Redirect: `/api/auth/oauth/linkedin/callback`
- Token TTL: 60 days access, 365 days refresh
- Response: `{ access_token, expires_in, refresh_token, refresh_token_expires_in }`

### Beehiiv (API Key)

- No OAuth flow — user enters API key in form
- Store encrypted in oauth_credentials with scope "api_key"
- Validate by calling `GET /v2/publications` with the key

### Env Vars Required

```
OAUTH_ENCRYPTION_KEY=<64-char hex>
LINKEDIN_CLIENT_ID=<from developer portal>
LINKEDIN_CLIENT_SECRET=<from developer portal>
```

## tRPC Procedures

| Procedure | Type | Input | Output |
|-----------|------|-------|--------|
| connectors.getOAuthUrl | mutation | `{ platform }` | `{ url, state }` |
| connectors.disconnect | mutation | `{ connectorId }` | `{ disconnected: true }` |
| connectors.saveApiKey | mutation | `{ platform, apiKey }` | connector object |

## Verification

1. `pnpm build` — clean
2. Click "Connect LinkedIn" → redirects to LinkedIn
3. Authorize → callback stores tokens → connector shows "healthy"
4. Disconnect → removes credentials → connector shows "disconnected"
5. Token encryption verified (no plaintext in DB)
