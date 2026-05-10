/* global React, ReactDOM */
const { useState, useEffect } = React;

// ─── Tweaks · theme + sidebar mode ─────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "sidebar": "labeled",
  "showApiBadges": true,
  "showCostLedger": true
}/*EDITMODE-END*/;

function CIATweaks({ open, sidebarMode, setSidebarMode }) {
  const { theme, setTheme } = useTheme();
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Sync external state
  useEffect(() => { if (tweaks.theme !== theme) setTheme(tweaks.theme); }, [tweaks.theme]);
  useEffect(() => { if (tweaks.sidebar !== sidebarMode) setSidebarMode(tweaks.sidebar); }, [tweaks.sidebar]);

  if (!open) return null;
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection title="Appearance">
        <TweakRadio
          label="Theme"
          value={theme}
          onChange={(v) => { setTheme(v); setTweak('theme', v); }}
          options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
        />
        <TweakRadio
          label="Sidebar"
          value={sidebarMode}
          onChange={(v) => { setSidebarMode(v); setTweak('sidebar', v); }}
          options={[
            { value: 'labeled', label: 'Labeled' },
            { value: 'icon',    label: 'Icons only' },
          ]}
        />
      </TweakSection>
      <TweakSection title="Operator chrome">
        <TweakToggle
          label="Show API endpoint badges"
          checked={tweaks.showApiBadges}
          onChange={(v) => setTweak('showApiBadges', v)}
        />
        <TweakToggle
          label="Show AI cost ledger"
          checked={tweaks.showCostLedger}
          onChange={(v) => setTweak('showCostLedger', v)}
        />
      </TweakSection>
    </TweaksPanel>
  );
}

// ─── App shell + router ────────────────────────────────────
function App() {
  const [sidebarMode, setSidebarMode] = useState(() => localStorage.getItem('cia.sidebar') || 'labeled');
  const [tweaksOpen, setTweaksOpen] = useState(false);

  useEffect(() => { localStorage.setItem('cia.sidebar', sidebarMode); }, [sidebarMode]);

  // Tweaks host protocol
  useEffect(() => {
    const onMsg = (e) => {
      if (e.data?.type === '__activate_edit_mode') setTweaksOpen(true);
      if (e.data?.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  return (
    <ThemeProvider>
      <RouterProvider>
        <Inner sidebarMode={sidebarMode} setSidebarMode={setSidebarMode}
               tweaksOpen={tweaksOpen} />
      </RouterProvider>
    </ThemeProvider>
  );
}

function Inner({ sidebarMode, setSidebarMode, tweaksOpen }) {
  const { route } = useRouter();
  const screenLabel = `${route.toUpperCase()}`;

  let view;
  if (route === 'home')           view = <Home />;
  else if (route === 'ideas')     view = <IdeaWall />;
  else if (route === 'draft')     view = <Drafts />;
  else if (route === 'schedule')  view = <Schedule />;
  else if (route === 'insights')  view = <Insights />;
  else if (route === 'brand')     view = <BrandBrief />;
  else if (route === 'rules')     view = <AntiAIRules />;
  else if (route === 'connectors')view = <Connectors />;
  else if (route === 'members')   view = <Members />;
  else if (route === 'competitors')view = <Competitors />;
  else if (route === 'leaders')   view = <ThoughtLeaders />;
  else if (route === 'prompts')   view = <PromptStudio />;
  else if (route === 'models')    view = <Models />;
  else if (route === 'audit')     view = <AuditLog />;
  else if (route === 'export')    view = <DataExport />;
  else if (route === 'onboarding')view = <Onboarding />;
  else if (route === 'api')       view = <ApiLogs />;
  else if (route === 'settings')  view = <Settings />;
  else view = <Placeholder {...(PLACEHOLDERS[route] || PLACEHOLDERS.settings)} />;

  return (
    <>
      <div data-screen-label={screenLabel} style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--bg-canvas)' }}>
        <Sidebar mode={sidebarMode} setMode={setSidebarMode} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <TopBar />
          <main style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {view}
          </main>
        </div>
      </div>
      <CIATweaks open={tweaksOpen} sidebarMode={sidebarMode} setSidebarMode={setSidebarMode} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
