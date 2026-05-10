/* global React */
const { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } = React;

// ─── Routing context ───────────────────────────────────────
const RouterCtx = createContext({ route: 'home', goto: () => {}, params: {} });
const useRouter = () => useContext(RouterCtx);

function RouterProvider({ children }) {
  const [route, setRoute] = useState(() => {
    const saved = localStorage.getItem('cia.route');
    return saved || 'home';
  });
  const [params, setParams] = useState({});
  const goto = useCallback((r, p = {}) => {
    setRoute(r);
    setParams(p);
    localStorage.setItem('cia.route', r);
  }, []);
  return <RouterCtx.Provider value={{ route, goto, params }}>{children}</RouterCtx.Provider>;
}

// ─── Theme context ─────────────────────────────────────────
const ThemeCtx = createContext({ theme: 'light', setTheme: () => {} });
const useTheme = () => useContext(ThemeCtx);

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('cia.theme') || 'light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cia.theme', theme);
  }, [theme]);
  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>;
}

// ─── Icons (stroke-only, 16px grid) ────────────────────────
const Icon = ({ name, size = 16, className = '', style = {} }) => {
  const props = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round',
    strokeLinejoin: 'round', className, style: { flexShrink: 0, ...style }
  };
  const paths = {
    sparkle: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.5 5.5l2.5 2.5M16 16l2.5 2.5M5.5 18.5L8 16M16 8l2.5-2.5"/></>,
    home: <><path d="M3 11l9-8 9 8M5 10v10h14V10"/></>,
    edit: <><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></>,
    chart: <><path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 5-5"/></>,
    book: <><path d="M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4z"/><path d="M4 17a3 3 0 0 1 3-3h12"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    plug: <><path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0V8zM12 18v4"/></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    activity: <><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>,
    moon: <><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></>,
    chevDown: <path d="M6 9l6 6 6-6"/>,
    chevRight: <path d="M9 6l6 6-6 6"/>,
    chevLeft: <path d="M15 6l-9 6 9 6"/>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    check: <path d="M5 13l4 4L19 7"/>,
    x: <><path d="M18 6L6 18M6 6l18 18"/></>,
    arrowRight: <><path d="M5 12h14M13 5l7 7-7 7"/></>,
    refresh: <><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/></>,
    filter: <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>,
    bolt: <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>,
    flame: <><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></>,
    link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    send: <><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></>,
    clock: <><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>,
    flag: <><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22V15"/></>,
    moreH: <><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></>,
    moreV: <><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></>,
    layers: <><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></>,
    hash: <><path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18"/></>,
    global: <><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/></>,
    sidebar: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></>,
    play: <path d="M5 3l14 9-14 9V3z"/>,
    pause: <><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></>,
    star: <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>,
    drag: <><circle cx="9" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="15" cy="18" r="1.2"/></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></>,
    target: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
    info: <><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></>,
    alert: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></>,
  };
  return <svg {...props}>{paths[name] || null}</svg>;
};

// ─── Channel marks (LinkedIn / X / Beehiiv / Bluesky / Substack) ─────
const ChannelMark = ({ id, size = 14 }) => {
  const map = {
    linkedin: { bg: '#0A66C2', label: 'in', color: '#fff' },
    x: { bg: '#0A0A0A', label: '𝕏', color: '#fff' },
    beehiiv: { bg: '#FFC93C', label: 'b', color: '#0A0A0A' },
    bluesky: { bg: '#1185FE', label: 'B', color: '#fff' },
    substack: { bg: '#FF6719', label: 'S', color: '#fff' },
    facebook: { bg: '#1877F2', label: 'f', color: '#fff' },
    instagram: { bg: 'linear-gradient(135deg,#FEDA75,#FA7E1E 30%,#D62976 60%,#962FBF 90%)', label: 'IG', color: '#fff' },
    youtube: { bg: '#FF0000', label: '▶', color: '#fff' },
    hubspot: { bg: '#FF7A59', label: 'H', color: '#fff' },
    reddit: { bg: '#FF4500', label: 'r/', color: '#fff' },
    threads: { bg: '#0A0A0A', label: '@', color: '#fff' },
    tiktok: { bg: '#0A0A0A', label: 'tt', color: '#fff' },
    pinterest: { bg: '#E60023', label: 'P', color: '#fff' },
    medium: { bg: '#0A0A0A', label: 'M', color: '#fff' },
    mastodon: { bg: '#6364FF', label: 'M', color: '#fff' },
  };
  const c = map[id] || { bg: '#888', label: '?', color: '#fff' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size, height: size, borderRadius: 3, background: c.bg, color: c.color,
      fontSize: size * 0.6, fontWeight: 700, lineHeight: 1, fontFamily: 'Montserrat, sans-serif',
    }}>{c.label}</span>
  );
};

