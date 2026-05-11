"use client";

import { useState } from "react";

const BRIEF_TEMPLATES: Record<string, { wedge: string; voiceTraits: string }> = {
  direct: {
    wedge: "We cut through the noise with evidence-backed, voice-faithful content — for operators who'd rather show receipts than polish prose.",
    voiceTraits: "Direct · skeptical of frameworks · uses specific numbers · contractions · short paragraphs · ends with a question or contrarian assertion",
  },
  storyteller: {
    wedge: "We turn real experiences into compelling narratives — for operators whose best content starts with 'Here's what actually happened.'",
    voiceTraits: "Narrative · vulnerable · personal stakes · story arcs · conversational · builds tension before the insight",
  },
  analyst: {
    wedge: "We back every claim with data — for operators who know that one good benchmark beats ten opinions.",
    voiceTraits: "Evidence-first · cites specific numbers · benchmark-driven · avoids superlatives · precise language",
  },
  casual: {
    wedge: "We write like you talk — for operators whose audience trusts authenticity over authority.",
    voiceTraits: "Conversational · contractions · questions as hooks · first-person · humor when natural · anti-jargon",
  },
};

export function StepBrief({
  voiceStyle,
  corpusCount,
  onSave,
  onSkip,
}: {
  voiceStyle: string;
  corpusCount: number;
  onSave: (data: { wedge: string; icp: string; voiceTraits: string; antiPositioning: string }) => void;
  onSkip: () => void;
}) {
  const template = BRIEF_TEMPLATES[voiceStyle] ?? BRIEF_TEMPLATES.direct;
  const prefill = corpusCount >= 5;
  const [wedge, setWedge] = useState(prefill ? template.wedge : "");
  const [icp, setIcp] = useState("");
  const [voiceTraits, setVoiceTraits] = useState(prefill ? template.voiceTraits : "");
  const [antiPositioning, setAntiPositioning] = useState("");

  const fields = [
    { label: "WEDGE", value: wedge, setter: setWedge, placeholder: "What makes your content different? Why should people read YOU?" },
    { label: "ICP", value: icp, setter: setIcp, placeholder: "Who is your ideal reader? Role, company size, pain points?" },
    { label: "VOICE TRAITS", value: voiceTraits, setter: setVoiceTraits, placeholder: "How do you write? Short paragraphs? Specific numbers? Contrarian?" },
    { label: "ANTI-POSITIONING", value: antiPositioning, setter: setAntiPositioning, placeholder: "What are you NOT? What do you refuse to sound like?" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {prefill && (
        <div className="card" style={{ padding: 10, background: "var(--accent-soft)", borderColor: "var(--accent)", fontSize: 11, color: "var(--accent)" }}>
          Pre-populated from your voice style selection. Edit to match your brand.
        </div>
      )}
      {fields.map((f) => (
        <div key={f.label} className="card" style={{ padding: 14 }}>
          <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 6 }}>{f.label}</div>
          <textarea
            value={f.value}
            onChange={(e) => f.setter(e.target.value)}
            placeholder={f.placeholder}
            style={{
              width: "100%",
              minHeight: 60,
              padding: 8,
              fontSize: 13,
              border: "1px solid var(--border-subtle)",
              borderRadius: 4,
              background: "var(--bg-surface)",
              resize: "vertical",
              fontFamily: "inherit",
              lineHeight: 1.5,
              color: "inherit",
            }}
          />
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        <button className="btn ghost sm" onClick={onSkip}>Skip for now</button>
        <button className="btn primary sm" onClick={() => onSave({ wedge, icp, voiceTraits, antiPositioning })}>
          Save brief &rarr; Guardrails
        </button>
      </div>
    </div>
  );
}
