"use client";

import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProfileType = "competitor" | "thought_leader" | "content_creator";
type Importance = "high" | "medium" | "low";

interface DiscoveryResult {
  platform: string;
  feedUrl: string | null;
  fetchMethod: string;
  status: "active" | "apify_needed" | "manual" | "failed";
  message: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  defaultType?: ProfileType;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_OPTIONS: { value: ProfileType; label: string }[] = [
  { value: "competitor", label: "Competitor" },
  { value: "thought_leader", label: "Thought Leader" },
  { value: "content_creator", label: "Content Creator" },
];

const IMPORTANCE_OPTIONS: { value: Importance; label: string }[] = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

// ---------------------------------------------------------------------------
// Discovery result badge
// ---------------------------------------------------------------------------

function DiscoveryBadge({ result }: { result: DiscoveryResult }) {
  const platformLabel =
    result.platform === "google_news"
      ? "Google News"
      : result.platform === "website"
        ? "Website"
        : result.platform.charAt(0).toUpperCase() + result.platform.slice(1);

  let color: string;
  let bg: string;
  let text: string;

  switch (result.status) {
    case "active":
      color = "#16a34a";
      bg = "rgba(22, 163, 74, 0.08)";
      text = result.feedUrl
        ? `RSS Found: ${truncateUrl(result.feedUrl)}`
        : result.message;
      break;
    case "apify_needed":
      color = "#d97706";
      bg = "rgba(217, 119, 6, 0.08)";
      text = "Apify required";
      break;
    case "manual":
      color = "#ef4444";
      bg = "rgba(239, 68, 68, 0.08)";
      text = "No RSS found";
      break;
    case "failed":
      color = "#ef4444";
      bg = "rgba(239, 68, 68, 0.08)";
      text = result.message || "Discovery failed";
      break;
    default:
      color = "var(--ink-tertiary)";
      bg = "var(--bg-muted)";
      text = result.message;
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 10px",
        borderRadius: 6,
        background: bg,
        gap: 8,
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 600, color, flexShrink: 0 }}>
        {platformLabel}
      </span>
      <span
        style={{
          fontSize: 11,
          color,
          textAlign: "right",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </span>
    </div>
  );
}

function truncateUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname + u.search;
    const display = u.host + (path.length > 1 ? path : "");
    return display.length > 40 ? display.slice(0, 40) + "..." : display;
  } catch {
    return url.length > 40 ? url.slice(0, 40) + "..." : url;
  }
}

