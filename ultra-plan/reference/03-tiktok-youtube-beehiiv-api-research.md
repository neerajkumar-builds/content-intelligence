# Publishing API Research: TikTok, YouTube, Beehiiv (2026)

Production-grade reference for Content Intelligence integration.

---

## 1. TikTok Content Posting API

### 1.1 Authentication (OAuth 2.0)

**Authorization URL:**
```
https://www.tiktok.com/v2/auth/authorize/
```

**Token Exchange Endpoint:**
```
POST https://open.tiktokapis.com/v2/oauth/token/
```

**Token Lifecycle:**
| Token Type | Expiry | Notes |
|---|---|---|
| Access Token | 86,400 seconds (24 hours) | Must refresh daily via background job |
| Refresh Token | 31,536,000 seconds (365 days) | After 1 year, creator must re-authorize |

**Token Refresh Request:**
```json
POST https://open.tiktokapis.com/v2/oauth/token/
Content-Type: application/x-www-form-urlencoded

{
  "client_key": "YOUR_CLIENT_KEY",
  "client_secret": "YOUR_CLIENT_SECRET",
  "grant_type": "refresh_token",
  "refresh_token": "REFRESH_TOKEN"
}
```

**Token Refresh Response:**
```json
{
  "data": {
    "access_token": "act.xxx",
    "expires_in": 86400,
    "refresh_token": "rft.xxx",
    "refresh_expires_in": 31536000,
    "open_id": "xxx",
    "scope": "user.info.basic,video.publish",
    "token_type": "Bearer"
  }
}
```

**Required Scopes:**
- `user.info.basic` -- query creator info
- `video.publish` -- direct post and inbox upload
- `video.upload` -- file upload (used with inbox flow)

**GOTCHA:** Access tokens expire every 24 hours. You MUST implement a background cron job to refresh tokens proactively. If both tokens expire, the creator must re-authorize from scratch.

---

### 1.2 Endpoints

#### 1.2.1 Direct Post Video

```
POST https://open.tiktokapis.com/v2/post/publish/video/init/
Authorization: Bearer {access_token}
Content-Type: application/json; charset=UTF-8
```

**Request Body (FILE_UPLOAD):**
```json
{
  "post_info": {
    "title": "Your caption with #hashtags @mentions",
    "privacy_level": "PUBLIC_TO_EVERYONE",
    "disable_duet": false,
    "disable_comment": false,
    "disable_stitch": false,
    "video_cover_timestamp_ms": 1000,
    "brand_content_toggle": false,
    "brand_organic_toggle": false,
    "is_aigc": false
  },
  "source_info": {
    "source": "FILE_UPLOAD",
    "video_size": 50000123,
    "chunk_size": 10000000,
    "total_chunk_count": 5
  }
}
```

**Request Body (PULL_FROM_URL):**
```json
{
  "post_info": {
    "title": "Your caption with #hashtags",
    "privacy_level": "PUBLIC_TO_EVERYONE",
    "disable_duet": false,
    "disable_comment": false,
    "disable_stitch": false,
    "video_cover_timestamp_ms": 1000
  },
  "source_info": {
    "source": "PULL_FROM_URL",
    "video_url": "https://your-cdn.com/video.mp4"
  }
}
```

**Response (Success):**
```json
{
  "data": {
    "publish_id": "v_pub_xxx",
    "upload_url": "https://open-upload.tiktokapis.com/video/?upload_id=xxx&upload_token=xxx"
  },
  "error": {
    "code": "ok",
    "message": "",
    "log_id": "xxx"
  }
}
```

#### 1.2.2 Upload Video Chunks (FILE_UPLOAD only)

```
PUT {upload_url}
Content-Type: video/mp4
Content-Range: bytes {start}-{end}/{total}
```

**Chunk Rules:**
- Minimum chunk size: 5 MB
- Maximum chunk size: 64 MB
- Final chunk can be up to 128 MB (to accommodate trailing bytes)
- Videos under 5 MB: upload as single chunk (chunk_size = total size)
- Videos over 64 MB: MUST use multiple chunks
- Chunks must be sequential (no parallel uploads)
- If a chunk fails, retry that specific chunk (no cross-session resume)

#### 1.2.3 Upload to Inbox (Drafts)

