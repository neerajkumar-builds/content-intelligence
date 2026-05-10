// Home — "This Morning" briefing + mission control hybrid

function Home() {
  const { goto } = useRouter();

  // ─── Briefing data ──────────────────────────────────────────
  const briefing = {
    date: 'Tuesday, May 12 · 9:14 AM',
    signals: 47,
    angles: 6,
    drafts_graded: 4,
    drafts_ready: 2,
    next_publish: { ch: 'linkedin', when: '9:30 AM', in_min: 16 },
    voice_fidelity: 0.91,
    voice_window: 10,
    drafts_used: 47,
    drafts_limit: 200,
  };

  // ─── Decisions queue ────────────────────────────────────────
  const decisions = [
    {
      kind: 'review',
      icon: 'edit',
      title: 'Review 2 drafts before 9:30 publish',
      detail: 'Draft d_a8f2 (LinkedIn · score 8.7) · Draft d_b2c1 (X thread · score 7.9) · both pass anti-AI strict.',
      cta: 'Open Drafts', to: 'draft',
    },
    {
      kind: 'reconnect',
      icon: 'plug',
      title: 'Beehiiv connector expired 2 days ago',
      detail: 'Tuesday newsletter scheduled at 10:30 AM will fail unless reconnected. 1-click OAuth, 30 seconds.',
      cta: 'Reconnect', to: 'connectors',
      tone: 'bad',
    },
    {
      kind: 'pattern',
      icon: 'chart',
      title: 'Contrarian format outperforming listicle 3.2×',
      detail: 'Last 30 days: contrarian 4.8% engagement, listicle 1.5%. Suggest shifting next-week mix from 30/40/30 → 50/20/30.',
      cta: 'Apply suggestion', to: 'insights',
    },
  ];

  // ─── Mission control: today's queue ─────────────────────────
  const today = [
    { time: '9:30',  ch: 'linkedin', title: 'Why most B2B "thought leadership" is just paraphrased Gartner', state: 'next', score: 8.7 },
    { time: '10:30', ch: 'beehiiv',  title: 'The Tuesday Loop — issue #47',                                        state: 'blocked', score: 8.2 },
    { time: '12:15', ch: 'x',        title: 'Hook test thread — 4 variations on attribution gaps',                state: 'queued', score: 7.9 },
    { time: '14:00', ch: 'linkedin', title: 'Customer story: cut CAC 38% by retiring 3 SDR scripts',              state: 'queued', score: 8.4 },
    { time: '17:30', ch: 'threads',  title: 'Mid-week reflection — what we learned shipping daily for 90 days',   state: 'pending', score: 7.6 },
  ];

  // ─── Live signals stream ────────────────────────────────────
  const signals = [
    { t: '9:11', src: 'rss',         label: 'Pavilion · "What 2026 GTM benchmarks tell us"',          tag: 'angle-fit', score: 0.84 },
    { t: '9:04', src: 'competitor',  label: 'Sabrina shipped: "Attribution is a story problem"',     tag: 'high-velocity', score: 0.91 },
    { t: '8:47', src: 'listening',   label: 'Mention: "FullFunnel\'s ICP framework" · ProductHunt',  tag: 'mention', score: null },
    { t: '8:32', src: 'competitor',  label: 'Justin Welsh shipped: 5-step audit framework',          tag: 'angle-fit', score: 0.78 },
    { t: '8:19', src: 'rss',         label: 'a16z · "The new B2B distribution stack"',               tag: 'wedge-relevant', score: 0.81 },
    { t: '8:02', src: 'rss',         label: 'GTMnow podcast: SDR death thesis · transcript indexed', tag: 'idea-seed', score: 0.72 },
  ];

  // ─── The Loop · live counts ─────────────────────────────────
  const loop = [
    { stage: 'Signals',  count: 47, sub: 'ingested 24h', icon: 'activity' },
    { stage: 'Ideas',    count: 23, sub: 'in wall',      icon: 'sparkle'  },
    { stage: 'Drafts',   count: 4,  sub: 'in flight',    icon: 'edit'     },
    { stage: 'Schedule', count: 12, sub: 'this week',    icon: 'calendar' },
    { stage: 'Live',     count: 38, sub: 'last 30d',     icon: 'arrowRight' },
    { stage: 'Learn',    count: 0.91, sub: 'voice fidelity', icon: 'chart', isMetric: true },
  ];

  // ─── Connector strip ────────────────────────────────────────
  const connectorStrip = [
    { id: 'linkedin',  state: 'healthy' },
    { id: 'x',         state: 'healthy' },
    { id: 'beehiiv',   state: 'reconnect' },
    { id: 'substack',  state: 'paste' },
    { id: 'facebook',  state: 'healthy' },
    { id: 'instagram', state: 'healthy' },
    { id: 'youtube',   state: 'healthy' },
    { id: 'tiktok',    state: 'reconnect' },
    { id: 'threads',   state: 'healthy' },
    { id: 'reddit',    state: 'healthy' },
    { id: 'hubspot',   state: 'healthy' },
    { id: 'bluesky',   state: 'healthy' },
    { id: 'pinterest', state: 'disconnected' },
    { id: 'medium',    state: 'disconnected' },
    { id: 'mastodon',  state: 'disconnected' },
  ];
  const stateMeta = {
    healthy:      { color: 'var(--good)',    label: 'connected' },
    reconnect:    { color: 'var(--danger)',  label: 'reconnect' },
    paste:        { color: 'var(--warning)', label: 'paste mode' },
    disconnected: { color: 'var(--ink-quaternary)', label: 'available' },
  };

  // ─── This week's top ideas (from Learn) ─────────────────────
  const weekIdeas = [
    {
      src: 'Sabrina Ramonov', srcKind: 'leader', avatar: 'SR',
      angle: 'Their attribution-as-storytelling thesis maps to your "anti-dashboard" wedge — flip the framing.',
      ch: ['linkedin', 'beehiiv'], score: 8.6, velocity: '+4.2k', heat: 'hot',
    },
    {
      src: 'Pavilion Benchmarks', srcKind: 'rss', avatar: 'PB',
      angle: '2026 GTM benchmarks contradict your last 3 LinkedIn posts on SDR efficiency. Contrarian take ready.',
      ch: ['linkedin', 'x'], score: 8.2, velocity: '+1.8k', heat: 'warm',
    },
    {
      src: 'Justin Welsh', srcKind: 'leader', avatar: 'JW',
      angle: '5-step solo audit framework — adapt to "5 things B2B teams audit wrong" with FullFunnel customer data.',
      ch: ['linkedin'], score: 7.9, velocity: '+3.1k', heat: 'hot',
    },
    {
      src: 'Hyperion (competitor)', srcKind: 'competitor', avatar: 'H',
      angle: 'They published a SDR-replacement playbook. You have stronger customer evidence — write the rebuttal.',
      ch: ['linkedin', 'beehiiv', 'x'], score: 8.4, velocity: '+820', heat: 'warm',
    },
    {
      src: 'Pierre Herubel', srcKind: 'leader', avatar: 'PH',
      angle: 'His "demand creation vs capture" thread is trending. Your wedge is downstream — sequel angle ready.',
      ch: ['linkedin'], score: 7.6, velocity: '+2.4k', heat: 'warm',
    },
    {
      src: 'a16z Newsletter', srcKind: 'rss', avatar: 'a16',
      angle: '"The new B2B distribution stack" thesis. Counter with operator-grade view from your client portfolio.',
      ch: ['beehiiv', 'substack'], score: 7.4, velocity: '+910', heat: 'warm',
    },
  ];

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
    <div style={{ padding: '20px 28px 32px', maxWidth: 1480, margin: '0 auto' }}>

      {/* ─── BRIEFING ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'flex-start' }}>
        <div>
          <div className="eyebrow" style={{ fontSize: 9.5, color: 'var(--ink-tertiary)' }}>
            BRIEFING · {briefing.date}
          </div>
          <h1 style={{
            fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em',
            margin: '8px 0 14px', lineHeight: 1.15,
          }}>
            Good morning, Neeraj.
          </h1>
          <p style={{
            fontSize: 15, lineHeight: 1.7, color: 'var(--ink-secondary)',
            maxWidth: 740, margin: 0,
          }}>
            <strong style={{ color: 'var(--ink-primary)' }}>{briefing.drafts_ready} drafts ready</strong> &middot;{' '}
            <strong style={{ color: 'var(--accent)' }}>1 publishes in {briefing.next_publish.in_min} min</strong> &middot;{' '}
            voice fidelity holds at <strong className="mono tabular" style={{ color: 'var(--good)' }}>{briefing.voice_fidelity.toFixed(2)}</strong>.
            Overnight I ingested{' '}
            <BriefingLink onClick={() => goto('ideas')}>{briefing.signals} signals</BriefingLink> and surfaced{' '}
            <BriefingLink onClick={() => goto('ideas')}>{briefing.angles} angle-fits</BriefingLink> &mdash; below.
          </p>
        </div>

        {/* Telemetry rail */}
        <div className="card" style={{ padding: 14 }}>
          <div className="eyebrow" style={{ fontSize: 9, marginBottom: 10 }}>TELEMETRY · LIVE</div>
          <TelRow label="Voice fidelity (10-post avg)" value={briefing.voice_fidelity.toFixed(2)} tone="good" trend={[0.86, 0.88, 0.89, 0.91, 0.90, 0.92, 0.91, 0.91, 0.92, 0.91]} />
          <TelRow label="Cost / draft (rolling)"        value="$0.34" tone="good" trend={[0.42, 0.39, 0.38, 0.36, 0.36, 0.35, 0.34, 0.34, 0.33, 0.34]} />
        </div>
      </div>

      {/* ─── CONNECTOR STRIP ─────────────────────────────────── */}
      <div style={{ marginTop: 20, padding: '12px 14px', border: '1px solid var(--border-subtle)', borderRadius: 8, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="eyebrow" style={{ fontSize: 9 }}>CHANNELS</span>
          <span style={{ fontSize: 10.5, color: 'var(--ink-tertiary)' }}>
            {connectorStrip.filter(c => c.state === 'healthy').length}/{connectorStrip.length} connected
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1 }}>
          {connectorStrip.map(c => (
            <Tooltip key={c.id} label={`${c.id} · ${stateMeta[c.state].label}`} side="bottom">
              <button onClick={() => goto('connectors')} style={{
                position: 'relative', background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
                opacity: c.state === 'disconnected' ? 0.45 : 1,
                filter: c.state === 'disconnected' ? 'grayscale(0.6)' : 'none',
              }}>
                <ChannelMark id={c.id} size={22} />
                <span style={{
                  position: 'absolute', bottom: -1, right: -1,
                  width: 8, height: 8, borderRadius: 50,
                  background: stateMeta[c.state].color,
                  border: '1.5px solid var(--bg-elevated)',
                }} />
              </button>
            </Tooltip>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 28 }}>
        <SectionHead title="What needs you" subtitle="Decisions surfaced from overnight ingestion + scoring." right={<span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-tertiary)' }}>4 open · 0 dismissed today</span>} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 12, marginTop: 10 }}>
          {decisions.map((d, i) => (
            <button key={i} onClick={() => goto(d.to)}
              className="card" style={{
                padding: 14, textAlign: 'left', cursor: 'pointer', border: '1px solid var(--border-subtle)',
                background: 'var(--bg-elevated)', display: 'flex', flexDirection: 'column', gap: 8,
                transition: 'transform 0.08s, border-color 0.12s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.transform = 'none'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 5,
                  background: d.tone === 'bad' ? 'var(--danger-soft)' : 'var(--accent-soft)',
                  color: d.tone === 'bad' ? 'var(--danger)' : 'var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={d.icon} size={14} />
                </div>
                <Icon name="arrowRight" size={13} style={{ color: 'var(--ink-quaternary)' }} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35 }}>{d.title}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-tertiary)', lineHeight: 1.5 }}>{d.detail}</div>
              <div style={{
                marginTop: 'auto', paddingTop: 8, fontSize: 11, color: d.tone === 'bad' ? 'var(--danger)' : 'var(--accent)',
                fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
              }}>
                {d.cta} <Icon name="arrowRight" size={10} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ─── THIS WEEK'S TOP IDEAS ──────────────────────────── */}
      <div style={{ marginTop: 28 }}>
        <SectionHead
          title="This week's top ideas"
          subtitle="From competitors, thought leaders & signal feeds — graded for fit with your wedge."
          right={<button onClick={() => goto('leaders')} className="btn ghost sm" style={{ fontSize: 10.5 }}>All sources →</button>}
        />
        <div style={{
          marginTop: 10, display: 'grid', gridAutoFlow: 'column',
          gridAutoColumns: 'minmax(280px, 1fr)', gap: 12, overflowX: 'auto',
          paddingBottom: 4, scrollSnapType: 'x mandatory',
        }}>
          {weekIdeas.map((idea, i) => {
            const srcLabel = idea.srcKind === 'leader' ? 'Thought leader' : idea.srcKind === 'competitor' ? 'Competitor' : 'Signal feed';
            const accentBorder = idea.srcKind === 'leader' ? 'var(--accent)' : idea.srcKind === 'competitor' ? 'var(--danger)' : 'var(--ink-quaternary)';
            const heatColor = idea.heat === 'hot' ? 'var(--danger)' : 'var(--warning)';
            return (
              <div key={i} className="card" style={{
                padding: 14, scrollSnapAlign: 'start', borderLeft: `2px solid ${accentBorder}`,
                display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 4,
                    background: 'var(--bg-muted)', color: 'var(--ink-secondary)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9.5, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace',
                    flexShrink: 0,
                  }}>{idea.avatar}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{idea.src}</div>
                    <div className="eyebrow" style={{ fontSize: 9, color: 'var(--ink-tertiary)' }}>{srcLabel}</div>
                  </div>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
                    color: heatColor, background: 'transparent', border: `1px solid ${heatColor}`,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>{idea.heat} {idea.velocity}</span>
                </div>
                <div style={{
                  fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-primary)',
                  fontFamily: 'Charter, Georgia, serif', flex: 1,
                }}>{idea.angle}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 8, borderTop: '1px dashed var(--border-subtle)' }}>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {idea.ch.map(ch => <ChannelMark key={ch} id={ch} size={14} />)}
                  </div>
                  <ScoreSwatch value={idea.score / 10} />
                  <span className="mono tabular" style={{ fontSize: 10.5, color: 'var(--ink-secondary)' }}>{idea.score.toFixed(1)}</span>
                  <button onClick={() => goto('draft')} className="btn primary sm" style={{ marginLeft: 'auto', fontSize: 10.5, padding: '3px 9px' }}>Generate</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── MISSION CONTROL ROW ──────────────────────────────── */}
      <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 14 }}>

        {/* Now / next publishing */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <PanelHead title="Next publish" right={<span className="mono pill outline" style={{ fontSize: 9.5 }}>countdown · 16:24</span>} />
          <div style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <ChannelMark id="linkedin" size={20} />
              <span style={{ fontSize: 11, color: 'var(--ink-tertiary)' }}>LinkedIn · @neeraj-kumar · 9:30 AM today</span>
              <span className="pill good" style={{ marginLeft: 'auto', fontSize: 9.5 }}><span className="dot" />ready</span>
            </div>
            <div style={{
              padding: 12, background: 'var(--bg-muted)', border: '1px dashed var(--border-subtle)', borderRadius: 5,
              fontSize: 12.5, lineHeight: 1.6, fontFamily: 'Charter, Georgia, serif',
            }}>
              <strong style={{ color: 'var(--ink-primary)' }}>Most B2B "thought leadership" is just paraphrased Gartner.</strong>
              <br />Three patterns I've watched destroy demand-gen orgs:
              <br />— quoting category analysts as your point of view
              <br />— renaming someone else's framework with your logo
              <br />— "trends" posts that read like AI-generated CES recaps
              <br /><span style={{ color: 'var(--ink-tertiary)' }}>(continues — 142 words · 7-dim score 8.7 · voice 0.93)</span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
              <button className="btn primary sm" onClick={() => goto('draft')} style={{ flex: 1 }}>Review</button>
              <button className="btn ghost sm" style={{ flex: 1 }}>Reschedule</button>
              <button className="btn ghost sm icon" title="Inspect prompt"><Icon name="sparkle" size={13} /></button>
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--border-subtle)', display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--ink-tertiary)' }}>
              <span className="mono">idem_d_a8f2_v3_li_20260512</span>
              <span>cost so far: $0.41</span>
            </div>
          </div>
        </div>

        {/* Today's queue */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <PanelHead title="Today" right={<span className="mono" style={{ fontSize: 10, color: 'var(--ink-tertiary)' }}>5 scheduled · 4 channels</span>} cta="See week" onClick={() => goto('schedule')} />
          <div>
            {today.map((p, i) => (
              <div key={i} style={{
                padding: '9px 14px',
                borderTop: i === 0 ? 0 : '1px solid var(--border-subtle)',
                display: 'flex', alignItems: 'center', gap: 10,
                background: p.state === 'next' ? 'var(--accent-soft)' : 'transparent',
              }}>
                <div className="mono tabular" style={{ fontSize: 10.5, width: 38, color: p.state === 'next' ? 'var(--accent)' : 'var(--ink-tertiary)', fontWeight: p.state === 'next' ? 600 : 400 }}>
                  {p.time}
                </div>
                <ChannelMark id={p.ch} size={16} />
                <div style={{ flex: 1, fontSize: 11.5, lineHeight: 1.4, color: 'var(--ink-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.title}>
                  {p.title}
                </div>
                <span className={`pill ${p.state === 'next' ? 'good' : p.state === 'blocked' ? 'bad' : 'neutral'}`} style={{ fontSize: 9.5 }}>
                  {p.state === 'next' ? 'next' : p.state}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ─── THE LOOP — moved to /insights ───────────────────── */}
      <div style={{ marginTop: 28, display: 'none' }}>
        <SectionHead
          title="The loop"
          subtitle="Live state of the content engine. Each stage links to its surface."
          right={<span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-tertiary)' }}>last update 4s ago</span>}
        />
        <div className="card" style={{ marginTop: 10, padding: '20px 18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', alignItems: 'center', gap: 0 }}>
            {loop.map((st, i) => (
              <React.Fragment key={st.stage}>
                <button onClick={() => {
                  const map = { Signals: 'ideas', Ideas: 'ideas', Drafts: 'draft', Schedule: 'schedule', Live: 'insights', Learn: 'insights' };
                  goto(map[st.stage]);
                }}
                  style={{
                    background: 'transparent', border: 0, cursor: 'pointer', padding: '8px 4px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, position: 'relative',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 7,
                    background: 'var(--bg-muted)', border: '1px solid var(--border-subtle)',
                    color: 'var(--ink-secondary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name={st.icon} size={17} />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-primary)' }}>{st.stage}</div>
                  <div className="mono tabular" style={{
                    fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em',
                    color: st.isMetric ? 'var(--good)' : 'var(--ink-primary)',
                  }}>
                    {st.isMetric ? st.count.toFixed(2) : st.count}
                  </div>
                  <div style={{ fontSize: 9.5, color: 'var(--ink-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{st.sub}</div>
                </button>
                {i < loop.length - 1 && (
                  <div style={{ position: 'relative', height: 1, background: 'var(--border-subtle)', margin: '0 -8px', display: 'none' }} />
                )}
              </React.Fragment>
            ))}
          </div>
          {/* Connector arrows */}
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: -78, marginBottom: 70, padding: '0 6%', pointerEvents: 'none', position: 'relative', zIndex: 0 }}>
            {[1, 2, 3, 4, 5].map(i => (
              <Icon key={i} name="arrowRight" size={11} style={{ color: 'var(--ink-quaternary)' }} />
            ))}
          </div>
          <div style={{
            marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--border-subtle)',
            display: 'flex', gap: 18, fontSize: 11, color: 'var(--ink-tertiary)', flexWrap: 'wrap',
          }}>
            <span><strong style={{ color: 'var(--ink-secondary)' }}>Signal → idea</strong> conversion: <span className="mono tabular" style={{ color: 'var(--ink-primary)' }}>49%</span></span>
            <span><strong style={{ color: 'var(--ink-secondary)' }}>Idea → draft</strong>: <span className="mono tabular" style={{ color: 'var(--ink-primary)' }}>17%</span></span>
            <span><strong style={{ color: 'var(--ink-secondary)' }}>Draft → ship</strong>: <span className="mono tabular" style={{ color: 'var(--good)' }}>83%</span></span>
            <span><strong style={{ color: 'var(--ink-secondary)' }}>Ship → engagement {'>'} median</strong>: <span className="mono tabular" style={{ color: 'var(--ink-primary)' }}>61%</span></span>
            <span style={{ marginLeft: 'auto' }} className="mono">healthy · no stage stalled</span>
          </div>
        </div>
      </div>

    </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────
function BriefingLink({ children, onClick }) {
  return (
    <a onClick={onClick} style={{
      color: 'var(--accent)', cursor: 'pointer', textDecoration: 'none',
      borderBottom: '1px dashed var(--accent)', fontWeight: 500,
    }}>{children}</a>
  );
}

function TelRow({ label, value, tone, trend, detail }) {
  const color = tone === 'good' ? 'var(--good)' : tone === 'bad' ? 'var(--danger)' : 'var(--ink-primary)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed var(--border-subtle)', fontSize: 11.5 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'var(--ink-secondary)' }}>{label}</div>
        {detail && <div style={{ fontSize: 10, color: 'var(--ink-tertiary)', marginTop: 1 }}>{detail}</div>}
      </div>
      {trend && (
        <div style={{ width: 60, height: 18, marginRight: 14 }}>
          <Sparkline data={trend} color={color} height={18} />
        </div>
      )}
      <div className="mono tabular" style={{ color, fontWeight: 600, fontSize: 12, minWidth: 42, textAlign: 'right' }}>
        {value}
      </div>
    </div>
  );
}

function SectionHead({ title, subtitle, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11.5, color: 'var(--ink-tertiary)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

function PanelHead({ title, right, cta, onClick }) {
  return (
    <div style={{
      padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--bg-muted)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <span style={{ fontSize: 12, fontWeight: 600 }}>{title}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {right}
        {cta && <button onClick={onClick} className="btn ghost sm" style={{ fontSize: 10.5, padding: '2px 8px' }}>{cta}</button>}
      </div>
    </div>
  );
}

function RollupCard({ title, ch, line, stats, onClick }) {
  return (
    <button onClick={onClick} className="card" style={{
      padding: 14, textAlign: 'left', cursor: 'pointer', border: '1px solid var(--border-subtle)',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="eyebrow" style={{ fontSize: 9 }}>{title}</div>
        {ch && <ChannelMark id={ch} size={16} />}
      </div>
      <div style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--ink-primary)', fontWeight: 500 }}>{line}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, paddingTop: 8, borderTop: '1px dashed var(--border-subtle)' }}>
        {stats.map(([k, v]) => (
          <div key={k} style={{ fontSize: 10.5 }}>
            <div style={{ color: 'var(--ink-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 9 }}>{k}</div>
            <div className="mono tabular" style={{ color: 'var(--ink-primary)', fontWeight: 600, fontSize: 12 }}>{v}</div>
          </div>
        ))}
      </div>
    </button>
  );
}

Object.assign(window, { Home });
