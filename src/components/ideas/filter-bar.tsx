"use client";

const SOURCES = [
  { id: "all", label: "All" },
  { id: "rss", label: "RSS" },
  { id: "reddit", label: "Reddit" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "apify", label: "Apify" },
  { id: "manual", label: "Manual" },
];

const SORTS = [
  { id: "hot", label: "Sort: Hot" },
  { id: "icp", label: "Sort: ICP fit" },
  { id: "fresh", label: "Sort: Freshest" },
];

export function FilterBar({
  filter,
  sort,
  count,
  onFilterChange,
  onSortChange,
  onAddIdea,
}: {
  filter: string;
  sort: string;
  count: number;
  onFilterChange: (filter: string) => void;
  onSortChange: (sort: string) => void;
  onAddIdea: () => void;
}) {
  return (
    <div
      style={{
        padding: "14px 24px",
        borderBottom: "1px solid var(--border-subtle)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexShrink: 0,
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: 1, minWidth: 200 }}>
        <h2 style={{ fontSize: 22, margin: 0, fontFamily: "var(--font-display)", fontWeight: 700 }}>
          Today&apos;s ideas
        </h2>
        <p style={{ fontSize: 11.5, color: "var(--ink-tertiary)", margin: "2px 0 0" }}>
          <span style={{ fontFamily: "var(--font-mono)" }}>{count}</span> ranked candidates
        </p>
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 2, padding: 2, background: "var(--bg-muted)", borderRadius: 6 }}>
        {SOURCES.map((s) => (
          <button
            key={s.id}
            onClick={() => onFilterChange(s.id)}
            style={{
              padding: "4px 10px",
              borderRadius: 4,
              border: 0,
              cursor: "pointer",
              background: filter === s.id ? "var(--bg-surface)" : "transparent",
              color: filter === s.id ? "var(--ink-primary)" : "var(--ink-secondary)",
              fontWeight: filter === s.id ? 600 : 500,
              fontSize: 11,
              boxShadow: filter === s.id ? "var(--shadow-sm)" : "none",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Sort */}
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value)}
        style={{
          height: 30,
          fontSize: 11.5,
          padding: "0 26px 0 8px",
          borderRadius: 6,
          border: "1px solid var(--border-subtle)",
          background: "var(--bg-surface)",
          color: "var(--ink-primary)",
          cursor: "pointer",
        }}
      >
        {SORTS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>

      <button
        onClick={onAddIdea}
        style={{
          padding: "6px 12px",
          fontSize: 11,
          background: "var(--accent)",
          color: "white",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        + Add idea
      </button>
    </div>
  );
}
