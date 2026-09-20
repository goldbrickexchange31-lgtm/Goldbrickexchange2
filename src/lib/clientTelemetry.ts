/**
 * Client Telemetry & Device Diagnostics Helper
 * Safely parses non-sensitive device, browser, and OS parameters.
 * Does NOT access GPS or sensitive personal data.
 */

export interface ClientDeviceTelemetry {
  visitorId: string;
  sessionId: string;
  device: 'Android' | 'iPhone' | 'iPad' | 'Tablet' | 'Desktop' | 'Mobile Device';
  browser: string;
  os: string;
  screen: string;
  referrer: string;
}

// Generate or retrieve persistent visitor ID (survives browser sessions)
export function getOrCreateVisitorId(): string {
  const STORAGE_KEY = 'gb_visitor_id';
  try {
    let vid = localStorage.getItem(STORAGE_KEY);
    if (!vid || vid.length < 10) {
      vid = `vid_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(STORAGE_KEY, vid);
    }
    return vid;
  } catch {
    // Fallback if localStorage is restricted
    return `vid_temp_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  }
}

// Generate or retrieve session ID (expires when tab/browser is closed)
export function getOrCreateSessionId(): string {
  const SESSION_KEY = 'gb_session_id';
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid || sid.length < 10) {
      sid = `sid_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return `sid_temp_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  }
}

// Detect device category
export function detectDeviceType(ua: string): 'Android' | 'iPhone' | 'iPad' | 'Tablet' | 'Desktop' | 'Mobile Device' {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) {
    return 'Tablet';
  }
  if (/iphone/i.test(ua)) {
    return 'iPhone';
  }
  if (/android/i.test(ua)) {
    return 'Android';
  }
  if (/mobile/i.test(ua)) {
    return 'Mobile Device';
  }
  return 'Desktop';
}

// Detect operating system
export function detectOperatingSystem(ua: string): string {
  if (/windows phone/i.test(ua)) return 'Windows Phone';
  if (/win(dows|98|95|nt|32)/i.test(ua)) {
    if (/nt 10\.0/i.test(ua)) return 'Windows 10/11';
    if (/nt 6\.3/i.test(ua)) return 'Windows 8.1';
    if (/nt 6\.2/i.test(ua)) return 'Windows 8';
    if (/nt 6\.1/i.test(ua)) return 'Windows 7';
    return 'Windows';
  }
  if (/iphone|ipod/i.test(ua)) {
    const match = ua.match(/os (\d+)_?(\d+)?/i);
    return match ? `iOS ${match[1]}` : 'iOS';
  }
  if (/ipad/i.test(ua)) {
    const match = ua.match(/os (\d+)_?(\d+)?/i);
    return match ? `iPadOS ${match[1]}` : 'iPadOS';
  }
  if (/android/i.test(ua)) {
    const match = ua.match(/android\s([0-9.]+)/i);
    return match ? `Android ${match[1]}` : 'Android';
  }
  if (/macintosh|mac os x/i.test(ua)) return 'macOS';
  if (/cros/i.test(ua)) return 'Chrome OS';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Unknown OS';
}

// Detect browser
export function detectBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return 'Microsoft Edge';
  if (/samsungbrowser/i.test(ua)) return 'Samsung Internet';
  if (/opera|opr\//i.test(ua)) return 'Opera';
  if (/chrome|crios/i.test(ua) && !/edg/i.test(ua)) return 'Chrome';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) return 'Safari';
  if (/trident/i.test(ua)) return 'Internet Explorer';
  return 'Browser';
}

// Gather all non-sensitive telemetry
export function getClientTelemetry(): ClientDeviceTelemetry {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const vid = getOrCreateVisitorId();
  const sid = getOrCreateSessionId();

  let referrer = 'Direct';
  if (typeof document !== 'undefined' && document.referrer) {
    try {
      const parsed = new URL(document.referrer);
      referrer = parsed.origin !== window.location.origin ? parsed.href : 'Internal Navigation';
    } catch {
      referrer = document.referrer.slice(0, 200);
    }
  }

  const screenResolution = typeof window !== 'undefined' && window.screen 
    ? `${window.screen.width}x${window.screen.height}` 
    : 'Unknown';

  return {
    visitorId: vid,
    sessionId: sid,
    device: detectDeviceType(ua),
    browser: detectBrowser(ua),
    os: detectOperatingSystem(ua),
    screen: screenResolution,
    referrer
  };
}
