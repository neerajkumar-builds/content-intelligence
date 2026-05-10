/* global React */
const { useState, useMemo } = React;

// ─── Idea Wall fixtures ──────────────────────────────────────
const IDEAS = [
  {
    id: 'idea_a47',
    hook: 'Most ops leaders think tool consolidation saves money. We deleted 11 tools last quarter — three made things worse.',
    angle: 'Counter-intuitive · personal stakes',
    source: { kind: 'reddit', label: 'r/ExperiencedDevs', citation: 'comment thread, 412 upvotes', url: 'reddit.com/...' },
    icp_fit: 0.94, hot: 87, freshness: '2h',
    formats: ['linkedin-long', 'x-thread', 'newsletter'],
    tags: ['operations', 'tooling-debt'],
    suggested_for: ['FullFunnel.co'],
    dedup: null,
  },
  {
    id: 'idea_a48',
    hook: "The hiring funnel everyone draws is wrong. Here's what an actual conversion-positive funnel looks like for B2B ops roles.",
    angle: 'Visual reframe · operator authority',
    source: { kind: 'linkedin', label: 'Linkedin saved · @kbrennan', citation: '3 reactions, recent', url: 'linkedin.com/...' },
    icp_fit: 0.89, hot: 72, freshness: '5h',
    formats: ['linkedin-long', 'newsletter'],
    tags: ['hiring', 'funnels'],
    suggested_for: ['FullFunnel.co'],
  },
  {
    id: 'idea_a49',
    hook: 'I rewrote our onboarding doc as a single SQL query. Conversion went up 31%. The point isn\'t SQL.',
    angle: 'Provocation → reframe',
    source: { kind: 'rss', label: 'Substack · The Operator', citation: 'last 24h', url: '#' },
    icp_fit: 0.86, hot: 91, freshness: '8h',
    formats: ['linkedin-long', 'x-thread'],
    tags: ['onboarding', 'conversion'],
    suggested_for: ['FullFunnel.co', 'Acme Operations'],
  },
  {
    id: 'idea_a50',
    hook: 'Your CRM is not a system of record. It\'s a system of belief. The difference matters when revenue stops moving.',
    angle: 'Reframe · sharp',
    source: { kind: 'apify', label: 'Apify · LinkedIn search', citation: '"crm dead" · 47 results', url: '#' },
    icp_fit: 0.82, hot: 64, freshness: '12h',
    formats: ['linkedin-long'],
    tags: ['crm', 'go-to-market'],
    suggested_for: ['FullFunnel.co'],
  },
  {
    id: 'idea_a51',
    hook: 'Three signs your "AI strategy" is actually an org chart problem. (None of them involve the AI.)',
    angle: 'List · diagnostic',
    source: { kind: 'reddit', label: 'r/ChiefOfStaff', citation: '88 upvotes', url: '#' },
    icp_fit: 0.79, hot: 58, freshness: '1d',
    formats: ['linkedin-long', 'x-thread'],
    tags: ['ai-adoption', 'org-design'],
    suggested_for: ['FullFunnel.co', 'Hyperion'],
  },
  {
    id: 'idea_a52',
    hook: 'Stop measuring sales velocity. Measure decision velocity. Here\'s the formula and the four blockers.',
    angle: 'Replace metric · prescriptive',
    source: { kind: 'manual', label: 'Manual entry · @neeraj', citation: 'today', url: '#' },
    icp_fit: 0.76, hot: 49, freshness: '1d',
    formats: ['linkedin-long', 'newsletter'],
    tags: ['sales', 'metrics'],
    suggested_for: ['FullFunnel.co'],
    dedup: { score: 0.62, prior_id: 'post_p192', prior_label: '"Pipeline velocity is a lagging proxy" · 12 days ago' },
  },
];

const SOURCES = [
  { id: 'reddit',   label: 'Reddit',     status: 'ok',     count: 12, icon: 'global', last: '4m ago' },
  { id: 'linkedin', label: 'LinkedIn',   status: 'ok',     count: 6,  icon: 'link',   last: '8m ago' },
  { id: 'rss',      label: 'RSS',        status: 'ok',     count: 3,  icon: 'hash',   last: '11m ago' },
  { id: 'apify',    label: 'Apify',      status: 'rate',   count: 2,  icon: 'bolt',   last: '2h ago' },
  { id: 'manual',   label: 'Manual',     status: 'ok',     count: 1,  icon: 'edit',   last: '—' },
];

