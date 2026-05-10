/* global React */
const { useState } = React;

// ─── Hook variants for current idea ────────────────────────
const HOOK_VARIANTS = [
  { id: 'h1', text: 'Most ops leaders think tool consolidation saves money. We deleted 11 tools last quarter — three made things worse.', score: 9.2, voice: 0.93, picked: true, model: 'opus-4.5' },
  { id: 'h2', text: 'I deleted 11 tools last quarter to save money. Three made my team slower, not faster. Here\'s how I picked the wrong ones.', score: 8.8, voice: 0.89, model: 'opus-4.5' },
  { id: 'h3', text: 'Tool consolidation is not a money problem. It\'s a context problem. We learned this by deleting the wrong 3 of 11.', score: 8.4, voice: 0.91, model: 'sonnet-4.5' },
  { id: 'h4', text: 'You don\'t consolidate tools to save money. You consolidate them to save context-switches.', score: 7.9, voice: 0.86, model: 'sonnet-4.5' },
  { id: 'h5', text: 'The 3 tools I should not have deleted (out of 11). A retro for ops leaders.', score: 7.5, voice: 0.88, model: 'sonnet-4.5' },
];

const VIRALITY_DIMS = [
  { id: 'curiosity',   label: 'Curiosity gap',   value: 8.7, w: 0.18 },
  { id: 'novelty',     label: 'Novelty',         value: 8.2, w: 0.15 },
  { id: 'specificity', label: 'Specificity',     value: 9.1, w: 0.18 },
  { id: 'stakes',      label: 'Personal stakes', value: 8.5, w: 0.12 },
  { id: 'tension',     label: 'Tension',         value: 8.0, w: 0.13 },
  { id: 'utility',     label: 'Utility',         value: 7.9, w: 0.13 },
  { id: 'identity',    label: 'Identity',        value: 8.6, w: 0.11 },
];

const VOICE_RULES = [
  { kind: 'pass', label: 'em-dash · zero', detail: 'no — characters in body' },
  { kind: 'pass', label: 'soft-banned phrases · 0', detail: '"unlock", "leverage", "ecosystem"' },
  { kind: 'pass', label: 'sentence cadence', detail: 'fingerprint cosine 0.91' },
  { kind: 'pass', label: 'reading level', detail: 'grade 8.4 (target 7-9)' },
  { kind: 'warn', label: 'starts-with-"I" · 2', detail: 'soft cap is 1 per 200 words' },
  { kind: 'pass', label: '62 anti-AI rules', detail: 'all clear' },
];

const DRAFT_BODY = `Most ops leaders think tool consolidation saves money. We deleted 11 tools last quarter — three made things worse.

Here's what got cut, and which three I'd bring back tomorrow:

The Calendly clone we built. It saved $48/month. It cost two reps an hour each, every week, calibrating shared availability across timezones.

The "all-in-one" CRM that replaced HubSpot, Linear, and Notion. We saved $1,800/month. Pipeline visibility dropped 23%. Two deals slipped that wouldn't have. Net: negative.

The internal Loom replacement. Cheap. Slower. People stopped recording the loops, which means context died in DMs. We're still recovering.

The pattern: every "savings" looked like a clean line item. Every cost was a behavior change we didn't measure.

Tool consolidation is not a procurement decision. It's a behavior decision wearing procurement's clothes.

If your CFO is asking what to cut, send them the behavior map first. Lines on a spreadsheet hide everything that matters.`;

