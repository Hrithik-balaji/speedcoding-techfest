import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useExam } from '../hooks/useExam';
import { useSecurity } from '../hooks/useSecurity';
import Navbar        from '../components/Navbar';
import RulesModal    from '../components/RulesModal';
import PausedOverlay from '../components/PausedOverlay';
import TerminatedOverlay from '../components/TerminatedOverlay';
import EliminatedOverlay from '../components/EliminatedOverlay';
import MCQRound      from '../components/MCQRound';
import api           from '../utils/api';

const CodingRound = lazy(() => import('../components/CodingRound'));
const DebugRound  = lazy(() => import('../components/DebugRound'));

export default function ExamPage() {
  const { student, logout, refreshStudent } = useAuth();
  const {
    currentRound,
    setCurrentRound,
    paused,
    timeLeft,
    formatTime,
    loadProblems,
    resetExamState,
    mcqs,
    debugProblems,
    codingProblems,
    problemErrors,
    problemsLoading,
  } = useExam()
  const navigate = useNavigate();

  const [examStarted, setExamStarted]     = useState(false);
  const [examReady, setExamReady]         = useState(false);
  const [profileConfirmed, setProfileConfirmed] = useState(false);
  const [showRules, setShowRules]         = useState(true);
  // ── Sticky timer bar ────────────────────────────────────────
  const [displayMs, setDisplayMs]     = useState(null);
  const [timerPaused, setTimerPaused] = useState(false);
  const [roundEnded, setRoundEnded]   = useState(false);
  const remainingRef = useRef(null);

  const formatMs = (ms) => {
    if (ms === null) return '--:--';
    const total = Math.max(0, Math.floor(ms / 1000));
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  };

  // Poll /api/timer every 10 s — drives the sticky bar
  useEffect(() => {
    if (!examStarted) return;
    const poll = async () => {
      try {
        const { data } = await api.get('/timer');
        const endTime  = data.roundEndTimes?.[`r${currentRound}`];
        const force    = !!data.forceEnded?.[`r${currentRound}`];
        const isPaused = !!data.paused;
        const ms = force ? 0 : endTime ? Math.max(0, endTime - Date.now()) : null;
        setTimerPaused(isPaused);
        remainingRef.current = ms;
        setDisplayMs(ms);
        if (ms !== null && ms <= 0) setRoundEnded(true);
      } catch {}
    };
    poll();
    const id = setInterval(poll, 10000);
    return () => clearInterval(id);
  }, [examStarted, currentRound]);

  // 1 s local countdown between polls
  useEffect(() => {
    if (!examStarted) return;
    const id = setInterval(() => {
      if (timerPaused || remainingRef.current === null) return;
      const next = Math.max(0, remainingRef.current - 1000);
      remainingRef.current = next;
      setDisplayMs(next);
      if (next <= 0) setRoundEnded(true);
    }, 1000);
    return () => clearInterval(id);
  }, [examStarted, timerPaused]);

  // Reset timer display when the active round changes
  useEffect(() => {
    remainingRef.current = null;
    setDisplayMs(null);
    setRoundEnded(false);
  }, [currentRound]);

  console.log('[ExamPage] Rendering, currentRound:', currentRound, '| examStarted:', examStarted);


  const {
    isTerminated,
    violationCount,
  } = useSecurity({ enabled: examReady && Number(currentRound || 0) >= 1 });

  useEffect(() => {
    if (!examReady || Number(currentRound || 0) < 1) return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, [examReady, currentRound]);

  useEffect(() => {
    if (!examStarted || showRules || !student || !profileConfirmed) {
      setExamReady(false);
      return;
    }

    const hasToken = !!localStorage.getItem('sc_token');
    if (!hasToken || Number(currentRound || 0) < 1 || problemsLoading) {
      setExamReady(false);
      return;
    }

    const roundKey = currentRound === 1 ? 'mcq' : currentRound === 2 ? 'debug' : 'coding';
    const roundError = problemErrors?.[roundKey];
    const hasRoundQuestions =
      currentRound === 1 ? mcqs.length > 0 :
      currentRound === 2 ? debugProblems.length > 0 :
      codingProblems.length > 0;

    setExamReady(!roundError && hasRoundQuestions);
  }, [
    examStarted,
    showRules,
    student,
    profileConfirmed,
    currentRound,
    problemsLoading,
    problemErrors,
    mcqs,
    debugProblems,
    codingProblems,
  ]);

  useEffect(() => {
    if (!isTerminated) return;

    setExamStarted(false);
    setRoundEnded(false);
    setDisplayMs(null);
    remainingRef.current = null;
    setCurrentRound(1);
    setShowRules(false);
    resetExamState();

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, [isTerminated, resetExamState, setCurrentRound]);

  const handleBeginExam = async () => {
    sessionStorage.removeItem('sc_terminated');
    setExamReady(false);
    setProfileConfirmed(false);
    try {
      await document.documentElement.requestFullscreen();
    } catch {}
    setShowRules(false);
    setExamStarted(true);
    try {
      await refreshStudent?.();
      setProfileConfirmed(true);
    } catch {
      setProfileConfirmed(false);
    }
    await loadProblems();
  };

  const handleRoundSwitch = async (r) => {
    setCurrentRound(r);
  };

  const handleRoundComplete = async (nextRound) => {
    await loadProblems();
    setCurrentRound(nextRound);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('sc_terminated');
    setProfileConfirmed(false);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    logout();
    navigate('/', { replace: true });
  };

  if (!student) return null;

  if (student?.eliminated) {
    return <EliminatedOverlay round={student.currentRound || 1} />;
  }

  if (examReady && student?.terminated) {
    return <TerminatedOverlay reason={student.terminatedReason} violationCount={student.violationCount} />;
  }

  if (isTerminated) {
    return (
      <TerminatedOverlay
        violationCount={violationCount}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Rules modal */}
      {showRules && (
        <RulesModal onBegin={handleBeginExam} />
      )}

      {/* Paused overlay */}
      {paused && examStarted && <PausedOverlay />}

      {/* Navbar */}
      <Navbar
        currentRound={currentRound}
        onSwitchRound={handleRoundSwitch}
        timeLeft={timeLeft}
        formatTime={formatTime}
        studentName={student.name}
        onLogout={handleLogout}
      />

      {/* Main content */}
      {/* Sticky timer bar — only shown once exam begins */}
      {examStarted && (
        <div
          className="flex items-center justify-center gap-3 py-1.5 flex-shrink-0 z-40"
          style={{
            background:   roundEnded ? '#1a0808' : displayMs !== null && displayMs < 300000 ? '#160f00' : '#080e1c',
            borderBottom: `1px solid ${roundEnded ? 'rgba(127,29,29,0.7)' : displayMs !== null && displayMs < 300000 ? 'rgba(120,53,15,0.7)' : '#1e2d45'}`,
          }}
        >
          {roundEnded ? (
            <span className="text-sm font-semibold tracking-wide" style={{ color: '#f87171' }}>
              🔒 Round has ended — submissions are closed
            </span>
          ) : (
            <>
              <svg
                className="w-3.5 h-3.5 opacity-80"
                style={{ color: displayMs !== null && displayMs < 300000 ? '#ef4444' : '#475569' }}
                fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 6v6l3.5 2" />
              </svg>
              <span
                className="font-mono font-bold text-sm tabular-nums"
                style={{ color: displayMs !== null && displayMs < 300000 ? '#ef4444' : '#94a3b8' }}
              >
                {formatMs(displayMs)}
              </span>
              {timerPaused && (
                <span className="text-xs font-semibold" style={{ color: '#fbbf24' }}>PAUSED</span>
              )}
              <span className="text-xs" style={{ color: '#475569' }}>
                Round {currentRound} | time remaining
              </span>
            </>
          )}
        </div>
      )}

      {/* Main content */}
      <div className={`flex-1 overflow-hidden relative${roundEnded && examStarted ? ' pointer-events-none select-none' : ''}`}>
        {roundEnded && examStarted && (
          <div className="absolute inset-0 z-30 flex items-start justify-center pt-16" style={{ background: 'rgba(0,0,0,0.35)' }}>
            <div
              className="rounded-xl px-8 py-5 text-center shadow-2xl"
              style={{ background: '#1a0808', border: '1px solid rgba(127,29,29,0.6)' }}
            >
              <div className="text-3xl mb-2">🔒</div>
              <div className="text-lg font-bold mb-1" style={{ color: '#f87171' }}>Round has ended</div>
              <div className="text-sm" style={{ color: '#64748b' }}>Submissions are closed. Please wait for the proctor.</div>
            </div>
          </div>
        )}
        {currentRound === 1 && <MCQRound />}
        {(currentRound === 2 || currentRound === 3) && (
          <Suspense fallback={<div className="h-full flex items-center justify-center text-muted">Loading editor...</div>}>
            {currentRound === 2 && <DebugRound  onRoundComplete={() => handleRoundComplete(3)} />}
            {currentRound === 3 && <CodingRound roundType="coding" />}
          </Suspense>
        )}
      </div>
    </div>
  );
}
