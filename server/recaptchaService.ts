export interface RecaptchaVerificationResult {
  ok: boolean;
  status: number;
  code?: string;
  error?: string;
  score?: number;
  action?: string;
  hostname?: string;
}

/**
 * Verifies a Google reCAPTCHA v3 token securely on the server using Google's siteverify API.
 * Never logs or exposes RECAPTCHA_SECRET_KEY.
 */
export async function verifyRecaptchaV3Token(options: {
  token: unknown;
  expectedAction?: string;
  remoteIp?: string;
}): Promise<RecaptchaVerificationResult> {
  const { token, expectedAction = 'register', remoteIp } = options;

  const secretKey = process.env.RECAPTCHA_SECRET_KEY?.trim();
  if (!secretKey) {
    return {
      ok: false,
      status: 503,
      code: 'recaptcha-not-configured',
      error: 'Security verification is not configured on the server yet. Please set RECAPTCHA_SECRET_KEY in server secrets.',
    };
  }

  if (typeof token !== 'string' || token.trim().length < 10) {
    return {
      ok: false,
      status: 400,
      code: 'missing-token',
      error: 'Security verification token is missing or invalid. Please refresh the page and try again.',
    };
  }

  const rawMinScore = parseFloat(process.env.RECAPTCHA_MIN_SCORE || '0.5');
  const minScore = Number.isFinite(rawMinScore) && rawMinScore >= 0 && rawMinScore <= 1 ? rawMinScore : 0.5;

  try {
    const params = new URLSearchParams();
    params.append('secret', secretKey);
    params.append('response', token.trim());
    if (remoteIp && remoteIp !== 'unknown' && remoteIp !== '127.0.0.1' && remoteIp !== '::1') {
      params.append('remoteip', remoteIp);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    let response: Response;
    try {
      response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      return {
        ok: false,
        status: 502,
        code: 'verification-service-unavailable',
        error: 'Unable to reach security verification service. Please try again in a moment.',
      };
    }

    const data = (await response.json()) as {
      success?: boolean;
      score?: number;
      action?: string;
      hostname?: string;
      challenge_ts?: string;
      'error-codes'?: string[];
    };

    if (!data || data.success !== true) {
      const errorCodes = Array.isArray(data?.['error-codes']) ? data['error-codes'] : [];

      if (errorCodes.includes('timeout-or-duplicate')) {
        return {
          ok: false,
          status: 400,
          code: 'token-expired',
          error: 'Your security check expired or was already used. Please submit the form again.',
        };
      }

      if (errorCodes.includes('invalid-input-response') || errorCodes.includes('missing-input-response')) {
        return {
          ok: false,
          status: 400,
          code: 'invalid-token',
          error: 'Security verification failed due to an invalid token. Please refresh and try again.',
        };
      }

      if (errorCodes.includes('invalid-input-secret') || errorCodes.includes('missing-input-secret')) {
        console.error('[RECAPTCHA] Server secret key rejected by Google siteverify:', errorCodes);
        return {
          ok: false,
          status: 500,
          code: 'invalid-server-secret',
          error: 'Server security configuration error. Please contact support.',
        };
      }

      return {
        ok: false,
        status: 403,
        code: 'verification-failed',
        error: 'Security verification failed. Please refresh the page and try again.',
      };
    }

    // Verify expected v3 action to prevent cross-endpoint token replay
    if (expectedAction && data.action && data.action !== expectedAction) {
      return {
        ok: false,
        status: 403,
        code: 'action-mismatch',
        error: 'Security verification action mismatch. Please reload the registration page and try again.',
      };
    }

    // Enforce reCAPTCHA v3 score threshold
    if (typeof data.score !== 'number' || data.score < minScore) {
      console.warn(`[RECAPTCHA] Rejected low score (${data.score}) for action=${data.action}`);
      return {
        ok: false,
        status: 403,
        code: 'low-score',
        error: 'Automated or suspicious registration activity was blocked. Please ensure you are not using an automated browser or VPN.',
      };
    }

    return {
      ok: true,
      status: 200,
      score: data.score,
      action: data.action,
      hostname: data.hostname,
    };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return {
        ok: false,
        status: 504,
        code: 'verification-timeout',
        error: 'Security verification timed out. Please check your internet connection and try again.',
      };
    }
    console.error('[RECAPTCHA] Verification error:', err?.message || err);
    return {
      ok: false,
      status: 502,
      code: 'verification-error',
      error: 'Could not verify your security check. Please try again.',
    };
  }
}
