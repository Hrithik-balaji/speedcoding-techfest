import { useEffect, useRef, useCallback } from 'react';
import api from '../utils/api';

export function useSecurity({ active, student, onTerminate, onWarn }) {
  const warned = useRef(false);
  const devtoolsRef = useRef(false);
  const terminatedRef = useRef(false);

  const reportViolation = useCallback(async (type, round = 0) => {
    try {
      const { data } = await api.post('/students/me/violation', { type, round });
      if (data.warned) {
        onWarn(type);
        warned.current = true;
      }
    } catch {}
  }, [onTerminate, onWarn]);

  useEffect(() => {
    if (!active) return;
    terminatedRef.current = false;

    const terminateNow = (reason, round = 0) => {
      if (terminatedRef.current) return;
      terminatedRef.current = true;
      reportViolation(reason, round);
      onTerminate(reason);
    };

    // ── Block dangerous keys ──────────────────────────────────
    const onKeyDown = (e) => {
      const { key, ctrlKey, metaKey, shiftKey } = e;
      if (key === 'Escape') {
        e.preventDefault();
        terminateNow('Escape key pressed', 0);
        return;
      }
      if (key === 'F12') { e.preventDefault(); reportViolation('DevTools (F12)'); return; }
      if ((ctrlKey || metaKey) && shiftKey && ['i','I','j','J','c','C'].includes(key)) {
        e.preventDefault(); reportViolation('DevTools shortcut'); return;
      }
      if ((ctrlKey || metaKey) && key === 'u') { e.preventDefault(); reportViolation('View Source'); return; }
      if ((ctrlKey || metaKey) && (key === 'r' || key === 'R')) { e.preventDefault(); return; }
      if (key === 'F5') { e.preventDefault(); return; }
    };

    // ── Block right-click ─────────────────────────────────────
    const onContext = (e) => e.preventDefault();

    // ── Tab visibility ────────────────────────────────────────
    const onVisibility = () => {
      if (document.hidden) {
        if (!warned.current) { reportViolation('Tab switch (warning)'); }
        else { reportViolation('Tab switch (repeated)'); }
      }
    };

    // ── Window blur ───────────────────────────────────────────
    const onBlur = () => {
      if (!warned.current) { reportViolation('Window blur (warning)'); }
      else { reportViolation('Window blur (repeated)'); }
    };

    // ── Fullscreen exit ───────────────────────────────────────
    const onFullscreen = () => {
      if (!document.fullscreenElement) {
        if (!warned.current) { reportViolation('Fullscreen exited (warning)'); }
        else { reportViolation('Fullscreen exited (repeated)'); }
      }
    };

    // ── DevTools size detection ───────────────────────────────
    const devtoolsInterval = setInterval(() => {
      const threshold = 160;
      const open = window.outerWidth - window.innerWidth > threshold ||
                   window.outerHeight - window.innerHeight > threshold;
      if (open && !devtoolsRef.current) {
        devtoolsRef.current = true;
        reportViolation('DevTools detected');
      } else if (!open) {
        devtoolsRef.current = false;
      }
    }, 1500);

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('contextmenu', onContext);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFullscreen);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('contextmenu', onContext);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFullscreen);
      clearInterval(devtoolsInterval);
    };
  }, [active, reportViolation]);

  const enterFullscreen = useCallback(() => {
    return document.documentElement.requestFullscreen().catch(() => {});
  }, []);

  return { enterFullscreen };
}
