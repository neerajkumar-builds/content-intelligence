/**
 * Platform Display Configuration — Colors, Icons, Text Colors
 *
 * Consolidates from:
 *   - channel-mark.tsx (hex bg/color)
 *   - generate-popover.tsx (icon text)
 *
 * Keys use the platform id (e.g. "twitter" not "x").
 * channel-mark.tsx uses "x" as key — consumers should map accordingly.
 */

export interface PlatformDisplay {
  color: string;    // hex background color
  icon: string;     // short icon text
  textColor: string; // text color for badge/mark
}

export const PLATFORM_DISPLAY: Record<string, PlatformDisplay> = {
  linkedin:   { color: "#0A66C2", icon: "in",  textColor: "#fff" },
  twitter:    { color: "#0A0A0A", icon: "\u{1D54F}",  textColor: "#fff" }, // 𝕏
  instagram:  { color: "#E4405F", icon: "◻",  textColor: "#fff" }, // ◻
  threads:    { color: "#000000", icon: "@",   textColor: "#fff" },
  facebook:   { color: "#1877F2", icon: "f",   textColor: "#fff" },
  tiktok:     { color: "#010101", icon: "♪",   textColor: "#fff" }, // ♪
  youtube:    { color: "#FF0000", icon: "▶",   textColor: "#fff" }, // ▶
  reddit:     { color: "#FF4500", icon: "r/",  textColor: "#fff" },
  bluesky:    { color: "#1185FE", icon: "B",   textColor: "#fff" },
  pinterest:  { color: "#BD081C", icon: "P",   textColor: "#fff" },
  mastodon:   { color: "#6364FF", icon: "M",   textColor: "#fff" },
  beehiiv:    { color: "#FFC93C", icon: "b",   textColor: "#0A0A0A" },
  substack:   { color: "#FF6719", icon: "S",   textColor: "#fff" },
  hubspot:    { color: "#FF7A59", icon: "H",   textColor: "#fff" },
  medium:     { color: "#000000", icon: "M",   textColor: "#fff" },
  newsletter: { color: "#6366f1", icon: "✉",  textColor: "#fff" }, // ✉
  blog:       { color: "#8b5cf6", icon: "¶",   textColor: "#fff" }, // ¶
};