```
POST https://open.tiktokapis.com/v2/post/publish/inbox/video/init/
Authorization: Bearer {access_token}
Content-Type: application/json; charset=UTF-8
```

**Request Body:**
```json
{
  "source_info": {
    "source": "FILE_UPLOAD",
    "video_size": 50000123,
    "chunk_size": 10000000,
    "total_chunk_count": 5
  }
}
```

Note: Inbox uploads do NOT include `post_info` -- the creator sets caption, privacy, etc. when they publish from their TikTok app.

#### 1.2.4 Photo/Carousel Post

```
POST https://open.tiktokapis.com/v2/post/publish/content/init/
Authorization: Bearer {access_token}
Content-Type: application/json; charset=UTF-8
```

**Key Details:**
- Supports up to 35 photos per carousel
- Same `video.publish` scope required
- Title/description parameters supported
- Cannot mix photos, GIFs, and videos in one carousel
- Music auto-add, privacy, and engagement options supported

#### 1.2.5 Check Publish Status

```
POST https://open.tiktokapis.com/v2/post/publish/status/fetch/
Authorization: Bearer {access_token}
Content-Type: application/json; charset=UTF-8

{
  "publish_id": "v_pub_xxx"
}
```

**Status Values:** `PROCESSING` -> `PUBLISH_COMPLETE` | `FAILED`

#### 1.2.6 Query Creator Info

```
POST https://open.tiktokapis.com/v2/post/publish/creator_info/query/
Authorization: Bearer {access_token}
```

Use this before publishing to check what privacy levels and features the creator's account supports.

---

### 1.3 Privacy Levels

| Value | Description | Audited Required? |
|---|---|---|
| `PUBLIC_TO_EVERYONE` | Visible to all | Yes (audited apps only) |
| `MUTUAL_FOLLOW_FRIENDS` | Visible to mutual followers | Yes (audited apps only) |
| `FOLLOWER_OF_CREATOR` | Visible to followers | Yes (audited apps only) |
| `SELF_ONLY` | Private / only creator | No (unaudited apps can use this) |

**CRITICAL:** Unaudited API clients can ONLY post with `SELF_ONLY` privacy. All other levels require the app to pass TikTok's audit review.

---

### 1.4 Content Disclosure Fields

| Field | Type | Description |
|---|---|---|
| `brand_content_toggle` | boolean | Set `true` if promoting ANOTHER brand/third party. Adds "Paid partnership" label. |
| `brand_organic_toggle` | boolean | Set `true` if promoting YOUR OWN brand/business. Classified as Brand Organic. |
| `is_aigc` | boolean | Set `true` if content is AI-generated. TikTok may auto-detect and label anyway. |

**Rules:**
- At least one toggle must be `true` if content disclosure is enabled
- If `branded_content_toggle` is true, `SELF_ONLY` privacy is DISABLED
- As of Sep 2025, commercial content disclosure is mandatory with enforcement
- TikTok may auto-apply "AI-generated" label even if `is_aigc` is not set

---

### 1.5 Rate Limits

| Limit Type | Value | Notes |
|---|---|---|
| API requests per user token | 6 requests/minute | Per access_token, enforced per-endpoint |
| Publishing cap (per creator/day) | ~15 posts/day | Both audited and unaudited |
| Pending uploads | 5 per 24 hours | `spam_risk_too_many_pending_share` if exceeded |
| Daily active user cap | Varies by app | `reached_active_user_cap` if exceeded |

**Rate Limit Headers:**
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

**429 Response:** Returns `retry-after` header.

---

### 1.6 Media Requirements

| Property | Video | Photos |
|---|---|---|
| Formats | MP4 (H.264), WebM | JPEG, PNG |
| Max file size | 4 GB (prod) / 128 MB (sandbox) | -- |
| Duration | 3 sec - 10 min (60 min for established accounts) | N/A |
| Resolution | Min 720p, recommended 1080x1920 (9:16) | -- |
| Frame rate | 23-60 FPS | N/A |
| Audio | AAC stereo, 44.1 kHz or 48 kHz | N/A |
| Bitrate | 2-8 Mbps for 1080p | N/A |
| Caption | Max 2,200 characters | Max 2,200 characters |
| Hashtags | Max 30 per post | Max 30 per post |
| Carousel images | N/A | Up to 35 |

---

### 1.7 Error Codes (Complete)

