// Security rules:
// TERMINATES: Alt+Tab (alt key + window blur), ESC key
// SILENTLY BLOCKS: right click, copy, paste, cut, F12, devtools shortcuts
// DOES NOTHING: clicking screen, window focus/blur without alt, visibility change

import { useEffect, useRef, useState, useCallback } from 'react';
import { BASE_URL } from '../utils/api';

export function useSecurity({ enabled, isTransitioning, startupGrace }) {
  const [isTerminated, setIsTerminated] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [securityActive, setSecurityActive] = useState(false);

  const isTerminatedRef = useRef(false);
  const altPressed = useRef(false);
  const securityActivated = useRef(false);
  const securityActiveRef = useRef(false);
  const detachRef = useRef(() => {});

  const removeAllListeners = useCallback(() => {
    detachRef.current();
  }, []);

  const reportViolation = useCallback(async (type, description) => {
    if (isTerminatedRef.current) return;
    if (startupGrace?.current) return;
    if (isTransitioning?.current) return;

    try {
      const token = localStorage.getItem('sc_token');
      const res = await fetch(`${BASE_URL}/api/students/me/violation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          type,
          description,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        // Server error/rate-limit/auth issue -> do not terminate or redirect here.
        console.warn('Violation report failed:', res.status);
        return;
      }

      const data = await res.json();
      setViolationCount(Number(data?.violationCount || 0));

      if (data?.terminated === true) {
        isTerminatedRef.current = true;
        setIsTerminated(true);
        setSecurityActive(false);
        removeAllListeners();
        sessionStorage.setItem('exitReason', 'terminated');
        sessionStorage.setItem('exitMessage', 'You were removed for a violation.');
        setTimeout(() => {
          window.location.href = '/login';
        }, 3000);
      }
      // terminated=false means warning only.
    } catch (err) {
      // Network error -> do not terminate.
      console.warn('Could not report violation:', err);
    }
  }, [isTransitioning, removeAllListeners, startupGrace]);

  useEffect(() => {
    if (isTerminatedRef.current) return;

    const opts = { capture: true };
    let listenersAttached = false;
    let fullscreenGraceTimer = null;

    const onKeyDown = (e) => {
      const k = e.key;
      const code = e.code;
      const ctrlOrMeta = e.ctrlKey || e.metaKey;

      if (k === 'Alt') {
        altPressed.current = true;
      }

      if (k === 'Escape' || code === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        reportViolation('escape_key', 'Student pressed Escape key');
        return;
      }

      if (k === 'F12') { e.preventDefault(); return; }

      if (ctrlOrMeta && e.shiftKey && ['i', 'I', 'j', 'J', 'c', 'C'].includes(k)) {
        e.preventDefault();
        return;
      }

      if (ctrlOrMeta && ['u', 'U', 's', 'S', 'a', 'A'].includes(k)) {
        e.preventDefault();
        return;
      }

      if (ctrlOrMeta && ['c', 'C', 'v', 'V', 'x', 'X'].includes(k)) {
        e.preventDefault();
      }
    };

    const onKeyUp = () => {
      altPressed.current = false;
    };

    const onBlur = () => {
      if (startupGrace?.current) return;
      if (isTransitioning?.current) return;
      if (!securityActiveRef.current) return;

      if (altPressed.current) {
        altPressed.current = false;
        reportViolation('alt_tab', 'Student used Alt+Tab to switch away');
      }
    };

    const onFullscreenChange = () => {
      // Never fire during startup grace period.
      if (startupGrace?.current) return;
      // Never fire during transitions.
      if (isTransitioning?.current) return;
      // Never fire if security not active yet.
      if (!securityActiveRef.current) return;

      if (fullscreenGraceTimer) {
        clearTimeout(fullscreenGraceTimer);
        fullscreenGraceTimer = null;
      }

      if (!document.fullscreenElement) {
        fullscreenGraceTimer = setTimeout(() => {
          if (
            !document.fullscreenElement &&
            !startupGrace?.current &&
            !isTransitioning?.current
          ) {
            reportViolation('fullscreen_exit', 'Student exited fullscreen');
          }
        }, 1500);
      }
    };

    const onContextMenu = (e) => { e.preventDefault(); };
    const onCopy = (e) => { e.preventDefault(); };
    const onCut = (e) => { e.preventDefault(); };
    const onPaste = (e) => { e.preventDefault(); };

    const attachListeners = () => {
      if (listenersAttached || isTerminatedRef.current) return;

      window.addEventListener('keydown', onKeyDown, opts);
      document.addEventListener('keydown', onKeyDown, opts);
      window.addEventListener('keyup', onKeyUp, opts);
      window.addEventListener('blur', onBlur, opts);
      document.addEventListener('fullscreenchange', onFullscreenChange, opts);
      document.addEventListener('contextmenu', onContextMenu, opts);
      document.addEventListener('copy', onCopy, opts);
      document.addEventListener('cut', onCut, opts);
      document.addEventListener('paste', onPaste, opts);

      listenersAttached = true;
      securityActiveRef.current = true;
      setSecurityActive(true);
    };

    if (enabled && securityActivated.current) {
      attachListeners();
    }

    const activationTimer = enabled && !securityActivated.current
      ? setTimeout(() => {
          securityActivated.current = true;
          attachListeners();
        }, 3000)
      : null;

    const cleanup = () => {
      if (activationTimer) clearTimeout(activationTimer);
      if (fullscreenGraceTimer) clearTimeout(fullscreenGraceTimer);

      if (listenersAttached) {
        window.removeEventListener('keydown', onKeyDown, opts);
        document.removeEventListener('keydown', onKeyDown, opts);
        window.removeEventListener('keyup', onKeyUp, opts);
        window.removeEventListener('blur', onBlur, opts);
        document.removeEventListener('fullscreenchange', onFullscreenChange, opts);
        document.removeEventListener('contextmenu', onContextMenu, opts);
        document.removeEventListener('copy', onCopy, opts);
        document.removeEventListener('cut', onCut, opts);
        document.removeEventListener('paste', onPaste, opts);
      }

      listenersAttached = false;
      securityActiveRef.current = false;
      if (isTerminatedRef.current || !enabled) {
        setSecurityActive(false);
      }
    };

    detachRef.current = cleanup;

    return () => {
      cleanup();
      detachRef.current = () => {};
    };
  }, [enabled, isTransitioning, reportViolation, startupGrace]);

  return { isTerminated, violationCount, securityActive };
}
