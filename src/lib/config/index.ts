/**
 * Platform Config — Helper Functions
 *
 * Derive values from PLATFORMS and PLATFORM_DISPLAY configs.
 * All helpers return sensible defaults for unknown keys.
 */

export { PLATFORMS, type PlatformConfig, type FormatConfig } from "./platforms";
export { PLATFORM_DISPLAY, type PlatformDisplay } from "./display";

import { PLATFORMS, type FormatConfig } from "./platforms";
import { PLATFORM_DISPLAY } from "./display";

const DEFAULT_CHAR_LIMIT = 3000;

/**
 * Get the character limit for a channel.
 * Returns the platform's charLimit, or 3000 as a sensible default.
 */
export function getCharLimit(channel: string): number {
  return PLATFORMS[channel]?.charLimit ?? DEFAULT_CHAR_LIMIT;
}

/**
 * Get the human-readable label for a channel.
 * Falls back to capitalizing the channel id.
 */
export function getChannelLabel(channel: string): string {
  if (PLATFORMS[channel]) return PLATFORMS[channel].label;
  // Capitalize first letter as fallback
  return channel.charAt(0).toUpperCase() + channel.slice(1);
}

/**
 * Get format options for a channel (for the generate popover).
 * Returns empty array for platforms without defined formats.
 */
export function getFormats(channel: string): FormatConfig[] {
  return PLATFORMS[channel]?.formats ?? [];
}

/**
 * Find format guidelines by formatId across all platforms.
 * Returns empty string if the format is not found.
 */
export function getFormatGuidelines(formatId: string): string {
  for (const platform of Object.values(PLATFORMS)) {
    for (const format of platform.formats) {
      if (format.id === formatId) return format.guidelines;
    }
  }
  return "";
}

/**
 * Get the hex background color for a platform badge.
 * Returns a neutral gray for unknown platforms.
 */
export function getPlatformColor(channel: string): string {
  return PLATFORM_DISPLAY[channel]?.color ?? "#6b7280";
}

/**
 * Get the short icon text for a platform.
 * Returns "?" for unknown platforms.
 */
export function getPlatformIcon(channel: string): string {
  return PLATFORM_DISPLAY[channel]?.icon ?? "?";
}

/**
 * Get all channels that have formats defined (for the generate popover).
 * Returns id, label, and icon for each.
 */
export function getAllChannels(): Array<{ id: string; label: string; icon: string }> {
  return Object.values(PLATFORMS)
    .filter((p) => p.formats.length > 0)
    .map((p) => ({
      id: p.id,
      label: p.label,
      icon: PLATFORM_DISPLAY[p.id]?.icon ?? "?",
    }));
}

/**
 * Get platform ids where OAuth is ready (connected).
 */
export function getOAuthReadyPlatforms(): string[] {
  return Object.values(PLATFORMS)
    .filter((p) => p.oauthReady)
    .map((p) => p.id);
}
