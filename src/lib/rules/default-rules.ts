export interface DefaultRule {
  phraseOrPattern: string;
  category: "punctuation" | "transition" | "filler" | "corporate" | "cliche" | "custom";
  severity: "block" | "warn" | "suggest" | "log";
  action: "block" | "rewrite" | "flag";
  patternType: "phrase" | "regex";
}

export const DEFAULT_RULES: DefaultRule[] = [
  // Punctuation (8)
  { phraseOrPattern: "em-dash (—)", category: "punctuation", severity: "block", action: "block", patternType: "phrase" },
  { phraseOrPattern: "semicolons in lists", category: "punctuation", severity: "warn", action: "block", patternType: "phrase" },
  { phraseOrPattern: "...", category: "punctuation", severity: "suggest", action: "flag", patternType: "phrase" },
  { phraseOrPattern: "exclamation marks", category: "punctuation", severity: "warn", action: "flag", patternType: "phrase" },
  { phraseOrPattern: "\\b\\d+\\)\\s", category: "punctuation", severity: "suggest", action: "flag", patternType: "regex" },
  { phraseOrPattern: "Oxford comma missing", category: "punctuation", severity: "log", action: "flag", patternType: "phrase" },
  { phraseOrPattern: "double spaces", category: "punctuation", severity: "suggest", action: "rewrite", patternType: "phrase" },
  { phraseOrPattern: "ALL CAPS words", category: "punctuation", severity: "warn", action: "flag", patternType: "phrase" },

  // Transition (12)
  { phraseOrPattern: "Furthermore", category: "transition", severity: "block", action: "block", patternType: "phrase" },
  { phraseOrPattern: "Moreover", category: "transition", severity: "block", action: "block", patternType: "phrase" },
  { phraseOrPattern: "In conclusion", category: "transition", severity: "block", action: "block", patternType: "phrase" },
  { phraseOrPattern: "Additionally", category: "transition", severity: "warn", action: "rewrite", patternType: "phrase" },
  { phraseOrPattern: "Consequently", category: "transition", severity: "warn", action: "rewrite", patternType: "phrase" },
  { phraseOrPattern: "Nevertheless", category: "transition", severity: "warn", action: "rewrite", patternType: "phrase" },
  { phraseOrPattern: "Notwithstanding", category: "transition", severity: "block", action: "block", patternType: "phrase" },
  { phraseOrPattern: "Therefore", category: "transition", severity: "warn", action: "rewrite", patternType: "phrase" },
  { phraseOrPattern: "Thus", category: "transition", severity: "suggest", action: "flag", patternType: "phrase" },
  { phraseOrPattern: "Hence", category: "transition", severity: "warn", action: "rewrite", patternType: "phrase" },
  { phraseOrPattern: "In light of", category: "transition", severity: "warn", action: "rewrite", patternType: "phrase" },
  { phraseOrPattern: "With regard to", category: "transition", severity: "warn", action: "rewrite", patternType: "phrase" },

  // Filler (10)
  { phraseOrPattern: "It is important to note", category: "filler", severity: "block", action: "block", patternType: "phrase" },
  { phraseOrPattern: "It goes without saying", category: "filler", severity: "block", action: "block", patternType: "phrase" },
  { phraseOrPattern: "I think / I believe", category: "filler", severity: "warn", action: "flag", patternType: "phrase" },
  { phraseOrPattern: "\\bin order to\\b", category: "filler", severity: "suggest", action: "flag", patternType: "regex" },
  { phraseOrPattern: "At the end of the day", category: "filler", severity: "warn", action: "flag", patternType: "phrase" },
  { phraseOrPattern: "When it comes to", category: "filler", severity: "warn", action: "rewrite", patternType: "phrase" },
  { phraseOrPattern: "The fact of the matter", category: "filler", severity: "block", action: "block", patternType: "phrase" },
  { phraseOrPattern: "It should be noted", category: "filler", severity: "warn", action: "rewrite", patternType: "phrase" },
  { phraseOrPattern: "As a matter of fact", category: "filler", severity: "warn", action: "rewrite", patternType: "phrase" },
  { phraseOrPattern: "Needless to say", category: "filler", severity: "block", action: "block", patternType: "phrase" },

  // Corporate (15)
  { phraseOrPattern: "\\b(leverage|leveraging|leveraged)\\b", category: "corporate", severity: "warn", action: "rewrite", patternType: "regex" },
  { phraseOrPattern: "synergy", category: "corporate", severity: "block", action: "block", patternType: "phrase" },
  { phraseOrPattern: "\\b(utilize|utilizing|utilization)\\b", category: "corporate", severity: "warn", action: "rewrite", patternType: "regex" },
  { phraseOrPattern: "unlock value", category: "corporate", severity: "warn", action: "rewrite", patternType: "phrase" },
  { phraseOrPattern: "ecosystem", category: "corporate", severity: "suggest", action: "flag", patternType: "phrase" },
  { phraseOrPattern: "paradigm shift", category: "corporate", severity: "block", action: "block", patternType: "phrase" },
  { phraseOrPattern: "move the needle", category: "corporate", severity: "warn", action: "rewrite", patternType: "phrase" },
  { phraseOrPattern: "low-hanging fruit", category: "corporate", severity: "warn", action: "rewrite", patternType: "phrase" },
  { phraseOrPattern: "circle back", category: "corporate", severity: "suggest", action: "flag", patternType: "phrase" },
  { phraseOrPattern: "bandwidth", category: "corporate", severity: "suggest", action: "flag", patternType: "phrase" },
  { phraseOrPattern: "holistic approach", category: "corporate", severity: "warn", action: "rewrite", patternType: "phrase" },
  { phraseOrPattern: "best-in-class", category: "corporate", severity: "warn", action: "rewrite", patternType: "phrase" },
  { phraseOrPattern: "value proposition", category: "corporate", severity: "suggest", action: "flag", patternType: "phrase" },
  { phraseOrPattern: "thought leadership", category: "corporate", severity: "suggest", action: "flag", patternType: "phrase" },
  { phraseOrPattern: "actionable insights", category: "corporate", severity: "warn", action: "rewrite", patternType: "phrase" },

  // Cliché (12)
  { phraseOrPattern: "game-changer", category: "cliche", severity: "warn", action: "rewrite", patternType: "phrase" },
  { phraseOrPattern: "deep dive", category: "cliche", severity: "suggest", action: "flag", patternType: "phrase" },
  { phraseOrPattern: "In today's fast-paced world", category: "cliche", severity: "block", action: "block", patternType: "phrase" },
  { phraseOrPattern: "disruptive", category: "cliche", severity: "warn", action: "flag", patternType: "phrase" },
  { phraseOrPattern: "seamless experience", category: "cliche", severity: "warn", action: "rewrite", patternType: "phrase" },
  { phraseOrPattern: "cutting-edge", category: "cliche", severity: "warn", action: "rewrite", patternType: "phrase" },
  { phraseOrPattern: "next-level", category: "cliche", severity: "warn", action: "rewrite", patternType: "phrase" },
  { phraseOrPattern: "robust solution", category: "cliche", severity: "warn", action: "rewrite", patternType: "phrase" },
  { phraseOrPattern: "at scale", category: "cliche", severity: "suggest", action: "flag", patternType: "phrase" },
  { phraseOrPattern: "double down", category: "cliche", severity: "suggest", action: "flag", patternType: "phrase" },
  { phraseOrPattern: "lean in", category: "cliche", severity: "suggest", action: "flag", patternType: "phrase" },
  { phraseOrPattern: "north star", category: "cliche", severity: "warn", action: "rewrite", patternType: "phrase" },

  // Custom (5)
  { phraseOrPattern: "Please don't hesitate", category: "custom", severity: "warn", action: "rewrite", patternType: "phrase" },
  { phraseOrPattern: "I'm excited to announce", category: "custom", severity: "warn", action: "rewrite", patternType: "phrase" },
  { phraseOrPattern: "Stay tuned", category: "custom", severity: "suggest", action: "flag", patternType: "phrase" },
  { phraseOrPattern: "without further ado", category: "custom", severity: "block", action: "block", patternType: "phrase" },
  { phraseOrPattern: "Let's unpack", category: "custom", severity: "warn", action: "rewrite", patternType: "phrase" },
];

export const RULE_CATEGORIES = [
  { id: "punctuation" as const, label: "Punctuation", count: 8, defaultEnabled: true },
  { id: "transition" as const, label: "Transitions", count: 12, defaultEnabled: true },
  { id: "filler" as const, label: "Filler phrases", count: 10, defaultEnabled: true },
  { id: "corporate" as const, label: "Corporate jargon", count: 15, defaultEnabled: true },
  { id: "cliche" as const, label: "Clichés", count: 12, defaultEnabled: true },
  { id: "custom" as const, label: "Custom", count: 5, defaultEnabled: false },
];
