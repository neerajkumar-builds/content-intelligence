"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { ModelSelect, getModelLabel } from "@/components/ai/model-select";

const CHAR_LIMITS: Record<string, number> = {
  linkedin: 3000,
  twitter: 280,
  threads: 500,
  bluesky: 300,
};

const STATUS_BADGE_STYLES: Record<
  string,
  { bg: string; color: string; label: string }
> = {
  draft: { bg: "rgba(99,102,241,0.12)", color: "#6366f1", label: "Draft" },
  graded: { bg: "rgba(99,102,241,0.12)", color: "#6366f1", label: "Graded" },
  approved: { bg: "rgba(34,197,94,0.12)", color: "#22c55e", label: "Approved" },
  scheduled: { bg: "rgba(245,158,11,0.12)", color: "#f59e0b", label: "Scheduled" },
  publishing: { bg: "rgba(245,158,11,0.12)", color: "#f59e0b", label: "Publishing" },
  live: { bg: "rgba(22,163,74,0.15)", color: "#16a34a", label: "Live" },
  failed: { bg: "rgba(239,68,68,0.12)", color: "#ef4444", label: "Failed" },
};

export default function DraftEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [regenModelId, setRegenModelId] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("cia.preferredModel") ?? "gemini-2.0-flash"
      : "gemini-2.0-flash",
  );

  // Determine if we should poll (content still being generated)
  const isGenerating = (c: string | null | undefined) => !c || c.trim() === "";

  const { data: draft, isLoading } = trpc.drafts.get.useQuery(
    { draftId: id },
    {
      refetchInterval: (query) => {
        const d = query.state.data;
        if (d && isGenerating(d.content)) return 3000;
        return false;
      },
    },
  );

  const { data: publishStatus } = trpc.drafts.getPublishStatus.useQuery(
    { draftId: id },
    { refetchInterval: 5000 },
  );

  const updateMut = trpc.drafts.update.useMutation({
    onSuccess: () => {
      toast.success("Draft saved");
      setDirty(false);
      void utils.drafts.get.invalidate({ draftId: id });
    },
    onError: (err) => toast.error(err.message),
  });

  const approveMut = trpc.drafts.approve.useMutation({
    onSuccess: () => {
      toast.success("Draft approved");
      void utils.drafts.get.invalidate({ draftId: id });
    },
    onError: (err) => toast.error(err.message),
  });

  const regenerateMut = trpc.drafts.generate.useMutation({
    onSuccess: (data) => {
      toast.success("Regenerating with fresh AI output...");
      router.push(`/drafts/${data.draftId}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const publishMut = trpc.drafts.publish.useMutation({
    onSuccess: (data) => {
      if (data.skipped) {
        toast.info("Already published today (idempotency key matched)");
      } else {
        toast.success("Publishing started");
      }
      void utils.drafts.get.invalidate({ draftId: id });
      void utils.drafts.getPublishStatus.invalidate({ draftId: id });
    },
    onError: (err) => toast.error(err.message),
  });

  const { data: connectorsList } = trpc.connectors.list.useQuery();
  const linkedInConnector = connectorsList?.find(
    (c) => c.platform === "linkedin" && c.state === "healthy",
  );

  // Sync server data into local state (only when not dirty)
  useEffect(() => {
    if (draft && !dirty) {
      setTitle(draft.title ?? "");
      setContent(draft.content ?? "");
    }
  }, [draft, dirty]);

  const handleTitleChange = useCallback((val: string) => {
    setTitle(val);
    setDirty(true);
  }, []);

  const handleContentChange = useCallback((val: string) => {
    setContent(val);
    setDirty(true);
  }, []);

  function handleSave() {
    updateMut.mutate({
      draftId: id,
      title: title || undefined,
      content: content || undefined,
    });
  }

  function handleApprove() {
    approveMut.mutate({ draftId: id });
  }

  function handlePublish() {
    if (!linkedInConnector) {
      toast.error("Connect LinkedIn first (Settings > Connectors)");
      return;
    }
    publishMut.mutate({
      draftId: id,
      channel: channel,
      connectorId: linkedInConnector.id,
    });
  }

  const status = draft?.status ?? "draft";
  const channel = draft?.channel ?? "linkedin";
  const charLimit = CHAR_LIMITS[channel] ?? 3000;
  const charCount = content.length;
  const overLimit = charCount > charLimit;
  const editable = status === "draft" && !isGenerating(draft?.content);
  const generating = draft ? isGenerating(draft.content) : false;

  const badgeStyle = STATUS_BADGE_STYLES[status] ?? STATUS_BADGE_STYLES.draft;

  // Publish status helpers
  const livePost = publishStatus?.posts?.find((p) => p.status === "live");
  const publishingPost = publishStatus?.posts?.find((p) => p.status === "publishing");

  if (isLoading) {
    return (
      <div style={{ padding: 24 }}>
        <div
          style={{
            height: 32,
            width: 200,
            borderRadius: 6,
            background: "var(--bg-muted)",
            animation: "pulse 1.5s ease-in-out infinite",
            marginBottom: 16,
          }}
        />
        <div
          style={{
            height: 400,
            borderRadius: 8,
            background: "var(--bg-muted)",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      </div>
    );
  }

  if (!draft) {
    return (
      <div style={{ padding: 24, textAlign: "center", marginTop: 60 }}>
        <p style={{ fontSize: 14, color: "var(--ink-tertiary)" }}>Draft not found.</p>
        <button
          onClick={() => router.push("/drafts")}
          style={{
            marginTop: 12,
            padding: "6px 14px",
            fontSize: 12,
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Back to Drafts
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100%", minHeight: 0 }}>
      {/* Main content area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            padding: "12px 24px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => router.push("/drafts")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              fontSize: 12,
              color: "var(--ink-secondary)",
              background: "transparent",
              border: "1px solid var(--border-subtle)",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          {dirty && (
            <span style={{ fontSize: 11, color: "var(--ink-tertiary)" }}>
              Unsaved changes
            </span>
          )}
        </div>

        {/* Editor area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 24px 100px" }}>
          {generating ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div
                style={{
                  width: "100%",
                  maxWidth: 500,
                  margin: "0 auto",
                }}
              >
                <div
                  style={{
                    height: 24,
                    width: "60%",
                    borderRadius: 6,
                    background: "var(--bg-muted)",
                    animation: "pulse 1.5s ease-in-out infinite",
                    marginBottom: 16,
                  }}
                />
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      height: 14,
                      width: `${85 - i * 8}%`,
                      borderRadius: 4,
                      background: "var(--bg-muted)",
                      animation: "pulse 1.5s ease-in-out infinite",
                      marginBottom: 10,
                    }}
                  />
                ))}
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--ink-tertiary)",
                    marginTop: 24,
                  }}
                >
                  AI is generating your draft...
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Title input */}
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Draft title"
                disabled={!editable}
                style={{
                  width: "100%",
                  fontSize: 22,
                  fontWeight: 700,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: "var(--ink-primary)",
                  padding: "0 0 12px",
                  marginBottom: 16,
                  borderBottom: "1px solid var(--border-subtle)",
                  opacity: editable ? 1 : 0.6,
                }}
              />

              {/* Body textarea */}
              <textarea
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Start writing..."
                disabled={!editable}
                style={{
                  width: "100%",
                  minHeight: 400,
                  fontSize: 15,
                  lineHeight: 1.7,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: "var(--ink-primary)",
                  resize: "vertical",
                  padding: 0,
                  fontFamily: "var(--font-body, 'Lora', serif)",
                  opacity: editable ? 1 : 0.6,
                }}
              />
            </>
          )}
        </div>

        {/* Bottom action bar */}
        <div
          style={{
            padding: "12px 24px",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
            background: "var(--bg-canvas)",
          }}
        >
          <button
            onClick={handleSave}
            disabled={!dirty || updateMut.isPending}
            style={{
              padding: "7px 16px",
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 6,
              border: "1px solid var(--border-subtle)",
              background: dirty ? "var(--bg-surface)" : "var(--bg-muted)",
              color: dirty ? "var(--ink-primary)" : "var(--ink-tertiary)",
              cursor: dirty ? "pointer" : "default",
              opacity: dirty ? 1 : 0.5,
            }}
          >
            {updateMut.isPending ? "Saving..." : "Save"}
          </button>

          {status === "draft" && !generating && draft.ideaId && (
            <>
              <ModelSelect
                value={regenModelId}
                onChange={(m) => {
                  setRegenModelId(m);
                  if (typeof window !== "undefined") localStorage.setItem("cia.preferredModel", m);
                }}
                compact
              />
              <button
                onClick={() => {
                  regenerateMut.mutate({
                    ideaId: draft.ideaId!,
                    brandId: draft.brandId,
                    channel,
                    modelId: regenModelId,
                  });
                }}
                disabled={regenerateMut.isPending}
                style={{
                  padding: "7px 16px",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 6,
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-surface)",
                  color: "var(--ink-secondary)",
                  cursor: "pointer",
                }}
              >
                {regenerateMut.isPending ? "Regenerating..." : "Regenerate"}
              </button>
            </>
          )}

          {status === "draft" && !generating && content.trim() !== "" && (
            <button
              onClick={handleApprove}
              disabled={approveMut.isPending}
              style={{
                padding: "7px 16px",
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                border: "none",
                background: "#22c55e",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              {approveMut.isPending ? "Approving..." : "Approve"}
            </button>
          )}

          {status === "approved" && (
            <button
              onClick={handlePublish}
              disabled={!linkedInConnector || publishMut.isPending}
              title={
                !linkedInConnector
                  ? "Connect LinkedIn first"
                  : undefined
              }
              style={{
                padding: "7px 16px",
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                border: "none",
                background: linkedInConnector ? "#0a66c2" : "#6b7280",
                color: "#fff",
                cursor: linkedInConnector ? "pointer" : "not-allowed",
                opacity: linkedInConnector ? 1 : 0.6,
              }}
            >
              {publishMut.isPending
                ? "Publishing..."
                : !linkedInConnector
                  ? "Connect LinkedIn first"
                  : "Publish to LinkedIn"}
            </button>
          )}

          {/* Content actions */}
          {!generating && content && (
            <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${title}\n\n${content}`);
                  toast.success("Copied to clipboard");
                }}
                title="Copy content"
                style={{ padding: "5px 10px", fontSize: 11, borderRadius: 5, border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", color: "var(--ink-secondary)", cursor: "pointer" }}
              >
                Copy
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([`${title}\n\n${content}`], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${(title || "draft").replace(/[^a-zA-Z0-9]/g, "-").slice(0, 50)}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success("Downloaded");
                }}
                title="Download as text"
                style={{ padding: "5px 10px", fontSize: 11, borderRadius: 5, border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", color: "var(--ink-secondary)", cursor: "pointer" }}
              >
                Download
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("Link copied");
                }}
                title="Copy link to this draft"
                style={{ padding: "5px 10px", fontSize: 11, borderRadius: 5, border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", color: "var(--ink-secondary)", cursor: "pointer" }}
              >
                Share
              </button>
            </div>
          )}

          {livePost && (
            <a
              href={livePost.platformPostUrl ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#16a34a",
                textDecoration: "none",
                marginLeft: "auto",
              }}
            >
              Live on LinkedIn &rarr;
            </a>
          )}

          {!livePost && publishingPost && (
            <span
              style={{
                fontSize: 12,
                color: "#f59e0b",
                marginLeft: "auto",
              }}
            >
              Publishing...
            </span>
          )}
        </div>
      </div>

      {/* Side panel */}
      <aside
        style={{
          width: 260,
          flexShrink: 0,
          borderLeft: "1px solid var(--border-subtle)",
          background: "var(--bg-canvas)",
          padding: 20,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Status */}
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--ink-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 6,
            }}
          >
            Status
          </div>
          <span
            style={{
              display: "inline-block",
              padding: "4px 12px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              background: badgeStyle.bg,
              color: badgeStyle.color,
            }}
          >
            {badgeStyle.label}
          </span>
        </div>

        {/* Channel */}
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--ink-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 6,
            }}
          >
            Channel
          </div>
          <span
            style={{
              fontSize: 13,
              color: "var(--ink-primary)",
              textTransform: "capitalize",
            }}
          >
            {channel}
          </span>
        </div>

        {/* Character count */}
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--ink-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 6,
            }}
          >
            Characters
          </div>
          <span
            style={{
              fontSize: 13,
              fontFamily: "var(--font-mono)",
              color: overLimit ? "#ef4444" : "var(--ink-primary)",
            }}
          >
            {charCount.toLocaleString()}{" "}
            <span style={{ color: "var(--ink-tertiary)" }}>
              / {charLimit.toLocaleString()}
            </span>
          </span>
        </div>

        {/* Version */}
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--ink-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 6,
            }}
          >
            Version
          </div>
          <span
            style={{
              fontSize: 13,
              fontFamily: "var(--font-mono)",
              color: "var(--ink-primary)",
            }}
          >
            v{draft.version}
          </span>
        </div>

        {/* Created date */}
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--ink-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 6,
            }}
          >
            Created
          </div>
          <span style={{ fontSize: 13, color: "var(--ink-primary)" }}>
            {new Date(draft.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
        {/* AI Generation Info — from ai_calls via draft grades or heuristic */}
        {draft.content && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              AI Model
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-primary)", fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
              {getModelLabel(regenModelId)}
            </div>
            <div style={{ fontSize: 10, color: "var(--ink-tertiary)", marginTop: 2, fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}>
              {charCount > 0 ? `${charCount} chars` : "Generating..."}
            </div>
          </div>
        )}

        {/* Source idea */}
        {draft.ideaId && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              Source Idea
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-secondary)", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {draft.title || "Untitled idea"}
            </div>
            <button
              onClick={() => router.push(`/ideas?highlight=${draft.ideaId}`)}
              style={{ fontSize: 11, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline", textUnderlineOffset: 2 }}
            >
              View source idea
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