// ─── Score swatch (single dimension) ───────────────────────────
const ScoreSwatch = ({ value, max = 1, label, mono = true }) => {
  const pct = Math.round((value / max) * 100);
  const tone = pct >= 80 ? 'good' : pct >= 60 ? 'mid' : 'bad';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {label ? <div className="eyebrow" style={{ fontSize: 9 }}>{label}</div> : null}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div className={`meter ${tone}`} style={{ flex: 1, height: 3 }}>
          <div className="fill" style={{ width: `${pct}%` }} />
        </div>
        <span className={mono ? 'mono tabular' : 'tabular'} style={{ fontSize: 10.5, color: 'var(--ink-secondary)', minWidth: 28, textAlign: 'right' }}>
          {max === 1 ? value.toFixed(2) : value.toFixed(1)}
        </span>
      </div>
    </div>
  );
};

// ─── Sparkline ────────────────────────────────────────────────
const Sparkline = ({ data, width = 80, height = 22, color }) => {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (width - 2) + 1;
    const y = height - 1 - ((v - min) / range) * (height - 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const c = color || 'var(--accent)';
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={c} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={width - 1} cy={height - 1 - ((data[data.length - 1] - min) / range) * (height - 2)} r="2" fill={c} />
    </svg>
  );
};

// ─── Logo ─────────────────────────────────────────────────────
const FullFunnelLogo = ({ height = 18, color }) => (
  <svg height={height} viewBox="0 0 50 42" style={{ display: 'block', flexShrink: 0 }}>
    <path d="M49.38 5.81c0 2.78-2.27 5.05-5.06 5.05H5.94L2.97 5.81 0 .75h44.32c2.79 0 5.06 2.27 5.06 5.06z" fill={color || 'var(--accent)'}/>
    <path d="M22.06 38.26c1.25 2.11 2.56 2.87 4.46 2.91h.03c2.72-.07 4.93-2.33 4.93-5.05V36.09c-.01-2.76-2.27-5.02-5.05-5.02H17.8l2.97 5.02 1.29 2.18z" fill={color || 'var(--accent)'}/>
    <path d="M35.37 15.9H8.84l2.99 5.05 2.99 5.05h20.56c2.79 0 5.05-2.27 5.05-5.05 0-2.78-2.27-5.05-5.05-5.05z" fill={color || 'var(--accent)'}/>
    <path opacity=".71" d="M49.38 5.81H2.99L.01.75h44.32c2.79 0 5.07 2.27 5.07 5.06z" fill={color || 'var(--accent)'}/>
    <path opacity=".71" d="M40.44 20.97H11.84l-2.99-5.05h26.54c2.79 0 5.05 2.27 5.05 5.05z" fill={color || 'var(--accent)'}/>
    <g opacity=".71"><path d="M31.48 36.08c-.01-2.76-2.27-5.02-5.05-5.02H17.8l2.97 5.02h10.71z" fill={color || 'var(--accent)'}/></g>
  </svg>
);

// ─── Avatar ───────────────────────────────────────────────────
const Avatar = ({ name = '', size = 22, src }) => {
  const initials = name.split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase() || '?';
  const hue = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size, height: size, borderRadius: '50%',
      background: src ? 'transparent' : `oklch(0.75 0.06 ${hue})`,
      color: '#0A0A0A', fontSize: size * 0.42, fontWeight: 600, lineHeight: 1, flexShrink: 0,
      backgroundImage: src ? `url(${src})` : undefined, backgroundSize: 'cover',
    }}>{!src && initials}</span>
  );
};

// ─── Tooltip (minimal) ────────────────────────────────────────
const Tooltip = ({ children, label, side = 'top' }) => {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && label && (
        <span style={{
          position: 'absolute', [side]: '100%',
          left: '50%', transform: 'translateX(-50%)',
          marginBottom: side === 'top' ? 6 : 0, marginTop: side === 'bottom' ? 6 : 0,
          padding: '4px 7px', background: 'var(--ink-primary)', color: 'var(--ink-inverse)',
          fontSize: 10.5, borderRadius: 4, whiteSpace: 'nowrap', pointerEvents: 'none',
          zIndex: 100, boxShadow: 'var(--shadow-md)', fontWeight: 500,
        }}>{label}</span>
      )}
    </span>
  );
};

Object.assign(window, {
  Icon, ChannelMark, ScoreSwatch, Sparkline, FullFunnelLogo, Avatar, Tooltip,
  RouterCtx, useRouter, RouterProvider,
  ThemeCtx, useTheme, ThemeProvider,
});
