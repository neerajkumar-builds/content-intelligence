/**
 * Server-side RSS/Atom feed fetcher.
 *
 * Fetches feeds directly (bypassing n8n) for sources where n8n struggles:
 *  - YouTube Atom feeds (non-standard fields)
 *  - Google News RSS (403 to n8n's IP)
 *
 * Uses regex-based XML extraction — no external parser dependency.
 * Every fetch URL is SSRF-validated before use.
 */

import { assertSafeUrl } from "./url-safety";
import { resolveGoogleNewsRedirect } from "./google-news";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface FetchedSignal {
  title: string;
  body: string;
  sourceUrl?: string;
  publishedAt?: string;
  metadata: Record<string, unknown>;
}

export interface FetchResult {
  signals: FetchedSignal[];
  errors: string[];
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function fetchFeedSignals(
  feedUrl: string,
  options?: {
    maxItems?: number;
    fetchMethod?: string;
  },
): Promise<FetchResult> {
  const maxItems = options?.maxItems ?? 15;
  const fetchMethod = options?.fetchMethod ?? "rss";
  const errors: string[] = [];

  // 1. SSRF protection
  try {
    await assertSafeUrl(feedUrl);
  } catch (err) {
    return {
      signals: [],
      errors: [
        `SSRF blocked: ${err instanceof Error ? err.message : "unsafe URL"}`,
      ],
    };
  }

  // 2. Fetch XML
  let xml: string;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(feedUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "ContentIntelligence/1.0 (+https://content-intelligence-eight.vercel.app)",
        Accept:
          "application/rss+xml, application/atom+xml, application/xml, text/xml",
      },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return {
        signals: [],
        errors: [`Feed returned HTTP ${res.status}: ${res.statusText}`],
      };
    }

    xml = await res.text();
  } catch (err) {
    return {
      signals: [],
      errors: [
        `Fetch failed: ${err instanceof Error ? err.message : "network error"}`,
      ],
    };
  }

  // 3. Detect format and parse
  const isAtom = /<feed[\s>]/i.test(xml);
  const rawItems = isAtom ? parseAtomEntries(xml) : parseRssItems(xml);

  // 4. Normalize into FetchedSignal[]
  const isGoogleNews = fetchMethod === "google_news";
  const signals: FetchedSignal[] = [];

  // Process items up to maxItems, resolving Google News redirects in parallel
  const toProcess = rawItems.slice(0, maxItems);

  const settled = await Promise.allSettled(
    toProcess.map(async (item): Promise<FetchedSignal | null> => {
      const title = item.title?.trim() ?? null;
      if (!title) return null; // skip items without a title

      // Body: try multiple fields in priority order
      const body =
        item.description ??
        item.contentEncoded ??
        item.content ??
        item.summary ??
        item.mediaDescription ??
        "";

      // Source URL: resolve Google News redirects
      let sourceUrl: string | undefined = item.link?.trim() || undefined;
      if (sourceUrl && isGoogleNews) {
        try {
          sourceUrl = await resolveGoogleNewsRedirect(sourceUrl);
        } catch {
          // Keep original URL if redirect resolution fails
        }
      }

      // Published date
      const publishedAt = item.pubDate ?? item.published ?? undefined;

      // Metadata
      const metadata: Record<string, unknown> = { feedUrl, fetchMethod };
      if (item.creator) metadata.creator = item.creator;
      if (item.categories && item.categories.length > 0)
        metadata.categories = item.categories;

      return {
        title: stripHtml(title),
        body: stripHtml(body).slice(0, 5000), // cap body at 5k chars
        sourceUrl,
        publishedAt,
        metadata,
      };
    }),
  );

  for (const result of settled) {
    if (result.status === "fulfilled" && result.value) {
      signals.push(result.value);
    } else if (result.status === "rejected") {
      errors.push(
        `Item parse error: ${result.reason instanceof Error ? result.reason.message : "unknown"}`,
      );
    }
  }

  return { signals, errors };
}

// ---------------------------------------------------------------------------
// RSS 2.0 parser (regex-based)
// ---------------------------------------------------------------------------