**Authentication:**
| Error | Description |
|---|---|
| `access_token_invalid` | Token expired or revoked. Refresh or re-auth. |
| `scope_not_authorized` | Missing required permission scope. |
| `scope_permission_missed` | Additional permissions needed. |

**Spam Detection:**
| Error | Description |
|---|---|
| `spam_risk_user_banned_from_posting` | Account restricted from posting. |
| `spam_risk_text` | Caption flagged as spam. |
| `spam_risk_too_many_posts` | Daily posting limit exceeded. Wait 24h. |
| `spam_risk_too_many_pending_share` | Max 5 pending uploads per 24h. |
| `spam_risk` | Generic spam trigger. |
| `reached_active_user_cap` | Daily active user quota exhausted. |

**Video Format:**
| Error | Description |
|---|---|
| `file_format_check_failed` | Unsupported format. Use MP4 or WebM. |
| `duration_check_failed` | Duration must be 3s - 10min. |
| `frame_rate_check_failed` | Frame rate unsupported (need 23-60 fps). |
| `picture_size_check_failed` | Resolution too low (min 720p). |
| `file size` | File exceeds size limit. |

**Media Transfer:**
| Error | Description |
|---|---|
| `video_pull_failed` | Cannot download video from URL. |
| `photo_pull_failed` | Cannot download image from URL. |
| `invalid_file_upload` | File format or specs unmet. |

**Rate / App Status:**
| Error | Description |
|---|---|
| `rate_limit_exceeded` | Too many API requests. Backoff. |
| `unaudited_client_can_only_post_to_private_accounts` | Unaudited app -- submit for review. |
| `url_ownership_unverified` | Domain ownership verification required. |
| `privacy_level_option_mismatch` | Privacy setting incompatible with app capabilities. |

**Server:**
| Error | Description |
|---|---|
| `internal` | TikTok server error. Retry later. |
| `invalid_params` | Request parameters malformed. |

**Error Response Format:**
```json
{
  "error": {
    "code": "spam_risk_too_many_posts",
    "message": "The user has exceeded the daily posting limit.",
    "log_id": "20240101xxxxx"
  }
}
```

---

### 1.8 Direct Post vs Inbox -- Decision Matrix

| Feature | Direct Post | Inbox Upload |
|---|---|---|
| Endpoint | `/v2/post/publish/video/init/` | `/v2/post/publish/inbox/video/init/` |
| Goes live immediately? | Yes | No -- goes to creator's drafts |
| Caption set by API? | Yes (in `post_info`) | No -- creator sets in TikTok app |
| Privacy set by API? | Yes | No |
| Requires audit? | Yes (for non-SELF_ONLY) | No |
| Creator notification | None | Push notification in TikTok inbox |
| Use case | Automated publishing | Review-before-publish workflow |

---

### 1.9 Key Gotchas

1. **Unaudited = private only.** Your app MUST pass TikTok's audit to post publicly. Until then, all posts are `SELF_ONLY`.
2. **No scheduling.** TikTok API has no native scheduling -- you must implement this yourself.
3. **No post-publish editing.** Once posted, you cannot edit caption/privacy via API.
4. **No text-only posts.** Every post must include video or photos.
5. **Token refresh is critical.** Access tokens expire every 24h. Miss a refresh and your automation breaks.
6. **PULL_FROM_URL requires verified domain.** You must verify URL ownership in TikTok developer portal.
7. **Chunk uploads are sequential.** No parallel chunk uploads supported.
8. **Photo carousels cannot mix media types.** Photos only -- no GIFs or videos mixed in.

---

## 2. YouTube Data API v3

### 2.1 Authentication (OAuth 2.0)

**Authorization Endpoint:**
```
https://accounts.google.com/o/oauth2/v2/auth
```

**Token Exchange:**
```
POST https://oauth2.googleapis.com/token
```

**Token Lifecycle:**
| Token Type | Expiry | Notes |
|---|---|---|
| Access Token | 3,600 seconds (1 hour) | Standard Google OAuth |
| Refresh Token (Testing mode) | 7 days | Apps in Testing mode -- tokens expire weekly |
| Refresh Token (Production mode) | Permanent* | Does not expire unless revoked, password change, or 6-month inactivity |

