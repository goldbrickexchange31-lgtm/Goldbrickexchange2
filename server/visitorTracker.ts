import type { Request, Response } from 'express';
import type admin from 'firebase-admin';

export interface GeoLocationData {
  ip: string;
  country: string;
  countryCode: string;
  region: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  isp: string;
  flagEmoji: string;
  isApproximate: boolean;
}

// In-memory cache for IP geolocation to optimize performance & stay well within rate limits
const ipCache = new Map<string, { data: GeoLocationData; cachedAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Convert 2-letter ISO country code to Unicode Flag emoji
export function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  try {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch {
    return '🌐';
  }
}

// Check if IP is private/loopback
export function isPrivateOrLocalIp(ip: string): boolean {
  if (!ip) return true;
  const clean = ip.replace(/^::ffff:/, '').trim();
  if (
    clean === '127.0.0.1' ||
    clean === '::1' ||
    clean === 'localhost' ||
    clean.startsWith('10.') ||
    clean.startsWith('192.168.') ||
    clean.startsWith('172.16.') ||
    clean.startsWith('172.17.') ||
    clean.startsWith('172.18.') ||
    clean.startsWith('172.19.') ||
    clean.startsWith('172.2') ||
    clean.startsWith('172.30.') ||
    clean.startsWith('172.31.') ||
    clean.startsWith('fc00:') ||
    clean.startsWith('fe80:')
  ) {
    return true;
  }
  return false;
}

// Extract real client IP from incoming Express request headers
export function extractClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const list = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const first = list.split(',')[0].trim().replace(/^::ffff:/, '');
    if (first) return first;
  }

  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp) {
    const val = (Array.isArray(cfIp) ? cfIp[0] : cfIp).trim().replace(/^::ffff:/, '');
    if (val) return val;
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    const val = (Array.isArray(realIp) ? realIp[0] : realIp).trim().replace(/^::ffff:/, '');
    if (val) return val;
  }

  const socketIp = req.socket?.remoteAddress?.replace(/^::ffff:/, '') || '127.0.0.1';
  return socketIp;
}

// Resolve IP geolocation with caching and multiple reliable fallbacks
export async function lookupIpGeolocation(ip: string): Promise<GeoLocationData> {
  const cleanIp = ip.replace(/^::ffff:/, '').trim();

  // Check cache first
  const cached = ipCache.get(cleanIp);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const isLocal = isPrivateOrLocalIp(cleanIp);

  // If local / loopback / container internal IP, attempt to query self-IP on ipwho.is
  // or return structured local development information
  const queryUrl = isLocal ? 'https://ipwho.is/' : `https://ipwho.is/${cleanIp}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(queryUrl, {
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data: any = await res.json();
      if (data && (data.success !== false || isLocal)) {
        const country = data.country || (isLocal ? 'Local Network' : 'Location unavailable');
        const countryCode = data.country_code || (isLocal ? 'LOC' : '');
        const region = data.region || (isLocal ? 'Internal Environment' : 'Location unavailable');
        const city = data.city || (isLocal ? 'Development Host' : 'Location unavailable');
        const isp = data.connection?.isp || data.connection?.org || (isLocal ? 'Private Loopback' : 'Unknown ISP');
        const flagEmoji = data.flag?.emoji || getFlagEmoji(countryCode);

        const result: GeoLocationData = {
          ip: isLocal ? (data.ip || cleanIp) : cleanIp,
          country,
          countryCode,
          region,
          city,
          latitude: typeof data.latitude === 'number' ? data.latitude : null,
          longitude: typeof data.longitude === 'number' ? data.longitude : null,
          isp,
          flagEmoji,
          isApproximate: true
        };

        ipCache.set(cleanIp, { data: result, cachedAt: Date.now() });
        return result;
      }
    }
  } catch (err) {
    console.warn(`[GEOLOCATION] Primary lookup on ipwho.is failed for ${cleanIp}:`, (err as Error).message);
  }

  // Secondary Fallback: ip-api.com
  if (!isLocal) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`http://ip-api.com/json/${cleanIp}?fields=status,message,country,countryCode,regionName,city,lat,lon,isp,org`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data: any = await res.json();
        if (data && data.status === 'success') {
          const result: GeoLocationData = {
            ip: cleanIp,
            country: data.country || 'Location unavailable',
            countryCode: data.countryCode || '',
            region: data.regionName || 'Location unavailable',
            city: data.city || 'Location unavailable',
            latitude: typeof data.lat === 'number' ? data.lat : null,
            longitude: typeof data.lon === 'number' ? data.lon : null,
            isp: data.isp || data.org || 'Unknown ISP',
            flagEmoji: getFlagEmoji(data.countryCode || ''),
            isApproximate: true
          };

          ipCache.set(cleanIp, { data: result, cachedAt: Date.now() });
          return result;
        }
      }
    } catch (err) {
      console.warn(`[GEOLOCATION] Secondary lookup on ip-api.com failed for ${cleanIp}:`, (err as Error).message);
    }
  }

  // Graceful Fallback if all lookups fail or are unavailable
  const fallbackResult: GeoLocationData = {
    ip: cleanIp,
    country: isLocal ? 'Local Network' : 'Location unavailable',
    countryCode: isLocal ? 'LOC' : '',
    region: isLocal ? 'Development Host' : 'Location unavailable',
    city: isLocal ? 'Local Host' : 'Location unavailable',
    latitude: null,
    longitude: null,
    isp: isLocal ? 'Local Loopback' : 'Unknown ISP',
    flagEmoji: isLocal ? '💻' : '🌐',
    isApproximate: true
  };

  ipCache.set(cleanIp, { data: fallbackResult, cachedAt: Date.now() });
  return fallbackResult;
}

