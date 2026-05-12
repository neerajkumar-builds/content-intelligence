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
  { id: "relevance", label: "Sort: Relevance" },
  { id: "fresh", label: "Sort: Newest" },
  { id: "icp", label: "Sort: ICP fit" },
  { id: "hot", label: "Sort: Trending" },
];

export function FilterBar({
  filter,
  sort,
  count,
  dateFrom,
  dateTo,
  onFilterChange,
  onSortChange,
  onDateFromChange,
  onDateToChange,
  onAddIdea,
}: {
  filter: string;
  sort: string;
  count: number;
  dateFrom: string;
  dateTo: string;
  onFilterChange: (filter: string) => void;
  onSortChange: (sort: string) => void;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
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

      {/* Date range */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          style={{
            height: 30,
            fontSize: 11,
            padding: "0 6px",
            borderRadius: 6,
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-surface)",
            color: "var(--ink-primary)",
            cursor: "pointer",
            colorScheme: "dark light",
          }}
          title="From date"
        />
        <span style={{ fontSize: 10, color: "var(--ink-tertiary)" }}>to</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          style={{
            height: 30,
            fontSize: 11,
            padding: "0 6px",
            borderRadius: 6,
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-surface)",
            color: "var(--ink-primary)",
            cursor: "pointer",
            colorScheme: "dark light",
          }}
          title="To date"
        />
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { onDateFromChange(""); onDateToChange(""); }}
            style={{
              fontSize: 10,
              padding: "2px 6px",
              borderRadius: 4,
              border: "1px solid var(--border-subtle)",
              background: "transparent",
              color: "var(--ink-tertiary)",
              cursor: "pointer",
            }}
            title="Clear date filter"
          >
            Clear
          </button>
        )}
      </div>

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
