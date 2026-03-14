import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useExam } from '../hooks/useExam';
import { useSecurity } from '../hooks/useSecurity';
import Navbar        from '../components/Navbar';
import RulesModal    from '../components/RulesModal';
import PausedOverlay from '../components/PausedOverlay';
import MCQRound      from '../components/MCQRound';
import toast         from 'react-hot-toast';

const CodingRound = lazy(() => import('../components/CodingRound'));

export default function ExamPage() {
  const { student, logout } = useAuth();
  const { currentRound, setCurrentRound, paused, timeLeft, formatTime } = useExam();
  const navigate = useNavigate();

  const [examStarted, setExamStarted]     = useState(false);
  const [showRules, setShowRules]         = useState(true);
  const terminatedRef = useRef(false);

  const handleTerminate = useCallback((reason) => {
    if (terminatedRef.current) return;
    terminatedRef.current = true;
    toast.error(`Exam terminated: ${reason}`);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    logout();
    navigate('/', { replace: true });
  }, [logout, navigate]);

  const handleWarn = useCallback((type) => {
    toast('⚠️ WARNING: ' + type + ' detected.', {
      duration: 6000,
      icon: '⚠️',
      style: { background: '#2a1a00', color: '#FFA116', border: '1px solid #FFA116' },
    });
  }, []);

  const { enterFullscreen } = useSecurity({
    active: examStarted,
    student,
    onTerminate: handleTerminate,
    onWarn: handleWarn,
  });

  const handleBeginExam = async () => {
    try {
      await enterFullscreen();
    } catch {}
    setShowRules(false);
    setExamStarted(true);
  };

  const handleRoundSwitch = async (r) => {
    setCurrentRound(r);
  };

  const handleLogout = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    logout();
    navigate('/', { replace: true });
  };

  if (!student) return null;

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
      <div className="flex-1 overflow-hidden">
        {currentRound === 1 && <MCQRound />}
        {(currentRound === 2 || currentRound === 3) && (
          <Suspense fallback={<div className="h-full flex items-center justify-center text-muted">Loading editor...</div>}>
            {currentRound === 2 && <CodingRound roundType="debug" />}
            {currentRound === 3 && <CodingRound roundType="coding" />}
          </Suspense>
        )}
      </div>
    </div>
  );
}
