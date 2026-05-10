/* global React, FIXTURES, Icon, ChannelMark, ScoreSwatch, Sparkline, useRouter, Avatar */
const { useState: useStG, useMemo: useMemoG } = React;

// ─── Shared screen frame ─────────────────────────────────────
function ScreenFrame({ title, summary, children, actions }) {
  return (
    <div className="fade-in" style={{ height: '100%', overflow: 'auto' }}>
      <div style={{ padding: '20px 28px 8px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, position: 'sticky', top: 0, background: 'var(--bg-canvas)', zIndex: 5 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, letterSpacing: '-0.012em' }}>{title}</h1>
          {summary && <p style={{ fontSize: 12.5, color: 'var(--ink-secondary)', margin: '3px 0 12px', maxWidth: 720 }}>{summary}</p>}
        </div>
        {actions && <div style={{ display: 'flex', gap: 8, paddingTop: 2 }}>{actions}</div>}
      </div>
      <div style={{ padding: '20px 28px 32px' }}>{children}</div>
    </div>
  );
}

// ─── Brand Brief ─────────────────────────────────────────────
function BrandBrief() {
  const [tab, setTab] = useStG('current');
  return (
    <ScreenFrame
      title="Brand brief"
      summary="The single source of truth that feeds every prompt. Versioned, diff-able, embedded into voice scoring."
      actions={<>
        <button className="btn ghost sm">View history</button>
        <button className="btn primary sm"><Icon name="edit" size={13} /> Edit brief</button>
      </>}
    >
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--border-subtle)' }}>
        {['current', 'history', 'diff'].map(t => (
          <button key={t} onClick={() => setTab(t)} className="btn ghost sm" style={{
            borderRadius: 0, borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
            color: tab === t ? 'var(--accent)' : 'var(--ink-secondary)', padding: '8px 12px', fontWeight: tab === t ? 600 : 500,
          }}>{t === 'current' ? 'Current · v14' : t === 'history' ? 'Version history' : 'Diff vs v13'}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'WEDGE', body: 'We do voice-faithful B2B ghostwriting with anti-AI guardrails — for operators whose credibility takes a hit when their content sounds like everyone else\'s.', meta: 'Last edited · 4 days ago by Neeraj' },
            { label: 'ICP', body: 'B2B ops & GTM leaders, 50-500 employees, post personally on LinkedIn 2-5×/week. Pain: their ghostwriter sounds nothing like them; readers can tell.', meta: 'Embedded → vector store · 3,212 dims' },
            { label: 'VOICE TRAITS', body: 'Direct · skeptical of frameworks · uses specific numbers · contractions · zero em-dashes · short paragraphs · ends with a question or contrarian assertion.', meta: '7 traits · cosine centroid recomputed nightly' },
            { label: 'ANTI-POSITIONING', body: 'We are not a generic AI writer. We are not a scheduler. We do not optimize for "polish" — we optimize for sounding like you.', meta: 'Used as negative prompt context' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: 16 }}>
              <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--ink-primary)' }}>{s.body}</div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-tertiary)', marginTop: 10, paddingTop: 8, borderTop: '1px dashed var(--border-subtle)' }}>{s.meta}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card" style={{ padding: 14 }}>
            <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 8 }}>VOICE FIDELITY</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
              <span className="tabular" style={{ fontSize: 28, fontWeight: 600, fontFamily: 'Montserrat' }}>0.91</span>
              <span style={{ fontSize: 11, color: 'var(--good)' }}>↑ 0.04 vs last brief</span>
            </div>
            <Sparkline data={[0.83, 0.85, 0.84, 0.87, 0.89, 0.88, 0.91]} width={220} height={32} />
            <div style={{ fontSize: 10.5, color: 'var(--ink-tertiary)', marginTop: 8 }}>Cosine vs 247-post corpus · last 7 drafts</div>
          </div>
          <div className="card" style={{ padding: 14 }}>
            <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 8 }}>FED INTO</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
              {[['Hook generator', 'POST /v1/drafts/hook', 'good'], ['Body draft', 'POST /v1/drafts/body', 'good'], ['Voice scorer', 'POST /v1/drafts/score', 'good'], ['Anti-AI rules', 'POST /v1/drafts/audit', 'good'], ['Idea ranker', 'POST /v1/ideas/rank', 'good']].map(([n, e, t]) => (
                <div key={n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px dashed var(--border-subtle)' }}>
                  <div><div style={{ fontWeight: 500 }}>{n}</div><div className="mono" style={{ fontSize: 9.5, color: 'var(--ink-tertiary)' }}>{e}</div></div>
                  <span className={`pill ${t}`}>active</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{ padding: 14, background: 'var(--bg-muted)' }}>
            <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 8 }}>VERSIONING</div>
            <div style={{ fontSize: 11.5, lineHeight: 1.7, color: 'var(--ink-secondary)' }}>
              <div>v14 · 2026-05-08 · Neeraj · added "skeptical of frameworks"</div>
              <div>v13 · 2026-04-22 · Stephen · refined ICP to 50-500 employees</div>
              <div>v12 · 2026-04-09 · Neeraj · initial voice traits set</div>
            </div>
          </div>
        </div>
      </div>
    </ScreenFrame>
  );
}

