import { TRPCProvider } from "@/lib/trpc/client";
import { ThemeProvider } from "@/components/shell/theme-provider";
import { OnboardingTopBar } from "@/components/onboarding/top-bar";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <TRPCProvider>
      <ThemeProvider>
        <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-canvas)" }}>
          <OnboardingTopBar />
          <div style={{ flex: 1, overflow: "hidden" }}>
            {children}
          </div>
        </div>
      </ThemeProvider>
    </TRPCProvider>
  );
}
