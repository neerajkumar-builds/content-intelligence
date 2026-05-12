const SLACK_TEXT_LIMIT = 2900;

interface SlackNotificationOptions {
  webhookUrl: string;
  title: string;
  content: string;
  draftUrl: string;
  channel?: string;
  format?: string;
  modelId?: string;
}

interface SlackResult {
  ok: boolean;
  truncated: boolean;
  error?: string;
}

interface TestResult {
  ok: boolean;
  error?: string;
}

function formatBlocks(opts: SlackNotificationOptions): Record<string, unknown> {
  const truncated = opts.content.length > SLACK_TEXT_LIMIT;
  const excerpt = truncated
    ? opts.content.slice(0, SLACK_TEXT_LIMIT) + "\n\n_Content truncated. View full draft in Content Intelligence._"
    : opts.content;

  const meta = [
    opts.channel && `*Channel:* ${opts.channel}`,
    opts.format && `*Format:* ${opts.format}`,
    opts.modelId && `*Model:* ${opts.modelId}`,
  ]
    .filter(Boolean)
    .join(" | ");

  const blocks: Array<Record<string, unknown>> = [
    {
      type: "header",
      text: { type: "plain_text", text: `Draft approved: ${opts.title}`, emoji: true },
    },
  ];

  if (meta) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: meta },
    });
  }

  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: `> ${excerpt.slice(0, 300).replace(/\n/g, "\n> ")}${opts.content.length > 300 ? "..." : ""}`,
    },
  });

  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text: "View in Content Intelligence" },
        url: opts.draftUrl,
        action_id: "view_draft",
      },
    ],
  });

  blocks.push({
    type: "context",
    elements: [
      { type: "mrkdwn", text: "Exported via Content Intelligence" },
    ],
  });

  return { blocks };
}

export async function sendSlackNotification(
  opts: SlackNotificationOptions,
): Promise<SlackResult> {
  const truncated = opts.content.length > SLACK_TEXT_LIMIT;
  const payload = formatBlocks(opts);

  const res = await fetch(opts.webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, truncated, error: `Slack returned ${res.status}: ${body.slice(0, 200)}` };
  }

  return { ok: true, truncated };
}

export async function testSlackConnection(
  webhookUrl: string,
): Promise<TestResult> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "Content Intelligence connected successfully.",
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Slack returned ${res.status}: ${body.slice(0, 200)}` };
    }

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Connection failed: ${msg.slice(0, 200)}` };
  }
}

const SLACK_WEBHOOK_PATTERN = /^https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[a-zA-Z0-9]+$/;

export function isValidSlackWebhookUrl(url: string): boolean {
  return SLACK_WEBHOOK_PATTERN.test(url);
}