**CRITICAL:** If your OAuth app is in "Testing" mode (External), refresh tokens expire every 7 days. You MUST publish the app to Production mode for permanent refresh tokens. This is the #1 cause of YouTube API auth failures in production.

**Additional Refresh Token Revocation Triggers:**
- User revokes access in Google Account settings
- User changes Google password
- Token unused for 6 months
- User has exceeded max number of granted refresh tokens (limit: 50 per client/user pair)
- Google Workspace admin policy changes

**Required OAuth Scopes:**
- `https://www.googleapis.com/auth/youtube.upload` -- video upload
- `https://www.googleapis.com/auth/youtube` -- full channel management
- `https://www.googleapis.com/auth/youtube.force-ssl` -- general read/write
- `https://www.googleapis.com/auth/youtubepartner` -- partner content

---

### 2.2 Video Upload (Resumable Upload Protocol)

#### Step 1: Initiate Upload Session

```
POST https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status,recordingDetails
Authorization: Bearer {access_token}
Content-Type: application/json; charset=UTF-8
X-Upload-Content-Length: {total_file_size_bytes}
X-Upload-Content-Type: video/*
```

**Request Body (Video Resource):**
```json
{
  "snippet": {
    "title": "Video Title (max 100 chars)",
    "description": "Video description (max 5000 chars)",
    "tags": ["tag1", "tag2"],
    "categoryId": "22",
    "defaultLanguage": "en"
  },
  "status": {
    "privacyStatus": "public",
    "embeddable": true,
    "license": "youtube",
    "publicStatsViewable": true,
    "publishAt": "2026-06-01T12:00:00Z",
    "selfDeclaredMadeForKids": false,
    "containsSyntheticMedia": false
  },
  "recordingDetails": {
    "recordingDate": "2026-05-11"
  }
}
```

**Privacy Status Values:** `public`, `unlisted`, `private`

**Response:** HTTP 200 with `Location` header containing the upload URI.

#### Step 2: Upload Video File

```
PUT {upload_uri_from_location_header}
Authorization: Bearer {access_token}
Content-Length: {file_size}
Content-Type: video/*

[BINARY VIDEO DATA]
```

**Success Response:** HTTP 201 with Video resource JSON.

#### Step 3: Resume Interrupted Upload

Check status:
```
PUT {upload_uri}
Content-Range: bytes */{total_size}

(empty body)
```

**Response:** HTTP 308 with `Range: bytes=0-{last_byte_received}`

Resume from where it stopped:
```
PUT {upload_uri}
Content-Range: bytes {next_byte}-{last_byte}/{total_size}
Content-Length: {remaining_bytes}

[REMAINING BINARY DATA]
```

#### Chunked Upload Option

- Chunk size MUST be a multiple of 256 KB (except final chunk)
- Same chunk size for all requests except last
- Intermediate chunks return HTTP 308 with Range header
- Final chunk returns HTTP 201 with Video resource

---

### 2.3 Shorts Upload

**There is NO dedicated Shorts API.** Use the same `videos.insert` endpoint.

**A video becomes a Short when ALL conditions are met:**
1. Vertical orientation: 9:16 aspect ratio
2. Duration: 60 seconds or less
3. Include `#Shorts` in title or description (recommended but not strictly required)

YouTube auto-detects Shorts based on aspect ratio and duration. No explicit `is_short` flag exists in the official API, though some third-party wrappers offer a `youtube_shorts=true` parameter.

---

### 2.4 Thumbnail Upload

```
POST https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId={VIDEO_ID}
Authorization: Bearer {access_token}
Content-Type: image/jpeg

[BINARY IMAGE DATA]
```

**Requirements:**
- Max file size: 2 MB
- Accepted MIME types: `image/jpeg`, `image/png`, `application/octet-stream`
- Quota cost: 50 units

**Response:**
```json
{
  "kind": "youtube#thumbnailSetResponse",
  "etag": "xxx",
  "items": [
    {
      "default": { "url": "...", "width": 120, "height": 90 },
      "medium": { "url": "...", "width": 320, "height": 180 },
      "high": { "url": "...", "width": 480, "height": 360 }
    }
  ]
}
```

**GOTCHA:** Custom thumbnails require the channel to be verified (phone verification). Unverified channels cannot upload custom thumbnails.

---

### 2.5 Playlist Management

