"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

function DriveIcon({ size = 20 }: { size?: number }) {
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

function SlackIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5.042 15.166a2.126 2.126 0 0 1-2.126 2.125A2.126 2.126 0 0 1 .79 15.166a2.126 2.126 0 0 1 2.126-2.125h2.126v2.125zm1.063 0a2.126 2.126 0 0 1 2.125-2.125 2.126 2.126 0 0 1 2.126 2.125v5.315A2.126 2.126 0 0 1 8.23 22.61a2.126 2.126 0 0 1-2.125-2.129v-5.315z" fill="#E01E5A" />
      <path d="M8.23 5.042a2.126 2.126 0 0 1-2.125-2.126A2.126 2.126 0 0 1 8.23.79a2.126 2.126 0 0 1 2.126 2.126v2.126H8.23zm0 1.078a2.126 2.126 0 0 1 2.126 2.11 2.126 2.126 0 0 1-2.126 2.126H2.916A2.126 2.126 0 0 1 .79 8.23a2.126 2.126 0 0 1 2.126-2.11H8.23z" fill="#36C5F0" />
      <path d="M18.958 8.23a2.126 2.126 0 0 1 2.126-2.11A2.126 2.126 0 0 1 23.21 8.23a2.126 2.126 0 0 1-2.126 2.126h-2.126V8.23zm-1.063 0a2.126 2.126 0 0 1-2.125 2.126 2.126 2.126 0 0 1-2.126-2.126V2.916A2.126 2.126 0 0 1 15.77.79a2.126 2.126 0 0 1 2.125 2.126V8.23z" fill="#2EB67D" />
      <path d="M15.77 18.958a2.126 2.126 0 0 1 2.125 2.126A2.126 2.126 0 0 1 15.77 23.21a2.126 2.126 0 0 1-2.126-2.126v-2.126h2.126zm0-1.063a2.126 2.126 0 0 1-2.126-2.125 2.126 2.126 0 0 1 2.126-2.126h5.314A2.126 2.126 0 0 1 23.21 15.77a2.126 2.126 0 0 1-2.126 2.125H15.77z" fill="#ECB22E" />
    </svg>
  );
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      style={{
        position: "relative", width: 36, height: 20, borderRadius: 10, border: "none",
        background: checked ? "var(--accent)" : "var(--bg-muted)",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.15s", flexShrink: 0, opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{
        position: "absolute", top: 2, left: checked ? 18 : 2,
        width: 16, height: 16, borderRadius: "50%", background: "#fff",
        transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </button>
  );
}

function mask(val: string, showLast = 4): string {
  if (!val || val.length <= showLast) return val;
  return "****" + val.slice(-showLast);
}

type TestState = "idle" | "testing" | "passed" | "failed";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", fontSize: 13, borderRadius: 6,
  border: "1px solid var(--border-default)", background: "var(--bg-canvas)",
  color: "var(--ink-primary)", outline: "none",
};
const inputDisabled: React.CSSProperties = {
  ...inputStyle, background: "var(--bg-muted)", color: "var(--ink-tertiary)", cursor: "default",
};
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "var(--ink-secondary)", marginBottom: 4, display: "block" };
const helperStyle: React.CSSProperties = { fontSize: 11, color: "var(--ink-tertiary)", marginTop: 4 };
const cardStyle: React.CSSProperties = {
  padding: 24, borderRadius: 10, border: "1px solid var(--border-subtle)",
  background: "var(--bg-surface)", display: "flex", flexDirection: "column", gap: 16,
};

function btn(variant: "primary" | "secondary" | "outline", disabled: boolean): React.CSSProperties {
  if (variant === "primary") return {
    padding: "8px 18px", fontSize: 12, fontWeight: 600, borderRadius: 6, border: "none",
    background: disabled ? "var(--bg-muted)" : "var(--accent)",
    color: disabled ? "var(--ink-tertiary)" : "#fff",
    cursor: disabled ? "not-allowed" : "pointer",
  };
  return {
    padding: "8px 18px", fontSize: 12, fontWeight: 600, borderRadius: 6,
    border: "1px solid var(--border-subtle)", background: "var(--bg-surface)",
    color: disabled ? "var(--ink-tertiary)" : "var(--ink-secondary)",
    cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1,
  };
}

