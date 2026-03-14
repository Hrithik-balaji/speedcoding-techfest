import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';
import toast from 'react-hot-toast';

const COLORS = {
  bg: '#0B1120',
  card: '#111827',
  accent: '#22C55E',
  danger: '#EF4444',
  border: '#1f2937',
  muted: '#94a3b8',
  text: '#e2e8f0',
};

const MENU = [
  { key: 'students', label: 'Students', icon: 'users' },
  { key: 'violations', label: 'Violations', icon: 'warning' },
  { key: 'override', label: 'Score Override', icon: 'edit' },
  { key: 'bank', label: 'Question Bank', icon: 'book' },
  { key: 'leaderboard', label: 'Leaderboard', icon: 'trophy' },
  { key: 'settings', label: 'Contest Settings', icon: 'settings' },
];

function Icon({ name, className = 'w-4 h-4' }) {
  const common = { className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, viewBox: '0 0 24 24' };
  if (name === 'users') return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path strokeLinecap="round" strokeLinejoin="round" d="M23 20v-2a4 4 0 00-3-3.87" /><path strokeLinecap="round" strokeLinejoin="round" d="M16 3.13a4 4 0 010 7.75" /></svg>;
  if (name === 'warning') return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3l-8.47-14.14a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
  if (name === 'edit') return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5a2.12 2.12 0 113 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>;
  if (name === 'book') return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path strokeLinecap="round" strokeLinejoin="round" d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>;
  if (name === 'trophy') return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M8 21h8" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 17v4" /><path strokeLinecap="round" strokeLinejoin="round" d="M7 4h10v4a5 5 0 01-10 0V4z" /><path strokeLinecap="round" strokeLinejoin="round" d="M5 6H3a2 2 0 000 4h2" /><path strokeLinecap="round" strokeLinejoin="round" d="M19 6h2a2 2 0 010 4h-2" /></svg>;
  if (name === 'settings') return <svg {...common}><circle cx="12" cy="12" r="3" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 7a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 008.91 3h.09a1.65 1.65 0 001.51-1V2a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 7c.08.51.52.89 1.03.89H21a2 2 0 012 2 2 2 0 01-2 2h-.09c-.51 0-.95.38-1.03.89z" /></svg>;
  if (name === 'refresh') return <svg {...common}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0114.13-3.36L23 10M1 14l5.36 4.36A9 9 0 0020.49 15" /></svg>;
  if (name === 'logout') return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>;
  if (name === 'play') return <svg {...common}><polygon points="5 3 19 12 5 21 5 3" /></svg>;
  if (name === 'pause') return <svg {...common}><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>;
  if (name === 'stop') return <svg {...common}><rect x="5" y="5" width="14" height="14" /></svg>;
  if (name === 'reset') return <svg {...common}><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 101.36-9.36L1 10" /></svg>;
  if (name === 'eye') return <svg {...common}><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" /></svg>;
  if (name === 'warn') return <svg {...common}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3l-8.47-14.14a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
  if (name === 'kick') return <svg {...common}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="10" /></svg>;
}

function LoginGate({ onLogin, loading }) {
  const [password, setPassword] = useState('');
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: COLORS.bg }}>
      <form
        className="w-full max-w-md rounded-2xl p-8 shadow-xl border"
        style={{ background: COLORS.card, borderColor: COLORS.border }}
        onSubmit={onLogin(password)}
      >
        <div className="text-xs uppercase tracking-[0.18em] font-semibold" style={{ color: COLORS.accent }}>Admin Access</div>
        <h1 className="text-2xl font-bold mt-2" style={{ color: COLORS.text }}>Speeding Coding Control Room</h1>
        <p className="text-sm mt-2" style={{ color: COLORS.muted }}>Enter admin password to monitor live contest activity.</p>
        <input
          type="password"
          className="w-full mt-6 rounded-xl px-4 py-3 outline-none border"
          style={{ background: '#0f172a', borderColor: COLORS.border, color: COLORS.text }}
          placeholder="Admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-4 rounded-xl py-3 font-semibold transition-all"
          style={{ background: COLORS.accent, color: '#052e16' }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}

