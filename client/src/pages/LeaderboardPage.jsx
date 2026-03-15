import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const COLORS = {
  bg: '#0B1120',
  card: '#111827',
  border: '#1f2937',
  muted: '#94a3b8',
  text: '#e2e8f0',
  accent: '#22C55E',
};

export default function LeaderboardPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const { data } = await api.get('/leaderboard');
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
    const id = setInterval(fetchLeaderboard, 10000);
    return () => clearInterval(id);
  }, [fetchLeaderboard]);

  return (
    <div className="min-h-screen p-6" style={{ background: COLORS.bg, color: COLORS.text, fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-5xl mx-auto">
        <div className="mb-5">
          <div className="text-xs uppercase tracking-[0.18em] font-semibold mb-1" style={{ color: COLORS.accent }}>
            Live Rankings
          </div>
          <h1 className="text-2xl font-bold">Leaderboard</h1>
        </div>

        <div className="rounded-2xl border overflow-hidden" style={{ background: COLORS.card, borderColor: COLORS.border }}>
          {loading ? (
            <div className="py-16 text-center" style={{ color: COLORS.muted }}>Loading leaderboard...</div>
          ) : (
            <table className="w-full text-sm">
              <thead style={{ background: '#0f172a' }}>
                <tr>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: '#cbd5e1' }}>Rank</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: '#cbd5e1' }}>Name</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: '#cbd5e1' }}>Roll No</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: '#cbd5e1' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.rollNo}-${r.rank}`} className="border-t" style={{ borderColor: COLORS.border }}>
                    <td className="px-4 py-3 font-semibold">{r.rank}</td>
                    <td className="px-4 py-3">{r.name}</td>
                    <td className="px-4 py-3" style={{ color: COLORS.muted }}>{r.rollNo}</td>
                    <td className="px-4 py-3 font-mono">{r.totalTimeFormatted}</td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center" style={{ color: COLORS.muted }}>
                      No finishers yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
