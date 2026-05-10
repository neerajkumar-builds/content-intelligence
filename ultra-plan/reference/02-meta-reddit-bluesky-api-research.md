# Social Media Publishing API Research -- Production-Grade Reference (May 2026)

---

## 1. META GRAPH API (Facebook + Instagram + Threads)

### 1.1 Current API Version

**Graph API v25.0** (latest as of May 2026)

Base URLs:
- `https://graph.facebook.com/v25.0/`
- `https://graph.instagram.com/v25.0/` (IG shortcut)
- `https://graph.threads.net/v1.0/` (Threads-specific)

---

### 1.2 Facebook Pages API -- Post Creation

**Endpoint:** `POST https://graph.facebook.com/v25.0/{page_id}/feed`

**Required Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `message` | string | Text content of the post |
| `access_token` | string | Page Access Token |

**Optional Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `link` | URL | URL to include (auto-generates preview) |
| `published` | boolean | `false` for scheduled/draft posts (default: `true`) |
| `scheduled_publish_time` | int/string | UNIX timestamp or ISO 8601; must be 10 min to 30 days from now |
| `targeting.geo_locations` | object | Audience geo-targeting |

**Photo Post:** `POST https://graph.facebook.com/v25.0/{page_id}/photos`
| Parameter | Type | Description |
|-----------|------|-------------|
| `url` | URL | Publicly hosted image URL |
| `source` | file | Direct file upload (multipart/form-data) |
| `caption` | string | Photo caption |

**Video Post:** `POST https://graph.facebook.com/v25.0/{page_id}/videos`
| Parameter | Type | Description |
|-----------|------|-------------|
| `file_url` | URL | Publicly hosted video URL |
| `source` | file | Direct upload |
| `title` | string | Video title |
| `description` | string | Video description |

**Required Permissions:**
- `pages_manage_posts`
- `pages_manage_engagement`
- `pages_read_engagement`
- `pages_read_user_engagement`
- `publish_video` (video only)

**Required Page Tasks:** `CREATE_CONTENT`, `MANAGE`, `MODERATE`

**Success Response:**
```json
{
  "id": "page_post_id"
}
```

**Media Requirements (Facebook):**
- Images: JPG or PNG, max 8 MB, optimal 1200x630px (link posts) or 1200x1200px (square)
- Minimum width: 600px, recommended sRGB color space
- Videos: MP4/MOV recommended, max 10 GB, up to 240 min

---

### 1.3 Instagram Content Publishing API

Uses a **two-step container model**: create container, then publish.

#### Step 1: Create Media Container

**Endpoint:** `POST https://graph.facebook.com/v25.0/{ig_user_id}/media`

**Parameters by media type:**

**Single Image:**
```json
{
  "image_url": "https://example.com/image.jpg",
  "caption": "Post caption #hashtag",
  "alt_text": "Descriptive alt text",
  "access_token": "PAGE_OR_IG_TOKEN"
}
```

**Single Video / Reel:**
```json
{
  "media_type": "REELS",
  "video_url": "https://example.com/video.mp4",
  "caption": "Video caption",
  "access_token": "TOKEN"
}
```

**Story:**
```json
{
  "media_type": "STORIES",
  "image_url": "https://example.com/story.jpg",
  "access_token": "TOKEN"
}
```

**Carousel (up to 10 items):**
1. Create child containers with `is_carousel_item=true` (no caption on children)
2. Create carousel container:
```json
{
  "media_type": "CAROUSEL",
  "children": "CONTAINER_ID_1,CONTAINER_ID_2,CONTAINER_ID_3",
  "caption": "Carousel caption",
  "access_token": "TOKEN"
}
```

**Response:**
```json
{
  "id": "CONTAINER_ID"
}
```

#### Step 1.5: Check Container Status (required for video)

**Endpoint:** `GET https://graph.facebook.com/v25.0/{container_id}?fields=status_code`

Status codes: `IN_PROGRESS`, `FINISHED`, `ERROR`, `EXPIRED`, `PUBLISHED`

Poll once per minute, max 5 minutes.

#### Step 2: Publish Container

**Endpoint:** `POST https://graph.facebook.com/v25.0/{ig_user_id}/media_publish`

```json
{
  "creation_id": "CONTAINER_ID",
  "access_token": "TOKEN"
}
```

**Response:**
```json
{
  "id": "IG_MEDIA_ID"
}
```

#### Check Rate Limit Usage

**Endpoint:** `GET https://graph.facebook.com/v25.0/{ig_user_id}/content_publishing_limit?fields=quota_usage,config`

**Response:**
```json
{
  "data": [{
    "quota_usage": 12,
    "config": {
      "quota_total": 50,
      "quota_duration": 86400
    }
  }]
}
```