**Create Playlist:**
```
POST https://www.googleapis.com/youtube/v3/playlists?part=snippet,status
```
Quota cost: 50 units

**Add Video to Playlist:**
```
POST https://www.googleapis.com/youtube/v3/playlistItems?part=snippet
```

**Request Body:**
```json
{
  "snippet": {
    "playlistId": "PLxxxxxxxx",
    "resourceId": {
      "kind": "youtube#video",
      "videoId": "dQw4w9WgXcQ"
    },
    "position": 0
  }
}
```
Quota cost: 50 units

---

### 2.6 Quota System (Complete Cost Table)

**Default daily allocation: 10,000 units** (resets at midnight Pacific Time)

| Resource | Method | Cost (units) |
|---|---|---|
| **videos** | insert (upload) | 100 |
| **videos** | update | 50 |
| **videos** | list | 1 |
| **videos** | delete | 50 |
| **videos** | rate | 50 |
| **videos** | getRating | 1 |
| **search** | list | 100 |
| **thumbnails** | set | 50 |
| **playlists** | insert | 50 |
| **playlists** | list | 1 |
| **playlists** | update | 50 |
| **playlists** | delete | 50 |
| **playlistItems** | insert | 50 |
| **playlistItems** | list | 1 |
| **playlistItems** | update | 50 |
| **playlistItems** | delete | 50 |
| **channels** | list | 1 |
| **channels** | update | 50 |
| **comments** | insert | 50 |
| **comments** | list | 1 |
| **commentThreads** | insert | 50 |
| **commentThreads** | list | 1 |
| **captions** | insert | 400 |
| **captions** | update | 450 |
| **captions** | list | 50 |
| **captions** | delete | 50 |

**Practical budget per day (10,000 units):**
- Upload + thumbnail + playlist add = 100 + 50 + 50 = 200 units per video
- Max ~50 videos/day with this flow
- Upload-only (no thumbnail/playlist): 100 units = ~100 videos/day
- Every request (even invalid ones) costs at least 1 unit

**Quota Extension:** Request additional via Google's quota extension form. Takes 1-6 weeks, requires detailed usage justification.

---

### 2.7 Error Response Format

```json
{
  "error": {
    "code": 403,
    "message": "The request cannot be completed because you have exceeded your quota.",
    "errors": [
      {
        "domain": "youtube.quota",
        "reason": "quotaExceeded",
        "message": "The request cannot be completed because you have exceeded your quota."
      }
    ]
  }
}
```

**Key Video Upload Errors:**
| HTTP | Reason | Description |
|---|---|---|
| 400 | `mediaBodyRequired` | Request missing video content |
| 400 | `uploadLimitExceeded` | User hit upload quota |
| 400 | `invalidTitle` | Empty or invalid title |
| 400 | `invalidDescription` | Description format invalid |
| 400 | `invalidTags` | Tags malformed |
| 400 | `invalidCategoryId` | Unsupported category |
| 403 | `forbidden` | Authorization issue |
| 403 | `forbiddenPrivacySetting` | Privacy setting not allowed |
| 403 | `quotaExceeded` | Daily quota exhausted |
| 404 | `videoNotFound` | Video ID does not exist (thumbnail set) |
| 429 | `uploadRateLimitExceeded` | Too many uploads too fast |

---

### 2.8 Media Requirements

| Property | Long-form | Shorts |
|---|---|---|
| Max file size | 256 GB | 256 GB |
| Accepted MIME | `video/*`, `application/octet-stream` | Same |
| Aspect ratio | 16:9 (recommended) | 9:16 (required) |
| Duration | No hard max (12h for verified) | Max 60 seconds |
| Title | Max 100 characters | Max 100 characters |
| Description | Max 5,000 characters | Max 5,000 characters |

---

### 2.9 Key Gotchas

1. **Testing mode = 7-day refresh tokens.** Publish your OAuth app to Production to get permanent refresh tokens.
2. **Video upload costs 100 units, NOT 1,600.** The 1,600 figure floating around is outdated/incorrect per Google's official quota calculator.
3. **`notifySubscribers` defaults to true.** Set to `false` if you are batch-uploading or uploading unlisted/private videos you will publicize later.
4. **`publishAt` requires `privacyStatus: "private"`.** To schedule a video, set it as private with a `publishAt` datetime. YouTube auto-publishes at that time.
5. **Resumable upload URIs expire.** Start upload ASAP after getting the session URI. If expired, you get 404 and must restart.
6. **Chunks must be multiples of 256 KB.** Non-conforming chunks will fail.
7. **Custom thumbnails require phone-verified channel.**
8. **`containsSyntheticMedia` field.** New field for AI-generated content disclosure. Set to `true` if video contains synthetic/AI media.
9. **Search costs 100 units.** Avoid search.list in production loops -- it drains quota fast.

