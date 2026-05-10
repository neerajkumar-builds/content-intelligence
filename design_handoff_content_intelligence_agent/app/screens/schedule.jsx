/* global React */
const { useState, useMemo } = React;

const SCHEDULE = [
  { id: 'sch_01', day: 0, time: '09:15', channel: 'linkedin', title: 'Tool consolidation isn\'t procurement', status: 'scheduled', voice: 0.91, score: 8.5, owner: 'Neeraj', approval: null },
  { id: 'sch_02', day: 0, time: '11:30', channel: 'x',        title: 'Thread: 3 deletions I\'d undo',           status: 'scheduled', voice: 0.88, score: 8.1, owner: 'Neeraj', approval: 'requested' },
  { id: 'sch_03', day: 1, time: '08:45', channel: 'linkedin', title: 'CRM is a system of belief',               status: 'pending',   voice: 0.86, score: 7.9, owner: 'Maya',   approval: 'requested' },
  { id: 'sch_04', day: 1, time: '14:00', channel: 'beehiiv',  title: 'Issue 41 · The behavior map',             status: 'scheduled', voice: 0.92, score: 8.6, owner: 'Neeraj' },
  { id: 'sch_05', day: 2, time: '09:15', channel: 'linkedin', title: 'Decision velocity, not sales velocity',   status: 'failed',    voice: 0.84, score: 7.6, owner: 'Neeraj', error: 'OAuth · token expired' },
  { id: 'sch_06', day: 2, time: '16:00', channel: 'bluesky',  title: 'Quick: when consolidation costs',         status: 'scheduled', voice: 0.89, score: 7.8, owner: 'Maya' },
  { id: 'sch_07', day: 3, time: '08:45', channel: 'linkedin', title: 'AI strategy = org chart',                 status: 'draft',     voice: 0.83, score: 7.4, owner: 'Maya' },
  { id: 'sch_08', day: 3, time: '12:30', channel: 'x',        title: 'Hot take · CFO behavior maps',            status: 'scheduled', voice: 0.87, score: 8.0, owner: 'Neeraj' },
  { id: 'sch_09', day: 4, time: '09:15', channel: 'linkedin', title: 'Hiring funnel, redrawn',                  status: 'scheduled', voice: 0.90, score: 8.2, owner: 'Neeraj', approval: 'approved' },
  { id: 'sch_10', day: 4, time: '14:00', channel: 'beehiiv',  title: 'Issue 42 · Onboarding as a query',        status: 'draft',     voice: 0.85, score: 7.7, owner: 'Maya' },
  { id: 'sch_11', day: 5, time: '10:00', channel: 'linkedin', title: 'Saturday digest · 3 reframes',            status: 'scheduled', voice: 0.89, score: 7.9, owner: 'Neeraj' },
  { id: 'sch_12', day: 6, time: '09:00', channel: 'x',        title: 'Thread · Q2 retro',                       status: 'pending',   voice: 0.86, score: 7.5, owner: 'Neeraj', approval: 'requested' },
];

const DAYS = ['Mon 12', 'Tue 13', 'Wed 14', 'Thu 15', 'Fri 16', 'Sat 17', 'Sun 18'];
const SLOTS = ['08:45', '09:15', '11:30', '12:30', '14:00', '16:00'];

function StatusPill({ status, error }) {
  const map = {
    scheduled: { tone: 'accent', label: 'Scheduled', icon: 'clock' },
    pending:   { tone: 'warn',   label: 'Pending approval', icon: 'eye' },
    draft:     { tone: 'muted',  label: 'Draft', icon: 'edit' },
    failed:    { tone: 'danger', label: 'Failed', icon: 'alert' },
    posted:    { tone: 'success', label: 'Posted', icon: 'check' },
  };
  const c = map[status] || map.draft;
  return (
    <span className={`pill ${c.tone}`} style={{ fontSize: 9.5 }}>
      <span className="dot" />
      {c.label}
    </span>
  );
}

