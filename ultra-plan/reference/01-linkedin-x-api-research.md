# LinkedIn & X/Twitter Publishing API Research -- Production Reference (May 2026)

---

## PART 1: LINKEDIN API

### 1.1 Post Creation Endpoint

**Base URL:** `POST https://api.linkedin.com/rest/posts`

**Required Headers (every request):**
```
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json
X-Restli-Protocol-Version: 2.0.0
Linkedin-Version: {YYYYMM}        # e.g. 202604
```

**Versioning:** LinkedIn uses monthly releases (YYYYMM format). Each version is supported for 1 year before sunset. As of May 2026, use `202604` or later. Version `202504` has already been sunset. You MUST pass the `Linkedin-Version` header -- LinkedIn does not default to latest.

#### Text-Only Post
```json
{
  "author": "urn:li:person:{personId}",
  "commentary": "Your post text here (max 3,000 chars)",
  "visibility": "PUBLIC",
  "distribution": {
    "feedDistribution": "MAIN_FEED",
    "targetEntities": [],
    "thirdPartyDistributionChannels": []
  },
  "lifecycleState": "PUBLISHED",
  "isReshareDisabledByAuthor": false
}
```

For organization posts, use `"author": "urn:li:organization:{orgId}"`.

#### Post with Single Image
```json
{
  "author": "urn:li:organization:5515715",
  "commentary": "Post with image",
  "visibility": "PUBLIC",
  "distribution": {
    "feedDistribution": "MAIN_FEED",
    "targetEntities": [],
    "thirdPartyDistributionChannels": []
  },
  "content": {
    "media": {
      "altText": "Alt text for accessibility (max 4,086 chars)",
      "id": "urn:li:image:C5610AQFj6TdYowm17w"
    }
  },
  "lifecycleState": "PUBLISHED",
  "isReshareDisabledByAuthor": false
}
```

#### Post with Video
```json
{
  "content": {
    "media": {
      "title": "Video title",
      "id": "urn:li:video:C5F10AQGKQg_6y2a4sQ"
    }
  }
}
```

#### Post with Document (PDF Carousel)
```json
{
  "content": {
    "media": {
      "title": "Document.pdf",
      "id": "urn:li:document:D5510AQFx87994pYx0Q"
    }
  }
}
```

#### Post with Article
```json
{
  "content": {
    "article": {
      "source": "https://example.com/article",
      "thumbnail": "urn:li:image:C49klciosC89",
      "title": "Article Title (max 400 chars)",
      "description": "Article description"
    }
  }
}
```

#### Mentions and Hashtags (in commentary field)
- Mention org: `"Hello @[Devtestco](urn:li:organization:2414183)"`
- Hashtag: `"Follow best practices #coding"`
- Mention matching is case-sensitive and must match the entity name exactly (orgs) or at least one name (persons).

#### Response
- **Success:** `201 Created`
- Post ID returned in `x-restli-id` response header: `urn:li:share:{id}` or `urn:li:ugcPost:{id}`
- No JSON body in response.

### 1.2 Supported Content Types

| Content Type | Organic | Sponsored |
|---|---|---|
| Text only | Yes | Yes |
| Single Image | Yes | Yes |
| Video | Yes | Yes |
| Document (PDF) | Yes | Yes |
| Article | Yes | Yes |
| MultiImage | Yes | No |
| Poll | Yes | No |
| Carousel | No | Yes (ads only) |
| Celebration | Yes | No |

### 1.3 OAuth 2.0 Scopes

| Scope | Purpose |
|---|---|
| `w_member_social` | Post, comment, like on behalf of a person |
| `r_member_social` | Read posts/comments for a person (**restricted -- approved apps only**) |
| `w_organization_social` | Post, comment, like on behalf of an org (requires ADMIN/DSC/CONTENT_ADMIN role) |
| `r_organization_social` | Read org posts (requires ADMIN/DSC/CONTENT_ADMIN role) |
| `rw_ads` | Create ads and creatives |
| `rw_organization_admin` | Manage org pages, needed for webhook subscriptions |

These scopes are CURRENT as of May 2026. The `w_member_social` / `w_organization_social` names have not changed.

**Gotcha:** Your app must have the "Share on LinkedIn" and "Sign In with LinkedIn using OpenID Connect" products enabled in the Developer Portal.

### 1.4 OAuth Flow