**Required Permissions (Instagram Login flow):**
- `instagram_business_basic`
- `instagram_business_content_publish`

**Required Permissions (Facebook Login flow):**
- `instagram_basic`
- `instagram_content_publish`
- `pages_read_engagement`

**Media Requirements (Instagram):**
- Images: JPEG only (no PNG, no extended JPEG like MPO/JPS), max 8 MB
- Aspect ratio: 1.91:1 to 4:5 (API does NOT support 3:4 despite native app support)
- Minimum width: 320px, maximum: 1440px, recommended: 1080px
- Color space: sRGB
- Videos: MP4/MOV, H.264 codec, AAC audio (48kHz max)
- Video max: 60 sec (feed), 90 sec (Reels), 60 sec (Stories), max 1 GB
- Frame rate: 23-60 FPS
- Media must be at a publicly accessible URL at time of container creation

**Rate Limits:**
- **50 containers per 24-hour rolling period** (per `content_publishing_limit` endpoint -- this is the enforced limit as of 2025+)
- Carousel counts as 1 post
- Historical note: was previously 25/day, then 100/day in some docs; the `config.quota_total` field returns the actual current limit for your account

---

### 1.4 Threads API -- Post Creation

Uses the same **two-step container model** as Instagram but with its own base URL.

**Base URL:** `https://graph.threads.net/v1.0/`

#### Step 1: Create Container

**Endpoint:** `POST https://graph.threads.net/v1.0/{threads_user_id}/threads`

**Text Post:**
```json
{
  "media_type": "TEXT",
  "text": "Post content up to 500 characters",
  "access_token": "THREADS_TOKEN"
}
```

**Image Post:**
```json
{
  "media_type": "IMAGE",
  "image_url": "https://example.com/image.jpg",
  "text": "Optional caption",
  "access_token": "TOKEN"
}
```

**Video Post:**
```json
{
  "media_type": "VIDEO",
  "video_url": "https://example.com/video.mp4",
  "text": "Optional caption",
  "access_token": "TOKEN"
}
```

**Carousel (2-20 items):**
1. Create individual containers with `is_carousel_item=true`
2. Create carousel container:
```json
{
  "media_type": "CAROUSEL",
  "children": "ID_1,ID_2,ID_3",
  "text": "Carousel caption",
  "access_token": "TOKEN"
}
```

**Optional Parameters (all types):**
- `text` -- post text (max 500 characters)
- `link_attachment` -- URL for text posts only
- `topic_tag` -- 1-50 chars, no periods or ampersands
- `gif_attachment` -- `{"gif_id": "...", "provider": "giphy"}`

**Response:**
```json
{
  "id": "THREADS_CONTAINER_ID"
}
```

#### Step 1.5: Check Status (video)

```
GET https://graph.threads.net/v1.0/{container_id}?fields=status&access_token=TOKEN
```
Wait for `status=FINISHED`. Recommended: wait ~30 seconds before publishing.

#### Step 2: Publish

**Endpoint:** `POST https://graph.threads.net/v1.0/{threads_user_id}/threads_publish`

```json
{
  "creation_id": "CONTAINER_ID",
  "access_token": "TOKEN"
}
```

**Response:**
```json
{
  "id": "THREADS_MEDIA_ID"
}
```

**Required Scopes:**
- `threads_basic` (required for all Threads API calls)
- `threads_content_publish` (required for publishing)

**Threads OAuth Flow (separate from Facebook/Instagram):**

Authorization URL:
```
https://threads.net/oauth/authorize
  ?client_id=APP_ID
  &redirect_uri=REDIRECT_URI
  &scope=threads_basic,threads_content_publish
  &response_type=code
```

Token exchange:
```
POST https://graph.threads.net/oauth/access_token
  client_id=APP_ID
  client_secret=APP_SECRET
  grant_type=authorization_code
  redirect_uri=REDIRECT_URI
  code=AUTH_CODE
```

Long-lived token (60 days):
```
GET https://graph.threads.net/access_token
  ?grant_type=th_exchange_token
  &client_secret=APP_SECRET
  &access_token=SHORT_LIVED_TOKEN
```

**Media Requirements (Threads):**
- Images: JPEG, PNG; max 8 MB; min 320px wide, max 1440px; sRGB; aspect ratio max 10:1
- Videos: MP4/MOV, H.264/HEVC, AAC audio (48kHz); max 5 min; max 1 GB; max 1920px width; 23-60 FPS; 9:16 recommended
- Text: max 500 characters
- URLs: max 5 unique URLs per post (auto-preview)
- GIFs: GIPHY only (via `gif_attachment`)

