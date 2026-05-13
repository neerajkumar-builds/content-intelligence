# Module 3: Content Excellence — Positioning Guide

## Context

Brand Brief has 4 fields (wedge, icp, voiceTraits, antiPositioning). Luke's Positioning Agent concept has 11 sections that feed ALL content creation. This module transforms the Brand Brief into a full Positioning Guide — the foundation every draft, every prompt, every signal classification references.

**Goal:** Upgrade Brand Brief to 11-section Positioning Guide with structured + free-text sections, auto-generate from website + signals, inject into draft generation prompts, add pillar alignment to signal classification.

---

## The 11 Sections

### Free Text (4 sections)

| # | Section | Description | Maps to Legacy |
|---|---------|-------------|---------------|
| 1 | **Positioning Statement** | "For [audience] who [problem] we [solution] unlike [competitors]" | wedge (expanded) |
| 2 | **Audience Challenges** | What keeps your ICP up at night — pain points, frustrations | icp (expanded) |
| 3 | **Why These Challenges** | Root cause analysis — why the pain exists | NEW |
| 4 | **Cost of Inaction** | What happens if they don't act — urgency driver | NEW |

### Structured (7 sections)

| # | Section | Shape | Description |
|---|---------|-------|-------------|
| 5 | **Messaging Pillars** | `Array<{name: string, description: string}>` (3-5 items) | Strategic content themes. Each pillar = a content lane. Signals and ideas align to pillars. |
| 6 | **Brand Promises** | `{functional: string[], emotional: string[], business: string[]}` | What you deliver. Functional = features, emotional = feelings, business = ROI. |
| 7 | **Tone of Voice** | `{descriptors: string[], doThis: string[], dontDoThis: string[]}` | How to sound. Descriptors = adjectives. Do/Don't = specific writing rules. |
| 8 | **Key Phrases** | `string[]` | Approved phrases to use in content. Injected into prompts. |
| 9 | **Avoid Phrases** | `string[]` | Phrases to never use. "leverage", "synergy", etc. |
| 10 | **Market Vocabulary** | `string[]` | Resonant terms from competitive analysis. |
| 11 | **Audience Language** | `Record<string, {description: string, phrases: string[]}>` | Per-segment language. Key = segment name (e.g., "RevOps", "CMO", "CRO"). |

---

## Schema Design

### Modified Table: `brand_briefs`

Add one column:
```sql
ALTER TABLE brand_briefs ADD COLUMN sections JSONB NOT NULL DEFAULT '{}'::jsonb;
```

The 4 legacy columns (wedge, icp, voiceTraits, antiPositioning) stay for backward compatibility. The `sections` JSONB stores all 11 sections in a validated structure.

### Zod Schema for Sections

```typescript
const positioningGuideSchema = z.object({
  positioningStatement: z.string().default(""),
  audienceChallenges: z.string().default(""),
  whyChallenges: z.string().default(""),
  costOfInaction: z.string().default(""),
  messagingPillars: z.array(z.object({
    name: z.string(),
    description: z.string(),
  })).default([]),
  brandPromises: z.object({
    functional: z.array(z.string()).default([]),
    emotional: z.array(z.string()).default([]),
    business: z.array(z.string()).default([]),
  }).default({ functional: [], emotional: [], business: [] }),
  toneOfVoice: z.object({
    descriptors: z.array(z.string()).default([]),
    doThis: z.array(z.string()).default([]),
    dontDoThis: z.array(z.string()).default([]),
  }).default({ descriptors: [], doThis: [], dontDoThis: [] }),
  keyPhrases: z.array(z.string()).default([]),
  avoidPhrases: z.array(z.string()).default([]),
  marketVocabulary: z.array(z.string()).default([]),
  audienceLanguage: z.record(z.string(), z.object({
    description: z.string(),
    phrases: z.array(z.string()),
  })).default({}),
});
```

### Migration / Backward Compatibility

On READ (`brief.get`, `brief.getPositioningGuide`):
- If `sections` has data: return sections directly
- If `sections` is empty but legacy fields exist: map legacy → sections:
  - wedge → positioningStatement
  - icp → audienceChallenges
  - voiceTraits → toneOfVoice.descriptors (split by comma)
  - antiPositioning → (no direct mapping, stored as-is in legacy)

On WRITE (`brief.create`):
- Accept full sections JSONB
- Also populate legacy fields from sections for backward compat:
  - positioningStatement → wedge
  - audienceChallenges → icp
  - toneOfVoice.descriptors.join(", ") → voiceTraits
  - costOfInaction → antiPositioning (closest semantic match)

---

## Router Changes

### Modified: `src/server/routers/brief.ts`

**Existing procedures modified:**

1. `create` — input accepts `sections` (positioningGuideSchema). Stores in JSONB column. Also writes to legacy fields for backward compat. Version increments as before.

2. `get` — response merges legacy fields + sections JSONB into unified structure. Returns `{ ...legacyFields, sections: positioningGuideSchema }`.

3. `autoGenerate` — prompt expanded to produce all 11 sections. Uses website HTML + signal classification themes (from existing signals) as input. Returns full positioningGuideSchema.