**Authorization URL:** `GET https://www.linkedin.com/oauth/v2/authorization`
- Parameters: `response_type=code`, `client_id`, `redirect_uri`, `state`, `scope`
- Example scope param: `scope=w_member_social%20openid%20profile`

**Token Exchange:** `POST https://www.linkedin.com/oauth/v2/accessToken`
- Content-Type: `application/x-www-form-urlencoded`
- Parameters: `grant_type=authorization_code`, `code`, `client_id`, `client_secret`, `redirect_uri`

**Token Response:**
```json
{
  "access_token": "AQUvlL_DYEzvT2wz...",
  "expires_in": 5184000,
  "refresh_token": "AQWAft_WjYZKwuWX...",
  "refresh_token_expires_in": 525600,
  "scope": "w_member_social"
}
```

### 1.5 Token Lifecycle

| Token | Lifetime | Notes |
|---|---|---|
| Access token | **60 days** (5,184,000 seconds) | ~500 chars, plan for 1,000 |
| Refresh token | **365 days** (525,600 seconds) | Only for approved MDP partners |
| Auth code | **30 minutes** | Must exchange immediately |

**Refresh Endpoint:** `POST https://www.linkedin.com/oauth/v2/accessToken`
```
grant_type=refresh_token
refresh_token={token}
client_id={id}
client_secret={secret}
```

**Critical:** When you refresh, the access token gets a NEW 60-day TTL, but the refresh token TTL does NOT reset -- it keeps counting down from the original 365 days.

### 1.6 Media Upload Flows

#### Image Upload (2 steps)

**Step 1 -- Initialize:**
```
POST https://api.linkedin.com/rest/images?action=initializeUpload
```
```json
{
  "initializeUploadRequest": {
    "owner": "urn:li:person:{id}"
  }
}
```
**Response:**
```json
{
  "value": {
    "uploadUrlExpiresAt": 1650567510704,
    "uploadUrl": "https://www.linkedin.com/dms-uploads/...",
    "image": "urn:li:image:C4E10AQFoyyAjHPMQuQ"
  }
}
```

**Step 2 -- Upload binary:**
```
PUT {uploadUrl}
Content-Type: application/octet-stream
Body: <raw binary image data>
```

**Specs:** JPG, PNG, GIF (up to 250 frames). Max pixels: 36,152,320.

#### Video Upload (4 steps)

**Step 1 -- Initialize:**
```
POST https://api.linkedin.com/rest/videos?action=initializeUpload
```
```json
{
  "initializeUploadRequest": {
    "owner": "urn:li:organization:{id}",
    "fileSizeBytes": 10557360,
    "uploadCaptions": false,
    "uploadThumbnail": false
  }
}
```
**Response** includes `uploadInstructions` array with byte ranges and upload URLs.

**Step 2 -- Split file into 4MB chunks** (`split -b 4194303`)

**Step 3 -- Upload each chunk** to its respective `uploadUrl` via PUT. Save the `ETag` from each response header.

**Step 4 -- Finalize:**
```
POST https://api.linkedin.com/rest/videos?action=finalizeUpload
```
```json
{
  "finalizeUploadRequest": {
    "video": "urn:li:video:C5505AQH...",
    "uploadToken": "",
    "uploadedPartIds": ["etag1", "etag2", "etag3"]
  }
}
```

**Specs:** MP4 only. 3 seconds to 30 minutes. 75KB to 500MB (5GB max via API field, but 500MB practical).

#### Document Upload (2 steps)

**Step 1 -- Initialize:**
```
POST https://api.linkedin.com/rest/documents?action=initializeUpload
```
```json
{
  "initializeUploadRequest": {
    "owner": "urn:li:organization:{id}"
  }
}
```

**Step 2 -- Upload binary** to the returned `uploadUrl`.

**Specs:** PDF, PPT, PPTX, DOC, DOCX. Max 100MB, max 300 pages.

### 1.7 Rate Limits

- **Application-level:** 100,000 API calls/day (default, varies by endpoint)
- **Member-level:** Varies per endpoint; typically ~100 calls/day for posting operations
- Rate limits reset at **midnight UTC** daily
- LinkedIn emails developer admins when app exceeds **75%** of quota (1-2 hour delay)
- Standard rate limits are NOT published in docs -- check your app's **Analytics tab** in the Developer Portal