**Rate Limits:**
- **250 posts per user per 24-hour rolling window**
- Read operations have separate Graph API pool limits

**Gotchas:**
- No native scheduling -- immediate publish only
- No editing published posts
- No direct media upload -- must be publicly accessible URLs
- Posts auto-share to fediverse (since Aug 28, 2024) for eligible users
- App review required for production
- Tokens expire at 60 days -- must automate refresh
- Separate token system from Instagram despite shared infrastructure

---

### 1.5 Shared Meta OAuth Flow

All three platforms use Meta's OAuth 2.0 but with different entry points:

#### Facebook + Instagram (shared flow via Facebook Login):

1. **User Authorization:**
```
https://www.facebook.com/v25.0/dialog/oauth
  ?client_id=APP_ID
  &redirect_uri=REDIRECT_URI
  &scope=pages_manage_posts,instagram_content_publish,...
  &response_type=code
```

2. **Exchange Code for Short-Lived User Token:**
```
GET https://graph.facebook.com/v25.0/oauth/access_token
  ?client_id=APP_ID
  &redirect_uri=REDIRECT_URI
  &client_secret=APP_SECRET
  &code=AUTH_CODE
```

3. **Exchange for Long-Lived User Token (60 days):**
```
GET https://graph.facebook.com/v25.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id=APP_ID
  &client_secret=APP_SECRET
  &fb_exchange_token=SHORT_LIVED_TOKEN
```
Response:
```json
{
  "access_token": "LONG_LIVED_USER_TOKEN",
  "token_type": "bearer",
  "expires_in": 5183944
}
```

4. **Get Never-Expiring Page Token:**
```
GET https://graph.facebook.com/v25.0/me/accounts
  ?access_token=LONG_LIVED_USER_TOKEN
```
Response:
```json
{
  "data": [{
    "access_token": "NEVER_EXPIRING_PAGE_TOKEN",
    "name": "My Page",
    "id": "PAGE_ID"
  }]
}
```

**Token Lifetimes:**
| Token Type | Lifetime |
|------------|----------|
| Short-lived User Token | ~1-2 hours |
| Long-lived User Token | ~60 days |
| Page Token (from long-lived user token) | **Never expires** (unless invalidated) |
| Threads short-lived token | ~1 hour |
| Threads long-lived token | ~60 days |

**Invalidation conditions for page tokens:** password change, user de-authorizes app, app secret reset, user removed from page admin.

**CRITICAL:** Token exchange must happen server-side (app secret must never be exposed client-side).

#### Threads (separate OAuth flow):
See Section 1.4 above. Uses `threads.net/oauth/authorize` and `graph.threads.net/oauth/access_token`.

---

### 1.6 Meta Error Response Format

**Standard error body (all Meta APIs):**
```json
{
  "error": {
    "message": "Unsupported post request. Object with ID '123' does not exist.",
    "type": "GraphMethodException",
    "code": 100,
    "error_subcode": 33,
    "error_user_title": "Object Does Not Exist",
    "error_user_msg": "The object you are trying to access does not exist.",
    "fbtrace_id": "AV2RfVIRrq3z2Stz_G7Ncgt"
  }
}
```

**Field Reference:**
| Field | Description |
|-------|-------------|
| `message` | Human-readable error description |
| `type` | Error category: `OAuthException`, `GraphMethodException`, etc. |
| `code` | Primary error code (see table below) |
| `error_subcode` | More specific error detail |
| `error_user_title` | Localizable title for user-facing dialogs |
| `error_user_msg` | Localizable message for end-user display |
| `fbtrace_id` | Internal trace ID for Meta support debugging (expires shortly) |

**Key Error Codes:**
| Code | Meaning | Action |
|------|---------|--------|
| 1 | Unknown error | Retry |
| 2 | Service temporarily unavailable | Retry with backoff |
| 3 | Method not allowed | Check app capabilities/permissions |
| 4 | Application rate limit | Back off; check `X-App-Usage` header |
| 10 | Permission denied | Request missing permissions |
| 17 | User rate limit | Reduce per-user call volume |
| 32 | Pages API rate limit | Back off |
| 100 | Invalid parameter | Check request params |
| 190 | Access token invalid/expired | Refresh token |
| 200-299 | Permission errors | Request missing permissions |
| 341 | Application limit reached | Reduce volume |
| 368 | Policy violation | Review content policies |
| 506 | Duplicate post | Modify content |
| 80001 | Pages BUC rate limit (page/system user token) | Back off |

**Auth Subcodes (for code 190):**
| Subcode | Meaning |
|---------|---------|
| 458 | App not installed -- re-authenticate |
| 459 | User checkpointed -- redirect to facebook.com |
| 460 | Password changed |
| 463 | Token expired |
| 464 | Unconfirmed user |
| 467 | Invalid access token |
| 492 | Invalid session -- verify page role |