---

## 3. Beehiiv API v2

### 3.1 Authentication

**Method:** API Key as Bearer Token

**Header:**
```
Authorization: Bearer {api_key}
Content-Type: application/json
```

**Base URL:**
```
https://api.beehiiv.com/v2
```

**API Key Creation:**
- Generated in Beehiiv dashboard under Settings > API
- Keys should be stored server-side only (environment variables)
- Never expose in client-side code

**OAuth Scopes (when using OAuth):**
- `posts:write` -- create/update posts
- `posts:read` -- list/get posts
- `subscriptions:write` -- manage subscribers
- `subscriptions:read` -- list subscribers
- `publications:read` -- list publications
- `segments:read` -- list segments
- `custom_fields:read` -- list custom fields

---

### 3.2 Create Post Endpoint

```
POST https://api.beehiiv.com/v2/publications/{publicationId}/posts
Authorization: Bearer {api_key}
Content-Type: application/json
```

**Request Body (Body Content / HTML approach):**
```json
{
  "title": "Your Newsletter Title",
  "subtitle": "Optional subtitle",
  "body_content": "<h2>Hello</h2><p>Your HTML content here.</p>",
  "status": "confirmed",
  "scheduled_at": "2026-06-01T12:00:00Z",
  "thumbnail_image_url": "https://example.com/image.jpg",
  "content_tags": ["weekly", "digest"],
  "custom_link_tracking_enabled": true,
  "email_capture_type_override": "popup",
  "post_template_id": "tmpl_xxx",
  "recipients": {
    "email": {
      "tier_ids": ["free", "premium"],
      "include_segment_ids": [],
      "exclude_segment_ids": []
    },
    "web": {
      "tier_ids": ["all"]
    }
  },
  "email_settings": {},
  "web_settings": {},
  "seo_settings": {}
}
```

**Request Body (Blocks approach):**
```json
{
  "title": "Your Newsletter Title",
  "status": "confirmed",
  "blocks": [
    {
      "type": "heading",
      "level": 2,
      "text": "Section Title",
      "textAlignment": "left"
    },
    {
      "type": "paragraph",
      "plaintext": "Your paragraph text here."
    },
    {
      "type": "image",
      "imageUrl": "https://example.com/image.jpg",
      "alt_text": "Description",
      "caption": "Image caption",
      "width": 100
    },
    {
      "type": "button",
      "href": "https://example.com",
      "text": "Click Here",
      "alignment": "center",
      "size": "normal"
    },
    {
      "type": "html",
      "html": "<div style='background:#f0f0f0;padding:20px;'>Custom HTML</div>"
    },
    {
      "type": "list",
      "items": ["Item 1", "Item 2", "Item 3"],
      "listType": "unordered"
    }
  ]
}
```

**Available Block Types:**
- `paragraph` -- text content (plaintext string OR formattedText array)
- `heading` -- levels 1-6, optional anchor/TOC support
- `image` -- imageUrl (required), alt_text, caption, alignment, width (1-100)
- `button` -- href + text (required), target, alignment, size (small/normal/large)
- `html` -- raw HTML string
- `table` -- rows (2D array), headerRow, headerColumn
- `list` -- items (array), listType (ordered/unordered), startNumber
- `columns` -- array of nested column blocks
- `embed_link` -- embedded URLs
- `poll` -- interactive polls
- `quote` -- blockquote
- `content_break` -- visual separator
- `paywall_break` -- premium content gate
- `rss` -- RSS feed embed
- `advertisement` -- ad network placement

**All blocks support:**
- `visual_settings` -- styling overrides
- `visibility_settings` -- conditional display rules

---

### 3.3 Status & Scheduling Behavior