// ---------------------------------------------------------------------------
// Shared input styles
// ---------------------------------------------------------------------------

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid var(--border-subtle)",
  background: "var(--bg-canvas)",
  color: "var(--ink-primary)",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  marginBottom: 4,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "var(--ink-secondary)",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AddProfileDialog({ open, onClose, defaultType }: Props) {
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [type, setType] = useState<ProfileType>(defaultType ?? "competitor");
  const [importance, setImportance] = useState<Importance>("medium");
  const [platformsOpen, setPlatformsOpen] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");

  // Discovery results state
  const [discoveryResults, setDiscoveryResults] = useState<
    DiscoveryResult[] | null
  >(null);
  const autoCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const utils = trpc.useUtils();

  // Reset form when defaultType changes or dialog opens
  useEffect(() => {
    if (open) {
      setType(defaultType ?? "competitor");
    }
  }, [open, defaultType]);

  function resetForm() {
    setName("");
    setWebsite("");
    setType(defaultType ?? "competitor");
    setImportance("medium");
    setPlatformsOpen(false);
    setLinkedinUrl("");
    setTwitterUrl("");
    setYoutubeUrl("");
    setDiscoveryResults(null);
    if (autoCloseTimer.current) {
      clearTimeout(autoCloseTimer.current);
      autoCloseTimer.current = null;
    }
  }

  function handleClose() {
    resetForm();
    void utils.profiles.list.invalidate();
    onClose();
  }

  const createMut = trpc.profiles.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Profile "${data.profile.name}" created`);
      setDiscoveryResults(data.discovery.results);

      // Auto-close after 3 seconds
      autoCloseTimer.current = setTimeout(() => {
        handleClose();
      }, 3000);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    // Build platform URLs array from non-empty inputs
    type PlatformName =
      | "website"
      | "linkedin"
      | "twitter"
      | "youtube"
      | "instagram"
      | "tiktok"
      | "reddit"
      | "substack"
      | "medium"
      | "podcast";
    const platformUrls: Array<{ platform: PlatformName; url: string }> = [];
    if (linkedinUrl.trim()) {
      platformUrls.push({
        platform: "linkedin",
        url: linkedinUrl.trim(),
      });
    }
    if (twitterUrl.trim()) {
      platformUrls.push({
        platform: "twitter",
        url: twitterUrl.trim(),
      });
    }
    if (youtubeUrl.trim()) {
      platformUrls.push({
        platform: "youtube",
        url: youtubeUrl.trim(),
      });
    }

    createMut.mutate({
      name: name.trim(),
      type,
      website: website.trim() || undefined,
      importance,
      platformUrls,
    });
  }

  if (!open) return null;

  const isSubmitting = createMut.isPending;
  const showResults = discoveryResults !== null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) handleClose();
      }}
    >
      <div
        style={{
          background: "var(--bg-surface)",
          borderRadius: 12,
          border: "1px solid var(--border-subtle)",
          width: 520,
          maxWidth: "95vw",
          maxHeight: "85vh",
          overflow: "auto",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
            {showResults ? "Discovery Results" : "Add Profile"}
          </h3>
          <button
            onClick={handleClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 18,
              color: "var(--ink-tertiary)",
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        {/* Body */}
        {showResults ? (
          /* Discovery results view */
          <div style={{ padding: 20 }}>
            <div
              style={{
                fontSize: 13,
                color: "var(--ink-secondary)",
                marginBottom: 16,
              }}
            >
              Auto-discovery found{" "}
              {discoveryResults.filter((r) => r.status === "active").length}{" "}
              active source
              {discoveryResults.filter((r) => r.status === "active").length !== 1
                ? "s"
                : ""}{" "}
              for <strong>{name}</strong>.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {discoveryResults.map((result, i) => (
                <DiscoveryBadge key={`${result.platform}-${i}`} result={result} />
              ))}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 20,
              }}
            >
              <button
                onClick={handleClose}
                style={{
                  padding: "8px 20px",
                  borderRadius: 6,
                  border: "none",
                  background: "var(--accent)",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Form view */
          <form onSubmit={handleSubmit} style={{ padding: 20 }}>
            {/* Name */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. HubSpot, Gary Vee, SaaStr"
                required
                maxLength={200}
                style={inputStyle}
              />
            </div>

            {/* Website URL */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Website URL</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
                style={{ ...inputStyle, fontFamily: "var(--font-mono)" }}
              />
            </div>

            {/* Type radio chips */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Type</label>
              <div style={{ display: "flex", gap: 6 }}>
                {TYPE_OPTIONS.map((opt) => {
                  const isActive = type === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setType(opt.value)}
                      style={{
                        flex: 1,
                        padding: "7px 10px",
                        borderRadius: 6,
                        border: `1.5px solid ${isActive ? "var(--accent)" : "var(--border-subtle)"}`,
                        background: isActive
                          ? "rgba(99,102,241,0.08)"
                          : "transparent",
                        color: isActive
                          ? "var(--accent)"
                          : "var(--ink-secondary)",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Importance radio chips */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Importance</label>
              <div style={{ display: "flex", gap: 6 }}>
                {IMPORTANCE_OPTIONS.map((opt) => {
                  const isActive = importance === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setImportance(opt.value)}
                      style={{
                        flex: 1,
                        padding: "7px 10px",
                        borderRadius: 6,
                        border: `1.5px solid ${isActive ? "var(--accent)" : "var(--border-subtle)"}`,
                        background: isActive
                          ? "rgba(99,102,241,0.08)"
                          : "transparent",
                        color: isActive
                          ? "var(--accent)"
                          : "var(--ink-secondary)",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Platform URLs — collapsible */}
            <div style={{ marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => setPlatformsOpen(!platformsOpen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--ink-secondary)",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    transition: "transform 0.15s",
                    transform: platformsOpen
                      ? "rotate(90deg)"
                      : "rotate(0deg)",
                    fontSize: 10,
                  }}
                >
                  &#9654;
                </span>
                Platform URLs (optional)
              </button>

              {platformsOpen && (
                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    padding: "12px",
                    borderRadius: 8,
                    background: "var(--bg-muted)",
                  }}
                >
                  <div>
                    <label
                      style={{
                        ...labelStyle,
                        fontSize: 10,
                        marginBottom: 3,
                      }}
                    >
                      LinkedIn URL
                    </label>
                    <input
                      type="url"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      placeholder="https://linkedin.com/company/example"
                      style={{
                        ...inputStyle,
                        fontSize: 12,
                        fontFamily: "var(--font-mono)",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        ...labelStyle,
                        fontSize: 10,
                        marginBottom: 3,
                      }}
                    >
                      Twitter/X URL
                    </label>
                    <input
                      type="url"
                      value={twitterUrl}
                      onChange={(e) => setTwitterUrl(e.target.value)}
                      placeholder="https://x.com/example"
                      style={{
                        ...inputStyle,
                        fontSize: 12,
                        fontFamily: "var(--font-mono)",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        ...labelStyle,
                        fontSize: 10,
                        marginBottom: 3,
                      }}
                    >
                      YouTube URL
                    </label>
                    <input
                      type="url"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="https://youtube.com/@example"
                      style={{
                        ...inputStyle,
                        fontSize: 12,
                        fontFamily: "var(--font-mono)",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                style={{
                  padding: "8px 14px",
                  borderRadius: 6,
                  border: "1px solid var(--border-subtle)",
                  background: "transparent",
                  color: "var(--ink-secondary)",
                  fontSize: 12,
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                style={{
                  padding: "8px 16px",
                  borderRadius: 6,
                  border: "none",
                  background: "var(--accent)",
                  color: "#fff",
                  fontSize: 12,
                  cursor: isSubmitting ? "wait" : "pointer",
                  fontWeight: 600,
                  opacity: isSubmitting || !name.trim() ? 0.5 : 1,
                }}
              >
                {isSubmitting
                  ? "Discovering sources..."
                  : "Add & Discover Sources"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
