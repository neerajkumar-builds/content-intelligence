"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";

const SOURCES = [
  { id: "all", label: "All" },
  { id: "rss", label: "RSS" },
  { id: "reddit", label: "Reddit" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "twitter", label: "Twitter" },
  { id: "apify", label: "Apify" },
  { id: "manual", label: "Manual" },
];

function relativeTime(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function SignalExplorerPage() {
  const [sourceFilter, setSourceFilter] = useState("all");
  const [processedFilter, setProcessedFilter] = useState<"all" | "yes" | "no">("all");
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const limit = 50;

  type SourceType = "rss" | "reddit" | "linkedin" | "twitter" | "apify" | "manual" | "competitor" | "thought_leader";
  const { data, isLoading } = trpc.signals.listSignals.useQuery({
    source: sourceFilter === "all" ? undefined : (sourceFilter as SourceType),
    processed: processedFilter === "all" ? undefined : processedFilter === "yes",
    limit,
    offset: page * limit,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="fade-in" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "14px 24px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", flexShrink: 0 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 style={{ fontSize: 22, margin: 0, fontFamily: "var(--font-display)", fontWeight: 700 }}>
            Signals
          </h2>
          <p style={{ fontSize: 11.5, color: "var(--ink-tertiary)", margin: "2px 0 0" }}>
            <span style={{ fontFamily: "var(--font-mono)" }}>{total}</span> raw signals ingested
          </p>
        </div>

        {/* Source filter */}
        <div style={{ display: "flex", gap: 2, padding: 2, background: "var(--bg-muted)", borderRadius: 6 }}>
          {SOURCES.map((s) => (
            <button
              key={s.id}
              onClick={() => { setSourceFilter(s.id); setPage(0); }}
              style={{
                padding: "4px 10px",
                borderRadius: 4,
                border: 0,
                cursor: "pointer",
                background: sourceFilter === s.id ? "var(--bg-surface)" : "transparent",
                color: sourceFilter === s.id ? "var(--ink-primary)" : "var(--ink-secondary)",
                fontWeight: sourceFilter === s.id ? 600 : 500,
                fontSize: 11,
                boxShadow: sourceFilter === s.id ? "var(--shadow-sm)" : "none",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Processed filter */}
        <select
          value={processedFilter}
          onChange={(e) => { setProcessedFilter(e.target.value as "all" | "yes" | "no"); setPage(0); }}
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
          <option value="all">Status: All</option>
          <option value="yes">Processed</option>
          <option value="no">Unprocessed</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {isLoading ? (
          <div style={{ padding: 24 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ height: 48, borderRadius: 4, background: "var(--bg-muted)", marginBottom: 4, animation: "pulse 1.5s ease-in-out infinite" }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>~</div>
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600 }}>No signals found</h3>
            <p style={{ fontSize: 13, color: "var(--ink-tertiary)", margin: 0 }}>
              {sourceFilter !== "all" || processedFilter !== "all"
                ? "Try changing the filters."
                : "Signals are ingested from RSS feeds and other sources via n8n."}
            </p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)", position: "sticky", top: 0, background: "var(--bg-canvas)", zIndex: 2 }}>
                {["Source", "Title", "Date", "Status", ""].map((h) => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ink-tertiary)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((sig) => (
                <>
                  <tr
                    key={sig.id}
                    onClick={() => setExpandedId(expandedId === sig.id ? null : sig.id)}
                    style={{ borderBottom: "1px solid var(--border-subtle)", cursor: "pointer" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-muted)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <td style={{ padding: "10px 12px", width: 80 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ink-tertiary)", background: "var(--bg-muted)", padding: "2px 6px", borderRadius: 3 }}>
                        {sig.source}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ fontWeight: 500, marginBottom: 2 }}>{sig.title}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 500 }}>
                        {sig.body}
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap", fontSize: 11, color: "var(--ink-tertiary)" }}>
                      {relativeTime(sig.createdAt)}
                    </td>
                    <td style={{ padding: "10px 12px", width: 100 }}>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 500,
                        padding: "2px 8px",
                        borderRadius: 10,
                        background: sig.processed ? "rgba(34,197,94,0.12)" : "var(--bg-muted)",
                        color: sig.processed ? "#16a34a" : "var(--ink-tertiary)",
                      }}>
                        {sig.processed ? "processed" : "pending"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", width: 40 }}>
                      {sig.sourceUrl && (
                        <a
                          href={sig.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{ color: "var(--ink-tertiary)", fontSize: 12 }}
                          title="Open source"
                        >
                          ↗
                        </a>
                      )}
                    </td>
                  </tr>
                  {expandedId === sig.id && (
                    <tr key={`${sig.id}-detail`} style={{ background: "var(--bg-muted)" }}>
                      <td colSpan={5} style={{ padding: "12px 24px" }}>
                        <div style={{ fontSize: 12, lineHeight: 1.6, color: "var(--ink-secondary)", maxWidth: 800 }}>
                          {sig.body}
                        </div>
                        {sig.metadata && Object.keys(sig.metadata as object).length > 0 && (
                          <details style={{ marginTop: 8 }}>
                            <summary style={{ fontSize: 10, color: "var(--ink-tertiary)", cursor: "pointer" }}>Metadata</summary>
                            <pre style={{ fontSize: 10, color: "var(--ink-tertiary)", fontFamily: "var(--font-mono)", marginTop: 4, whiteSpace: "pre-wrap" }}>
                              {JSON.stringify(sig.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ padding: "8px 24px", borderTop: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: "var(--ink-tertiary)" }}>
            Page {page + 1} of {totalPages}
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              style={{ padding: "4px 10px", fontSize: 11, borderRadius: 4, border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", color: page === 0 ? "var(--ink-tertiary)" : "var(--ink-primary)", cursor: page === 0 ? "not-allowed" : "pointer" }}
            >
              Prev
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={!data?.hasMore}
              style={{ padding: "4px 10px", fontSize: 11, borderRadius: 4, border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", color: !data?.hasMore ? "var(--ink-tertiary)" : "var(--ink-primary)", cursor: !data?.hasMore ? "not-allowed" : "pointer" }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