| Status Value | `scheduled_at` Set? | Behavior |
|---|---|---|
| `confirmed` | No | Publishes IMMEDIATELY |
| `confirmed` | Yes | Publishes at scheduled time |
| `draft` | N/A | Saved as draft, cannot be scheduled via API |
| (omitted) | N/A | Currently defaults to `confirmed` (will change to `draft` in future release) |

**CRITICAL WARNING:** The default status is currently `confirmed`, meaning if you omit status, the post publishes IMMEDIATELY. Beehiiv has announced this default will change to `draft` in a future release. Always explicitly set `status` in your requests.

---

### 3.4 Response Format

**Success (201 Created):**
```json
{
  "data": {
    "id": "post_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  }
}
```

**Error Response:**
```json
{
  "status": 400,
  "statusText": "Bad Request",
  "errors": [
    {
      "message": "title is required",
      "code": "VALIDATION_ERROR"
    }
  ]
}
```

**Error Codes:**
| HTTP Status | Description |
|---|---|
| 400 | Bad Request -- invalid payload, missing required fields |
| 401 | Unauthorized -- missing or invalid API key |
| 403 | Forbidden -- insufficient permissions/wrong scope |
| 404 | Not Found -- publication or resource doesn't exist |
| 429 | Rate Limit Exceeded -- too many requests |
| 500 | Internal Server Error -- Beehiiv server failure |

---

### 3.5 Rate Limits

| Limit | Value |
|---|---|
| Requests per minute | 180 (per organization) |
| Practical guideline | ~3 requests/second (350ms between requests) |
| Max concurrent requests | ~5 simultaneous |

**Rate Limit Response Headers:**
- `RateLimit-Limit` -- max requests in current period
- `RateLimit-Remaining` -- requests remaining
- `RateLimit-Reset` -- Unix timestamp when period resets

**429 Response:** Implement exponential backoff. Consider using queue services (SQS, QStash, etc.).

---

### 3.6 Content Requirements

**HTML via `body_content`:**
- `<style>` and `<link>` tags are STRIPPED
- Inline `style` attributes are preserved
- CSS classes are not stripped but external stylesheets are not loaded
- HTML must be properly backslash-escaped within JSON
- Content is wrapped in beehiiv's email template structure
- Cannot send 100% custom HTML emails -- beehiiv footer/compliance elements are fixed

**Blocks:**
- More control than HTML but not all UI blocks are API-available yet
- Blocks method supports ad network placements, polls, and other interactive elements
- HTML method (body_content) cannot include polls, buttons, or other interactive blocks

**Content can be expanded in GET responses:**
- `free_web_content` -- web HTML for free readers
- `free_email_content` -- email HTML for free readers
- `premium_web_content` -- web HTML for premium readers
- `premium_email_content` -- email HTML for premium readers

---

### 3.7 Audience Targeting

```json
"recipients": {
  "email": {
    "tier_ids": ["free"],
    "include_segment_ids": ["seg_xxx"],
    "exclude_segment_ids": ["seg_yyy"]
  },
  "web": {
    "tier_ids": ["all"]
  }
}
```

**Tier options:** `free`, `premium`, or `all`
**Segments:** Include/exclude by segment ID for both email and web delivery

---

### 3.8 Plan Access Requirements

| Feature | Launch (Free) | Scale | Max | Enterprise |
|---|---|---|---|---|
| Basic API v2 | Yes | Yes | Yes | Yes |
| Post creation (blocks/HTML) | ? | Yes | Yes | Yes |
| Send API (auto-publish) | No | No | No | Yes (beta) |

**GOTCHA:** The Send API (which powers the Create Post + auto-send workflow) is currently in beta and Enterprise-only. Scale/Max plans have API access but may have limitations on the post creation endpoint. Confirm your plan's API capabilities before building.

---

### 3.9 Key Gotchas

1. **Enterprise-only for Send API.** The Create Post + auto-send is currently beta and Enterprise-only.
2. **Default status will change.** Currently `confirmed` (auto-publish), will become `draft`. Always set explicitly.
3. **`blocks` and `body_content` are mutually exclusive.** Send one or the other, never both.
4. **HTML sanitization.** `<style>` tags are stripped. Use inline styles only.
5. **Fixed email footer.** You cannot remove beehiiv's compliance footer. Email structure is fixed.
6. **Template content stacks.** If you use `post_template_id`, incoming content is placed AFTER pre-existing template content.
7. **Not all block types available yet.** Check current API docs for supported blocks before building.
8. **Draft posts cannot be scheduled.** Only `confirmed` status posts accept `scheduled_at`.
9. **180 req/min is per-organization, not per-key.** All API keys in your org share this limit.

