"use client";

import { useState } from "react";
import { VOICE_STYLE_OPTIONS, INDUSTRY_OPTIONS, ROLE_OPTIONS } from "./voice-templates";

export interface BrandData {
  brandName: string;
  industry: string;
  voiceStyle: string;
  role: string;
  websiteUrl: string;
  isMultiBrand: boolean;
  additionalBrands: string[];
}

export function StepBrand({ onSave }: { onSave: (data: BrandData) => void }) {
  const [brandName, setBrandName] = useState("");
  const [industry, setIndustry] = useState("");
  const [voiceStyle, setVoiceStyle] = useState("");
  const [role, setRole] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isMultiBrand, setIsMultiBrand] = useState(false);
  const [additionalBrands, setAdditionalBrands] = useState<string[]>([]);

  const canContinue = brandName.trim() && industry && voiceStyle;

  const inputStyle = {
    width: "100%",
    padding: "8px 12px",
    fontSize: 13,
    border: "1px solid var(--border-subtle)",
    borderRadius: 6,
    background: "var(--bg-surface)",
    color: "inherit",
    fontFamily: "inherit",
  } as const;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Company / brand name *</label>
        <input type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="e.g., FullFunnel.co" style={inputStyle} />
      </div>

      <div>
        <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Industry *</label>
        <select value={industry} onChange={(e) => setIndustry(e.target.value)} style={inputStyle}>
          <option value="">Select industry</option>
          {INDUSTRY_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
      </div>

      <div>
        <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 8 }}>Voice style *</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {VOICE_STYLE_OPTIONS.map((v) => (
            <button
              key={v.id}
              onClick={() => setVoiceStyle(v.id)}
              style={{
                padding: "12px 10px",
                textAlign: "center",
                fontSize: 12,
                fontWeight: voiceStyle === v.id ? 600 : 500,
                border: `1.5px solid ${voiceStyle === v.id ? "var(--accent)" : "var(--border-subtle)"}`,
                borderRadius: 6,
                background: voiceStyle === v.id ? "var(--accent-soft)" : "var(--bg-surface)",
                color: "inherit",
                cursor: "pointer",
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Your role</label>
        <select value={role} onChange={(e) => setRole(e.target.value)} style={inputStyle}>
          <option value="">Select role (optional)</option>
          {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div>
        <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Website URL</label>
        <input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://yourcompany.com (optional)" style={inputStyle} />
      </div>

      <div>
        <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Do you have multiple brands?</label>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setIsMultiBrand(false)} className={`btn ${!isMultiBrand ? "primary" : "ghost"} sm`}>Single brand</button>
          <button onClick={() => setIsMultiBrand(true)} className={`btn ${isMultiBrand ? "primary" : "ghost"} sm`}>Multiple brands</button>
        </div>
        {isMultiBrand && (
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
            {additionalBrands.map((b, i) => (
              <div key={i} style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  value={b}
                  onChange={(e) => {
                    const copy = [...additionalBrands];
                    copy[i] = e.target.value;
                    setAdditionalBrands(copy);
                  }}
                  placeholder={`Brand ${i + 2}`}
                  style={{ ...inputStyle, padding: "6px 10px", fontSize: 12 }}
                />
                <button className="btn ghost sm" onClick={() => setAdditionalBrands(additionalBrands.filter((_, j) => j !== i))}>
                  &times;
                </button>
              </div>
            ))}
            <button className="btn ghost sm" onClick={() => setAdditionalBrands([...additionalBrands, ""])} style={{ alignSelf: "flex-start" }}>
              + Add brand
            </button>
          </div>
        )}
      </div>

      <button
        className="btn primary"
        disabled={!canContinue}
        onClick={() =>
          onSave({
            brandName,
            industry,
            voiceStyle,
            role,
            websiteUrl,
            isMultiBrand,
            additionalBrands: additionalBrands.filter(Boolean),
          })
        }
        style={{ alignSelf: "flex-end", marginTop: 8 }}
      >
        Continue &rarr; Voice corpus
      </button>
    </div>
  );
}
