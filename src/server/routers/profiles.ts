import { z } from "zod";
import { eq, and, desc, isNull, sql, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../middleware";
import { router } from "../trpc";
import {
  profiles,
  profilePlatformLinks,
  signalSourceConfigs,
  signals,
} from "@/db/schema";
import { discoverRssFeeds } from "@/lib/signals/rss-discovery";
import { resolveYouTubeRss } from "@/lib/signals/youtube-utils";
import { buildGoogleNewsUrl } from "@/lib/signals/google-news";

// ---------------------------------------------------------------------------
// Zod enum schemas (must match DB enums exactly)
// ---------------------------------------------------------------------------

const profileTypeSchema = z.enum([
  "competitor",
  "thought_leader",
  "content_creator",
]);

const profileImportanceSchema = z.enum(["high", "medium", "low"]);

const profilePlatformSchema = z.enum([
  "website",
  "linkedin",
  "twitter",
  "youtube",
  "instagram",
  "tiktok",
  "reddit",
  "substack",
  "medium",
  "podcast",
]);

const fetchMethodSchema = z.enum([
  "rss",
  "rss_discovery",
  "youtube_rss",
  "reddit_rss",
  "google_news",
  "apify",
  "manual",
]);

// ---------------------------------------------------------------------------
// Discovery result type
// ---------------------------------------------------------------------------

type DiscoveryResult = {
  platform: string;
  feedUrl: string | null;
  fetchMethod: string;
  status: "active" | "apify_needed" | "manual" | "failed";
  message: string;
};

// ---------------------------------------------------------------------------
// Auto-discovery orchestrator
// ---------------------------------------------------------------------------

async function runAutoDiscovery(
  profileName: string,
  websiteUrl: string | null,
  platformUrls: Array<{ platform: string; url: string }>,
): Promise<DiscoveryResult[]> {
  const results: DiscoveryResult[] = [];

  // Build all discovery promises
  const tasks: Array<Promise<DiscoveryResult[]>> = [];

  // 1. RSS discovery from website URL
  if (websiteUrl) {
    tasks.push(
      discoverRssFeeds(websiteUrl).then((result): DiscoveryResult[] => {
        if (result.feeds.length > 0) {
          return result.feeds.map((feed) => ({
            platform: "website",
            feedUrl: feed.url,
            fetchMethod: "rss",
            status: "active" as const,
            message: `Discovered RSS feed: ${feed.title}`,
          }));
        }
        return [
          {
            platform: "website",
            feedUrl: null,
            fetchMethod: "manual",
            status: "manual" as const,
            message:
              result.errors.length > 0
                ? `No RSS found: ${result.errors[0]}`
                : "No RSS feed found on website",
          },
        ];
      }),
    );
  }

  // 2. Google News from profile name (always succeeds)
  tasks.push(
    Promise.resolve<DiscoveryResult[]>([
      {
        platform: "google_news",
        feedUrl: buildGoogleNewsUrl({ query: profileName }),
        fetchMethod: "google_news",
        status: "active",
        message: `Google News feed for "${profileName}"`,
      },
    ]),
  );

  // 3. Per-platform discovery
  for (const { platform, url } of platformUrls) {
    switch (platform) {
      case "youtube":
        tasks.push(
          resolveYouTubeRss(url).then((result): DiscoveryResult[] => {
            if ("feedUrl" in result) {
              return [
                {
                  platform: "youtube",
                  feedUrl: result.feedUrl,
                  fetchMethod: "youtube_rss",
                  status: "active",
                  message: `YouTube RSS feed (channel: ${result.channelId})`,
                },
              ];
            }
            return [
              {
                platform: "youtube",
                feedUrl: null,
                fetchMethod: "manual",
                status: "failed",
                message: result.error,
              },
            ];
          }),
        );
        break;

      case "reddit":
        tasks.push(
          Promise.resolve<DiscoveryResult[]>([
            {
              platform: "reddit",
              feedUrl: url.replace(/\/+$/, "") + ".rss",
              fetchMethod: "reddit_rss",
              status: "active",
              message: "Reddit RSS feed appended",
            },
          ]),
        );
        break;

      case "substack":
      case "medium":
      case "podcast":
        tasks.push(
          discoverRssFeeds(url).then((result): DiscoveryResult[] => {
            if (result.feeds.length > 0) {
              return [
                {
                  platform,
                  feedUrl: result.feeds[0].url,
                  fetchMethod: "rss_discovery",
                  status: "active",
                  message: `RSS discovered for ${platform}: ${result.feeds[0].title}`,
                },
              ];
            }
            return [
              {
                platform,
                feedUrl: null,
                fetchMethod: "manual",
                status: "manual",
                message: `No RSS feed found for ${platform}`,
              },
            ];
          }),
        );
        break;

      // LinkedIn, Twitter, Instagram, TikTok — need Apify, no auto feed
      default:
        tasks.push(
          Promise.resolve<DiscoveryResult[]>([
            {
              platform,
              feedUrl: null,
              fetchMethod: "apify",
              status: "apify_needed",
              message: `${platform} requires Apify scraper (no public feed)`,
            },
          ]),
        );
        break;
    }
  }

  // Per-task timeout — a slow YouTube fetch times out independently
  // while a fast RSS discovery still succeeds
  const DISCOVERY_TIMEOUT = 15_000;

  const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error("Discovery timeout")), ms),
      ),
    ]);

  const settled = await Promise.allSettled(
    tasks.map((task) => withTimeout(task, DISCOVERY_TIMEOUT)),
  );

  for (const result of settled) {
    if (result.status === "fulfilled") {
      results.push(...result.value);
    } else {
      results.push({
        platform: "unknown",
        feedUrl: null,
        fetchMethod: "manual",
        status: "failed",
        message:
          result.reason instanceof Error
            ? result.reason.message
            : "Discovery task failed",
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const profilesRouter = router({
  /**
   * 1. list — filter by type (optional), exclude archived by default.
   *    Return profiles with platform links and signal counts.
   */
  list: protectedProcedure
    .input(
      z
        .object({
          type: profileTypeSchema.optional(),
          includeArchived: z.boolean().default(false),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const { db, workspaceId, scopeAnd } = ctx.scoped;

      const conditions = [];
      if (input?.type) {
        conditions.push(eq(profiles.type, input.type));
      }
      if (!input?.includeArchived) {
        conditions.push(isNull(profiles.archivedAt));
      }

      const where = scopeAnd(profiles.workspaceId, ...conditions);

      const rows = await db
        .select()
        .from(profiles)
        .where(where)
        .orderBy(desc(profiles.createdAt));

      if (rows.length === 0) return [];

      // Batch-fetch platform links for all profiles
      const profileIds = rows.map((r) => r.id);
      const links = await db
        .select()
        .from(profilePlatformLinks)
        .where(inArray(profilePlatformLinks.profileId, profileIds));

      // Batch-fetch signal counts per profile
      const signalCounts = await db
        .select({
          profileId: signals.profileId,
          count: sql<number>`count(*)::int`,
        })
        .from(signals)
        .where(
          and(
            eq(signals.workspaceId, workspaceId),
            inArray(signals.profileId, profileIds),
          ),
        )
        .groupBy(signals.profileId);

      // Also get source config counts
      const sourceCounts = await db
        .select({
          profileId: signalSourceConfigs.profileId,
          count: sql<number>`count(*)::int`,
        })
        .from(signalSourceConfigs)
        .where(
          and(
            eq(signalSourceConfigs.workspaceId, workspaceId),
            inArray(signalSourceConfigs.profileId, profileIds),
          ),
        )
        .groupBy(signalSourceConfigs.profileId);

      // Index by profileId for O(1) lookup
      const linksByProfile = new Map<string, typeof links>();
      for (const link of links) {
        const arr = linksByProfile.get(link.profileId) ?? [];
        arr.push(link);
        linksByProfile.set(link.profileId, arr);
      }

      const signalCountMap = new Map<string, number>();
      for (const sc of signalCounts) {
        if (sc.profileId) signalCountMap.set(sc.profileId, sc.count);
      }

      const sourceCountMap = new Map<string, number>();
      for (const sc of sourceCounts) {
        if (sc.profileId) sourceCountMap.set(sc.profileId, sc.count);
      }

      return rows.map((profile) => ({
        ...profile,
        platformLinks: linksByProfile.get(profile.id) ?? [],
        signalCount: signalCountMap.get(profile.id) ?? 0,
        sourceCount: sourceCountMap.get(profile.id) ?? 0,
      }));
    }),

  /**
   * 2. getById — full profile + platform links + source configs.
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { db, workspaceId, scopeAnd } = ctx.scoped;

      const [profile] = await db
        .select()
        .from(profiles)
        .where(
          scopeAnd(profiles.workspaceId, eq(profiles.id, input.id)),
        )
        .limit(1);

      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile not found",
        });
      }

      const [links, sourceConfigs, signalCountResult] = await Promise.all([
        db
          .select()
          .from(profilePlatformLinks)
          .where(eq(profilePlatformLinks.profileId, profile.id))
          .orderBy(profilePlatformLinks.platform),
        db
          .select()
          .from(signalSourceConfigs)
          .where(
            and(
              eq(signalSourceConfigs.workspaceId, workspaceId),
              eq(signalSourceConfigs.profileId, profile.id),
            ),
          )
          .orderBy(desc(signalSourceConfigs.createdAt)),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(signals)
          .where(
            and(
              eq(signals.workspaceId, workspaceId),
              eq(signals.profileId, profile.id),
            ),
          ),
      ]);

      return {
        ...profile,
        platformLinks: links,
        sourceConfigs,
        signalCount: signalCountResult[0]?.count ?? 0,
      };
    }),

  /**
   * 3. create — insert profile, run auto-discovery in parallel.
   *    Creates platform_links + signal_source_configs for each discovered feed.
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        type: profileTypeSchema,
        website: z.string().url().max(2000).optional(),
        description: z.string().max(2000).optional(),
        importance: profileImportanceSchema.default("medium"),
        notes: z.string().max(5000).optional(),
        platformUrls: z
          .array(
            z.object({
              platform: profilePlatformSchema,
              url: z.string().url().max(2000),
            }),
          )
          .default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, workspaceId } = ctx.scoped;

      // Insert the profile
      const [profile] = await db
        .insert(profiles)
        .values({
          workspaceId,
          name: input.name,
          type: input.type,
          website: input.website ?? null,
          description: input.description ?? null,
          importance: input.importance,
          notes: input.notes ?? null,
        })
        .returning();

      // Run auto-discovery in parallel
      const discoveryResults = await runAutoDiscovery(
        input.name,
        input.website ?? null,
        input.platformUrls,
      );

      // Process discovery results: create platform links + source configs
      const createdLinks: Array<{ platform: string; id: string }> = [];
      const createdConfigs: Array<{ label: string; id: string }> = [];

      for (const result of discoveryResults) {
        // Skip Google News — it's a source_config only, not a platform_link
        if (result.platform === "google_news") {
          if (result.feedUrl) {
            // Dedup: check if config already exists for this workspace+URL+profile
            const [existingNewsConfig] = await db
              .select({ id: signalSourceConfigs.id })
              .from(signalSourceConfigs)
              .where(
                and(
                  eq(signalSourceConfigs.workspaceId, workspaceId),
                  eq(signalSourceConfigs.configUrl, result.feedUrl),
                  eq(signalSourceConfigs.profileId, profile.id),
                ),
              )
              .limit(1);

            if (!existingNewsConfig) {
              const [config] = await db
                .insert(signalSourceConfigs)
                .values({
                  workspaceId,
                  source: "rss",
                  label: `${input.name} (Google News)`,
                  configUrl: result.feedUrl,
                  profileId: profile.id,
                  fetchMethod: "google_news",
                })
                .returning({ id: signalSourceConfigs.id });
              if (config) {
                createdConfigs.push({
                  label: `${input.name} (Google News)`,
                  id: config.id,
                });
              }
            }
          }
          continue;
        }

        // Skip unknown/failed with no feed
        if (result.platform === "unknown") continue;

        // Validate platform is in the enum before inserting a link
        const validPlatforms = [
          "website",
          "linkedin",
          "twitter",
          "youtube",
          "instagram",
          "tiktok",
          "reddit",
          "substack",
          "medium",
          "podcast",
        ];
        if (!validPlatforms.includes(result.platform)) continue;

        const platformValue = result.platform as
          | "website"
          | "linkedin"
          | "twitter"
          | "youtube"
          | "instagram"
          | "tiktok"
          | "reddit"
          | "substack"
          | "medium"
          | "podcast";

        // Find the user-provided URL for this platform (or use website URL)
        const platformUrl =
          input.platformUrls.find((p) => p.platform === result.platform)?.url ??
          input.website ??
          result.feedUrl ??
          "";

        if (!platformUrl) continue;

        // Determine fetchMethod for the DB enum
        const validFetchMethods = [
          "rss",
          "rss_discovery",
          "youtube_rss",
          "reddit_rss",
          "google_news",
          "apify",
          "manual",
        ];
        const dbFetchMethod = validFetchMethods.includes(result.fetchMethod)
          ? (result.fetchMethod as
              | "rss"
              | "rss_discovery"
              | "youtube_rss"
              | "reddit_rss"
              | "google_news"
              | "apify"
              | "manual")
          : "manual";

        // Create platform link (onConflictDoNothing for UNIQUE constraint)
        const [link] = await db
          .insert(profilePlatformLinks)
          .values({
            profileId: profile.id,
            platform: platformValue,
            url: platformUrl,
            feedUrl: result.feedUrl,
            fetchMethod: dbFetchMethod,
            enabled: result.status === "active",
          })
          .onConflictDoNothing()
          .returning({ id: profilePlatformLinks.id });

        if (link) {
          createdLinks.push({ platform: result.platform, id: link.id });
        }

        // Create source_config for feeds that are active
        if (result.feedUrl && result.status === "active") {
          const labelSuffix =
            result.platform === "website"
              ? "Blog"
              : result.platform === "youtube"
                ? "YouTube"
                : result.platform === "reddit"
                  ? "Reddit"
                  : result.platform.charAt(0).toUpperCase() +
                    result.platform.slice(1);

          // Dedup: check if config already exists for this workspace+URL+profile
          const [existingConfig] = await db
            .select({ id: signalSourceConfigs.id })
            .from(signalSourceConfigs)
            .where(
              and(
                eq(signalSourceConfigs.workspaceId, workspaceId),
                eq(signalSourceConfigs.configUrl, result.feedUrl),
                eq(signalSourceConfigs.profileId, profile.id),
              ),
            )
            .limit(1);

          if (!existingConfig) {
            const [config] = await db
              .insert(signalSourceConfigs)
              .values({
                workspaceId,
                source: "rss",
                label: `${input.name} (${labelSuffix})`,
                configUrl: result.feedUrl,
                profileId: profile.id,
                fetchMethod: dbFetchMethod,
              })
              .returning({ id: signalSourceConfigs.id });

            if (config) {
              createdConfigs.push({
                label: `${input.name} (${labelSuffix})`,
                id: config.id,
              });
            }
          }
        }
      }

      return {
        profile,
        discovery: {
          results: discoveryResults,
          linksCreated: createdLinks.length,
          configsCreated: createdConfigs.length,
        },
      };
    }),

  /**
   * 4. update — partial update of profile fields.
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(200).optional(),
        type: profileTypeSchema.optional(),
        website: z.string().url().max(2000).nullish(),
        description: z.string().max(2000).nullish(),
        importance: profileImportanceSchema.optional(),
        notes: z.string().max(5000).nullish(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, scopeAnd } = ctx.scoped;

      const { id, ...fields } = input;

      // Build updates, only including provided fields
      const updates: Record<string, unknown> = {};
      if (fields.name !== undefined) updates.name = fields.name;
      if (fields.type !== undefined) updates.type = fields.type;
      if (fields.website !== undefined)
        updates.website = fields.website ?? null;
      if (fields.description !== undefined)
        updates.description = fields.description ?? null;
      if (fields.importance !== undefined)
        updates.importance = fields.importance;
      if (fields.notes !== undefined) updates.notes = fields.notes ?? null;
      if (fields.metadata !== undefined) updates.metadata = fields.metadata;

      if (Object.keys(updates).length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Nothing to update",
        });
      }

      const [updated] = await db
        .update(profiles)
        .set(updates)
        .where(scopeAnd(profiles.workspaceId, eq(profiles.id, id)))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile not found",
        });
      }

      return updated;
    }),

  /**
   * 5. archive — set archivedAt, disable all related source configs.
   */
  archive: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { db, workspaceId, scopeAnd } = ctx.scoped;

      const [profile] = await db
        .update(profiles)
        .set({ archivedAt: new Date() })
        .where(scopeAnd(profiles.workspaceId, eq(profiles.id, input.id)))
        .returning({ id: profiles.id });

      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile not found",
        });
      }

      // Disable all related source configs
      await db
        .update(signalSourceConfigs)
        .set({ enabled: false })
        .where(
          and(
            eq(signalSourceConfigs.workspaceId, workspaceId),
            eq(signalSourceConfigs.profileId, input.id),
          ),
        );

      // Disable all platform links
      await db
        .update(profilePlatformLinks)
        .set({ enabled: false })
        .where(eq(profilePlatformLinks.profileId, input.id));

      return { archived: true };
    }),

  /**
   * 6. delete — hard delete profile. Cascade deletes platform_links (FK).
   *    Source configs have ON DELETE SET NULL, so they persist with null profileId.
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { db, scopeAnd } = ctx.scoped;

      const [deleted] = await db
        .delete(profiles)
        .where(scopeAnd(profiles.workspaceId, eq(profiles.id, input.id)))
        .returning({ id: profiles.id });

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile not found",
        });
      }

      return { deleted: true };
    }),

  /**
   * 7. addPlatformLink — discover single link, create platform_link + source_config.
   */
  addPlatformLink: protectedProcedure
    .input(
      z.object({
        profileId: z.string().uuid(),
        platform: profilePlatformSchema,
        url: z.string().url().max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, workspaceId, scopeAnd } = ctx.scoped;

      // Verify profile belongs to workspace
      const [profile] = await db
        .select({ id: profiles.id, name: profiles.name })
        .from(profiles)
        .where(
          scopeAnd(profiles.workspaceId, eq(profiles.id, input.profileId)),
        )
        .limit(1);

      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile not found",
        });
      }

      // Run discovery for this single platform
      const discoveryResults = await runAutoDiscovery(
        profile.name,
        null, // no website discovery — just the single platform
        [{ platform: input.platform, url: input.url }],
      );

      // Filter out the google_news result (auto-generated, not needed for single add)
      const platformResult = discoveryResults.find(
        (r) => r.platform === input.platform,
      );

      // Determine fetch method
      const fetchMethod = platformResult
        ? (platformResult.fetchMethod as
            | "rss"
            | "rss_discovery"
            | "youtube_rss"
            | "reddit_rss"
            | "google_news"
            | "apify"
            | "manual")
        : "manual";

      // Create platform link
      const [link] = await db
        .insert(profilePlatformLinks)
        .values({
          profileId: input.profileId,
          platform: input.platform,
          url: input.url,
          feedUrl: platformResult?.feedUrl ?? null,
          fetchMethod,
          enabled: platformResult?.status === "active",
        })
        .onConflictDoNothing()
        .returning();

      if (!link) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `A ${input.platform} link already exists for this profile`,
        });
      }

      // Create source_config if we have an active feed
      let sourceConfig = null;
      if (platformResult?.feedUrl && platformResult.status === "active") {
        const labelSuffix =
          input.platform.charAt(0).toUpperCase() + input.platform.slice(1);

        // Dedup: check if config already exists for this workspace+URL+profile
        const [existingConfig] = await db
          .select({ id: signalSourceConfigs.id })
          .from(signalSourceConfigs)
          .where(
            and(
              eq(signalSourceConfigs.workspaceId, workspaceId),
              eq(signalSourceConfigs.configUrl, platformResult.feedUrl),
              eq(signalSourceConfigs.profileId, input.profileId),
            ),
          )
          .limit(1);

        if (!existingConfig) {
          const [config] = await db
            .insert(signalSourceConfigs)
            .values({
              workspaceId,
              source: "rss",
              label: `${profile.name} (${labelSuffix})`,
              configUrl: platformResult.feedUrl,
              profileId: input.profileId,
              fetchMethod,
            })
            .returning();
          sourceConfig = config;
        }
      }

      return { link, sourceConfig, discovery: platformResult ?? null };
    }),

  /**
   * 8. removePlatformLink — delete link + associated source_config.
   */
  removePlatformLink: protectedProcedure
    .input(z.object({ linkId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { db, workspaceId, scopeAnd } = ctx.scoped;

      // Fetch the link, joining to profile to verify workspace ownership
      const [link] = await db
        .select({
          id: profilePlatformLinks.id,
          profileId: profilePlatformLinks.profileId,
          feedUrl: profilePlatformLinks.feedUrl,
        })
        .from(profilePlatformLinks)
        .innerJoin(profiles, eq(profiles.id, profilePlatformLinks.profileId))
        .where(
          and(
            eq(profilePlatformLinks.id, input.linkId),
            eq(profiles.workspaceId, workspaceId),
          ),
        )
        .limit(1);

      if (!link) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Platform link not found",
        });
      }

      // Delete associated source configs that point to this profile + feed URL
      if (link.feedUrl) {
        await db
          .delete(signalSourceConfigs)
          .where(
            and(
              eq(signalSourceConfigs.workspaceId, workspaceId),
              eq(signalSourceConfigs.profileId, link.profileId),
              eq(signalSourceConfigs.configUrl, link.feedUrl),
            ),
          );
      }

      // Delete the platform link
      await db
        .delete(profilePlatformLinks)
        .where(eq(profilePlatformLinks.id, input.linkId));

      return { deleted: true };
    }),

  /**
   * 9. togglePlatformLink — toggle enabled on link + source_config.
   */
  togglePlatformLink: protectedProcedure
    .input(
      z.object({
        linkId: z.string().uuid(),
        enabled: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, workspaceId } = ctx.scoped;

      // Fetch the link, join to profile for workspace verification
      const [link] = await db
        .select({
          id: profilePlatformLinks.id,
          profileId: profilePlatformLinks.profileId,
          feedUrl: profilePlatformLinks.feedUrl,
        })
        .from(profilePlatformLinks)
        .innerJoin(profiles, eq(profiles.id, profilePlatformLinks.profileId))
        .where(
          and(
            eq(profilePlatformLinks.id, input.linkId),
            eq(profiles.workspaceId, workspaceId),
          ),
        )
        .limit(1);

      if (!link) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Platform link not found",
        });
      }

      // Toggle the link
      await db
        .update(profilePlatformLinks)
        .set({ enabled: input.enabled })
        .where(eq(profilePlatformLinks.id, input.linkId));

      // Toggle associated source configs
      if (link.feedUrl) {
        await db
          .update(signalSourceConfigs)
          .set({ enabled: input.enabled })
          .where(
            and(
              eq(signalSourceConfigs.workspaceId, workspaceId),
              eq(signalSourceConfigs.profileId, link.profileId),
              eq(signalSourceConfigs.configUrl, link.feedUrl),
            ),
          );
      }

      return { id: link.id, enabled: input.enabled };
    }),

  /**
   * 10. getProfileSignals — paginated signals by profileId.
   */
  getProfileSignals: protectedProcedure
    .input(
      z.object({
        profileId: z.string().uuid(),
        limit: z.number().int().min(1).max(200).default(50),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { db, workspaceId, scopeAnd } = ctx.scoped;

      // Verify profile belongs to workspace
      const [profile] = await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(
          scopeAnd(profiles.workspaceId, eq(profiles.id, input.profileId)),
        )
        .limit(1);

      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile not found",
        });
      }

      const rows = await db
        .select({
          id: signals.id,
          source: signals.source,
          sourceUrl: signals.sourceUrl,
          title: signals.title,
          body: sql<string>`LEFT(${signals.body}, 200)`,
          metadata: signals.metadata,
          processed: signals.processed,
          publishedAt: signals.publishedAt,
          createdAt: signals.createdAt,
        })
        .from(signals)
        .where(
          and(
            eq(signals.workspaceId, workspaceId),
            eq(signals.profileId, input.profileId),
          ),
        )
        .orderBy(desc(signals.createdAt))
        .limit(input.limit + 1)
        .offset(input.offset);

      const hasMore = rows.length > input.limit;
      const items = hasMore ? rows.slice(0, input.limit) : rows;

      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(signals)
        .where(
          and(
            eq(signals.workspaceId, workspaceId),
            eq(signals.profileId, input.profileId),
          ),
        );

      return {
        items,
        total: countResult?.count ?? 0,
        hasMore,
      };
    }),
});