---

### 1.7 Meta Rate Limits Summary

**Facebook Pages API:**
- Formula: `4,800 x Engaged Users` calls per 24 hours per page
- "Engaged Users" = users who interacted with the page in last 24 hours
- No documented per-operation limit for post creation specifically
- Rate limit errors return code 32 or 80001

**Instagram Content Publishing:**
- **50 containers per 24-hour rolling window** (current enforced limit per `content_publishing_limit` endpoint)
- Carousels count as 1 post
- Check usage via `GET /{ig_user_id}/content_publishing_limit`

**Threads:**
- **250 posts per user per 24-hour rolling window**

**Rate Limit Headers:**
- `X-App-Usage`: JSON with `call_count`, `total_cputime`, `total_time` (percentages)
- `X-Business-Use-Case-Usage`: JSON with `call_count`, `estimated_time_to_regain_access`, `type`
- Throttling triggers when any metric hits 100%

---

### 1.8 Meta Webhook Verification

**Signature Header:** `X-Hub-Signature-256`

Format: `sha256=<HMAC-SHA256-hex-digest>`

**Verification Process:**
1. Compute HMAC-SHA256 of the raw request body using your App Secret as the key
2. Compare resulting hex digest to the value in `X-Hub-Signature-256` (after stripping `sha256=` prefix)
3. Use timing-safe comparison (`crypto.timingSafeEqual` in Node.js, `hmac.compare_digest` in Python)

**Critical Notes:**
- Verify against raw body BEFORE any JSON parsing middleware transforms it
- Meta uses escaped Unicode encoding for special characters when generating signature
- **March 31, 2026:** Meta is switching Certificate Authority for mTLS -- update trust store or stop receiving webhooks

---

## 2. REDDIT API

### 2.1 Authentication

**OAuth 2.0 Base URLs:**
- Authorization: `https://www.reddit.com/api/v1/authorize`
- Token: `https://www.reddit.com/api/v1/access_token`
- API calls: `https://oauth.reddit.com/` (NOT www.reddit.com)

**Grant Types:**
1. **Authorization Code** -- web apps (`response_type=code`)
2. **Script App** -- personal bots (HTTP Basic Auth with client_id:client_secret + username/password)
3. **Client Credentials** -- read-only public data
4. **Installed Client** -- non-confidential apps

**Authorization URL:**
```
https://www.reddit.com/api/v1/authorize
  ?client_id=CLIENT_ID
  &response_type=code
  &state=RANDOM_STRING
  &redirect_uri=REDIRECT_URI
  &duration=permanent
  &scope=submit,read,identity,flair
```

**Token Exchange:**
```
POST https://www.reddit.com/api/v1/access_token
Authorization: Basic base64(CLIENT_ID:CLIENT_SECRET)
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=AUTH_CODE
&redirect_uri=REDIRECT_URI
```

**Available Scopes:**
`identity`, `edit`, `flair`, `history`, `modconfig`, `modflair`, `modlog`, `modposts`, `modwiki`, `mysubreddits`, `privatemessages`, `read`, `report`, `save`, `submit`, `subscribe`, `vote`, `wikiedit`, `wikiread`

**Key scopes for posting:** `submit` (required), `identity` (recommended), `flair` (if flair required), `read` (recommended)

**Token Lifecycle:**
| Token Type | Lifetime |
|------------|----------|
| Access Token | 1 hour |
| Refresh Token (`duration=permanent`) | Does not expire (can be revoked) |
| Refresh Token (`duration=temporary`) | Single use, no refresh |

Refresh:
```
POST https://www.reddit.com/api/v1/access_token
Authorization: Basic base64(CLIENT_ID:CLIENT_SECRET)
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token=REFRESH_TOKEN
```

**CRITICAL:** User-Agent header is required and must be descriptive. Reddit will throttle or block generic user agents.
```
User-Agent: platform:com.example.myapp:v1.0.0 (by /u/yourusername)
```

---

### 2.2 Post Submission

**Endpoint:** `POST https://oauth.reddit.com/api/submit`

