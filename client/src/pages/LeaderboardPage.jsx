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
  const [updatedAt, setUpdatedAt] = useState(null);
  const [secondsAgo, setSecondsAgo] = useState(0);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const { data } = await api.get('/leaderboard');
      setRows(Array.isArray(data) ? data : []);
      setUpdatedAt(Date.now());
      setSecondsAgo(0);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
    const id = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(id);
  }, [fetchLeaderboard]);

  useEffect(() => {
    if (!updatedAt) return;
    const id = setInterval(() => {
      setSecondsAgo(Math.max(0, Math.floor((Date.now() - updatedAt) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [updatedAt]);

  const reachedRound = (status, round) => {
    if (status === 'Finished' || status === 'Round 3') return true;
    if (status === 'Round 2' && round <= 2) return true;
    if (status === 'Round 1' && round <= 1) return true;
    return false;
  };

  const showScore = (row, score, round) => {
    if (Number(score) > 0) return Number(score);
    return reachedRound(row.status, round) ? 0 : '--';
  };

  const medalOrRank = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  };

  const rowBg = (rank) => {
    if (rank === 1) return 'rgba(245, 158, 11, 0.12)';
    if (rank === 2) return 'rgba(148, 163, 184, 0.14)';
    if (rank === 3) return 'rgba(180, 83, 9, 0.12)';
    return 'transparent';
  };

  return (
    <div className="min-h-screen p-6" style={{ background: COLORS.bg, color: COLORS.text, fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-5xl mx-auto">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
          <div className="text-xs uppercase tracking-[0.18em] font-semibold mb-1" style={{ color: COLORS.accent }}>
            Live Rankings
          </div>
          <h1 className="text-2xl font-bold">Leaderboard</h1>
            <p className="text-sm mt-1" style={{ color: COLORS.muted }}>
              {rows.length} students ranked
            </p>
          </div>
          <button
            onClick={fetchLeaderboard}
            className="px-3 py-2 rounded-lg border text-sm font-semibold"
            style={{ borderColor: COLORS.border, background: '#0f172a', color: COLORS.text }}
          >
            Refresh
          </button>
        </div>

        <div className="rounded-2xl border overflow-hidden" style={{ background: COLORS.card, borderColor: COLORS.border }}>
          {loading ? (
            <div className="py-16 text-center" style={{ color: COLORS.muted }}>Loading leaderboard...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[820px]">
                <thead style={{ background: '#0f172a' }}>
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: '#cbd5e1' }}>Rank</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: '#cbd5e1' }}>Name</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: '#cbd5e1' }}>Roll No</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: '#cbd5e1' }}>R1</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: '#cbd5e1' }}>R2</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: '#cbd5e1' }}>R3</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: '#cbd5e1' }}>Total</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: '#cbd5e1' }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={`${r.rollNo}-${r.rank}`} className="border-t" style={{ borderColor: COLORS.border, background: rowBg(r.rank) }}>
                      <td className="px-4 py-3 font-semibold">{medalOrRank(r.rank)}</td>
                      <td className="px-4 py-3">{r.name}</td>
                      <td className="px-4 py-3" style={{ color: COLORS.muted }}>{r.rollNo}</td>
                      <td className="px-4 py-3">{showScore(r, r.r1Score, 1)}</td>
                      <td className="px-4 py-3">{showScore(r, r.r2Score, 2)}</td>
                      <td className="px-4 py-3">{showScore(r, r.r3Score, 3)}</td>
                      <td className="px-4 py-3 font-bold">{Number(r.totalScore || 0)}</td>
                      <td className="px-4 py-3 font-mono">{r.totalTime || '--'}</td>
                    </tr>
                  ))}
                  {!rows.length && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center" style={{ color: COLORS.muted }}>
                        No results yet. Rankings will appear here once students complete rounds.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-3 text-sm" style={{ color: COLORS.muted }}>
          Last updated {secondsAgo}s ago
        </div>
      </div>
    </div>
  );
}
