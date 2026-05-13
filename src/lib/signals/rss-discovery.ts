/**
 * RSS Auto-Discovery Utility
 *
 * Takes a website URL, fetches HTML, discovers RSS/Atom feeds via:
 *   1. <link rel="alternate"> tags in <head>
 *   2. Probing common feed paths (/feed, /rss.xml, etc.)
 *   3. Validating candidates by fetching first bytes and checking XML markers
 *
 * Never throws — all errors collected in the returned errors array.
 * No external dependencies — uses built-in fetch + AbortController.
 */

import { assertSafeUrl, SsrfError } from "./url-safety";

const USER_AGENT = "ContentIntelligence/1.0 RSS-Discovery";
const HTML_FETCH_TIMEOUT_MS = 8_000;
const PROBE_TIMEOUT_MS = 5_000;
const VALIDATE_TIMEOUT_MS = 5_000;

/** Byte markers that indicate a valid RSS/Atom feed */
const FEED_MARKERS = ["<?xml", "<rss", "<feed", "<rdf:RDF"] as const;

/** Content-Type values that indicate XML/RSS/Atom */
const FEED_CONTENT_TYPES = [
  "application/rss+xml",
  "application/atom+xml",
  "application/xml",
  "text/xml",
] as const;

/** Common feed paths to probe when no <link> tags are found */
const COMMON_FEED_PATHS = [
  "/feed",
  "/feed.xml",
  "/rss",
  "/rss.xml",
  "/atom.xml",
  "/blog/feed",
  "/blog/rss.xml",
  "/blog/rss",
  "/index.xml",
] as const;

export interface DiscoveredFeed {
  url: string;
  title: string;
  type: "rss" | "atom";
}

export interface RssDiscoveryResult {
  feeds: DiscoveredFeed[];
  errors: string[];
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function discoverRssFeeds(
  websiteUrl: string
): Promise<RssDiscoveryResult> {
  const errors: string[] = [];

  // Step 1: Normalize URL
  const normalized = normalizeUrl(websiteUrl);
  if (!normalized) {
    return { feeds: [], errors: [`Invalid URL: ${websiteUrl}`] };
  }

  let baseUrl: URL;
  try {
    baseUrl = new URL(normalized);
  } catch {
    return { feeds: [], errors: [`Malformed URL after normalization: ${normalized}`] };
  }

  // Step 2: Fetch website HTML
  const htmlResult = await fetchWithTimeout(normalized, HTML_FETCH_TIMEOUT_MS);
  if (!htmlResult.ok) {
    errors.push(`Failed to fetch ${normalized}: ${htmlResult.error}`);
    // Even if the main page fails, try probing common paths
    const probed = await probeCommonPaths(baseUrl, errors);
    const validated = await validateFeeds(probed, errors);
    return { feeds: dedup(validated), errors };
  }

  const contentType = htmlResult.headers?.get("content-type") ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
    errors.push(`Non-HTML content-type: ${contentType}`);
    // Still try probing
    const probed = await probeCommonPaths(baseUrl, errors);
    const validated = await validateFeeds(probed, errors);
    return { feeds: dedup(validated), errors };
  }

  // Step 3: Parse <head> for <link rel="alternate"> tags
  const linkFeeds = parseLinkTags(htmlResult.body, baseUrl);

  // Step 4+5: If no link tags, probe common paths
  let candidates: DiscoveredFeed[];
  if (linkFeeds.length > 0) {
    candidates = linkFeeds;
  } else {
    candidates = await probeCommonPaths(baseUrl, errors);
  }

  // Step 7: Validate each candidate
  const validated = await validateFeeds(candidates, errors);

  return { feeds: dedup(validated), errors };
}

