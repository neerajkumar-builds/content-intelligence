/**
 * Social Link Auto-Discovery Utility
 *
 * Fetches a website's HTML and extracts social media profile URLs from:
 *   1. <a href="..."> tags (links in footer, header, sidebar, etc.)
 *   2. <meta> tags (og:see_also, article:author)
 *   3. JSON-LD structured data (sameAs URLs)
 *
 * Never throws — all errors collected in the returned errors array.
 * No external dependencies — uses built-in fetch + AbortController.
 * SSRF-protected via assertSafeUrl before every fetch.
 */

import { assertSafeUrl, SsrfError } from "./url-safety";

const USER_AGENT = "ContentIntelligence/1.0 Social-Discovery";
const HTML_FETCH_TIMEOUT_MS = 8_000;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface DiscoveredSocialLink {
  platform:
    | "linkedin"
    | "twitter"
    | "youtube"
    | "instagram"
    | "facebook"
    | "tiktok"
    | "reddit"
    | "podcast"
    | "substack"
    | "medium";
  url: string;
  confidence: "high" | "medium";
}

export interface SocialDiscoveryResult {
  links: DiscoveredSocialLink[];
  errors: string[];
}

// ---------------------------------------------------------------------------
// Platform URL patterns
// ---------------------------------------------------------------------------

type PlatformName = DiscoveredSocialLink["platform"];

interface PlatformPattern {
  platform: PlatformName;
  /** Test whether a URL belongs to this platform */
  match: (url: URL) => boolean;
  /** URLs to EXCLUDE (share intents, individual posts, etc.) */
  exclude: (url: URL) => boolean;
}