interface RawItem {
  title: string | null;
  link: string | null;
  description: string | null;
  contentEncoded: string | null;
  content: string | null;
  summary: string | null;
  mediaDescription: string | null;
  pubDate: string | null;
  published: string | null;
  creator: string | null;
  categories: string[];
}

function parseRssItems(xml: string): RawItem[] {
  const items: RawItem[] = [];
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    items.push({
      title: extractTag(block, "title"),
      link: extractTag(block, "link"),
      description: extractTag(block, "description"),
      contentEncoded:
        extractTag(block, "content:encoded") ??
        extractTag(block, "content\\:encoded"),
      content: extractTag(block, "content"),
      summary: extractTag(block, "summary"),
      mediaDescription:
        extractTag(block, "media:description") ??
        extractTag(block, "media\\:description"),
      pubDate: extractTag(block, "pubDate"),
      published: extractTag(block, "published"),
      creator:
        extractTag(block, "dc:creator") ??
        extractTag(block, "dc\\:creator") ??
        extractTag(block, "author"),
      categories: extractAllTags(block, "category"),
    });
  }

  return items;
}

// ---------------------------------------------------------------------------
// Atom parser (regex-based)
// ---------------------------------------------------------------------------

function parseAtomEntries(xml: string): RawItem[] {
  const items: RawItem[] = [];
  const entryRegex = /<entry[\s>]([\s\S]*?)<\/entry>/gi;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const block = match[1];

    // Atom <link> uses href attribute: <link rel="alternate" href="..."/>
    const linkMatch = block.match(
      /<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i,
    );
    const linkHref: string | null =
      linkMatch?.[1] ?? block.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1] ?? null;

    // YouTube: media:group > media:description
    const mediaGroupMatch = block.match(
      /<media:group[\s>]([\s\S]*?)<\/media:group>/i,
    );
    const mediaDesc = mediaGroupMatch
      ? extractTag(mediaGroupMatch[1], "media:description") ??
        extractTag(mediaGroupMatch[1], "media\\:description")
      : extractTag(block, "media:description") ??
        extractTag(block, "media\\:description");

    items.push({
      title: extractTag(block, "title"),
      link: linkHref,
      description: extractTag(block, "description"),
      contentEncoded: extractTag(block, "content:encoded"),
      content: extractTag(block, "content"),
      summary: extractTag(block, "summary"),
      mediaDescription: mediaDesc ?? null,
      pubDate: extractTag(block, "pubDate"),
      published:
        extractTag(block, "published") ?? extractTag(block, "updated"),
      creator:
        extractTag(block, "name") ??
        extractTag(block, "author"),
      categories: extractAllTags(block, "category"),
    });
  }

  return items;
}

// ---------------------------------------------------------------------------
// XML extraction helpers
// ---------------------------------------------------------------------------

/**
 * Extract the text content of a single XML tag, handling CDATA.
 * Returns null if the tag is not found.
 */
function extractTag(block: string, tagName: string): string | null {
  // Match both <tag>...</tag> and <tag><![CDATA[...]]></tag>
  // Escape special regex chars in tagName (for namespaced tags like content:encoded)
  const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    `<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`,
    "i",
  );
  const match = block.match(regex);
  if (!match) return null;

  let value = match[1].trim();

  // Unwrap CDATA
  const cdataMatch = value.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  if (cdataMatch) {
    value = cdataMatch[1];
  }

  return value || null;
}

/**
 * Extract all occurrences of a tag (e.g., multiple <category> tags).
 */
function extractAllTags(block: string, tagName: string): string[] {
  const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    `<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`,
    "gi",
  );
  const results: string[] = [];
  let match;

  while ((match = regex.exec(block)) !== null) {
    const val = match[1].trim();
    // Unwrap CDATA
    const cdataMatch = val.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
    const clean = cdataMatch ? cdataMatch[1] : val;
    if (clean) results.push(clean);
  }

  return results;
}

/**
 * Strip HTML tags and decode common XML/HTML entities.
 */
function stripHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) =>
      String.fromCharCode(parseInt(dec, 10)),
    )
    .trim();
}
