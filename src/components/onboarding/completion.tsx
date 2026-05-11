"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function Completion() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.push("/"), 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", textAlign: "center", padding: "80px 20px" }}>
      <div style={{ fontSize: 48, marginBottom: 16, color: "var(--good)" }}>&#10003;</div>
      <h2 style={{ fontSize: 24, fontWeight: 600, margin: "0 0 8px" }}>You're all set</h2>
      <p style={{ fontSize: 14, color: "var(--ink-secondary)", lineHeight: 1.6 }}>
        Your brand is configured. Redirecting to dashboard...
      </p>
    </div>
  );
}