**Common Parameters (all post types):**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_type` | string | Recommended | Set to `json` to get JSON response instead of jQuery format |
| `kind` | string | Yes | `self`, `link`, `image`, `video`, `videogif` |
| `sr` | string | Yes | Subreddit name (without r/) |
| `title` | string | Yes | Post title (max 300 characters) |
| `sendreplies` | boolean | No | Send inbox replies (default: true) |
| `nsfw` | boolean | No | Mark NSFW |
| `spoiler` | boolean | No | Mark spoiler |
| `flair_id` | string | No | Flair template UUID |
| `flair_text` | string | No | Custom flair text (requires flair_id in some subreddits) |
| `resubmit` | boolean | No | Allow reposting same URL (default: true) |
| `collection_id` | string | No | Collection to add post to |
| `discussion_type` | string | No | `CHAT` for live discussion |

**Text Post (`kind=self`):**
| Parameter | Type | Description |
|-----------|------|-------------|
| `text` | string | Markdown body |
| `richtext_json` | string | Rich text JSON (alternative to `text`) |

**Link Post (`kind=link`):**
| Parameter | Type | Description |
|-----------|------|-------------|
| `url` | URL | The URL to submit |

**Example -- Text Post:**
```bash
curl -X POST "https://oauth.reddit.com/api/submit" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "User-Agent: platform:myapp:v1.0 (by /u/myuser)" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "api_type=json&kind=self&sr=test&title=Test+Post&text=Hello+World"
```

**Success Response (with `api_type=json`):**
```json
{
  "json": {
    "errors": [],
    "data": {
      "url": "https://www.reddit.com/r/test/comments/abc123/test_post/",
      "drafts_count": 0,
      "id": "abc123",
      "name": "t3_abc123"
    }
  }
}
```

**Error Response (with `api_type=json`):**
```json
{
  "json": {
    "errors": [
      ["SUBMIT_VALIDATION_FLAIR_REQUIRED", "Your post must contain post flair.", "flair"]
    ]
  }
}
```

Each error is a 3-element array: `[ERROR_CODE, human_message, field_name]`

**Common Error Codes:**
| Code | Meaning |
|------|---------|
| `SUBMIT_VALIDATION_FLAIR_REQUIRED` | Subreddit requires flair |
| `RATELIMIT` | Rate limited -- wait N minutes |
| `SUBREDDIT_NOTALLOWED` | Banned from subreddit |
| `NO_SELFS` | Subreddit doesn't allow text posts |
| `NO_LINKS` | Subreddit doesn't allow link posts |
| `ALREADY_SUB` | URL already submitted (use `resubmit=true`) |
| `TOO_LONG` | Title exceeds 300 characters |
| `NO_TEXT` | Missing required field |

**Without `api_type=json`:** Reddit returns a legacy jQuery array format:
```json
{
  "jquery": [[0,1,"attr","refresh"],[1,2,"call",[]]]
}
```
Always include `api_type=json` to get usable responses.

---

### 2.3 Media Upload Flow (Image/Video Posts)

Reddit uses a **three-step process** involving AWS S3 presigned uploads:

#### Step 1: Request Upload Lease

```
POST https://oauth.reddit.com/api/media/asset.json
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/x-www-form-urlencoded

filepath=image.png&mimetype=image/png
```

Response:
```json
{
  "asset": {
    "asset_id": "unique_id",
    "processing_state": "incomplete",
    "payload": {
      "filepath": "reddit-uploaded-media/xyz123.png"
    },
    "websocket_url": "wss://ws-HASH.reddit.com/..."
  },
  "args": {
    "action": "https://reddit-uploaded-media.s3-accelerate.amazonaws.com",
    "fields": [
      {"name": "key", "value": "reddit-uploaded-media/xyz123"},
      {"name": "AWSAccessKeyId", "value": "..."},
      {"name": "policy", "value": "..."},
      {"name": "signature", "value": "..."},
      {"name": "content-type", "value": "image/png"},
      {"name": "x-amz-security-token", "value": "..."},
      {"name": "x-amz-storage-class", "value": "INTELLIGENT_TIERING"}
    ]
  }
}
```

#### Step 2: Upload to S3

```
POST https://reddit-uploaded-media.s3-accelerate.amazonaws.com
Content-Type: multipart/form-data
Content-Length: {exact_byte_count}

[All fields from args.fields in order] + [file as last field]
```

**Critical gotchas:**
- `args.fields` MUST be iterated as an array (not object keys) -- append each `name`/`value` pair to FormData
- MUST set explicit `Content-Length` header -- S3 rejects chunked transfer encoding on presigned URLs (400 Bad Request)
- File must be the LAST field in the multipart form
- Expected response: 201 Created or 204 No Content

#### Step 3: Create Post with Media

```
POST https://oauth.reddit.com/api/submit
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/x-www-form-urlencoded

