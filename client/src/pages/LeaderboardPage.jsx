import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function LeaderboardPage() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchLB = async () => {
    try {
      const { data } = await api.get('/leaderboard');
      setData(data);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchLB();
    const id = setInterval(fetchLB, 10000);
    return () => clearInterval(id);
  }, []);

  if (loading) return (
    <div className="fixed inset-0 bg-bg flex items-center justify-center text-muted text-lg">
      Loading...
    </div>
  );

  const { leaderboard = [], codingProblems = [] } = data || {};

  return (
    <div className="min-h-screen bg-bg p-8 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="text-3xl font-extrabold text-accent">⚡ Speeding Coding — Live Leaderboard</div>
        <div className="text-sm text-muted">Updated: {lastUpdate} · Auto-refreshes every 10s</div>
      </div>

      <div className="panel overflow-hidden">
        <table className="admin-table w-full">
          <thead>
            <tr>
              <th className="text-center w-16 text-base">#</th>
              <th className="text-base">Student</th>
              <th className="text-base">R1 Score</th>
              <th className="text-center text-base">R2 Score</th>
              <th className="text-center text-base">R3 Score</th>
              {codingProblems.map(p => (
                <th key={p._id} className="text-center" title={p.title}>
                  <span className={`diff-pill diff-${p.difficulty?.toLowerCase()}`}>
                    {p.title.substring(0, 8)}
                  </span>
                </th>
              ))}
              <th className="text-base">R3 Penalty</th>
              <th className="text-base">Status</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((row, i) => {
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
              const statusColor =
                row.status === 'Active' ? 'bg-easy/15 text-easy' :
                row.status === 'Warned' ? 'bg-accent/15 text-accent' :
                'bg-hard/15 text-hard';
              return (
                <tr key={row._id} className="hover:bg-border/20">
                  <td className="text-center text-xl font-bold">
                    {medal || <span className="text-muted">{row.rank}</span>}
                  </td>
                  <td>
                    <div className="font-semibold text-base">{row.name}</div>
                    <div className="text-xs text-muted font-mono">{row.rollNo}</div>
                  </td>
                  <td className="text-accent font-bold text-base">{row.r1Score?.toFixed(2)}</td>
                  <td className="text-center font-bold text-base">{row.r2Score}</td>
                  <td className="text-center font-bold text-base">{row.r3Score}</td>
                  {codingProblems.map(p => {
                    const s = row.codingStatus?.[p._id];
                    return (
                      <td key={p._id} className="text-center">
                        {s === 'solved'    && <span className="w-3.5 h-3.5 rounded-full bg-easy inline-block" />}
                        {s === 'attempted' && <span className="w-3.5 h-3.5 rounded-full bg-hard inline-block" />}
                        {s === 'unsolved'  && <span className="w-3.5 h-3.5 rounded-full bg-border inline-block" />}
                      </td>
                    );
                  })}
                  <td className="font-mono text-muted">{row.r3Penalty}m</td>
                  <td>
                    <span className={`verdict-badge ${statusColor} text-xs`}>{row.status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4 mt-4 text-xs text-muted">
        <span><span className="w-2.5 h-2.5 rounded-full bg-easy inline-block mr-1" /> Solved</span>
        <span><span className="w-2.5 h-2.5 rounded-full bg-hard inline-block mr-1" /> Attempted</span>
        <span><span className="w-2.5 h-2.5 rounded-full bg-border inline-block mr-1" /> Unsolved</span>
      </div>
    </div>
  );
}