const PLATFORM_PATTERNS: PlatformPattern[] = [
  {
    platform: "linkedin",
    match: (u) =>
      u.hostname.endsWith("linkedin.com") &&
      (/^\/company\//i.test(u.pathname) || /^\/in\//i.test(u.pathname)),
    exclude: (u) =>
      u.pathname.startsWith("/shareArticle") ||
      u.pathname.startsWith("/sharing"),
  },
  {
    platform: "twitter",
    match: (u) =>
      (u.hostname.endsWith("twitter.com") || u.hostname.endsWith("x.com")) &&
      u.pathname.length > 1,
    exclude: (u) => {
      const p = u.pathname.toLowerCase();
      return (
        p.startsWith("/intent") ||
        p.startsWith("/share") ||
        p.startsWith("/home") ||
        p.startsWith("/search") ||
        p.startsWith("/hashtag") ||
        // Individual status/tweet URLs
        /\/status\/\d+/.test(p)
      );
    },
  },
  {
    platform: "youtube",
    match: (u) =>
      u.hostname.endsWith("youtube.com") &&
      (/^\/channel\//i.test(u.pathname) ||
        /^\/@/i.test(u.pathname) ||
        /^\/c\//i.test(u.pathname) ||
        /^\/user\//i.test(u.pathname)),
    exclude: (u) =>
      // Individual video URLs
      u.pathname.startsWith("/watch") ||
      u.pathname.startsWith("/embed") ||
      u.pathname.startsWith("/shorts/"),
  },
  {
    platform: "instagram",
    match: (u) =>
      u.hostname.endsWith("instagram.com") && u.pathname.length > 1,
    exclude: (u) => {
      const p = u.pathname.toLowerCase();
      return (
        p.startsWith("/p/") ||
        p.startsWith("/reel/") ||
        p.startsWith("/stories/") ||
        p.startsWith("/explore") ||
        p.startsWith("/accounts")
      );
    },
  },
  {
    platform: "facebook",
    match: (u) =>
      u.hostname.endsWith("facebook.com") && u.pathname.length > 1,
    exclude: (u) => {
      const p = u.pathname.toLowerCase();
      return (
        p.startsWith("/sharer") ||
        p.startsWith("/dialog") ||
        p.startsWith("/share") ||
        // Individual post URLs
        /\/posts\//.test(p) ||
        /\/photos\//.test(p) ||
        /\/videos\//.test(p)
      );
    },
  },
  {
    platform: "tiktok",
    match: (u) =>
      u.hostname.endsWith("tiktok.com") && /^\/@/i.test(u.pathname),
    exclude: (u) =>
      // Individual video URLs
      /\/video\/\d+/.test(u.pathname),
  },
  {
    platform: "reddit",
    match: (u) =>
      u.hostname.endsWith("reddit.com") &&
      (/^\/r\//i.test(u.pathname) || /^\/user\//i.test(u.pathname)),
    exclude: (u) =>
      // Individual post/comment URLs (have /comments/ segment)
      /\/comments\//.test(u.pathname),
  },
  {
    platform: "substack",
    match: (u) =>
      u.hostname.endsWith("substack.com") ||
      u.hostname.endsWith(".substack.com"),
    exclude: () => false,
  },
  {
    platform: "medium",
    match: (u) =>
      u.hostname === "medium.com" ||
      u.hostname.endsWith(".medium.com"),
    exclude: () => false,
  },
  {
    platform: "podcast",
    match: (u) =>
      u.hostname.endsWith("podcasts.apple.com") ||
      u.hostname.endsWith("open.spotify.com") ||
      u.hostname.endsWith("anchor.fm"),
    exclude: () => false,
  },
];

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function discoverSocialLinks(
  websiteUrl: string,
): Promise<SocialDiscoveryResult> {
  const errors: string[] = [];

  // Normalize URL
  const normalized = normalizeUrl(websiteUrl);
  if (!normalized) {
    return { links: [], errors: [`Invalid URL: ${websiteUrl}`] };
  }

  // SSRF protection
  try {
    await assertSafeUrl(normalized);
  } catch (err) {
    const message =
      err instanceof SsrfError ? err.message : "URL safety check failed";
    return { links: [], errors: [message] };
  }

  // Fetch HTML
  const htmlResult = await fetchHtml(normalized);
  if (!htmlResult.ok) {
    errors.push(`Failed to fetch ${normalized}: ${htmlResult.error}`);
    return { links: [], errors };
  }

  const html = htmlResult.body;
  if (html.length < 100) {
    errors.push("HTML response too short — likely not a real page");
    return { links: [], errors };
  }

  // Extract links from three sources
  const fromAnchors = extractAnchorLinks(html);
  const fromMeta = extractMetaLinks(html);
  const fromJsonLd = extractJsonLdLinks(html);

  // Match against platform patterns
  const allLinks: DiscoveredSocialLink[] = [];

  for (const href of fromAnchors) {
    const matched = matchPlatform(href);
    if (matched) {
      allLinks.push({ ...matched, confidence: "high" });
    }
  }

  for (const href of fromMeta) {
    const matched = matchPlatform(href);
    if (matched) {
      allLinks.push({ ...matched, confidence: "medium" });
    }
  }

  for (const href of fromJsonLd) {
    const matched = matchPlatform(href);
    if (matched) {
      allLinks.push({ ...matched, confidence: "medium" });
    }
  }

  // Deduplicate by (platform, normalized URL)
  const deduped = dedup(allLinks);

  // Sort by platform name
  deduped.sort((a, b) => a.platform.localeCompare(b.platform));

  return { links: deduped, errors };
}

// ---------------------------------------------------------------------------
// HTML fetcher
// ---------------------------------------------------------------------------

interface HtmlFetchResult {
  ok: boolean;
  body: string;
  error?: string;
}

async function fetchHtml(url: string): Promise<HtmlFetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTML_FETCH_TIMEOUT_MS);

  try {
    const resp = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    if (!resp.ok) {
      return {
        ok: false,
        body: "",
        error: `HTTP ${resp.status} ${resp.statusText}`,
      };
    }

    const body = await resp.text();
    return { ok: true, body };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.name === "AbortError"
          ? `Timeout after ${HTML_FETCH_TIMEOUT_MS}ms`
          : err.message
        : "Unknown fetch error";
    return { ok: false, body: "", error: message };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Extraction: <a href="..."> tags
// ---------------------------------------------------------------------------

function extractAnchorLinks(html: string): string[] {
  const urls: string[] = [];
  // Match all href attributes in <a> tags
  const regex = /<a\s[^>]*?href\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const href = match[1].trim();
    if (href && (href.startsWith("http://") || href.startsWith("https://"))) {
      urls.push(href);
    }
  }
  return urls;
}

// ---------------------------------------------------------------------------
// Extraction: <meta> tags (og:see_also, article:author)
// ---------------------------------------------------------------------------

function extractMetaLinks(html: string): string[] {
  const urls: string[] = [];

  // og:see_also
  const ogSeeAlso =
    /<meta\s[^>]*?(?:property|name)\s*=\s*["']og:see_also["'][^>]*?content\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = ogSeeAlso.exec(html)) !== null) {
    const url = match[1].trim();
    if (url.startsWith("http")) urls.push(url);
  }

  // Also handle reversed attribute order (content before property)
  const ogSeeAlsoReversed =
    /<meta\s[^>]*?content\s*=\s*["']([^"']+)["'][^>]*?(?:property|name)\s*=\s*["']og:see_also["'][^>]*>/gi;
  while ((match = ogSeeAlsoReversed.exec(html)) !== null) {
    const url = match[1].trim();
    if (url.startsWith("http")) urls.push(url);
  }

  // article:author
  const articleAuthor =
    /<meta\s[^>]*?(?:property|name)\s*=\s*["']article:author["'][^>]*?content\s*=\s*["']([^"']+)["'][^>]*>/gi;
  while ((match = articleAuthor.exec(html)) !== null) {
    const url = match[1].trim();
    if (url.startsWith("http")) urls.push(url);
  }

  const articleAuthorReversed =
    /<meta\s[^>]*?content\s*=\s*["']([^"']+)["'][^>]*?(?:property|name)\s*=\s*["']article:author["'][^>]*>/gi;
  while ((match = articleAuthorReversed.exec(html)) !== null) {
    const url = match[1].trim();
    if (url.startsWith("http")) urls.push(url);
  }

  return urls;
}

// ---------------------------------------------------------------------------
// Extraction: JSON-LD sameAs URLs
// ---------------------------------------------------------------------------

function extractJsonLdLinks(html: string): string[] {
  const urls: string[] = [];

  // Find all <script type="application/ld+json"> blocks
  const scriptRegex =
    /<script\s[^>]*?type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let scriptMatch: RegExpExecArray | null;

  while ((scriptMatch = scriptRegex.exec(html)) !== null) {
    const jsonText = scriptMatch[1].trim();
    try {
      const data: unknown = JSON.parse(jsonText);
      // sameAs can be a string or array of strings
      extractSameAs(data, urls);
    } catch {
      // Invalid JSON-LD — skip silently
    }
  }

  return urls;
}

function extractSameAs(
  data: unknown,
  urls: string[],
): void {
  if (!data || typeof data !== "object") return;

  if (Array.isArray(data)) {
    for (const item of data) {
      extractSameAs(item, urls);
    }
    return;
  }

  const obj = data as Record<string, unknown>;

  // Check sameAs field
  if (obj.sameAs) {
    if (typeof obj.sameAs === "string" && obj.sameAs.startsWith("http")) {
      urls.push(obj.sameAs);
    } else if (Array.isArray(obj.sameAs)) {
      for (const item of obj.sameAs) {
        if (typeof item === "string" && item.startsWith("http")) {
          urls.push(item);
        }
      }
    }
  }

  // Check @graph for nested schemas
  if (Array.isArray(obj["@graph"])) {
    for (const node of obj["@graph"]) {
      extractSameAs(node, urls);
    }
  }
}

// ---------------------------------------------------------------------------
// Platform matching
// ---------------------------------------------------------------------------

function matchPlatform(
  href: string,
): { platform: PlatformName; url: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(href);
  } catch {
    return null;
  }

  // Only allow http/https
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  for (const pattern of PLATFORM_PATTERNS) {
    if (pattern.match(parsed) && !pattern.exclude(parsed)) {
      return { platform: pattern.platform, url: normalizeProfileUrl(parsed) };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// URL normalization & dedup
// ---------------------------------------------------------------------------

function normalizeProfileUrl(parsed: URL): string {
  // Strip query params, fragments, trailing slashes for dedup consistency
  const path = parsed.pathname.replace(/\/+$/, "");
  // For substack, keep the full URL (subdomain is the identity)
  return `${parsed.protocol}//${parsed.hostname}${path}`;
}

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let url = trimmed;
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  try {
    const parsed = new URL(url);
    if (!parsed.hostname || !parsed.hostname.includes(".")) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function dedup(links: DiscoveredSocialLink[]): DiscoveredSocialLink[] {
  const seen = new Map<string, DiscoveredSocialLink>();

  for (const link of links) {
    const key = `${link.platform}::${link.url.toLowerCase().replace(/\/+$/, "")}`;
    const existing = seen.get(key);
    // Keep the highest confidence
    if (!existing || (link.confidence === "high" && existing.confidence === "medium")) {
      seen.set(key, link);
    }
  }

  return Array.from(seen.values());
}