api_type=json
&kind=image
&sr=SubredditName
&title=Post+Title
&url=https://reddit-uploaded-media.s3-accelerate.amazonaws.com/reddit-uploaded-media/xyz123
&resubmit=true
```

Use the **raw S3 URL** (not `i.redd.it` CDN) -- Reddit converts internally.

**Supported MIME types:** `image/png`, `image/jpeg`, `image/gif`, `video/mp4`, `video/quicktime`

**Video constraints:** MP4 (H.264 + AAC) preferred, max ~1 GB, max ~1080p, max ~30 FPS

**Gallery posts** use a separate endpoint (`POST /api/submit_gallery_post.json`) with a JSON body containing an array of asset items with captions and outbound URLs.

---

### 2.4 Reddit Rate Limits

| Context | Limit |
|---------|-------|
| Authenticated (OAuth) | 60 requests per minute (100 req/min per some sources; 10-minute rolling window) |
| Unauthenticated | 10 requests per minute |
| Elevated access (approved apps) | 600-1000 requests per minute |

**Rate Limit Headers:**
| Header | Description |
|--------|-------------|
| `X-Ratelimit-Used` | Requests made in current window |
| `X-Ratelimit-Remaining` | Requests available |
| `X-Ratelimit-Reset` | Seconds until window resets |

**Practical advice:** Throttle to 50-55 requests/minute to maintain headroom.

**Submission-specific throttling:** New accounts and low-karma accounts face additional per-subreddit submission rate limits (e.g., "you are doing that too much, try again in N minutes"). This is separate from the API rate limit.

---

### 2.5 AutoModerator / Silent Removal

**This is the #1 gotcha for Reddit API posting.**

Posts can be "silently removed" -- they appear visible to the poster but are invisible to everyone else. No error is returned by the API. The `POST /api/submit` returns success.

**Common triggers:**
- Account age too low (subreddits commonly require 3-365 days)
- Karma too low (50-1000+ depending on subreddit)
- Domain blacklisted (URL shorteners always blocked)
- Keyword matching (promotional language: "discount", "use my link", "affiliate")
- Contributor Quality Score (CQS) -- Reddit's 5-tier system (Lowest, Low, Moderate, High, Highest) based on account history, email verification, network signals

**Detecting silent removal programmatically:**
1. After posting, fetch the post URL while **unauthenticated** (or with a different account)
2. If 404 or not visible, the post was silently removed
3. Check `GET /r/{subreddit}/new.json` and verify your post appears

**Mitigation:**
- Use aged accounts (30+ days minimum)
- Build karma organically before API posting
- Verify email on the Reddit account
- Avoid URL shorteners
- Check subreddit rules for flair requirements before posting

---

### 2.6 Reddit API Access (2025+ Changes)

Reddit removed self-service API access. You must:
1. Submit a request at https://www.reddit.com/wiki/api-terms-and-guidelines
2. Wait for approval
3. All access requires OAuth 2.0 (non-authenticated traffic blocked)
4. Free tier available for non-commercial, low-traffic use

---

## 3. BLUESKY / AT PROTOCOL

### 3.1 Authentication

Bluesky uses **App Passwords** (not full account passwords) for API auth.

**Create Session:**
```
POST https://bsky.social/xrpc/com.atproto.server.createSession
Content-Type: application/json

{
  "identifier": "yourhandle.bsky.social",
  "password": "your-app-password"
}
```

**Response:**
```json
{
  "did": "did:plc:abc123...",
  "handle": "yourhandle.bsky.social",
  "accessJwt": "eyJ...",
  "refreshJwt": "eyJ...",
  "email": "you@example.com",
  "emailConfirmed": true
}
```

**Token Lifecycle:**
| Token | Lifetime |
|-------|----------|
| `accessJwt` | Short-lived (minutes) |
| `refreshJwt` | Long-lived (for session refresh) |

**Refresh Session:**
```
POST https://bsky.social/xrpc/com.atproto.server.refreshSession
Authorization: Bearer {refreshJwt}
```

**OAuth (newer, recommended for third-party apps):**
Bluesky is rolling out AT Protocol OAuth with granular permissions. For simple automation, app passwords remain the standard approach.

---

### 3.2 Post Creation

**Endpoint:** `POST https://bsky.social/xrpc/com.atproto.repo.createRecord`

**Headers:**
```
Authorization: Bearer {accessJwt}
Content-Type: application/json
```

**Basic Text Post:**
```json
{
  "repo": "did:plc:abc123...",
  "collection": "app.bsky.feed.post",
  "record": {
    "$type": "app.bsky.feed.post",
    "text": "Hello from the API!",
    "createdAt": "2026-05-11T12:00:00.000Z"
  }
}
```

**Response:**
```json
{
  "uri": "at://did:plc:abc123.../app.bsky.feed.post/3k...",
  "cid": "bafyrei...",
  "commit": {
    "cid": "bafyrei...",
    "rev": "..."
  },
  "validationStatus": "valid"
}
```

