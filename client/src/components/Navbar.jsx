import { useRef } from 'react';

const ROUND_TABS = [
  { id: 1, label: 'MCQ',       sub: 'Round 1' },
  { id: 2, label: 'Debugging', sub: 'Round 2' },
  { id: 3, label: 'Coding',    sub: 'Round 3' },
];

const NAV_BG     = '#0d1424';
const NAV_BORDER = '#1e2d45';

export default function Navbar({ currentRound, onSwitchRound, timeLeft, formatTime, studentName, onLogout }) {
  const logoClickCount = useRef(0);
  const logoTimer      = useRef(null);

  const handleLogoClick = () => {
    logoClickCount.current++;
    clearTimeout(logoTimer.current);
    logoTimer.current = setTimeout(() => { logoClickCount.current = 0; }, 800);
    if (logoClickCount.current >= 3) {
      logoClickCount.current = 0;
      window.open('/admin', '_blank');
    }
  };

  const isCritical = timeLeft !== null && timeLeft < 60000;
  const isLow      = timeLeft !== null && timeLeft < 300000;
  const timerColor = isCritical ? '#ef4444' : isLow ? '#f59e0b' : '#22c55e';
  const timerBg    = isCritical ? 'rgba(239,68,68,0.08)' : isLow ? 'rgba(245,158,11,0.08)' : 'rgba(34,197,94,0.06)';
  const timerBorder= isCritical ? 'rgba(239,68,68,0.35)' : isLow ? 'rgba(245,158,11,0.35)' : '#1e2d45';

  return (
    <nav
      className="h-14 flex items-center px-5 gap-3 flex-shrink-0 z-50"
      style={{ background: NAV_BG, borderBottom: `1px solid ${NAV_BORDER}` }}
    >
      {/* ── Logo ── */}
      <button
        onClick={handleLogoClick}
        className="flex items-center gap-2.5 shrink-0 group"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: '#22c55e', boxShadow: '0 0 14px rgba(34,197,94,0.35)' }}
        >
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <span
          className="font-black text-[13px] tracking-[0.14em] uppercase hidden sm:block"
          style={{ color: '#f1f5f9', letterSpacing: '0.14em' }}
        >
          Speeding Coding
        </span>
      </button>

      {/* ── Divider ── */}
      <div className="h-6 w-px shrink-0" style={{ background: NAV_BORDER }} />

      {/* ── Round Tabs ── */}
      <div className="flex-1 flex items-center justify-center gap-1">
        {ROUND_TABS.map(tab => {
          const active = currentRound === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSwitchRound(tab.id)}
              className="relative flex flex-col items-center px-5 py-2 rounded-lg transition-all"
              style={{
                background: active ? 'rgba(34,197,94,0.09)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <span
                className="text-[10px] font-semibold tracking-widest uppercase"
                style={{ color: active ? '#22c55e' : '#475569' }}
              >
                {tab.sub}
              </span>
              <span
                className="text-[13px] font-bold leading-tight mt-0.5"
                style={{ color: active ? '#f1f5f9' : '#64748b' }}
              >
                {tab.label}
              </span>
              {active && (
                <div
                  className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full"
                  style={{ background: '#22c55e' }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Right: Timer + User + Logout ── */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Timer */}
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono font-bold text-[15px]"
          style={{ background: timerBg, border: `1px solid ${timerBorder}`, color: timerColor }}
        >
          <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 6v6l3.5 2" />
          </svg>
          {formatTime(timeLeft)}
        </div>

        {/* Avatar + name */}
        <div className="hidden sm:flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: '#1e2d45', color: '#94a3b8', border: '1px solid #2a3d5c' }}
          >
            {(studentName || '?')[0].toUpperCase()}
          </div>
          <span className="text-sm max-w-[120px] truncate" style={{ color: '#94a3b8' }}>
            {studentName}
          </span>
        </div>

        {/* Logout */}
        <button
          onClick={() => {
            if (!window.confirm('Do you want to logout and leave the exam?')) return;
            if (typeof onLogout === 'function') onLogout();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{ background: 'transparent', border: `1px solid ${NAV_BORDER}`, color: '#64748b', cursor: 'pointer' }}
          onMouseOver={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
          onMouseOut={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = NAV_BORDER; }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Exit
        </button>
      </div>
    </nav>
  );
}