export interface VisitorPayload {
  visitorId: string;
  sessionId: string;
  currentPage: string;
  pageTitle?: string;
  referrer?: string;
  device?: string;
  browser?: string;
  os?: string;
  screen?: string;
  isPageChange?: boolean;
}

// In-Memory Active Visitor and Alert Cache (mirrors Firestore in real time)
const memoryVisitors = new Map<string, any>();
const memoryNotifications: any[] = [];

// Get active visitors endpoint for admin dashboard
export function getActiveVisitors(req: Request, res: Response) {
  const visitorsList = Array.from(memoryVisitors.values()).sort((a, b) => {
    const timeA = new Date(a.lastSeen?.toDate ? a.lastSeen.toDate() : a.lastSeen || 0).getTime();
    const timeB = new Date(b.lastSeen?.toDate ? b.lastSeen.toDate() : b.lastSeen || 0).getTime();
    return timeB - timeA;
  });

  return res.json({
    success: true,
    visitors: visitorsList,
    notifications: memoryNotifications.slice(0, 50)
  });
}

// Track a visitor: create or update visitor doc & trigger real-time admin alert if new
export async function processVisitorTracking(
  req: Request,
  res: Response,
  db: admin.firestore.Firestore,
  adminInstance: typeof admin
) {
  try {
    const payload: VisitorPayload = req.body || {};
    const visitorId = (payload.visitorId || '').trim();
    const sessionId = (payload.sessionId || '').trim();
    const currentPage = (payload.currentPage || '/').slice(0, 500);
    const pageTitle = (payload.pageTitle || 'GoldBrick Exchange').slice(0, 200);
    const referrer = (payload.referrer || 'Direct').slice(0, 500);
    const device = (payload.device || 'Desktop').slice(0, 50);
    const browser = (payload.browser || 'Unknown Browser').slice(0, 50);
    const os = (payload.os || 'Unknown OS').slice(0, 50);

    if (!visitorId || !sessionId) {
      return res.status(400).json({ error: 'visitorId and sessionId are required' });
    }

    const ip = extractClientIp(req);
    const geo = await lookupIpGeolocation(ip);

    const visitorsRef = db ? db.collection('visitors') : null;
    const visitorDocRef = visitorsRef ? visitorsRef.doc(visitorId) : null;
    
    let existingData: any = memoryVisitors.get(visitorId) || null;
    let docExists = Boolean(existingData);

    if (!existingData && visitorDocRef) {
      try {
        const snap = await visitorDocRef.get();
        if (snap.exists) {
          existingData = snap.data();
          docExists = true;
        }
      } catch (readErr: any) {
        console.warn('[VISITOR] Firestore read notice:', readErr.message);
      }
    }

    const now = adminInstance?.firestore?.FieldValue?.serverTimestamp ? adminInstance.firestore.FieldValue.serverTimestamp() : new Date().toISOString();
    const isoNow = new Date().toISOString();
    const historyItem = {
      page: currentPage,
      title: pageTitle,
      timestamp: isoNow
    };

    let isNewVisitor = false;
    let isNewSession = false;

    if (!docExists) {
      // 1. BRAND NEW VISITOR
      isNewVisitor = true;
      isNewSession = true;

      const visitorData = {
        visitorId,
        sessionId,
        ipAddress: geo.ip,
        country: geo.country,
        countryCode: geo.countryCode,
        region: geo.region,
        city: geo.city,
        latitude: geo.latitude,
        longitude: geo.longitude,
        isp: geo.isp,
        device,
        browser,
        os,
        referrer,
        currentPage,
        pageTitle,
        firstSeen: now,
        lastSeen: now,
        isOnline: true,
        visitCount: 1,
        pageViewsCount: 1,
        flagEmoji: geo.flagEmoji,
        locationNotice: 'Approximate IP-based location',
        history: [historyItem]
      };

      memoryVisitors.set(visitorId, visitorData);

      if (visitorDocRef) {
        try {
          await visitorDocRef.set(visitorData);
        } catch (setErr: any) {
          console.warn('[VISITOR] Firestore write note:', setErr.message);
        }
      }

      // Create real-time admin alert notification in memory and Firestore
      const notifData = {
        notificationId: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        visitorId,
        sessionId,
        ipAddress: geo.ip,
        country: geo.country,
        city: geo.city,
        region: geo.region,
        device,
        browser,
        os,
        currentPage,
        flagEmoji: geo.flagEmoji,
        isReturning: false,
        read: false,
        createdAt: isoNow
      };
      memoryNotifications.unshift(notifData);

      if (db) {
        try {
          const notifRef = db.collection('visitor_notifications').doc();
          await notifRef.set({
            ...notifData,
            createdAt: now
          });
        } catch (notifErr) {
          console.error('[VISITOR] Error recording alert notification:', notifErr);
        }
      }

      // Trigger Web Push Notification to Admins if tokens available
      dispatchAdminPushNotification(adminInstance, db, {
        title: `🟢 NEW WEBSITE VISITOR`,
        body: `${geo.flagEmoji} ${geo.country} — ${geo.city} | ${device} • ${browser} on ${currentPage}`,
        link: '/admin',
        tag: 'new-visitor'
      }).catch(e => console.error('[VISITOR-PUSH] Error:', e));

    } else {
      // VISITOR ALREADY EXISTS
      existingData = existingData || {};
      isNewSession = existingData.sessionId !== sessionId;

      const existingHistory: any[] = Array.isArray(existingData.history) ? existingData.history : [];
      // Append to history if different page or new session, keep last 20
      const lastPage = existingHistory[existingHistory.length - 1]?.page;
      let updatedHistory = existingHistory;
      if (lastPage !== currentPage || isNewSession) {
        updatedHistory = [...existingHistory.slice(-19), historyItem];
      }

      const updates: Record<string, any> = {
        lastSeen: now,
        isOnline: true,
        currentPage,
        pageTitle,
        device,
        browser,
        os,
        history: updatedHistory,
        pageViewsCount: adminInstance?.firestore?.FieldValue?.increment ? adminInstance.firestore.FieldValue.increment(1) : (existingData.pageViewsCount || 1) + 1
      };

      // If IP or location changed, update them
      if (existingData.ipAddress !== geo.ip && geo.country !== 'Location unavailable') {
        updates.ipAddress = geo.ip;
        updates.country = geo.country;
        updates.countryCode = geo.countryCode;
        updates.region = geo.region;
        updates.city = geo.city;
        updates.latitude = geo.latitude;
        updates.longitude = geo.longitude;
        updates.isp = geo.isp;
        updates.flagEmoji = geo.flagEmoji;
      }

      if (isNewSession) {
        // Returning visitor starting a new session
        updates.sessionId = sessionId;
        updates.visitCount = adminInstance?.firestore?.FieldValue?.increment ? adminInstance.firestore.FieldValue.increment(1) : (existingData.visitCount || 1) + 1;

        // Optionally send a returning visitor alert if it has been a while
        try {
          const returningNotif = {
            notificationId: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            visitorId,
            sessionId,
            ipAddress: geo.ip,
            country: geo.country,
            city: geo.city,
            region: geo.region,
            device,
            browser,
            os,
            currentPage,
            flagEmoji: geo.flagEmoji,
            isReturning: true,
            read: false,
            createdAt: isoNow
          };
          memoryNotifications.unshift(returningNotif);

          if (db) {
            const notifRef = db.collection('visitor_notifications').doc();
            await notifRef.set({
              ...returningNotif,
              createdAt: now
            });
          }
        } catch (notifErr) {
          console.error('[VISITOR] Error recording returning alert:', notifErr);
        }
      }

      // Update in memory cache
      memoryVisitors.set(visitorId, {
        ...existingData,
        ...updates,
        lastSeen: isoNow,
        pageViewsCount: (existingData.pageViewsCount || 1) + 1,
        visitCount: isNewSession ? (existingData.visitCount || 1) + 1 : (existingData.visitCount || 1)
      });

      if (visitorDocRef) {
        try {
          await visitorDocRef.update(updates);
        } catch (updateErr: any) {
          console.warn('[VISITOR] Firestore update notice (cached in memory):', updateErr.message);
        }
      }
    }

    return res.json({
      success: true,
      visitorId,
      sessionId,
      isNewVisitor,
      isNewSession,
      country: geo.country,
      city: geo.city,
      flagEmoji: geo.flagEmoji,
      isOnline: true
    });
  } catch (error: any) {
    console.error('[VISITOR-TRACK] Error in processVisitorTracking:', error);
    // Never crash or block visitor browsing
    return res.status(500).json({
      error: 'Failed to process visitor tracking',
      details: error?.message || String(error)
    });
  }
}

