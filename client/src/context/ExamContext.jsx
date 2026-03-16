import { createContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';

const ExamContext = createContext(null);

export function ExamProvider({ children }) {
  const { student } = useAuth();

  const [examState, setExamState]     = useState(null);
  const [mcqs, setMcqs]               = useState([]);
  const [debugProblems, setDebugProbs] = useState([]);
  const [codingProblems, setCodingProbs] = useState([]);
  const [currentRound, setCurrentRound] = useState(() => student?.currentRound || 1);
  const [paused, setPaused]           = useState(false);
  const [timeLeft, setTimeLeft]       = useState(null); // ms
  const [problemErrors, setProblemErrors] = useState({ mcq: null, debug: null, coding: null });
  const [problemsLoading, setProblemsLoading] = useState(false);
  const timerRef                      = useRef(null);
  const pollRef                       = useRef(null);

  // Load all problems — each endpoint is fetched independently so a 403
  // (round not yet unlocked) on one endpoint doesn't prevent the others loading.
  const loadProblems = useCallback(async () => {
    setProblemsLoading(true);
    const fetchOne = async (url) => {
      try {
        const { data } = await api.get(url);
        return { data, error: null };
      } catch (err) {
        const msg = err.response?.data?.error || 'Failed to load questions';
        console.warn('[ExamContext] fetch error for', url, msg);
        return { data: null, error: msg };
      }
    };
    const [m, d, c] = await Promise.all([
      fetchOne('/problems/mcq'),
      fetchOne('/problems/debug'),
      fetchOne('/problems/coding'),
    ]);
    if (m.data) { setMcqs(m.data);      setProblemErrors(prev => ({ ...prev, mcq:   null })); }
    else        {                        setProblemErrors(prev => ({ ...prev, mcq:   m.error })); }
    if (d.data) { setDebugProbs(d.data); setProblemErrors(prev => ({ ...prev, debug: null })); }
    else        {                        setProblemErrors(prev => ({ ...prev, debug: d.error })); }
    if (c.data) { setCodingProbs(c.data); setProblemErrors(prev => ({ ...prev, coding: null })); }
    else        {                         setProblemErrors(prev => ({ ...prev, coding: c.error })); }
    setProblemsLoading(false);
  }, []);

  // Poll timer state from server.
  const pollTimer = useCallback(async () => {
    try {
      const { data } = await api.get('/timer');
      setPaused(data.paused);
      setExamState(prev => ({ ...prev, ...data }));

      const endTimeKey = `r${currentRound}`;
      const endTime = data.roundEndTimes?.[endTimeKey];
      if (endTime) {
        const remaining = Math.max(0, endTime - Date.now());
        setTimeLeft(remaining);
      }
    } catch {}
  }, [currentRound]);

  // Start polling only while the exam is actively running in the current tab.
  useEffect(() => {
    if (!student) return;

    const pollIfActive = () => {
      const examStarted = sessionStorage.getItem('sc_exam_started') === '1';
      if (!examStarted) return;
      pollTimer();
    };

    pollIfActive();
    pollRef.current = setInterval(pollIfActive, 10000);
    return () => clearInterval(pollRef.current);
  }, [student, pollTimer]);

  useEffect(() => {
    if (!student) return;
    if (Number(student.currentRound || 1) !== Number(currentRound || 1)) {
      setCurrentRound(Number(student.currentRound || 1));
    }
  }, [student, currentRound]);

  // Local countdown
  useEffect(() => {
    clearInterval(timerRef.current);
    if (!timeLeft || paused) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1000) { clearInterval(timerRef.current); return 0; }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timeLeft, paused]);

  const formatTime = (ms) => {
    if (ms === null) return '--:--';
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };

  const resetExamState = useCallback(() => {
    setExamState(null);
    setMcqs([]);
    setDebugProbs([]);
    setCodingProbs([]);
    setCurrentRound(student?.currentRound || 1);
    setPaused(false);
    setTimeLeft(null);
    setProblemErrors({ mcq: null, debug: null, coding: null });
  }, [student]);

  return (
    <ExamContext.Provider value={{
      examState, setExamState,
      mcqs, debugProblems, codingProblems,
      currentRound, setCurrentRound,
      paused,
      timeLeft, formatTime,
      loadProblems,
      problemErrors,
      problemsLoading,
      resetExamState,
    }}>
      {children}
    </ExamContext.Provider>
  );
}

export default ExamContext;
