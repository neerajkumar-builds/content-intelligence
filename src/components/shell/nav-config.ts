import type { IconName } from "@/components/primitives";

export interface NavItem {
  id: string;
  label: string;
  icon: IconName;
  count?: number;
}

export interface NavGroup {
  group: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    group: "Pinned",
    items: [{ id: "home", label: "Home", icon: "home" }],
  },
  {
    group: "Make",
    items: [
      { id: "ideas", label: "Idea Wall", icon: "sparkle" },
      { id: "drafts", label: "Drafts", icon: "edit" },
      { id: "schedule", label: "Schedule", icon: "calendar" },
    ],
  },
  {
    group: "Learn",
    items: [
      { id: "insights", label: "Insights", icon: "chart" },
      { id: "competitors", label: "Competitors", icon: "flag" },
      { id: "leaders", label: "Thought leaders", icon: "sparkle" },
    ],
  },
  {
    group: "Govern",
    items: [
      { id: "brand", label: "Brand brief", icon: "book" },
      { id: "rules", label: "Anti-AI rules", icon: "shield" },
      { id: "prompts", label: "Prompt studio", icon: "sparkle" },
      { id: "models", label: "Models", icon: "bolt" },
      { id: "connectors", label: "Connectors", icon: "plug" },
      { id: "members", label: "Members", icon: "users" },
      { id: "api", label: "API & logs", icon: "activity" },
      { id: "audit", label: "Audit log", icon: "shield" },
      { id: "export", label: "Data export", icon: "download" },
      { id: "settings", label: "Settings", icon: "settings" },
    ],
  },
];

export const TITLE_MAP: Record<string, string> = {
  home: "Home",
  ideas: "Idea Wall",
  drafts: "Drafts",
  schedule: "Schedule",
  insights: "Insights",
  competitors: "Competitors",
  leaders: "Thought leaders",
  brand: "Brand brief",
  rules: "Anti-AI rules",
  prompts: "Prompt studio",
  models: "Models",
  connectors: "Connectors",
  members: "Members",
  api: "API & logs",
  audit: "Audit log",
  export: "Data export",
  settings: "Settings",
  onboarding: "Onboarding",
};

export const API_MAP: Record<string, string> = {
  home: "GET /v1/briefing",
  ideas: "GET /v1/ideas",
  drafts: "GET /v1/drafts/:id",
  schedule: "GET /v1/schedule?range=week",
  insights: "GET /v1/insights/overview",
  competitors: "GET /v1/competitors",
  leaders: "GET /v1/leaders",
  brand: "GET /v1/brands/:id/brief",
  rules: "GET /v1/rules",
  prompts: "GET /v1/prompts",
  models: "GET /v1/models",
  connectors: "GET /v1/connectors",
  members: "GET /v1/workspace/members",
  api: "GET /v1/api/calls?range=24h",
  audit: "GET /v1/audit?range=24h",
  export: "GET /v1/exports",
  settings: "GET /v1/workspace",
  onboarding: "POST /v1/onboarding",
};