// Process visitor heartbeat
export async function processVisitorHeartbeat(
  req: Request,
  res: Response,
  db: admin.firestore.Firestore,
  adminInstance: typeof admin
) {
  try {
    let body = req.body;
    // Handle potential beacon string payload
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const visitorId = (body?.visitorId || '').trim();
    const isLeaving = Boolean(body?.isLeaving);
    const currentPage = body?.currentPage ? String(body.currentPage).slice(0, 500) : undefined;

    if (!visitorId) {
      return res.status(400).json({ error: 'visitorId required' });
    }

    // Update in-memory active cache
    const mem = memoryVisitors.get(visitorId);
    if (mem) {
      mem.lastSeen = new Date().toISOString();
      mem.isOnline = !isLeaving;
      if (currentPage) mem.currentPage = currentPage;
      memoryVisitors.set(visitorId, mem);
    }

    if (db) {
      try {
        const visitorRef = db.collection('visitors').doc(visitorId);
        const updates: Record<string, any> = {
          lastSeen: adminInstance?.firestore?.FieldValue?.serverTimestamp ? adminInstance.firestore.FieldValue.serverTimestamp() : new Date().toISOString(),
          isOnline: !isLeaving
        };

        if (currentPage) {
          updates.currentPage = currentPage;
        }

        await visitorRef.update(updates).catch(e => {
          console.warn(`[VISITOR-HEARTBEAT] Could not update visitor in Firestore ${visitorId}:`, e.message);
        });
      } catch (err: any) {
        // Handled
      }
    }

    return res.json({ success: true, isOnline: !isLeaving });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Heartbeat error' });
  }
}

