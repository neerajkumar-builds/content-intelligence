"use client";

interface ChannelMarkConfig {
  bg: string;
  label: string;
  color: string;
}

const channels: Record<string, ChannelMarkConfig> = {
  linkedin: { bg: "#0A66C2", label: "in", color: "#fff" },
  x: { bg: "#0A0A0A", label: "𝕏", color: "#fff" },
  beehiiv: { bg: "#FFC93C", label: "b", color: "#0A0A0A" },
  bluesky: { bg: "#1185FE", label: "B", color: "#fff" },
  substack: { bg: "#FF6719", label: "S", color: "#fff" },
  facebook: { bg: "#1877F2", label: "f", color: "#fff" },
  instagram: { bg: "#E4405F", label: "ig", color: "#fff" },
  youtube: { bg: "#FF0000", label: "▶", color: "#fff" },
  tiktok: { bg: "#010101", label: "♪", color: "#fff" },
  threads: { bg: "#000000", label: "@", color: "#fff" },
  reddit: { bg: "#FF4500", label: "r/", color: "#fff" },
  pinterest: { bg: "#BD081C", label: "P", color: "#fff" },
  hubspot: { bg: "#FF7A59", label: "H", color: "#fff" },
  medium: { bg: "#000000", label: "M", color: "#fff" },
  mastodon: { bg: "#6364FF", label: "M", color: "#fff" },
};

interface ChannelMarkProps {
  id: string;
  size?: number;
}

export function ChannelMark({ id, size = 14 }: ChannelMarkProps) {
  const ch = channels[id] || { bg: "var(--bg-muted)", label: "?", color: "var(--ink-primary)" };
  const fontSize = Math.max(size * 0.5, 7);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: size > 20 ? 6 : 3,
        background: ch.bg,
        color: ch.color,
        fontSize,
        fontWeight: 700,
        lineHeight: 1,
        flexShrink: 0,
        fontFamily: "var(--font-montserrat), system-ui, sans-serif",
      }}
    >
      {ch.label}
    </span>
  );
}
