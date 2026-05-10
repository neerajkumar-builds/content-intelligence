"use client";

interface BriefField {
  label: string;
  body: string;
  meta: string;
}

export function BriefCards({ fields }: { fields: BriefField[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {fields.map((f) => (
        <div key={f.label} className="card" style={{ padding: 16 }}>
          <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 6 }}>{f.label}</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--ink-primary)" }}>{f.body}</div>
          <div style={{ fontSize: 10.5, color: "var(--ink-tertiary)", marginTop: 10, paddingTop: 8, borderTop: "1px dashed var(--border-subtle)" }}>{f.meta}</div>
        </div>
      ))}
    </div>
  );
}