// Dispatch FCM Web Push Notification to Admins
async function dispatchAdminPushNotification(
  adminInstance: typeof admin,
  db: admin.firestore.Firestore,
  payload: { title: string; body: string; link?: string; tag?: string }
) {
  try {
    const messaging = adminInstance.messaging();
    const adminSnap = await db.collection('users')
      .where('role', '==', 'admin')
      .get();

    const tokens: string[] = [];
    adminSnap.forEach(uDoc => {
      const uData = uDoc.data();
      if (uData.fcmTokens && Array.isArray(uData.fcmTokens)) {
        tokens.push(...uData.fcmTokens);
      }
    });

    // Also check master admin email
    const masterSnap = await db.collection('users')
      .where('email', '==', 'goldbrickexchange31@gmail.com')
      .get();
    masterSnap.forEach(uDoc => {
      const uData = uDoc.data();
      if (uData.fcmTokens && Array.isArray(uData.fcmTokens)) {
        tokens.push(...uData.fcmTokens);
      }
    });

    const uniqueTokens = Array.from(new Set(tokens.filter(t => typeof t === 'string' && t.length > 10)));
    if (uniqueTokens.length === 0) return;

    const message = {
      notification: {
        title: payload.title,
        body: payload.body,
      },
      webpush: {
        fcm_options: {
          link: payload.link || '/admin'
        },
        notification: {
          icon: 'https://ais-pre-224n6rm73lzpde37om5nik-815345978387.europe-west2.run.app/favicon.ico',
          badge: 'https://ais-pre-224n6rm73lzpde37om5nik-815345978387.europe-west2.run.app/favicon.ico',
          tag: payload.tag || 'visitor-alert',
          requireInteraction: false
        }
      },
      tokens: uniqueTokens
    };

    await messaging.sendEachForMulticast(message);
  } catch (err) {
    console.error('[DISPATCH-ADMIN-PUSH] Failed:', err);
  }
}