**Required fields in `record`:**
- `$type`: `"app.bsky.feed.post"`
- `text`: Post text (max 300 graphemes / 3,000 bytes UTF-8)
- `createdAt`: ISO 8601 timestamp

---

### 3.3 Rich Text Facets (Links, Mentions, Hashtags)

Facets annotate byte ranges within the text. **Indices are byte offsets, not character offsets.**

**Post with Link:**
```json
{
  "repo": "did:plc:abc123...",
  "collection": "app.bsky.feed.post",
  "record": {
    "$type": "app.bsky.feed.post",
    "text": "Check out example.com for details",
    "createdAt": "2026-05-11T12:00:00.000Z",
    "facets": [
      {
        "index": {
          "byteStart": 10,
          "byteEnd": 21
        },
        "features": [
          {
            "$type": "app.bsky.richtext.facet#link",
            "uri": "https://example.com"
          }
        ]
      }
    ]
  }
}
```

**Mention (requires DID resolution first):**
```
GET https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=someone.bsky.social
```
Returns: `{"did": "did:plc:xyz..."}`

Then use facet:
```json
{
  "$type": "app.bsky.richtext.facet#mention",
  "did": "did:plc:xyz..."
}
```

**Hashtag:**
```json
{
  "$type": "app.bsky.richtext.facet#tag",
  "tag": "bluesky"
}
```

**CRITICAL:** Byte indices must be exact. Emojis and non-ASCII characters take multiple bytes. Use byte-counting (not `.length`) when calculating indices.

**Language Tags (BCP-47):**
```json
{
  "langs": ["en-US"]
}
```

---

### 3.4 Image Upload and Attachment

#### Step 1: Upload Blob

```
POST https://bsky.social/xrpc/com.atproto.repo.uploadBlob
Authorization: Bearer {accessJwt}
Content-Type: image/jpeg

[raw image bytes]
```

**Response:**
```json
{
  "blob": {
    "$type": "blob",
    "ref": {
      "$link": "bafkrei..."
    },
    "mimeType": "image/jpeg",
    "size": 456789
  }
}
```

#### Step 2: Create Post with Image Embed

```json
{
  "repo": "did:plc:abc123...",
  "collection": "app.bsky.feed.post",
  "record": {
    "$type": "app.bsky.feed.post",
    "text": "Check out this image",
    "createdAt": "2026-05-11T12:00:00.000Z",
    "embed": {
      "$type": "app.bsky.embed.images",
      "images": [
        {
          "alt": "Description of the image (required for accessibility)",
          "image": {
            "$type": "blob",
            "ref": {"$link": "bafkrei..."},
            "mimeType": "image/jpeg",
            "size": 456789
          },
          "aspectRatio": {
            "width": 1200,
            "height": 630
          }
        }
      ]
    }
  }
}
```

**Up to 4 images per post.**

#### Website Card (Link Preview)

Bluesky does NOT auto-generate link previews. You must fetch OG metadata yourself and attach it:

```json
{
  "embed": {
    "$type": "app.bsky.embed.external",
    "external": {
      "uri": "https://example.com/article",
      "title": "Article Title (from og:title)",
      "description": "Article description (from og:description)",
      "thumb": {
        "$type": "blob",
        "ref": {"$link": "bafkrei..."},
        "mimeType": "image/jpeg",
        "size": 123456
      }
    }
  }
}
```

#### Quote Post

```json
{
  "embed": {
    "$type": "app.bsky.embed.record",
    "record": {
      "uri": "at://did:plc:.../app.bsky.feed.post/...",
      "cid": "bafyrei..."
    }
  }
}
```

#### Reply

```json
{
  "reply": {
    "root": {
      "uri": "at://did:plc:.../app.bsky.feed.post/...",
      "cid": "bafyrei..."
    },
    "parent": {
      "uri": "at://did:plc:.../app.bsky.feed.post/...",
      "cid": "bafyrei..."
    }
  }
}
```

---

### 3.5 Bluesky Content Limits

| Content Type | Limit |
|-------------|-------|
| Text | 300 graphemes / 3,000 bytes UTF-8 |
| Images per post | 4 max |
| Image file size | 1 MB (1,000,000 bytes) each |
| Image formats | JPEG, PNG, WebP |
| Image alt text | 1,000 graphemes max |
| Videos per post | 1 max |
| Video file size | 100 MB max |
| Video duration | 3 minutes max |
| Video format | MP4 only |
| Video daily limit | 25 videos or 10 GB total per day |
| GIFs | Display as static image only |

**Emoji counting:** Emojis count as 1 grapheme but may consume 4+ bytes, so you can hit the 3,000-byte limit before 300 graphemes with emoji-heavy posts.

