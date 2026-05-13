import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { signals, webhookDeliveries, signalSourceConfigs } from "@/db/schema";
import { verifyHmac, payloadHash } from "@/lib/webhooks/verify-hmac";
import { batchPayloadSchema, signalPayloadSchema } from "@/lib/webhooks/schemas";
import { inngest } from "@/server/inngest/client";
import { SignalIngested } from "@/server/inngest/events";
import { sql, eq, and } from "drizzle-orm";

function isUniqueViolation(err: unknown): boolean {
  if (typeof err === "object" && err !== null && "code" in err) {
    return (err as { code: string }).code === "23505";
  }
  return false;
}

export async function POST(req: NextRequest) {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-n8n-signature") ?? "";

  if (!verifyHmac(secret, rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Handle error payloads from n8n (source fetch failures)
  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "error" in parsed &&
    (parsed as Record<string, unknown>).error === true
  ) {
    const errPayload = parsed as Record<string, unknown>;
    const sourceConfigId = errPayload.sourceConfigId as string | undefined;
    const workspaceId = errPayload.workspaceId as string | undefined;
    // Require workspaceId to scope the update — prevents cross-tenant writes
    if (sourceConfigId && workspaceId) {
      await db
        .update(signalSourceConfigs)
        .set({
          lastErrorAt: new Date(),
          lastErrorMessage:
            (errPayload.errorMessage as string) ?? "Unknown error",
        })
        .where(
          and(
            eq(signalSourceConfigs.id, sourceConfigId),
            eq(signalSourceConfigs.workspaceId, workspaceId),
          ),
        );
    }
    return NextResponse.json({ handled: "error" }, { status: 200 });
  }

  const isBatch =
    typeof parsed === "object" && parsed !== null && "signals" in parsed;
  const payloads = isBatch
    ? batchPayloadSchema.parse(parsed).signals
    : [signalPayloadSchema.parse(parsed)];

  const accepted: string[] = [];
  const skipped: string[] = [];

  for (const payload of payloads) {
    // sourceUrl-based dedup: skip if this URL already exists in the workspace
    if (payload.sourceUrl) {
      const [existing] = await db
        .select({ id: signals.id })
        .from(signals)
        .where(
          and(
            eq(signals.workspaceId, payload.workspaceId),
            eq(signals.sourceUrl, payload.sourceUrl),
          ),
        )
        .limit(1);
      if (existing) {
        skipped.push(payload.sourceUrl);
        continue;
      }
    }

    const hash = payloadHash(JSON.stringify(payload));

    let signalId: string;
    try {
      const result = await db.execute(sql`
        WITH delivery AS (
          INSERT INTO webhook_deliveries (workspace_id, source, payload_hash)
          VALUES (${payload.workspaceId}::uuid, 'n8n', ${hash})
          ON CONFLICT (payload_hash) DO NOTHING
          RETURNING id
        ),
        sig AS (
          INSERT INTO signals (workspace_id, source, source_url, title, body, metadata, profile_id, published_at)
          SELECT
            ${payload.workspaceId}::uuid,
            ${payload.source}::signal_source,
            ${payload.sourceUrl ?? null},
            ${payload.title},
            ${payload.body},
            ${JSON.stringify(payload.metadata ?? {})}::jsonb,
            ${payload.profileId ?? null}::uuid,
            ${payload.publishedAt ? new Date(payload.publishedAt).toISOString() : null}::timestamptz
          WHERE EXISTS (SELECT 1 FROM delivery)
          RETURNING id
        )
        SELECT sig.id FROM sig
      `);

      const rows = result as unknown as { id: string }[];
      if (!rows.length) {
        skipped.push(hash);
        continue;
      }
      signalId = rows[0].id;
    } catch (err) {
      if (isUniqueViolation(err)) {
        skipped.push(hash);
        continue;
      }
      throw err;
    }

    await inngest
      .send(
        SignalIngested.create({
          signalId,
          workspaceId: payload.workspaceId,
          profileId: payload.profileId,
        }),
      )
      .catch((err) => {
        console.error("Inngest send failed for signal", signalId, err);
      });

    accepted.push(signalId);
  }

  return NextResponse.json(
    { accepted: accepted.length, skipped: skipped.length, signalIds: accepted },
    { status: accepted.length > 0 ? 202 : 200 },
  );
}
