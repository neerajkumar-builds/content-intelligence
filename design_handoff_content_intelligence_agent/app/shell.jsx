/* global React */
const { useState, useEffect, useRef, useMemo } = React;

// ─── Workspace + brand fixtures (real-feeling state) ─────────
const FIXTURES = {
  workspace: {
    id: 'ws_fullfunnel',
    name: 'FullFunnel LLC',
    plan: 'Creator',
    quota: { used: 47, limit: 200, period: 'month' },
  },
  brands: [
    { id: 'br_fullfunnel', name: 'FullFunnel.co', voice_score: 0.91, active: true },
    { id: 'br_acme', name: 'Acme Operations', voice_score: 0.87 },
    { id: 'br_hyperion', name: 'Hyperion', voice_score: 0.83 },
  ],
  user: { name: 'Neeraj Kumar', email: 'neeraj@fullfunnel.co' },
  connectors: [
    { id: 'linkedin', name: 'LinkedIn', status: 'healthy', last_sync: '4m ago' },
    { id: 'x', name: 'X (Twitter)', status: 'healthy', last_sync: '6m ago' },
    { id: 'beehiiv', name: 'Beehiiv', status: 'reconnect', last_sync: '2d ago' },
    { id: 'bluesky', name: 'Bluesky', status: 'healthy', last_sync: '11m ago' },
    { id: 'substack', name: 'Substack', status: 'paste', last_sync: '—' },
  ],
};

// ─── Sidebar nav definition ──────────────────────────────────
const NAV = [
  {
    group: 'Pinned',
    items: [
      { id: 'home',     label: 'Home',       icon: 'home' },
    ],
  },
  {
    group: 'Make',
    items: [
      { id: 'ideas',    label: 'Idea Wall',  icon: 'sparkle',  count: 23 },
      { id: 'draft',    label: 'Drafts',     icon: 'edit',     count: 4  },
      { id: 'schedule', label: 'Schedule',   icon: 'calendar', count: 12 },
    ],
  },
  {
    group: 'Learn',
    items: [
      { id: 'insights',    label: 'Insights',        icon: 'chart' },
      { id: 'competitors', label: 'Competitors',     icon: 'flag' },
      { id: 'leaders',     label: 'Thought leaders', icon: 'sparkle' },
    ],
  },
  {
    group: 'Govern',
    items: [
      { id: 'brand',      label: 'Brand brief',     icon: 'book'     },
      { id: 'rules',      label: 'Anti-AI rules',   icon: 'shield'   },
      { id: 'prompts',    label: 'Prompt studio',   icon: 'sparkle'  },
      { id: 'models',     label: 'Models',          icon: 'bolt'     },
      { id: 'connectors', label: 'Connectors',      icon: 'plug'     },
      { id: 'members',    label: 'Members',         icon: 'users'    },
      { id: 'api',        label: 'API & logs',      icon: 'activity' },
      { id: 'audit',      label: 'Audit log',       icon: 'shield' },
      { id: 'export',     label: 'Data export',     icon: 'download' },
      { id: 'settings',   label: 'Settings',        icon: 'settings' },
    ],
  },
];