---

### 3.6 Bluesky Rate Limits

**Content Write Operations (per account, points-based):**
| Metric | Limit |
|--------|-------|
| Hourly points | 5,000 |
| Daily points | 35,000 |

**Point costs:**
| Action | Points |
|--------|--------|
| Create (post, like, follow, repost) | 3 |
| Update | 2 |
| Delete | 1 |

Derived limits: ~1,666 creations/hour, ~11,666 creations/day

**HTTP API Limits:**
| Scope | Limit |
|-------|-------|
| General API requests (per IP) | 3,000 per 5 minutes |
| Session creation (per account) | 30 per 5 min, 300 per day |
| Handle updates | 10 per 5 min, 50 per day |
| Blob uploads | Max 50 MB per file |
| Account creation (per IP) | 100 per 5 min |

---

### 3.7 Bluesky Error Response Format

**Standard XRPC error response:**
```json
{
  "error": "InvalidRequest",
  "message": "Record/text must be less than 300 graphemes"
}
```

**Error types:**
| Error | HTTP Status | Meaning |
|-------|-------------|---------|
| `InvalidRequest` | 400 | Bad parameters |
| `AuthMissing` | 401 | No auth header |
| `InvalidToken` | 401 | Malformed token |
| `ExpiredToken` | 401 | Token expired -- refresh session |
| `AccountTakedown` | 403 | Account suspended |
| `RateLimitExceeded` | 429 | Too many requests |
| `InternalServerError` | 500 | Server error |
| `MethodNotImplemented` | 501 | Endpoint not available |
| `UpstreamFailure` | 502 | Backend error |

HTTP 429 responses include rate limit info in response headers.

---

### 3.8 Bluesky Gotchas

- **No link preview generation** -- you must fetch OG metadata and upload thumbnail yourself
- **Posts are immutable** -- cannot edit, must delete and recreate
- **No native scheduling** -- must implement your own scheduler
- **Byte indices for facets** -- NOT character indices; emoji/Unicode must be byte-counted
- **Image EXIF stripping** -- strip EXIF metadata before upload (privacy)
- **GIFs are static** -- animated GIFs display as first frame only
- **Cannot mix images and video** in a single post
- **Video requires email verification** on the account
- **App passwords recommended** over main password for API access
- **Self-hosted PDS:** If posting to a non-bsky.social PDS, replace `bsky.social` in URLs with the PDS hostname

---

## 4. CROSS-PLATFORM COMPARISON MATRIX

| Feature | Facebook Pages | Instagram | Threads | Reddit | Bluesky |
|---------|---------------|-----------|---------|--------|---------|
| **API Version** | Graph API v25.0 | Graph API v25.0 | v1.0 | v1 (OAuth) | XRPC |
| **Auth** | Page Token (never-expire) | Page/IG Token | Threads Token (60d) | OAuth2 refresh (permanent) | App Password / JWT |
| **Post Text Limit** | 63,206 chars | 2,200 chars | 500 chars | 40,000 chars (self) / 300 title | 300 graphemes |
| **Image Upload** | Direct or URL | URL only | URL only | S3 presigned | Direct blob |
| **Video Upload** | Direct or URL | URL only | URL only | S3 presigned | Direct blob |
| **Max Images** | 1 per photo post | 10 (carousel) | 20 (carousel) | 20 (gallery) | 4 |
| **Scheduling** | Native (`scheduled_publish_time`) | No | No | No | No |
| **Edit Posts** | Yes | Limited | No | Yes (text only) | No (delete/recreate) |
| **Rate Limit** | 4800 x engaged users / 24h | 50 / 24h | 250 / 24h | 60 req/min | 5000 pts/hr |
| **Publish Flow** | Single POST | 2-step container | 2-step container | POST (text/link) or 3-step (media) | Single POST |
| **Link Preview** | Auto | N/A (no links in posts) | Auto | Auto | Manual (must build) |
| **Webhook** | X-Hub-Signature-256 | X-Hub-Signature-256 | X-Hub-Signature-256 | N/A | Firehose/Jetstream |

---

## 5. OFFICIAL SDK / LIBRARY REFERENCES

| Platform | SDK | Package |
|----------|-----|---------|
| Meta (all) | Facebook SDK | `facebook-nodejs-business-sdk` (npm) |
| Reddit | PRAW (Python) | `praw` (pip) |
| Reddit | snoowrap (JS) | `snoowrap` (npm) |
| Bluesky | AT Protocol SDK | `@atproto/api` (npm) |
| Bluesky | AT Protocol SDK | `atproto` (pip) |

---

*Research completed May 2026. API versions and rate limits are subject to change -- always verify against official documentation.*
