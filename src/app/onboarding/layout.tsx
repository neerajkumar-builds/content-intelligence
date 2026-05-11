import { TRPCProvider } from "@/lib/trpc/client";
import { ThemeProvider } from "@/components/shell/theme-provider";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <TRPCProvider>
      <ThemeProvider>
        <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-canvas)" }}>
          {children}
        </div>
      </ThemeProvider>
    </TRPCProvider>
  );
}