function getStatusColor(status) {
  if (status === 'Kicked') return 'bg-red-500/15 text-red-300 border-red-500/30';
  if (status === 'Warned') return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
}

function formatAgo(ts) {
  if (!ts) return 'Never';
  const diff = Math.max(0, Date.now() - new Date(ts).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

function contestStateLabel(state) {
  const now = Date.now();
  const allEnded = state?.forceEnded?.r1 && state?.forceEnded?.r2 && state?.forceEnded?.r3;
  const anyLive = [state?.roundEndTimes?.r1, state?.roundEndTimes?.r2, state?.roundEndTimes?.r3]
    .some((t) => typeof t === 'number' && t > now);

  if (allEnded) return { text: 'Contest Ended', className: 'bg-red-500/15 text-red-300 border-red-500/30' };
  if (anyLive) return { text: 'Contest Live', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
  return { text: 'Waiting to Start', className: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
}

export default function AdminPage() {
  const navigate = useNavigate();
  const { isAdmin, adminLogin, adminLogout, setLoading } = useAuth();

  const [students, setStudents] = useState([]);
  const [violations, setViolations] = useState([]);
  const [events, setEvents] = useState([]);
  const [contestState, setContestState] = useState(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [activeMenu, setActiveMenu] = useState('students');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [busy, setBusy] = useState(false);

  const fetchContestState = useCallback(async () => {
    const { data } = await api.get('/admin/state');
    setContestState(data);
    return data;
  }, []);

  const fetchStudents = useCallback(async () => {
    const { data } = await api.get('/admin/students');
    setStudents(data);
    return data;
  }, []);

  const fetchViolations = useCallback(async () => {
    const { data } = await api.get('/admin/violations');
    setViolations(data);
    return data;
  }, []);

  const fetchEvents = useCallback(async () => {
    const [vio, subs] = await Promise.all([
      api.get('/admin/violations'),
      api.get('/submissions/admin/all'),
    ]);

    const vEvents = (vio.data || []).slice(0, 50).map((v) => ({
      id: `v-${v.rollNo}-${v.timestamp}`,
      time: new Date(v.timestamp).getTime(),
      text: `${v.name} ${v.type.toLowerCase()}`,
      kind: 'violation',
    }));

    const sEvents = (subs.data || []).slice(0, 50).map((s) => ({
      id: `s-${s._id}`,
      time: new Date(s.createdAt).getTime(),
      text: `${s.rollNo} submitted ${s.verdict.toLowerCase()} for round ${s.round}`,
      kind: s.verdict === 'Accepted' ? 'ok' : 'submit',
    }));

    const merged = [...vEvents, ...sEvents]
      .sort((a, b) => b.time - a.time)
      .slice(0, 16);

    setEvents(merged);
  }, []);

  const refreshAll = useCallback(async () => {
    setBusy(true);
    try {
      await Promise.all([fetchStudents(), fetchViolations(), fetchContestState(), fetchEvents()]);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to refresh dashboard');
    } finally {
      setBusy(false);
    }
  }, [fetchContestState, fetchEvents, fetchStudents, fetchViolations]);

  useEffect(() => {
    if (!isAdmin) return;
    refreshAll();
    const id = setInterval(() => {
      fetchEvents().catch(() => {});
      fetchStudents().catch(() => {});
    }, 8000);
    return () => clearInterval(id);
  }, [isAdmin, refreshAll, fetchEvents, fetchStudents]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students
      .filter((s) => {
        if (!q) return true;
        return s.name.toLowerCase().includes(q) || s.rollNo.toLowerCase().includes(q);
      })
      .filter((s) => {
        if (filter === 'warned') return s.status === 'Warned';
        if (filter === 'kicked') return s.status === 'Kicked';
        if (filter === 'v3') return (s.violations?.length || 0) > 3;
        return true;
      });
  }, [students, search, filter]);

  const summary = useMemo(() => {
    const total = students.length;
    const active = students.filter((s) => {
      const seenMs = Date.now() - new Date(s.lastSeen).getTime();
      return s.status !== 'Kicked' && seenMs <= 2 * 60 * 1000;
    }).length;
    const totalV = students.reduce((acc, s) => acc + (s.violations?.length || 0), 0);
    const avg = total
      ? (students.reduce((acc, s) => acc + (Number(s.r1?.score || 0) + Number(s.r2?.score || 0) + Number(s.r3?.score || 0)), 0) / total)
      : 0;
    return { total, active, totalV, avg: avg.toFixed(2) };
  }, [students]);

  const onAdminLogin = (password) => async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminLogin(password);
      toast.success('Admin logged in');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const act = async (fn, msg) => {
    try {
      await fn();
      toast.success(msg);
      await refreshAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed');
    }
  };

  const warnStudent = (id) => act(() => api.patch(`/admin/students/${id}/warn`), 'Student warned');
  const kickStudent = (id) => act(() => api.patch(`/admin/students/${id}/kick`), 'Student kicked');
  const reinstateStudent = (id) => act(() => api.patch(`/admin/students/${id}/reinstate`, { reason: 'Manual reinstatement' }), 'Student reinstated');

  const startContest = () => act(async () => {
    await Promise.all([
      api.post('/timer/start-round', { round: 1 }),
      api.post('/timer/start-round', { round: 2 }),
      api.post('/timer/start-round', { round: 3 }),
    ]);
  }, 'Contest started');

  const pauseContest = () => act(() => api.patch('/timer/pause'), contestState?.paused ? 'Contest resumed' : 'Contest paused');
  const endContest = () => act(async () => {
    await Promise.all([
      api.post('/timer/force-end', { round: 1 }),
      api.post('/timer/force-end', { round: 2 }),
      api.post('/timer/force-end', { round: 3 }),
    ]);
  }, 'Contest ended');
  const resetContest = () => act(() => api.post('/timer/reset'), 'Contest reset to waiting state');

  if (!isAdmin) {
    return <LoginGate onLogin={onAdminLogin} loading={busy} />;
  }

  const stateBadge = contestStateLabel(contestState);

  return (
    <div className="min-h-screen flex" style={{ background: COLORS.bg, color: COLORS.text, fontFamily: "'Inter', sans-serif" }}>
      <aside className="w-64 shrink-0 p-4 border-r flex flex-col" style={{ background: '#0f172a', borderColor: COLORS.border }}>
        <div className="rounded-xl p-4 border" style={{ background: COLORS.card, borderColor: COLORS.border }}>
          <div className="text-xs uppercase tracking-[0.18em]" style={{ color: COLORS.accent }}>Control Center</div>
          <h1 className="text-lg font-bold mt-2">Speeding Coding Admin</h1>
        </div>

        <nav className="mt-4 space-y-1">
          {MENU.map((item) => {
            const active = item.key === activeMenu;
            return (
              <button
                key={item.key}
                onClick={() => {
                  setActiveMenu(item.key);
                  if (item.key === 'leaderboard') navigate('/leaderboard');
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm transition-all"
                style={{
                  background: active ? 'rgba(34,197,94,0.12)' : 'transparent',
                  borderColor: active ? 'rgba(34,197,94,0.35)' : 'transparent',
                  color: active ? '#bbf7d0' : '#cbd5e1',
                }}
              >
                <Icon name={item.icon} className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto">
          <button
            onClick={() => { adminLogout(); toast.success('Logged out'); }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all hover:bg-red-500/10"
            style={{ borderColor: '#7f1d1d', color: '#fecaca' }}
          >
            <Icon name="logout" className="w-4 h-4" />
            Logout Admin
          </button>
        </div>
      </aside>

      <main className="flex-1 p-5 md:p-6 overflow-y-auto">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div>
            <h2 className="text-2xl font-bold">Students ({filteredStudents.length})</h2>
            <p className="text-sm" style={{ color: COLORS.muted }}>Live monitoring and contest controls</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className={`px-3 py-1.5 rounded-full border text-xs font-semibold ${stateBadge.className}`}>
              {stateBadge.text}
            </span>
            <button
              onClick={refreshAll}
              disabled={busy}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm hover:border-green-500/50"
              style={{ borderColor: COLORS.border, background: COLORS.card }}
            >
              <Icon name="refresh" className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
          {[
            { icon: 'users', label: 'Total Students', value: summary.total },
            { icon: 'play', label: 'Active Students', value: summary.active },
            { icon: 'warning', label: 'Total Violations', value: summary.totalV },
            { icon: 'trophy', label: 'Average Score', value: summary.avg },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-2xl border p-4 shadow-lg transition-transform hover:-translate-y-0.5"
              style={{ background: COLORS.card, borderColor: COLORS.border }}
            >
              <div className="inline-flex p-2 rounded-lg" style={{ background: 'rgba(34,197,94,0.12)', color: COLORS.accent }}>
                <Icon name={c.icon} className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold mt-3">{c.value}</div>
              <div className="text-sm mt-1" style={{ color: COLORS.muted }}>{c.label}</div>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
          <div className="xl:col-span-2 rounded-2xl border p-4" style={{ background: COLORS.card, borderColor: COLORS.border }}>
            <div className="flex flex-wrap gap-3 mb-4">
              <input
                className="flex-1 min-w-[220px] rounded-xl px-3 py-2.5 border outline-none"
                style={{ background: '#0f172a', borderColor: COLORS.border, color: COLORS.text }}
                placeholder="Search by name or roll number"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {[
                ['all', 'All Students'],
                ['warned', 'Warned'],
                ['kicked', 'Kicked'],
                ['v3', 'Violations > 3'],
              ].map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className="px-3 py-2 rounded-lg border text-xs font-semibold"
                  style={{
                    background: filter === k ? 'rgba(34,197,94,0.16)' : 'transparent',
                    borderColor: filter === k ? 'rgba(34,197,94,0.45)' : COLORS.border,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="overflow-auto rounded-xl border" style={{ borderColor: COLORS.border }}>
              <table className="w-full text-sm min-w-[1100px]">
                <thead style={{ background: '#0f172a' }}>
                  <tr>
                    {['Name', 'Roll Number', 'Profile', 'R1 Score', 'R2 Solved', 'R3 Solved', 'Violations', 'Last Seen', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-3 py-3 font-semibold" style={{ color: '#cbd5e1' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s) => (
                    <tr key={s._id} className="border-t hover:bg-slate-800/35" style={{ borderColor: COLORS.border }}>
                      <td className="px-3 py-3 font-medium">{s.name}</td>
                      <td className="px-3 py-3 text-slate-300">{s.rollNo}</td>
                      <td className="px-3 py-3 text-xs text-slate-400">{[s.college, s.department].filter(Boolean).join(' • ') || 'N/A'}</td>
                      <td className="px-3 py-3"><span className="px-2 py-1 rounded-md bg-amber-500/20 text-amber-300">{Number(s.r1?.score || 0).toFixed(2)}</span></td>
                      <td className="px-3 py-3"><span className="px-2 py-1 rounded-md bg-blue-500/20 text-blue-300">{s.r2?.solved?.length || 0}</span></td>
                      <td className="px-3 py-3"><span className="px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-300">{s.r3?.solved?.length || 0}</span></td>
                      <td className="px-3 py-3"><span className="px-2 py-1 rounded-md bg-red-500/20 text-red-300">{s.violations?.length || 0}</span></td>
                      <td className="px-3 py-3 text-slate-400">{formatAgo(s.lastSeen)}</td>
                      <td className="px-3 py-3"><span className={`px-2 py-1 rounded-full border text-xs ${getStatusColor(s.status)}`}>{s.status}</span></td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <button className="px-2 py-1 rounded border text-xs hover:bg-slate-700/40" style={{ borderColor: COLORS.border }} onClick={() => setSelectedProfile(s)}><span className="inline-flex items-center gap-1"><Icon name="eye" className="w-3 h-3" />View</span></button>
                          <button className="px-2 py-1 rounded border text-xs hover:bg-amber-500/15" style={{ borderColor: 'rgba(245,158,11,0.35)', color: '#fbbf24' }} onClick={() => warnStudent(s._id)}><span className="inline-flex items-center gap-1"><Icon name="warn" className="w-3 h-3" />Warn</span></button>
                          <button className="px-2 py-1 rounded border text-xs hover:bg-red-500/15" style={{ borderColor: 'rgba(239,68,68,0.35)', color: '#fca5a5' }} onClick={() => kickStudent(s._id)}><span className="inline-flex items-center gap-1"><Icon name="kick" className="w-3 h-3" />Kick</span></button>
                          <button className="px-2 py-1 rounded border text-xs hover:bg-emerald-500/15" style={{ borderColor: 'rgba(34,197,94,0.35)', color: '#86efac' }} onClick={() => reinstateStudent(s._id)}>Reinstate</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredStudents.length && (
                    <tr>
                      <td colSpan={10} className="px-3 py-8 text-center text-slate-400">No students match current filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border p-4" style={{ background: COLORS.card, borderColor: COLORS.border }}>
            <h3 className="text-sm font-semibold mb-3">Live Activity</h3>
            <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
              {events.map((e) => (
                <div key={e.id} className="rounded-lg border px-3 py-2 text-xs" style={{ background: '#0f172a', borderColor: COLORS.border }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${e.kind === 'ok' ? 'bg-emerald-400' : e.kind === 'violation' ? 'bg-red-400' : 'bg-blue-400'}`} />
                    <span style={{ color: '#cbd5e1' }}>{e.text}</span>
                  </div>
                  <div style={{ color: COLORS.muted }}>{formatAgo(e.time)}</div>
                </div>
              ))}
              {!events.length && <div className="text-xs" style={{ color: COLORS.muted }}>No recent activity yet.</div>}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border p-4" style={{ background: COLORS.card, borderColor: COLORS.border }}>
          <h3 className="text-sm font-semibold mb-3">Contest Controls</h3>
          <div className="flex flex-wrap gap-2">
            <button onClick={startContest} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold" style={{ background: 'rgba(34,197,94,0.16)', color: '#bbf7d0', border: '1px solid rgba(34,197,94,0.35)' }}><Icon name="play" className="w-4 h-4" />Start Contest</button>
            <button onClick={pauseContest} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold" style={{ background: 'rgba(245,158,11,0.16)', color: '#fde68a', border: '1px solid rgba(245,158,11,0.35)' }}><Icon name="pause" className="w-4 h-4" />Pause Contest</button>
            <button onClick={endContest} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold" style={{ background: 'rgba(239,68,68,0.16)', color: '#fecaca', border: '1px solid rgba(239,68,68,0.35)' }}><Icon name="stop" className="w-4 h-4" />End Contest</button>
            <button onClick={resetContest} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold" style={{ background: '#0f172a', color: '#cbd5e1', border: `1px solid ${COLORS.border}` }}><Icon name="reset" className="w-4 h-4" />Reset Contest</button>
          </div>
        </section>
      </main>

      {selectedProfile && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4" onClick={() => setSelectedProfile(null)}>
          <div className="w-full max-w-lg rounded-2xl border p-5" style={{ background: COLORS.card, borderColor: COLORS.border }} onClick={(e) => e.stopPropagation()}>
            <h4 className="text-lg font-bold">{selectedProfile.name}</h4>
            <div className="text-sm mt-3 space-y-1" style={{ color: COLORS.muted }}>
              <div>Roll No: {selectedProfile.rollNo}</div>
              <div>College: {selectedProfile.college || 'N/A'}</div>
              <div>Department: {selectedProfile.department || 'N/A'}</div>
              <div>Phone: {selectedProfile.phoneNumber || 'N/A'}</div>
              <div>Session: {selectedProfile.academicSession || 'N/A'}</div>
              <div>Status: {selectedProfile.status}</div>
              <div>Violations: {selectedProfile.violations?.length || 0}</div>
              <div>Scores: R1 {Number(selectedProfile.r1?.score || 0).toFixed(2)} | R2 {Number(selectedProfile.r2?.score || 0)} | R3 {Number(selectedProfile.r3?.score || 0)}</div>
            </div>
            <button
              className="mt-4 px-3 py-2 rounded-lg border"
              style={{ borderColor: COLORS.border }}
              onClick={() => setSelectedProfile(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