**New procedures:**

4. `getPositioningGuide` — returns ONLY the sections data, formatted for LLM prompt injection. Used by generate-draft. Returns a flattened text block with all sections formatted for prompt context.

5. `updateSection` — partial update of a single section within the JSONB. Increments version. Useful for editing one section without rewriting the whole guide.

---

## Auto-Generate Enhancement

### Current Flow
Website HTML → strip tags → 5000 chars → LLM → 4 fields (wedge, icp, voiceTraits, antiPositioning)

### New Flow
Website HTML → strip tags → 5000 chars + Signal classification themes (from existing signals for this brand's workspace) → LLM → 11 sections

**Signal data input:** Query recent signal classifications:
```sql
SELECT DISTINCT jsonb_array_elements_text(metadata->'classification'->'themes') as theme
FROM signals WHERE workspace_id = ? AND processed = true
ORDER BY theme LIMIT 30
```
This gives the LLM market context: "These topics are trending in your space: AI, CRM, RevOps, enterprise..." → better pillars and vocabulary.

**LLM prompt for auto-generate:**
```
You are a brand positioning strategist. Analyze this company's website and market signal themes to create a comprehensive positioning guide.

WEBSITE CONTENT:
{websiteText}

MARKET SIGNAL THEMES (topics trending in this company's space):
{signalThemes}

Generate a complete positioning guide with these 11 sections. Return valid JSON only.

{
  "positioningStatement": "For [audience] who [problem] we [solution] unlike [competitors]",
  "audienceChallenges": "Pain points and frustrations...",
  "whyChallenges": "Root causes...",
  "costOfInaction": "What happens if they don't act...",
  "messagingPillars": [
    {"name": "Pillar Name", "description": "What this pillar means..."}
  ],
  "brandPromises": {
    "functional": ["Deploys in days", "Single system"],
    "emotional": ["Confidence", "Relief"],
    "business": ["Lower CAC", "Faster pipeline"]
  },
  "toneOfVoice": {
    "descriptors": ["Direct", "Opinionated", "Technical but accessible"],
    "doThis": ["Use active voice", "Lead with data"],
    "dontDoThis": ["Hedge with 'might'", "Use passive voice"]
  },
  "keyPhrases": ["agentic", "compounding", "production AI"],
  "avoidPhrases": ["leverage", "synergy", "best-in-class"],
  "marketVocabulary": ["pipeline velocity", "revenue operations"],
  "audienceLanguage": {
    "RevOps": {"description": "Revenue operations leaders", "phrases": ["workflows", "enrichment", "routing"]},
    "CMOs": {"description": "Chief marketing officers", "phrases": ["pipeline", "cost of acquisition"]}
  }
}
```

**Zod validation on output:** `positioningGuideSchema.safeParse(parsed)`. Graceful degradation: if parse fails, return what succeeded + error message for missing sections.

---

## Draft Generation Enhancement

### Current Prompt Variables
```
{brand_name}, {voice_traits}, {wedge}, {icp}, {anti_ai_rules},
{channel}, {format}, {format_guidelines},
{idea_hook}, {idea_angle}, {source_content}, {corpus_matches}
```

### New Prompt Variables (added)
```
{positioning_statement}, {audience_challenges}, {cost_of_inaction},
{messaging_pillars}, {brand_promises}, {tone_guidelines},
{key_phrases}, {avoid_phrases}, {audience_language}
```

### Updated System Prompt
```
You are a content writer for {brand_name}.

POSITIONING:
{positioning_statement}

AUDIENCE:
{audience_challenges}

MESSAGING PILLARS (align content to one of these):
{messaging_pillars}

TONE:
{tone_guidelines}

PHRASES TO USE: {key_phrases}
PHRASES TO AVOID: {avoid_phrases}

AUDIENCE-SPECIFIC LANGUAGE:
{audience_language}

BRAND PROMISES:
{brand_promises}

RULES (never violate):
{anti_ai_rules}
```

### How Variables Are Populated
In `generate-draft.ts`, Step 1 (fetch context):
```typescript
const guide = await brief.getPositioningGuide({ brandId });

// Pillars formatted as numbered list
const pillarsText = guide.messagingPillars
  .map((p, i) => `${i + 1}. ${p.name}: ${p.description}`)
  .join("\n");

// Tone formatted as do/don't
const toneText = [
  `Voice: ${guide.toneOfVoice.descriptors.join(", ")}`,
  `Do: ${guide.toneOfVoice.doThis.join("; ")}`,
  `Don't: ${guide.toneOfVoice.dontDoThis.join("; ")}`,
].join("\n");

// Audience language for the target channel's audience
const audienceText = Object.entries(guide.audienceLanguage)
  .map(([seg, data]) => `${seg}: ${data.phrases.join(", ")}`)
  .join("\n");
