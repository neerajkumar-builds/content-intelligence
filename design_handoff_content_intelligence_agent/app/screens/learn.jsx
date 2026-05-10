/* global React */
const { useState } = React;

const KPIS = [
  { id: 'voice',   label: 'Voice fidelity · 30d', value: '0.89', trend: '+0.02', tone: 'good', spark: [0.84, 0.86, 0.85, 0.87, 0.88, 0.89, 0.89] },
  { id: 'reach',   label: 'Reach · last 30d',     value: '142.3K', trend: '+18%', tone: 'good', spark: [12, 14, 11, 18, 22, 19, 24] },
  { id: 'engage',  label: 'Engagement rate',      value: '4.7%',  trend: '+0.6pp', tone: 'good', spark: [3.8, 4.1, 4.0, 4.3, 4.5, 4.6, 4.7] },
  { id: 'cost',    label: 'Cost per post · avg',  value: '$0.58', trend: '−$0.04', tone: 'good', spark: [0.71, 0.68, 0.65, 0.62, 0.60, 0.59, 0.58] },
];

const TOP_POSTS = [
  { id: 'p_192', title: 'Most ops leaders think tool consolidation saves money…', channel: 'linkedin', voice: 0.93, hook: 9.2, reach: 18420, eng: 6.1, comments: 84, posted: '4d', why: ['Specificity 9.1', 'Personal stakes 9.0', 'Counter-intuitive frame'] },
  { id: 'p_188', title: 'Pipeline velocity is a lagging proxy for decision velocity', channel: 'linkedin', voice: 0.91, hook: 8.7, reach: 12100, eng: 5.4, comments: 47, posted: '12d', why: ['Replace-metric pattern', 'Tension 8.6'] },
  { id: 'p_185', title: 'Issue 40 · The behavior map (newsletter)', channel: 'beehiiv', voice: 0.92, hook: 8.4, reach: 4820, eng: 14.2, comments: 0, posted: '6d', why: ['Subscriber depth', 'Long-form fit'] },
  { id: 'p_181', title: 'Thread: 4 deletions I would undo', channel: 'x', voice: 0.88, hook: 8.9, reach: 22300, eng: 3.2, comments: 31, posted: '9d', why: ['List · diagnostic', 'Hook curiosity 9.0'] },
];

const FORMATS = [
  { id: 'linkedin-long', label: 'LinkedIn · long', count: 18, avg_reach: '8.4K', avg_eng: '5.2%', best: true },
  { id: 'x-thread',      label: 'X thread',         count: 9,  avg_reach: '14.1K', avg_eng: '2.8%' },
  { id: 'newsletter',    label: 'Newsletter',       count: 6,  avg_reach: '4.6K',  avg_eng: '12.4%' },
  { id: 'bluesky',       label: 'Bluesky',          count: 7,  avg_reach: '1.2K',  avg_eng: '3.1%' },
];

