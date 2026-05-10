import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import * as schema from "./schema";

const SEED_ORG_ID = "org_dev_seed_001";

async function seed() {
  const connectionString =
    process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL!;
  const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  const db = drizzle({ client: pool, schema });

  const existing = await db
    .select()
    .from(schema.workspaces)
    .where(eq(schema.workspaces.clerkOrgId, SEED_ORG_ID))
    .limit(1);

  if (existing.length > 0) {
    console.log("Seed data already exists. Delete workspace to re-seed.");
    console.log(`Workspace ID: ${existing[0].id}`);
    return;
  }

  console.log("Seeding development data...");

  // 1. Workspace
  const [workspace] = await db
    .insert(schema.workspaces)
    .values({
      clerkOrgId: SEED_ORG_ID,
      name: "FullFunnel.co",
      plan: "team",
      monthlyAiBudgetCents: 50000,
    })
    .returning();
  console.log(`  Workspace: ${workspace.id}`);

  // 2. Brands
  const [brand1] = await db
    .insert(schema.brands)
    .values({
      workspaceId: workspace.id,
      name: "FullFunnel.co",
      voiceScore: "0.91",
      active: true,
    })
    .returning();

  const [brand2] = await db
    .insert(schema.brands)
    .values({
      workspaceId: workspace.id,
      name: "say2neeraj.com",
      voiceScore: "0.84",
      active: true,
    })
    .returning();
  console.log(`  Brands: ${brand1.id}, ${brand2.id}`);

  // 3. Member
  await db.insert(schema.members).values({
    workspaceId: workspace.id,
    clerkUserId: "user_dev_seed_001",
    email: "neeraj@fullfunnel.co",
    name: "Neeraj",
    role: "owner",
  });

  // 4. Anti-AI rules (from govern.jsx)
  const rules = [
    { phraseOrPattern: "em-dash (—)", category: "punctuation" as const, action: "block" as const, hits30d: 47 },
    { phraseOrPattern: "semicolons in lists", category: "punctuation" as const, action: "block" as const, hits30d: 31 },
    { phraseOrPattern: "Furthermore / Moreover", category: "transition" as const, action: "rewrite" as const, hits30d: 28 },
    { phraseOrPattern: "In conclusion", category: "transition" as const, action: "block" as const, hits30d: 22 },
    { phraseOrPattern: "leverage", category: "corporate" as const, action: "rewrite" as const, hits30d: 19 },
    { phraseOrPattern: "synergy", category: "corporate" as const, action: "block" as const, hits30d: 15 },
    { phraseOrPattern: "at the end of the day", category: "cliche" as const, action: "flag" as const, hits30d: 12 },
    { phraseOrPattern: "game-changer", category: "cliche" as const, action: "rewrite" as const, hits30d: 10 },
    { phraseOrPattern: "I think / I believe", category: "filler" as const, action: "flag" as const, hits30d: 8 },
    { phraseOrPattern: "It goes without saying", category: "filler" as const, action: "block" as const, hits30d: 6 },
    { phraseOrPattern: "deep dive", category: "cliche" as const, action: "flag" as const, hits30d: 4 },
    { phraseOrPattern: "unlock value", category: "corporate" as const, action: "rewrite" as const, hits30d: 3 },
  ];

  await db.insert(schema.antiAiRules).values(
    rules.map((r) => ({
      workspaceId: workspace.id,
      phraseOrPattern: r.phraseOrPattern,
      category: r.category,
      severity: "warn" as const,
      action: r.action,
      hits30d: r.hits30d,
      enabled: true,
    })),
  );
  console.log(`  Rules: ${rules.length}`);

  // 5. Connectors (from govern.jsx cards)
  const connectorData = [
    { platform: "linkedin" as const, tier: "tier1" as const, state: "healthy" as const, accountName: "@neeraj-kumar" },
    { platform: "x" as const, tier: "tier1" as const, state: "healthy" as const, accountName: "@say2neeraj" },
    { platform: "beehiiv" as const, tier: "tier1" as const, state: "healthy" as const, accountName: "fullfunnel-newsletter" },
    { platform: "bluesky" as const, tier: "tier2" as const, state: "healthy" as const, accountName: "@neeraj.bsky.social" },
    { platform: "instagram" as const, tier: "tier2" as const, state: "reconnect" as const, accountName: "@fullfunnel.co" },
  ];

  const connectors = await db
    .insert(schema.connectors)
    .values(
      connectorData.map((c) => ({
        workspaceId: workspace.id,
        ...c,
      })),
    )
    .returning();
  console.log(`  Connectors: ${connectors.length}`);

  // 6. Ideas (from ideas.jsx)
  const ideaData = [
    {
      hook: "Most ops leaders think tool consolidation saves money. We deleted 11 tools last quarter — three made things worse.",
      angle: "Counter-intuitive · personal stakes",
      sourceKind: "reddit",
      sourceLabel: "r/ExperiencedDevs",
      sourceCitation: "comment thread, 412 upvotes",
      sourceUrl: "https://reddit.com/r/ExperiencedDevs",
      icpFit: "0.94",
      hotScore: 87,
      freshness: "2h",
      formats: ["linkedin-long", "x-thread", "newsletter"],
      tags: ["operations", "tooling-debt"],
      score: "8.50",
    },
    {
      hook: "Your ICP doc is fiction. Here’s the 3-signal test we run before writing a single word.",
      angle: "Methodology reveal · contrarian",
      sourceKind: "linkedin",
      sourceLabel: "Emily Zhang post",
      sourceCitation: "387 reactions",
      sourceUrl: "https://linkedin.com",
      icpFit: "0.91",
      hotScore: 74,
      freshness: "6h",
      formats: ["linkedin-long", "newsletter"],
      tags: ["ICP", "content-strategy"],
      score: "8.20",
    },
    {
      hook: "We A/B tested 200 hooks. The winner broke every ‘best practice’ rule in our playbook.",
      angle: "Data-backed · self-deprecating",
      sourceKind: "rss",
      sourceLabel: "Lenny’s Newsletter",
      sourceCitation: "Weekly roundup",
      sourceUrl: "https://lennysnewsletter.com",
      icpFit: "0.88",
      hotScore: 69,
      freshness: "1d",
      formats: ["x-thread", "linkedin-short"],
      tags: ["hooks", "testing"],
      score: "7.80",
    },
    {
      hook: "The real reason your LinkedIn posts get 12 likes: you sound like a press release.",
      angle: "Provocation · voice critique",
      sourceKind: "manual",
      sourceLabel: "Neeraj brainstorm",
      sourceCitation: "Internal note",
      sourceUrl: "#",
      icpFit: "0.86",
      hotScore: 62,
      freshness: "3h",
      formats: ["linkedin-long", "bluesky"],
      tags: ["voice", "linkedin"],
      score: "7.50",
    },
    {
      hook: "Every SaaS company says ‘we’re customer-obsessed.’ Here’s the Slack message that proved we weren’t.",
      angle: "Vulnerability · narrative",
      sourceKind: "apify",
      sourceLabel: "Competitor scan",
      sourceCitation: "HubSpot blog trend",
      sourceUrl: "https://hubspot.com/blog",
      icpFit: "0.82",
      hotScore: 55,
      freshness: "12h",
      formats: ["newsletter", "linkedin-long"],
      tags: ["customer-success", "vulnerability"],
      score: "7.20",
    },
    {
      hook: "AI content detectors are wrong 40% of the time. We tested 6 tools with human-written B2B posts.",
      angle: "Research · myth-busting",
      sourceKind: "reddit",
      sourceLabel: "r/contentmarketing",
      sourceCitation: "top post, 289 upvotes",
      sourceUrl: "https://reddit.com/r/contentmarketing",
      icpFit: "0.79",
      hotScore: 48,
      freshness: "2d",
      formats: ["linkedin-long", "x-thread", "beehiiv"],
      tags: ["anti-AI", "research"],
      score: "6.90",
    },
  ];

  await db.insert(schema.ideas).values(
    ideaData.map((idea) => ({
      workspaceId: workspace.id,
      brandId: brand1.id,
      ...idea,
    })),
  );
  console.log(`  Ideas: ${ideaData.length}`);

  // 7. Drafts + grades (from draft.jsx)
  const [draft1] = await db
    .insert(schema.drafts)
    .values({
      workspaceId: workspace.id,
      brandId: brand1.id,
      title: "Tool consolidation isn't procurement",
      content:
        "Most ops leaders think tool consolidation saves money. We deleted 11 tools last quarter — three made things worse.\n\nHere’s what nobody talks about: the hidden cost isn’t the subscription. It’s the workflow that grew around the tool over 3 years.",
      status: "graded",
      channel: "linkedin",
      version: 1,
    })
    .returning();

  await db.insert(schema.draftGrades).values({
    draftId: draft1.id,
    hook: "8.50",
    voice: "9.10",
    evidence: "7.20",
    formatFit: "8.80",
    controversy: "6.50",
    specificity: "8.00",
    cta: "7.50",
    composite: "7.94",
    gradedByModel: "claude-opus-4",
  });

  const [draft2] = await db
    .insert(schema.drafts)
    .values({
      workspaceId: workspace.id,
      brandId: brand1.id,
      title: "Your ICP doc is fiction",
      content:
        "Your ICP doc is fiction. Here’s the 3-signal test we run before writing a single word for a client.",
      status: "draft",
      channel: "linkedin",
      version: 1,
    })
    .returning();

  const [draft3] = await db
    .insert(schema.drafts)
    .values({
      workspaceId: workspace.id,
      brandId: brand1.id,
      title: "We A/B tested 200 hooks",
      content:
        "We A/B tested 200 hooks. The winner broke every ‘best practice’ rule in our playbook.",
      status: "approved",
      channel: "x",
      version: 2,
    })
    .returning();

  await db.insert(schema.draftGrades).values({
    draftId: draft3.id,
    hook: "9.00",
    voice: "8.50",
    evidence: "8.80",
    formatFit: "7.50",
    controversy: "7.00",
    specificity: "9.20",
    cta: "6.80",
    composite: "8.11",
    gradedByModel: "claude-sonnet-4",
  });
  console.log(`  Drafts: 3 (with grades)`);

  // 8. Schedule entries (from schedule.jsx)
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1);
  monday.setHours(9, 15, 0, 0);

  const scheduleEntries = [
    { draftId: draft1.id, channel: "linkedin", hoursOffset: 0 },
    { draftId: draft3.id, channel: "x", hoursOffset: 2 },
    { draftId: draft1.id, channel: "beehiiv", hoursOffset: 24 + 3 },
    { draftId: draft3.id, channel: "bluesky", hoursOffset: 48 + 5 },
  ];

  await db.insert(schema.schedules).values(
    scheduleEntries.map((s) => {
      const scheduledAt = new Date(monday);
      scheduledAt.setHours(monday.getHours() + s.hoursOffset);
      return {
        workspaceId: workspace.id,
        draftId: s.draftId,
        channel: s.channel,
        scheduledAt,
        timezone: "America/New_York",
      };
    }),
  );
  console.log(`  Schedules: ${scheduleEntries.length}`);

  // 9. Audit log entries (from extra.jsx)
  const auditEntries = [
    { actor: "Neeraj", action: "draft.create", subjectType: "draft", subjectId: draft1.id, diff: "Created from idea_a47" },
    { actor: "system", action: "grade.run", subjectType: "draft", subjectId: draft1.id, diff: "7-dim score: 7.94" },
    { actor: "Neeraj", action: "draft.approve", subjectType: "draft", subjectId: draft3.id, diff: "Status: graded → approved" },
    { actor: "system", action: "connector.health", subjectType: "connector", subjectId: connectors[0].id, diff: "LinkedIn: healthy" },
    { actor: "Neeraj", action: "rule.create", subjectType: "rule", subjectId: "seed", diff: "Added 12 anti-AI rules" },
    { actor: "system", action: "token.refresh", subjectType: "connector", subjectId: connectors[1].id, diff: "X token refreshed" },
    { actor: "Neeraj", action: "brand.update", subjectType: "brand", subjectId: brand1.id, diff: "Voice score: 0.89 → 0.91" },
    { actor: "system", action: "schedule.create", subjectType: "schedule", subjectId: "seed", diff: "4 posts scheduled" },
    { actor: "system", action: "signal.ingest", subjectType: "signal", subjectId: "seed", diff: "6 signals from 4 sources" },
  ];

  await db.insert(schema.auditLog).values(
    auditEntries.map((e) => ({
      workspaceId: workspace.id,
      ...e,
      traceId: `tr_seed_${Math.random().toString(36).slice(2, 10)}`,
    })),
  );
  console.log(`  Audit entries: ${auditEntries.length}`);

  console.log("\nSeed complete!");
  console.log(`Workspace: ${workspace.id} (clerkOrgId: ${SEED_ORG_ID})`);
  console.log(`Brands: ${brand1.name}, ${brand2.name}`);

  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
