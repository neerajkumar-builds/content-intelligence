"use client";

import { useState } from "react";
import { Stepper } from "@/components/onboarding/stepper";
import { Welcome } from "@/components/onboarding/welcome";
import { Completion } from "@/components/onboarding/completion";
import { StepBrand, type BrandData } from "@/components/onboarding/step-brand";
import { StepCorpus, type CorpusItem } from "@/components/onboarding/step-corpus";
import { StepBrief } from "@/components/onboarding/step-brief";
import { StepGuardrails } from "@/components/onboarding/step-guardrails";

const STEP_LABELS = ["Brand identity", "Voice corpus", "Brand brief", "Guardrails"];

export default function OnboardingPage() {
  const [step, setStep] = useState(-1);
  const [voiceStyle, setVoiceStyle] = useState("direct");
  const [corpusCount, setCorpusCount] = useState(0);

  if (step === -1) {
    return <Welcome onStart={() => setStep(0)} />;
  }

  if (step >= 4) {
    return <Completion />;
  }

  function handleBrandSave(data: BrandData) {
    setVoiceStyle(data.voiceStyle);
    setStep(1);
  }

  function handleCorpusSave(items: CorpusItem[]) {
    setCorpusCount(items.length);
    setStep(2);
  }

  function handleBriefSave(_data: { wedge: string; icp: string; voiceTraits: string; antiPositioning: string }) {
    setStep(3);
  }

  function handleGuardrailsSave(_data: { strictMode: boolean; enabledCategories: string[] }) {
    setStep(4);
  }

  return (
    <>
      <Stepper currentStep={step} />
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 64px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div className="eyebrow" style={{ fontSize: 9.5, color: step === 1 ? "var(--danger)" : undefined }}>
            STEP 0{step + 1}{step === 1 ? " · THE MAKE-OR-BREAK STEP" : ""}
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.018em", margin: "6px 0 20px" }}>
            {step === 0 && "Set up your brand"}
            {step === 1 && "How should we learn your voice?"}
            {step === 2 && "Review your brand brief"}
            {step === 3 && "Content guardrails"}
          </h2>

          {step === 0 && <StepBrand onSave={handleBrandSave} />}
          {step === 1 && <StepCorpus voiceStyle={voiceStyle} onSave={handleCorpusSave} onSkip={() => setStep(2)} />}
          {step === 2 && <StepBrief voiceStyle={voiceStyle} corpusCount={corpusCount} onSave={handleBriefSave} onSkip={() => setStep(3)} />}
          {step === 3 && <StepGuardrails onSave={handleGuardrailsSave} onSkip={() => setStep(4)} />}

          {step > 0 && step < 4 && (
            <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border-subtle)" }}>
              <button className="btn ghost sm" onClick={() => setStep(step - 1)}>&larr; Back</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
