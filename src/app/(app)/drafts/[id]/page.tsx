"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { ModelSelect, getModelLabel, MODELS } from "@/components/ai/model-select";
import { getCharLimit, getChannelLabel } from "@/lib/config";

function DriveIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M8.01 18.26L2 8.66l4-6.86h8l-5.99 10.46z" fill="#0066DA" />
      <path d="M22 8.66l-4-6.86h-8l6 10.46 6-3.6z" fill="#00AC47" />
      <path d="M8.01 18.26h12L22 8.66l-6 3.6-7.99 6z" fill="#EA4335" />
      <path d="M8.01 18.26l2 3.46h8l2-3.46h-12z" fill="#00832D" />
      <path d="M2 8.66l2 3.46 4.01 6.14L14 8.66H2z" fill="#2684FC" />
      <path d="M14 8.66L8.01 18.26h12L22 8.66H14z" fill="#FFBA00" />
    </svg>
  );
}

function SlackIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5.042 15.166a2.126 2.126 0 0 1-2.126 2.125A2.126 2.126 0 0 1 .79 15.166a2.126 2.126 0 0 1 2.126-2.125h2.126v2.125zm1.063 0a2.126 2.126 0 0 1 2.125-2.125 2.126 2.126 0 0 1 2.126 2.125v5.315A2.126 2.126 0 0 1 8.23 22.61a2.126 2.126 0 0 1-2.125-2.129v-5.315z" fill="#E01E5A" />
      <path d="M8.23 5.042a2.126 2.126 0 0 1-2.125-2.126A2.126 2.126 0 0 1 8.23.79a2.126 2.126 0 0 1 2.126 2.126v2.126H8.23zm0 1.078a2.126 2.126 0 0 1 2.126 2.11 2.126 2.126 0 0 1-2.126 2.126H2.916A2.126 2.126 0 0 1 .79 8.23a2.126 2.126 0 0 1 2.126-2.11H8.23z" fill="#36C5F0" />
      <path d="M18.958 8.23a2.126 2.126 0 0 1 2.126-2.11A2.126 2.126 0 0 1 23.21 8.23a2.126 2.126 0 0 1-2.126 2.126h-2.126V8.23zm-1.063 0a2.126 2.126 0 0 1-2.125 2.126 2.126 2.126 0 0 1-2.126-2.126V2.916A2.126 2.126 0 0 1 15.77.79a2.126 2.126 0 0 1 2.125 2.126V8.23z" fill="#2EB67D" />
      <path d="M15.77 18.958a2.126 2.126 0 0 1 2.125 2.126A2.126 2.126 0 0 1 15.77 23.21a2.126 2.126 0 0 1-2.126-2.126v-2.126h2.126zm0-1.063a2.126 2.126 0 0 1-2.126-2.125 2.126 2.126 0 0 1 2.126-2.126h5.314A2.126 2.126 0 0 1 23.21 15.77a2.126 2.126 0 0 1-2.126 2.125H15.77z" fill="#ECB22E" />
    </svg>
  );
}

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
  const [expandedSnapshotId, setExpandedSnapshotId] = useState<string | null>(null);
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
    { enabled: false },
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
      void utils.drafts.listSnapshots.invalidate({ draftId: id });
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

  const [pendingExportId, setPendingExportId] = useState<string | null>(null);

  const exportDriveMut = trpc.drafts.exportToDrive.useMutation({
    onSuccess: (data) => {
      if (data.skipped) {
        toast.info("Export already in progress");
      } else {
        toast.success("Exporting to Google Drive...");
      }
      setPendingExportId(data.exportId);
      void utils.drafts.listDraftExports.invalidate({ draftId: id });
    },
    onError: (err) => toast.error(err.message),
  });

  const sendSlackMut = trpc.drafts.sendToSlack.useMutation({
    onSuccess: (data) => {
      if (data.skipped) {
        toast.info("Send already in progress");
      } else {
        toast.success("Sending to Slack...");
      }
      setPendingExportId(data.exportId);
      void utils.drafts.listDraftExports.invalidate({ draftId: id });
    },
    onError: (err) => toast.error(err.message),
  });

  const { data: exportStatus } = trpc.drafts.getExportStatus.useQuery(
    { exportId: pendingExportId! },
    {
      enabled: !!pendingExportId,
      refetchInterval: (query) => {
        const s = query.state.data?.status;
        if (s && s !== "pending" && s !== "processing") return false;
        return 2000;
      },
    },
  );

  useEffect(() => {
    if (!exportStatus) return;
    if (exportStatus.status === "completed") {
      const dest = exportStatus.destination === "google_drive" ? "Google Drive" : "Slack";
      toast.success(`Exported to ${dest}`);
      setPendingExportId(null);
      void utils.drafts.listDraftExports.invalidate({ draftId: id });
    } else if (exportStatus.status === "failed") {
      toast.error(exportStatus.errorMessage ?? "Export failed");
      setPendingExportId(null);
      void utils.drafts.listDraftExports.invalidate({ draftId: id });
    }
  }, [exportStatus?.status]);

  const { data: driveConfig } = trpc.integrations.getConfig.useQuery({ integrationType: "google_drive" });
  const { data: slackConfig } = trpc.integrations.getConfig.useQuery({ integrationType: "slack" });
  const driveReady = !!driveConfig?.enabled && !!driveConfig?.hasSecret;
  const slackReady = !!slackConfig?.enabled && !!slackConfig?.hasSecret;

  const { data: draftExports } = trpc.drafts.listDraftExports.useQuery(
    { draftId: id },
    { refetchInterval: false },
  );

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
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (!generating || !draft) { setElapsedSec(0); return; }
    const start = new Date(draft.updatedAt).getTime();
    setElapsedSec(Math.floor((Date.now() - start) / 1000));
    const interval = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [generating, draft?.updatedAt]);

  const stuckGeneration = elapsedSec > 90;

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
                  <span style={{ fontSize: 13, fontWeight: 400, color: "var(--ink-tertiary)", marginLeft: 8, fontFamily: "var(--font-mono)" }}>
                    {elapsedSec}s
                  </span>
                </h3>
                <p style={{ margin: "0 0 4px", fontSize: 13, color: "var(--ink-tertiary)" }}>
                  Using <strong style={{ color: "var(--ink-secondary)" }}>{getModelLabel(draft?.modelId ?? regenModelId)}</strong> to craft content in your brand voice
                </p>

                {/* Progressive status message */}
                <p style={{ margin: "0 0 24px", fontSize: 11.5, color: elapsedSec > 60 ? "#f59e0b" : "var(--ink-tertiary)" }}>
                  {elapsedSec < 15
                    ? "Usually takes 10–30 seconds"
                    : elapsedSec < 30
                      ? "Still working — AI is generating content..."
                      : elapsedSec < 60
                        ? "Taking a bit longer than usual. Model may be processing a complex topic."
                        : "This is taking longer than expected. You can wait, retry, or go back."}
                </p>

                {/* Animated progress steps */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "left", maxWidth: 280, margin: "0 auto" }}>
                  {[
                    { label: "Reading brand voice & corpus", done: elapsedSec >= 3 },
                    { label: "Analyzing source idea", done: elapsedSec >= 6 },
                    { label: "Generating draft content", done: false },
                  ].map((step, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: step.done ? "var(--good, #22c55e)" : "var(--accent)",
                        animation: step.done ? "none" : "pulse 1.5s ease-in-out infinite",
                      }} />
                      <span style={{ fontSize: 12, color: step.done ? "var(--ink-secondary)" : "var(--ink-tertiary)" }}>{step.label}</span>
                      {step.done && <span style={{ fontSize: 10, color: "var(--good, #22c55e)" }}>done</span>}
                    </div>
                  ))}
                </div>

                {/* Action buttons after 30s */}
                {elapsedSec >= 30 && (
                  <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 20 }}>
                    <button
                      onClick={() => router.push("/ideas")}
                      style={{ padding: "6px 14px", fontSize: 11.5, fontWeight: 500, borderRadius: 6, border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", color: "var(--ink-secondary)", cursor: "pointer" }}
                    >
                      Back to Idea Wall
                    </button>
                    <button
                      onClick={() => regenerateMut.mutate({ draftId: id, modelId: regenModelId })}
                      disabled={regenerateMut.isPending}
                      style={{ padding: "6px 14px", fontSize: 11.5, fontWeight: 600, borderRadius: 6, border: "none", background: "var(--accent)", color: "#fff", cursor: "pointer" }}
                    >
                      {regenerateMut.isPending ? "Retrying..." : "Retry now"}
                    </button>
                  </div>
                )}
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
          <div style={{ padding: "8px 24px 0", flexShrink: 0 }}>
            {!showInstructions ? (
              <button
                onClick={() => setShowInstructions(true)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  fontSize: 12,
                  color: "var(--ink-tertiary)",
                  background: "var(--bg-surface)",
                  border: "1px dashed var(--border-default)",
                  borderRadius: 8,
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span>Add AI instructions for regeneration...</span>
              </button>
            ) : (
              <div
                style={{
                  background: "var(--bg-surface)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  border: "1px solid var(--accent)",
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--accent)", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  AI Instructions
                </div>
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
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button
                onClick={() => exportDriveMut.mutate({ draftId: id })}
                disabled={!driveReady || exportDriveMut.isPending}
                title={!driveReady ? "Configure Google Drive in Settings" : "Export to Google Drive"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 6,
                  border: "none",
                  background: driveReady ? "#1a73e8" : "#6b7280",
                  color: "#fff",
                  cursor: driveReady ? "pointer" : "not-allowed",
                  opacity: driveReady ? 1 : 0.6,
                }}
              >
                {exportDriveMut.isPending ? (
                  <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                ) : (
                  <DriveIcon size={14} />
                )}
                {exportDriveMut.isPending ? "Exporting..." : "Export to Drive"}
              </button>
              <button
                onClick={() => sendSlackMut.mutate({ draftId: id })}
                disabled={!slackReady || sendSlackMut.isPending}
                title={!slackReady ? "Configure Slack in Settings" : "Send to Slack"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 6,
                  border: "none",
                  background: slackReady ? "#4a154b" : "#6b7280",
                  color: "#fff",
                  cursor: slackReady ? "pointer" : "not-allowed",
                  opacity: slackReady ? 1 : 0.6,
                }}
              >
                {sendSlackMut.isPending ? (
                  <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                ) : (
                  <SlackIcon size={14} />
                )}
                {sendSlackMut.isPending ? "Sending..." : "Send to Slack"}
              </button>
            </div>
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

          {pendingExportId && exportStatus && (exportStatus.status === "pending" || exportStatus.status === "processing") && (
            <span style={{ fontSize: 12, color: "#f59e0b", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ display: "inline-block", width: 10, height: 10, border: "2px solid rgba(245,158,11,0.3)", borderTopColor: "#f59e0b", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
              {exportStatus.destination === "google_drive" ? "Exporting to Drive..." : "Sending to Slack..."}
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

        {draftExports && draftExports.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              Export History
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {draftExports.map((exp) => (
                <div
                  key={exp.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 8px",
                    borderRadius: 6,
                    border: "1px solid var(--border-subtle)",
                    fontSize: 11,
                  }}
                >
                  {exp.destination === "google_drive" ? <DriveIcon size={12} /> : <SlackIcon size={12} />}
                  <span style={{ color: "var(--ink-secondary)", flex: 1 }}>
                    {exp.destination === "google_drive" ? "Drive" : "Slack"}
                  </span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "1px 6px",
                    borderRadius: 3,
                    background: exp.status === "completed" ? "rgba(34,197,94,0.12)" : exp.status === "failed" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
                    color: exp.status === "completed" ? "#22c55e" : exp.status === "failed" ? "#ef4444" : "#f59e0b",
                  }}>
                    {exp.status}
                  </span>
                  {exp.externalUrl && exp.status === "completed" && (
                    <a
                      href={exp.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ fontSize: 10, color: "var(--accent)", textDecoration: "none" }}
                    >
                      Open
                    </a>
                  )}
                  <span style={{ fontSize: 9, color: "var(--ink-tertiary)" }}>
                    {relativeTime(exp.createdAt)}
                  </span>
                </div>
              ))}
            </div>
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
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {snapshots.map((snap) => {
                const isExpanded = expandedSnapshotId === snap.id;
                return (
                  <div
                    key={snap.id}
                    style={{
                      borderRadius: 6,
                      border: isExpanded ? "1px solid var(--accent)" : "1px solid var(--border-subtle)",
                      overflow: "hidden",
                    }}
                  >
                    <button
                      onClick={() => setExpandedSnapshotId(isExpanded ? null : snap.id)}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        background: isExpanded ? "rgba(99,102,241,0.04)" : "transparent",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <div style={{ fontSize: 11, lineHeight: 1.4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>
                          <span style={{ fontWeight: 700, color: "var(--ink-primary)" }}>v{snap.version}</span>
                          <span style={{ color: "var(--ink-tertiary)", margin: "0 4px" }}>·</span>
                          <span style={{ color: "var(--ink-secondary)" }}>{getModelLabel(snap.modelId ?? "unknown")}</span>
                        </span>
                        <span style={{ fontSize: 10, color: "var(--ink-tertiary)" }}>{relativeTime(snap.createdAt)}</span>
                      </div>
                      <div style={{ fontSize: 10, color: "var(--ink-tertiary)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {snap.instructions ? `"${snap.instructions}"` : "Fresh generation"}
                      </div>
                    </button>
                    {isExpanded && (
                      <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "8px 10px" }}>
                        <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ink-tertiary)", marginBottom: 4 }}>Preview</div>
                        <div style={{ fontSize: 11, lineHeight: 1.5, color: "var(--ink-secondary)", maxHeight: 120, overflowY: "auto", whiteSpace: "pre-wrap", marginBottom: 8 }}>
                          {snap.content.length > 300 ? snap.content.slice(0, 300) + "..." : snap.content}
                        </div>
                        <button
                          onClick={() => restoreMut.mutate({ draftId: id, snapshotId: snap.id })}
                          disabled={restoreMut.isPending}
                          style={{
                            padding: "4px 10px",
                            fontSize: 10,
                            fontWeight: 600,
                            borderRadius: 4,
                            border: "none",
                            background: "var(--accent)",
                            color: "white",
                            cursor: "pointer",
                          }}
                        >
                          {restoreMut.isPending ? "Restoring..." : "Restore this version"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
