import { TRPCProvider } from "@/lib/trpc/client";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <TRPCProvider>
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-canvas)" }}>
        {children}
      </div>
    </TRPCProvider>
  );
}
