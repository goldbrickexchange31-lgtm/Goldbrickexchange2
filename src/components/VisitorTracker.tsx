import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { getClientTelemetry } from '../lib/clientTelemetry';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp, arrayUnion, increment } from 'firebase/firestore';

export default function VisitorTracker() {
  const location = useLocation();
  const { user, userData } = useAuth();
  const lastTrackedPageRef = useRef<string | null>(null);
  const lastHeartbeatTimeRef = useRef<number>(Date.now());
  const telemetryRef = useRef(getClientTelemetry());

  // Track initial arrival, returning visitor status, and route transitions
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
      isPageChange: Boolean(lastTrackedPageRef.current && lastTrackedPageRef.current !== currentPath),
      userId: user?.uid || null,
      userName: userData?.displayName || (userData?.email ? userData.email.split('@')[0] : null) || null,
      userEmail: user?.email || userData?.email || null,
      accountStatus: userData?.accountStatus || null,
      userRole: userData?.role || null
    };

    const historyItem = {
      page: currentPath,
      title: typeof document !== 'undefined' ? document.title : 'GoldBrick Exchange',
      timestamp: new Date().toISOString()
    };

    // 1. Post to server API to resolve IP & Geolocation
    fetch('/api/visitors/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(async (data) => {
        // 2. Persist permanently directly in Firestore
        // This guarantees that even across server restarts or cache flushes,
        // visitors are never wiped out and returning visitors stay tracked permanently!
        if (db && telemetry.visitorId) {
          try {
            const visitorDocRef = doc(db, 'visitors', telemetry.visitorId);
            const clientFirestoreData: Record<string, any> = {
              visitorId: telemetry.visitorId,
              sessionId: telemetry.sessionId,
              device: telemetry.device,
              browser: telemetry.browser,
              os: telemetry.os,
              referrer: telemetry.referrer,
              currentPage: currentPath,
              pageTitle: typeof document !== 'undefined' ? document.title : 'GoldBrick Exchange',
              lastSeen: serverTimestamp(),
              isOnline: true,
              history: arrayUnion(historyItem)
            };

            if (data?.ip) clientFirestoreData.ipAddress = data.ip;
            if (data?.country) clientFirestoreData.country = data.country;
            if (data?.countryCode) clientFirestoreData.countryCode = data.countryCode;
            if (data?.city) clientFirestoreData.city = data.city;
            if (data?.region) clientFirestoreData.region = data.region;
            if (data?.isp) clientFirestoreData.isp = data.isp;
            if (data?.flagEmoji) clientFirestoreData.flagEmoji = data.flagEmoji;
            if (typeof data?.latitude === 'number') clientFirestoreData.latitude = data.latitude;
            if (typeof data?.longitude === 'number') clientFirestoreData.longitude = data.longitude;

            // Account information if logged in
            if (user?.uid) clientFirestoreData.userId = user.uid;
            if (userData?.displayName || userData?.email) {
              clientFirestoreData.userName = userData?.displayName || userData.email.split('@')[0];
              clientFirestoreData.userEmail = user.email || userData.email;
            }
            if (userData?.accountStatus) clientFirestoreData.accountStatus = userData.accountStatus;
            if (userData?.role) clientFirestoreData.userRole = userData.role;

            if (data?.isNewVisitor) {
              clientFirestoreData.firstSeen = serverTimestamp();
              clientFirestoreData.visitCount = 1;
              clientFirestoreData.pageViewsCount = 1;
            } else {
              clientFirestoreData.pageViewsCount = increment(1);
              if (data?.isNewSession) {
                clientFirestoreData.visitCount = increment(1);
              }
            }

            await setDoc(visitorDocRef, clientFirestoreData, { merge: true });
          } catch (fireErr) {
            console.debug('[TRACKER] Direct Firestore sync notice:', fireErr);
          }
        }
      })
      .catch(err => {
        console.debug('[TRACKER] Heartbeat/track notification dispatched', err);
      });
  }, [location.pathname, user?.uid, userData?.accountStatus, userData?.displayName, userData?.email]);

  // Presence Heartbeat Loop & Leave Listener
  useEffect(() => {
    const telemetry = telemetryRef.current;
    const HEARTBEAT_INTERVAL_MS = 45 * 1000; // 45 seconds

    const sendHeartbeat = async (isLeaving = false) => {
      const payload = {
        visitorId: telemetry.visitorId,
        sessionId: telemetry.sessionId,
        currentPage: window.location.pathname,
        isLeaving,
        userId: user?.uid || null,
        userName: userData?.displayName || (userData?.email ? userData.email.split('@')[0] : null) || null,
        userEmail: user?.email || userData?.email || null,
        accountStatus: userData?.accountStatus || null
      };

      if (isLeaving && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        try {
          const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
          navigator.sendBeacon('/api/visitors/heartbeat', blob);
        } catch {
          // Fallback below
        }
      }

      fetch('/api/visitors/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: isLeaving
      }).catch(() => {});

      // Direct Firestore update for live presence
      if (db && telemetry.visitorId) {
        try {
          const visitorDocRef = doc(db, 'visitors', telemetry.visitorId);
          await setDoc(visitorDocRef, {
            lastSeen: serverTimestamp(),
            isOnline: !isLeaving,
            currentPage: window.location.pathname,
            ...(user?.uid ? { userId: user.uid, userEmail: user.email, userName: userData?.displayName || user.email?.split('@')[0] } : {})
          }, { merge: true });
        } catch {}
      }

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
      } else {
        // Tab hidden
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
  }, [user?.uid, user?.email, userData?.displayName, userData?.accountStatus]);

  return null; // Headless component
}
