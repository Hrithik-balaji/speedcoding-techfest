// Security rules:
// TERMINATES: Alt+Tab (alt key + window blur), ESC key
// SILENTLY BLOCKS: right click, copy, paste, cut, F12, devtools shortcuts
// DOES NOTHING: clicking screen, window focus/blur without alt, visibility change

import { useEffect, useRef, useState, useCallback } from 'react';
import api from '../utils/api';

export function useSecurity({ enabled, isTransitioning }) {
  const [isTerminated, setIsTerminated] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [securityActive, setSecurityActive] = useState(false);

  const isTerminatedRef = useRef(false);
  const altPressed = useRef(false);
  const securityActivated = useRef(false);
  const detachRef = useRef(() => {});

  const detach = useCallback(() => {
    detachRef.current();
  }, []);

  const reportViolation = useCallback(async (type, description) => {
    if (isTerminatedRef.current) return;
    if (isTransitioning?.current) return;
    console.log('[Security] Reporting violation:', type);
    try {
      const { data } = await api.post('/students/me/violation', {
        type,
        description,
        timestamp: new Date().toISOString(),
      });
      console.log('[Security] Violation response:', data);
      const count = Number(data?.violationCount || 0);
      setViolationCount(count);

      if (data?.terminated === true) {
        isTerminatedRef.current = true;
        setIsTerminated(true);
        detach();
      }
    } catch (err) {
      console.log('[Security] Violation request error:', err?.response?.status, err?.message);
      if (err?.response?.status === 403) {
        isTerminatedRef.current = true;
        setIsTerminated(true);
        detach();
      }
    }
  }, [detach, isTransitioning]);

  useEffect(() => {
    if (isTerminatedRef.current) return;

    const opts = { capture: true };
    let listenersAttached = false;

    // --- TERMINATION TRIGGERS ---

    // Keydown — added to BOTH window AND document (capture) so Monaco cannot block it.
    // stopImmediatePropagation on ESC prevents both from double-firing in the normal case.
    const onKeyDown = (e) => {
      const k = e.key;
      const code = e.code;
      const ctrlOrMeta = e.ctrlKey || e.metaKey;

      if (k === 'Alt') {
        altPressed.current = true;
      }

      // ESC — terminate. Use stopImmediatePropagation to prevent editor from handling it.
      if (k === 'Escape' || code === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        reportViolation('escape_key', 'Student pressed Escape key');
        return;
      }

      // --- SILENT BLOCKS (no violation, no termination) ---

      if (k === 'F12') { e.preventDefault(); return; }

      // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C — DevTools
      if (ctrlOrMeta && e.shiftKey && ['i', 'I', 'j', 'J', 'c', 'C'].includes(k)) {
        e.preventDefault();
        return;
      }

      // Ctrl+U, Ctrl+S, Ctrl+A
      if (ctrlOrMeta && ['u', 'U', 's', 'S', 'a', 'A'].includes(k)) {
        e.preventDefault();
        return;
      }

      // Ctrl+C, Ctrl+V, Ctrl+X
      if (ctrlOrMeta && ['c', 'C', 'v', 'V', 'x', 'X'].includes(k)) {
        e.preventDefault();
        return;
      }
    };

    // Reset altPressed on ANY keyup — prevents stuck state if Alt released outside window
    const onKeyUp = () => {
      altPressed.current = false;
    };

    // Alt+Tab — only terminate if Alt was pressed before blur
    const onBlur = () => {
      if (isTransitioning?.current) return;
      if (altPressed.current) {
        altPressed.current = false;
        reportViolation('alt_tab', 'Student used Alt+Tab to switch away');
      }
    };

    let fullscreenGraceTimer = null;

    const onFullscreenChange = () => {
      if (fullscreenGraceTimer) {
        clearTimeout(fullscreenGraceTimer);
        fullscreenGraceTimer = null;
      }

      if (isTransitioning?.current) return;
      if (!document.fullscreenElement && securityActivated.current) {
        fullscreenGraceTimer = setTimeout(() => {
          if (!document.fullscreenElement && !isTransitioning?.current) {
            reportViolation('fullscreen_exit', 'Student exited fullscreen');
          }
        }, 1000);
      }
    };

    // Right click — block only, no violation
    const onContextMenu = (e) => { e.preventDefault(); };

    // Copy / Cut / Paste — block only, no violation
    const onCopy  = (e) => { e.preventDefault(); };
    const onCut   = (e) => { e.preventDefault(); };
    const onPaste = (e) => { e.preventDefault(); };

    const attachListeners = () => {
      if (listenersAttached || isTerminatedRef.current) return;

      // Keydown on BOTH window AND document — defense in depth against editor interception
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

    // Cleanup removes listeners only if this effect attached them.
    const cleanup = () => {
      if (activationTimer) clearTimeout(activationTimer);
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
      if (fullscreenGraceTimer) clearTimeout(fullscreenGraceTimer);
      listenersAttached = false;
      if (isTerminatedRef.current || !enabled) {
        setSecurityActive(false);
      }
    };

    detachRef.current = cleanup;

    return () => {
      cleanup();
      detachRef.current = () => {};
    };
  }, [enabled, isTransitioning, reportViolation]);

  return { isTerminated, violationCount, securityActive };
}
