import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';

const REASON_LABELS = {
  tab_switch: 'Tab switch or window blur detected',
  escape_key: 'Escape key press detected',
  right_click: 'Right click attempt detected',
  copy_paste: 'Copy or paste attempt detected',
  devtools_attempt: 'Developer tools shortcut attempt detected',
  navigation_attempt: 'Browser navigation attempt detected',
  fullscreen_exit: 'Fullscreen exit detected',
};

export default function TerminatedOverlay({ reason, violationCount }) {
  const { refreshStudent } = useAuth();
  const humanReason = REASON_LABELS[reason] || String(reason || 'Policy violation detected');

  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const { data } = await api.get('/students/me');
        const freshStudent = data?.student;
        if (freshStudent && !freshStudent.terminated) {
          await refreshStudent?.();
          clearInterval(poll);
        }
      } catch {
        // Keep polling quietly; auth interceptor handles invalid sessions.
      }
    }, 10000);

    return () => clearInterval(poll);
  }, [refreshStudent]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-6" style={{ background: 'rgba(10, 0, 0, 0.96)' }}>
      <div className="w-full max-w-xl rounded-2xl border p-8 text-center" style={{ background: '#1a0808', borderColor: 'rgba(127,29,29,0.6)' }}>
        <div className="text-5xl mb-4">🚫</div>
        <h1 className="text-3xl font-extrabold mb-2" style={{ color: '#f87171' }}>
          You have been removed from the exam
        </h1>
        <p className="text-sm mb-4" style={{ color: '#fca5a5' }}>
          Reason: {humanReason}
        </p>
        <p className="text-sm mb-2" style={{ color: '#94a3b8' }}>
          Total recorded violations: {Number(violationCount || 0)}
        </p>
        <p className="text-sm" style={{ color: '#cbd5e1' }}>
          Please contact the invigilator for further instructions.
        </p>
      </div>
    </div>
  );
}
