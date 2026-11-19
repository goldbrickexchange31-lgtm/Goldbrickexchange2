/// <reference types="vite/client" />

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

let cachedSiteKey: string | null = null;
let scriptLoadPromise: Promise<string> | null = null;

/**
 * Resolves the public Google reCAPTCHA v3 Site Key from Vite frontend env var
 * (or falls back to the public config endpoint if injected at container runtime).
 */
export async function getRecaptchaSiteKey(): Promise<string> {
  if (cachedSiteKey) return cachedSiteKey;

  const envSiteKey = (import.meta.env.VITE_RECAPTCHA_SITE_KEY || '').trim();
  if (envSiteKey) {
    cachedSiteKey = envSiteKey;
    return cachedSiteKey;
  }

  try {
    const res = await fetch('/api/auth/recaptcha-config');
    if (res.ok) {
      const data = await res.json();
      if (data?.siteKey && typeof data.siteKey === 'string') {
        cachedSiteKey = data.siteKey.trim();
        return cachedSiteKey;
      }
    }
  } catch {
    // Ignore transient config lookup failures
  }

  return '';
}

/**
 * Dynamically loads Google reCAPTCHA v3 script once and waits until grecaptcha.ready() fires.
 */
export async function loadRecaptchaV3(): Promise<string> {
  const siteKey = await getRecaptchaSiteKey();
  if (!siteKey) {
    throw new Error('Security check (reCAPTCHA Site Key) is not configured yet. Please set VITE_RECAPTCHA_SITE_KEY.');
  }

  if (typeof window === 'undefined') {
    throw new Error('reCAPTCHA can only run in a browser environment.');
  }

  if (window.grecaptcha?.execute) {
    await new Promise<void>((resolve) => window.grecaptcha!.ready(() => resolve()));
    return siteKey;
  }

  if (!scriptLoadPromise) {
    scriptLoadPromise = new Promise<string>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-goldbrick-recaptcha="v3"]');
      if (existing) {
        const waitReady = () => {
          if (window.grecaptcha?.ready) {
            window.grecaptcha.ready(() => resolve(siteKey));
          } else {
            reject(new Error('Security verification failed to initialize. Please refresh the page.'));
          }
        };
        if (window.grecaptcha?.ready) {
          waitReady();
        } else {
          existing.addEventListener('load', waitReady, { once: true });
          existing.addEventListener(
            'error',
            () => reject(new Error('Could not load Google reCAPTCHA. Please check your internet connection or disable ad blockers.')),
            { once: true }
          );
        }
        return;
      }

      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
      script.async = true;
      script.defer = true;
      script.setAttribute('data-goldbrick-recaptcha', 'v3');

      script.onload = () => {
        if (window.grecaptcha?.ready) {
          window.grecaptcha.ready(() => resolve(siteKey));
        } else {
          scriptLoadPromise = null;
          reject(new Error('Security verification failed to initialize. Please refresh the page.'));
        }
      };

      script.onerror = () => {
        scriptLoadPromise = null;
        reject(new Error('Could not load Google reCAPTCHA. Please disable ad blockers or check your connection and try again.'));
      };

      document.head.appendChild(script);
    });
  }

  return scriptLoadPromise;
}

/**
 * Generates a fresh single-use Google reCAPTCHA v3 token for the requested action.
 */
export async function executeRecaptchaV3(action = 'register'): Promise<string> {
  const siteKey = await loadRecaptchaV3();

  if (!window.grecaptcha?.execute) {
    throw new Error('Security verification is not ready yet. Please wait a moment and try again.');
  }

  const token = await new Promise<string>((resolve, reject) => {
    window.grecaptcha!.ready(() => {
      window.grecaptcha!
        .execute(siteKey, { action })
        .then((tok) => {
          if (!tok || typeof tok !== 'string') {
            reject(new Error('Security check did not return a valid token. Please try again.'));
          } else {
            resolve(tok);
          }
        })
        .catch((err) => {
          reject(new Error(err?.message || 'Security check failed to run. Please refresh the page and try again.'));
        });
    });
  });

  return token;
}