**429 Response:**
```json
{
  "status": 429,
  "message": "TOO_MANY_REQUESTS"
}
```
No `Retry-After` header is documented. LinkedIn recommends exponential backoff.

### 1.8 Character Limits

| Field | Limit |
|---|---|
| Post commentary | **3,000 characters** |
| Article title | 400 characters |
| Alt text (images) | 4,086 characters (120 recommended) |
| Comment | 1,250 characters |
| "See more" truncation | ~210 chars desktop, ~140 chars mobile |

### 1.9 Error Codes

| HTTP Code | Error | Description |
|---|---|---|
| 400 | INVALID_URN_TYPE | Wrong URN type for a field |
| 400 | MISSING_FIELD | Required field missing |
| 400 | FIELD_LENGTH_TOO_LONG | Text exceeds character limit |
| 400 | INVALID_VALUE_FOR_FIELD | Invalid enum value |
| 401 | EMPTY_ACCESS_TOKEN | Missing or invalid token |
| 403 | ACCESS_DENIED | Insufficient permissions/scopes |
| 404 | NOT_FOUND | Post/entity not found |
| 409 | CONFLICT | Write conflict, retry |
| 422 | UNPROCESSABLE_ENTITY | Semantic errors in request |
| 429 | TOO_MANY_REQUESTS | Rate limit exceeded |
| 500 | INTERNAL_SERVER_ERROR | Server error, retry |
| 503 | SERVICE_UNAVAILABLE | Temporary outage, retry |

### 1.10 Webhooks / Engagement Tracking

**Event Subscription endpoint:**
```
PUT https://api.linkedin.com/rest/eventSubscriptions/(developerApplication:urn:li:developerApplication:{appId},user:urn:li:person:{personId},entity:urn:li:organization:{orgId},eventType:ORGANIZATION_SOCIAL_ACTION_NOTIFICATIONS)
```
```json
{
  "webhook": "https://your-server.com/callback"
}
```

**Supported actions:** LIKE, COMMENT, SHARE, SHARE_MENTION, ADMIN_COMMENT, COMMENT_EDIT, COMMENT_DELETE

**Requirements:**
- Webhook must be registered and validated (HMAC-SHA256 via `X-LI-Signature` header)
- `rw_organization_admin` permission required
- Subscriber must be org admin
- Notifications batched (batch size 10)
- Retained for 60 days for pull queries
- Redelivery: every 5 minutes for 8 hours on failure

**Pull Notifications:**
```
GET https://api.linkedin.com/rest/organizationalEntityNotifications?q=criteria&actions=List(COMMENT,SHARE)&organizationalEntity={URL_ENCODED_ORG_URN}
```

### 1.11 Gotchas and Breaking Changes (2026)

1. **Version sunset:** `202504` is already sunset. Each version lives ~12 months. Always migrate proactively.
2. **No URL scraping:** Article posts do NOT auto-scrape URLs. You must provide thumbnail, title, description explicitly.
3. **No organic carousels via API:** Carousels (multi-card swipe) are sponsored-only. For organic, use MultiImage or Document (PDF carousel).
4. **w_member_social is write-only for Images:** Tokens with only `w_member_social` cannot GET images via versioned gateway. Use legacy calls or add `r_member_social`.
5. **Webhook validation required:** As of March 16, 2026, webhook validation is required for all new lead notifications.
6. **URN encoding:** All URNs in URL params must be URL-encoded (`urn:li:person:123` -> `urn%3Ali%3Aperson%3A123`).

---

## PART 2: X (TWITTER) API

### 2.1 Post Creation Endpoint

**Endpoint:** `POST https://api.x.com/2/tweets`

**Note on naming:** The endpoint path is `/2/tweets` but X documentation sometimes calls them "posts". In the API, the field is still `text`.

**Required Headers:**
```
Authorization: Bearer {USER_ACCESS_TOKEN}  (OAuth 2.0 user context)
Content-Type: application/json
```

#### Text-Only Post
```json
{
  "text": "Hello world!"
}
```

#### Post with Media
```json
{
  "text": "Check this out!",
  "media": {
    "media_ids": ["1880028106020515840"],
    "tagged_user_ids": ["123456789"]
  }
}
```

#### Reply (Thread Creation)
```json
{
  "text": "This is a reply in a thread",
  "reply": {
    "in_reply_to_tweet_id": "1880028106020515840"
  }
}
```

