/**
 * SSRF Protection — URL Safety Utility
 *
 * Validates that URLs don't resolve to internal/private/reserved IP ranges.
 * Prevents Server-Side Request Forgery attacks where user-supplied URLs
 * could probe internal infrastructure, cloud metadata endpoints (169.254.169.254),
 * or localhost services.
 *
 * Checks:
 *   1. Protocol must be http or https
 *   2. IP literal hostnames checked directly
 *   3. Domain hostnames resolved via DNS, all returned IPs checked
 *   4. Blocked: loopback, private, link-local, multicast, broadcast
 */

import dns from "node:dns";

const dnsResolve4 = dns.promises.resolve4;
const dnsResolve6 = dns.promises.resolve6;

export class SsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SsrfError";
  }
}

/**
 * Assert that a URL is safe to fetch (not targeting internal networks).
 * Throws SsrfError if the URL resolves to a blocked IP range.
 * If DNS resolution fails, the URL is allowed (it will fail at fetch time anyway).
 */
export async function assertSafeUrl(url: string): Promise<void> {
  // 1. Parse URL — reject non-http/https
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new SsrfError(`Invalid URL: ${url}`);
  }

  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== "http:" && protocol !== "https:") {
    throw new SsrfError(
      `Blocked protocol "${protocol}" — only http and https are allowed`,
    );
  }

  const hostname = parsed.hostname;

  // 2. Check if hostname is an IP literal (IPv4 or IPv6 in brackets)
  // IPv6 in URLs uses brackets: [::1], strip them
  const cleanHostname = hostname.replace(/^\[/, "").replace(/\]$/, "");

  if (isIpAddress(cleanHostname)) {
    // Direct IP — check immediately
    assertIpSafe(cleanHostname);
    return;
  }

  // 3. Domain hostname — resolve via DNS and check ALL returned IPs
  const ips: string[] = [];

  try {
    const ipv4s = await dnsResolve4(hostname);
    ips.push(...ipv4s);
  } catch {
    // DNS resolution failed for A records — continue to try AAAA
  }

  try {
    const ipv6s = await dnsResolve6(hostname);
    ips.push(...ipv6s);
  } catch {
    // DNS resolution failed for AAAA records
  }

  // If DNS failed entirely, allow through (fetch will fail anyway)
  if (ips.length === 0) return;

  // Check every resolved IP
  for (const ip of ips) {
    assertIpSafe(ip);
  }
}

// ---------------------------------------------------------------------------
// IP detection and validation
// ---------------------------------------------------------------------------

function isIpAddress(host: string): boolean {
  // IPv4: digits and dots
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  // IPv6: contains colons
  if (host.includes(":")) return true;
  return false;
}

function assertIpSafe(ip: string): void {
  if (ip.includes(":")) {
    assertIpv6Safe(ip);
  } else {
    assertIpv4Safe(ip);
  }
}

function assertIpv4Safe(ip: string): void {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    throw new SsrfError(`Invalid IPv4 address: ${ip}`);
  }

  const [a, b] = parts;

  // Loopback: 127.0.0.0/8
  if (a === 127) {
    throw new SsrfError(`Blocked loopback address: ${ip}`);
  }

  // Private: 10.0.0.0/8
  if (a === 10) {
    throw new SsrfError(`Blocked private address: ${ip}`);
  }

  // Private: 172.16.0.0/12 (172.16.x.x – 172.31.x.x)
  if (a === 172 && b >= 16 && b <= 31) {
    throw new SsrfError(`Blocked private address: ${ip}`);
  }

  // Private: 192.168.0.0/16
  if (a === 192 && b === 168) {
    throw new SsrfError(`Blocked private address: ${ip}`);
  }

  // Link-local: 169.254.0.0/16 (AWS metadata, cloud provider endpoints)
  if (a === 169 && b === 254) {
    throw new SsrfError(`Blocked link-local address: ${ip}`);
  }

  // Broadcast: 255.255.255.255
  if (a === 255 && b === 255 && parts[2] === 255 && parts[3] === 255) {
    throw new SsrfError(`Blocked broadcast address: ${ip}`);
  }

  // Multicast: 224.0.0.0/4 (224.x.x.x – 239.x.x.x)
  if (a >= 224 && a <= 239) {
    throw new SsrfError(`Blocked multicast address: ${ip}`);
  }

  // Reserved: 0.0.0.0/8
  if (a === 0) {
    throw new SsrfError(`Blocked reserved address: ${ip}`);
  }
}

function assertIpv6Safe(ip: string): void {
  const normalized = ip.toLowerCase();

  // Loopback: ::1
  if (normalized === "::1" || normalized === "0000:0000:0000:0000:0000:0000:0000:0001") {
    throw new SsrfError(`Blocked IPv6 loopback address: ${ip}`);
  }

  // Unspecified: ::
  if (normalized === "::" || normalized === "0000:0000:0000:0000:0000:0000:0000:0000") {
    throw new SsrfError(`Blocked IPv6 unspecified address: ${ip}`);
  }

  // Link-local: fe80::/10
  if (normalized.startsWith("fe80:") || normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") || normalized.startsWith("fea") ||
      normalized.startsWith("feb")) {
    throw new SsrfError(`Blocked IPv6 link-local address: ${ip}`);
  }

  // Multicast: ff00::/8
  if (normalized.startsWith("ff")) {
    throw new SsrfError(`Blocked IPv6 multicast address: ${ip}`);
  }

  // IPv4-mapped IPv6: ::ffff:x.x.x.x — extract and check IPv4 portion
  const v4MappedMatch = normalized.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (v4MappedMatch) {
    assertIpv4Safe(v4MappedMatch[1]);
  }

  // Unique local address (private): fc00::/7
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
    throw new SsrfError(`Blocked IPv6 unique-local (private) address: ${ip}`);
  }
}