```

### Backward Compatibility
If sections JSONB is empty (old brand brief), fall back to legacy fields:
- `{positioning_statement}` → brief.wedge
- `{audience_challenges}` → brief.icp
- `{tone_guidelines}` → brief.voiceTraits
- Other new variables → empty string (omitted from prompt)

---

## Signal Classification Enhancement: Pillar Alignment

### Current Classification Output
```typescript
{ contentType, themes[], suggestedFormats[], contentAngle, relevanceScore }
```

### Enhanced Output (add pillar alignment)
```typescript
{
  contentType, themes[], suggestedFormats[], contentAngle, relevanceScore,
  pillarAlignment: string | null  // name of the most relevant messaging pillar
}
```

### How It Works
In `process-signal.ts` classify-signal step, the LLM prompt gets an additional context block:

```
BRAND MESSAGING PILLARS:
1. Production AI: Deploy AI agents that actually work in production
2. One System: Replace twelve vendors with one integrated platform
3. Compounding: Results compound over time, not campaign-based

Which messaging pillar (if any) does this signal most relate to?
Add "pillarAlignment": "pillar name" to your response.
```

The pillar names come from the active brand's positioning guide. If no guide exists, skip pillar alignment (graceful degradation).

### Impact on Ideas
- IdeaCard shows pillar tag: "Production AI" badge on ideas aligned to that pillar
- Idea Wall can filter by pillar (future enhancement, not in this spec)
- Profile detail "Your Ideas" tab groups by pillar (future enhancement)

---

## UI Design: Brand Brief Page Rewrite

### Layout
Replace current 4-field form with collapsible section editor.

**Header:** Same as current (brand name, website link, action buttons)

**Section List:** 11 collapsible sections, each showing:
- Section number + name
- Expand/collapse toggle
- Preview text (first 100 chars or item count for arrays)
- Edit button per section (or inline editing)

**Expanded Section:** Depends on type:
- Free text: textarea with auto-resize
- String array: tag input (type + enter to add, x to remove)
- Object array (pillars): repeating group with name + description inputs, add/remove buttons
- Nested object (promises, tone): grouped inputs with labels
- Record (audience language): segment name input + phrases tag list, add segment button

**Auto-Generate:** Button above sections. "Auto-generate from website + signals" → loading state → all sections populated → user reviews.

**Version History + Diff:** Same tab pattern as current, but diff shows all 11 sections.

**Empty State:** "Create your positioning guide to improve every draft. Auto-generate from your website or start from scratch."

### Tabs
- **Guide** (default): view/edit the 11 sections
- **History**: version list (same as current)
- **Diff**: side-by-side comparison (enhanced for 11 sections)

---

## Files Changed

### New Files
None — all changes are modifications to existing files.

### Modified Files

| File | Change |
|------|--------|
| `src/db/schema/brands.ts` | Add `sections` JSONB column to brand_briefs |
| `src/server/routers/brief.ts` | Expand create/get for 11 sections, add getPositioningGuide + updateSection, expand autoGenerate |
| `src/server/inngest/functions/generate-draft.ts` | Inject positioning guide sections into prompt variables |
| `src/server/inngest/functions/process-signal.ts` | Add pillar alignment to classification prompt |
| `src/lib/prompts/seed.ts` | Update DEFAULT_SYSTEM_PROMPT with new variables |
| `src/app/(app)/brand/page.tsx` | Complete rewrite: 11-section collapsible editor |
| `src/lib/webhooks/schemas.ts` | No change (signal schema unchanged) |
| `CLAUDE.md` | Update build state |

---

## Constraints

- Single JSONB column addition — no table restructuring
- NEVER drizzle-kit push — SQL migration via Supabase MCP
- Legacy fields preserved for backward compat
- LLM output Zod-validated with safeParse (graceful degradation)
- Inngest stays at 6 functions (no new functions needed)
- Auto-generate uses website HTML + signal themes (dual input)
- Pillar alignment is optional — skip if no positioning guide exists

---

## Cost Estimate

| Item | Cost | Frequency |
|------|------|-----------|
| Auto-generate 11 sections | ~$0.02/guide | Per generation (rare) |
| Pillar alignment per signal | ~$0.001 extra | Per signal (adds ~20 tokens to classification prompt) |
| **Marginal increase** | **~$2/month** | At 200 signals/day |

---

## Testing Plan

### E2E Flow
1. Navigate to /brand → see current 4-field brief
2. Click "Auto-generate" → loading → all 11 sections populated
3. Edit messaging pillars (add/remove/reorder)
4. Edit key phrases (tag input)
5. Save → version increments
6. Generate a draft from Idea Wall → draft content references positioning pillars and approved phrases
7. Check signal classification → pillar alignment tag appears on new signals

### Edge Cases
1. Brand with no brief → empty state, auto-generate CTA
2. Brand with legacy brief (4 fields, no sections) → legacy fields shown in corresponding sections
3. Auto-generate fails → partial results shown, error for missing sections
4. Signal classification without positioning guide → pillar alignment skipped (null)
5. Very long sections (5000+ chars) → auto-truncated for prompt injection (first 500 chars per section)
6. Version diff with 11 sections → all sections compared, changes highlighted

### Build Verification
- `pnpm build` passes
- New `sections` column exists in Supabase
- Auto-generate returns all 11 sections
- Draft generation includes new prompt variables
- Signal classification includes pillar alignment