// ─── Anti-AI Rules ───────────────────────────────────────────
function AntiAIRules() {
  const [strict, setStrict] = useStG(true);
  const rules = [
    { phrase: 'em-dash (—)', cat: 'punctuation', action: 'block', hits: 47, severity: 'high' },
    { phrase: 'Furthermore', cat: 'transition', action: 'block', hits: 23, severity: 'high' },
    { phrase: 'In conclusion', cat: 'transition', action: 'block', hits: 18, severity: 'high' },
    { phrase: 'It is important to note', cat: 'filler', action: 'block', hits: 31, severity: 'high' },
    { phrase: 'leverage', cat: 'corporate', action: 'rewrite', hits: 12, severity: 'mid' },
    { phrase: 'synergy', cat: 'corporate', action: 'block', hits: 4, severity: 'high' },
    { phrase: 'unlock', cat: 'cliché', action: 'flag', hits: 38, severity: 'mid' },
    { phrase: 'ecosystem', cat: 'cliché', action: 'flag', hits: 22, severity: 'mid' },
    { phrase: 'Moreover', cat: 'transition', action: 'block', hits: 9, severity: 'high' },
    { phrase: 'Therefore', cat: 'transition', action: 'rewrite', hits: 14, severity: 'mid' },
    { phrase: 'In today\'s fast-paced world', cat: 'cliché', action: 'block', hits: 2, severity: 'high' },
    { phrase: 'paradigm shift', cat: 'corporate', action: 'block', hits: 1, severity: 'high' },
  ];
  return (
    <ScreenFrame
      title="Anti-AI rules"
      summary="Deterministic regex + LLM judge. Runs before scoring, blocks publish if strict mode is on. 62 rules · 4 categories."
      actions={<>
        <button className="btn ghost sm">Import preset</button>
        <button className="btn primary sm"><Icon name="plus" size={13} /> Add rule</button>
      </>}
    >
      {/* Top KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
        {[
          { l: 'Strict mode', v: strict ? 'ON' : 'OFF', sub: 'Default brand setting', tone: strict ? 'good' : 'bad' },
          { l: 'Tested vs last 50 drafts', v: '47 / 50', sub: '3 violations · 2 em-dash · 1 corporate', tone: 'good' },
          { l: 'Active rules', v: '62', sub: '52 phrase · 10 regex', tone: 'neutral' },
          { l: 'Catches last 30d', v: '221', sub: 'Avg 4.4 / draft pre-rewrite', tone: 'neutral' },
        ].map(k => (
          <div key={k.l} className="card" style={{ padding: 12 }}>
            <div className="eyebrow" style={{ fontSize: 9.5 }}>{k.l}</div>
            <div className="tabular" style={{ fontSize: 22, fontWeight: 600, fontFamily: 'Montserrat', marginTop: 4, color: k.tone === 'bad' ? 'var(--danger)' : k.tone === 'good' ? 'var(--good)' : 'var(--ink-primary)' }}>{k.v}</div>
            <div style={{ fontSize: 10.5, color: 'var(--ink-tertiary)', marginTop: 2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Strict toggle bar */}
      <div className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, background: strict ? 'var(--accent-soft)' : 'var(--bg-surface)', borderColor: strict ? 'var(--accent)' : 'var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon name="shield" size={18} style={{ color: strict ? 'var(--accent)' : 'var(--ink-tertiary)' }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Strict mode {strict ? 'enabled' : 'disabled'}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-secondary)' }}>{strict ? 'Drafts with violations cannot be published. Rewrite suggestions surface inline.' : 'Violations are flagged but publish is allowed.'}</div>
          </div>
        </div>
        <button className="btn ghost sm" onClick={() => setStrict(!strict)}>{strict ? 'Disable' : 'Enable'}</button>
      </div>

      {/* Rule table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--bg-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
              {['Phrase / pattern', 'Category', 'Action', 'Hits 30d', 'Severity', ''].map(h => (
                <th key={h} className="eyebrow" style={{ fontSize: 9.5, padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.phrase} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '8px 12px' }}><span className="mono" style={{ fontSize: 11.5 }}>"{r.phrase}"</span></td>
                <td style={{ padding: '8px 12px', color: 'var(--ink-secondary)' }}>{r.cat}</td>
                <td style={{ padding: '8px 12px' }}>
                  <span className={`pill ${r.action === 'block' ? 'bad' : r.action === 'rewrite' ? 'mid' : 'neutral'}`}>{r.action}</span>
                </td>
                <td style={{ padding: '8px 12px' }} className="tabular mono">{r.hits}</td>
                <td style={{ padding: '8px 12px' }}><span className={`pill ${r.severity === 'high' ? 'bad' : 'mid'}`}>{r.severity}</span></td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}><button className="btn ghost icon sm"><Icon name="moreH" size={13} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ScreenFrame>
  );
}

// ─── Connectors ──────────────────────────────────────────────
function Connectors() {
  const cards = [
    // ── Tier 1: B2B priority (LinkedIn first, per Sabrina playbook) ──
    { id: 'linkedin', name: 'LinkedIn', kind: 'Social · B2B', acct: '@neeraj-kumar', state: 'healthy', expires: '47 days', last: '4 min ago', oauth: 'r_member_social, w_member_social', tests: 11, pass: 11, note: 'token-refresh · idempotency · retry · rate-limit · media · health · ghost · all green' },
    { id: 'x', name: 'X (Twitter)', kind: 'Social · short-form', acct: '@neerajkumar_', state: 'healthy', expires: '12 days', last: '6 min ago', oauth: 'tweet.read, tweet.write', tests: 11, pass: 11, note: 'all green · monitor v2 quota — 1500/mo on current tier' },
    { id: 'substack', name: 'Substack', kind: 'Newsletter', acct: 'fullfunnel.substack.com', state: 'paste', expires: '—', last: '—', oauth: 'no public API · paste mode', tests: 4, pass: 4, note: 'render-only · no programmatic publish · we generate copy-paste-ready markdown' },
    { id: 'beehiiv', name: 'Beehiiv', kind: 'Newsletter · API', acct: 'fullfunnel.beehiiv.com', state: 'reconnect', expires: 'expired 2d ago', last: '2 days ago', oauth: 'workspace token', tests: 11, pass: 9, note: 'OAuth expiry + token-refresh failing — reconnect required' },

    // ── Tier 2: Visual + community ──
    { id: 'facebook', name: 'Facebook', kind: 'Social · pages', acct: 'FullFunnel · Page', state: 'healthy', expires: '58 days', last: '1h ago', oauth: 'pages_manage_posts, pages_read_engagement', tests: 11, pass: 11, note: 'Meta Graph v19 · page token rotated nightly · all green' },
    { id: 'instagram', name: 'Instagram', kind: 'Social · visual', acct: '@fullfunnel.co', state: 'healthy', expires: '58 days', last: '3h ago', oauth: 'instagram_content_publish, instagram_basic', tests: 11, pass: 11, note: 'Business account via Meta Graph · media validator enforces 1080×1350 · Reels supported' },
    { id: 'youtube', name: 'YouTube', kind: 'Video · long-form', acct: '@fullfunnelco', state: 'healthy', expires: 'refresh token', last: 'yesterday', oauth: 'youtube.upload, youtube.readonly', tests: 11, pass: 10, note: 'thumbnail validator failing intermittently — investigating · uploads ok' },
    { id: 'tiktok', name: 'TikTok', kind: 'Video · short-form', acct: '@fullfunnel', state: 'reconnect', expires: 'expired 4d ago', last: '5 days ago', oauth: 'video.publish, user.info.basic', tests: 11, pass: 7, note: 'TikTok Content Posting API · token expired · re-auth required for unaudited apps every 24h sandbox / 30d prod' },
    { id: 'threads', name: 'Threads', kind: 'Social · Meta', acct: '@fullfunnel.co', state: 'healthy', expires: '58 days', last: '2h ago', oauth: 'threads_basic, threads_content_publish', tests: 11, pass: 11, note: 'Meta Threads API · 250 posts/24h limit · all green' },
    { id: 'reddit', name: 'Reddit', kind: 'Community', acct: 'u/fullfunnel_co', state: 'healthy', expires: 'refresh token', last: '12h ago', oauth: 'submit, read, identity', tests: 11, pass: 11, note: 'subreddit-allow-list enforced (r/SaaS, r/marketing, r/Entrepreneur) · spam-filter pre-check active' },
    { id: 'pinterest', name: 'Pinterest', kind: 'Visual · discovery', acct: '—', state: 'disconnected', expires: '—', last: '—', oauth: 'pins:write, boards:read', tests: 0, pass: 0, note: 'not connected · click Connect to enable' },
    { id: 'bluesky', name: 'Bluesky', kind: 'Social · ATProto', acct: '@neeraj.bsky.social', state: 'healthy', expires: 'app password', last: '11 min ago', oauth: 'app password', tests: 11, pass: 11, note: 'AT Protocol · custom feed support · all green' },

    // ── Tier 3: CRM + utilities ──
    { id: 'hubspot', name: 'HubSpot', kind: 'CRM · attribution', acct: 'fullfunnel.hubspot.com', state: 'healthy', expires: '180 days', last: '8 min ago', oauth: 'contacts.read, content.write, oauth', tests: 9, pass: 9, note: 'Marketing Hub Pro · syncs published posts as content events for attribution · webhook listener active' },
    { id: 'medium', name: 'Medium', kind: 'Long-form', acct: '—', state: 'disconnected', expires: '—', last: '—', oauth: 'integration token', tests: 0, pass: 0, note: 'not connected · token-based auth (no OAuth)' },
    { id: 'mastodon', name: 'Mastodon', kind: 'Social · Fediverse', acct: '—', state: 'disconnected', expires: '—', last: '—', oauth: 'instance + access token', tests: 0, pass: 0, note: 'not connected · pick instance to connect' },
  ];
  return (
    <ScreenFrame
      title="Connectors"
      summary="OAuth-connected destinations. Every connector implements 11 contract tests (token refresh, idempotency, retries, rate-limit, media validator, account warm-up, ghost detection)."
      actions={<button className="btn primary sm"><Icon name="plus" size={13} /> Add connector</button>}
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', fontSize: 11, color: 'var(--ink-tertiary)' }}>
        <span className="pill good"><span className="dot" />{cards.filter(c => c.state === 'healthy').length} healthy</span>
        <span className="pill bad"><span className="dot" />{cards.filter(c => c.state === 'reconnect').length} reconnect</span>
        <span className="pill neutral"><span className="dot" />{cards.filter(c => c.state === 'paste').length} paste-mode</span>
        <span className="pill neutral" style={{ opacity: 0.7 }}><span className="dot" />{cards.filter(c => c.state === 'disconnected').length} available</span>
        <span style={{ marginLeft: 'auto' }}>11 contract tests per OAuth connector · auto-run hourly</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 12 }}>
        {cards.map(c => {
          const disconnected = c.state === 'disconnected';
          const stateLabel = c.state === 'healthy' ? 'healthy' : c.state === 'reconnect' ? 'reconnect' : c.state === 'paste' ? 'paste mode' : 'not connected';
          const stateClass = c.state === 'healthy' ? 'good' : c.state === 'reconnect' ? 'bad' : 'neutral';
          return (
            <div key={c.id} className="card" style={{ padding: 14, opacity: disconnected ? 0.78 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <ChannelMark id={c.id} size={28} />
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--ink-tertiary)', marginTop: 1 }}>{c.kind} · <span style={{ fontStyle: disconnected ? 'italic' : 'normal' }}>{c.acct}</span></div>
                  </div>
                </div>
                <span className={`pill ${stateClass}`}><span className="dot" />{stateLabel}</span>
              </div>
              {!disconnected && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11, paddingTop: 10, borderTop: '1px dashed var(--border-subtle)' }}>
                  <div><div className="eyebrow" style={{ fontSize: 8.5 }}>TOKEN</div><div style={{ marginTop: 2 }}>{c.expires}</div></div>
                  <div><div className="eyebrow" style={{ fontSize: 8.5 }}>LAST POST</div><div style={{ marginTop: 2 }}>{c.last}</div></div>
                  <div style={{ gridColumn: 'span 2' }}><div className="eyebrow" style={{ fontSize: 8.5 }}>SCOPES</div><div className="mono" style={{ marginTop: 2, fontSize: 10.5, color: 'var(--ink-secondary)' }}>{c.oauth}</div></div>
                </div>
              )}
              {c.tests > 0 ? (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <span className="eyebrow" style={{ fontSize: 8.5 }}>{c.tests === 11 ? '11-MODE CONTRACT TESTS' : `${c.tests} CONTRACT TESTS`}</span>
                    <span className="mono tabular" style={{ fontSize: 10.5, color: c.pass === c.tests ? 'var(--good)' : 'var(--danger)' }}>{c.pass}/{c.tests}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {Array.from({ length: c.tests }, (_, i) => (
                      <div key={i} style={{ flex: 1, height: 4, borderRadius: 1, background: i < c.pass ? 'var(--good)' : 'var(--danger)' }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--ink-tertiary)', marginTop: 6, lineHeight: 1.45 }}>{c.note}</div>
                </div>
              ) : (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--border-subtle)', fontSize: 10.5, color: 'var(--ink-tertiary)', lineHeight: 1.5 }}>
                  {c.note}
                </div>
              )}
              <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                <button className={`btn ${c.state === 'reconnect' || disconnected ? 'primary' : 'ghost'} sm`} style={{ flex: 1 }}>
                  {c.state === 'reconnect' ? 'Reconnect now' : disconnected ? 'Connect' : 'Configure'}
                </button>
                {!disconnected && <button className="btn ghost sm icon" title="Test connection now"><Icon name="activity" size={13} /></button>}
              </div>
            </div>
          );
        })}
      </div>
    </ScreenFrame>
  );
}

// ─── Members ─────────────────────────────────────────────────
function Members() {
  const ws = [
    { name: 'Neeraj Kumar', email: 'neeraj@fullfunnel.co', role: 'Owner', status: 'active', last: 'just now' },
    { name: 'Stephen Klein', email: 'stephen@fullfunnel.co', role: 'Admin', status: 'active', last: '3h ago' },
    { name: 'Priya Mehta', email: 'priya@fullfunnel.co', role: 'Editor', status: 'active', last: '1d ago' },
    { name: 'Marcus Chen', email: 'marcus@hyperion.co', role: 'Editor', status: 'pending', last: 'invited 2d ago', restricted: ['Hyperion'] },
    { name: 'Diane O\'Connor', email: 'diane@acmeops.com', role: 'Approver', status: 'active', last: '4h ago', restricted: ['Acme Operations'] },
  ];
  return (
    <ScreenFrame
      title="Members"
      summary="Workspace members manage the org. Brand-level access lets agency clients see only their brand's drafts, schedule, and analytics."
      actions={<button className="btn primary sm"><Icon name="plus" size={13} /> Invite member</button>}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="eyebrow" style={{ fontSize: 9.5 }}>FULLFUNNEL LLC · 5 MEMBERS</span>
            <span style={{ fontSize: 10.5, color: 'var(--ink-tertiary)' }}>Synced from Clerk Org · org_3kW9fnl…</span>
          </div>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {['Member', 'Role', 'Brand access', 'Status', 'Last seen', ''].map(h => (
                  <th key={h} className="eyebrow" style={{ fontSize: 9, padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ws.map(m => (
                <tr key={m.email} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar name={m.name} size={26} />
                      <div><div style={{ fontWeight: 500 }}>{m.name}</div><div style={{ fontSize: 10.5, color: 'var(--ink-tertiary)' }}>{m.email}</div></div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px' }}><span className="pill outline">{m.role}</span></td>
                  <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--ink-secondary)' }}>
                    {m.restricted ? m.restricted.join(', ') : 'All 3 brands'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span className={`pill ${m.status === 'active' ? 'good' : 'mid'}`}><span className="dot" />{m.status}</span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--ink-tertiary)' }}>{m.last}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}><button className="btn ghost icon sm"><Icon name="moreH" size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 14 }}>
            <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 8 }}>ROLES</div>
            {[
              ['Owner', 'Full control · billing · delete workspace'],
              ['Admin', 'All except billing & delete'],
              ['Editor', 'Generate, schedule, publish'],
              ['Approver', 'Review-only · approve via magic link'],
              ['Viewer', 'Read-only · analytics + drafts'],
            ].map(([r, d]) => (
              <div key={r} style={{ padding: '6px 0', borderBottom: '1px dashed var(--border-subtle)', fontSize: 11.5 }}>
                <div style={{ fontWeight: 600 }}>{r}</div>
                <div style={{ color: 'var(--ink-tertiary)', fontSize: 10.5 }}>{d}</div>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding: 14, background: 'var(--bg-muted)' }}>
            <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 6 }}>PLAN LIMIT</div>
            <div style={{ fontSize: 11.5, lineHeight: 1.6 }}>
              Creator plan · <span className="tabular">5 / 8</span> seats used.<br />
              Upgrade to Agency for unlimited seats + brand-scoped access.
            </div>
            <button className="btn ghost sm" style={{ marginTop: 10, width: '100%' }}>Compare plans</button>
          </div>
        </div>
      </div>
    </ScreenFrame>
  );
}

// ─── Competitors ─────────────────────────────────────────────
function Competitors() {
  const comps = [
    { name: 'Clay GTM', handle: '@clay-gtm', velocity: 14, voice: 0.71, drift: '+0.04', sparks: [3,4,5,6,5,7,8] },
    { name: 'Apollo Ops', handle: '@apollo-ops', velocity: 9, voice: 0.62, drift: '-0.02', sparks: [4,5,4,3,5,4,5] },
    { name: 'GTMHub', handle: '@gtmhub', velocity: 22, voice: 0.58, drift: '+0.08', sparks: [6,7,8,9,10,11,12] },
    { name: 'Sabrina Ramonov', handle: '@sabrina-ramonov', velocity: 7, voice: 0.84, drift: '0.00', sparks: [3,3,4,3,4,3,4] },
  ];
  return (
    <ScreenFrame
      title="Competitors"
      summary="Track 4 brands · velocity, format mix, voice signature drift over time. Apify scrapes daily; we ICP-rank what they post and surface 'your angle' on the Idea Wall."
      actions={<button className="btn ghost sm"><Icon name="plus" size={13} /> Track new</button>}
    >
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr style={{ background: 'var(--bg-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
            {['Competitor', 'Posts / wk', '7-day velocity', 'Voice fingerprint', 'Drift 30d', 'Last scraped', ''].map(h => (
              <th key={h} className="eyebrow" style={{ fontSize: 9.5, padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {comps.map(c => (
              <tr key={c.name} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '12px' }}><div style={{ fontWeight: 600 }}>{c.name}</div><div style={{ fontSize: 10.5, color: 'var(--ink-tertiary)' }}>{c.handle}</div></td>
                <td style={{ padding: '12px' }} className="tabular mono">{c.velocity}</td>
                <td style={{ padding: '12px' }}><Sparkline data={c.sparks} width={90} height={20} /></td>
                <td style={{ padding: '12px', minWidth: 140 }}><ScoreSwatch value={c.voice} label={null} /></td>
                <td style={{ padding: '12px' }} className="tabular mono" style={{ color: c.drift.startsWith('+') ? 'var(--good)' : c.drift.startsWith('-') ? 'var(--danger)' : 'var(--ink-secondary)' }}>{c.drift}</td>
                <td style={{ padding: '12px', fontSize: 11, color: 'var(--ink-tertiary)' }}>4h ago</td>
                <td style={{ padding: '12px', textAlign: 'right' }}><button className="btn ghost icon sm"><Icon name="arrowRight" size={13} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ScreenFrame>
  );
}

// ─── API & Logs ──────────────────────────────────────────────
function ApiLogs() {
  const cats = [
    ['1', 'Schema mismatch', 0],
    ['2', 'Async race', 0],
    ['3', 'Idempotency', 0],
    ['4', 'OAuth expiry', 1],
    ['5', 'Platform 5xx', 3],
    ['6', 'Rate limit', 2],
    ['7', 'Media format', 0],
    ['8', 'Media URL', 0],
    ['9', 'Account health', 0],
    ['10', 'Shadowban / ghost', 1],
    ['11', 'Plan / quota', 0],
  ];
  const calls = [
    { t: '14:42:19', method: 'POST', path: '/v1/drafts/d_a8f2/publish', status: 200, ms: 412, idem: 'idem_a8f2_v3_li_20260512', cat: null },
    { t: '14:41:58', method: 'POST', path: '/v1/drafts/d_a8f2/grade', status: 200, ms: 1844, idem: '—', cat: null },
    { t: '14:39:02', method: 'POST', path: '/v1/connectors/beehiiv/refresh', status: 401, ms: 89, idem: '—', cat: '4' },
    { t: '14:38:11', method: 'POST', path: '/v1/drafts/d_b2c1/hook', status: 429, ms: 24, idem: '—', cat: '6' },
    { t: '14:37:55', method: 'POST', path: '/v1/sources/extract', status: 502, ms: 4011, idem: '—', cat: '5' },
    { t: '14:36:40', method: 'GET',  path: '/v1/ideas?source=wedge', status: 200, ms: 91, idem: '—', cat: null },
    { t: '14:36:02', method: 'POST', path: '/v1/drafts/d_c901/publish', status: 200, ms: 388, idem: 'idem_c901_v1_x_20260512', cat: null },
    { t: '14:35:18', method: 'POST', path: '/v1/connectors/x/health', status: 200, ms: 142, idem: '—', cat: null },
  ];
  return (
    <ScreenFrame
      title="API & logs"
      summary="Every external call · workspace-visible · categorized by 11-failure-mode taxonomy. Filter, search, replay."
      actions={<button className="btn ghost sm"><Icon name="download" size={13} /> Export 24h</button>}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', gap: 4, marginBottom: 14 }}>
        {cats.map(([n, label, hits]) => (
          <div key={n} className="card" style={{ padding: 8, borderColor: hits > 0 ? 'var(--danger)' : 'var(--border-subtle)' }}>
            <div className="mono" style={{ fontSize: 9, color: 'var(--ink-tertiary)' }}>cat·{n}</div>
            <div className="tabular" style={{ fontSize: 16, fontWeight: 600, color: hits > 0 ? 'var(--danger)' : 'var(--ink-primary)', fontFamily: 'Montserrat' }}>{hits}</div>
            <div style={{ fontSize: 9.5, color: 'var(--ink-tertiary)', lineHeight: 1.3 }}>{label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: 6, alignItems: 'center', fontSize: 11 }}>
          <Icon name="filter" size={12} />
          <span className="eyebrow" style={{ fontSize: 9.5 }}>LAST 24H · 1,847 CALLS · 7 ERRORS</span>
          <span style={{ flex: 1 }} />
          <button className="btn ghost sm">Errors only</button>
          <button className="btn ghost sm">5xx</button>
        </div>
        <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            {['Time', 'Method', 'Endpoint', 'Status', 'ms', 'Idempotency', 'Cat'].map(h => (
              <th key={h} className="eyebrow" style={{ fontSize: 9, padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {calls.map((c, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td className="mono" style={{ padding: '7px 12px', color: 'var(--ink-tertiary)' }}>{c.t}</td>
                <td style={{ padding: '7px 12px' }}><span className={`pill ${c.method === 'POST' ? 'neutral' : 'outline'}`}>{c.method}</span></td>
                <td className="mono" style={{ padding: '7px 12px', fontSize: 11 }}>{c.path}</td>
                <td style={{ padding: '7px 12px' }}><span className={`pill ${c.status < 300 ? 'good' : c.status < 500 ? 'mid' : 'bad'}`}>{c.status}</span></td>
                <td className="tabular mono" style={{ padding: '7px 12px' }}>{c.ms}</td>
                <td className="mono" style={{ padding: '7px 12px', color: 'var(--ink-tertiary)', fontSize: 10 }}>{c.idem}</td>
                <td style={{ padding: '7px 12px' }}>{c.cat ? <span className="pill bad">{c.cat}</span> : <span style={{ color: 'var(--ink-quaternary)' }}>—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ScreenFrame>
  );
}

// ─── Settings (lightweight stub) ─────────────────────────────
function Settings() {
  return (
    <ScreenFrame title="Settings" summary="Workspace settings, billing, API keys, data export.">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {[
          ['Workspace', 'Name, plan, region (ap-south-1), data export'],
          ['API keys', 'Workspace-scoped keys · sal_live_<ws8>_<secret> · revealable once'],
          ['Billing', 'Stripe · Creator $249/mo · next invoice May 22'],
          ['Notifications', 'Reconnect, drift, weekly digest opt-ins'],
          ['Data & retention', 'Idempotency log 90d · audit log forever · drafts 1yr'],
          ['Danger zone', 'Transfer ownership · delete workspace'],
        ].map(([t, d]) => (
          <div key={t} className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>{t}</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-secondary)' }}>{d}</div>
          </div>
        ))}
      </div>
    </ScreenFrame>
  );
}

Object.assign(window, { BrandBrief, AntiAIRules, Connectors, Members, Competitors, ApiLogs, Settings, ScreenFrame });