// ─── Hook chip ────────────────────────────────────────────
function HookChip({ hook, picked, onPick }) {
  return (
    <div
      onClick={onPick}
      style={{
        padding: '10px 12px', borderRadius: 6, cursor: 'pointer',
        background: picked ? 'var(--accent-soft)' : 'var(--bg-surface)',
        border: `1px solid ${picked ? 'var(--accent)' : 'var(--border-subtle)'}`,
        transition: 'all 0.12s ease', position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
        <span className="mono" style={{ fontSize: 9.5, color: 'var(--ink-tertiary)', fontWeight: 500 }}>
          {hook.id.toUpperCase()}
        </span>
        <span className="pill muted" style={{ fontSize: 9, padding: '1px 5px' }}>{hook.model}</span>
        <span style={{ flex: 1 }} />
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Tooltip label="Hook score (0-10)">
            <span className="mono tabular" style={{
              fontSize: 11, fontWeight: 600,
              color: hook.score >= 9 ? 'var(--success)' : hook.score >= 8 ? 'var(--ink-primary)' : 'var(--ink-secondary)',
            }}>{hook.score.toFixed(1)}</span>
          </Tooltip>
          <span style={{ fontSize: 9, color: 'var(--ink-quaternary)' }}>·</span>
          <Tooltip label="Voice fidelity">
            <span className="mono tabular" style={{ fontSize: 10, color: 'var(--ink-secondary)' }}>
              v{hook.voice.toFixed(2)}
            </span>
          </Tooltip>
        </span>
      </div>
      <p style={{ fontSize: 11.5, lineHeight: 1.45, margin: 0, color: 'var(--ink-secondary)' }}>
        {hook.text}
      </p>
      {picked && (
        <div style={{
          position: 'absolute', top: 8, right: 10,
          width: 14, height: 14, borderRadius: 50,
          background: 'var(--accent)', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="check" size={9} style={{ strokeWidth: 3 }} />
        </div>
      )}
    </div>
  );
}

// ─── Scoring spine (right rail) ───────────────────────────
function ScoringSpine() {
  const total = VIRALITY_DIMS.reduce((s, d) => s + d.value * d.w, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* headline scores */}
      <div className="card" style={{ padding: 14, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <h4 style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>Score · live</h4>
          <span className="mono" style={{ fontSize: 9, color: 'var(--ink-tertiary)' }}>updated 2s ago</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div className="eyebrow" style={{ fontSize: 8.5 }}>Voice fidelity</div>
            <div className="mono tabular" style={{ fontSize: 26, fontWeight: 600, color: 'var(--success)', lineHeight: 1, marginTop: 2 }}>
              0.91
            </div>
            <div style={{ fontSize: 10, color: 'var(--ink-tertiary)', marginTop: 2 }}>
              cosine vs. 23 prior posts
            </div>
            <div className="meter good" style={{ marginTop: 5 }}>
              <div className="fill" style={{ width: '91%' }} />
            </div>
            <div className="mono" style={{ fontSize: 9, color: 'var(--ink-tertiary)', marginTop: 2 }}>
              floor 0.85 · pass
            </div>
          </div>
          <div>
            <div className="eyebrow" style={{ fontSize: 8.5 }}>Virality (7-dim)</div>
            <div className="mono tabular" style={{ fontSize: 26, fontWeight: 600, lineHeight: 1, marginTop: 2 }}>
              {total.toFixed(1)}
            </div>
            <div style={{ fontSize: 10, color: 'var(--ink-tertiary)', marginTop: 2 }}>
              weighted avg / 10
            </div>
            <div className="meter good" style={{ marginTop: 5 }}>
              <div className="fill" style={{ width: `${total * 10}%` }} />
            </div>
            <div className="mono" style={{ fontSize: 9, color: 'var(--ink-tertiary)', marginTop: 2 }}>
              target ≥7.5 · pass
            </div>
          </div>
        </div>
      </div>

      {/* 7-dim breakdown */}
      <div className="card" style={{ padding: 14 }}>
        <h4 style={{ margin: 0, fontSize: 12, fontWeight: 600, marginBottom: 10 }}>7-dimension rubric</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {VIRALITY_DIMS.map(d => (
            <div key={d.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2, fontSize: 10.5 }}>
                <span style={{ color: 'var(--ink-secondary)' }}>{d.label}</span>
                <span className="mono tabular" style={{ color: 'var(--ink-secondary)', fontWeight: 500 }}>
                  <span style={{ color: 'var(--ink-quaternary)' }}>w{(d.w * 100).toFixed(0)}</span> · {d.value.toFixed(1)}
                </span>
              </div>
              <div className={`meter ${d.value >= 8 ? 'good' : d.value >= 6 ? 'mid' : 'bad'}`} style={{ height: 3 }}>
                <div className="fill" style={{ width: `${d.value * 10}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Anti-AI rules audit */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>Anti-AI audit</h4>
            <span className="pill warn" style={{ fontSize: 9 }}><span className="dot" />1 soft</span>
          </div>
          <div style={{ fontSize: 10, color: 'var(--ink-tertiary)', marginTop: 2 }}>
            62 rules · ruleset <span className="mono">v3.2</span>
          </div>
        </div>
        {VOICE_RULES.map((r, i) => (
          <div key={i} style={{
            padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 8,
            borderTop: i ? '1px solid var(--border-subtle)' : 0,
          }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 14, height: 14, borderRadius: 50, flexShrink: 0,
              background: r.kind === 'pass' ? 'var(--success-soft)' : 'var(--warn-soft)',
              color: r.kind === 'pass' ? 'var(--success)' : 'var(--warn)',
            }}>
              <Icon name={r.kind === 'pass' ? 'check' : 'alert'} size={9} style={{ strokeWidth: 2.5 }} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 500 }}>{r.label}</div>
              <div className="mono" style={{ fontSize: 9.5, color: 'var(--ink-tertiary)' }}>{r.detail}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Cost ledger */}
      <div className="card" style={{ padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <h4 style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>AI cost ledger</h4>
          <span className="mono tabular" style={{ fontSize: 11, fontWeight: 600 }}>$0.14</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--ink-tertiary)' }}>
          <span>opus-4.5 · 5,840 tok</span>
          <span>sonnet-4.5 · 3,200 tok</span>
        </div>
      </div>
    </div>
  );
}

// ─── Format selector ──────────────────────────────────────
function FormatSelector({ format, setFormat }) {
  const formats = [
    { id: 'linkedin-long', label: 'LinkedIn · long', limit: '3,000', channel: 'linkedin' },
    { id: 'x-thread',      label: 'X thread',         limit: '5 posts × 280', channel: 'x' },
    { id: 'newsletter',    label: 'Newsletter',       limit: 'no cap', channel: 'beehiiv' },
    { id: 'bluesky',       label: 'Bluesky post',     limit: '300', channel: 'bluesky' },
  ];
  return (
    <div style={{ display: 'flex', gap: 6, padding: 4, background: 'var(--bg-muted)', borderRadius: 6 }}>
      {formats.map(f => (
        <button
          key={f.id}
          onClick={() => setFormat(f.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 10px', borderRadius: 4, border: 0, cursor: 'pointer',
            background: format === f.id ? 'var(--bg-surface)' : 'transparent',
            color: format === f.id ? 'var(--ink-primary)' : 'var(--ink-secondary)',
            boxShadow: format === f.id ? 'var(--shadow-sm)' : 'none',
            fontSize: 11, fontWeight: format === f.id ? 600 : 500,
          }}
        >
          <ChannelMark id={f.channel} size={12} />
          {f.label}
          <span className="mono" style={{ fontSize: 9, color: 'var(--ink-tertiary)' }}>
            {f.limit}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Drafts screen ────────────────────────────────────────
function Drafts() {
  const { goto, params } = useRouter();
  const [picked, setPicked] = useState('h1');
  const [format, setFormat] = useState('linkedin-long');
  const [body, setBody] = useState(DRAFT_BODY);

  const charCount = body.length;
  const wordCount = body.trim().split(/\s+/).length;

  return (
    <div className="fade-in" style={{ display: 'flex', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* Left: hook variants */}
      <aside style={{
        width: 320, flexShrink: 0,
        borderRight: '1px solid var(--border-subtle)',
        background: 'var(--bg-canvas)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 16px 10px', flexShrink: 0 }}>
          <div className="eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>From idea_a47</div>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Hook iterations</h3>
          <p style={{ fontSize: 11, color: 'var(--ink-tertiary)', margin: '3px 0 0' }}>
            5 generated · pick one to seed the draft
          </p>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {HOOK_VARIANTS.map(h => (
            <HookChip key={h.id} hook={h} picked={picked === h.id} onPick={() => setPicked(h.id)} />
          ))}
          <button className="btn ghost sm" style={{
            marginTop: 4, justifyContent: 'flex-start', gap: 6,
            border: '1px dashed var(--border-default)', padding: '8px 10px',
          }}>
            <Icon name="sparkle" size={12} />
            Regenerate · 3 more
          </button>
        </div>
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border-subtle)', fontSize: 10, color: 'var(--ink-tertiary)' }}>
          <div className="mono">POST /v1/drafts/:id/hooks</div>
        </div>
      </aside>

      {/* Center: editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Editor top bar */}
        <div style={{
          padding: '12px 22px', borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <button className="btn ghost icon sm" onClick={() => goto('ideas')}>
            <Icon name="chevLeft" size={14} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input
              defaultValue="Tool consolidation isn't procurement"
              style={{
                width: '100%', border: 0, background: 'transparent',
                fontSize: 14, fontWeight: 600, color: 'inherit', outline: 'none',
                padding: 0, letterSpacing: '-0.005em',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10.5, color: 'var(--ink-tertiary)', marginTop: 2 }}>
              <span className="pill muted" style={{ fontSize: 9.5 }}>Draft</span>
              <span className="mono">draft_d39</span>
              <span>·</span>
              <span>autosaved 2s ago</span>
              <span>·</span>
              <Avatar name="Neeraj Sharma" size={14} />
              <span>Neeraj</span>
            </div>
          </div>
          <FormatSelector format={format} setFormat={setFormat} />
        </div>

        {/* Editor body */}
        <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-canvas)', padding: '24px 0' }}>
          <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 32px' }}>
            {/* LinkedIn-like preview chrome */}
            <div className="card" style={{ padding: '18px 22px', boxShadow: 'var(--shadow-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12, paddingBottom: 12, borderBottom: '1px dashed var(--border-subtle)' }}>
                <ChannelMark id="linkedin" size={20} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>Neeraj Sharma</div>
                  <div style={{ fontSize: 10, color: 'var(--ink-tertiary)' }}>Founder, FullFunnel · scheduled preview</div>
                </div>
                <span style={{ flex: 1 }} />
                <span className="pill outline" style={{ fontSize: 10 }}>{wordCount}w · {charCount}/3000</span>
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                style={{
                  width: '100%', minHeight: 380, padding: 0,
                  border: 0, outline: 'none', resize: 'none',
                  fontFamily: 'inherit', fontSize: 14, lineHeight: 1.55,
                  background: 'transparent', color: 'var(--ink-primary)',
                }}
              />
            </div>

            {/* Suggestions strip */}
            <div style={{
              marginTop: 14, display: 'flex', gap: 8, alignItems: 'center',
              padding: '10px 14px', background: 'var(--accent-soft)', borderRadius: 6,
              fontSize: 11.5, color: 'var(--accent)',
            }}>
              <Icon name="info" size={14} />
              <span style={{ flex: 1 }}>
                <strong>Suggestion:</strong> paragraph 5 starts with "I" — third occurrence in 220 words. Cap is 1 per 200.
              </span>
              <button className="btn sm" style={{ background: 'var(--accent)', color: 'white', padding: '3px 8px' }}>
                Auto-fix
              </button>
              <button className="btn ghost sm icon" style={{ color: 'var(--accent)' }}>
                <Icon name="x" size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div style={{
          padding: '10px 22px', borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        }}>
          <button className="btn ghost sm" style={{ gap: 5 }}>
            <Icon name="refresh" size={12} />
            Regenerate body
          </button>
          <button className="btn ghost sm" style={{ gap: 5 }}>
            <Icon name="eye" size={12} />
            Preview channels
          </button>
          <span style={{ flex: 1 }} />
          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-tertiary)', marginRight: 8 }}>
            idem_key · drft_d39_v7
          </span>
          <button className="btn secondary sm" style={{ gap: 5 }}>
            <Icon name="send" size={12} />
            Send for approval
          </button>
          <button className="btn primary" style={{ gap: 6 }} onClick={() => goto('schedule')}>
            <Icon name="calendar" size={13} />
            Schedule
          </button>
        </div>
      </div>

      {/* Right: scoring spine */}
      <aside style={{
        width: 320, flexShrink: 0,
        borderLeft: '1px solid var(--border-subtle)',
        background: 'var(--bg-canvas)',
        padding: 14, overflowY: 'auto',
      }}>
        <ScoringSpine />
      </aside>
    </div>
  );
}

Object.assign(window, { Drafts });
