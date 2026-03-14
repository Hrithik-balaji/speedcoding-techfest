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
  const [currentRound, setCurrentRound] = useState(1);
  const [paused, setPaused]           = useState(false);
  const [timeLeft, setTimeLeft]       = useState(null); // ms
  const timerRef                      = useRef(null);
  const pollRef                       = useRef(null);

  // Load all problems
  const loadProblems = useCallback(async () => {
    try {
      const [m, d, c] = await Promise.all([
        api.get('/problems/mcq'),
        api.get('/problems/debug'),
        api.get('/problems/coding'),
      ]);
      setMcqs(m.data);
      setDebugProbs(d.data);
      setCodingProbs(c.data);
    } catch (err) { console.error('Failed to load problems', err); }
  }, []);

  // Poll timer state from server every 3s
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

  // Start polling
  useEffect(() => {
    if (!student) return;
    loadProblems();
    pollTimer();
    pollRef.current = setInterval(pollTimer, 3000);
    return () => clearInterval(pollRef.current);
  }, [student, pollTimer, loadProblems]);

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

  return (
    <ExamContext.Provider value={{
      examState, setExamState,
      mcqs, debugProblems, codingProblems,
      currentRound, setCurrentRound,
      paused,
      timeLeft, formatTime,
      loadProblems,
    }}>
      {children}
    </ExamContext.Provider>
  );
}

export default ExamContext;
