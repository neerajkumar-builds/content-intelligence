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

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        position: "relative",
        width: 36,
        height: 20,
        borderRadius: 10,
        border: "none",
        background: checked ? "var(--accent)" : "var(--bg-muted)",
        cursor: "pointer",
        transition: "background 0.15s",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.15s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  );
}

export default function SettingsPage() {
  const utils = trpc.useUtils();

  const { data: driveConfig, isLoading: driveLoading } = trpc.integrations.getConfig.useQuery({ integrationType: "google_drive" });
  const { data: slackConfig, isLoading: slackLoading } = trpc.integrations.getConfig.useQuery({ integrationType: "slack" });

  const [driveFolderId, setDriveFolderId] = useState("");
  const [driveEnabled, setDriveEnabled] = useState(false);
  const [driveTestResult, setDriveTestResult] = useState<string | null>(null);

  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [slackChannelName, setSlackChannelName] = useState("");
  const [slackEnabled, setSlackEnabled] = useState(false);

  useEffect(() => {
    if (driveConfig) {
      setDriveFolderId((driveConfig.config?.folderId as string) ?? "");
      setDriveEnabled(driveConfig.enabled);
    }
  }, [driveConfig]);

  useEffect(() => {
    if (slackConfig) {
      setSlackWebhookUrl(slackConfig.hasSecret ? "********" : "");
      setSlackChannelName((slackConfig.config?.channelName as string) ?? "");
      setSlackEnabled(slackConfig.enabled);
    }
  }, [slackConfig]);

  const driveUpdateMut = trpc.integrations.updateConfig.useMutation({
    onSuccess: (data) => {
      toast.success(data.updated ? "Drive settings saved" : "Drive integration created");
      void utils.integrations.getConfig.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const slackUpdateMut = trpc.integrations.updateConfig.useMutation({
    onSuccess: (data) => {
      toast.success(data.updated ? "Slack settings saved" : "Slack integration created");
      void utils.integrations.getConfig.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const driveTestMut = trpc.integrations.testConnection.useMutation();
  const slackTestMut = trpc.integrations.testConnection.useMutation();

  function handleDriveSave() {
    driveUpdateMut.mutate({
      integrationType: "google_drive",
      config: { folderId: driveFolderId },
      enabled: driveEnabled,
    });
  }

  function handleDriveTest() {
    setDriveTestResult(null);
    driveTestMut.mutate(
      { integrationType: "google_drive", folderId: driveFolderId },
      {
        onSuccess: (result) => {
          const folderName = (result as unknown as { folderName?: string }).folderName;
          setDriveTestResult(folderName ? `Connected to "${folderName}"` : "Connection successful");
          toast.success("Google Drive connection verified");
        },
        onError: (err) => {
          setDriveTestResult(null);
          toast.error(err.message);
        },
      },
    );
  }

  function handleSlackSave() {
    const secret = slackWebhookUrl === "********" || slackWebhookUrl === ""
      ? undefined
      : slackWebhookUrl;
    slackUpdateMut.mutate({
      integrationType: "slack",
      secret,
      config: { channelName: slackChannelName },
      enabled: slackEnabled,
    });
  }

  function handleSlackTest() {
    const webhookUrl = slackWebhookUrl !== "********" && slackWebhookUrl ? slackWebhookUrl : undefined;
    slackTestMut.mutate(
      { integrationType: "slack", webhookUrl },
      {
        onSuccess: () => toast.success("Test message sent to Slack"),
        onError: (err) => toast.error(err.message),
      },
    );
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    fontSize: 13,
    borderRadius: 6,
    border: "1px solid var(--border-default)",
    background: "var(--bg-canvas)",
    color: "var(--ink-primary)",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--ink-secondary)",
    marginBottom: 4,
    display: "block",
  };

  const helperStyle: React.CSSProperties = {
    fontSize: 11,
    color: "var(--ink-tertiary)",
    marginTop: 4,
  };

  const cardStyle: React.CSSProperties = {
    padding: 24,
    borderRadius: 10,
    border: "1px solid var(--border-subtle)",
    background: "var(--bg-surface)",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  };

  const buttonPrimaryStyle: React.CSSProperties = {
    padding: "8px 18px",
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 6,
    border: "none",
    background: "var(--accent)",
    color: "#fff",
    cursor: "pointer",
  };

  const buttonSecondaryStyle: React.CSSProperties = {
    padding: "8px 18px",
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 6,
    border: "1px solid var(--border-subtle)",
    background: "var(--bg-surface)",
    color: "var(--ink-secondary)",
    cursor: "pointer",
  };

  return (
    <div style={{ padding: "24px 24px 60px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>Settings</h1>
      <p style={{ margin: "0 0 28px", fontSize: 13, color: "var(--ink-tertiary)" }}>
        Configure output integrations for exporting approved drafts.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
        {/* Google Drive Card */}
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <DriveIcon size={24} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink-primary)" }}>Google Drive</div>
              <div style={{ fontSize: 11, color: "var(--ink-tertiary)" }}>
                Export approved drafts as Google Docs
              </div>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <Toggle checked={driveEnabled} onChange={setDriveEnabled} />
            </div>
          </div>

          <div>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontWeight: 600,
              padding: "3px 10px",
              borderRadius: 4,
              background: driveConfig?.hasSecret ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
              color: driveConfig?.hasSecret ? "#22c55e" : "#f59e0b",
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: driveConfig?.hasSecret ? "#22c55e" : "#f59e0b",
              }} />
              {driveConfig?.hasSecret ? "Service account configured" : "Not configured"}
            </span>
          </div>

          <div>
            <label style={labelStyle}>Folder ID</label>
            <input
              type="text"
              value={driveFolderId}
              onChange={(e) => setDriveFolderId(e.target.value)}
              placeholder="e.g. 1aBcDeFgHiJkLmNoPq"
              style={inputStyle}
            />
            <p style={helperStyle}>
              The Google Drive folder ID where exported docs will be saved. Find it in the folder URL after /folders/.
            </p>
          </div>

          {driveTestResult && (
            <div style={{
              padding: "8px 12px",
              borderRadius: 6,
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.2)",
              fontSize: 12,
              color: "#22c55e",
              fontWeight: 500,
            }}>
              {driveTestResult}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button
              onClick={handleDriveTest}
              disabled={driveTestMut.isPending || !driveFolderId}
              style={{
                ...buttonSecondaryStyle,
                opacity: !driveFolderId ? 0.5 : 1,
                cursor: !driveFolderId ? "not-allowed" : "pointer",
              }}
            >
              {driveTestMut.isPending ? "Testing..." : "Test Connection"}
            </button>
            <button
              onClick={handleDriveSave}
              disabled={driveUpdateMut.isPending}
              style={buttonPrimaryStyle}
            >
              {driveUpdateMut.isPending ? "Saving..." : "Save"}
            </button>
          </div>

          <p style={{ ...helperStyle, margin: 0 }}>
            The service account JSON is set via the GOOGLE_SERVICE_ACCOUNT_JSON environment variable on the server.
          </p>
        </div>

        {/* Slack Card */}
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <SlackIcon size={24} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink-primary)" }}>Slack</div>
              <div style={{ fontSize: 11, color: "var(--ink-tertiary)" }}>
                Send approved drafts to a Slack channel
              </div>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <Toggle checked={slackEnabled} onChange={setSlackEnabled} />
            </div>
          </div>

          <div>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontWeight: 600,
              padding: "3px 10px",
              borderRadius: 4,
              background: slackConfig?.hasSecret ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
              color: slackConfig?.hasSecret ? "#22c55e" : "#f59e0b",
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: slackConfig?.hasSecret ? "#22c55e" : "#f59e0b",
              }} />
              {slackConfig?.hasSecret ? "Webhook configured" : "Not configured"}
            </span>
          </div>

          <div>
            <label style={labelStyle}>Webhook URL</label>
            <input
              type={slackWebhookUrl && slackWebhookUrl !== "********" ? "text" : "password"}
              value={slackWebhookUrl}
              onChange={(e) => setSlackWebhookUrl(e.target.value)}
              onFocus={(e) => {
                if (e.target.value === "********") {
                  setSlackWebhookUrl("");
                }
              }}
              placeholder="https://hooks.slack.com/services/..."
              style={inputStyle}
            />
            <p style={helperStyle}>
              Create an incoming webhook in your Slack workspace settings.
            </p>
          </div>

          <div>
            <label style={labelStyle}>Channel Name</label>
            <input
              type="text"
              value={slackChannelName}
              onChange={(e) => setSlackChannelName(e.target.value)}
              placeholder="#content-drafts"
              style={inputStyle}
            />
            <p style={helperStyle}>
              For display only. The actual channel is determined by the webhook URL.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button
              onClick={handleSlackTest}
              disabled={slackTestMut.isPending || !slackConfig?.hasSecret}
              style={{
                ...buttonSecondaryStyle,
                opacity: !slackConfig?.hasSecret ? 0.5 : 1,
                cursor: !slackConfig?.hasSecret ? "not-allowed" : "pointer",
              }}
            >
              {slackTestMut.isPending ? "Sending..." : "Send Test Message"}
            </button>
            <button
              onClick={handleSlackSave}
              disabled={slackUpdateMut.isPending}
              style={buttonPrimaryStyle}
            >
              {slackUpdateMut.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