#### Post with Poll
```json
{
  "text": "What do you prefer?",
  "poll": {
    "options": ["Option A", "Option B", "Option C"],
    "duration_minutes": 1440
  }
}
```

#### Full Request Body Schema
| Field | Type | Description |
|---|---|---|
| `text` | string | The text content (required) |
| `reply` | object | `{ "in_reply_to_tweet_id": "..." }` |
| `quote_tweet_id` | string | Tweet ID to quote (**Enterprise only**) |
| `media` | object | `{ "media_ids": [...], "tagged_user_ids": [...] }` |
| `poll` | object | `{ "options": [...], "duration_minutes": int }` |
| `geo` | object | `{ "place_id": "..." }` |
| `for_super_followers_only` | boolean | Restrict to super followers |
| `reply_settings` | string | "mentionedUsers" or "following" |
| `community_id` | string | Post to a community |
| `card_uri` | string | Card URI |
| `direct_message_deep_link` | string | DM deep link |

#### Response
```json
{
  "data": {
    "id": "1880028106020515840",
    "text": "Hello world!",
    "edit_history_tweet_ids": ["1880028106020515840"]
  }
}
```

### 2.2 Thread Creation

There is NO dedicated thread endpoint. You chain replies manually:

1. Create first tweet -> get `id` from response
2. Create second tweet with `reply.in_reply_to_tweet_id` = first tweet's `id`
3. Create third tweet with `reply.in_reply_to_tweet_id` = second tweet's `id`
4. Continue chaining

