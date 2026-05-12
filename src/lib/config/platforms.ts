/**
 * Platform Configuration — Single Source of Truth
 *
 * Consolidates scattered constants from:
 *   - drafts/[id]/page.tsx (CHAR_LIMITS, CHANNEL_LABELS)
 *   - drafts/page.tsx (CHANNEL_LABELS)
 *   - generate-popover.tsx (CHANNELS, CHANNEL_FORMATS)
 *   - generate-draft.ts (FORMAT_GUIDELINES)
 *   - platforms.ts (Platform enum)
 */

export interface FormatConfig {
  id: string;
  label: string;
  guidelines: string;
}

export interface PlatformConfig {
  id: string;
  label: string;
  charLimit: number | null;
  premiumCharLimit: number | null;
  charUnit: "chars" | "bytes" | "graphemes";
  formats: FormatConfig[];
  tier: "tier1" | "tier2" | "tier3";
  oauthReady: boolean;
}

export const PLATFORMS: Record<string, PlatformConfig> = {
  linkedin: {
    id: "linkedin",
    label: "LinkedIn",
    charLimit: 3000,
    premiumCharLimit: null,
    charUnit: "chars",
    formats: [
      {
        id: "linkedin-long",
        label: "Long post",
        guidelines:
          "LinkedIn long post. 1500-3000 characters. Short paragraphs (2-3 sentences). Strong hook in first line. No hashtags in body. Conversational but professional.",
      },
      {
        id: "linkedin-short",
        label: "Short post",
        guidelines:
          "LinkedIn short post. 300-800 characters. Punchy. One core insight. Can end with a question to drive comments.",
      },
    ],
    tier: "tier1",
    oauthReady: true,
  },

  twitter: {
    id: "twitter",
    label: "X / Twitter",
    charLimit: 280,
    premiumCharLimit: 25000,
    charUnit: "chars",
    formats: [
      {
        id: "twitter-tweet",
        label: "Tweet",
        guidelines:
          "Single tweet. 280 characters max. Punchy and quotable. One clear takeaway. Can include 1-2 hashtags.",
      },
      {
        id: "twitter-thread",
        label: "Thread",
        guidelines:
          "Twitter thread of 5-8 tweets. Each tweet under 280 chars. Number each (1/N format). Build a narrative arc. First tweet is the hook.",
      },
    ],
    tier: "tier1",
    oauthReady: false,
  },

  instagram: {
    id: "instagram",
    label: "Instagram",
    charLimit: 2200,
    premiumCharLimit: null,
    charUnit: "chars",
    formats: [
      {
        id: "instagram-caption",
        label: "Caption",
        guidelines:
          "Instagram caption. 150-2200 characters. Conversational. Use line breaks for readability. End with a CTA. Hashtags at the end (5-10).",
      },
      {
        id: "carousel-script",
        label: "Carousel script",
        guidelines:
          "Instagram carousel script. 10 slides. Slide 1 = hook headline. Slides 2-9 = one key point each (1-2 sentences). Slide 10 = CTA. Label each slide.",
      },
    ],
    tier: "tier1",
    oauthReady: false,
  },

  threads: {
    id: "threads",
    label: "Threads",
    charLimit: 500,
    premiumCharLimit: null,
    charUnit: "chars",
    formats: [
      {
        id: "threads-post",
        label: "Post",
        guidelines:
          "Threads post. 500 characters max. Casual, conversational. One clear point. No hashtags.",
      },
    ],
    tier: "tier2",
    oauthReady: false,
  },

  tiktok: {
    id: "tiktok",
    label: "TikTok",
    charLimit: 2200,
    premiumCharLimit: null,
    charUnit: "chars",
    formats: [],
    tier: "tier2",
    oauthReady: false,
  },

  youtube: {
    id: "youtube",
    label: "YouTube",
    charLimit: 5000,
    premiumCharLimit: null,
    charUnit: "chars",
    formats: [],
    tier: "tier2",
    oauthReady: false,
  },

  reddit: {
    id: "reddit",
    label: "Reddit",
    charLimit: 40000,
    premiumCharLimit: 80000,
    charUnit: "chars",
    formats: [],
    tier: "tier2",
    oauthReady: false,
  },

  bluesky: {
    id: "bluesky",
    label: "Bluesky",
    charLimit: 300,
    premiumCharLimit: null,
    charUnit: "graphemes",
    formats: [],
    tier: "tier2",
    oauthReady: false,
  },

  facebook: {
    id: "facebook",
    label: "Facebook",
    charLimit: 63206,
    premiumCharLimit: null,
    charUnit: "chars",
    formats: [],
    tier: "tier2",
    oauthReady: false,
  },

  pinterest: {
    id: "pinterest",
    label: "Pinterest",
    charLimit: 500,
    premiumCharLimit: null,
    charUnit: "chars",
    formats: [],
    tier: "tier3",
    oauthReady: false,
  },

  mastodon: {
    id: "mastodon",
    label: "Mastodon",
    charLimit: 500,
    premiumCharLimit: null,
    charUnit: "chars",
    formats: [],
    tier: "tier3",
    oauthReady: false,
  },

  newsletter: {
    id: "newsletter",
    label: "Newsletter",
    charLimit: 10000,
    premiumCharLimit: null,
    charUnit: "chars",
    formats: [
      {
        id: "newsletter",
        label: "Article",
        guidelines:
          "Newsletter article. 800-1500 words. Include a subject line. Professional tone. Use headers to break sections. End with a call to action.",
      },
      {
        id: "newsletter-digest",
        label: "Digest",
        guidelines:
          "Newsletter digest. 3-5 curated items with 2-3 sentence commentary each. Include source links placeholder.",
      },
    ],
    tier: "tier1",
    oauthReady: false,
  },

  blog: {
    id: "blog",
    label: "Blog",
    charLimit: 15000,
    premiumCharLimit: null,
    charUnit: "chars",
    formats: [
      {
        id: "blog-article",
        label: "Article",
        guidelines:
          "Blog article. 1000-2000 words. Include H2 headers. SEO-friendly structure: intro, body sections, conclusion. Professional tone.",
      },
    ],
    tier: "tier1",
    oauthReady: false,
  },
} as const satisfies Record<string, PlatformConfig>;
