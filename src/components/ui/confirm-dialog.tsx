"use client";

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        style={{
          background: "var(--bg-surface)",
          borderRadius: 12,
          border: "1px solid var(--border-subtle)",
          width: 380,
          boxShadow: "0 20px 50px -12px rgba(0,0,0,0.25)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "20px 24px 12px" }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--ink-primary)" }}>
            {title}
          </h3>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--ink-secondary)", lineHeight: 1.5 }}>
            {message}
          </p>
        </div>
        <div style={{ padding: "12px 24px 20px", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "7px 16px",
              fontSize: 12,
              fontWeight: 500,
              borderRadius: 6,
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-surface)",
              color: "var(--ink-secondary)",
              cursor: "pointer",
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "7px 16px",
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 6,
              border: "none",
              background: destructive ? "#ef4444" : "var(--accent)",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
