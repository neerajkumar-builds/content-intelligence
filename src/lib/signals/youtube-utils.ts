/**
 * YouTube channel ID extraction + RSS feed URL construction.
 *
 * Handles these URL formats:
 *   - youtube.com/channel/UC...        → extract directly from path
 *   - youtube.com/@handle              → fetch page HTML, parse channel ID
 *   - youtube.com/c/customname         → fetch page HTML, parse channel ID
 *   - youtube.com/user/username        → fetch page HTML, parse channel ID
 *   - youtu.be/...                     → reject (video link, not channel)
 *
 * RSS URL: https://www.youtube.com/feeds/videos.xml?channel_id={channelId}
 *
 * Never throws — returns { error: "..." } on failure.
 */

import { assertSafeUrl, SsrfError } from "./url-safety";

const FETCH_TIMEOUT_MS = 8_000;

const USER_AGENT =
  "Mozilla/5.0 (compatible; ContentIntelligenceBot/1.0; +https://content-intelligence-eight.vercel.app)";

const YOUTUBE_RSS_BASE =
  "https://www.youtube.com/feeds/videos.xml?channel_id=";

/** Channel IDs always start with "UC" followed by alphanumeric, dash, or underscore chars. */
const CHANNEL_ID_RE = /^UC[\w-]{20,30}$/;

type ResolveResult =
  | { channelId: string; feedUrl: string }
  | { error: string };

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function resolveYouTubeRss(
  youtubeUrl: string,
): Promise<ResolveResult> {
  // --- Step 1: Parse and validate the URL ----------------------------------
  const parsed = parseYouTubeUrl(youtubeUrl);
  if ("error" in parsed) return parsed;

  const { hostname, pathname } = parsed;

  // --- Step 2: Reject video-only domains -----------------------------------
  if (hostname.includes("youtu.be")) {
    return { error: "youtu.be URLs are video links, not channel links" };
  }

  // --- Step 3: Route by URL path pattern -----------------------------------

  // /channel/UC... → direct extraction
  const channelPathMatch = pathname.match(/^\/channel\/(UC[\w-]+)/);
  if (channelPathMatch) {
    return buildResult(channelPathMatch[1]);
  }

  // /@handle, /c/customname, /user/username → need HTML fetch
  if (
    pathname.startsWith("/@") ||
    pathname.startsWith("/c/") ||
    pathname.startsWith("/user/")
  ) {
    return resolveViaHtml(parsed.url);
  }

  return {
    error: `Unrecognized YouTube URL pattern: ${pathname}`,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function parseYouTubeUrl(raw: string): { url: string; hostname: string; pathname: string } | { error: string } {
  let normalized = raw.trim();

  // Accept bare URLs without scheme
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    return { error: `Invalid URL: ${raw}` };
  }

  const hostname = url.hostname.toLowerCase();

  if (
    !hostname.includes("youtube.com") &&
    !hostname.includes("youtu.be")
  ) {
    return { error: `Not a YouTube URL (hostname: ${hostname})` };
  }

  return {
    url: url.toString(),
    hostname,
    pathname: url.pathname,
  };
}

function buildResult(channelId: string): ResolveResult {
  if (!CHANNEL_ID_RE.test(channelId)) {
    return { error: `Invalid channel ID format: ${channelId}` };
  }
  return {
    channelId,
    feedUrl: `${YOUTUBE_RSS_BASE}${channelId}`,
  };
}

/**
 * Fetch channel page HTML, then extract channel ID via multiple strategies:
 *   1. <meta itemprop="channelId" content="UC...">
 *   2. Canonical URL containing /channel/UC...
 *   3. Raw regex scan for "UC" pattern in page source
 */
async function resolveViaHtml(pageUrl: string): Promise<ResolveResult> {
  // SSRF protection: validate URL before fetching
  try {
    await assertSafeUrl(pageUrl);
  } catch (err) {
    const message = err instanceof SsrfError ? err.message : "URL safety check failed";
    return { error: `SSRF blocked: ${message}` };
  }

  // Validate hostname is actually YouTube
  try {
    const urlObj = new URL(pageUrl);
    if (!urlObj.hostname.toLowerCase().includes("youtube.com")) {
      return { error: `Not a YouTube domain: ${urlObj.hostname}` };
    }
  } catch {
    return { error: `Invalid URL: ${pageUrl}` };
  }

  let html: string;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(pageUrl, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      return {
        error: `YouTube returned HTTP ${res.status} for ${pageUrl}`,
      };
    }

    html = await res.text();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown fetch error";
    return { error: `Failed to fetch YouTube page: ${message}` };
  }

  // Strategy 1: meta itemprop="channelId"
  const metaMatch = html.match(
    /<meta\s+itemprop=["']channelId["']\s+content=["'](UC[\w-]+)["']/,
  );
  if (metaMatch) return buildResult(metaMatch[1]);

  // Strategy 2: canonical URL containing /channel/UC...
  const canonicalMatch = html.match(
    /\/channel\/(UC[\w-]+)/,
  );
  if (canonicalMatch) return buildResult(canonicalMatch[1]);

  // Strategy 3: JSON data regex — "channelId":"UC..."
  const jsonMatch = html.match(
    /"channelId"\s*:\s*"(UC[\w-]+)"/,
  );
  if (jsonMatch) return buildResult(jsonMatch[1]);

  return {
    error:
      "Could not extract channel ID from page HTML. The URL may not be a valid YouTube channel.",
  };
}