// ─── Voice drift mini panel ──────────────────────────────────
function VoiceDriftPanel() {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <h4 style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>Voice drift detector</h4>
          <div style={{ fontSize: 10.5, color: 'var(--ink-tertiary)', marginTop: 2 }}>
            Fingerprint recomputed weekly · last <span className="mono">3d ago</span>
          </div>
        </div>
        <span className="pill warn" style={{ fontSize: 9 }}>
          <span className="dot" />
          Slight drift
        </span>
      </div>

      {/* Drift bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 10 }}>
        {[
          { dim: 'Sentence length', baseline: 0.92, current: 0.86, dir: '−6.5%' },
          { dim: 'Lexical density', baseline: 0.88, current: 0.89, dir: '+1.1%' },
          { dim: 'Sentiment',       baseline: 0.81, current: 0.78, dir: '−3.7%' },
          { dim: 'Hook patterns',   baseline: 0.94, current: 0.93, dir: '−1.0%' },
        ].map(d => (
          <div key={d.dim}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, marginBottom: 2 }}>
              <span style={{ color: 'var(--ink-secondary)' }}>{d.dim}</span>
              <span className="mono tabular" style={{
                color: d.current < d.baseline - 0.02 ? 'var(--warn)' : 'var(--ink-tertiary)',
              }}>{d.dir}</span>
            </div>
            <div style={{ position: 'relative', height: 4, background: 'var(--meter-track)', borderRadius: 4 }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, height: '100%',
                width: `${d.current * 100}%`,
                background: d.current < d.baseline - 0.02 ? 'var(--warn)' : 'var(--accent)',
                borderRadius: 4,
              }} />
              <div style={{
                position: 'absolute', left: `${d.baseline * 100}%`, top: -2,
                width: 1, height: 8, background: 'var(--ink-tertiary)',
              }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
        <button className="btn secondary sm" style={{ flex: 1 }}>Pin v3.2</button>
        <button className="btn primary sm" style={{ flex: 1 }}>Review & adopt</button>
      </div>
    </div>
  );
}

function KpiCard({ k }) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>{k.label}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 9, marginBottom: 6 }}>
        <span className="mono tabular" style={{ fontSize: 26, fontWeight: 600, lineHeight: 1, letterSpacing: '-0.015em' }}>
          {k.value}
        </span>
        <span className="mono tabular" style={{
          fontSize: 11, fontWeight: 600, paddingBottom: 4,
          color: k.trend.startsWith('+') || k.trend.startsWith('−$') ? 'var(--success)' : k.trend.startsWith('−') ? 'var(--success)' : 'var(--ink-secondary)',
        }}>{k.trend}</span>
      </div>
      <Sparkline data={k.spark} width={200} height={28} />
    </div>
  );
}

function Insights() {
  const { goto } = useRouter();
  const [range, setRange] = useState('30d');

  return (
    <div className="fade-in" style={{ height: '100%', overflow: 'auto', padding: '20px 24px 60px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 className="display" style={{ fontSize: 22, margin: 0 }}>Insights · the loop closes here</h2>
          <p style={{ fontSize: 12, color: 'var(--ink-tertiary)', margin: '3px 0 0' }}>
            What worked, what drifted, what to feed back into voice and rules.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 2, padding: 2, background: 'var(--bg-muted)', borderRadius: 6 }}>
          {['7d', '30d', '90d', 'all'].map(r => (
            <button key={r} onClick={() => setRange(r)} style={{
              padding: '4px 10px', borderRadius: 4, border: 0, cursor: 'pointer',
              background: range === r ? 'var(--bg-surface)' : 'transparent',
              color: range === r ? 'var(--ink-primary)' : 'var(--ink-secondary)',
              fontWeight: range === r ? 600 : 500, fontSize: 11,
              boxShadow: range === r ? 'var(--shadow-sm)' : 'none',
            }}>{r}</button>
          ))}
        </div>
        <button className="btn secondary sm" style={{ gap: 5 }}>
          <Icon name="download" size={12} />
          Export CSV
        </button>
      </div>

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 20 }}>
        {KPIS.map(k => <KpiCard key={k.id} k={k} />)}
      </div>

      {/* Two-column body */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        {/* Top performing */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Top-performing posts</h3>
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-tertiary)' }}>
              GET /v1/insights/top?range={range}
            </span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
            <thead>
              <tr style={{ background: 'var(--bg-muted)' }}>
                {['Post', 'Channel', 'Voice', 'Hook', 'Reach', 'Eng %', 'Why it worked'].map(h => (
                  <th key={h} className="eyebrow" style={{
                    fontSize: 9, padding: '6px 10px', textAlign: 'left',
                    fontWeight: 500, borderBottom: '1px solid var(--border-subtle)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TOP_POSTS.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: i < TOP_POSTS.length - 1 ? '1px solid var(--border-subtle)' : 0 }}>
                  <td style={{ padding: '10px', maxWidth: 260 }}>
                    <div style={{ fontWeight: 500, fontSize: 11.5, marginBottom: 2,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.title}
                    </div>
                    <div className="mono" style={{ fontSize: 9.5, color: 'var(--ink-tertiary)' }}>
                      {p.id} · {p.posted} ago
                    </div>
                  </td>
                  <td style={{ padding: '10px' }}><ChannelMark id={p.channel} size={14} /></td>
                  <td style={{ padding: '10px' }}>
                    <span className="mono tabular" style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>
                      {p.voice.toFixed(2)}
                    </span>
                  </td>
                  <td style={{ padding: '10px' }}>
                    <span className="mono tabular" style={{ fontSize: 11, fontWeight: 600 }}>{p.hook.toFixed(1)}</span>
                  </td>
                  <td style={{ padding: '10px' }}>
                    <span className="mono tabular" style={{ fontSize: 11 }}>{(p.reach / 1000).toFixed(1)}K</span>
                  </td>
                  <td style={{ padding: '10px' }}>
                    <span className="mono tabular" style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>{p.eng}%</span>
                  </td>
                  <td style={{ padding: '10px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                      {p.why.map(w => (
                        <span key={w} className="pill muted" style={{ fontSize: 9 }}>{w}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <VoiceDriftPanel />

          {/* Format performance */}
          <div className="card" style={{ padding: 14 }}>
            <h4 style={{ margin: 0, fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Format performance</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {FORMATS.map(f => (
                <div key={f.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 500 }}>{f.label}</span>
                      {f.best && <span className="pill accent" style={{ fontSize: 9 }}>best</span>}
                    </div>
                    <span className="mono tabular" style={{ fontSize: 10.5, color: 'var(--ink-tertiary)' }}>
                      {f.count} posts
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 14, fontSize: 10, color: 'var(--ink-secondary)' }}>
                    <span>reach <span className="mono tabular" style={{ fontWeight: 600, color: 'var(--ink-primary)' }}>{f.avg_reach}</span></span>
                    <span>eng <span className="mono tabular" style={{ fontWeight: 600, color: 'var(--accent)' }}>{f.avg_eng}</span></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feedback to system */}
          <div className="card" style={{ padding: 14, background: 'var(--accent-softer)', borderColor: 'var(--accent-soft)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
              <Icon name="target" size={14} style={{ color: 'var(--accent)' }} />
              <h4 style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>Suggested · feed back</h4>
            </div>
            <p style={{ fontSize: 11, color: 'var(--ink-secondary)', margin: '0 0 9px', lineHeight: 1.45 }}>
              "Counter-intuitive frame + personal stakes" outperforms "list · diagnostic" by <strong className="mono">+62%</strong> reach.
              Add as ranking signal in Idea Wall scoring?
            </p>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn primary sm" style={{ flex: 1 }} onClick={() => goto('rules')}>
                Review rule
              </button>
              <button className="btn ghost sm">Dismiss</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Generic placeholder for less-built screens ──────────────
function Placeholder({ title, summary, endpoint }) {
  return (
    <div className="fade-in" style={{ padding: '24px', height: '100%', overflow: 'auto' }}>
      <div style={{ maxWidth: 720 }}>
        <h2 className="display" style={{ fontSize: 22, margin: 0 }}>{title}</h2>
        <p style={{ fontSize: 12.5, color: 'var(--ink-tertiary)', margin: '4px 0 18px', lineHeight: 1.5 }}>{summary}</p>
        <div className="card" style={{ padding: 16 }}>
          <div className="eyebrow" style={{ fontSize: 9, marginBottom: 6 }}>Backing endpoint</div>
          <div className="mono" style={{ fontSize: 11.5, color: 'var(--accent)' }}>{endpoint}</div>
          <div style={{ marginTop: 18 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 0', borderTop: i > 1 ? '1px solid var(--border-subtle)' : 0 }}>
                <div className="skel" style={{ width: 32, height: 32, borderRadius: 4 }} />
                <div style={{ flex: 1 }}>
                  <div className="skel" style={{ width: '40%', height: 11, marginBottom: 5 }} />
                  <div className="skel" style={{ width: '70%', height: 9 }} />
                </div>
                <div className="skel" style={{ width: 60, height: 22, borderRadius: 4 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const PLACEHOLDERS = {
  competitors: { title: 'Competitors', summary: 'Track 8 brands · velocity, format mix, voice signature drift over time.', endpoint: 'GET /v1/competitors' },
  brand:       { title: 'Brand brief', summary: 'Wedge, ICP, value props, anti-positioning. Versioned · diff-able · feeds every prompt.', endpoint: 'GET /v1/brands/:id/brief' },
  rules:       { title: 'Anti-AI rules', summary: '62 default rules · banned phrases, em-dash policy, sentence cadence floors. Soft / hard / blocking.', endpoint: 'GET /v1/rules' },
  connectors:  { title: 'Connectors', summary: 'OAuth health, last sync, idempotency keys, channel-specific rate limits.', endpoint: 'GET /v1/connectors' },
  members:     { title: 'Members & invites', summary: 'Workspace roles, brand permissions, approver assignments, magic-link audit.', endpoint: 'GET /v1/workspace/members' },
  api:         { title: 'API & logs', summary: 'Live API call dashboard, idempotency replay, audit log, webhook deliveries.', endpoint: 'GET /v1/api/calls' },
  settings:    { title: 'Workspace settings', summary: 'Plan, billing, slug, timezone, default brand, retention policy, SSO.', endpoint: 'GET /v1/workspace' },
};

Object.assign(window, { Insights, Placeholder, PLACEHOLDERS });
