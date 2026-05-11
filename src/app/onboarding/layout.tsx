export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-canvas)" }}>
      {children}
    </div>
  );
}