All tweets in a thread share the same `conversation_id` (equal to the first tweet's ID).

### 2.3 OAuth 2.0 PKCE Flow

**Authorization URL:**
```
GET https://x.com/i/oauth2/authorize?
  response_type=code&
  client_id={CLIENT_ID}&
  redirect_uri={REDIRECT_URI}&
  scope=tweet.read%20tweet.write%20users.read%20offline.access%20media.write&
  state={RANDOM_STRING}&
  code_challenge={BASE64URL_SHA256_OF_VERIFIER}&
  code_challenge_method=S256
```

**Token Exchange:**
```
POST https://api.x.com/2/oauth2/token
Content-Type: application/x-www-form-urlencoded

code={AUTH_CODE}&
grant_type=authorization_code&
client_id={CLIENT_ID}&
redirect_uri={REDIRECT_URI}&
code_verifier={PKCE_CODE_VERIFIER}
```

**Available Scopes:**
| Scope | Permission |
|---|---|
| `tweet.read` | Read tweets |
| `tweet.write` | Create and delete tweets |
| `users.read` | Read user profiles |
| `offline.access` | Get refresh token (required for long-lived access) |
| `media.write` | Upload media |
| `like.read` / `like.write` | Read/write likes |
| `bookmark.read` / `bookmark.write` | Read/write bookmarks |
| `list.read` / `list.write` | Read/write lists |
| `follows.read` / `follows.write` | Read/write follows |
| `space.read` | Read Spaces |
| `dm.read` / `dm.write` | Read/write DMs |

### 2.4 Token Lifecycle

| Token | Lifetime | Notes |
|---|---|---|
| Access token | **2 hours** | Unless `offline.access` scope is used |
| Refresh token | **No documented expiry** | Issued only with `offline.access` scope |
| Auth code | **30 seconds** | Extremely short -- exchange immediately |

**Refresh Endpoint:** `POST https://api.x.com/2/oauth2/token`
```
grant_type=refresh_token&
refresh_token={TOKEN}&
client_id={CLIENT_ID}
```

### 2.5 Pricing (As of April 2026)

**Pay-Per-Use (Default for new developers since Feb 6, 2026):**

| Operation | Price |
|---|---|
| Standard post write (text/media, no URL) | **$0.015/post** |
| Post write with URL | **$0.20/post** |
| Summoned reply (regardless of URL) | **$0.01/post** |
| Post read | **$0.005/resource** |
| Owned reads (your own data) | **$0.001/resource** (since April 20, 2026) |
| User profile read | **$0.01/resource** |
| DM event read | **$0.01/resource** |
| DM interaction write | **$0.015/request** |
| User interaction write (follow/like/retweet) | **$0.015/request** |

- Monthly read cap: 2 million posts
- 24-hour deduplication: same resource fetched multiple times = 1 charge
- Credits purchased upfront in Developer Console
- No free tier for new signups

**Legacy Tiers (existing subscribers only):**

| Tier | Cost | Write Limit | Read Limit |
|---|---|---|---|
| Free | $0 | ~500 posts/month | Effectively none |
| Basic | $200/month | ~50,000/month | ~10,000-15,000/month |
| Pro | $5,000/month | ~300,000/month | 1,000,000/month |
| Enterprise | $42,000+/month | Custom | 50,000,000+/month |

**xAI Credit Rebates (Pay-Per-Use):**
- <$200 spend: 0%
- $200+: 10% back
- $500+: 15% back
- $1,000+: 20% back

### 2.6 Media Upload (v2)

**Simple Upload (images):**
```
POST https://api.x.com/2/media/upload
Content-Type: multipart/form-data
Authorization: Bearer {USER_TOKEN}

command=INIT
media_type=image/jpeg
total_bytes=12345
media_category=tweet_image
```

**Chunked Upload (videos, large files):**

**Step 1 -- INIT:**
```
POST https://api.x.com/2/media/upload
command=INIT&media_type=video/mp4&total_bytes=5000000&media_category=tweet_video
```
Response:
```json
{
  "data": {
    "id": "1880028106020515840",
    "media_key": "13_1880028106020515840",
    "expires_after_secs": 1295999
  }
}
```

**Step 2 -- APPEND (per chunk):**
```
POST https://api.x.com/2/media/upload
command=APPEND&media_id=1880028106020515840&segment_index=0
+ binary chunk as multipart
```

**Step 3 -- FINALIZE:**
```
POST https://api.x.com/2/media/upload
command=FINALIZE&media_id=1880028106020515840
```
Response:
```json
{
  "data": {
    "id": "1880028106020515840",
    "media_key": "13_1880028106020515840",
    "size": 1048576,
    "expires_after_secs": 86400,
    "processing_info": {
      "state": "pending",
      "check_after_secs": 1
    }
  }
}
```

**Step 4 -- STATUS (poll for processing):**
```
GET https://api.x.com/2/media/upload?command=STATUS&media_id=1880028106020515840
```
Processing states: `pending` -> `in_progress` -> `succeeded` | `failed`

**Media Categories:** `tweet_image`, `tweet_gif`, `tweet_video`, `amplify_video`

**v2 Chunked Sub-endpoints (alternative):**
- `POST /2/media/upload/initialize`
- `POST /2/media/upload/{id}/append`
- `POST /2/media/upload/{id}/finalize`

### 2.7 Rate Limits

**Per-Endpoint Limits:**

| Endpoint | Per App (24h) | Per User (15min) |
|---|---|---|
| `POST /2/tweets` | 10,000 | 100 |
| `GET /2/tweets` (lookup) | 3,500/15min | 5,000/15min |
| `GET /2/tweets/:id` | 450/15min | 900/15min |
| `GET /2/tweets/search/recent` | 450/15min | 300/15min |
| `POST /2/media/upload` (standard) | 50,000/24h | 500/15min |
| `/2/media/upload` (init/append/finalize) | 180,000/24h | 1,875/15min |
| `/2/media/upload` (Free tier init/finalize) | 17/24h | -- |
| `/2/media/upload` (Free tier append) | 85/24h | -- |

**Rate Limit Headers:**
```
x-rate-limit-limit: 100        # max requests in window
x-rate-limit-remaining: 95     # remaining in window
x-rate-limit-reset: 1620000000 # Unix timestamp when window resets
```

### 2.8 Error Response Format

**429 Rate Limit:**
```json
{
  "title": "Too Many Requests",
  "detail": "Too Many Requests",
  "type": "about:blank",
  "status": 429
}
```

**General Error (v2 format):**
```json
{
  "errors": [
    {
      "code": 88,
      "message": "Rate limit exceeded"
    }
  ]
}
```

**Common Error Codes:**
| Code | Meaning |
|---|---|
| 32 | Could not authenticate |
| 34 | Page does not exist |
| 63 | User suspended |
| 87 | Client not permitted to perform action |
| 88 | Rate limit exceeded |
| 89 | Invalid or expired token |
| 131 | Internal error |
| 187 | Status is a duplicate |
| 186 | Tweet too long |
| 326 | Account locked |
| 403 | Forbidden (insufficient permissions/scopes) |

### 2.9 Character Limits

| Feature | Limit |
|---|---|
| Standard tweet | **280 characters** |
| X Premium tweet | **25,000 characters** |
| URLs | Always count as **23 characters** regardless of actual length |
| Standard emojis | 2 characters each |
| Complex emojis (with modifiers) | Can count as more |

**API behavior:** Character validation happens at submission time. If the authenticated user has X Premium, the 25,000 limit applies.

### 2.10 Gotchas and Breaking Changes (2026)

1. **No free tier for new devs:** As of Feb 6, 2026, pay-per-use is the only option for new developer accounts. Legacy Free/Basic/Pro tiers are grandfathered only.
2. **URL posts cost 13x more:** $0.20 vs $0.015 for posts with URLs. Budget impact is massive for link-heavy posting.
3. **Quote-posting requires Enterprise:** Cannot quote-tweet on self-serve tiers.
4. **Follows/Likes/Quote-Posts removed from API writes** for all self-serve tiers.
5. **Auth code expires in 30 SECONDS:** Not minutes -- seconds. Exchange immediately.
6. **Access token is only 2 hours:** Must use `offline.access` scope and refresh tokens for any production app.
7. **Media upload still uses multipart/form-data:** Not JSON. The upload endpoints are the exception to the v2 JSON convention.
8. **Pricing volatility:** X changed pricing twice in early 2026 (Feb and April). Build billing alerts into your system.
9. **Legacy v1.1 media upload deprecation:** `upload.twitter.com/1.1/media/upload.json` is being deprecated. Migrate to `/2/media/upload`.

---

## PART 3: COMPARISON TABLE

| Feature | LinkedIn | X/Twitter |
|---|---|---|
| Post endpoint | `POST /rest/posts` | `POST /2/tweets` |
| Auth | OAuth 2.0 (3-legged) | OAuth 2.0 PKCE |
| Access token TTL | 60 days | 2 hours |
| Refresh token TTL | 365 days (MDP partners) | No documented expiry |
| Post char limit | 3,000 | 280 (25,000 Premium) |
| Image upload | 2-step (initialize + PUT binary) | INIT + APPEND + FINALIZE or simple POST |
| Video upload | 4-step (initialize + chunk PUT + finalize) | INIT + APPEND + FINALIZE |
| Document/PDF | Supported natively | Not supported |
| Thread/carousel | MultiImage or Document post | Reply chaining |
| Rate limit (posts) | ~100/day per member | 10,000/24h per app, 100/15min per user |
| Engagement webhooks | Yes (Organization Social Action) | Not available (must poll) |
| API cost | Free (with approved app) | Pay-per-use ($0.015-$0.20/post) |
| Version management | Monthly YYYYMM headers | v2 (stable) |

---

## Sources

### LinkedIn
- [Posts API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api?view=li-lms-2026-04)
- [Images API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/images-api?view=li-lms-2026-04)
- [Videos API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api?view=li-lms-2026-04)
- [Documents API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/documents-api?view=li-lms-2026-02)
- [OAuth 3-Legged Flow](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow)
- [Programmatic Refresh Tokens](https://learn.microsoft.com/en-us/linkedin/shared/authentication/programmatic-refresh-tokens)
- [Rate Limits](https://learn.microsoft.com/en-us/linkedin/shared/api-guide/concepts/rate-limits)
- [Organization Social Action Notifications](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/organization-social-action-notifications?view=li-lms-2026-04)
- [API Versioning](https://learn.microsoft.com/en-us/linkedin/marketing/versioning?view=li-lms-2026-04)
- [Community Management API](https://developer.linkedin.com/product-catalog/marketing/community-management-api)

### X/Twitter
- [Create Post](https://docs.x.com/x-api/posts/create-post)
- [OAuth 2.0 PKCE](https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code)
- [Pricing](https://docs.x.com/x-api/getting-started/pricing)
- [Rate Limits](https://docs.x.com/x-api/fundamentals/rate-limits)
- [Chunked Media Upload](https://docs.x.com/x-api/media/quickstart/media-upload-chunked)
- [April 2026 Pricing Update](https://devcommunity.x.com/t/x-api-pricing-update-owned-reads-now-0-001-other-changes-effective-april-20-2026/263025)
- [X API Pricing 2026 (Postproxy)](https://postproxy.dev/blog/x-api-pricing-2026/)
- [Conversation ID](https://docs.x.com/x-api/fundamentals/conversation-id)
