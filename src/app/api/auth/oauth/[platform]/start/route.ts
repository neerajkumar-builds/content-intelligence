import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createOAuthState } from "@/lib/connectors/oauth/state";
import { getOAuthConfig } from "@/lib/connectors/oauth/registry";
import { buildLinkedInAuthUrl } from "@/lib/connectors/oauth/linkedin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform } = await params;
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  const config = getOAuthConfig(platform);
  if (!config) {
    return NextResponse.redirect(
      new URL(`/connectors?error=unsupported_platform`, req.url),
    );
  }

  const state = createOAuthState(platform, orgId, userId);

  let authUrl: string;
  if (platform === "linkedin") {
    authUrl = buildLinkedInAuthUrl(state);
  } else {
    return NextResponse.redirect(
      new URL(`/connectors?error=not_implemented`, req.url),
    );
  }

  return NextResponse.redirect(authUrl);
}