// ---------------------------------------------------------------------------
// Step 1: URL normalization
// ---------------------------------------------------------------------------

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Add scheme if missing
  let url = trimmed;
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  // Validate it parses
  try {
    const parsed = new URL(url);
    // Must have a real hostname
    if (!parsed.hostname || !parsed.hostname.includes(".")) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Step 3: Parse <link> tags from HTML <head>
// ---------------------------------------------------------------------------

interface RawLinkTag {
  type: "application/rss+xml" | "application/atom+xml";
  href: string;
  title: string;
}

function parseLinkTags(html: string, baseUrl: URL): DiscoveredFeed[] {
  const feeds: DiscoveredFeed[] = [];

  // Extract <head> content to avoid false positives in <body>
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const headHtml = headMatch ? headMatch[1] : html;

  // Match <link> tags with rel="alternate" and RSS/Atom type
  const linkRegex =
    /<link\s[^>]*?rel\s*=\s*["']alternate["'][^>]*?>/gi;

  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(headHtml)) !== null) {
    const tag = match[0];
    const parsed = parseSingleLinkTag(tag);
    if (parsed) {
      const resolvedUrl = resolveUrl(parsed.href, baseUrl);
      if (resolvedUrl) {
        feeds.push({
          url: resolvedUrl,
          title: parsed.title || inferTitleFromUrl(resolvedUrl),
          type: parsed.type === "application/atom+xml" ? "atom" : "rss",
        });
      }
    }
  }

  // Also match when type comes before rel (attribute order varies)
  const linkRegex2 =
    /<link\s[^>]*?type\s*=\s*["']application\/(rss|atom)\+xml["'][^>]*?>/gi;

  while ((match = linkRegex2.exec(headHtml)) !== null) {
    const tag = match[0];
    const parsed = parseSingleLinkTag(tag);
    if (parsed) {
      const resolvedUrl = resolveUrl(parsed.href, baseUrl);
      if (resolvedUrl && !feeds.some((f) => f.url === resolvedUrl)) {
        feeds.push({
          url: resolvedUrl,
          title: parsed.title || inferTitleFromUrl(resolvedUrl),
          type: parsed.type === "application/atom+xml" ? "atom" : "rss",
        });
      }
    }
  }

  return feeds;
}

function parseSingleLinkTag(tag: string): RawLinkTag | null {
  const typeMatch = tag.match(
    /type\s*=\s*["'](application\/(rss|atom)\+xml)["']/i
  );
  const hrefMatch = tag.match(/href\s*=\s*["']([^"']+)["']/i);

  if (!typeMatch || !hrefMatch) return null;

  const titleMatch = tag.match(/title\s*=\s*["']([^"']+)["']/i);

  return {
    type: typeMatch[1].toLowerCase() as RawLinkTag["type"],
    href: hrefMatch[1],
    title: titleMatch ? decodeHtmlEntities(titleMatch[1]) : "",
  };
}

// ---------------------------------------------------------------------------
// Step 5: Probe common feed paths
// ---------------------------------------------------------------------------

async function probeCommonPaths(
  baseUrl: URL,
  errors: string[]
): Promise<DiscoveredFeed[]> {
  const origin = baseUrl.origin;
  const candidates: DiscoveredFeed[] = [];

  // Probe all paths concurrently
  const results = await Promise.allSettled(
    COMMON_FEED_PATHS.map(async (path) => {
      const url = `${origin}${path}`;
      const result = await headWithTimeout(url, PROBE_TIMEOUT_MS);
      return { url, path, result };
    })
  );

  for (const settled of results) {
    if (settled.status === "rejected") continue;

    const { url, result } = settled.value;
    if (!result.ok) continue;

    const ct = result.contentType.toLowerCase();
    const isFeedContentType = FEED_CONTENT_TYPES.some((t) => ct.includes(t));

    if (isFeedContentType) {
      candidates.push({
        url,
        title: inferTitleFromUrl(url),
        type: ct.includes("atom") ? "atom" : "rss",
      });
    } else if (result.status === 200) {
      // 200 but unknown content-type — add as candidate, validation will confirm
      candidates.push({
        url,
        title: inferTitleFromUrl(url),
        type: "rss", // Will be refined during validation
      });
    }
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Step 7: Validate feeds by fetching first bytes
// ---------------------------------------------------------------------------

async function validateFeeds(
  candidates: DiscoveredFeed[],
  errors: string[]
): Promise<DiscoveredFeed[]> {
  if (candidates.length === 0) return [];

  const results = await Promise.allSettled(
    candidates.map(async (candidate) => {
      const validated = await validateSingleFeed(candidate);
      if (!validated.valid) {
        errors.push(`Feed validation failed for ${candidate.url}: ${validated.reason}`);
      }
      return { candidate, validated };
    })
  );

  const valid: DiscoveredFeed[] = [];
  for (const settled of results) {
    if (settled.status === "rejected") continue;
    const { candidate, validated } = settled.value;
    if (validated.valid) {
      valid.push({
        ...candidate,
        // Refine type based on actual content
        type: validated.detectedType ?? candidate.type,
      });
    }
  }

  return valid;
}

async function validateSingleFeed(
  candidate: DiscoveredFeed
): Promise<{ valid: boolean; reason?: string; detectedType?: "rss" | "atom" }> {
  // SSRF protection: validate URL before fetching
  try {
    await assertSafeUrl(candidate.url);
  } catch (err) {
    const message = err instanceof SsrfError ? err.message : "URL safety check failed";
    return { valid: false, reason: message };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VALIDATE_TIMEOUT_MS);

  try {
    const resp = await fetch(candidate.url, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        Range: "bytes=0-512", // Request only first 512 bytes
      },
      signal: controller.signal,
      redirect: "follow",
    });

    if (!resp.ok && resp.status !== 206) {
      return { valid: false, reason: `HTTP ${resp.status}` };
    }

    const text = await resp.text();
    const snippet = text.substring(0, 512).toLowerCase();

    // Check for feed markers
    const hasMarker = FEED_MARKERS.some((marker) =>
      snippet.includes(marker.toLowerCase())
    );

    if (!hasMarker) {
      return { valid: false, reason: "No XML/RSS/Atom markers in first bytes" };
    }

    // Detect type from content
    const detectedType: "rss" | "atom" =
      snippet.includes("<feed") || snippet.includes("xmlns:atom") || snippet.includes("atom+xml")
        ? "atom"
        : "rss";

    return { valid: true, detectedType };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown validation error";
    return { valid: false, reason: message };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

interface FetchResult {
  ok: boolean;
  body: string;
  headers: Headers | null;
  error?: string;
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number
): Promise<FetchResult> {
  // SSRF protection: validate URL before fetching
  try {
    await assertSafeUrl(url);
  } catch (err) {
    const message = err instanceof SsrfError ? err.message : "URL safety check failed";
    return { ok: false, body: "", headers: null, error: message };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
      redirect: "follow",
    });

    if (!resp.ok) {
      return {
        ok: false,
        body: "",
        headers: resp.headers,
        error: `HTTP ${resp.status} ${resp.statusText}`,
      };
    }

    const body = await resp.text();
    return { ok: true, body, headers: resp.headers };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.name === "AbortError"
          ? `Timeout after ${timeoutMs}ms`
          : err.message
        : "Unknown fetch error";
    return { ok: false, body: "", headers: null, error: message };
  } finally {
    clearTimeout(timer);
  }
}

interface HeadResult {
  ok: boolean;
  status: number;
  contentType: string;
}

async function headWithTimeout(
  url: string,
  timeoutMs: number
): Promise<HeadResult> {
  // SSRF protection: validate URL before fetching
  try {
    await assertSafeUrl(url);
  } catch {
    return { ok: false, status: 0, contentType: "" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
      redirect: "follow",
    });

    return {
      ok: resp.ok,
      status: resp.status,
      contentType: resp.headers.get("content-type") ?? "",
    };
  } catch {
    return { ok: false, status: 0, contentType: "" };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// URL / string helpers
// ---------------------------------------------------------------------------

function resolveUrl(href: string, baseUrl: URL): string | null {
  try {
    // Handle protocol-relative URLs
    if (href.startsWith("//")) {
      return new URL(`${baseUrl.protocol}${href}`).toString();
    }
    // Absolute URL
    if (/^https?:\/\//i.test(href)) {
      return new URL(href).toString();
    }
    // Relative URL — resolve against base
    return new URL(href, baseUrl.origin).toString();
  } catch {
    return null;
  }
}

function inferTitleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/$/, "");
    const segment = path.split("/").pop() ?? "";
    // Clean up common feed filenames
    const cleaned = segment
      .replace(/\.(xml|rss|atom)$/i, "")
      .replace(/[-_]/g, " ")
      .trim();

    if (!cleaned || cleaned === "feed" || cleaned === "rss" || cleaned === "atom") {
      return `${parsed.hostname} Feed`;
    }
    // Capitalize first letter
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1) + " Feed";
  } catch {
    return "RSS Feed";
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

/** Deduplicate feeds by URL */
function dedup(feeds: DiscoveredFeed[]): DiscoveredFeed[] {
  const seen = new Set<string>();
  return feeds.filter((f) => {
    const key = f.url.toLowerCase().replace(/\/+$/, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