function StatusBadge({ variant, text }: { variant: "green" | "red" | "yellow"; text: string }) {
  const colors = { green: "#22c55e", red: "#ef4444", yellow: "#f59e0b" };
  const bgs = { green: "rgba(34,197,94,0.1)", red: "rgba(239,68,68,0.1)", yellow: "rgba(245,158,11,0.1)" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 4, background: bgs[variant], color: colors[variant] }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: colors[variant] }} />
      {text}
    </span>
  );
}

export default function SettingsPage() {
  const utils = trpc.useUtils();
  const { data: driveConfig } = trpc.integrations.getConfig.useQuery({ integrationType: "google_drive" });
  const { data: slackConfig } = trpc.integrations.getConfig.useQuery({ integrationType: "slack" });

  const [driveEditing, setDriveEditing] = useState(false);
  const [driveFolderId, setDriveFolderId] = useState("");
  const [driveEnabled, setDriveEnabled] = useState(false);
  const [driveTest, setDriveTest] = useState<TestState>("idle");
  const [driveTestMsg, setDriveTestMsg] = useState<string | null>(null);
  const [driveTestError, setDriveTestError] = useState<string | null>(null);

  const [slackEditing, setSlackEditing] = useState(false);
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [slackChannelName, setSlackChannelName] = useState("");
  const [slackEnabled, setSlackEnabled] = useState(false);
  const [slackTest, setSlackTest] = useState<TestState>("idle");
  const [slackTestError, setSlackTestError] = useState<string | null>(null);

  const hasDriveConfig = !!driveConfig?.config?.folderId;
  const hasSlackConfig = !!slackConfig?.hasSecret;

  useEffect(() => {
    if (driveConfig) {
      setDriveFolderId((driveConfig.config?.folderId as string) ?? "");
      setDriveEnabled(driveConfig.enabled);
      setDriveEditing(!driveConfig.config?.folderId);
    }
  }, [driveConfig]);

  useEffect(() => {
    if (slackConfig) {
      setSlackWebhookUrl(slackConfig.hasSecret ? "********" : "");
      setSlackChannelName((slackConfig.config?.channelName as string) ?? "");
      setSlackEnabled(slackConfig.enabled);
      setSlackEditing(!slackConfig.hasSecret);
    }
  }, [slackConfig]);

  const driveUpdateMut = trpc.integrations.updateConfig.useMutation({
    onSuccess: () => {
      toast.success("Google Drive settings saved");
      setDriveEditing(false);
      setDriveTest("idle");
      void utils.integrations.getConfig.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const slackUpdateMut = trpc.integrations.updateConfig.useMutation({
    onSuccess: () => {
      toast.success("Slack settings saved");
      setSlackEditing(false);
      setSlackTest("idle");
      void utils.integrations.getConfig.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const driveTestMut = trpc.integrations.testConnection.useMutation();
  const slackTestMut = trpc.integrations.testConnection.useMutation();

  function handleDriveEdit() {
    setDriveEditing(true);
    setDriveTest("idle");
    setDriveTestMsg(null);
    setDriveTestError(null);
  }

  function handleDriveCancel() {
    setDriveFolderId((driveConfig?.config?.folderId as string) ?? "");
    setDriveEnabled(driveConfig?.enabled ?? false);
    setDriveEditing(false);
    setDriveTest("idle");
    setDriveTestMsg(null);
    setDriveTestError(null);
  }

  function handleDriveFolderChange(val: string) {
    setDriveFolderId(val);
    setDriveTest("idle");
    setDriveTestMsg(null);
    setDriveTestError(null);
  }

  function handleDriveTest() {
    setDriveTest("testing");
    setDriveTestMsg(null);
    setDriveTestError(null);
    driveTestMut.mutate(
      { integrationType: "google_drive", folderId: driveFolderId },
      {
        onSuccess: (result) => {
          const folderName = (result as unknown as { folderName?: string }).folderName;
          setDriveTest("passed");
          setDriveTestMsg(folderName ? `Connected to "${folderName}"` : "Connection verified");
        },
        onError: (err) => {
          setDriveTest("failed");
          setDriveTestError(err.message);
        },
      },
    );
  }

  function handleDriveSave() {
    const shouldEnable = hasDriveConfig ? driveEnabled : true;
    setDriveEnabled(shouldEnable);
    driveUpdateMut.mutate({
      integrationType: "google_drive",
      config: { folderId: driveFolderId },
      enabled: shouldEnable,
    });
  }

  function handleSlackEdit() {
    setSlackEditing(true);
    setSlackWebhookUrl("");
    setSlackTest("idle");
    setSlackTestError(null);
  }

  function handleSlackCancel() {
    setSlackWebhookUrl(slackConfig?.hasSecret ? "********" : "");
    setSlackChannelName((slackConfig?.config?.channelName as string) ?? "");
    setSlackEnabled(slackConfig?.enabled ?? false);
    setSlackEditing(false);
    setSlackTest("idle");
    setSlackTestError(null);
  }

  function handleSlackUrlChange(val: string) {
    setSlackWebhookUrl(val);
    setSlackTest("idle");
    setSlackTestError(null);
  }

  function handleSlackTest() {
    if (!slackWebhookUrl || slackWebhookUrl === "********") {
      toast.error("Enter a webhook URL to test");
      return;
    }
    setSlackTest("testing");
    setSlackTestError(null);
    slackTestMut.mutate(
      { integrationType: "slack", webhookUrl: slackWebhookUrl },
      {
        onSuccess: () => { setSlackTest("passed"); toast.success("Test message sent to Slack"); },
        onError: (err) => { setSlackTest("failed"); setSlackTestError(err.message); },
      },
    );
  }

  function handleSlackSave() {
    const secret = slackWebhookUrl && slackWebhookUrl !== "********" ? slackWebhookUrl : undefined;
    const shouldEnable = hasSlackConfig ? slackEnabled : true;
    setSlackEnabled(shouldEnable);
    slackUpdateMut.mutate({
      integrationType: "slack",
      secret,
      config: { channelName: slackChannelName },
      enabled: shouldEnable,
    });
  }

  return (
    <div style={{ padding: "24px 24px 60px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>Settings</h1>
      <p style={{ margin: "0 0 28px", fontSize: 13, color: "var(--ink-tertiary)" }}>
        Configure output integrations for exporting approved drafts.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
        {/* ── Google Drive ── */}
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <DriveIcon size={24} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink-primary)" }}>Google Drive</div>
              <div style={{ fontSize: 11, color: "var(--ink-tertiary)" }}>Export approved drafts as Google Docs</div>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <Toggle checked={driveEnabled} onChange={(v) => { setDriveEnabled(v); if (hasDriveConfig && !driveEditing) { driveUpdateMut.mutate({ integrationType: "google_drive", config: { folderId: driveFolderId }, enabled: v }); } }} />
            </div>
          </div>

          {driveTest === "failed" ? (
            <StatusBadge variant="red" text={driveTestError ?? "Connection failed"} />
          ) : driveTest === "passed" ? (
            <StatusBadge variant="green" text="Connection verified" />
          ) : hasDriveConfig ? (
            <StatusBadge variant="green" text="Configured" />
          ) : (
            <StatusBadge variant="yellow" text="Not configured" />
          )}

          <div>
            <label style={labelStyle}>Folder ID</label>
            {driveEditing ? (
              <input type="text" value={driveFolderId} onChange={(e) => handleDriveFolderChange(e.target.value)} placeholder="e.g. 1aBcDeFgHiJkLmNoPq" style={inputStyle} />
            ) : (
              <div style={{ ...inputDisabled, padding: "8px 12px" }}>{mask(driveFolderId, 6)}</div>
            )}
            <p style={helperStyle}>The Google Drive folder ID. Find it in the folder URL after /folders/.</p>
          </div>

          {driveTestMsg && driveTest === "passed" && (
            <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", fontSize: 12, color: "#22c55e", fontWeight: 500 }}>
              {driveTestMsg}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            {driveEditing ? (
              <>
                <button onClick={handleDriveTest} disabled={driveTest === "testing" || !driveFolderId.trim()} style={btn("secondary", driveTest === "testing" || !driveFolderId.trim())}>
                  {driveTest === "testing" ? "Testing..." : "Test Connection"}
                </button>
                <button onClick={handleDriveSave} disabled={driveUpdateMut.isPending || driveTest !== "passed"} style={btn("primary", driveUpdateMut.isPending || driveTest !== "passed")}>
                  {driveUpdateMut.isPending ? "Saving..." : "Save"}
                </button>
                {hasDriveConfig && (
                  <button onClick={handleDriveCancel} style={btn("outline", false)}>Cancel</button>
                )}
              </>
            ) : (
              <button onClick={handleDriveEdit} style={btn("secondary", false)}>Edit</button>
            )}
          </div>

          {driveEditing && driveTest === "idle" && driveFolderId.trim() && (
            <p style={{ ...helperStyle, margin: 0 }}>Test the connection before saving.</p>
          )}
          {!driveEditing && (
            <p style={{ ...helperStyle, margin: 0 }}>Service account set via GOOGLE_SERVICE_ACCOUNT_JSON env var.</p>
          )}
        </div>

        {/* ── Slack ── */}
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <SlackIcon size={24} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink-primary)" }}>Slack</div>
              <div style={{ fontSize: 11, color: "var(--ink-tertiary)" }}>Send approved drafts to a Slack channel</div>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <Toggle checked={slackEnabled} onChange={(v) => { setSlackEnabled(v); if (hasSlackConfig && !slackEditing) { slackUpdateMut.mutate({ integrationType: "slack", config: { channelName: slackChannelName }, enabled: v }); } }} />
            </div>
          </div>

          {slackTest === "failed" ? (
            <StatusBadge variant="red" text={slackTestError ?? "Connection failed"} />
          ) : slackTest === "passed" ? (
            <StatusBadge variant="green" text="Test message sent" />
          ) : hasSlackConfig ? (
            <StatusBadge variant="green" text="Webhook configured" />
          ) : (
            <StatusBadge variant="yellow" text="Not configured" />
          )}

          <div>
            <label style={labelStyle}>Webhook URL</label>
            {slackEditing ? (
              <input type="text" value={slackWebhookUrl} onChange={(e) => handleSlackUrlChange(e.target.value)} placeholder="https://hooks.slack.com/services/..." style={inputStyle} />
            ) : (
              <div style={{ ...inputDisabled, padding: "8px 12px" }}>********</div>
            )}
            <p style={helperStyle}>Create an incoming webhook in your Slack workspace settings.</p>
          </div>

          <div>
            <label style={labelStyle}>Channel Name</label>
            {slackEditing ? (
              <input type="text" value={slackChannelName} onChange={(e) => setSlackChannelName(e.target.value)} placeholder="#content-drafts" style={inputStyle} />
            ) : (
              <div style={{ ...inputDisabled, padding: "8px 12px" }}>{slackChannelName || "—"}</div>
            )}
            <p style={helperStyle}>For display only. The channel is determined by the webhook URL.</p>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            {slackEditing ? (
              <>
                <button onClick={handleSlackTest} disabled={slackTest === "testing" || !slackWebhookUrl.trim() || slackWebhookUrl === "********"} style={btn("secondary", slackTest === "testing" || !slackWebhookUrl.trim() || slackWebhookUrl === "********")}>
                  {slackTest === "testing" ? "Sending..." : "Send Test Message"}
                </button>
                <button onClick={handleSlackSave} disabled={slackUpdateMut.isPending || slackTest !== "passed"} style={btn("primary", slackUpdateMut.isPending || slackTest !== "passed")}>
                  {slackUpdateMut.isPending ? "Saving..." : "Save"}
                </button>
                {hasSlackConfig && (
                  <button onClick={handleSlackCancel} style={btn("outline", false)}>Cancel</button>
                )}
              </>
            ) : (
              <button onClick={handleSlackEdit} style={btn("secondary", false)}>Edit</button>
            )}
          </div>

          {slackEditing && slackTest === "idle" && slackWebhookUrl.trim() && slackWebhookUrl !== "********" && (
            <p style={{ ...helperStyle, margin: 0 }}>Send a test message before saving.</p>
          )}
        </div>
      </div>
    </div>
  );
}