---

## Cross-Platform Comparison Summary

| Feature | TikTok | YouTube | Beehiiv |
|---|---|---|---|
| Auth method | OAuth 2.0 | OAuth 2.0 | API Key (Bearer) |
| Access token expiry | 24 hours | 1 hour | No expiry (key-based) |
| Refresh token expiry | 1 year | Permanent (Production mode) | N/A |
| Upload method | Chunked PUT / PULL_FROM_URL | Resumable upload | N/A (text/HTML) |
| Scheduling | Not supported (build your own) | `publishAt` field (set private + future datetime) | `scheduled_at` field |
| Rate limit (requests) | 6/min per user token | 10,000 units/day | 180/min per org |
| Publishing cap | ~15 posts/day/creator | ~100 uploads/day (quota-limited) | No specific cap |
| Content types | Video, Photo carousel | Video (long + Shorts) | Newsletter (HTML/blocks) |
| AI content disclosure | `is_aigc` field | `containsSyntheticMedia` field | N/A |
| Plan required | Free (but audit for public posting) | Free (but app verification for 100+ users) | Enterprise for Send API |

---

## Sources

### TikTok
- [TikTok Content Posting API - Direct Post](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post)
- [TikTok Content Posting API - Photo Post](https://developers.tiktok.com/doc/content-posting-api-reference-photo-post)
- [TikTok OAuth Token Management](https://developers.tiktok.com/doc/oauth-user-access-token-management)
- [TikTok Content Sharing Guidelines](https://developers.tiktok.com/doc/content-sharing-guidelines)
- [TikTok API Rate Limits](https://developers.tiktok.com/doc/tiktok-api-v2-rate-limit)
- [TikTok API Error Handling](https://developers.tiktok.com/doc/tiktok-api-v2-error-handling)
- [TikTok Developer Guide 2026 - Zernio](https://zernio.com/blog/tiktok-developer-api)
- [TikTok Developer Guide 2026 - TokPortal](https://www.tokportal.com/learn/tiktok-content-posting-api-developer-guide)
- [TikTok API Posting Guide 2026 - PostEverywhere](https://posteverywhere.ai/blog/post-to-tiktok-api)
- [TikTok Error Codes Reference - Zernio](https://zernio.com/tiktok/errors)
- [TikTok Content Posting API Product Page](https://developers.tiktok.com/products/content-posting-api/)

### YouTube
- [YouTube Videos.insert](https://developers.google.com/youtube/v3/docs/videos/insert)
- [YouTube Resumable Upload Protocol](https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol)
- [YouTube Quota Calculator](https://developers.google.com/youtube/v3/determine_quota_cost)
- [YouTube Thumbnails.set](https://developers.google.com/youtube/v3/docs/thumbnails/set)
- [YouTube PlaylistItems.insert](https://developers.google.com/youtube/v3/docs/playlistItems/insert)
- [YouTube API Errors](https://developers.google.com/youtube/v3/docs/errors)
- [YouTube OAuth Refresh Token Expiry - Napkyn](https://www.napkyn.com/blog/youtube-api-refresh-token-expiring-fix)
- [YouTube API Quota 2026 - Phyllo](https://www.getphyllo.com/post/youtube-api-limits-how-to-calculate-api-usage-cost-and-fix-exceeded-api-quota)
- [YouTube Shorts Upload - VEED](https://www.veed.io/learn/youtube-shorts-api)

### Beehiiv
- [Beehiiv Create Post API Reference](https://developers.beehiiv.com/api-reference/posts/create)
- [Beehiiv Rate Limiting](https://developers.beehiiv.com/welcome/rate-limiting)
- [Beehiiv Getting Started](https://developers.beehiiv.com/welcome/getting-started)
- [Beehiiv Send API Guide](https://www.beehiiv.com/support/article/36759164012439-using-the-send-api-and-create-post-endpoint)
- [Beehiiv API Key Creation](https://developers.beehiiv.com/welcome/create-an-api-key)
- [Beehiiv Pricing Plans](https://www.beehiiv.com/support/article/23874462928663-plan-types-and-subscriber-plan-tier-pricing)
