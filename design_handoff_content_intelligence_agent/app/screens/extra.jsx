/* global React, FIXTURES, Icon, ChannelMark, Avatar, ScoreSwatch, Sparkline, ScreenFrame, useRouter */
const { useState: useStX, useMemo: useMemoX } = React;

// ─── Shared helpers ──────────────────────────────────────────
function EmptyState({ icon, title, body, primaryLabel, primaryAction, secondaryLabel, helper }) {
  return (
    <div style={{ padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 4 }}>
      <div style={{
        width: 56, height: 56, borderRadius: 12, background: 'var(--accent-soft)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8,
      }}>
        <Icon name={icon || 'sparkle'} size={26} style={{ color: 'var(--accent)' }} />
      </div>
      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>{title}</h3>
      <p style={{ margin: '4px 0 14px', fontSize: 13, color: 'var(--ink-secondary)', maxWidth: 460, lineHeight: 1.55 }}>{body}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        {primaryLabel && <button className="btn primary sm" onClick={primaryAction}>{primaryLabel}</button>}
        {secondaryLabel && <button className="btn ghost sm">{secondaryLabel}</button>}
      </div>
      {helper && <div style={{ fontSize: 11, color: 'var(--ink-tertiary)', marginTop: 12, fontStyle: 'italic' }}>{helper}</div>}
    </div>
  );
}

function IdempotencyPill({ id }) {
  return (
    <button
      className="mono"
      onClick={() => navigator.clipboard?.writeText(id)}
      title="Copy idempotency key"
      style={{
        fontSize: 10, padding: '2px 6px', background: 'var(--bg-muted)',
        border: '1px solid var(--border-subtle)', borderRadius: 3,
        color: 'var(--ink-tertiary)', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace',
      }}
    >{id}</button>
  );
}

