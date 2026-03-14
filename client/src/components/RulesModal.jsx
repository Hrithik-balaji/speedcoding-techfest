// RulesModal.jsx
export function RulesModal({ onBegin }) {
  const rounds = [
    {
      num: '01', label: 'MCQ Round', time: '20 min',
      color: '#22c55e', bg: 'rgba(34,197,94,0.07)', border: 'rgba(34,197,94,0.2)',
      desc: 'Multiple choice questions with −0.25 negative marking. Auto-submits when time runs out.',
    },
    {
      num: '02', label: 'Debugging Round', time: '30 min',
      color: '#f59e0b', bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.2)',
      desc: 'Identify and fix bugs in pre-written code. +10 min penalty per wrong submission.',
    },
    {
      num: '03', label: 'Coding Round', time: '60 min',
      color: '#3b82f6', bg: 'rgba(59,130,246,0.07)', border: 'rgba(59,130,246,0.2)',
      desc: 'ICPC-style problems. Ranked by problems solved then total penalty time.',
    },
  ];

  const rules = [
    'Stay in fullscreen mode at all times',
    'No tab switching or window changes',
    'DevTools and right-click are disabled',
    'Page refresh is blocked during the exam',
    'Violations are logged and reported',
  ];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(5,9,26,0.93)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-xl rounded-2xl overflow-hidden"
        style={{ background: '#0f172a', border: '1px solid #1e2d45', boxShadow: '0 25px 80px rgba(0,0,0,0.6)' }}
      >
        {/* Header */}
        <div className="px-7 pt-7 pb-5" style={{ borderBottom: '1px solid #1e2d45' }}>
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}
            >
              <svg className="w-5 h-5" style={{ color: '#22c55e' }} fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <div className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: '#22c55e' }}>Speeding Coding</div>
              <div className="text-lg font-black" style={{ color: '#f1f5f9' }}>Contest Rules</div>
            </div>
          </div>
        </div>

        <div className="px-7 py-5 max-h-[65vh] overflow-y-auto">
          {/* Round cards */}
          <div className="flex flex-col gap-3 mb-5">
            {rounds.map(r => (
              <div key={r.num} className="rounded-xl p-4 flex items-start gap-4"
                style={{ background: r.bg, border: `1px solid ${r.border}` }}>
                <div
                  className="text-xl font-black shrink-0 w-10 text-center"
                  style={{ color: r.color }}
                >{r.num}</div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold" style={{ color: '#f1f5f9' }}>{r.label}</span>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: r.color + '20', color: r.color }}
                    >{r.time}</span>
                  </div>
                  <p className="text-[12px] leading-relaxed" style={{ color: '#64748b' }}>{r.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Proctoring rules */}
          <div className="rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)' }}>
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4" style={{ color: '#ef4444' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <span className="text-sm font-bold" style={{ color: '#ef4444' }}>Proctoring Active</span>
            </div>
            <ul className="flex flex-col gap-1.5">
              {rules.map(r => (
                <li key={r} className="flex items-center gap-2 text-[12px]" style={{ color: '#94a3b8' }}>
                  <span className="w-1 h-1 rounded-full shrink-0" style={{ background: '#ef4444' }} />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div className="px-7 pb-7 pt-4" style={{ borderTop: '1px solid #1e2d45' }}>
          <button
            onClick={onBegin}
            className="w-full py-3.5 rounded-xl font-bold text-[15px] transition-all active:scale-[0.98]"
            style={{ background: '#22c55e', color: '#0b1120', border: 'none', cursor: 'pointer' }}
            onMouseOver={e => e.currentTarget.style.background = '#16a34a'}
            onMouseOut={e => e.currentTarget.style.background = '#22c55e'}
          >
            Enter Fullscreen &amp; Begin Contest →
          </button>
          <p className="text-center text-[11px] mt-3" style={{ color: '#334155' }}>By beginning you agree to follow all contest rules</p>
        </div>
      </div>
    </div>
  );
}

// TerminatedOverlay.jsx
import { useState } from 'react';

export function TerminatedOverlay({ reason, time, rollNo, onReinstate }) {
  const [code, setCode]     = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      await onReinstate(rollNo, code);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid code. Contact invigilator.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[rgba(20,0,0,0.97)] z-[9998] flex flex-col items-center justify-center gap-5">
      <div className="text-6xl">🚫</div>
      <div className="text-3xl font-extrabold text-hard">Session Terminated</div>
      <div className="text-muted text-center max-w-md">Reason: {reason}</div>
      <div className="text-[#555] text-sm">{time}</div>

      <div className="panel p-6 w-full max-w-sm mt-2">
        <div className="text-sm text-center mb-4">Contact your invigilator for re-entry</div>
        <input
          className="input-field mb-3"
          type="password"
          placeholder="Enter invigilator code"
          value={code}
          onChange={e => setCode(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          autoFocus
        />
        {error && <div className="text-hard text-xs mb-2">{error}</div>}
        <button onClick={handleSubmit} className="btn-primary w-full" disabled={loading}>
          {loading ? 'Verifying...' : 'Verify & Re-enter'}
        </button>
      </div>
    </div>
  );
}

// PausedOverlay.jsx
export function PausedOverlay() {
  return (
    <div className="fixed inset-0 bg-black/92 z-[8888] flex flex-col items-center justify-center gap-4">
      <div className="text-5xl">⏸️</div>
      <div className="text-2xl font-bold text-accent">Exam Paused</div>
      <div className="text-muted">Please wait for the invigilator to resume the exam.</div>
    </div>
  );
}

export default RulesModal;
