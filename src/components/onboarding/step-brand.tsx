"use client";

import { useState } from "react";
import { VOICE_STYLE_OPTIONS, INDUSTRY_OPTIONS, ROLE_OPTIONS } from "./voice-templates";

export interface BrandData {
  brandName: string;
  industry: string;
  customIndustry: string;
  voiceStyle: string;
  role: string;
  customRole: string;
  websiteUrl: string;
  isMultiBrand: boolean;
  additionalBrands: string[];
}

const VOICE_DESCRIPTIONS: Record<string, string> = {
  direct: "Short paragraphs, specific numbers, contrarian assertions, zero fluff",
  storyteller: "Narrative arcs, vulnerability, personal stakes, 'here's what happened'",
  analyst: "Benchmarks, evidence-first, 'the data shows...' framing",
  casual: "Conversational, contractions, questions as hooks, first-person",
  authoritative: "Frameworks, principles, expert positioning, structured arguments",
};

export function StepBrand({
  onSave,
  initialData,
}: {
  onSave: (data: BrandData) => void;
  initialData: BrandData | null;
}) {
  const [brandName, setBrandName] = useState(initialData?.brandName ?? "");
  const [industry, setIndustry] = useState(initialData?.industry ?? "");
  const [customIndustry, setCustomIndustry] = useState(initialData?.customIndustry ?? "");
  const [voiceStyle, setVoiceStyle] = useState(initialData?.voiceStyle ?? "");
  const [role, setRole] = useState(initialData?.role ?? "");
  const [customRole, setCustomRole] = useState(initialData?.customRole ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(initialData?.websiteUrl ?? "");
  const [isMultiBrand, setIsMultiBrand] = useState(initialData?.isMultiBrand ?? false);
  const [additionalBrands, setAdditionalBrands] = useState<string[]>(
    initialData?.additionalBrands ?? [],
  );

  const effectiveIndustry = industry === "Other" ? customIndustry : industry;
  const canContinue = brandName.trim() && effectiveIndustry && voiceStyle;

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
        <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
          Company / brand name *
        </label>
        <input
          type="text"
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
          placeholder="e.g., FullFunnel.co"
          style={inputStyle}
        />
      </div>

      <div>
        <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
          Industry *
        </label>
        <select value={industry} onChange={(e) => setIndustry(e.target.value)} style={inputStyle}>
          <option value="">Select industry</option>
          {INDUSTRY_OPTIONS.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
        {industry === "Other" && (
          <input
            type="text"
            value={customIndustry}
            onChange={(e) => setCustomIndustry(e.target.value)}
            placeholder="Type your industry..."
            style={{ ...inputStyle, marginTop: 8 }}
          />
        )}
      </div>

      <div>
        <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 8 }}>
          Voice style *
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {VOICE_STYLE_OPTIONS.map((v) => (
            <button
              key={v.id}
              onClick={() => setVoiceStyle(v.id)}
              style={{
                padding: "12px 10px",
                textAlign: "left",
                fontSize: 12,
                fontWeight: voiceStyle === v.id ? 600 : 500,
                border: `1.5px solid ${voiceStyle === v.id ? "var(--accent)" : "var(--border-subtle)"}`,
                borderRadius: 6,
                background: voiceStyle === v.id ? "var(--accent-soft)" : "var(--bg-surface)",
                color: "inherit",
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{v.label}</div>
              <div style={{ fontSize: 10.5, color: "var(--ink-tertiary)", lineHeight: 1.4 }}>
                {VOICE_DESCRIPTIONS[v.id] ?? ""}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
          Your role
        </label>
        <select value={role} onChange={(e) => setRole(e.target.value)} style={inputStyle}>
          <option value="">Select role (optional)</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        {role === "Other" && (
          <input
            type="text"
            value={customRole}
            onChange={(e) => setCustomRole(e.target.value)}
            placeholder="Type your role..."
            style={{ ...inputStyle, marginTop: 8 }}
          />
        )}
      </div>

      <div>
        <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
          Website URL
        </label>
        <input
          type="url"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          placeholder="https://yourcompany.com (optional)"
          style={inputStyle}
        />
      </div>

      <div>
        <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
          Do you have multiple brands?
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setIsMultiBrand(false)}
            className={`btn ${!isMultiBrand ? "primary" : "ghost"} sm`}
          >
            Single brand
          </button>
          <button
            onClick={() => setIsMultiBrand(true)}
            className={`btn ${isMultiBrand ? "primary" : "ghost"} sm`}
          >
            Multiple brands
          </button>
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
                <button
                  className="btn ghost sm"
                  onClick={() => setAdditionalBrands(additionalBrands.filter((_, j) => j !== i))}
                >
                  &times;
                </button>
              </div>
            ))}
            <button
              className="btn ghost sm"
              onClick={() => setAdditionalBrands([...additionalBrands, ""])}
              style={{ alignSelf: "flex-start" }}
            >
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
            customIndustry,
            voiceStyle,
            role,
            customRole,
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
