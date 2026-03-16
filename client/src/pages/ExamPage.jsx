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
  const { student, logout, refreshStudent, setStudent } = useAuth();
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
  const [showPromotionOverlay, setShowPromotionOverlay] = useState(false);
  const [promotionCountdown, setPromotionCountdown] = useState(null);
  const [promotionTargetRound, setPromotionTargetRound] = useState(null);
  const [contestCompleted, setContestCompleted] = useState(false);
  const remainingRef = useRef(null);
  const fullscreenActive = useRef(false);
  const isTransitioning = useRef(false);
  const promotionTimeoutRef = useRef(null);
  const promotionIntervalRef = useRef(null);
  const fullscreenRetryRef = useRef(null);

  const formatMs = (ms) => {
    if (ms === null) return '--:--';
    const total = Math.max(0, Math.floor(ms / 1000));
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  };

  const clearPromotionTimers = () => {
    if (promotionTimeoutRef.current) {
      clearTimeout(promotionTimeoutRef.current);
      promotionTimeoutRef.current = null;
    }
    if (promotionIntervalRef.current) {
      clearInterval(promotionIntervalRef.current);
      promotionIntervalRef.current = null;
    }
  };

  const requestExamFullscreen = async () => {
    if (document.fullscreenElement) {
      fullscreenActive.current = true;
      return;
    }

    try {
      await document.documentElement.requestFullscreen();
      fullscreenActive.current = true;
    } catch (e) {
      console.warn('Fullscreen failed:', e);
    }
  };

  const exitExamFullscreen = async () => {
    fullscreenActive.current = false;
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {}
    }
  };

  // Poll /api/timer every 10 s — drives the sticky bar
  useEffect(() => {
    if (!examStarted) return;
    const poll = async () => {
      try {
        const { data } = await api.get('/timer/status');
        const isPaused = !!data.paused;
        const ms = data.remainingMs === null || data.remainingMs === undefined
          ? null
          : Math.max(0, Number(data.remainingMs) || 0);
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
  } = useSecurity({
    enabled: examReady && Number(currentRound || 0) >= 1,
    isTransitioning,
  });

  useEffect(() => {
    if (!examReady || Number(currentRound || 0) < 1) return;
    if (fullscreenActive.current) return;

    requestExamFullscreen();
  }, [examReady, currentRound]);

  useEffect(() => {
    const handleFSChange = () => {
      if (document.fullscreenElement) {
        fullscreenActive.current = true;
        return;
      }

      if (!fullscreenActive.current) return;

      if (isTransitioning.current) {
        if (fullscreenRetryRef.current) clearTimeout(fullscreenRetryRef.current);
        fullscreenRetryRef.current = setTimeout(() => {
          document.documentElement.requestFullscreen()
            .then(() => {
              fullscreenActive.current = true;
            })
            .catch(() => {});
        }, 500);
      }
    };

    document.addEventListener('fullscreenchange', handleFSChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFSChange);
      if (fullscreenRetryRef.current) clearTimeout(fullscreenRetryRef.current);
    };
  }, []);

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

    exitExamFullscreen();
  }, [isTerminated, resetExamState, setCurrentRound]);

  useEffect(() => {
    if (!student?.terminated && !student?.eliminated) return;
    exitExamFullscreen();
  }, [student?.terminated, student?.eliminated]);

  useEffect(() => {
    if (!contestCompleted) return;

    const timer = setTimeout(() => {
      exitExamFullscreen();
    }, 2000);

    return () => clearTimeout(timer);
  }, [contestCompleted]);

  useEffect(() => {
    if (currentRound !== 1) return;
    import('@monaco-editor/react').catch(() => {});
  }, [currentRound]);

  useEffect(() => {
    return () => {
      clearPromotionTimers();
      if (fullscreenRetryRef.current) clearTimeout(fullscreenRetryRef.current);
    };
  }, []);

  const handleBeginExam = async () => {
    sessionStorage.removeItem('sc_terminated');
    setExamReady(false);
    setProfileConfirmed(false);
    setContestCompleted(false);
    await requestExamFullscreen();
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

  const handlePromotion = (nextRound) => {
    clearPromotionTimers();
    isTransitioning.current = true;
    setPromotionTargetRound(nextRound);
    setPromotionCountdown(3);
    setShowPromotionOverlay(true);

    promotionIntervalRef.current = setInterval(() => {
      setPromotionCountdown((prev) => {
        if (prev === null) return prev;
        return prev > 0 ? prev - 1 : 0;
      });
    }, 1000);

    promotionTimeoutRef.current = setTimeout(async () => {
      clearPromotionTimers();
      setStudent((prev) => (prev ? { ...prev, currentRound: nextRound } : prev));
      setCurrentRound(nextRound);
      setShowPromotionOverlay(false);
      setPromotionCountdown(null);
      setPromotionTargetRound(null);
      isTransitioning.current = false;
      await loadProblems();
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen()
          .then(() => {
            fullscreenActive.current = true;
          })
          .catch(() => {});
      }
    }, 3000);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('sc_terminated');
    setProfileConfirmed(false);
    exitExamFullscreen();
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
      {showPromotionOverlay && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-6" style={{ background: 'rgba(9, 20, 12, 0.96)' }}>
          <div className="w-full max-w-xl rounded-2xl border p-8 text-center" style={{ background: '#052e16', borderColor: 'rgba(34,197,94,0.45)' }}>
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-3xl font-extrabold mb-3" style={{ color: '#bbf7d0' }}>
              You have advanced to Round {promotionTargetRound}!
            </h1>
            <p className="text-lg font-semibold" style={{ color: '#dcfce7' }}>
              Round {promotionTargetRound} starts in {promotionCountdown ?? 3}...
            </p>
          </div>
        </div>
      )}

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
        {currentRound === 1 && <MCQRound onPromote={() => handlePromotion(2)} />}
        {(currentRound === 2 || currentRound === 3) && (
          <Suspense fallback={<div className="h-full flex items-center justify-center text-muted">Loading editor...</div>}>
            {currentRound === 2 && <DebugRound onRoundComplete={() => handlePromotion(3)} />}
            {currentRound === 3 && <CodingRound roundType="coding" onContestComplete={() => setContestCompleted(true)} />}
          </Suspense>
        )}
      </div>
    </div>
  );
}
