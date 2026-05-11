import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { signals, webhookDeliveries } from "@/db/schema";
import { verifyHmac, payloadHash } from "@/lib/webhooks/verify-hmac";
import { batchPayloadSchema, signalPayloadSchema } from "@/lib/webhooks/schemas";
import { inngest } from "@/server/inngest/client";
import { SignalIngested } from "@/server/inngest/events";

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

  const isBatch = typeof parsed === "object" && parsed !== null && "signals" in parsed;
  const payloads = isBatch
    ? batchPayloadSchema.parse(parsed).signals
    : [signalPayloadSchema.parse(parsed)];

  const accepted: string[] = [];
  const skipped: string[] = [];

  for (const payload of payloads) {
    const hash = payloadHash(JSON.stringify(payload));

    try {
      await db.insert(webhookDeliveries).values({
        workspaceId: payload.workspaceId,
        source: "n8n",
        payloadHash: hash,
      });
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        err.message.includes("unique") || err instanceof Error && err.message.includes("duplicate")
      ) {
        skipped.push(hash);
        continue;
      }
      throw err;
    }

    const [signal] = await db
      .insert(signals)
      .values({
        workspaceId: payload.workspaceId,
        source: payload.source,
        sourceUrl: payload.sourceUrl ?? null,
        title: payload.title,
        body: payload.body,
        metadata: payload.metadata ?? {},
      })
      .returning({ id: signals.id });

    await inngest
      .send(
        SignalIngested.create({
          signalId: signal.id,
          workspaceId: payload.workspaceId,
        }),
      )
      .catch(() => {});

    accepted.push(signal.id);
  }

  return NextResponse.json(
    { accepted: accepted.length, skipped: skipped.length, signalIds: accepted },
    { status: accepted.length > 0 ? 202 : 200 },
  );
}
