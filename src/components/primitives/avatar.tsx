"use client";

interface AvatarProps {
  name: string;
  size?: number;
}

export function Avatar({ name, size = 28 }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: size > 32 ? 8 : 6,
        background: "var(--accent-soft)",
        color: "var(--accent)",
        fontSize: Math.max(size * 0.38, 9),
        fontWeight: 700,
        flexShrink: 0,
        lineHeight: 1,
      }}
    >
      {initials}
    </span>
  );
}
