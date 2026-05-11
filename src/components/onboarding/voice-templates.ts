export interface VoiceTemplate {
  id: string;
  name: string;
  description: string;
  samplePosts: string[];
}

export const VOICE_TEMPLATES: VoiceTemplate[] = [
  {
    id: "direct",
    name: "Direct Operator",
    description: "Short paragraphs. Specific numbers. Contrarian assertions. Zero fluff.",
    samplePosts: [
      "We cut our content calendar from 20 posts/week to 6. Revenue went up 23%. The math isn't complicated — 6 posts that sound like you beat 20 that sound like ChatGPT.",
      "Stop asking 'what should we post about?' Start asking 'what did we learn this week that nobody's talking about?' The content writes itself after that.",
      "Our best-performing post last quarter had zero hashtags, no carousel, and one typo. It was a 4-sentence opinion I almost didn't publish.",
      "3 signs your ghostwriter doesn't understand your voice: (1) They use em-dashes. You don't. (2) Every paragraph starts with a transition. (3) The CTA sounds like a press release.",
      "I deleted 11 tools from our stack last month. Three of them were 'essential.' The team didn't notice for two weeks. That tells you everything.",
    ],
  },
  {
    id: "storyteller",
    name: "Storyteller",
    description: "Narrative arcs. Vulnerability. 'Here's what happened when...' structure.",
    samplePosts: [
      "Last Tuesday I got a DM that stopped me mid-scroll. A founder I'd never met wrote: 'Your post about failing at content marketing saved my team three months of mistakes.' Here's the post she was talking about, and why I almost deleted it.",
      "Two years ago I was the person writing 'leveraging synergies' in every LinkedIn post. I had 200 followers and zero inbound leads. Then a mentor told me something that changed everything: 'Write like you talk at dinner, not like you talk in boardrooms.'",
      "The worst content strategy meeting I ever sat through lasted 4 hours. We left with a 47-slide deck and zero clarity. The next week I tried something different — I wrote one post about a real mistake we made. It outperformed the entire month.",
      "Here's a story nobody on my team wants me to tell. We shipped a feature that broke 3 customer workflows. Instead of a PR statement, I wrote a LinkedIn post explaining exactly what went wrong. It became our most-shared content ever.",
      "I used to think vulnerability was weakness in B2B. Then I published a post about losing a $200K deal because of a bad demo. 14 prospects reached out that week. Not despite the honesty — because of it.",
    ],
  },
  {
    id: "analyst",
    name: "Data-Driven Analyst",
    description: "Benchmarks and charts. 'The data shows...' framing. Evidence-first.",
    samplePosts: [
      "We analyzed 2,847 B2B LinkedIn posts across 50 accounts. The top 1% share one trait: they lead with a specific number in the first 7 words. Not a stat about the industry — a number from their own experience.",
      "Content ROI data from Q1: 6 LinkedIn posts drove 34% of our pipeline. The other 18 posts? Combined for 4%. The takeaway isn't 'post less' — it's 'stop publishing posts you wouldn't screenshot and send to a friend.'",
      "I tracked my content performance for 90 days. Posts with questions as hooks: 3.2x avg engagement. Posts with 'Here's what I learned': 1.8x. Posts starting with 'I'm excited to announce': 0.4x. The data doesn't lie.",
      "We measured voice fidelity across 500 AI-generated drafts vs 500 human originals. The cosine similarity dropped below 0.7 after the third paragraph in 82% of AI drafts. That's where the 'AI smell' kicks in.",
      "Benchmark: B2B operators posting 3-5x/week on LinkedIn see 2.1x more inbound than those posting 1x/week. But the gap closes to 1.3x if the 5x poster uses generic content. Frequency without voice is noise.",
    ],
  },
  {
    id: "casual",
    name: "Casual Expert",
    description: "Conversational. Contractions. Questions as hooks. First-person.",
    samplePosts: [
      "You know what's weird about content marketing? Everyone talks about 'strategy' but nobody talks about the actual writing. Like, how do you make a LinkedIn post not sound like a robot wrote it? Here's what I've figured out.",
      "Can we talk about how most B2B content sounds exactly the same? Every company is 'disrupting' something, 'leveraging' something else, and 'unlocking value' for someone. What if we just... talked normally?",
      "I've been writing LinkedIn posts for 3 years and I still don't have a 'process.' I have a Notes app full of random thoughts and a rule: if I wouldn't say it at a bar, I don't post it. That's it. That's the strategy.",
      "Here's my hot take: your brand guidelines doc is probably hurting your content more than helping it. Why? Because it was written by committee and nobody actually writes like a committee. They write like themselves.",
      "So I tried this thing where I recorded myself explaining our product to my mom, then turned that recording into a LinkedIn post. It outperformed everything else that month. Maybe we should all write for our moms?",
    ],
  },
];

export const VOICE_STYLE_OPTIONS = [
  { id: "direct", label: "Direct Operator" },
  { id: "storyteller", label: "Storyteller" },
  { id: "analyst", label: "Data-Driven" },
  { id: "casual", label: "Casual Expert" },
  { id: "authoritative", label: "Authoritative" },
] as const;

export const INDUSTRY_OPTIONS = [
  "SaaS", "Agency", "E-commerce", "Fintech", "Healthcare", "Education", "Other",
] as const;

export const ROLE_OPTIONS = [
  "Founder", "Marketing Lead", "Content Manager", "Agency", "Other",
] as const;