// ─── Thought Leaders ─────────────────────────────────────────
function ThoughtLeaders() {
  const leaders = [
    { name: 'Sabrina Ramonov', handle: '@sabrinaramonov', role: 'AI/B2B operator playbooks', followers: '142K', velocity: 7, voice: 0.84, last: '2h ago', lastPost: 'The 12-prompt system that handles 80% of my GTM content writing' },
    { name: 'Pierre Herubel', handle: '@pierre-herubel', role: 'Demand gen · B2B SaaS', followers: '94K', velocity: 5, voice: 0.79, last: '6h ago', lastPost: 'Most B2B ads fail at the same frame: "we are X for Y." Try this instead.' },
    { name: 'Justin Welsh', handle: '@justinwelsh', role: 'Solopreneur OS', followers: '485K', velocity: 11, voice: 0.81, last: '38m ago', lastPost: 'I made $5.2M as a solopreneur. Here\'s the only org chart that scales without hiring.' },
    { name: 'Amanda Natividad', handle: '@amandanat', role: 'Zero-click content', followers: '78K', velocity: 4, voice: 0.86, last: '1d ago', lastPost: 'Your blog is not the destination. The SERP is. Design for the SERP.' },
    { name: 'Devin Reed', handle: '@devinreed', role: 'Content-led growth', followers: '52K', velocity: 6, voice: 0.83, last: '4h ago', lastPost: 'Founder-led content beats brand-led content 9 times out of 10. Here\'s the data.' },
    { name: 'Chris Walker', handle: '@chriswalker', role: 'Demand creation', followers: '167K', velocity: 9, voice: 0.77, last: '11h ago', lastPost: 'Stop measuring MQLs. Start measuring "deals influenced by content in the last 90 days."' },
  ];
  return (
    <ScreenFrame
      title="Thought leaders"
      summary="Track the operators whose voices shape your market. We pull their last 30 posts, score them on your rubric, and surface 'your angle' suggestions on the Idea Wall."
      actions={<>
        <button className="btn ghost sm"><Icon name="filter" size={13} /> Filter</button>
        <button className="btn primary sm"><Icon name="plus" size={13} /> Track new</button>
      </>}
    >
      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
        {[
          ['Tracking', '6 leaders', 'across LinkedIn + X'],
          ['Posts ingested 7d', '254', 'avg 6.8 / leader / week'],
          ['Ideas surfaced', '42', '17 made it to drafts'],
          ['Avg voice fit', '0.82', '↑ 0.03 vs last month'],
        ].map(([l, v, s]) => (
          <div key={l} className="card" style={{ padding: 12 }}>
            <div className="eyebrow" style={{ fontSize: 9.5 }}>{l}</div>
            <div className="tabular" style={{ fontSize: 22, fontWeight: 600, fontFamily: 'Montserrat', marginTop: 4 }}>{v}</div>
            <div style={{ fontSize: 10.5, color: 'var(--ink-tertiary)', marginTop: 2 }}>{s}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
        {/* Leader list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {leaders.map(l => (
            <div key={l.handle} className="card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', minWidth: 0 }}>
                  <Avatar name={l.name} size={36} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600 }}>{l.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--ink-tertiary)' }}>{l.handle}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-secondary)', marginTop: 1 }}>{l.role} · {l.followers} followers</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ScoreSwatch value={l.voice} label={null} compact />
                  <button className="btn ghost icon sm"><Icon name="moreH" size={13} /></button>
                </div>
              </div>
              <div style={{ marginTop: 12, padding: 10, background: 'var(--bg-muted)', borderRadius: 4, fontSize: 12.5, lineHeight: 1.5 }}>
                <div className="eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>LATEST · {l.last}</div>
                <div style={{ color: 'var(--ink-primary)' }}>"{l.lastPost}"</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center', fontSize: 10.5, color: 'var(--ink-tertiary)' }}>
                  <button className="btn ghost sm" style={{ padding: '3px 8px', fontSize: 10.5 }}><Icon name="sparkle" size={11} /> Generate "your angle"</button>
                  <button className="btn ghost sm" style={{ padding: '3px 8px', fontSize: 10.5 }}>View on LinkedIn</button>
                  <span style={{ marginLeft: 'auto' }}>{l.velocity}/wk velocity</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right: this week's signals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 14 }}>
            <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 10 }}>BREAKOUT POSTS · 7 DAYS</div>
            {[
              ['Justin Welsh', '11.4K likes', 'Solopreneur org chart'],
              ['Chris Walker', '4.8K likes', 'Stop measuring MQLs'],
              ['Sabrina Ramonov', '3.1K likes', '12-prompt system'],
            ].map(([n, l, t]) => (
              <div key={n} style={{ padding: '8px 0', borderBottom: '1px dashed var(--border-subtle)', fontSize: 11.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 600 }}>{n}</span>
                  <span className="mono tabular" style={{ fontSize: 10.5, color: 'var(--good)' }}>{l}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-secondary)', marginTop: 2 }}>{t}</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: 14 }}>
            <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 10 }}>EMERGING TOPICS · CO-OCCURRENCE</div>
            {[
              ['founder-led content', 7, 'good'],
              ['glass-box AI', 5, 'good'],
              ['$/draft economics', 4, 'good'],
              ['anti-AI guardrails', 3, 'mid'],
              ['voice fingerprinting', 2, 'mid'],
            ].map(([t, n, tone]) => (
              <div key={t} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 11.5 }}>
                <span>{t}</span>
                <span className={`pill ${tone}`}>{n} leaders</span>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: 14, background: 'var(--accent-soft)', borderColor: 'var(--accent)' }}>
            <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 6, color: 'var(--accent)' }}>SUGGESTED ANGLE</div>
            <div style={{ fontSize: 12, lineHeight: 1.55 }}>
              Justin Welsh and Sabrina both posted about <strong>founder-led content</strong> this week. <strong>Your angle:</strong> founder-led content fails when the founder doesn't have a voice corpus. Show the math.
            </div>
            <button className="btn primary sm" style={{ marginTop: 10, width: '100%' }}>Send to Idea Wall</button>
          </div>
        </div>
      </div>
    </ScreenFrame>
  );
}

// ─── Audit Log ───────────────────────────────────────────────
function AuditLog() {
  const events = [
    { t: '14:42:19', who: 'Neeraj Kumar', action: 'draft.published', subject: 'd_a8f2 → LinkedIn', diff: '+217 chars · score 8.4' },
    { t: '14:41:58', who: 'Neeraj Kumar', action: 'draft.scored', subject: 'd_a8f2', diff: 'voice 0.91 · hook 0.88' },
    { t: '14:39:02', who: 'system', action: 'connector.token_refresh.failed', subject: 'beehiiv', diff: 'cat·4 OAuth expiry · marked reconnect' },
    { t: '14:25:11', who: 'Stephen Klein', action: 'rules.added', subject: 'phrase: "paradigm shift"', diff: 'severity:high · action:block' },
    { t: '13:58:44', who: 'Neeraj Kumar', action: 'brand_brief.updated', subject: 'v13 → v14', diff: 'added voice trait "skeptical of frameworks"' },
    { t: '13:42:08', who: 'Diane O\'Connor', action: 'draft.approved', subject: 'd_b2c1 (Acme)', diff: 'magic-link · 11 min review' },
    { t: '12:14:55', who: 'system', action: 'voice_drift.alert', subject: 'last 5 drafts', diff: 'cosine 0.79 < threshold 0.80' },
    { t: '11:08:21', who: 'Neeraj Kumar', action: 'workspace.member_invited', subject: 'marcus@hyperion.co', diff: 'role:editor · brand:hyperion' },
    { t: '09:47:02', who: 'Priya Mehta', action: 'prompt.customized', subject: 'hook_generator', diff: 'override at brand level · v3' },
  ];
  return (
    <ScreenFrame
      title="Audit log"
      summary="Every state-changing action. Workspace-scoped, append-only, retained forever. Search, filter, export to SIEM."
      actions={<>
        <button className="btn ghost sm"><Icon name="filter" size={13} /> Filter</button>
        <button className="btn ghost sm"><Icon name="download" size={13} /> Export 30d</button>
      </>}
    >
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-muted)', fontSize: 11, display: 'flex', justifyContent: 'space-between' }}>
          <span className="eyebrow" style={{ fontSize: 9.5 }}>LAST 24H · 4,218 EVENTS · 5 ACTORS · 1 ALERT</span>
          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-tertiary)' }}>workspace_id = ws_fullfunnel · region = ap-south-1</span>
        </div>
        <table style={{ width: '100%', fontSize: 11.5, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {['Time', 'Actor', 'Action', 'Subject', 'Δ Diff'].map(h => (
                <th key={h} className="eyebrow" style={{ fontSize: 9, padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.map((e, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td className="mono" style={{ padding: '8px 12px', color: 'var(--ink-tertiary)' }}>{e.t}</td>
                <td style={{ padding: '8px 12px' }}>
                  {e.who === 'system' ? (
                    <span className="pill outline"><Icon name="bolt" size={10} /> system</span>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Avatar name={e.who} size={20} /><span>{e.who}</span>
                    </div>
                  )}
                </td>
                <td className="mono" style={{ padding: '8px 12px', color: e.action.includes('failed') || e.action.includes('alert') ? 'var(--danger)' : 'var(--ink-primary)' }}>{e.action}</td>
                <td style={{ padding: '8px 12px' }}>{e.subject}</td>
                <td style={{ padding: '8px 12px', color: 'var(--ink-tertiary)', fontSize: 11 }}>{e.diff}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ScreenFrame>
  );
}

// ─── Models (provider config) ────────────────────────────────
function Models() {
  const providers = [
    { id: 'anthropic', name: 'Anthropic', status: 'active', models: ['claude-sonnet-4.5', 'claude-haiku-4.5', 'claude-opus-4.5'], usage: '78%', cost: '$132.40' },
    { id: 'openai', name: 'OpenAI', status: 'active', models: ['gpt-4.1', 'gpt-4.1-mini', 'o1-mini'], usage: '14%', cost: '$28.10' },
    { id: 'google', name: 'Google · Gemini', status: 'active', models: ['gemini-2.5-pro', 'gemini-2.5-flash'], usage: '6%', cost: '$8.20' },
    { id: 'openrouter', name: 'OpenRouter', status: 'inactive', models: ['Bring any · 200+ models'], usage: '—', cost: '—' },
    { id: 'voyage', name: 'Voyage AI', status: 'active', models: ['voyage-3', 'voyage-3-lite'], usage: '2%', cost: '$3.40', kind: 'embeddings' },
    { id: 'cohere', name: 'Cohere', status: 'active', models: ['rerank-3'], usage: '<1%', cost: '$1.10', kind: 'rerank' },
  ];
  const tasks = [
    { task: 'Hook generation', primary: 'claude-sonnet-4.5', fallback: 'gpt-4.1', cost: '$0.012/draft', latency: '420ms p50' },
    { task: 'Body draft', primary: 'claude-sonnet-4.5', fallback: 'gpt-4.1', cost: '$0.038/draft', latency: '1.8s p50' },
    { task: 'Voice scoring', primary: 'claude-haiku-4.5', fallback: 'gpt-4.1-mini', cost: '$0.004/draft', latency: '180ms p50' },
    { task: 'Anti-AI audit', primary: 'claude-haiku-4.5', fallback: 'gemini-2.5-flash', cost: '$0.002/draft', latency: '110ms p50' },
    { task: 'Idea ranking', primary: 'claude-haiku-4.5', fallback: '—', cost: '$0.001/idea', latency: '90ms p50' },
    { task: 'Embeddings', primary: 'voyage-3', fallback: '—', cost: '$0.0001/post', latency: '40ms p50' },
    { task: 'Rerank (RAG)', primary: 'rerank-3', fallback: '—', cost: '$0.0002/query', latency: '60ms p50' },
  ];
  return (
    <ScreenFrame
      title="Models"
      summary="Provider config + per-task routing. BYOK — bring your own keys, pay your own bills, or use ours. Fallback chain ensures availability."
      actions={<>
        <button className="btn ghost sm">Test all providers</button>
        <button className="btn primary sm"><Icon name="plus" size={13} /> Add provider</button>
      </>}
    >
      <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 10 }}>PROVIDERS · 5 ACTIVE · 1 INACTIVE</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10, marginBottom: 22 }}>
        {providers.map(p => (
          <div key={p.id} className="card" style={{ padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 10.5, color: 'var(--ink-tertiary)', marginTop: 1 }}>
                  {p.kind || 'completion'} · {p.models.length} {p.models.length === 1 ? 'model' : 'models'}
                </div>
              </div>
              <span className={`pill ${p.status === 'active' ? 'good' : 'neutral'}`}>
                <span className="dot" />{p.status}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 8, fontSize: 10.5, color: 'var(--ink-secondary)' }}>
              {p.models.slice(0, 3).map(m => (
                <span key={m} className="mono" style={{ fontSize: 10 }}>{m}</span>
              ))}
            </div>
            <div style={{ paddingTop: 8, borderTop: '1px dashed var(--border-subtle)', display: 'flex', justifyContent: 'space-between', fontSize: 10.5 }}>
              <span style={{ color: 'var(--ink-tertiary)' }}>Usage 30d · <span className="mono tabular" style={{ color: 'var(--ink-primary)' }}>{p.usage}</span></span>
              <span className="mono tabular" style={{ color: 'var(--ink-primary)' }}>{p.cost}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <button className="btn ghost sm" style={{ flex: 1 }}>{p.status === 'active' ? 'API key set' : 'Add key'}</button>
              <button className="btn ghost sm icon"><Icon name="settings" size={12} /></button>
            </div>
          </div>
        ))}
      </div>

      <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 10 }}>TASK ROUTING</div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: 'var(--bg-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
            {['Task', 'Primary model', 'Fallback', 'Cost', 'Latency p50', ''].map(h => (
              <th key={h} className="eyebrow" style={{ fontSize: 9, padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {tasks.map(t => (
              <tr key={t.task} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '10px 12px', fontWeight: 500 }}>{t.task}</td>
                <td style={{ padding: '10px 12px' }} className="mono">{t.primary}</td>
                <td style={{ padding: '10px 12px', color: 'var(--ink-tertiary)' }} className="mono">{t.fallback}</td>
                <td style={{ padding: '10px 12px' }} className="mono tabular">{t.cost}</td>
                <td style={{ padding: '10px 12px' }} className="mono tabular">{t.latency}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}><button className="btn ghost sm">Change</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ScreenFrame>
  );
}

// ─── Prompt Studio (glass-box AI moment) ─────────────────────
function PromptStudio() {
  const [active, setActive] = useStX('hook_generator');
  const prompts = {
    hook_generator: {
      name: 'Hook generator',
      version: 'v3 · brand override',
      model: 'claude-sonnet-4.5',
      avgCost: '$0.012',
      avgLatency: '420ms',
      lastTested: '2h ago',
      pass: '47/50',
      body: `You are writing a LinkedIn hook for {brand.name}.

Voice traits (must reflect ALL): {brand.voice_traits}
Anti-positioning (NEVER do): {brand.anti_positioning}
Wedge (this is the why): {brand.wedge}

The idea: {idea.text}
The supporting evidence: {idea.sources}

OUTPUT 5 hook variations. Each:
- Max 140 chars
- ZERO em-dashes, ZERO "Furthermore/Moreover/Therefore"
- Specific numbers > vague claims
- End with a contrarian assertion or pointed question
- Avoid corporate jargon: {anti_ai.blocklist}

Return JSON: { variants: [{ text, score_estimate, rationale }] }`,
    },
    body_draft: { name: 'Body draft', version: 'v7 · default', model: 'claude-sonnet-4.5', avgCost: '$0.038', avgLatency: '1.8s', lastTested: '5h ago', pass: '46/50', body: '[Body draft prompt with brand brief, hook, structure constraints…]' },
    voice_scorer: { name: 'Voice scorer', version: 'v2 · default', model: 'claude-haiku-4.5', avgCost: '$0.004', avgLatency: '180ms', lastTested: '1h ago', pass: '50/50', body: '[7-dim voice scoring rubric: hook(50%), specificity, contrarian, brevity, structure, ending, voice_match…]' },
    anti_ai_audit: { name: 'Anti-AI audit', version: 'v4 · brand override', model: 'claude-haiku-4.5', avgCost: '$0.002', avgLatency: '110ms', lastTested: '3h ago', pass: '49/50', body: '[Audit prompt: regex pre-pass + LLM-judge tie-breaker over phrase blocklist…]' },
    idea_ranker: { name: 'Idea ranker', version: 'v1 · default', model: 'claude-haiku-4.5', avgCost: '$0.001', avgLatency: '90ms', lastTested: '6h ago', pass: '48/50', body: '[Idea ranker scoring on wedge-fit, ICP-pain-resonance, format-match, recency…]' },
  };
  const p = prompts[active];
  return (
    <ScreenFrame
      title="Prompt studio"
      summary="Glass-box AI. Every prompt that runs in your workspace is here. Inspect it. Edit it. Test it against your last 50 drafts. Pin a version per brand."
      actions={<>
        <button className="btn ghost sm">Run test (50 drafts)</button>
        <button className="btn ghost sm"><Icon name="download" size={13} /> Export prompt</button>
        <button className="btn primary sm"><Icon name="edit" size={13} /> Edit prompt</button>
      </>}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>
        {/* Prompt list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className="eyebrow" style={{ fontSize: 9.5, padding: '0 8px 6px' }}>PROMPTS · 5</div>
          {Object.entries(prompts).map(([k, v]) => (
            <button
              key={k}
              onClick={() => setActive(k)}
              className="btn ghost"
              style={{
                justifyContent: 'flex-start', padding: '8px 10px',
                background: active === k ? 'var(--accent-soft)' : 'transparent',
                color: active === k ? 'var(--accent)' : 'var(--ink-primary)',
                fontWeight: active === k ? 600 : 500, fontSize: 12,
                flexDirection: 'column', alignItems: 'flex-start', gap: 2,
              }}
            >
              <span>{v.name}</span>
              <span className="mono" style={{ fontSize: 9.5, color: 'var(--ink-tertiary)', fontWeight: 400 }}>{v.version}</span>
            </button>
          ))}
          <div className="card" style={{ padding: 10, marginTop: 10, background: 'var(--bg-muted)' }}>
            <div className="eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>OVERRIDE LEVELS</div>
            <div style={{ fontSize: 10.5, lineHeight: 1.5, color: 'var(--ink-secondary)' }}>
              workspace → brand → prompt-version<br/>
              Most-specific wins. Brand-level locks are surfaced on the right.
            </div>
          </div>
        </div>

        {/* Prompt detail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              ['Model', p.model, 'mono'],
              ['Avg cost', p.avgCost, 'tabular'],
              ['Avg latency', p.avgLatency, 'tabular'],
              ['Tests pass', p.pass, 'tabular'],
            ].map(([l, v, cls]) => (
              <div key={l} className="card" style={{ padding: 10 }}>
                <div className="eyebrow" style={{ fontSize: 9 }}>{l}</div>
                <div className={cls} style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', background: 'var(--bg-muted)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="eyebrow" style={{ fontSize: 9.5 }}>PROMPT TEMPLATE</span>
                <span className="pill good"><span className="dot" />{p.version}</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn ghost sm">Diff vs default</button>
                <button className="btn ghost sm">Version history</button>
              </div>
            </div>
            <pre style={{
              margin: 0, padding: 16, fontSize: 11.5, lineHeight: 1.7,
              fontFamily: 'JetBrains Mono, monospace',
              background: 'var(--bg-canvas)', color: 'var(--ink-primary)',
              maxHeight: 360, overflow: 'auto', whiteSpace: 'pre-wrap',
            }}>{p.body}</pre>
          </div>

          <div className="card" style={{ padding: 12 }}>
            <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 8 }}>VARIABLES IN SCOPE</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['{brand.name}', '{brand.voice_traits}', '{brand.wedge}', '{brand.anti_positioning}', '{idea.text}', '{idea.sources}', '{anti_ai.blocklist}', '{user.name}', '{voice_corpus.exemplars}'].map(v => (
                <span key={v} className="mono pill outline" style={{ fontSize: 10 }}>{v}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ScreenFrame>
  );
}

// ─── Data Export ─────────────────────────────────────────────
function DataExport() {
  const datasets = [
    { name: 'Drafts', count: '247', size: '4.2 MB', formats: ['JSON', 'CSV', 'Markdown'] },
    { name: 'Published posts', count: '189', size: '1.8 MB', formats: ['JSON', 'CSV'] },
    { name: 'Voice corpus', count: '247 posts · 31 embeddings', size: '14.6 MB', formats: ['JSON', 'JSONL', 'Parquet'] },
    { name: 'Brand briefs (all versions)', count: '14 versions', size: '180 KB', formats: ['JSON', 'Markdown'] },
    { name: 'Anti-AI rules', count: '62 rules', size: '12 KB', formats: ['JSON', 'YAML'] },
    { name: 'Schedule', count: '142 slots · 12 future', size: '320 KB', formats: ['JSON', 'CSV', 'iCal'] },
    { name: 'API call logs', count: '128,470 calls · 30d', size: '38.4 MB', formats: ['JSON', 'CSV', 'NDJSON'] },
    { name: 'Audit log', count: '4,218 events · 30d', size: '2.1 MB', formats: ['JSON', 'NDJSON'] },
    { name: 'Custom prompts', count: '5 prompts · all versions', size: '24 KB', formats: ['JSON'] },
    { name: 'Insights snapshots', count: 'Weekly · 8 wks', size: '210 KB', formats: ['JSON', 'CSV'] },
  ];
  const recent = [
    { t: 'May 8 · 09:14', who: 'Neeraj Kumar', what: 'full-export.tar.gz', size: '61.4 MB', state: 'ready' },
    { t: 'May 1 · 14:42', who: 'Neeraj Kumar', what: 'drafts-only.json', size: '4.2 MB', state: 'expired' },
    { t: 'Apr 22 · 16:08', who: 'Stephen Klein', what: 'voice-corpus.jsonl', size: '14.6 MB', state: 'expired' },
  ];
  return (
    <ScreenFrame
      title="Data export"
      summary="Take your data. All of it. Any time. We commit to portability — no lock-in. Exports run async, signed URLs valid 7 days, audited."
      actions={<button className="btn primary sm"><Icon name="download" size={13} /> New export</button>}
    >
      <div className="card" style={{ padding: 14, marginBottom: 18, background: 'var(--accent-soft)', borderColor: 'var(--accent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="shield" size={18} style={{ color: 'var(--accent)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Portability commitment</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-secondary)', marginTop: 2 }}>
              Every dataset is exportable in open formats. Voice corpus embeddings ship as Parquet so you can re-embed elsewhere. Custom prompts ship as JSON so they run on your own stack. Cancel anytime, take everything with you.
            </div>
          </div>
        </div>
      </div>

      <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 10 }}>DATASETS · PICK WHAT TO EXPORT</div>
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 22 }}>
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: 'var(--bg-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
            <th style={{ padding: '8px 12px', width: 36 }}><input type="checkbox" /></th>
            {['Dataset', 'Count', 'Size', 'Formats', ''].map(h => (
              <th key={h} className="eyebrow" style={{ fontSize: 9, padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {datasets.map(d => (
              <tr key={d.name} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '10px 12px' }}><input type="checkbox" defaultChecked /></td>
                <td style={{ padding: '10px 12px', fontWeight: 500 }}>{d.name}</td>
                <td style={{ padding: '10px 12px' }} className="tabular mono">{d.count}</td>
                <td style={{ padding: '10px 12px' }} className="tabular mono">{d.size}</td>
                <td style={{ padding: '10px 12px' }}>
                  {d.formats.map(f => <span key={f} className="pill outline" style={{ marginRight: 4, fontSize: 10 }}>{f}</span>)}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}><button className="btn ghost sm">Preview</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5 }}>
          <span>10 datasets selected · est. <span className="mono tabular">61.4 MB</span> compressed</span>
          <button className="btn primary sm">Generate export</button>
        </div>
      </div>

      <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 10 }}>RECENT EXPORTS</div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <tbody>
            {recent.map((r, i) => (
              <tr key={i} style={{ borderBottom: i < recent.length - 1 ? '1px solid var(--border-subtle)' : 0 }}>
                <td className="mono" style={{ padding: '10px 12px', color: 'var(--ink-tertiary)', fontSize: 11 }}>{r.t}</td>
                <td style={{ padding: '10px 12px' }}>{r.who}</td>
                <td className="mono" style={{ padding: '10px 12px' }}>{r.what}</td>
                <td className="mono tabular" style={{ padding: '10px 12px' }}>{r.size}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span className={`pill ${r.state === 'ready' ? 'good' : 'neutral'}`}>
                    <span className="dot" />{r.state}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                  <button className="btn ghost sm" disabled={r.state !== 'ready'}>{r.state === 'ready' ? 'Download' : 'Expired'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ScreenFrame>
  );
}

// ─── Onboarding (7-step wizard) ──────────────────────────────
function Onboarding() {
  const [step, setStep] = useStX(2); // step index, 0-based
  const steps = [
    { n: 1, label: 'Sign up', time: '20s', icon: 'user' },
    { n: 2, label: 'Workspace', time: '30s', icon: 'building' },
    { n: 3, label: 'Voice corpus', time: '2-3 min', icon: 'sparkle', critical: true },
    { n: 4, label: 'Brand brief', time: '3-4 min', icon: 'book' },
    { n: 5, label: 'Connect channel', time: '1 min', icon: 'plug' },
    { n: 6, label: 'First post', time: '3-5 min', icon: 'edit' },
    { n: 7, label: 'Ship', time: '30s', icon: 'send' },
  ];
  const current = steps[step];
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-canvas)' }}>
      {/* Stepper */}
      <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div className="eyebrow" style={{ fontSize: 9.5 }}>FIRST-RUN ACTIVATION</div>
            <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.012em', marginTop: 2 }}>Welcome to Content Intelligence Agent</div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-tertiary)' }}>
            Target activation · <span className="mono tabular">12-15 min</span> · Step {step + 1} of 7
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {steps.map((s, i) => (
            <div key={s.n} style={{ flex: s.critical ? 1.4 : 1 }}>
              <div style={{
                height: 4, borderRadius: 2, marginBottom: 6,
                background: i < step ? 'var(--good)' : i === step ? 'var(--accent)' : 'var(--bg-muted)',
              }} />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 10.5 }}>
                <span className="mono tabular" style={{ color: 'var(--ink-tertiary)' }}>0{s.n}</span>
                <span style={{ fontWeight: i === step ? 600 : 500, color: i === step ? 'var(--accent)' : i < step ? 'var(--ink-primary)' : 'var(--ink-tertiary)' }}>{s.label}</span>
                {s.critical && <span className="pill bad" style={{ fontSize: 8.5, marginLeft: 'auto' }}>CRITICAL</span>}
              </div>
              <div style={{ fontSize: 9.5, color: 'var(--ink-quaternary)', marginTop: 1 }}>{s.time}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 64px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {step === 2 ? <VoiceCorpusStep /> : <GenericStep current={current} />}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, paddingTop: 18, borderTop: '1px solid var(--border-subtle)' }}>
            <button className="btn ghost sm" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>← Back</button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn ghost sm">Skip for now</button>
              <button className="btn primary sm" onClick={() => setStep(Math.min(6, step + 1))}>
                {step === 6 ? 'Finish & ship' : `Continue → ${steps[step + 1]?.label || ''}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GenericStep({ current }) {
  return (
    <>
      <div className="eyebrow" style={{ fontSize: 9.5 }}>STEP 0{current.n} · {current.time}</div>
      <h2 style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.018em', margin: '6px 0 8px' }}>{current.label}</h2>
      <p style={{ fontSize: 14, color: 'var(--ink-secondary)', lineHeight: 1.55, marginBottom: 20 }}>
        {current.label === 'Sign up' && 'Authenticate via Google or email. Standard Clerk auth — we never see your password.'}
        {current.label === 'Workspace' && 'Name your workspace and pick "solo operator" or "agency". This sets the initial sidebar density and seat plan.'}
        {current.label === 'Brand brief' && '5 quick questions: wedge, ICP, voice traits, anti-positioning, anti-AI strict mode. Pre-populated from your voice corpus where possible.'}
        {current.label === 'Connect channel' && 'OAuth your first publishing channel. LinkedIn first (highest activation per Sabrina playbook). X, Substack, Beehiiv, Bluesky next.'}
        {current.label === 'First post' && 'Pick from 2 wedge-driven idea suggestions. Generate hooks, iterate, score. Target: voice ≥0.85, score ≥8/10.'}
        {current.label === 'Ship' && 'Publish now or schedule for the next slot. We verify the post landed at +10min and confirm in-app.'}
      </p>
      <div style={{ padding: 18, background: 'var(--bg-muted)', borderRadius: 6, fontSize: 12, color: 'var(--ink-tertiary)', textAlign: 'center', fontStyle: 'italic' }}>
        [{current.label} step UI · representative placeholder]
      </div>
    </>
  );
}

function VoiceCorpusStep() {
  const [picked, setPicked] = useStX('linkedin');
  const opts = [
    { id: 'linkedin', recommended: true, title: 'Connect LinkedIn — pull last 90 days', body: 'We pull your last ~30 posts via LinkedIn API and embed them. Takes 30s. Review and remove any before they\'re saved.', perm: 'r_member_social · read-only · we never publish during corpus collection' },
    { id: 'paste', title: 'Paste 10-20 of your best posts', body: 'Drop into a textarea, separated by blank lines. We embed each one and surface voice traits.' },
    { id: 'skill', tag: 'Skills user', title: 'Import from Salience-style skill export', body: 'Drop your salience-export.json file. Brand brief + voice corpus + saved drafts all imported. Activation in ~3 min.' },
    { id: 'csv', title: 'Upload CSV / Markdown', body: 'One post per row or one .md per file. Useful if you draft outside any specific platform.' },
  ];
  return (
    <>
      <div className="eyebrow" style={{ fontSize: 9.5, color: 'var(--danger)' }}>STEP 03 · THE MAKE-OR-BREAK STEP</div>
      <h2 style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.018em', margin: '6px 0 8px' }}>How should we learn your voice?</h2>
      <p style={{ fontSize: 14, color: 'var(--ink-secondary)', lineHeight: 1.55, marginBottom: 20 }}>
        Content Intelligence Agent scores every draft against <strong style={{ color: 'var(--ink-primary)' }}>your</strong> writing — not generic "good B2B prose." This needs 10+ samples of your published work. Pick the easiest path.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {opts.map(o => (
          <button
            key={o.id}
            onClick={() => setPicked(o.id)}
            style={{
              textAlign: 'left', padding: 16,
              background: picked === o.id ? 'var(--accent-soft)' : 'var(--bg-surface)',
              border: `1.5px solid ${picked === o.id ? 'var(--accent)' : 'var(--border-subtle)'}`,
              borderRadius: 6, color: 'inherit', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>
                {o.title}
                {o.recommended && <span className="pill" style={{ background: 'var(--accent)', color: 'white', marginLeft: 8 }}>Recommended</span>}
                {o.tag && <span className="pill outline" style={{ marginLeft: 8 }}>{o.tag}</span>}
              </span>
              {picked === o.id && <span className="pill" style={{ background: 'var(--accent)', color: 'white' }}>Selected</span>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-secondary)' }}>{o.body}</div>
            {o.perm && picked === o.id && (
              <div className="mono" style={{ fontSize: 10, color: 'var(--ink-tertiary)', marginTop: 6, padding: '6px 8px', background: 'var(--bg-muted)', borderRadius: 4 }}>{o.perm}</div>
            )}
          </button>
        ))}
      </div>
      <div className="card" style={{ padding: 12, marginTop: 14, background: 'var(--bg-muted)', borderStyle: 'dashed', fontSize: 11.5, color: 'var(--ink-secondary)' }}>
        <strong style={{ color: 'var(--ink-primary)' }}>Don't have a corpus yet?</strong> Skip and add later. Voice fidelity scoring stays disabled until you provide one. We'll re-prompt after you ship 5 posts.
      </div>
    </>
  );
}

Object.assign(window, { ThoughtLeaders, AuditLog, Models, PromptStudio, DataExport, Onboarding, EmptyState, IdempotencyPill });
