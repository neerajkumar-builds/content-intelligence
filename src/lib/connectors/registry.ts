import { Platform } from "@/lib/platforms";
import type { ConnectorAdapter } from "./adapter";
import { LinkedInAdapter } from "./adapters/linkedin";

const adapters = new Map<Platform, ConnectorAdapter>();

export function registerAdapter(
  platform: Platform,
  adapter: ConnectorAdapter,
): void {
  adapters.set(platform, adapter);
}

export function getAdapter(platform: Platform): ConnectorAdapter {
  const adapter = adapters.get(platform);
  if (!adapter) {
    throw new Error(`No adapter registered for platform: ${platform}`);
  }
  return adapter;
}

export function hasAdapter(platform: Platform): boolean {
  return adapters.has(platform);
}

export function getRegisteredPlatforms(): Platform[] {
  return [...adapters.keys()];
}

// ---------------------------------------------------------------------------
// Auto-register adapters at module load
// ---------------------------------------------------------------------------
registerAdapter(Platform.LinkedIn, new LinkedInAdapter());
