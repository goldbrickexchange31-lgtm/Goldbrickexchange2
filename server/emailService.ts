import nodemailer from 'nodemailer';
import type admin from 'firebase-admin';

export interface SmtpConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  fromName?: string;
  fromEmail?: string;
}

/**
 * Get active SMTP configuration from Firestore or environment variables
 */
export async function getSmtpConfig(db?: admin.firestore.Firestore | null): Promise<SmtpConfig | null> {
  // Check environment variables first
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      fromName: process.env.SMTP_FROM_NAME || 'GoldBrick Security',
      fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
    };
  }

  // Check Firestore settings if db is available
  if (db) {
    try {
      const snap = await db.collection('settings').doc('smtp').get();
      if (snap.exists) {
        const data = snap.data();
        if (data && data.host && data.user && data.pass) {
          return {
            host: data.host,
            port: parseInt(data.port || '587', 10),
            secure: data.secure === true || String(data.port) === '465',
            user: data.user,
            pass: data.pass,
            fromName: data.fromName || 'GoldBrick Security',
            fromEmail: data.fromEmail || data.user,
          };
        }
      }
    } catch (err) {
      console.warn('[EMAIL] Could not read SMTP settings from Firestore:', err);
    }
  }

  return null;
}

/**
 * Create a nodemailer transporter using the active configuration
 */
export async function createTransporter(config: SmtpConfig) {
  const isGmail = config.host?.includes('gmail.com');

  return nodemailer.createTransport({
    host: config.host || (isGmail ? 'smtp.gmail.com' : undefined),
    port: config.port || 587,
    secure: config.secure || false,
    auth: {
      user: config.user,
      pass: config.pass,
    },
    // Anti-spam & TLS options
    tls: {
      rejectUnauthorized: false,
    },
  });
}

/**
 * Generate a luxury, high-deliverability HTML email template for password reset
 */
export function generatePasswordResetEmailHtml(options: {
  resetUrl: string;
  recipientEmail: string;
  ipAddress?: string;
  appName?: string;
}) {
  const { resetUrl, recipientEmail, ipAddress, appName = 'GoldBrick Exchange' } = options;
  const currentYear = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Reset Your Password - ${appName}</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #080c14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #080c14;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #080c14;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <!-- Container Box -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #0f172a; border-radius: 24px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
          
          <!-- Header Branding -->
          <tr>
            <td align="center" style="padding: 36px 40px 24px; background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); border-bottom: 1px solid #1e293b;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="font-size: 26px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff; font-style: italic;">
                      GOLD<span style="color: #0066FF;">BRICK</span>
                    </div>
                    <div style="font-size: 10px; font-weight: 800; letter-spacing: 3px; color: #64748b; text-transform: uppercase; margin-top: 4px;">
                      Official Security Notification
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 36px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                      Password Reset Request
                    </h1>
                    <p style="margin: 0 0 20px; font-size: 14px; line-height: 24px; color: #94a3b8;">
                      Hello Investor,
                    </p>
                    <p style="margin: 0 0 24px; font-size: 14px; line-height: 24px; color: #94a3b8;">
                      We received an authorization request to reset the password associated with your account:
                      <strong style="color: #ffffff; word-break: break-all;">${recipientEmail}</strong>.
                    </p>
                    <p style="margin: 0 0 32px; font-size: 14px; line-height: 24px; color: #94a3b8;">
                      Click the secure button below to set your new password directly on the <strong>GoldBrick Exchange</strong> website.
                    </p>
                  </td>
                </tr>

                <!-- CTA Button -->
                <tr>
                  <td align="center" style="padding: 10px 0 32px;">
                    <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                      <tr>
                        <td align="center" style="border-radius: 14px; background: #0066FF; box-shadow: 0 10px 25px -5px rgba(0, 102, 255, 0.4);">
                          <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 18px 42px; font-size: 14px; font-weight: 800; color: #ffffff; text-decoration: none; text-transform: uppercase; letter-spacing: 1px; border-radius: 14px; background-color: #0066FF;">
                            Change Password In-Website
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Direct Link Fallback -->
                <tr>
                  <td style="padding: 20px; background-color: #0a0f1d; border-radius: 12px; border: 1px solid #1e293b;">
                    <p style="margin: 0 0 8px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">
                      Direct Link (if button doesn't open):
                    </p>
                    <a href="${resetUrl}" target="_blank" style="font-size: 11px; color: #38bdf8; word-break: break-all; text-decoration: none; line-height: 18px;">
                      ${resetUrl}
                    </a>
                  </td>
                </tr>

                <!-- Security Details & Notice -->
                <tr>
                  <td style="padding-top: 32px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding: 16px; border-left: 3px solid #f59e0b; background-color: #171d2e; border-radius: 4px 12px 12px 4px;">
                          <div style="font-size: 12px; font-weight: 700; color: #fbbf24; margin-bottom: 4px;">
                            🛡 Security Notice
                          </div>
                          <div style="font-size: 12px; color: #94a3b8; line-height: 18px;">
                            This link is valid for <strong>1 hour</strong> and can only be used once. If you did not initiate this request, you can safely ignore this email. Your password and funds remain fully protected.
                          </div>
                          ${ipAddress ? `<div style="font-size: 10px; color: #64748b; margin-top: 6px;">Request origin IP: ${ipAddress}</div>` : ''}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer Information (Anti-Spam Compliance) -->
          <tr>
            <td style="padding: 24px 40px 32px; background-color: #080c14; border-top: 1px solid #1e293b; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 11px; color: #475569; font-weight: 600;">
                © ${currentYear} ${appName}. All rights reserved.
              </p>
              <p style="margin: 0 0 12px; font-size: 10px; color: #334155; line-height: 16px;">
                This automated transactional email was sent to ${recipientEmail} as part of your account security protocols.
              </p>
              <p style="margin: 0; font-size: 10px; color: #475569;">
                GoldBrick Exchange • High-Yield Mining & Global Asset Protocols
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate plain-text version for anti-spam multipart delivery
 */
export function generatePasswordResetEmailText(options: {
  resetUrl: string;
  recipientEmail: string;
  appName?: string;
}) {
  const { resetUrl, recipientEmail, appName = 'GoldBrick Exchange' } = options;
  return `
Password Reset Request - ${appName}

Hello Investor,

We received an authorization request to reset the password associated with your account: ${recipientEmail}.

To choose a new password directly on the website, visit this link:
${resetUrl}

This link is single-use and will expire in 1 hour. If you did not request this password change, no action is needed and your account remains safe.

Regards,
${appName} Security Team
  `.trim();
}
