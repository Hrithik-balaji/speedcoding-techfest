import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function LeaderboardTab() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchLB = async () => {
    try {
      const { data } = await api.get('/leaderboard');
      setData(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchLB();
    const id = setInterval(fetchLB, 15000);
    return () => clearInterval(id);
  }, []);

  const openProjector = () => {
    window.open('/leaderboard', '_blank', 'width=1280,height=800');
  };

  if (loading) return <div className="flex items-center justify-center h-full text-muted">Loading leaderboard...</div>;
  if (!data)   return <div className="flex items-center justify-center h-full text-muted">Failed to load.</div>;

  const { leaderboard, codingProblems } = data;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">🏆 Leaderboard</h1>
        <div className="flex gap-2">
          <button onClick={fetchLB} className="btn-secondary text-xs py-1.5 px-3">↻ Refresh</button>
          <button onClick={openProjector} className="btn-secondary text-xs py-1.5 px-3">📺 Projector</button>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <table className="admin-table">
          <thead>
            <tr>
              <th className="w-12">#</th>
              <th>Student</th>
              <th>R1 Score</th>
              <th>R2</th>
              {codingProblems.map(p => (
                <th key={p._id} className="text-center max-w-[70px]" title={p.title}>
                  <span className={`diff-pill diff-${p.difficulty?.toLowerCase()} text-[10px]`}>
                    {p.title.substring(0, 5)}
                  </span>
                </th>
              ))}
              <th>R3 Solved</th>
              <th>Penalty</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((row, i) => {
              const statusColor =
                row.status === 'Active' ? 'bg-easy/15 text-easy' :
                row.status === 'Warned' ? 'bg-accent/15 text-accent' :
                'bg-hard/15 text-hard';
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
              return (
                <tr key={row._id}>
                  <td className="text-center font-bold text-muted">
                    {medal || row.rank}
                  </td>
                  <td>
                    <div className="font-medium">{row.name}</div>
                    <div className="text-xs text-muted font-mono">{row.rollNo}</div>
                  </td>
                  <td className="text-accent font-semibold">{row.r1Score?.toFixed(2)}</td>
                  <td className="text-center text-muted text-sm">{row.r2Solved}/{row.r2Total}</td>
                  {codingProblems.map(p => {
                    const s = row.codingStatus?.[p._id];
                    return (
                      <td key={p._id} className="text-center">
                        {s === 'solved'    && <span className="w-2.5 h-2.5 rounded-full bg-easy inline-block" />}
                        {s === 'attempted' && <span className="w-2.5 h-2.5 rounded-full bg-hard inline-block" />}
                        {s === 'unsolved'  && <span className="w-2.5 h-2.5 rounded-full bg-border inline-block" />}
                      </td>
                    );
                  })}
                  <td className="text-center font-semibold">{row.r3Solved}/{row.r3Total}</td>
                  <td className="font-mono text-muted text-sm">{row.r3Penalty}m</td>
                  <td>
                    <span className={`verdict-badge ${statusColor} text-xs`}>{row.status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
