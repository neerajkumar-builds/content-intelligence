"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useOrganizationList, useClerk } from "@clerk/nextjs";
import { trpc } from "@/lib/trpc/client";
import { Stepper } from "@/components/onboarding/stepper";
import { Welcome } from "@/components/onboarding/welcome";
import { Completion } from "@/components/onboarding/completion";
import { StepBrand, type BrandData } from "@/components/onboarding/step-brand";
import { StepCorpus, type CorpusItem, type CorpusFullState } from "@/components/onboarding/step-corpus";
import { StepBrief } from "@/components/onboarding/step-brief";
import { StepGuardrails } from "@/components/onboarding/step-guardrails";

interface CorpusState {
  items: CorpusItem[];
  tab: "paste" | "guided" | "template";
  pasteText: string;
  guidedAnswers: string[];
  selectedTemplate: string | null;
  templatePosts: string[];
}

interface OnboardingState {
  brandData: BrandData | null;
  corpusItems: CorpusItem[];
  corpusState: CorpusState | null;
  briefData: { wedge: string; icp: string; voiceTraits: string; antiPositioning: string } | null;
  guardrailsData: { strictMode: boolean; enabledCategories: string[] } | null;
  brandId: string | null;
  workspaceId: string | null;
}

export default function OnboardingPage() {
  const [step, setStep] = useState(-1);
  const [state, setState] = useState<OnboardingState>({
    brandData: null,
    corpusItems: [],
    corpusState: null,
    briefData: null,
    guardrailsData: null,
    brandId: null,
    workspaceId: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const router = useRouter();
  const { orgId } = useAuth();
  const { createOrganization } = useOrganizationList();
  const { setActive } = useClerk();

  const saveBrand = trpc.onboarding.saveBrandIdentity.useMutation();
  const saveCorpus = trpc.onboarding.saveCorpusItems.useMutation();
  const saveBrief = trpc.onboarding.saveBrief.useMutation();
  const saveGuardrailsMut = trpc.onboarding.saveGuardrails.useMutation();
  const completeMut = trpc.onboarding.complete.useMutation();
  const skipMut = trpc.onboarding.skip.useMutation();

  const { data: stepData } = trpc.onboarding.getStep.useQuery();

  const autoCompleteTriggered = useRef(false);
  useEffect(() => {
    if (!stepData) return;
    if (stepData.step >= 5) {
      router.replace("/");
    } else if (stepData.step === 4 && !autoCompleteTriggered.current) {
      autoCompleteTriggered.current = true;
      completeMut.mutateAsync().then(() => router.replace("/"));
    }
  }, [stepData, router, completeMut]);

  const isLoading =
    saving ||
    saveBrand.isPending ||
    saveCorpus.isPending ||
    saveBrief.isPending ||
    saveGuardrailsMut.isPending ||
    completeMut.isPending;

  const voiceStyle = state.brandData?.voiceStyle ?? "direct";
  const corpusCount = state.corpusItems.length;

  const handleBrandSave = useCallback(
    async (data: BrandData) => {
      setError(null);
      setSaving(true);
      try {
        const effectiveIndustry = data.industry === "Other" ? data.customIndustry : data.industry;
        const effectiveRole = data.role === "Other" ? data.customRole : data.role;

        if (!orgId && createOrganization) {
          const org = await createOrganization({ name: data.brandName });
          await setActive({ organization: org.id });
        }

        const result = await saveBrand.mutateAsync({
          brandName: data.brandName,
          industry: effectiveIndustry,
          voiceStyle: data.voiceStyle,
          role: effectiveRole || undefined,
          websiteUrl: data.websiteUrl || undefined,
          additionalBrands: data.additionalBrands.length > 0 ? data.additionalBrands : undefined,
        });

        setState((prev) => ({
          ...prev,
          brandData: data,
          brandId: result.brandId,
          workspaceId: result.workspaceId,
        }));
        setStep(1);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save brand identity");
      } finally {
        setSaving(false);
      }
    },
    [orgId, createOrganization, setActive, saveBrand],
  );

  const handleCorpusSave = useCallback(
    async (items: CorpusItem[], fullState: CorpusFullState) => {
      setError(null);
      setSaving(true);
      try {
        if (!state.brandId) throw new Error("Brand not created yet");

        await saveCorpus.mutateAsync({
          brandId: state.brandId,
          items: items.map((item) => ({
            content: item.content,
            sourceUrl: item.sourceUrl || undefined,
          })),
        });

        setState((prev) => ({
          ...prev,
          corpusItems: items,
          corpusState: fullState as CorpusState,
        }));
        setStep(2);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save voice corpus");
      } finally {
        setSaving(false);
      }
    },
    [state.brandId, saveCorpus],
  );

  const handleCorpusSkip = useCallback(async () => {
    setError(null);
    try {
      await skipMut.mutateAsync({ currentStep: 2 });
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to skip");
    }
  }, [skipMut]);

  const handleBriefSave = useCallback(
    async (data: { wedge: string; icp: string; voiceTraits: string; antiPositioning: string }) => {
      setError(null);
      setSaving(true);
      try {
        if (!state.brandId) throw new Error("Brand not created yet");

        await saveBrief.mutateAsync({
          brandId: state.brandId,
          wedge: data.wedge,
          icp: data.icp,
          voiceTraits: data.voiceTraits,
          antiPositioning: data.antiPositioning,
        });

        setState((prev) => ({ ...prev, briefData: data }));
        setStep(3);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save brand brief");
      } finally {
        setSaving(false);
      }
    },
    [state.brandId, saveBrief],
  );

  const handleBriefSkip = useCallback(async () => {
    setError(null);
    try {
      await skipMut.mutateAsync({ currentStep: 3 });
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to skip");
    }
  }, [skipMut]);

  const handleGuardrailsSave = useCallback(
    async (data: { strictMode: boolean; enabledCategories: string[] }) => {
      setError(null);
      setSaving(true);
      try {
        if (!state.brandId) throw new Error("Brand not created yet");

        await saveGuardrailsMut.mutateAsync({
          brandId: state.brandId,
          strictMode: data.strictMode,
          enabledCategories: data.enabledCategories,
        });

        await completeMut.mutateAsync();

        setState((prev) => ({ ...prev, guardrailsData: data }));
        setStep(4);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save guardrails");
      } finally {
        setSaving(false);
      }
    },
    [state.brandId, saveGuardrailsMut, completeMut],
  );

  const handleGuardrailsSkip = useCallback(async () => {
    setError(null);
    setSaving(true);
    try {
      await completeMut.mutateAsync();
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to complete onboarding");
    } finally {
      setSaving(false);
    }
  }, [completeMut]);

  if (step === -1) {
    return <Welcome onStart={() => setStep(0)} />;
  }

  if (step >= 4) {
    return <Completion />;
  }

  return (
    <>
      <Stepper currentStep={step} />
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 64px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {error && (
            <div
              style={{
                padding: "10px 14px",
                marginBottom: 16,
                background: "var(--danger-soft, #fee)",
                border: "1px solid var(--danger, #c00)",
                borderRadius: 6,
                fontSize: 13,
                color: "var(--danger, #c00)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "inherit" }}
              >
                &times;
              </button>
            </div>
          )}

          <div
            className="eyebrow"
            style={{ fontSize: 9.5, color: step === 1 ? "var(--danger)" : undefined }}
          >
            STEP 0{step + 1}
            {step === 1 ? " · THE MAKE-OR-BREAK STEP" : ""}
          </div>
          <h2
            style={{
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: "-0.018em",
              margin: "6px 0 20px",
            }}
          >
            {step === 0 && "Set up your brand"}
            {step === 1 && "How should we learn your voice?"}
            {step === 2 && "Review your brand brief"}
            {step === 3 && "Content guardrails"}
          </h2>

          <div
            style={{
              opacity: isLoading ? 0.6 : 1,
              pointerEvents: isLoading ? "none" : "auto",
              transition: "opacity 0.2s",
            }}
          >
            {step === 0 && (
              <StepBrand onSave={handleBrandSave} initialData={state.brandData} />
            )}
            {step === 1 && (
              <StepCorpus
                voiceStyle={voiceStyle}
                onSave={handleCorpusSave}
                onSkip={handleCorpusSkip}
                initialItems={state.corpusItems}
                initialState={state.corpusState as CorpusFullState}
              />
            )}
            {step === 2 && (
              <StepBrief
                voiceStyle={voiceStyle}
                corpusCount={corpusCount}
                onSave={handleBriefSave}
                onSkip={handleBriefSkip}
                initialData={state.briefData}
              />
            )}
            {step === 3 && (
              <StepGuardrails
                onSave={handleGuardrailsSave}
                onSkip={handleGuardrailsSkip}
                initialData={state.guardrailsData}
              />
            )}
          </div>

          {isLoading && (
            <div
              style={{
                textAlign: "center",
                padding: "12px 0",
                fontSize: 13,
                color: "var(--ink-tertiary)",
              }}
            >
              Saving...
            </div>
          )}

          {step > 0 && step < 4 && !isLoading && (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-start",
                marginTop: 16,
                paddingTop: 14,
                borderTop: "1px solid var(--border-subtle)",
              }}
            >
              <button className="btn ghost sm" onClick={() => setStep(step - 1)}>
                &larr; Back
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