// ─── Sidebar ─────────────────────────────────────────────────
function Sidebar({ mode, setMode }) {
  const { route, goto } = useRouter();
  const collapsed = mode === 'icon';
  const width = collapsed ? 60 : 232;

  return (
    <aside style={{
      width, flexShrink: 0,
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.18s ease',
      overflow: 'hidden',
    }}>
      {/* Brand lockup */}
      <div style={{
        padding: collapsed ? '12px 0' : '14px 14px 12px',
        display: 'flex', alignItems: 'center', gap: 10,
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <FullFunnelLogo height={collapsed ? 16 : 18} />
        {!collapsed && (
          <>
            <div style={{ width: 1, height: 14, background: 'var(--border-default)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--accent)' }}>CIA</span>
              <span style={{ fontSize: 8.5, color: 'var(--ink-tertiary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>v1.4 · build 218</span>
            </div>
          </>
        )}
      </div>

      {/* Brand switcher (active brand within current workspace) */}
      {!collapsed ? (
        <BrandSwitcher />
      ) : (
        <Tooltip label="FullFunnel.co · brand" side="bottom">
          <div style={{
            margin: '0 auto 8px', width: 32, height: 32, borderRadius: 6,
            background: 'var(--accent)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700,
          }}>FF</div>
        </Tooltip>
      )}

      {/* Nav groups */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
        {NAV.map(group => (
          <div key={group.group} style={{ marginBottom: 14 }}>
            {!collapsed && (
              <div className="eyebrow" style={{ padding: '4px 8px 4px', fontSize: 9 }}>
                {group.group}
              </div>
            )}
            {group.items.map(item => {
              const active = route === item.id;
              return collapsed ? (
                <Tooltip key={item.id} label={item.label} side="bottom">
                  <button
                    onClick={() => goto(item.id)}
                    style={{
                      width: 44, height: 36, margin: '1px auto', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      background: active ? 'var(--accent-soft)' : 'transparent',
                      color: active ? 'var(--accent)' : 'var(--ink-secondary)',
                      border: 0, borderRadius: 6, cursor: 'pointer', position: 'relative',
                    }}
                  >
                    <Icon name={item.icon} size={17} />
                    {item.count != null && (
                      <span style={{
                        position: 'absolute', top: 4, right: 6,
                        width: 5, height: 5, borderRadius: 50, background: 'var(--accent)',
                      }} />
                    )}
                  </button>
                </Tooltip>
              ) : (
                <button
                  key={item.id}
                  onClick={() => goto(item.id)}
                  style={{
                    width: '100%', padding: '6px 8px',
                    display: 'flex', alignItems: 'center', gap: 9,
                    background: active ? 'var(--accent-soft)' : 'transparent',
                    color: active ? 'var(--accent)' : 'var(--ink-secondary)',
                    border: 0, borderRadius: 6, cursor: 'pointer',
                    fontSize: 12.5, fontWeight: active ? 600 : 500,
                    textAlign: 'left', marginBottom: 1,
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  <Icon name={item.icon} size={15} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.count != null && (
                    <span className="mono tabular" style={{
                      fontSize: 10, color: active ? 'var(--accent)' : 'var(--ink-tertiary)',
                      background: active ? 'transparent' : 'var(--bg-muted)',
                      padding: '1px 5px', borderRadius: 3, fontWeight: 500,
                    }}>{item.count}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Quota meter + collapse */}
      <div style={{ padding: collapsed ? '8px 0' : '8px 12px 12px', borderTop: '1px solid var(--border-subtle)' }}>
        {!collapsed ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 4 }}>
              <span className="mono" style={{ color: 'var(--ink-tertiary)' }}>POSTS · MAY</span>
              <span className="mono tabular" style={{ color: 'var(--ink-secondary)' }}>
                {FIXTURES.workspace.quota.used}<span style={{ color: 'var(--ink-tertiary)' }}>/{FIXTURES.workspace.quota.limit}</span>
              </span>
            </div>
            <div className="meter">
              <div className="fill" style={{ width: `${(FIXTURES.workspace.quota.used / FIXTURES.workspace.quota.limit) * 100}%` }} />
            </div>
            <button
              onClick={() => setMode(mode === 'icon' ? 'labeled' : 'icon')}
              className="btn ghost sm"
              style={{ marginTop: 10, width: '100%', justifyContent: 'flex-start', gap: 8, fontSize: 10.5 }}
            >
              <Icon name="sidebar" size={13} />
              Collapse sidebar
            </button>
          </>
        ) : (
          <Tooltip label="Expand" side="top">
            <button
              onClick={() => setMode('labeled')}
              className="btn ghost sm icon"
              style={{ margin: '0 auto', display: 'flex' }}
            >
              <Icon name="chevRight" size={14} />
            </button>
          </Tooltip>
        )}
      </div>
    </aside>
  );
}

// ─── Top bar ─────────────────────────────────────────────────
function TopBar() {
  const { theme, setTheme } = useTheme();
  const { route } = useRouter();
  const titleMap = {
    home: 'Home',
    ideas: 'Idea Wall', draft: 'Drafts', schedule: 'Schedule',
    insights: 'Insights', competitors: 'Competitors', leaders: 'Thought leaders',
    brand: 'Brand brief', rules: 'Anti-AI rules', prompts: 'Prompt studio',
    models: 'Models', connectors: 'Connectors', members: 'Members',
    api: 'API & logs', audit: 'Audit log', export: 'Data export',
    settings: 'Settings', onboarding: 'Onboarding',
  };
  const apiMap = {
    home: 'GET /v1/briefing',
    ideas: 'GET /v1/ideas',
    draft: 'GET /v1/drafts/:id',
    schedule: 'GET /v1/schedule?range=week',
    insights: 'GET /v1/insights/overview',
    competitors: 'GET /v1/competitors',
    leaders: 'GET /v1/leaders',
    brand: 'GET /v1/brands/:id/brief',
    rules: 'GET /v1/rules',
    prompts: 'GET /v1/prompts',
    models: 'GET /v1/models',
    connectors: 'GET /v1/connectors',
    members: 'GET /v1/workspace/members',
    api: 'GET /v1/api/calls?range=24h',
    audit: 'GET /v1/audit?range=24h',
    export: 'GET /v1/exports',
    settings: 'GET /v1/workspace',
    onboarding: 'POST /v1/onboarding',
  };

  return (
    <header style={{
      height: 50, flexShrink: 0,
      borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--bg-surface)',
      display: 'flex', alignItems: 'center', padding: '0 16px', gap: 14,
    }}>
      {/* Breadcrumb / title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span style={{ fontSize: 11, color: 'var(--ink-tertiary)' }}>FullFunnel.co</span>
        <Icon name="chevRight" size={11} style={{ color: 'var(--ink-quaternary)' }} />
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.005em' }}>{titleMap[route] || route}</span>
        <span className="mono pill outline" style={{ fontSize: 9.5, padding: '1px 6px', marginLeft: 4 }}>
          {apiMap[route]}
        </span>
      </div>

      {/* Search */}
      <div style={{ flex: 1, maxWidth: 400, marginLeft: 'auto', position: 'relative' }}>
        <Icon name="search" size={13} style={{
          position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--ink-tertiary)',
        }} />
        <input
          className="input"
          placeholder="Search ideas, drafts, posts…"
          style={{ paddingLeft: 28, paddingRight: 50, height: 30, fontSize: 12 }}
        />
        <span className="mono" style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          fontSize: 9.5, padding: '2px 5px', background: 'var(--bg-muted)',
          borderRadius: 3, color: 'var(--ink-tertiary)',
        }}>⌘K</span>
      </div>

      {/* Right cluster */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Tooltip label={theme === 'light' ? 'Switch to dark' : 'Switch to light'} side="bottom">
          <button className="btn ghost icon" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
            <Icon name={theme === 'light' ? 'moon' : 'sun'} size={15} />
          </button>
        </Tooltip>
        <Tooltip label="Notifications · 2 new" side="bottom">
          <button className="btn ghost icon" style={{ position: 'relative' }}>
            <Icon name="bell" size={15} />
            <span style={{
              position: 'absolute', top: 6, right: 6,
              width: 6, height: 6, borderRadius: 50, background: 'var(--danger)',
            }} />
          </button>
        </Tooltip>
        <div style={{ width: 1, height: 18, background: 'var(--border-default)', margin: '0 4px' }} />
        <UserMenu />
      </div>
    </header>
  );
}

Object.assign(window, { FIXTURES, NAV, Sidebar, TopBar });

// ─── Brand switcher (active brand) ───────────────────────────
function BrandSwitcher() {
  const [open, setOpen] = useState(false);
  const active = FIXTURES.brands.find(b => b.active) || FIXTURES.brands[0];
  return (
    <div style={{ position: 'relative', margin: '0 10px 8px' }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', padding: '8px 10px',
        background: 'var(--bg-muted)', border: '1px solid var(--border-subtle)',
        borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8,
        color: 'inherit', textAlign: 'left', cursor: 'pointer',
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: 5, background: 'var(--accent)', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, flexShrink: 0,
        }}>FF</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{active.name}</div>
          <div style={{ fontSize: 9.5, color: 'var(--ink-tertiary)' }}>Brand · voice {active.voice_score}</div>
        </div>
        <Icon name="chevDown" size={12} style={{ color: 'var(--ink-tertiary)' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
          background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
          borderRadius: 6, padding: 6, zIndex: 50, boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
        }}>
          <div className="eyebrow" style={{ fontSize: 9, padding: '4px 8px' }}>BRANDS IN THIS WORKSPACE · 3</div>
          {FIXTURES.brands.map(b => (
            <button key={b.id} onClick={() => setOpen(false)} style={{
              width: '100%', padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 8,
              background: b.active ? 'var(--accent-soft)' : 'transparent', border: 0, borderRadius: 4,
              cursor: 'pointer', color: 'inherit', textAlign: 'left', fontSize: 12,
            }}>
              <div style={{ width: 18, height: 18, borderRadius: 4, background: 'var(--accent)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>
                {b.name.slice(0, 2).toUpperCase()}
              </div>
              <span style={{ flex: 1 }}>{b.name}</span>
              <span className="mono tabular" style={{ fontSize: 10, color: 'var(--ink-tertiary)' }}>{b.voice_score}</span>
            </button>
          ))}
          <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 4, paddingTop: 4 }}>
            <button className="btn ghost sm" style={{ width: '100%', justifyContent: 'flex-start', fontSize: 11.5 }}>
              <Icon name="plus" size={11} /> Add brand
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── User menu (workspace switcher lives here) ───────────────
function UserMenu() {
  const [open, setOpen] = useState(false);
  const { goto } = useRouter();
  const workspaces = [
    { id: 'ws_fullfunnel', name: 'FullFunnel LLC', plan: 'Creator', active: true },
    { id: 'ws_gtminds', name: 'GTMinds Pvt Ltd', plan: 'Creator' },
    { id: 'ws_personal', name: 'say2neeraj', plan: 'Starter' },
  ];
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 6px 4px 4px', border: 0, background: open ? 'var(--bg-muted)' : 'transparent',
        borderRadius: 6, cursor: 'pointer', color: 'inherit',
      }}>
        <Avatar name="Neeraj Kumar" size={26} />
        <Icon name="chevDown" size={11} style={{ color: 'var(--ink-tertiary)' }} />
      </button>
      {open && (
        <div onMouseLeave={() => setOpen(false)} style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 6, width: 280,
          background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
          borderRadius: 8, padding: 4, zIndex: 50, boxShadow: '0 12px 32px rgba(0,0,0,0.16)',
        }}>
          <div style={{ padding: '10px 10px 8px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
              <Avatar name="Neeraj Kumar" size={32} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>Neeraj Kumar</div>
                <div style={{ fontSize: 10.5, color: 'var(--ink-tertiary)' }}>neeraj@fullfunnel.co</div>
              </div>
            </div>
          </div>
          <div className="eyebrow" style={{ fontSize: 9, padding: '8px 10px 4px' }}>WORKSPACES · 3</div>
          {workspaces.map(w => (
            <button key={w.id} onClick={() => setOpen(false)} style={{
              width: '100%', padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 8,
              background: w.active ? 'var(--accent-soft)' : 'transparent', border: 0, borderRadius: 4,
              cursor: 'pointer', color: 'inherit', textAlign: 'left', fontSize: 12,
            }}>
              <div style={{ width: 22, height: 22, borderRadius: 5,
                background: w.active ? 'var(--accent)' : 'var(--bg-muted)',
                color: w.active ? 'white' : 'var(--ink-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                {w.name.split(' ').map(s => s[0]).join('').slice(0, 2)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: w.active ? 600 : 500 }}>{w.name}</div>
                <div style={{ fontSize: 10, color: 'var(--ink-tertiary)' }}>{w.plan}</div>
              </div>
              {w.active && <span className="pill good" style={{ fontSize: 9 }}>active</span>}
            </button>
          ))}
          <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 4, paddingTop: 4 }}>
            {[
              ['onboarding', 'Restart onboarding', 'sparkle'],
              ['settings', 'Workspace settings', 'settings'],
              ['export', 'Data export', 'download'],
              ['audit', 'Audit log', 'shield'],
            ].map(([id, label, icon]) => (
              <button key={id} onClick={() => { goto(id); setOpen(false); }} className="btn ghost sm"
                style={{ width: '100%', justifyContent: 'flex-start', fontSize: 11.5, padding: '6px 10px' }}>
                <Icon name={icon} size={12} /> {label}
              </button>
            ))}
            <button className="btn ghost sm" style={{ width: '100%', justifyContent: 'flex-start', fontSize: 11.5, padding: '6px 10px', color: 'var(--danger)' }}>
              <Icon name="signOut" size={12} /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { BrandSwitcher, UserMenu });
