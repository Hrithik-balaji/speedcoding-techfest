import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';
import toast from 'react-hot-toast';
import QuestionModal from '../components/admin/QuestionModal';
import Footer from '../components/Footer';

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
  { key: 'bank', label: 'Question Bank', icon: 'book' },
  { key: 'import', label: 'Import Questions', icon: 'upload' },
  { key: 'leaderboard', label: 'Leaderboard', icon: 'trophy' },
  { key: 'scores', label: 'Scores & Times', icon: 'scores' },
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
  if (name === 'upload') return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>;
  if (name === 'download') return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>;
  if (name === 'scores') return <svg {...common}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>;
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

function formatRemainingMs(ms) {
  const safeMs = Math.max(0, Number(ms) || 0);
  const totalSec = Math.floor(safeMs / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function formatClock(ts) {
  if (!ts) return '--';
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function roundStatusLabel(status) {
  if (!status?.contestStarted || Number(status?.currentRound || 0) === 0) {
    return 'Round 0 - Not Started';
  }
  return `Round ${status.currentRound} - ${status.roundActive ? 'Active' : 'Stopped'}`;
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

const IMPORT_TEMPLATES = {
  mcq: {
    filename: 'mcq_template.json',
    data: [{ question: 'What does HTML stand for?', options: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Hyper Transfer Markup Logic', 'Home Tool Markup Language'], correctAnswer: 0, points: 1 }],
  },
  debug: {
    filename: 'debug_template.json',
    data: [{ title: 'Fix the Loop', description: 'The loop should print numbers 1 to 5 but it starts from 0.', brokenCode: 'for i in range(6):\n    print(i)', expectedOutput: '1\n2\n3\n4\n5', hint: 'Check where the range starts', sampleInput: '', points: 1, allowedLanguages: ['python'] }],
  },
  coding: {
    filename: 'coding_template.json',
    data: [{ title: 'Sum of Two Numbers', description: 'Given two integers A and B on one line separated by a space, print their sum.', sampleInput: '3 5', sampleOutput: '8', constraints: '1 ≤ A, B ≤ 100', testCases: [{ input: '3 5', output: '8' }, { input: '0 0', output: '0' }, { input: '-1 1', output: '0' }], points: 1, allowedLanguages: ['python', 'cpp', 'java'] }],
  },
};

function downloadJsonTemplate(key) {
  const t = IMPORT_TEMPLATES[key];
  if (!t) return;
  const blob = new Blob([JSON.stringify(t.data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = t.filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const ALL_LANGS = ['python', 'cpp', 'c', 'java', 'javascript'];
const LANG_LABELS = { python: 'Python 3', cpp: 'C++17', c: 'C', java: 'Java', javascript: 'JS' };
const QM_LANG_LABELS = { python: 'Python', cpp: 'C++', c: 'C', java: 'Java' };

function truncateText(text, max) {
  const value = String(text || '');
  if (value.length <= max) return value;
  return `${value.slice(0, max)}...`;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const { isAdmin, adminLogin, adminLogout, setLoading } = useAuth();

  const [students, setStudents] = useState([]);
  const [violations, setViolations] = useState([]);
  const [events, setEvents] = useState([]);
  const [contestState, setContestState] = useState(null);
  const [timerStatus, setTimerStatus] = useState(null);
  const [roundStatus, setRoundStatus] = useState(null);
  const [finishers, setFinishers] = useState([]);
  const [liveRankings, setLiveRankings] = useState([]);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [activeMenu, setActiveMenu] = useState('students');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [roundActionLoading, setRoundActionLoading] = useState('');
  const [durationDrafts, setDurationDrafts] = useState({ 1: '15', 2: '20', 3: '25' });
  const [durationSavingRound, setDurationSavingRound] = useState(null);
  const [restartRoundLoading, setRestartRoundLoading] = useState(null);
  const [restartConfirmRound, setRestartConfirmRound] = useState(null);
  const [showRoundHistory, setShowRoundHistory] = useState(false);
  const [bankData, setBankData] = useState({ mcq: [], debug: [], coding: [] });
  const [bankLoading, setBankLoading] = useState(false);
  const [langEdits, setLangEdits] = useState({});
  const [langSaving, setLangSaving] = useState({});
  const [importTab, setImportTab] = useState('mcq');
  const [importParsed, setImportParsed] = useState({ mcq: null, debug: null, coding: null });
  const [importParseError, setImportParseError] = useState({ mcq: null, debug: null, coding: null });
  const [importResult, setImportResult] = useState({ mcq: null, debug: null, coding: null });
  const [importLoading, setImportLoading] = useState(false);
  const [importFileKey, setImportFileKey] = useState(0);

  const [qmTab, setQmTab] = useState('mcq');
  const [mcqQuestions, setMcqQuestions] = useState([]);
  const [debugQuestions, setDebugQuestions] = useState([]);
  const [codingQuestions, setCodingQuestions] = useState([]);
  const [qmLoading, setQmLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);

  const [qmLoaded, setQmLoaded] = useState({ mcq: false, debug: false, coding: false });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState('');
  const [fadingRows, setFadingRows] = useState({});
  const [overrideOpenId, setOverrideOpenId] = useState('');
  const [overrideForm, setOverrideForm] = useState({ r1Score: '', r2Score: '', r3Score: '' });
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [scoresData, setScoresData] = useState([]);
  const [scoresLoading, setScoresLoading] = useState(false);
  const [scoresLoaded, setScoresLoaded] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [secondsAgo, setSecondsAgo] = useState(0);

  const fetchContestState = useCallback(async () => {
    const { data } = await api.get('/admin/state');
    setContestState(data);
    return data;
  }, []);

  const fetchTimerStatus = useCallback(async () => {
    const { data } = await api.get('/timer/status');
    setTimerStatus(data);
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

    const vEvents = (vio.data || [])
      .flatMap((s) => (s.violations || []).map((v) => ({
        id: `v-${s.rollNo}-${v.timestamp}`,
        time: new Date(v.timestamp).getTime(),
        text: `${s.studentName} ${String(v.type || '').replace(/_/g, ' ')}`,
        kind: 'violation',
      })))
      .slice(0, 50);

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

  const fetchQuestionBank = useCallback(async () => {
    setBankLoading(true);
    try {
      const [mcq, debug, coding] = await Promise.all([
        api.get('/problems/admin/mcq'),
        api.get('/problems/admin/debug'),
        api.get('/problems/admin/coding'),
      ]);
      setBankData({
        mcq: mcq.data || [],
        debug: debug.data || [],
        coding: coding.data || [],
      });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load question bank');
    } finally {
      setBankLoading(false);
    }
  }, []);

  const setQuestionsByType = useCallback((type, rows) => {
    if (type === 'mcq') setMcqQuestions(rows || []);
    if (type === 'debug') setDebugQuestions(rows || []);
    if (type === 'coding') setCodingQuestions(rows || []);
  }, []);

  const fetchQuestionsForType = useCallback(async (type, force = false) => {
    if (!force && qmLoaded[type]) return;
    setQmLoading(true);
    try {
      const { data } = await api.get(`/problems/admin/problems/${type}`);
      setQuestionsByType(type, Array.isArray(data) ? data : []);
      setQmLoaded((prev) => ({ ...prev, [type]: true }));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load questions');
    } finally {
      setQmLoading(false);
    }
  }, [qmLoaded, setQuestionsByType]);

  const openAddModal = (type) => {
    setModalType(type);
    setEditingQuestion(null);
    setModalOpen(true);
  };

  const openEditModal = (type, question) => {
    setModalType(type);
    setEditingQuestion(question);
    setModalOpen(true);
  };

  const closeQuestionModal = () => {
    setModalOpen(false);
    setModalType(null);
    setEditingQuestion(null);
  };

  const handleQuestionSaved = async (type) => {
    await fetchQuestionsForType(type, true);
  };

  const runDeleteQuestion = async () => {
    if (!deleteConfirm?.id || !deleteConfirm?.type) return;
    const { id, type } = deleteConfirm;
    setDeleteLoadingId(id);
    try {
      await api.delete(`/problems/admin/problems/${type}/${id}`);
      setFadingRows((prev) => ({ ...prev, [id]: true }));
      setDeleteConfirm(null);
      setTimeout(async () => {
        await fetchQuestionsForType(type, true);
      }, 220);
      toast.success('Question deleted');
    } catch {
      toast.error('Failed to delete. Try again.');
    } finally {
      setDeleteLoadingId('');
    }
  };

  const fetchRoundStatus = useCallback(async () => {
    const { data } = await api.get('/admin/round-status');
    setRoundStatus(data);
    return data;
  }, []);

  const fetchFinishers = useCallback(async () => {
    const { data } = await api.get('/leaderboard');
    const rows = Array.isArray(data) ? data : [];
    setFinishers(rows);
    setLiveRankings(rows);
    return data;
  }, []);

  const fetchScores = useCallback(async () => {
    setScoresLoading(true);
    try {
      const { data } = await api.get('/admin/scores');
      setScoresData(data);
      setScoresLoaded(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load scores');
    } finally {
      setScoresLoading(false);
    }
  }, []);

  // Single sequential poll — fetches one endpoint at a time with small gaps
  const fetchAllAdminData = useCallback(async () => {
    try {
      await fetchStudents();
      await new Promise((r) => setTimeout(r, 200));
      await fetchViolations();
      await new Promise((r) => setTimeout(r, 200));
      await fetchContestState();
      await new Promise((r) => setTimeout(r, 200));
      await fetchTimerStatus();
      await new Promise((r) => setTimeout(r, 200));
      await fetchRoundStatus();
      await new Promise((r) => setTimeout(r, 200));
      await fetchFinishers();
      setLastUpdatedAt(Date.now());
    } catch (err) {
      console.error('Admin poll error:', err);
    }
  }, [fetchStudents, fetchViolations, fetchContestState, fetchTimerStatus, fetchRoundStatus, fetchFinishers]);

  const refreshAll = useCallback(async () => {
    setBusy(true);
    try {
      await fetchAllAdminData();
      // Fetch events (includes /submissions/admin/all) only on manual refresh
      await fetchEvents().catch(() => {});
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to refresh dashboard');
    } finally {
      setBusy(false);
    }
  }, [fetchAllAdminData, fetchEvents]);

  const POLL_INTERVAL = 30000; // 30 seconds

  useEffect(() => {
    if (!timerStatus) return;
    setDurationDrafts({
      1: String(timerStatus.round1Duration ?? 15),
      2: String(timerStatus.round2Duration ?? 20),
      3: String(timerStatus.round3Duration ?? 25),
    });
  }, [timerStatus?.round1Duration, timerStatus?.round2Duration, timerStatus?.round3Duration]);

  // Single unified polling loop — replaces all previous setInterval calls
  useEffect(() => {
    if (!isAdmin) return;
    fetchAllAdminData(); // immediate on mount
    const id = setInterval(fetchAllAdminData, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [isAdmin, fetchAllAdminData]);

  // 1-second ticker just for the "last updated" display — no HTTP traffic
  useEffect(() => {
    const id = setInterval(() => {
      if (lastUpdatedAt) setSecondsAgo(Math.floor((Date.now() - lastUpdatedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [lastUpdatedAt]);

  useEffect(() => {
    if (!isAdmin) return;
    if (activeMenu === 'bank') fetchQuestionBank();
  }, [activeMenu, fetchQuestionBank, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    if (activeMenu !== 'import') return;
    fetchQuestionsForType(qmTab);
  }, [activeMenu, fetchQuestionsForType, isAdmin, qmTab]);

  useEffect(() => {
    if (!isAdmin) return;
    if (activeMenu === 'scores') fetchScores();
  }, [activeMenu, fetchScores, isAdmin]);

  useEffect(() => {
    if (!isAdmin || activeMenu !== 'scores') return undefined;
    fetchFinishers();
    const id = setInterval(fetchFinishers, 15000);
    return () => clearInterval(id);
  }, [activeMenu, fetchFinishers, isAdmin]);

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
    return { total, active, totalV };
  }, [students]);

  const violationSummary = useMemo(() => {
    const terminated = (violations || []).filter((v) => v.terminated).length;
    const warnings = (violations || []).filter((v) => !v.terminated && Number(v.violationCount || 0) > 0).length;
    return { terminated, warnings };
  }, [violations]);

  const qmCounts = useMemo(() => ({
    mcq: mcqQuestions.length,
    debug: debugQuestions.length,
    coding: codingQuestions.length,
  }), [mcqQuestions.length, debugQuestions.length, codingQuestions.length]);

  const activeQmQuestions = useMemo(() => {
    if (qmTab === 'mcq') return mcqQuestions;
    if (qmTab === 'debug') return debugQuestions;
    return codingQuestions;
  }, [qmTab, mcqQuestions, debugQuestions, codingQuestions]);

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
    setBusy(true);
    try {
      await fn();
      toast.success(msg);
      await refreshAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const warnStudent = (id) => act(() => api.patch(`/admin/students/${id}/warn`), 'Student warned');
  const kickStudent = (id) => act(() => api.patch(`/admin/students/${id}/kick`), 'Student kicked');
  const reinstateStudent = (id) => act(() => api.patch(`/admin/students/${id}/reinstate`, { reason: 'Manual reinstatement' }), 'Student reinstated');

  const openOverrideFor = (student) => {
    setOverrideOpenId(student._id);
    setOverrideForm({
      r1Score: String(Number(student?.r1?.score ?? 0)),
      r2Score: String(Number(student?.r2?.score ?? 0)),
      r3Score: String(Number(student?.r3?.score ?? 0)),
    });
  };

  const closeOverride = () => {
    if (overrideSaving) return;
    setOverrideOpenId('');
  };

  const saveOverride = async (studentId) => {
    if (overrideSaving) return;

    const toValidScore = (value) => {
      if (value === null || value === undefined || String(value).trim() === '') return null;
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0) return null;
      return n;
    };

    const r1 = toValidScore(overrideForm.r1Score);
    const r2 = toValidScore(overrideForm.r2Score);
    const r3 = toValidScore(overrideForm.r3Score);

    if (r1 === null || r2 === null || r3 === null) {
      toast.error('All round scores must be numbers >= 0');
      return;
    }

    setOverrideSaving(true);
    try {
      const { data } = await api.patch(`/admin/students/${studentId}/override`, {
        r1Score: r1,
        r2Score: r2,
        r3Score: r3,
      });
      const knownStudent = students.find((s) => s._id === studentId) || scoresData.find((s) => s._id === studentId);
      const studentName = data?.student?.name || knownStudent?.name || 'Student';
      const newRank = data?.newRank;
      toast.success(`Scores updated for ${studentName} — new rank: ${newRank ? `#${newRank}` : '--'}`);
      setOverrideOpenId('');
      await Promise.all([
        fetchStudents(),
        fetchFinishers(),
        scoresLoaded ? fetchScores() : Promise.resolve(),
      ]);
    } catch {
      toast.error('Failed to override score');
    } finally {
      setOverrideSaving(false);
    }
  };

  const reinstateFromViolationRow = (row) => {
    const ok = window.confirm(`Reinstate ${row.studentName}? They will be able to continue the exam.`);
    if (!ok) return;
    reinstateStudent(row._id);
  };

  const runRoundAction = async (actionKey, fn, successMessage) => {
    setRoundActionLoading(actionKey);
    try {
      await fn();
      toast.success(successMessage);
      await fetchTimerStatus();
      await fetchContestState();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Round action failed');
    } finally {
      setRoundActionLoading('');
    }
  };

  const startRound = () => runRoundAction('start', () => api.post('/timer/start-round'), 'Round started');
  const startContest = startRound;
  const stopRound = () => runRoundAction('stop', () => api.post('/timer/stop-round'), 'Round stopped');
  const setRoundDuration = async (round) => {
    const minutes = Number(durationDrafts[round]);
    if (!Number.isFinite(minutes) || minutes < 5 || minutes > 180) {
      toast.error('Duration must be between 5 and 180 minutes');
      return;
    }

    setDurationSavingRound(round);
    try {
      const { data } = await api.patch('/timer/set-duration', { round, minutes });
      setTimerStatus(data);
      await fetchContestState();
      toast.success(`Round ${round} duration set to ${minutes} minutes`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update duration');
    } finally {
      setDurationSavingRound(null);
    }
  };

  const nextRound = () => {
    const ok = window.confirm('Move to next round? This cannot be undone.');
    if (!ok) return;
    runRoundAction('next', () => api.post('/timer/next-round'), 'Moved to next round');
  };

  const openRestartConfirm = (round) => {
    setRestartConfirmRound(round);
  };

  const restartRoundConfirmed = async () => {
    const round = Number(restartConfirmRound || 0);
    if (![1, 2, 3].includes(round)) return;

    setRestartRoundLoading(round);
    try {
      await api.post('/timer/restart-round', { round });
      toast.success(`Round ${round} has been restarted successfully`);
      await fetchTimerStatus();
      await fetchContestState();
      setRestartConfirmRound(null);
    } catch {
      toast.error('Failed to restart round. Please try again.');
    } finally {
      setRestartRoundLoading(null);
    }
  };

  const pauseContest = () => act(() => api.patch('/timer/pause'), contestState?.paused ? 'Contest resumed' : 'Contest paused');
  const endContest = () => act(async () => {
    await Promise.all([
      api.post('/timer/force-end', { round: 1 }),
      api.post('/timer/force-end', { round: 2 }),
      api.post('/timer/force-end', { round: 3 }),
    ]);
  }, 'Contest ended');
  const resetContest = () => act(() => api.post('/timer/reset'), 'Contest reset to waiting state');

  const handleImportFile = (type, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportResult(prev => ({ ...prev, [type]: null }));
    setImportParseError(prev => ({ ...prev, [type]: null }));
    setImportParsed(prev => ({ ...prev, [type]: null }));
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target.result);
        const arr = Array.isArray(raw) ? raw : (Array.isArray(raw?.questions) ? raw.questions : null);
        if (!arr) throw new Error('JSON must be an array or { questions: [...] }');
        if (arr.length === 0) throw new Error('File contains no questions');
        if (arr.length > 50) throw new Error(`Maximum 50 questions per import. File has ${arr.length}.`);
        setImportParsed(prev => ({ ...prev, [type]: arr }));
      } catch (err) {
        setImportParseError(prev => ({ ...prev, [type]: err.message }));
      }
    };
    reader.onerror = () => setImportParseError(prev => ({ ...prev, [type]: 'Failed to read file' }));
    reader.readAsText(file);
  };

  const handleImportAll = async (type) => {
    const questions = importParsed[type];
    if (!questions?.length || importLoading) return;
    setImportLoading(true);
    setImportResult(prev => ({ ...prev, [type]: null }));
    try {
      const { data } = await api.post(`/problems/import/${type}`, { questions });
      setImportResult(prev => ({ ...prev, [type]: { ...data, ok: true } }));
      if (data.imported > 0) {
        toast.success(`Imported ${data.imported} questions`);
        fetchQuestionBank();
      }
      if (data.failed === 0) {
        setImportParsed(prev => ({ ...prev, [type]: null }));
        setImportFileKey(k => k + 1);
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Import failed';
      setImportResult(prev => ({ ...prev, [type]: { ok: false, error: msg } }));
      toast.error(msg);
    } finally {
      setImportLoading(false);
    }
  };

  if (!isAdmin) {
    return <LoginGate onLogin={onAdminLogin} loading={busy} />;
  }

  const stateBadge = contestStateLabel(contestState);

  return (
    <div className="h-screen overflow-hidden flex" style={{ background: COLORS.bg, color: COLORS.text, fontFamily: "'Inter', sans-serif" }}>
      <aside className="w-64 shrink-0 p-4 border-r flex flex-col overflow-y-auto" style={{ background: '#0f172a', borderColor: COLORS.border }}>
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
        <section className="rounded-2xl border p-4 mb-5" style={{ background: COLORS.card, borderColor: COLORS.border }}>
          <h3 className="text-base font-semibold mb-3">Round Control</h3>
          <div className="flex flex-wrap items-center gap-2 text-sm mb-3" style={{ color: COLORS.muted }}>
            <span className="px-2 py-1 rounded border" style={{ borderColor: COLORS.border, color: COLORS.text }}>
              {roundStatusLabel(timerStatus)}
            </span>
            <span>Current Round: <strong style={{ color: COLORS.text }}>{Number(timerStatus?.currentRound || 0)}</strong></span>
            <span>State: <strong style={{ color: COLORS.text }}>{timerStatus?.roundActive ? 'Active' : (timerStatus?.contestStarted ? 'Inactive' : 'Not Started')}</strong></span>
            <span>Remaining: <strong style={{ color: COLORS.text }}>{formatRemainingMs(timerStatus?.remainingMs)}</strong></span>
            <span>Connected Students: <strong style={{ color: COLORS.text }}>{contestState?.connectedStudents ?? summary.active}</strong></span>
          </div>
          <p className="text-sm mb-4" style={{ color: COLORS.muted }}>
            {roundStatusLabel(timerStatus)}
          </p>
          <div className="space-y-3 mb-4">
            {[1, 2, 3].map((round) => {
              const isActiveRound = Number(timerStatus?.currentRound || 0) === round && Boolean(timerStatus?.roundActive);
              const isSaving = durationSavingRound === round;

              return (
                <div key={round} className="flex flex-wrap items-center gap-3 rounded-xl border px-3 py-3" style={{ borderColor: COLORS.border, background: '#0f172a' }}>
                  <span className="text-sm font-semibold min-w-[72px]" style={{ color: COLORS.text }}>Round {round}</span>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={durationDrafts[round] ?? ''}
                    onChange={(e) => setDurationDrafts((prev) => ({ ...prev, [round]: e.target.value }))}
                    className="w-28 rounded-lg border px-3 py-2 text-sm outline-none"
                    style={{ background: COLORS.card, borderColor: COLORS.border, color: COLORS.text }}
                    disabled={isSaving || isActiveRound}
                  />
                  <span className="text-sm" style={{ color: COLORS.muted }}>minutes</span>
                  <button
                    onClick={() => setRoundDuration(round)}
                    disabled={isSaving || isActiveRound}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: 'rgba(34,197,94,0.16)', color: '#bbf7d0', border: '1px solid rgba(34,197,94,0.35)' }}
                  >
                    <Icon name={isSaving ? 'refresh' : 'settings'} className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
                    {isSaving ? 'Saving...' : 'Set Duration'}
                  </button>
                  {isActiveRound && (
                    <span className="text-xs font-semibold" style={{ color: '#fbbf24' }}>Active - cannot change</span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={startRound}
              disabled={Boolean(roundActionLoading) || timerStatus?.roundActive}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'rgba(34,197,94,0.16)', color: '#bbf7d0', border: '1px solid rgba(34,197,94,0.35)' }}
            >
              <Icon name={roundActionLoading === 'start' ? 'refresh' : 'play'} className={`w-4 h-4 ${roundActionLoading === 'start' ? 'animate-spin' : ''}`} />
              ▶ Start Round
            </button>
            <button
              onClick={stopRound}
              disabled={Boolean(roundActionLoading) || !timerStatus?.roundActive}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'rgba(239,68,68,0.16)', color: '#fecaca', border: '1px solid rgba(239,68,68,0.35)' }}
            >
              <Icon name={roundActionLoading === 'stop' ? 'refresh' : 'stop'} className={`w-4 h-4 ${roundActionLoading === 'stop' ? 'animate-spin' : ''}`} />
              ⏹ Stop Round
            </button>
            <button
              onClick={nextRound}
              disabled={Boolean(roundActionLoading)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'rgba(59,130,246,0.16)', color: '#bfdbfe', border: '1px solid rgba(59,130,246,0.35)' }}
            >
              <Icon name={roundActionLoading === 'next' ? 'refresh' : 'play'} className={`w-4 h-4 ${roundActionLoading === 'next' ? 'animate-spin' : ''}`} />
              → Next Round
            </button>
          </div>

          <div className="mt-5 pt-4 border-t" style={{ borderColor: COLORS.border }}>
            <h4 className="text-sm font-semibold mb-3" style={{ color: '#fcd34d' }}>Restart a Round</h4>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3].map((round) => {
                const isLoading = restartRoundLoading === round;
                const started = timerStatus?.hasRoundStarted || {};
                const disabledByPrereq =
                  !timerStatus?.contestStarted ||
                  (round === 2 && !started.r1) ||
                  (round === 3 && !started.r2);
                const disabled = Boolean(restartRoundLoading) || disabledByPrereq;

                return (
                  <button
                    key={round}
                    onClick={() => openRestartConfirm(round)}
                    disabled={disabled}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: 'rgba(245,158,11,0.16)', color: '#fde68a', border: '1px solid rgba(245,158,11,0.35)' }}
                  >
                    <Icon name={isLoading ? 'refresh' : 'reset'} className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    {isLoading ? 'Restarting...' : `↺ Restart Round ${round}`}
                  </button>
                );
              })}
            </div>

            <div className="mt-4">
              <button
                onClick={() => setShowRoundHistory((prev) => !prev)}
                className="px-3 py-1.5 rounded-lg border text-xs font-semibold"
                style={{ borderColor: COLORS.border, color: COLORS.muted }}
              >
                {showRoundHistory ? 'Hide Round History' : 'Show Round History'}
              </button>

              {showRoundHistory && (
                <div className="mt-3 overflow-auto rounded-xl border" style={{ borderColor: COLORS.border }}>
                  <table className="w-full text-sm min-w-[640px]">
                    <thead style={{ background: '#0f172a' }}>
                      <tr>
                        {['Round', 'Started at', 'Ended at', 'Restarted at'].map((h) => (
                          <th key={h} className="text-left px-3 py-3 font-semibold" style={{ color: '#cbd5e1' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(timerStatus?.roundHistory || []).map((row, idx) => (
                        <tr key={`${row.round}-${row.startedAt || row.restartedAt || idx}`} className="border-t" style={{ borderColor: COLORS.border }}>
                          <td className="px-3 py-3">Round {row.round}</td>
                          <td className="px-3 py-3" style={{ color: COLORS.muted }}>{formatClock(row.startedAt)}</td>
                          <td className="px-3 py-3" style={{ color: COLORS.muted }}>{formatClock(row.endedAt)}</td>
                          <td className="px-3 py-3" style={{ color: COLORS.muted }}>{formatClock(row.restartedAt)}</td>
                        </tr>
                      ))}
                      {!(timerStatus?.roundHistory || []).length && (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center" style={{ color: COLORS.muted }}>No round history yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border p-4 mb-5" style={{ background: COLORS.card, borderColor: COLORS.border }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold">Contest Progress</h3>
            <button
              onClick={async () => {
                try {
                  await fetchFinishers();
                  toast.success('Rankings recalculated');
                } catch (err) {
                  toast.error(err.response?.data?.error || 'Failed to recalculate rankings');
                }
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: 'rgba(34,197,94,0.16)', color: '#bbf7d0', border: '1px solid rgba(34,197,94,0.35)' }}
            >
              <Icon name="refresh" className="w-3.5 h-3.5" />
              Recalculate Rankings
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-4 text-sm">
            <div className="rounded-xl border p-3" style={{ borderColor: COLORS.border }}>
              <div style={{ color: COLORS.muted }}>Round 1</div>
              <div className="font-semibold">{roundStatus?.round1?.total ?? 0} competing</div>
              <div className="text-xs" style={{ color: '#86efac' }}>{roundStatus?.round1?.promoted ?? 0} promoted</div>
              <div className="text-xs" style={{ color: '#fca5a5' }}>{roundStatus?.round1?.eliminated ?? 0} eliminated</div>
            </div>
            <div className="rounded-xl border p-3" style={{ borderColor: COLORS.border }}>
              <div style={{ color: COLORS.muted }}>Round 2</div>
              <div className="font-semibold">{roundStatus?.round2?.total ?? 0} competing</div>
              <div className="text-xs" style={{ color: '#86efac' }}>{roundStatus?.round2?.promoted ?? 0} promoted</div>
              <div className="text-xs" style={{ color: '#fca5a5' }}>{roundStatus?.round2?.eliminated ?? 0} eliminated</div>
            </div>
            <div className="rounded-xl border p-3" style={{ borderColor: COLORS.border }}>
              <div style={{ color: COLORS.muted }}>Round 3</div>
              <div className="font-semibold">{roundStatus?.round3?.total ?? 0} competing</div>
              <div className="text-xs" style={{ color: '#86efac' }}>{roundStatus?.round3?.finished ?? 0} finished</div>
            </div>
            <div className="rounded-xl border p-3" style={{ borderColor: COLORS.border }}>
              <div style={{ color: COLORS.muted }}>Not Started</div>
              <div className="font-semibold">{roundStatus?.notStarted ?? 0} students</div>
            </div>
          </div>

          <div className="rounded-xl border overflow-hidden" style={{ borderColor: COLORS.border }}>
            <table className="w-full text-sm min-w-[420px]">
              <thead style={{ background: '#0f172a' }}>
                <tr>
                  <th className="text-left px-3 py-2 font-semibold" style={{ color: '#cbd5e1' }}>Rank</th>
                  <th className="text-left px-3 py-2 font-semibold" style={{ color: '#cbd5e1' }}>Name</th>
                  <th className="text-left px-3 py-2 font-semibold" style={{ color: '#cbd5e1' }}>Roll No</th>
                  <th className="text-left px-3 py-2 font-semibold" style={{ color: '#cbd5e1' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {finishers.map((f) => (
                  <tr key={`${f.rollNo}-${f.rank}`} className="border-t" style={{ borderColor: COLORS.border }}>
                    <td className="px-3 py-2">{f.rank}</td>
                    <td className="px-3 py-2">{f.name}</td>
                    <td className="px-3 py-2" style={{ color: COLORS.muted }}>{f.rollNo}</td>
                    <td className="px-3 py-2 font-mono">{f.totalTime || '--'}</td>
                  </tr>
                ))}
                {!finishers.length && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center" style={{ color: COLORS.muted }}>
                      No finishers yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div>
            <h2 className="text-2xl font-bold">{MENU.find((m) => m.key === activeMenu)?.label || 'Admin Panel'}</h2>
            <p className="text-sm" style={{ color: COLORS.muted }}>Live monitoring and contest controls</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className={`px-3 py-1.5 rounded-full border text-xs font-semibold ${stateBadge.className}`}>
              {stateBadge.text}
            </span>
            {lastUpdatedAt && (
              <span className="text-xs" style={{ color: COLORS.muted }}>
                Updated {secondsAgo}s ago
              </span>
            )}
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

        {activeMenu === 'students' && (
          <>
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
              {[
                { icon: 'users', label: 'Total Students', value: summary.total },
                { icon: 'play', label: 'Active Students', value: summary.active },
                { icon: 'warning', label: 'Total Violations', value: summary.totalV },
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

            <h3 className="text-base font-semibold mb-3">Student Management</h3>
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
                    {['Name', 'Roll Number', 'Profile', 'R2 Solved', 'R3 Solved', 'Violations', 'Last Seen', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-3 py-3 font-semibold" style={{ color: '#cbd5e1' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s) => (
                    <Fragment key={s._id}>
                      <tr key={s._id} className="border-t hover:bg-slate-800/35" style={{ borderColor: COLORS.border }}>
                        <td className="px-3 py-3 font-medium">{s.name}</td>
                        <td className="px-3 py-3 text-slate-300">{s.rollNo}</td>
                        <td className="px-3 py-3 text-xs text-slate-400">{[s.college, s.department].filter(Boolean).join(' • ') || 'N/A'}</td>
                        <td className="px-3 py-3"><span className="px-2 py-1 rounded-md bg-blue-500/20 text-blue-300">{s.r2?.solved?.length || 0}</span></td>
                        <td className="px-3 py-3"><span className="px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-300">{s.r3?.solved?.length || 0}</span></td>
                        <td className="px-3 py-3"><span className="px-2 py-1 rounded-md bg-red-500/20 text-red-300">{s.violations?.length || 0}</span></td>
                        <td className="px-3 py-3 text-slate-400">{formatAgo(s.lastSeen)}</td>
                        <td className="px-3 py-3"><span className={`px-2 py-1 rounded-full border text-xs ${getStatusColor(s.status)}`}>{s.status}</span></td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <button className="px-2 py-1 rounded border text-xs hover:bg-slate-700/40" style={{ borderColor: COLORS.border }} onClick={() => setSelectedProfile(s)}><span className="inline-flex items-center gap-1"><Icon name="eye" className="w-3 h-3" />View</span></button>
                            <button
                              className="px-2 py-1 rounded border text-xs hover:bg-blue-500/15"
                              style={{ borderColor: 'rgba(59,130,246,0.35)', color: '#bfdbfe' }}
                              onClick={() => openOverrideFor(s)}
                            >
                              <span className="inline-flex items-center gap-1"><Icon name="edit" className="w-3 h-3" />Override</span>
                            </button>
                            <button className="px-2 py-1 rounded border text-xs hover:bg-amber-500/15" style={{ borderColor: 'rgba(245,158,11,0.35)', color: '#fbbf24' }} onClick={() => warnStudent(s._id)}><span className="inline-flex items-center gap-1"><Icon name="warn" className="w-3 h-3" />Warn</span></button>
                            <button className="px-2 py-1 rounded border text-xs hover:bg-red-500/15" style={{ borderColor: 'rgba(239,68,68,0.35)', color: '#fca5a5' }} onClick={() => kickStudent(s._id)}><span className="inline-flex items-center gap-1"><Icon name="kick" className="w-3 h-3" />Kick</span></button>
                            <button className="px-2 py-1 rounded border text-xs hover:bg-emerald-500/15" style={{ borderColor: 'rgba(34,197,94,0.35)', color: '#86efac' }} onClick={() => reinstateStudent(s._id)}>Reinstate</button>
                          </div>
                        </td>
                      </tr>

                      {overrideOpenId === s._id && (
                        <tr className="border-t" style={{ borderColor: COLORS.border, background: 'rgba(15,23,42,0.7)' }}>
                          <td colSpan={9} className="px-3 py-4">
                            <div className="rounded-xl border p-4" style={{ borderColor: COLORS.border, background: COLORS.card }}>
                              <h4 className="text-sm font-semibold mb-3">Override Score: {s.name}</h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                                <div>
                                  <label className="block text-xs font-semibold mb-1" style={{ color: COLORS.muted }}>Round 1 Score</label>
                                  <input
                                    type="number"
                                    min="0"
                                    className="w-full rounded-lg px-3 py-2 border outline-none"
                                    style={{ background: '#0f172a', borderColor: COLORS.border, color: COLORS.text }}
                                    value={overrideForm.r1Score}
                                    onChange={(e) => setOverrideForm((prev) => ({ ...prev, r1Score: e.target.value }))}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold mb-1" style={{ color: COLORS.muted }}>Round 2 Score</label>
                                  <input
                                    type="number"
                                    min="0"
                                    className="w-full rounded-lg px-3 py-2 border outline-none"
                                    style={{ background: '#0f172a', borderColor: COLORS.border, color: COLORS.text }}
                                    value={overrideForm.r2Score}
                                    onChange={(e) => setOverrideForm((prev) => ({ ...prev, r2Score: e.target.value }))}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold mb-1" style={{ color: COLORS.muted }}>Round 3 Score</label>
                                  <input
                                    type="number"
                                    min="0"
                                    className="w-full rounded-lg px-3 py-2 border outline-none"
                                    style={{ background: '#0f172a', borderColor: COLORS.border, color: COLORS.text }}
                                    value={overrideForm.r3Score}
                                    onChange={(e) => setOverrideForm((prev) => ({ ...prev, r3Score: e.target.value }))}
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-2 justify-end">
                                <button
                                  onClick={closeOverride}
                                  disabled={overrideSaving}
                                  className="px-3 py-2 rounded-lg border text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                  style={{ borderColor: COLORS.border, color: '#cbd5e1', background: '#334155' }}
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => saveOverride(s._id)}
                                  disabled={overrideSaving}
                                  className="px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                  style={{ background: COLORS.accent, color: '#052e16' }}
                                >
                                  {overrideSaving ? 'Saving...' : 'Save Override'}
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                  {!filteredStudents.length && (
                    <tr>
                      <td colSpan={9} className="px-3 py-8 text-center text-slate-400">No students match current filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border p-4" style={{ background: COLORS.card, borderColor: COLORS.border }}>
            <h3 className="text-sm font-semibold mb-3">Announcements</h3>
            <p className="text-xs mb-3" style={{ color: COLORS.muted }}>Latest contest events and alerts for admins.</p>
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
          </>
        )}

        {activeMenu === 'violations' && (
          <section className="rounded-2xl border p-4" style={{ background: COLORS.card, borderColor: COLORS.border }}>
            <h3 className="text-sm font-semibold mb-3">Violations &amp; Terminations</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-3 py-1 rounded-full text-xs font-semibold border" style={{ color: '#fecaca', borderColor: 'rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.12)' }}>
                {violationSummary.terminated} terminated
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold border" style={{ color: '#fde68a', borderColor: 'rgba(245,158,11,0.35)', background: 'rgba(245,158,11,0.12)' }}>
                {violationSummary.warnings} with warnings
              </span>
            </div>
            <div className="overflow-auto rounded-xl border" style={{ borderColor: COLORS.border }}>
              <table className="w-full text-sm min-w-[760px]">
                <thead style={{ background: '#0f172a' }}>
                  <tr>
                    {['Student Name', 'Roll No', 'Violation Count', 'Status', 'Latest Violation', 'Reinstate'].map((h) => (
                      <th key={h} className="text-left px-3 py-3 font-semibold" style={{ color: '#cbd5e1' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {violations.map((row) => {
                    const latest = (row.violations || [])[0];
                    const latestType = latest?.type ? String(latest.type).replace(/_/g, ' ') : 'N/A';
                    return (
                    <tr key={row._id} className="border-t" style={{ borderColor: COLORS.border, background: row.terminated ? 'rgba(127,29,29,0.18)' : 'transparent' }}>
                      <td className="px-3 py-3 font-medium">{row.studentName}</td>
                      <td className="px-3 py-3">{row.rollNo}</td>
                      <td className="px-3 py-3">{Number(row.violationCount || 0)}</td>
                      <td className="px-3 py-3">
                        <span className="px-2 py-1 rounded-full border text-xs font-semibold" style={row.terminated
                          ? { color: '#fecaca', borderColor: 'rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.12)' }
                          : { color: '#fde68a', borderColor: 'rgba(245,158,11,0.35)', background: 'rgba(245,158,11,0.12)' }}>
                          {row.terminated ? 'Terminated' : 'Warning'}
                        </span>
                      </td>
                      <td className="px-3 py-3" style={{ color: COLORS.muted }}>
                        {latestType} {latest?.timestamp ? `• ${formatAgo(latest.timestamp)}` : ''}
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => reinstateFromViolationRow(row)}
                          className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-emerald-500/15"
                          style={{ borderColor: 'rgba(34,197,94,0.35)', color: '#86efac' }}
                        >
                          Reinstate
                        </button>
                      </td>
                    </tr>
                  )})}
                  {!violations.length && (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center" style={{ color: COLORS.muted }}>No violations logged yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeMenu === 'bank' && (
          <section className="rounded-2xl border p-4" style={{ background: COLORS.card, borderColor: COLORS.border }}>
             <div className="flex items-center gap-2 mb-4">
               <h3 className="text-sm font-semibold">Question Bank</h3>
               <button onClick={fetchQuestionBank} className="px-2 py-1 text-xs rounded border" style={{ borderColor: COLORS.border }}>Reload</button>
             </div>
             {bankLoading ? (
               <div className="text-sm" style={{ color: COLORS.muted }}>Loading question bank...</div>
             ) : (
               <>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                   <div className="rounded-xl border p-3" style={{ borderColor: COLORS.border }}>
                     <div className="text-xs uppercase" style={{ color: COLORS.muted }}>MCQ</div>
                     <div className="text-2xl font-bold mt-1">{bankData.mcq.length}</div>
                   </div>
                   <div className="rounded-xl border p-3" style={{ borderColor: COLORS.border }}>
                     <div className="text-xs uppercase" style={{ color: COLORS.muted }}>Debug</div>
                     <div className="text-2xl font-bold mt-1">{bankData.debug.length}</div>
                   </div>
                   <div className="rounded-xl border p-3" style={{ borderColor: COLORS.border }}>
                     <div className="text-xs uppercase" style={{ color: COLORS.muted }}>Coding</div>
                     <div className="text-2xl font-bold mt-1">{bankData.coding.length}</div>
                   </div>
                 </div>

                 {bankData.coding.length > 0 && (
                   <div>
                     <h4 className="text-sm font-semibold mb-2">Coding Problems — Allowed Languages</h4>
                     <p className="text-xs mb-3" style={{ color: COLORS.muted }}>Set which languages students may use to submit each coding problem.</p>
                     <div className="overflow-auto rounded-xl border" style={{ borderColor: COLORS.border }}>
                       <table className="w-full text-sm min-w-[640px]">
                         <thead style={{ background: '#0f172a' }}>
                           <tr>
                             <th className="text-left px-3 py-3 font-semibold" style={{ color: '#cbd5e1' }}>Problem</th>
                             {ALL_LANGS.map(l => (
                               <th key={l} className="text-center px-3 py-3 font-semibold" style={{ color: '#cbd5e1' }}>{LANG_LABELS[l]}</th>
                             ))}
                             <th className="px-3 py-3" />
                           </tr>
                         </thead>
                         <tbody>
                           {bankData.coding.map(p => {
                             const current = langEdits[p._id] ?? (p.allowedLanguages?.length ? p.allowedLanguages : ALL_LANGS);
                             const isSaving = langSaving[p._id];
                             return (
                               <tr key={p._id} className="border-t" style={{ borderColor: COLORS.border }}>
                                 <td className="px-3 py-3 font-medium">{p.title}</td>
                                 {ALL_LANGS.map(l => (
                                   <td key={l} className="px-3 py-3 text-center">
                                     <input
                                       type="checkbox"
                                       checked={current.includes(l)}
                                       onChange={() => {
                                         const next = current.includes(l)
                                           ? current.filter(x => x !== l)
                                           : [...current, l];
                                         setLangEdits(prev => ({ ...prev, [p._id]: next.length ? next : [l] }));
                                       }}
                                       className="w-4 h-4 accent-green-500"
                                     />
                                   </td>
                                 ))}
                                 <td className="px-3 py-3">
                                   <button
                                     disabled={isSaving}
                                     onClick={async () => {
                                       setLangSaving(prev => ({ ...prev, [p._id]: true }));
                                       try {
                                         await api.put(`/problems/admin/coding/${p._id}`, { allowedLanguages: current });
                                         toast.success(`Languages saved for "${p.title}"`);
                                         fetchQuestionBank();
                                       } catch {
                                         toast.error('Failed to save languages');
                                       } finally {
                                         setLangSaving(prev => ({ ...prev, [p._id]: false }));
                                       }
                                     }}
                                     className="px-3 py-1.5 rounded-lg border text-xs font-semibold disabled:opacity-50"
                                     style={{ borderColor: 'rgba(34,197,94,0.35)', color: '#86efac', background: 'rgba(34,197,94,0.08)' }}
                                   >
                                     {isSaving ? 'Saving...' : 'Save'}
                                   </button>
                                 </td>
                               </tr>
                             );
                           })}
                         </tbody>
                       </table>
                     </div>
                   </div>
                 )}
               </>
             )}
           </section>
         )}

        {activeMenu === 'import' && (
          <section className="rounded-2xl border p-4 space-y-5" style={{ background: COLORS.card, borderColor: COLORS.border }}>
            <div>
              <h2 className="text-base font-bold">Question Manager</h2>
              <p className="text-xs mt-1" style={{ color: COLORS.muted }}>Add, edit and delete individual questions</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[{ key: 'mcq', label: 'MCQ Questions' }, { key: 'debug', label: 'Debug Questions' }, { key: 'coding', label: 'Coding Questions' }].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setQmTab(tab.key);
                    fetchQuestionsForType(tab.key);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border"
                  style={qmTab === tab.key
                    ? { background: 'rgba(34,197,94,0.16)', color: '#bbf7d0', borderColor: 'rgba(34,197,94,0.35)' }
                    : { background: 'transparent', color: COLORS.muted, borderColor: COLORS.border }}
                >
                  {tab.label} ({qmCounts[tab.key]})
                </button>
              ))}
              <button
                onClick={() => openAddModal(qmTab)}
                className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: COLORS.accent, color: '#fff' }}
              >
                Add Question
              </button>
            </div>

            <div className="rounded-xl border" style={{ borderColor: COLORS.border }}>
              {qmLoading && !qmLoaded[qmTab] ? (
                <div className="px-4 py-8 text-sm text-center" style={{ color: COLORS.muted }}>
                  <span className="inline-flex items-center gap-2"><Icon name="refresh" className="w-4 h-4 animate-spin" /> Loading questions...</span>
                </div>
              ) : !activeQmQuestions.length ? (
                <div className="px-4 py-8 text-sm text-center" style={{ color: COLORS.muted }}>
                  {qmTab === 'mcq' && 'No MCQ questions yet. Click Add Question to create one.'}
                  {qmTab === 'debug' && 'No Debug questions yet. Click Add Question to create one.'}
                  {qmTab === 'coding' && 'No Coding questions yet. Click Add Question to create one.'}
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: COLORS.border }}>
                  {activeQmQuestions.map((q) => (
                    <div key={q._id} className={`p-3 transition-opacity duration-200 ${fadingRows[q._id] ? 'opacity-0' : 'opacity-100'}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        {qmTab === 'mcq' && (
                          <>
                            <div className="font-medium text-sm max-w-[420px]" title={q.question}>{truncateText(q.question, 60)}</div>
                            <div className="text-xs" style={{ color: COLORS.muted }}>
                              Correct: {Array.isArray(q.options) ? (q.options[q.correctAnswer] || '-') : '-'}
                            </div>
                          </>
                        )}

                        {qmTab === 'debug' && (
                          <>
                            <div className="font-medium text-sm max-w-[300px]" title={q.title}>{q.title}</div>
                            <div className="text-xs" style={{ color: COLORS.muted }}>
                              Expected: {truncateText(q.expectedOutput || '', 30)}
                            </div>
                            <div className="flex items-center gap-1">
                              {(q.allowedLanguages || []).map((lang) => (
                                <span key={`${q._id}-${lang}`} className="px-2 py-0.5 rounded-full text-[11px] border" style={{ borderColor: COLORS.border, color: '#cbd5e1' }}>
                                  {QM_LANG_LABELS[lang] || lang}
                                </span>
                              ))}
                            </div>
                          </>
                        )}

                        {qmTab === 'coding' && (
                          <>
                            <div className="font-medium text-sm max-w-[300px]" title={q.title}>{q.title}</div>
                            <div className="text-xs" style={{ color: COLORS.muted }}>
                              {Array.isArray(q.testCases) ? q.testCases.length : 0} test cases
                            </div>
                            <div className="flex items-center gap-1">
                              {(q.allowedLanguages || []).map((lang) => (
                                <span key={`${q._id}-${lang}`} className="px-2 py-0.5 rounded-full text-[11px] border" style={{ borderColor: COLORS.border, color: '#cbd5e1' }}>
                                  {QM_LANG_LABELS[lang] || lang}
                                </span>
                              ))}
                            </div>
                          </>
                        )}

                        <span className="ml-auto px-2 py-0.5 rounded-full text-[11px] border" style={{ borderColor: 'rgba(34,197,94,0.35)', color: '#86efac' }}>
                          {Number(q.points || 0)} pts
                        </span>
                        <button
                          onClick={() => openEditModal(qmTab, q)}
                          className="px-2 py-1 rounded border text-xs"
                          style={{ borderColor: COLORS.border, color: '#cbd5e1' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ type: qmTab, id: q._id })}
                          disabled={deleteLoadingId === q._id}
                          className="px-2 py-1 rounded border text-xs disabled:opacity-50"
                          style={{ borderColor: 'rgba(239,68,68,0.35)', color: '#fecaca' }}
                        >
                          {deleteLoadingId === q._id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>

                      {deleteConfirm?.id === q._id && deleteConfirm?.type === qmTab && (
                        <div className="mt-3 rounded-lg border px-3 py-2 flex flex-wrap items-center gap-2" style={{ borderColor: 'rgba(239,68,68,0.35)', background: 'rgba(127,29,29,0.18)' }}>
                          <span className="text-xs" style={{ color: '#fecaca' }}>Delete this question? This cannot be undone.</span>
                          <div className="ml-auto flex items-center gap-2">
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-2 py-1 rounded border text-xs"
                              style={{ borderColor: COLORS.border, color: '#cbd5e1' }}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={runDeleteQuestion}
                              disabled={deleteLoadingId === q._id}
                              className="px-2 py-1 rounded border text-xs disabled:opacity-50"
                              style={{ borderColor: 'rgba(239,68,68,0.35)', color: '#fecaca' }}
                            >
                              {deleteLoadingId === q._id ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t pt-5" style={{ borderColor: COLORS.border }}>
              <div>
                <h2 className="text-base font-bold">Bulk Import</h2>
                <p className="text-xs mt-1" style={{ color: COLORS.muted }}>Import multiple questions from a JSON file</p>
              </div>

              <div className="mt-4 flex gap-1 bg-black/20 rounded-xl p-1 max-w-sm">
                {[{ key: 'mcq', label: 'MCQ' }, { key: 'debug', label: 'Debug' }, { key: 'coding', label: 'Coding' }].map(t => (
                  <button key={t.key} onClick={() => setImportTab(t.key)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                    style={importTab === t.key ? { background: COLORS.accent, color: '#fff' } : { color: COLORS.muted }}>
                    {t.label}
                  </button>
                ))}
              </div>

              {['mcq', 'debug', 'coding'].map(type => importTab !== type ? null : (
                <div key={type} className="space-y-4 mt-4">
                  <div className="flex items-center gap-3">
                    <button onClick={() => downloadJsonTemplate(type)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: 'rgba(99,102,241,0.18)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.35)' }}>
                      <Icon name="download" className="w-3.5 h-3.5" /> Download Template
                    </button>
                    <span className="text-xs" style={{ color: COLORS.muted }}>Max 50 questions per import</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: COLORS.muted }}>Upload JSON File</label>
                    <input key={importFileKey} type="file" accept=".json"
                      onChange={e => handleImportFile(type, e)}
                      className="block text-xs file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:cursor-pointer cursor-pointer"
                      style={{ color: COLORS.muted }}
                    />
                  </div>

                  {importParseError[type] && (
                    <div className="rounded-lg px-3 py-2 text-xs font-medium" style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>
                      {importParseError[type]}
                    </div>
                  )}

                  {importParsed[type] && (
                    <div className="space-y-3">
                      <p className="text-xs font-medium" style={{ color: COLORS.muted }}>
                        {importParsed[type].length} question{importParsed[type].length !== 1 ? 's' : ''} ready to import
                      </p>
                      <div className="rounded-xl border overflow-hidden overflow-x-auto" style={{ borderColor: COLORS.border }}>
                        <table className="w-full text-xs">
                          <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                              {type === 'mcq' && (<><th className="px-3 py-2 text-left font-semibold" style={{ color: COLORS.muted }}>#</th><th className="px-3 py-2 text-left font-semibold" style={{ color: COLORS.muted }}>Question</th><th className="px-3 py-2 text-left font-semibold" style={{ color: COLORS.muted }}>Correct Answer</th><th className="px-3 py-2 text-left font-semibold" style={{ color: COLORS.muted }}>Pts</th></>)}
                              {type === 'debug' && (<><th className="px-3 py-2 text-left font-semibold" style={{ color: COLORS.muted }}>#</th><th className="px-3 py-2 text-left font-semibold" style={{ color: COLORS.muted }}>Title</th><th className="px-3 py-2 text-left font-semibold" style={{ color: COLORS.muted }}>Expected Output</th><th className="px-3 py-2 text-left font-semibold" style={{ color: COLORS.muted }}>Pts</th></>)}
                              {type === 'coding' && (<><th className="px-3 py-2 text-left font-semibold" style={{ color: COLORS.muted }}>#</th><th className="px-3 py-2 text-left font-semibold" style={{ color: COLORS.muted }}>Title</th><th className="px-3 py-2 text-left font-semibold" style={{ color: COLORS.muted }}>Test Cases</th><th className="px-3 py-2 text-left font-semibold" style={{ color: COLORS.muted }}>Pts</th></>)}
                            </tr>
                          </thead>
                          <tbody>
                            {importParsed[type].slice(0, 20).map((q, i) => (
                              <tr key={i} className="border-t" style={{ borderColor: COLORS.border }}>
                                {type === 'mcq' && (<><td className="px-3 py-2" style={{ color: COLORS.muted }}>{i + 1}</td><td className="px-3 py-2 max-w-xs truncate">{q.question ?? '—'}</td><td className="px-3 py-2 max-w-[200px] truncate">{Array.isArray(q.options) ? (q.options[q.correctAnswer] ?? '?') : '—'}</td><td className="px-3 py-2">{q.points ?? '—'}</td></>)}
                                {type === 'debug' && (<><td className="px-3 py-2" style={{ color: COLORS.muted }}>{i + 1}</td><td className="px-3 py-2 max-w-xs truncate">{q.title ?? '—'}</td><td className="px-3 py-2 max-w-[200px] truncate font-mono">{q.expectedOutput ?? '—'}</td><td className="px-3 py-2">{q.points ?? '—'}</td></>)}
                                {type === 'coding' && (<><td className="px-3 py-2" style={{ color: COLORS.muted }}>{i + 1}</td><td className="px-3 py-2 max-w-xs truncate">{q.title ?? '—'}</td><td className="px-3 py-2">{Array.isArray(q.testCases) ? q.testCases.length : '—'}</td><td className="px-3 py-2">{q.points ?? '—'}</td></>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {importParsed[type].length > 20 && (
                          <div className="px-3 py-2 text-xs text-center" style={{ color: COLORS.muted, borderTop: `1px solid ${COLORS.border}` }}>
                            ...and {importParsed[type].length - 20} more
                          </div>
                        )}
                      </div>

                      <button disabled={importLoading} onClick={() => handleImportAll(type)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                        style={{ background: COLORS.accent, color: '#fff' }}>
                        <Icon name={importLoading ? 'refresh' : 'upload'} className={`w-4 h-4 ${importLoading ? 'animate-spin' : ''}`} />
                        {importLoading ? 'Importing...' : `Import ${importParsed[type].length} Question${importParsed[type].length !== 1 ? 's' : ''}`}
                      </button>
                    </div>
                  )}

                  {importResult[type] && (
                    (() => {
                      const r = importResult[type];
                      if (!r.ok) return (
                        <div className="rounded-lg px-3 py-2 text-xs font-medium" style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>
                          {r.error}
                        </div>
                      );
                      const allOk = r.failed === 0;
                      const color = allOk ? '#86efac' : '#fde68a';
                      const bg = allOk ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)';
                      const border = allOk ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)';
                      return (
                        <div className="rounded-lg px-3 py-2 text-xs space-y-1" style={{ background: bg, color, border: `1px solid ${border}` }}>
                          <div className="font-semibold">{r.imported} imported, {r.failed} failed</div>
                          {r.errors?.length > 0 && (
                            <ul className="list-disc list-inside space-y-0.5 opacity-80">
                              {r.errors.map((e, i) => <li key={i}>{e}</li>)}
                            </ul>
                          )}
                        </div>
                      );
                    })()
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {activeMenu === 'scores' && (
          <section className="rounded-2xl border p-4" style={{ background: COLORS.card, borderColor: COLORS.border }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold">Scores &amp; Times</h3>
                <p className="text-xs mt-1" style={{ color: COLORS.muted }}>All student performance data. Click Override to adjust scores.</p>
              </div>
              <button
                onClick={fetchScores}
                disabled={scoresLoading}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold"
                style={{ borderColor: COLORS.border, background: COLORS.card }}
              >
                <Icon name="refresh" className={`w-3.5 h-3.5 ${scoresLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            <div className="rounded-xl border overflow-hidden mb-4" style={{ borderColor: COLORS.border }}>
              <div className="px-3 py-2 text-xs font-semibold" style={{ background: '#0f172a', color: '#cbd5e1' }}>
                Live Rankings (Top 5)
              </div>
              <div className="overflow-auto">
                <table className="w-full text-sm min-w-[520px]">
                  <thead style={{ background: 'rgba(15,23,42,0.75)' }}>
                    <tr>
                      {['Rank', 'Name', 'Total Score', 'Status'].map((h) => (
                        <th key={h} className="text-left px-3 py-2 font-semibold" style={{ color: '#cbd5e1' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {liveRankings.slice(0, 5).map((row) => (
                      <tr key={`${row.rollNo}-${row.rank}`} className="border-t" style={{ borderColor: COLORS.border }}>
                        <td className="px-3 py-2">#{row.rank}</td>
                        <td className="px-3 py-2">{row.name}</td>
                        <td className="px-3 py-2 font-semibold">{Number(row.totalScore || 0)}</td>
                        <td className="px-3 py-2" style={{ color: COLORS.muted }}>{row.status}</td>
                      </tr>
                    ))}
                    {!liveRankings.length && (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center" style={{ color: COLORS.muted }}>
                          No ranked students yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {scoresLoading && !scoresData.length ? (
              <div className="py-10 text-center text-sm" style={{ color: COLORS.muted }}>
                <span className="inline-flex items-center gap-2"><Icon name="refresh" className="w-4 h-4 animate-spin" /> Loading scores...</span>
              </div>
            ) : (
              <div className="overflow-auto rounded-xl border" style={{ borderColor: COLORS.border }}>
                <table className="w-full text-sm min-w-[1200px]">
                  <thead style={{ background: '#0f172a' }}>
                    <tr>
                      {['Rank', 'Name', 'Roll No', 'Status', 'R1 Score', 'R1 Time', 'R2 Score', 'R2 Time', 'R3 Score', 'R3 Time', 'Total Time', 'Actions'].map((h) => (
                        <th key={h} className="text-left px-3 py-3 font-semibold" style={{ color: '#cbd5e1' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {scoresData.map((row) => {
                      const isFinished   = Boolean(row.codingCompletedAt);
                      const isTerminated = Boolean(row.terminated);
                      const isEliminated = Boolean(row.eliminated);

                      const statusBadge = isFinished
                        ? { label: 'Finished',   cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' }
                        : isTerminated
                        ? { label: 'Terminated', cls: 'bg-red-500/15 text-red-300 border-red-500/30' }
                        : isEliminated
                        ? { label: 'Eliminated', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' }
                        : { label: 'Active',     cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30' };

                      const r1Time = row.r1TimeTaken || ((isEliminated || isTerminated) ? 'DNF' : '--');
                      const r2Time = row.r2TimeTaken || ((isEliminated || isTerminated) && row.mcqCompletedAt ? 'DNF' : '--');
                      const r3Time = row.r3TimeTaken || ((isEliminated || isTerminated) && row.debugCompletedAt ? 'DNF' : '--');
                      const totalTimeDisplay = row.totalTime || '--';
                      const timeColor = (t) => t === 'DNF' ? '#fca5a5' : t === '--' ? COLORS.muted : '#86efac';

                      return (
                        <Fragment key={row._id}>
                          <tr className="border-t hover:bg-slate-800/35" style={{ borderColor: COLORS.border }}>
                            <td className="px-3 py-3 font-mono">{row.finalRank ?? '--'}</td>
                            <td className="px-3 py-3 font-medium">{row.name}</td>
                            <td className="px-3 py-3 text-slate-300">{row.rollNo}</td>
                            <td className="px-3 py-3">
                              <span className={`px-2 py-1 rounded-full border text-xs font-semibold ${statusBadge.cls}`}>
                                {statusBadge.label}
                              </span>
                            </td>
                            <td className="px-3 py-3 font-semibold">{row.r1Score}</td>
                            <td className="px-3 py-3 font-mono" style={{ color: timeColor(r1Time) }}>{r1Time}</td>
                            <td className="px-3 py-3 font-semibold">{row.r2Score}</td>
                            <td className="px-3 py-3 font-mono" style={{ color: timeColor(r2Time) }}>{r2Time}</td>
                            <td className="px-3 py-3 font-semibold">{row.r3Score}</td>
                            <td className="px-3 py-3 font-mono" style={{ color: timeColor(r3Time) }}>{r3Time}</td>
                            <td className="px-3 py-3 font-mono" style={{ color: totalTimeDisplay === '--' ? COLORS.muted : '#fcd34d' }}>{totalTimeDisplay}</td>
                            <td className="px-3 py-3">
                              <button
                                className="px-2 py-1 rounded border text-xs hover:bg-blue-500/15"
                                style={{ borderColor: 'rgba(59,130,246,0.35)', color: '#bfdbfe' }}
                                onClick={() => openOverrideFor({ _id: row._id, r1: { score: row.r1Score }, r2: { score: row.r2Score }, r3: { score: row.r3Score } })}
                              >
                                <span className="inline-flex items-center gap-1"><Icon name="edit" className="w-3 h-3" />Override</span>
                              </button>
                            </td>
                          </tr>

                          {overrideOpenId === row._id && (
                            <tr className="border-t" style={{ borderColor: COLORS.border, background: 'rgba(15,23,42,0.7)' }}>
                              <td colSpan={12} className="px-3 py-4">
                                <div className="rounded-xl border p-4" style={{ borderColor: COLORS.border, background: COLORS.card }}>
                                  <h4 className="text-sm font-semibold mb-3">Override Score: {row.name}</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                                    <div>
                                      <label className="block text-xs font-semibold mb-1" style={{ color: COLORS.muted }}>Round 1 Score</label>
                                      <input type="number" min="0" className="w-full rounded-lg px-3 py-2 border outline-none" style={{ background: '#0f172a', borderColor: COLORS.border, color: COLORS.text }} value={overrideForm.r1Score} onChange={(e) => setOverrideForm((prev) => ({ ...prev, r1Score: e.target.value }))} />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-semibold mb-1" style={{ color: COLORS.muted }}>Round 2 Score</label>
                                      <input type="number" min="0" className="w-full rounded-lg px-3 py-2 border outline-none" style={{ background: '#0f172a', borderColor: COLORS.border, color: COLORS.text }} value={overrideForm.r2Score} onChange={(e) => setOverrideForm((prev) => ({ ...prev, r2Score: e.target.value }))} />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-semibold mb-1" style={{ color: COLORS.muted }}>Round 3 Score</label>
                                      <input type="number" min="0" className="w-full rounded-lg px-3 py-2 border outline-none" style={{ background: '#0f172a', borderColor: COLORS.border, color: COLORS.text }} value={overrideForm.r3Score} onChange={(e) => setOverrideForm((prev) => ({ ...prev, r3Score: e.target.value }))} />
                                    </div>
                                  </div>
                                  {row.overrideLog?.length > 0 && (
                                    <div className="mb-4">
                                      <div className="text-xs font-semibold mb-1" style={{ color: COLORS.muted }}>Override History</div>
                                      <div className="space-y-1 max-h-32 overflow-y-auto">
                                        {[...row.overrideLog].reverse().map((entry, idx) => (
                                          <div key={idx} className="text-xs rounded px-2 py-1 border" style={{ borderColor: COLORS.border, color: '#cbd5e1' }}>
                                            {new Date(entry.changedAt).toLocaleString()} — R1: {entry.r1Score ?? '—'}, R2: {entry.r2Score ?? '—'}, R3: {entry.r3Score ?? '—'}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 justify-end">
                                    <button onClick={closeOverride} disabled={overrideSaving} className="px-3 py-2 rounded-lg border text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed" style={{ borderColor: COLORS.border, color: '#cbd5e1', background: '#334155' }}>Cancel</button>
                                    <button onClick={() => saveOverride(row._id)} disabled={overrideSaving} className="px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: COLORS.accent, color: '#052e16' }}>{overrideSaving ? 'Saving...' : 'Save Override'}</button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                    {!scoresData.length && !scoresLoading && (
                      <tr>
                        <td colSpan={12} className="px-3 py-8 text-center" style={{ color: COLORS.muted }}>
                          No student data available yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeMenu === 'settings' && (
          <section className="rounded-2xl border p-4" style={{ background: COLORS.card, borderColor: COLORS.border }}>
            <h3 className="text-sm font-semibold mb-3">Settings</h3>
            <div className="flex flex-wrap gap-2">
              <button disabled={busy} onClick={startContest} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: 'rgba(34,197,94,0.16)', color: '#bbf7d0', border: '1px solid rgba(34,197,94,0.35)' }}><Icon name={busy ? 'refresh' : 'play'} className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} />Start Contest</button>
              <button disabled={busy} onClick={pauseContest} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: 'rgba(245,158,11,0.16)', color: '#fde68a', border: '1px solid rgba(245,158,11,0.35)' }}><Icon name={busy ? 'refresh' : 'pause'} className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} />Pause Contest</button>
              <button disabled={busy} onClick={endContest} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: 'rgba(239,68,68,0.16)', color: '#fecaca', border: '1px solid rgba(239,68,68,0.35)' }}><Icon name={busy ? 'refresh' : 'stop'} className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} />End Contest</button>
              <button disabled={busy} onClick={resetContest} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: '#0f172a', color: '#cbd5e1', border: `1px solid ${COLORS.border}` }}><Icon name={busy ? 'refresh' : 'reset'} className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} />Reset Contest</button>
            </div>
          </section>
        )}
      </main>

      <QuestionModal
        open={modalOpen}
        type={modalType}
        editingQuestion={editingQuestion}
        onClose={closeQuestionModal}
        onSaved={handleQuestionSaved}
      />

      {restartConfirmRound && (
        <div className="fixed inset-0 bg-black/65 flex items-center justify-center p-4 z-[100]" onClick={() => setRestartConfirmRound(null)}>
          <div className="w-full max-w-xl rounded-2xl border p-5" style={{ background: COLORS.card, borderColor: COLORS.border }} onClick={(e) => e.stopPropagation()}>
            <h4 className="text-lg font-bold mb-2">Restart Round {restartConfirmRound}?</h4>
            <p className="text-sm" style={{ color: COLORS.muted }}>
              This will:
            </p>
            <ul className="text-sm mt-2 space-y-1 list-disc pl-5" style={{ color: COLORS.muted }}>
              <li>Set the current round back to Round {restartConfirmRound}</li>
              <li>Clear all student progress for Round {restartConfirmRound}</li>
              <li>Allow students to resubmit Round {restartConfirmRound} answers</li>
            </ul>
            <p className="text-sm mt-3" style={{ color: '#fca5a5' }}>This cannot be undone.</p>

            <div className="mt-4 flex items-center gap-2 justify-end">
              <button
                onClick={() => setRestartConfirmRound(null)}
                className="px-3 py-2 rounded-lg border text-sm font-semibold"
                style={{ borderColor: COLORS.border, color: '#cbd5e1', background: '#334155' }}
              >
                Cancel
              </button>
              <button
                onClick={restartRoundConfirmed}
                className="px-3 py-2 rounded-lg border text-sm font-semibold"
                style={{ borderColor: 'rgba(239,68,68,0.35)', color: '#fecaca', background: 'rgba(239,68,68,0.2)' }}
              >
                Yes, Restart
              </button>
            </div>
          </div>
        </div>
      )}

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
              <div>Progress: R2 solved {selectedProfile.r2?.solved?.length || 0} | R3 solved {selectedProfile.r3?.solved?.length || 0}</div>
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
      <Footer />
    </div>
  );
}