// ─── Idea card ───────────────────────────────────────────────
function IdeaCard({ idea, onGenerate }) {
  const [hover, setHover] = useState(false);
  const sourceColor = {
    reddit: '#FF4500', linkedin: '#0A66C2', rss: '#FF6F00',
    apify: '#0066FF', manual: 'var(--ink-secondary)',
  }[idea.source.kind] || 'var(--ink-secondary)';

  return (
    <div
      className="card"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: 14, position: 'relative',
        transition: 'border-color 0.12s ease, box-shadow 0.12s ease, transform 0.12s ease',
        borderColor: hover ? 'var(--border-default)' : 'var(--border-subtle)',
        boxShadow: hover ? 'var(--shadow-md)' : 'none',
      }}
    >
      {/* meta row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9, gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '2px 7px', borderRadius: 999,
            background: 'var(--bg-muted)', fontSize: 10,
            color: 'var(--ink-secondary)', fontWeight: 500,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: 50, background: sourceColor }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
              {idea.source.label}
            </span>
          </span>
          <span className="mono" style={{ fontSize: 9.5, color: 'var(--ink-tertiary)' }}>
            {idea.source.citation}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Tooltip label={`Hot · trending velocity ${idea.hot}/100`}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Icon name="flame" size={11} style={{ color: idea.hot >= 80 ? 'var(--danger)' : idea.hot >= 60 ? 'var(--warn)' : 'var(--ink-tertiary)' }} />
              <span className="mono tabular" style={{ fontSize: 10, color: 'var(--ink-secondary)' }}>{idea.hot}</span>
            </span>
          </Tooltip>
          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-tertiary)' }}>· {idea.freshness}</span>
        </div>
      </div>

      {/* hook */}
      <p style={{
        fontSize: 13.5, lineHeight: 1.45, color: 'var(--ink-primary)',
        margin: '0 0 11px', fontWeight: 500, letterSpacing: '-0.005em',
        textWrap: 'pretty',
      }}>{idea.hook}</p>

      {/* angle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span className="eyebrow" style={{ fontSize: 8.5 }}>Angle</span>
        <span style={{ fontSize: 11, color: 'var(--ink-secondary)' }}>{idea.angle}</span>
      </div>

      {/* dedup warning */}
      {idea.dedup && (
        <div style={{
          padding: '6px 9px', marginBottom: 10,
          background: 'var(--warn-soft)', borderRadius: 5,
          display: 'flex', alignItems: 'center', gap: 7,
          fontSize: 10.5, color: 'var(--warn)',
        }}>
          <Icon name="alert" size={11} />
          <span style={{ flex: 1 }}>
            <strong>Similar to:</strong> {idea.dedup.prior_label}
          </span>
          <span className="mono tabular" style={{ fontSize: 9.5, opacity: 0.8 }}>
            sim {idea.dedup.score.toFixed(2)}
          </span>
        </div>
      )}

      {/* score row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <ScoreSwatch label="ICP fit" value={idea.icp_fit} />
        <div>
          <div className="eyebrow" style={{ fontSize: 9, marginBottom: 3 }}>Suggested formats</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {idea.formats.map(f => (
              <span key={f} className="pill outline" style={{ fontSize: 9.5 }}>{f}</span>
            ))}
          </div>
        </div>
      </div>

      {/* footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 10, borderTop: '1px dashed var(--border-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {idea.suggested_for.map(b => (
            <span key={b} className="pill muted" style={{ fontSize: 9.5 }}>{b}</span>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button className="btn ghost sm icon"><Icon name="moreH" size={13} /></button>
          <button className="btn primary sm" onClick={() => onGenerate(idea)} style={{ gap: 5 }}>
            <Icon name="sparkle" size={12} />
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Source rail ──────────────────────────────────────────────
function SourceRail() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Sources panel */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{
          padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h4 style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>Sources</h4>
          <button className="btn ghost sm icon"><Icon name="refresh" size={12} /></button>
        </div>
        <div>
          {SOURCES.map((s, i) => (
            <div key={s.id} style={{
              padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 9,
              borderTop: i ? '1px solid var(--border-subtle)' : 0,
            }}>
              <Icon name={s.icon} size={13} style={{ color: 'var(--ink-tertiary)' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: 500 }}>{s.label}</div>
                <div className="mono" style={{ fontSize: 9.5, color: 'var(--ink-tertiary)' }}>
                  {s.last}
                </div>
              </div>
              <span className="mono tabular" style={{ fontSize: 10.5, color: 'var(--ink-secondary)' }}>{s.count}</span>
              <span className={`pill ${s.status === 'ok' ? 'success' : 'warn'}`} style={{ fontSize: 9, padding: '1px 5px' }}>
                <span className="dot" />
                {s.status === 'ok' ? 'live' : 'rate-limited'}
              </span>
            </div>
          ))}
        </div>
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-subtle)' }}>
          <button className="btn ghost sm" style={{ width: '100%', justifyContent: 'flex-start', gap: 6 }}>
            <Icon name="plus" size={12} />
            Add source
          </button>
        </div>
      </div>

      {/* Today's signals */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
          <h4 style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>Today's signals</h4>
          <div style={{ fontSize: 10.5, color: 'var(--ink-tertiary)', marginTop: 1 }}>
            Run completed 4 minutes ago
          </div>
        </div>
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
              <span style={{ color: 'var(--ink-secondary)' }}>Ideas surfaced</span>
              <span className="mono tabular" style={{ fontWeight: 600 }}>23</span>
            </div>
            <Sparkline data={[12, 18, 15, 22, 19, 24, 23]} width={196} height={18} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ padding: 8, background: 'var(--bg-muted)', borderRadius: 5 }}>
              <div className="eyebrow" style={{ fontSize: 8.5, marginBottom: 2 }}>Avg ICP fit</div>
              <div className="mono tabular" style={{ fontSize: 16, fontWeight: 600 }}>0.84</div>
            </div>
            <div style={{ padding: 8, background: 'var(--bg-muted)', borderRadius: 5 }}>
              <div className="eyebrow" style={{ fontSize: 8.5, marginBottom: 2 }}>Dedup matches</div>
              <div className="mono tabular" style={{ fontSize: 16, fontWeight: 600 }}>1</div>
            </div>
          </div>
          <div style={{ paddingTop: 4 }}>
            <div className="eyebrow" style={{ fontSize: 8.5, marginBottom: 5 }}>Top tags</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {['operations', 'go-to-market', 'hiring', 'metrics', 'ai-adoption'].map(t => (
                <span key={t} className="pill muted" style={{ fontSize: 9.5 }}>#{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Job */}
      <div style={{
        padding: '8px 12px', background: 'var(--bg-muted)', borderRadius: 6,
        fontSize: 10.5, color: 'var(--ink-secondary)',
      }}>
        <div className="mono" style={{ fontSize: 9.5, color: 'var(--ink-tertiary)', marginBottom: 2 }}>
          NEXT RUN · job_idea_harvest
        </div>
        in 56 minutes · cron <code style={{ fontSize: 10 }}>0 */1 * * *</code>
      </div>
    </div>
  );
}

// ─── Idea Wall screen ──────────────────────────────────────────
function IdeaWall() {
  const { goto } = useRouter();
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('icp');

  const sorted = useMemo(() => {
    const list = [...IDEAS];
    if (sort === 'icp') list.sort((a, b) => b.icp_fit - a.icp_fit);
    if (sort === 'hot') list.sort((a, b) => b.hot - a.hot);
    if (sort === 'fresh') list.sort((a, b) => parseInt(a.freshness) - parseInt(b.freshness));
    return filter === 'all' ? list : list.filter(i => i.source.kind === filter);
  }, [filter, sort]);

  return (
    <div className="fade-in" style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{
          padding: '14px 24px', borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 className="display" style={{ fontSize: 22, margin: 0 }}>Today's ideas</h2>
            <p style={{ fontSize: 11.5, color: 'var(--ink-tertiary)', margin: '2px 0 0' }}>
              <span className="mono">{sorted.length}</span> ranked candidates · last harvest{' '}
              <span className="mono">4m ago</span> · next in <span className="mono">56m</span>
            </p>
          </div>
          {/* Filter chips */}
          <div style={{
            display: 'flex', gap: 2, padding: 2, background: 'var(--bg-muted)',
            borderRadius: 6, fontSize: 11,
          }}>
            {[
              { id: 'all', label: 'All', count: IDEAS.length },
              { id: 'reddit', label: 'Reddit', count: 1 },
              { id: 'linkedin', label: 'LinkedIn', count: 1 },
              { id: 'rss', label: 'RSS', count: 1 },
              { id: 'apify', label: 'Apify', count: 1 },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                style={{
                  padding: '4px 10px', borderRadius: 4, border: 0, cursor: 'pointer',
                  background: filter === f.id ? 'var(--bg-surface)' : 'transparent',
                  color: filter === f.id ? 'var(--ink-primary)' : 'var(--ink-secondary)',
                  fontWeight: filter === f.id ? 600 : 500, fontSize: 11,
                  boxShadow: filter === f.id ? 'var(--shadow-sm)' : 'none',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          {/* Sort */}
          <select
            value={sort} onChange={(e) => setSort(e.target.value)}
            className="input" style={{ width: 'auto', height: 30, fontSize: 11.5, paddingRight: 26 }}
          >
            <option value="icp">Sort: ICP fit</option>
            <option value="hot">Sort: Hot ↓</option>
            <option value="fresh">Sort: Freshest</option>
          </select>
          <button className="btn secondary sm" style={{ gap: 5 }}>
            <Icon name="refresh" size={12} />
            Re-harvest
          </button>
          <button className="btn primary sm" style={{ gap: 5 }}>
            <Icon name="plus" size={12} />
            Add idea
          </button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 60px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 12 }}>
            {sorted.map(idea => (
              <IdeaCard key={idea.id} idea={idea} onGenerate={() => goto('draft', { idea_id: idea.id })} />
            ))}
          </div>
        </div>
      </div>

      {/* Right rail */}
      <aside style={{
        width: 280, flexShrink: 0,
        borderLeft: '1px solid var(--border-subtle)',
        background: 'var(--bg-canvas)',
        padding: 16, overflowY: 'auto',
      }}>
        <SourceRail />
      </aside>
    </div>
  );
}

Object.assign(window, { IdeaWall, IDEAS });
