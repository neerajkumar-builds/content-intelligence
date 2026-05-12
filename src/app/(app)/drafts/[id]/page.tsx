"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { ModelSelect, getModelLabel, MODELS } from "@/components/ai/model-select";
import { getCharLimit, getChannelLabel } from "@/lib/config";

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

function ProviderDot({ provider }: { provider: string }) {
  if (provider.includes("claude") || provider.includes("opus") || provider.includes("sonnet"))
    return <span style={{ color: "#d4a574", fontWeight: 700 }}>A</span>;
  if (provider.includes("gpt") || provider.includes("openai"))
    return <span style={{ color: "#9ca3af", fontWeight: 700 }}>O</span>;
  return <span style={{ color: "#4285f4", fontWeight: 700 }}>G</span>;
}

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
  const [regenModelId, setRegenModelId] = useState("gemini-2.0-flash");
  const [instructions, setInstructions] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("cia.preferredModel");
    if (saved) {
      if (MODELS.find((m) => m.id === saved)) {
        setRegenModelId(saved);
      } else {
        localStorage.removeItem("cia.preferredModel");
      }
    }
  }, []);

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

  const deleteMut = trpc.drafts.delete.useMutation({
    onSuccess: () => toast.success("Draft deleted"),
    onError: (err) => toast.error(err.message),
  });

  const regenerateMut = trpc.drafts.regenerate.useMutation({
    onSuccess: () => {
      toast.success("Regenerating...");
      setDirty(false);
      setInstructions("");
      setShowInstructions(false);
      void utils.drafts.get.invalidate({ draftId: id });
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

  const { data: snapshots } = trpc.drafts.listSnapshots.useQuery(
    { draftId: id },
    { refetchInterval: false },
  );

  const restoreMut = trpc.drafts.restoreSnapshot.useMutation({
    onSuccess: (data) => {
      toast.success(`Restored from v${data.fromVersion}`);
      setDirty(false);
      void utils.drafts.get.invalidate({ draftId: id });
      void utils.drafts.listSnapshots.invalidate({ draftId: id });
    },
    onError: (err) => toast.error(err.message),
  });

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
  const charLimit = getCharLimit(channel);
  const charCount = content.length;
  const overLimit = charCount > charLimit;
  const editable = status === "draft" && !isGenerating(draft?.content);
  const generating = draft ? isGenerating(draft.content) : false;

  const badgeStyle = STATUS_BADGE_STYLES[status] ?? STATUS_BADGE_STYLES.draft;

  // Publish status helpers
  const livePost = publishStatus?.posts?.find((p) => p.status === "live");
  const publishingPost = publishStatus?.posts?.find((p) => p.status === "publishing");
  const stuckGeneration = generating && draft
    ? (Date.now() - new Date(draft.updatedAt).getTime()) > 90_000
    : false;

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
            <div style={{ textAlign: "center", padding: "80px 20px" }}>
              <div style={{ width: "100%", maxWidth: 440, margin: "0 auto" }}>
              {stuckGeneration ? (
                <>
                  <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.4 }}>!</div>
                  <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600, color: "var(--ink-primary)" }}>
                    Generation timed out
                  </h3>
                  <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--ink-tertiary)", lineHeight: 1.5 }}>
                    The AI didn't respond in time. This can happen if the Inngest dev server isn't running or the model is overloaded.
                  </p>
                  <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                    {draft?.ideaId && (
                      <button
                        onClick={() => regenerateMut.mutate({ draftId: id, modelId: regenModelId, customInstructions: instructions || undefined })}
                        disabled={regenerateMut.isPending}
                        style={{ padding: "7px 16px", fontSize: 12, fontWeight: 600, borderRadius: 6, border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer" }}
                      >
                        {regenerateMut.isPending ? "Retrying..." : "Retry"}
                      </button>
                    )}
                    <button
                      onClick={() => { deleteMut.mutate({ draftId: id }); router.push("/drafts"); }}
                      style={{ padding: "7px 16px", fontSize: 12, fontWeight: 500, borderRadius: 6, border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", color: "var(--ink-secondary)", cursor: "pointer" }}
                    >
                      Delete
                    </button>
                  </div>
                </>
              ) : (
                <>
                {/* Animated writing icon */}
                <div style={{ position: "relative", width: 56, height: 56, margin: "0 auto 24px" }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: "50%",
                    background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.1))",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    animation: "pulse 2s ease-in-out infinite",
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838.838-2.872a2 2 0 0 1 .506-.855z" />
                    </svg>
                  </div>
                  <div style={{
                    position: "absolute", bottom: -2, right: -2,
                    width: 20, height: 20, borderRadius: "50%",
                    background: "var(--bg-surface)", border: "2px solid var(--border-subtle)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10,
                  }}>
                    <ProviderDot provider={draft?.modelId ?? regenModelId} />
                  </div>
                </div>

                <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 600, color: "var(--ink-primary)" }}>
                  Writing your draft
                </h3>
                <p style={{ margin: "0 0 24px", fontSize: 13, color: "var(--ink-tertiary)" }}>
                  Using <strong style={{ color: "var(--ink-secondary)" }}>{getModelLabel(draft?.modelId ?? regenModelId)}</strong> to craft content in your brand voice
                </p>

                {/* Animated progress steps */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left", maxWidth: 280, margin: "0 auto" }}>
                  {[
                    { label: "Reading brand voice & corpus", delay: "0s" },
                    { label: "Analyzing source idea", delay: "0.3s" },
                    { label: "Generating draft content", delay: "0.6s" },
                  ].map((step, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, opacity: 0, animation: `fadeIn 0.5s ease ${step.delay} forwards` }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: "var(--accent)",
                        animation: `pulse 1.5s ease-in-out ${step.delay} infinite`,
                      }} />
                      <span style={{ fontSize: 12, color: "var(--ink-secondary)" }}>{step.label}</span>
                    </div>
                  ))}
                </div>

                {/* Inline keyframes */}
                <style>{`
                  @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(4px); }
                    to { opacity: 1; transform: translateY(0); }
                  }
                `}</style>
                </>
              )}
              </div>
            </div>
          ) : (
            <>
              {/* Title input — textarea for wrapping, auto-height */}
              <textarea
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = `${el.scrollHeight}px`;
                }}
                placeholder="Draft title"
                disabled={!editable}
                rows={1}
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
                  resize: "none",
                  overflow: "hidden",
                  lineHeight: 1.3,
                  display: "block",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
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

        {/* Instruction input for regeneration */}
        {status === "draft" && !generating && content.trim() !== "" && draft.ideaId && (
          <div style={{ padding: "0 24px", flexShrink: 0 }}>
            {!showInstructions ? (
              <button
                onClick={() => setShowInstructions(true)}
                style={{
                  width: "100%",
                  padding: "8px 16px",
                  fontSize: 12,
                  color: "var(--ink-tertiary)",
                  background: "var(--bg-muted)",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                Add instructions for regeneration...
              </button>
            ) : (
              <div
                style={{
                  background: "var(--bg-muted)",
                  borderRadius: 8,
                  padding: "8px 16px",
                }}
              >
                <textarea
                  autoFocus
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setShowInstructions(false);
                    }
                  }}
                  placeholder="e.g. Make shorter, add statistics, rewrite as a thread..."
                  rows={2}
                  style={{
                    width: "100%",
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: "var(--ink-primary)",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    resize: "none",
                    padding: 0,
                    fontFamily: "inherit",
                  }}
                />
              </div>
            )}
          </div>
        )}

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
                dropUp
              />
              <button
                onClick={() => {
                  regenerateMut.mutate({
                    draftId: id,
                    modelId: regenModelId,
                    customInstructions: instructions || undefined,
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
            <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${title}\n\n${content}`);
                  toast.success("Copied to clipboard");
                }}
                title="Copy content"
                style={{ padding: "7px 14px", fontSize: 12, fontWeight: 500, borderRadius: 6, border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", color: "var(--ink-secondary)", cursor: "pointer" }}
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
                style={{ padding: "7px 14px", fontSize: 12, fontWeight: 500, borderRadius: 6, border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", color: "var(--ink-secondary)", cursor: "pointer" }}
              >
                Download
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("Link copied");
                }}
                title="Copy link to this draft"
                style={{ padding: "7px 14px", fontSize: 12, fontWeight: 500, borderRadius: 6, border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", color: "var(--ink-secondary)", cursor: "pointer" }}
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
            }}
          >
            {getChannelLabel(channel)}
          </span>
        </div>

        {/* Format */}
        {draft.format && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              Format
            </div>
            <span style={{ fontSize: 13, color: "var(--ink-primary)" }}>
              {draft.format.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
            </span>
          </div>
        )}

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
            <div style={{ fontSize: 13, color: "var(--ink-primary)", fontWeight: 500 }}>
              {getModelLabel(draft.modelId ?? regenModelId)}
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

        {/* Version History */}
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--ink-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 8,
            }}
          >
            Version History
          </div>
          {!snapshots || snapshots.length === 0 ? (
            <p style={{ fontSize: 11, color: "var(--ink-tertiary)", margin: 0 }}>
              No previous versions
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {snapshots.map((snap) => (
                <div
                  key={snap.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 6,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 11, lineHeight: 1.4 }}>
                      <span style={{ fontWeight: 700, color: "var(--ink-primary)" }}>
                        v{snap.version}
                      </span>
                      <span style={{ color: "var(--ink-tertiary)", margin: "0 4px" }}>·</span>
                      <span style={{ color: "var(--ink-secondary)" }}>
                        {getModelLabel(snap.modelId ?? "unknown")}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--ink-tertiary)",
                        lineHeight: 1.4,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {snap.instructions
                        ? `"${snap.instructions.length > 40 ? snap.instructions.slice(0, 40) + "..." : snap.instructions}"`
                        : "Fresh generation"}
                      <span style={{ margin: "0 4px" }}>·</span>
                      {relativeTime(snap.createdAt)}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      restoreMut.mutate({
                        draftId: id,
                        snapshotId: snap.id,
                      })
                    }
                    disabled={restoreMut.isPending}
                    style={{
                      flexShrink: 0,
                      padding: "2px 8px",
                      fontSize: 10,
                      fontWeight: 500,
                      borderRadius: 4,
                      border: "1px solid var(--border-subtle)",
                      background: "var(--bg-surface)",
                      color: "var(--ink-secondary)",
                      cursor: "pointer",
                      marginTop: 1,
                    }}
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
