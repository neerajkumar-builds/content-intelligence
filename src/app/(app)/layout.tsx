import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/top-bar";
import { ThemeProvider } from "@/components/shell/theme-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
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
  );
}
