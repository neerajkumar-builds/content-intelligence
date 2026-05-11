import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/top-bar";
import { ThemeProvider } from "@/components/shell/theme-provider";
import { TRPCProvider } from "@/lib/trpc/client";
import { db } from "@/db";
import { workspaces } from "@/db/schema";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { orgId } = await auth();

  if (orgId) {
    const [ws] = await db
      .select({ onboardingStep: workspaces.onboardingStep })
      .from(workspaces)
      .where(eq(workspaces.clerkOrgId, orgId))
      .limit(1);

    if (!ws || ws.onboardingStep < 5) {
      redirect("/onboarding");
    }
  }

  return (
    <TRPCProvider>
      <ThemeProvider>
        <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden", background: "var(--bg-canvas)" }}>
          <Sidebar />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            <TopBar />
            <main style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
              {children}
            </main>
          </div>
        </div>
      </ThemeProvider>
    </TRPCProvider>
  );
}
