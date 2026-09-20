import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { getClientTelemetry } from '../lib/clientTelemetry';

export default function VisitorTracker() {
  const location = useLocation();
  const lastTrackedPageRef = useRef<string | null>(null);
  const lastHeartbeatTimeRef = useRef<number>(Date.now());
  const telemetryRef = useRef(getClientTelemetry());

  // Track initial arrival and route transitions
  useEffect(() => {
    const telemetry = telemetryRef.current;
    const currentPath = location.pathname;

    // Avoid duplicate calls for the exact same path in strict mode
    if (lastTrackedPageRef.current === currentPath) {
      return;
    }
    lastTrackedPageRef.current = currentPath;

    const payload = {
      visitorId: telemetry.visitorId,
      sessionId: telemetry.sessionId,
      currentPage: currentPath,
      pageTitle: typeof document !== 'undefined' ? document.title : 'GoldBrick Exchange',
      referrer: telemetry.referrer,
      device: telemetry.device,
      browser: telemetry.browser,
      os: telemetry.os,
      screen: telemetry.screen,
      isPageChange: Boolean(lastTrackedPageRef.current && lastTrackedPageRef.current !== currentPath)
    };

    fetch('/api/visitors/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(err => {
      // Silent catch to ensure zero interference with visitor browsing
      console.debug('[TRACKER] Heartbeat/track notification dispatched', err);
    });
  }, [location.pathname]);

  // Presence Heartbeat Loop & Leave Listener
  useEffect(() => {
    const telemetry = telemetryRef.current;
    const HEARTBEAT_INTERVAL_MS = 45 * 1000; // 45 seconds

    const sendHeartbeat = (isLeaving = false) => {
      const payload = {
        visitorId: telemetry.visitorId,
        sessionId: telemetry.sessionId,
        currentPage: window.location.pathname,
        isLeaving
      };

      if (isLeaving && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        try {
          const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
          navigator.sendBeacon('/api/visitors/heartbeat', blob);
          return;
        } catch {
          // Fallback to fetch if sendBeacon fails
        }
      }

      fetch('/api/visitors/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: isLeaving
      }).catch(() => {});

      lastHeartbeatTimeRef.current = Date.now();
    };

    // Periodic heartbeat timer (only when document is visible)
    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        sendHeartbeat(false);
      }
    }, HEARTBEAT_INTERVAL_MS);

    // Visibility change handler: pulse immediately when visitor returns to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLast = Date.now() - lastHeartbeatTimeRef.current;
        if (timeSinceLast > 30000) {
          sendHeartbeat(false);
        }
      }
    };

    // Unload handlers
    const handleBeforeUnload = () => {
      sendHeartbeat(true);
    };

    const handlePageHide = () => {
      sendHeartbeat(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

  return null; // Headless component
}
