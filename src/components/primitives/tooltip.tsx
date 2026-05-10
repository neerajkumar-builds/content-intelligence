"use client";

import { useState, useRef, type ReactNode } from "react";

interface TooltipProps {
  label: string;
  side?: "top" | "bottom" | "left" | "right";
  children: ReactNode;
}

export function Tooltip({ label, side = "top", children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = () => {
    timeout.current = setTimeout(() => setVisible(true), 200);
  };
  const hide = () => {
    clearTimeout(timeout.current);
    setVisible(false);
  };

  const positionStyles: Record<string, React.CSSProperties> = {
    top: { bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: 6 },
    bottom: { top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: 6 },
    left: { right: "100%", top: "50%", transform: "translateY(-50%)", marginRight: 6 },
    right: { left: "100%", top: "50%", transform: "translateY(-50%)", marginLeft: 6 },
  };

  return (
    <span
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {visible && (
        <span
          style={{
            position: "absolute",
            ...positionStyles[side],
            padding: "4px 8px",
            fontSize: 10.5,
            fontWeight: 500,
            color: "var(--ink-inverse)",
            background: "var(--ink-primary)",
            borderRadius: 4,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 100,
          }}
        >
          {label}
        </span>
      )}
    </span>
  );
}
