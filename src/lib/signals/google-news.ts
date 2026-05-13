/**
 * Google News RSS URL builder + redirect resolver.
 *
 * Used for:
 *  - Profile creation: buildGoogleNewsUrl generates the feed URL for monitoring
 *  - Server-side article resolution: resolveGoogleNewsRedirect follows the
 *    redirect chain to get the actual article URL
 */

import { assertSafeUrl } from "./url-safety";

// ---------------------------------------------------------------------------
// Build a Google News RSS search URL
// ---------------------------------------------------------------------------

export function buildGoogleNewsUrl(options: {
  query: string;
  contextTerms?: string[];
  recencyDays?: number;
  language?: string;
}): string {
  const { query, contextTerms, recencyDays = 30, language = "en-US" } =
    options;

  // Core query: wrap the primary term in quotes for exact match
  let q = `"${query}"`;

  // If context terms provided, add an AND clause with OR'd terms
  if (contextTerms && contextTerms.length > 0) {
    const orClause = contextTerms.map((t) => `"${t}"`).join(" OR ");
    q += ` AND (${orClause})`;
  }

  // Append recency filter
  q += ` when:${recencyDays}d`;

  // Derive gl (country) and ceid from the language tag
  // language format: "en-US", "fr-FR", etc.
  const [lang, country] = language.split("-");
  const gl = country ?? "US";
  const hl = language; // e.g. "en-US"
  const ceid = `${gl}:${lang}`;

  // Build URL with URLSearchParams for proper encoding
  const params = new URLSearchParams({ q, hl, gl, ceid });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Resolve a Google News redirect URL to the actual article URL
// ---------------------------------------------------------------------------

export async function resolveGoogleNewsRedirect(
  googleUrl: string,
): Promise<string> {
  // SSRF protection: validate URL before fetching
  try {
    await assertSafeUrl(googleUrl);
  } catch {
    // If SSRF blocked, return original URL unchanged (same as fetch failure)
    return googleUrl;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);

    const response = await fetch(googleUrl, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // After following redirects, response.url is the final destination
    return response.url;
  } catch {
    // Timeout, network error, or abort -- return original URL unchanged
    return googleUrl;
  }
}
