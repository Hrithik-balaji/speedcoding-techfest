import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function LeaderboardTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLB = async () => {
    try {
      const { data } = await api.get('/leaderboard');
      setRows(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchLB();
    const id = setInterval(fetchLB, 15000);
    return () => clearInterval(id);
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full text-muted">Loading leaderboard...</div>;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">Leaderboard</h1>
        <button onClick={fetchLB} className="btn-secondary text-xs py-1.5 px-3">Refresh</button>
      </div>

      <div className="panel overflow-hidden">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Name</th>
              <th>Roll No</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.rollNo}-${row.rank}`}>
                <td className="font-semibold">{row.rank}</td>
                <td>{row.name}</td>
                <td className="font-mono text-muted">{row.rollNo}</td>
                <td className="font-mono">{row.totalTimeFormatted}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={4} className="text-center text-muted py-6">No finishers yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