function ScheduleCard({ post, onClick }) {
  const tone = {
    scheduled: 'var(--accent)', pending: 'var(--warn)',
    failed: 'var(--danger)', draft: 'var(--ink-tertiary)', posted: 'var(--success)',
  }[post.status];
  return (
    <div onClick={onClick} className="card" style={{
      padding: 9, marginBottom: 6, cursor: 'pointer',
      borderLeft: `2px solid ${tone}`,
      transition: 'transform 0.1s ease, box-shadow 0.1s ease',
    }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
        <ChannelMark id={post.channel} size={11} />
        <span className="mono tabular" style={{ fontSize: 10, color: 'var(--ink-secondary)', fontWeight: 500 }}>
          {post.time}
        </span>
        <span style={{ flex: 1 }} />
        <span className="mono tabular" style={{ fontSize: 9.5, color: 'var(--ink-tertiary)' }}>
          v{post.voice.toFixed(2)}
        </span>
      </div>
      <p style={{
        fontSize: 11, lineHeight: 1.35, margin: '0 0 5px',
        fontWeight: 500, color: 'var(--ink-primary)',
        overflow: 'hidden', display: '-webkit-box',
        WebkitBoxOrient: 'vertical', WebkitLineClamp: 2,
      }}>{post.title}</p>
      {post.error ? (
        <div style={{
          padding: '3px 5px', background: 'var(--danger-soft)', borderRadius: 3,
          fontSize: 9.5, color: 'var(--danger)',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <Icon name="alert" size={9} />
          {post.error}
        </div>
      ) : post.approval === 'requested' ? (
        <span className="pill warn" style={{ fontSize: 9 }}>
          <span className="dot" />
          Approval pending
        </span>
      ) : post.approval === 'approved' ? (
        <span className="pill success" style={{ fontSize: 9 }}>
          <span className="dot" />
          Approved
        </span>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9.5, color: 'var(--ink-tertiary)' }}>
          <Avatar name={post.owner} size={11} />
          {post.owner}
        </div>
      )}
    </div>
  );
}

function Schedule() {
  const [view, setView] = useState('week');
  const [filter, setFilter] = useState('all');

  const grouped = useMemo(() => {
    const g = Array(7).fill(null).map(() => []);
    SCHEDULE.forEach(s => {
      if (filter !== 'all' && s.channel !== filter) return;
      g[s.day].push(s);
    });
    g.forEach(day => day.sort((a, b) => a.time.localeCompare(b.time)));
    return g;
  }, [filter]);

  const counts = useMemo(() => ({
    scheduled: SCHEDULE.filter(s => s.status === 'scheduled').length,
    pending: SCHEDULE.filter(s => s.status === 'pending').length,
    failed: SCHEDULE.filter(s => s.status === 'failed').length,
    draft: SCHEDULE.filter(s => s.status === 'draft').length,
  }), []);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Toolbar */}
      <div style={{
        padding: '14px 24px', borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 className="display" style={{ fontSize: 22, margin: 0 }}>Schedule · week of May 12</h2>
          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--ink-tertiary)', marginTop: 3 }}>
            <span><span className="mono tabular" style={{ color: 'var(--accent)', fontWeight: 600 }}>{counts.scheduled}</span> scheduled</span>
            <span><span className="mono tabular" style={{ color: 'var(--warn)', fontWeight: 600 }}>{counts.pending}</span> pending approval</span>
            <span><span className="mono tabular" style={{ color: 'var(--danger)', fontWeight: 600 }}>{counts.failed}</span> failed</span>
            <span><span className="mono tabular" style={{ color: 'var(--ink-secondary)', fontWeight: 600 }}>{counts.draft}</span> drafts</span>
          </div>
        </div>

        {/* View toggle */}
        <div style={{ display: 'flex', gap: 2, padding: 2, background: 'var(--bg-muted)', borderRadius: 6 }}>
          {['week', 'month', 'list'].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '4px 10px', borderRadius: 4, border: 0, cursor: 'pointer',
              background: view === v ? 'var(--bg-surface)' : 'transparent',
              color: view === v ? 'var(--ink-primary)' : 'var(--ink-secondary)',
              fontWeight: view === v ? 600 : 500, fontSize: 11,
              boxShadow: view === v ? 'var(--shadow-sm)' : 'none', textTransform: 'capitalize',
            }}>{v}</button>
          ))}
        </div>

        {/* Channel filter */}
        <select value={filter} onChange={e => setFilter(e.target.value)} className="input"
          style={{ width: 'auto', height: 30, fontSize: 11.5 }}>
          <option value="all">All channels</option>
          <option value="linkedin">LinkedIn</option>
          <option value="x">X</option>
          <option value="beehiiv">Beehiiv</option>
          <option value="bluesky">Bluesky</option>
        </select>

        <button className="btn secondary sm" style={{ gap: 5 }}>
          <Icon name="settings" size={12} />
          Posting slots
        </button>
        <button className="btn primary sm" style={{ gap: 5 }}>
          <Icon name="plus" size={12} />
          New
        </button>
      </div>

      {/* Failed banner */}
      {counts.failed > 0 && (
        <div style={{
          padding: '8px 24px', background: 'var(--danger-soft)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 11.5,
        }}>
          <Icon name="alert" size={14} style={{ color: 'var(--danger)' }} />
          <span style={{ color: 'var(--danger)', flex: 1 }}>
            <strong>1 post failed to publish:</strong> Beehiiv connector OAuth token expired 2 days ago. Reconnect to retry idempotently.
          </span>
          <button className="btn sm" style={{ background: 'var(--danger)', color: 'white', padding: '3px 8px' }}>
            Reconnect
          </button>
          <button className="btn ghost sm">View queue</button>
        </div>
      )}

      {/* Week grid */}
      <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'auto repeat(7, minmax(170px, 1fr))', gap: 0,
          minWidth: 'fit-content',
        }}>
          {/* Header row */}
          <div />
          {DAYS.map((d, i) => (
            <div key={d} style={{
              padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)',
              display: 'flex', alignItems: 'baseline', gap: 6,
            }}>
              <span style={{ fontSize: 11, fontWeight: 600 }}>{d.split(' ')[0]}</span>
              <span className="mono" style={{ fontSize: 11, color: i === 1 ? 'var(--accent)' : 'var(--ink-tertiary)', fontWeight: i === 1 ? 600 : 500 }}>
                {d.split(' ')[1]}
              </span>
              {i === 1 && <span className="pill accent" style={{ fontSize: 9, padding: '0 5px' }}>Today</span>}
              <span style={{ flex: 1 }} />
              <span className="mono tabular" style={{ fontSize: 9.5, color: 'var(--ink-tertiary)' }}>
                {grouped[i].length}
              </span>
            </div>
          ))}

          {/* Time gutter + day columns */}
          {SLOTS.map((slot, si) => (
            <React.Fragment key={slot}>
              <div style={{
                padding: '6px 12px 6px 16px', borderRight: '1px solid var(--border-subtle)',
                fontSize: 10, color: 'var(--ink-tertiary)', textAlign: 'right',
                fontFamily: 'JetBrains Mono, monospace',
              }}>{slot}</div>
              {DAYS.map((d, di) => {
                const cell = grouped[di].filter(p => p.time === slot);
                return (
                  <div key={di} style={{
                    padding: 6, minHeight: 78,
                    borderRight: di < 6 ? '1px solid var(--border-subtle)' : 0,
                    borderTop: si === 0 ? 0 : '1px dashed var(--border-subtle)',
                    background: di === 1 ? 'var(--accent-softer)' : 'transparent',
                  }}>
                    {cell.map(p => <ScheduleCard key={p.id} post={p} />)}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>

        {/* Slot config preview */}
        <div className="card" style={{ marginTop: 18, padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Icon name="settings" size={14} style={{ color: 'var(--ink-tertiary)' }} />
            <h4 style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>Posting slots · default per channel</h4>
            <span style={{ flex: 1 }} />
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-tertiary)' }}>
              GET /v1/workspace/posting-slots
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {[
              { ch: 'linkedin', slots: ['Mon-Fri 09:15', 'Tue/Thu 11:30'] },
              { ch: 'x',        slots: ['Daily 11:30', 'Mon/Wed/Fri 12:30'] },
              { ch: 'beehiiv',  slots: ['Tue/Fri 14:00'] },
              { ch: 'bluesky',  slots: ['Mon-Fri 16:00'] },
            ].map(c => (
              <div key={c.ch} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <ChannelMark id={c.ch} size={14} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'capitalize', marginBottom: 2 }}>{c.ch}</div>
                  {c.slots.map(s => (
                    <div key={s} className="mono" style={{ fontSize: 10, color: 'var(--ink-tertiary)' }}>{s}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Schedule });
