import { useEffect, useRef, useState } from 'react';
import api from '../utils/api';

export default function WakeUpScreen({ onReady }) {
  const [status, setStatus]               = useState('checking');
  const [attempts, setAttempts]           = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const pingIntervalRef    = useRef(null);
  const elapsedIntervalRef = useRef(null);
  const readyTimeoutRef    = useRef(null);
  // Prevents double-fire if two in-flight pings both succeed.
  const doneRef = useRef(false);
  // Stores the latest onReady so we call the current prop even if it changes,
  // without re-running the ping effect.
  const onReadyRef = useRef(onReady);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);

  // Clear all intervals/timeouts when status reaches 'online'.
  useEffect(() => {
    if (status !== 'online') return;
    if (pingIntervalRef.current)    clearInterval(pingIntervalRef.current);
    if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
  }, [status]);

  // Global cleanup on unmount.
  useEffect(() => {
    return () => {
      doneRef.current = true;
      if (pingIntervalRef.current)    clearInterval(pingIntervalRef.current);
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      if (readyTimeoutRef.current)    clearTimeout(readyTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    // In local dev the backend is always running — skip straight to the app.
    if (import.meta.env.DEV) {
      if (!doneRef.current) {
        doneRef.current = true;
        onReadyRef.current();
      }
      return;
    }

    // Count elapsed seconds while waiting
    elapsedIntervalRef.current = setInterval(() => {
      setElapsedSeconds(s => s + 1);
    }, 1000);

    let firstAttemptDone = false;

    const ping = async () => {
      if (doneRef.current) return;
      try {
        const { data } = await api.get('/ping');
        if (data?.status === 'ok' && !doneRef.current) {
          doneRef.current = true;
          clearInterval(pingIntervalRef.current);
          clearInterval(elapsedIntervalRef.current);
          setStatus('online');
          readyTimeoutRef.current = setTimeout(() => {
            onReadyRef.current();
          }, 800);
        }
      } catch {
        if (!doneRef.current) {
          if (!firstAttemptDone) {
            firstAttemptDone = true;
            setStatus('waking');
          }
          setAttempts(a => a + 1);
        }
      }
    };

    // Fire immediately, then every 3 s.
    ping();
    pingIntervalRef.current = setInterval(ping, 3000);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const formatElapsed = (s) => {
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  const progressWidth = `${Math.min(100, (elapsedSeconds / 60) * 100)}%`;

  /* ── Online ──────────────────────────────────────────────── */
  if (status === 'online') {
    return (
      <div className="fixed inset-0 bg-bg flex flex-col items-center justify-center gap-4">
        <svg className="w-12 h-12 text-easy" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h1 className="text-xl font-semibold text-text">You're all set!</h1>
        <p className="text-sm text-muted">Redirecting you now...</p>
      </div>
    );
  }

  /* ── Checking (first ping not done yet) ──────────────────── */
  if (status === 'checking') {
    return (
      <div className="fixed inset-0 bg-bg flex flex-col items-center justify-center gap-4">
        <svg className="w-10 h-10 text-accent animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <h1 className="text-xl font-semibold text-text">Starting up...</h1>
        <p className="text-sm text-muted">Connecting to server</p>
      </div>
    );
  }

  /* ── Waking (server sleeping, retrying) ──────────────────── */
  return (
    <div className="fixed inset-0 bg-bg flex flex-col items-center justify-center gap-6 px-6">
      <div className="flex flex-col items-center gap-2">
        <span className="text-4xl animate-pulse">⚡</span>
        <h1 className="text-xl font-semibold text-text">Waking up the server</h1>
        <p className="text-sm text-muted text-center">
          This takes about 30–60 seconds on first load
        </p>
      </div>

      <div className="w-full max-w-xs">
        <div className="h-1.5 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-1000"
            style={{ width: progressWidth }}
          />
        </div>
        <p className="text-xs text-muted text-center mt-2">
          Please wait... {formatElapsed(elapsedSeconds)}
        </p>
      </div>

      <div className="text-center text-sm text-muted space-y-1">
        <p>The server goes to sleep when inactive.</p>
        <p>It will be fully ready in a moment.</p>
      </div>

      {elapsedSeconds > 90 && (
        <p className="text-xs text-muted">Taking longer than usual... still trying</p>
      )}
    </div>
  );
}
