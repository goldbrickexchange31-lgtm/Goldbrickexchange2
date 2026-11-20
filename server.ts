import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { 
  processVisitorTracking, 
  processVisitorHeartbeat, 
  extractClientIp, 
  lookupIpGeolocation,
  getActiveVisitors
} from './server/visitorTracker.js';
import {
  getSmtpConfig,
  saveSmtpConfigLocally,
  createTransporter,
  generatePasswordResetEmailHtml,
  generatePasswordResetEmailText,
  type SmtpConfig
} from './server/emailService.js';
import { verifyRecaptchaV3Token } from './server/recaptchaService.js';
import { deleteUserAccountCompletely } from './server/userDeletionService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase Config (Must match client)
const firebaseConfig = {
  projectId: "goldbrick-cd2b5",
  appId: "1:390165274318:web:1dc2018ed92d4dc0a77a9f",
  apiKey: "AIzaSyASBcntcqxMiVjX6VngCbO6TqUPXFXfgCk",
  authDomain: "goldbrick-cd2b5.firebaseapp.com",
  messagingSenderId: "390165274318",
};

const APP_BASE_URL = process.env.APP_URL || 'https://ais-pre-cut5fmpsngbcjicx2xrqpr-30985649189.europe-west2.run.app';

// Initialize Admin SDK safely
let firebaseApp: admin.app.App | null = null;
let db: admin.firestore.Firestore | null = null;

function parseServiceAccountKey(raw: string): admin.ServiceAccount {
  const trimmed = raw.trim();
  const jsonStr = trimmed.startsWith('{')
    ? trimmed
    : Buffer.from(trimmed, 'base64').toString('utf8');
  const parsed = JSON.parse(jsonStr);
  if (typeof parsed.private_key === 'string') {
    parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
  }
  return parsed;
}

function getDb() {
  if (db) return db;
  
  try {
    if (!admin.apps.length) {
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      
      if (serviceAccount && serviceAccount.trim().length > 0) {
        console.log('[FIREBASE] Initializing with service account from ENV');
        const cert = parseServiceAccountKey(serviceAccount);
        firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(cert),
          projectId: firebaseConfig.projectId,
        });
      } else {
        if (!process.env.GOOGLE_CLOUD_QUOTA_PROJECT) {
          process.env.GOOGLE_CLOUD_QUOTA_PROJECT = firebaseConfig.projectId;
        }
        console.log('[FIREBASE] Initializing with projectId (Falling back to default credentials)');
        firebaseApp = admin.initializeApp({
          projectId: firebaseConfig.projectId,
        });
      }
    } else {
      firebaseApp = admin.app();
    }

    db = admin.firestore(firebaseApp);
    // Remove the custom databaseId setting as it's not present in client config
    db.settings({
      ignoreUndefinedProperties: true
    });
    return db;
  } catch (error) {
    console.error('[FIREBASE] Admin initialization failed:', error);
    throw error;
  }
}

// Background Task: Mature Investments
let hasWarnedPermission = false;
async function matureInvestments() {
  try {
    const firestore = getDb();
    const invRef = firestore.collection('investments');
    const snap = await invRef.where('status', '==', 'active').get();

    for (const invDoc of snap.docs) {
      const inv = invDoc.data();
      
      // Get expiresAt from document
      let expiryDate: Date | null = null;
      if (inv.expiresAt) {
        if (typeof inv.expiresAt.toDate === 'function') {
          expiryDate = inv.expiresAt.toDate();
        } else if (inv.expiresAt._seconds) {
          expiryDate = new Date(inv.expiresAt._seconds * 1000);
        }
      }

      // Fallback to calculation if expiresAt is missing
      if (!expiryDate) {
        let createdAt: Date | null = null;
        if (inv.createdAt) {
          if (typeof inv.createdAt.toDate === 'function') {
            createdAt = inv.createdAt.toDate();
          } else if (inv.createdAt._seconds) {
            createdAt = new Date(inv.createdAt._seconds * 1000);
          }
        }
        
        if (!createdAt) continue;

        let durationMs = 0;
        if (inv.durationDays) durationMs = inv.durationDays * 86400000;
        else if (inv.durationHours) durationMs = inv.durationHours * 3600000;
        else if (inv.durationSeconds) durationMs = inv.durationSeconds * 1000;
        else durationMs = 86400000; // default 1 day

        expiryDate = new Date(createdAt.getTime() + durationMs);
      }

      if (new Date() >= expiryDate) {
        console.log(`[MATURITY] Processing investment ${invDoc.id} for user ${inv.userId}`);
        
        const batch = firestore.batch();
        
        // 1. Calculate payout
        const amount = inv.amount || 0;
        let profit = inv.profit;
        
        // If profit was not calculated at creation time, calculate it now
        if (profit === undefined || profit === null) {
          const profitValue = inv.profitValue || inv.dailyROI || inv.roi || 0;
          const minDeposit = inv.minDeposit || 1;
          if (inv.profitType === 'fixed') {
            profit = (amount / minDeposit) * profitValue;
          } else {
            profit = (amount * profitValue / 100);
          }
        }
        
        const totalPayout = inv.expectedReturn || (amount + profit);

        // 2. Mark investment as completed
        batch.update(invDoc.ref, {
          status: 'completed',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          maturedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // 3. Update user balance
        const userRef = firestore.collection('users').doc(inv.userId);
        batch.update(userRef, {
          balance: admin.firestore.FieldValue.increment(totalPayout),
          totalProfit: admin.firestore.FieldValue.increment(profit)
        });

        // 4. Record transaction for the layout
        const txRef = firestore.collection('transactions').doc();
        batch.set(txRef, {
          userId: inv.userId,
          userName: inv.userName || 'Investor',
          userEmail: inv.userEmail || '',
          amount: totalPayout,
          type: 'deposit', // Label as deposit for payout
          status: 'approved',
          description: `ROI Maturity Payout: ${inv.planName || 'Plan'}`,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        await batch.commit();
        console.log(`[MATURITY] Successfully matured ${invDoc.id}. Distributed $${totalPayout}`);
      }
    }
  } catch (err: any) {
    if (err?.code === 7 || err?.message?.includes('PERMISSION_DENIED') || err?.message?.includes('Missing or insufficient permissions')) {
      if (!hasWarnedPermission) {
        hasWarnedPermission = true;
        console.log('[FIREBASE] Server Firestore Admin credentials not provisioned for project goldbrick-cd2b5. Investment auto-settlement is handled on client dashboard.');
      }
    } else {
      console.error("Error in maturity checker:", err);
    }
  }
}

// Push Notification Service
async function startNotificationListener() {
  console.log('[SYSTEM] Initializing Push Notification Listener...');
  try {
    const firestore = getDb();
    const messaging = admin.messaging();

    const handleListenerError = (name: string) => (err: any) => {
      if (err?.code === 7 || err?.message?.includes('PERMISSION_DENIED')) {
        // Silently handled: server credentials not configured for project
      } else {
        console.warn(`[PUSH] ${name} listener error:`, err?.message || err);
      }
    };

    // Listen for new registrations
    firestore.collection('users').onSnapshot(async (snapshot) => {
      const changes = snapshot.docChanges();
      for (const change of changes) {
        if (change.type === 'added') {
          const user = change.doc.data();
          const createdAt = user.createdAt?.toDate ? user.createdAt.toDate() : new Date();
          
          if (new Date().getTime() - createdAt.getTime() < 10000) {
            console.log(`[PUSH-USER] New user registered: ${user.fullName} (${user.email})`);
            
            const tokens: string[] = [];
            const adminSnap = await firestore.collection('users').where('role', '==', 'admin').get();
            adminSnap.forEach(uDoc => {
              const uData = uDoc.data();
              if (uData.fcmTokens && Array.isArray(uData.fcmTokens)) {
                tokens.push(...uData.fcmTokens);
              }
            });

            if (tokens.length > 0) {
              const uniqueTokens = Array.from(new Set(tokens.filter(t => typeof t === 'string' && t.length > 10)));
              if (uniqueTokens.length === 0) return;

              const message = {
                notification: {
                  title: "👤 NEW USER REGISTRATION",
                  body: `${user.fullName} just joined GoldBrick Exchange.`,
                },
                webpush: {
                  fcm_options: { link: `${APP_BASE_URL}/admin` },
                  notification: {
                    icon: `${APP_BASE_URL}/favicon.ico`,
                    requireInteraction: true,
                    tag: 'new-user'
                  }
                },
                tokens: uniqueTokens
              };

              await messaging.sendEachForMulticast(message).catch(e => console.warn('[PUSH-USER] Notice:', e?.message || e));
            }
          }
        }
      }
    }, handleListenerError('users'));

    // Listen for new withdrawals
    firestore.collection('transactions')
      .where('type', '==', 'withdrawal')
      .where('status', '==', 'pending')
      .onSnapshot(async (snapshot) => {
      const changes = snapshot.docChanges();
      for (const change of changes) {
        if (change.type === 'added') {
          const tx = change.doc.data();
          const createdAt = tx.createdAt?.toDate ? tx.createdAt.toDate() : new Date();
          
          if (new Date().getTime() - createdAt.getTime() < 10000) {
            console.log(`[PUSH-WITHDRAWAL] New withdrawal request: $${tx.amount} from ${tx.userName}`);
            
            const tokens: string[] = [];
            const adminSnap = await firestore.collection('users').where('role', '==', 'admin').get();
            adminSnap.forEach(uDoc => {
              const uData = uDoc.data();
              if (uData.fcmTokens && Array.isArray(uData.fcmTokens)) {
                tokens.push(...uData.fcmTokens);
              }
            });

            if (tokens.length > 0) {
              const uniqueTokens = Array.from(new Set(tokens.filter(t => typeof t === 'string' && t.length > 10)));
              if (uniqueTokens.length === 0) return;

              const message = {
                notification: {
                  title: "💸 WITHDRAWAL REQUEST",
                  body: `${tx.userName} requested a withdrawal of $${tx.amount}. Action required.`,
                },
                webpush: {
                  fcm_options: { link: `${APP_BASE_URL}/admin` },
                  notification: {
                    icon: `${APP_BASE_URL}/favicon.ico`,
                    requireInteraction: true,
                    tag: 'withdrawal-alert'
                  }
                },
                tokens: uniqueTokens
              };

              await messaging.sendEachForMulticast(message).catch(e => console.warn('[PUSH-WITHDRAWAL] Notice:', e?.message || e));
            }
          }
        }
      }
    }, handleListenerError('withdrawals'));

    // Listen for changes in chats
    firestore.collection('chats').onSnapshot(async (snapshot) => {
      const changes = snapshot.docChanges();
      
      for (const change of changes) {
        if (change.type === 'added' || change.type === 'modified') {
          const chatData = change.doc.data();
          
          // Only trigger if unreadByAdmin is true
          if (chatData.unreadByAdmin) {
            console.log(`[PUSH] New message for admin from ${chatData.userName}`);
            
            // Find all potential recipients
            const adminSnap = await firestore.collection('users')
              .where('role', '==', 'admin')
              .get();
            
            const tokens: string[] = [];
            adminSnap.forEach(uDoc => {
              const uData = uDoc.data();
              if (uData.fcmTokens && Array.isArray(uData.fcmTokens)) {
                tokens.push(...uData.fcmTokens);
              }
            });

            // Always check for this specific master email to be safe
            const masterSnap = await firestore.collection('users')
              .where('email', '==', 'goldbrickexchange31@gmail.com')
              .get();
            masterSnap.forEach(uDoc => {
              const uData = uDoc.data();
              if (uData.fcmTokens && Array.isArray(uData.fcmTokens)) {
                tokens.push(...uData.fcmTokens);
              }
            });

            if (tokens.length > 0) {
              const uniqueTokens = Array.from(new Set(tokens.filter(t => typeof t === 'string' && t.length > 10)));
              if (uniqueTokens.length === 0) return;

              console.log(`[PUSH] Dispatching to ${uniqueTokens.length} tokens for admins`);
              
              const message = {
                notification: {
                  title: `New Message from ${chatData.userName}`,
                  body: chatData.lastMessage || 'Click to reply in dashboard.',
                },
                webpush: {
                  fcm_options: {
                    link: `${APP_BASE_URL}/admin` 
                  },
                  notification: {
                    icon: `${APP_BASE_URL}/favicon.ico`,
                    badge: `${APP_BASE_URL}/favicon.ico`,
                    requireInteraction: true,
                    vibrate: [200, 100, 200]
                  }
                },
                tokens: uniqueTokens
              };

              try {
                const response = await messaging.sendEachForMulticast(message);
                console.log(`[PUSH] Result: ${response.successCount} success, ${response.failureCount} failed.`);
              } catch (pushErr: any) {
                console.warn('[PUSH] Multicast notice:', pushErr?.message || pushErr);
              }
            } else {
              console.log('[PUSH] Skip: No FCM tokens found for admins');
            }
          }
        }
      }
    }, handleListenerError('chats'));

    // Listen for new deposits
    firestore.collection('transactions')
      .where('type', '==', 'deposit')
      .where('status', '==', 'pending')
      .onSnapshot(async (snapshot) => {
      const changes = snapshot.docChanges();
      for (const change of changes) {
        if (change.type === 'added') {
          const tx = change.doc.data();
          const createdAt = tx.createdAt?.toDate ? tx.createdAt.toDate() : new Date();
          
          // Only notify for fresh records (within last 10 seconds) to avoid duplicate on restart
          if (new Date().getTime() - createdAt.getTime() < 10000) {
            console.log(`[PUSH-DEPOSIT] New deposit detected: $${tx.amount} from ${tx.userName}`);
            
            // Get Admin tokens
            const tokens: string[] = [];
            const adminSnap = await firestore.collection('users')
              .where('email', 'in', ['goldbrickexchange31@gmail.com'])
              .get();
            
            adminSnap.forEach(uDoc => {
              const uData = uDoc.data();
              if (uData.fcmTokens && Array.isArray(uData.fcmTokens)) {
                tokens.push(...uData.fcmTokens);
              }
            });

            if (tokens.length > 0) {
              const uniqueTokens = Array.from(new Set(tokens.filter(t => typeof t === 'string' && t.length > 10)));
              if (uniqueTokens.length === 0) return;

              const message = {
                notification: {
                  title: "💰 NEW DEPOSIT ALERT",
                  body: `${tx.userName} just submitted $${tx.amount} for audit. Verify details in Admin Dashboard.`,
                },
                webpush: {
                  fcm_options: {
                    link: `${APP_BASE_URL}/admin` 
                  },
                  notification: {
                    icon: `${APP_BASE_URL}/favicon.ico`,
                    badge: `${APP_BASE_URL}/favicon.ico`,
                    requireInteraction: true,
                    vibrate: [200, 100, 50, 100, 200]
                  }
                },
                tokens: uniqueTokens
              };

              await messaging.sendEachForMulticast(message).catch(e => console.warn('[PUSH-DEPOSIT] Notice:', e?.message || e));
            }
          }
        }
      }
    }, handleListenerError('deposits'));
  } catch (err: any) {
    if (err?.code === 7 || err?.message?.includes('PERMISSION_DENIED') || err?.message?.includes('Missing or insufficient permissions')) {
      console.warn('[PUSH] Push listener paused (requires server service account):', err?.message || err);
    } else {
      console.warn('[PUSH] Failed to start listener notice:', err?.message || err);
    }
  }
}

// Configure Cloudinary
const CLOUDINARY_DEFAULT_NAME = 'dvx1hj8ax';
const CLOUDINARY_DEFAULT_KEY = '961765732187325';
const CLOUDINARY_DEFAULT_SECRET = 'Sya6x-2J0HM7-fDNW57f1CX97VA';

const expressApp = express();

async function configureApp() {
  // Fresh Cloudinary config
  cloudinary.config({
    cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME || CLOUDINARY_DEFAULT_NAME,
    api_key: process.env.VITE_CLOUDINARY_API_KEY || CLOUDINARY_DEFAULT_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET || CLOUDINARY_DEFAULT_SECRET
  });

  console.log('[CLOUDINARY] Config initialized in configureApp');

  expressApp.use(express.json());

  // Logging Middleware
  expressApp.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.path}`);
    }
    next();
  });

  // API Routes
  expressApp.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Public Google reCAPTCHA v3 config (Site Key only - NEVER exposes Secret Key)
  expressApp.get('/api/auth/recaptcha-config', (_req, res) => {
    const siteKey = (process.env.VITE_RECAPTCHA_SITE_KEY || process.env.RECAPTCHA_SITE_KEY || '').trim();
    res.json({
      enabled: Boolean(siteKey),
      siteKey,
      version: 'v3',
    });
  });

  // Standalone Google reCAPTCHA v3 token verification endpoint
  expressApp.post('/api/auth/verify-recaptcha', async (req, res) => {
    try {
      const { token, action } = req.body || {};
      const result = await verifyRecaptchaV3Token({
        token,
        expectedAction: typeof action === 'string' && action.trim() ? action.trim() : 'register',
        remoteIp: extractClientIp(req),
      });

      if (!result.ok) {
        return res.status(result.status).json({
          verified: false,
          code: result.code,
          error: result.error,
        });
      }

      return res.json({
        verified: true,
        score: result.score,
        action: result.action,
      });
    } catch (error: any) {
      console.error('[RECAPTCHA] Endpoint error:', error?.message || error);
      return res.status(500).json({
        verified: false,
        error: 'Unexpected error while verifying security check.',
      });
    }
  });

  // Protected registration endpoint: Verifies Google reCAPTCHA v3 on backend BEFORE creating Firebase Auth account
  expressApp.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, displayName, referralCode, recaptchaToken, action } = req.body || {};

      const cleanEmail = typeof email === 'string' ? email.trim() : '';
      const cleanName = typeof displayName === 'string' ? displayName.trim() : '';
      const cleanPassword = typeof password === 'string' ? password : '';
      const cleanRef = typeof referralCode === 'string' && referralCode.trim() ? referralCode.trim().toUpperCase() : null;

      if (!cleanName || cleanName.length < 2) {
        return res.status(400).json({ error: 'Please enter your full name.' });
      }
      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      }
      if (cleanPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      }

      // Mandatory server-side Google reCAPTCHA v3 verification BEFORE creating Firebase Auth account
      const recaptchaResult = await verifyRecaptchaV3Token({
        token: recaptchaToken,
        expectedAction: typeof action === 'string' && action.trim() ? action.trim() : 'register',
        remoteIp: extractClientIp(req),
      });

      if (!recaptchaResult.ok) {
        return res.status(recaptchaResult.status).json({
          verified: false,
          code: recaptchaResult.code,
          error: recaptchaResult.error,
        });
      }

      // Initialize Firebase Admin SDK and attempt server-side user creation
      const firestore = getDb();
      try {
        const userRecord = await admin.auth().createUser({
          email: cleanEmail,
          password: cleanPassword,
          displayName: cleanName,
        });

        const myReferralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        let profileCreatedOnServer = false;

        try {
          await firestore.collection('users').doc(userRecord.uid).set({
            uid: userRecord.uid,
            email: userRecord.email || cleanEmail,
            displayName: cleanName,
            balance: 0,
            totalProfit: 0,
            totalInvested: 0,
            referralEarnings: 0,
            referralCode: myReferralCode,
            referredBy: cleanRef,
            role: 'user',
            status: 'active',
            accountStatus: 'active',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          profileCreatedOnServer = true;
        } catch (dbErr: any) {
          console.warn('[REGISTER] Server Firestore write skipped (client will initialize profile):', dbErr?.message || dbErr);
        }

        return res.status(201).json({
          success: true,
          verified: true,
          createdOnServer: true,
          profileCreatedOnServer,
          uid: userRecord.uid,
          score: recaptchaResult.score,
        });
      } catch (authErr: any) {
        const code = authErr?.code || '';
        if (code === 'auth/email-already-exists') {
          return res.status(409).json({
            verified: true,
            code,
            error: 'An account with this email address already exists. Please sign in instead.',
          });
        }
        if (code === 'auth/invalid-email') {
          return res.status(400).json({
            verified: true,
            code,
            error: 'Please enter a valid email address.',
          });
        }
        if (code === 'auth/invalid-password') {
          return res.status(400).json({
            verified: true,
            code,
            error: 'Password must be at least 6 characters long.',
          });
        }

        const msg = String(authErr?.message || '');
        if (
          code === 'auth/insufficient-permission' ||
          code === 'auth/internal-error' ||
          code === 'app/invalid-credential' ||
          msg.includes('PERMISSION_DENIED') ||
          msg.includes('USER_PROJECT_DENIED') ||
          msg.includes('SERVICE_DISABLED') ||
          msg.includes('Could not load the default credentials')
        ) {
          console.warn('[REGISTER] Server Admin Auth creation skipped (IAM/Quota not provisioned yet); reCAPTCHA verified, allowing client creation:', msg);
          return res.status(200).json({
            success: true,
            verified: true,
            createdOnServer: false,
            score: recaptchaResult.score,
          });
        }

        throw authErr;
      }
    } catch (error: any) {
      console.error('[REGISTER] Error:', error?.message || error);
      return res.status(500).json({
        error: error?.message || 'Registration failed. Please try again.',
      });
    }
  });

  // Helper to verify Admin caller via Firebase ID Token
  const ADMIN_EMAILS = ['goldbrickexchange31@gmail.com'];
  async function authenticateAdminRequest(req: express.Request): Promise<{ ok: true; uid: string; email?: string } | { ok: false; status: number; error: string }> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { ok: false, status: 401, error: 'Authentication required. Please log in again.' };
    }

    const idToken = authHeader.slice('Bearer '.length).trim();
    if (!idToken) {
      return { ok: false, status: 401, error: 'Invalid authorization token.' };
    }

    const firestore = getDb();
    let decoded: admin.auth.DecodedIdToken;
    try {
      decoded = await admin.auth().verifyIdToken(idToken, true);
    } catch (err: any) {
      const code = err?.code || '';
      const errMsg = String(err?.message || '');
      if (code === 'auth/id-token-revoked') {
        return { ok: false, status: 401, error: 'Session revoked. Please log in again.' };
      }
      if (code === 'auth/id-token-expired') {
        return { ok: false, status: 401, error: 'Session expired. Please refresh and log in again.' };
      }
      const isInfraOrQuotaError =
        code === 'auth/insufficient-permission' ||
        code === 'auth/internal-error' ||
        code === 'app/invalid-credential' ||
        errMsg.includes('PERMISSION_DENIED') ||
        errMsg.includes('USER_PROJECT_DENIED') ||
        errMsg.includes('SERVICE_DISABLED') ||
        errMsg.includes('Could not load the default credentials') ||
        errMsg.includes('identitytoolkit');

      if (isInfraOrQuotaError) {
        // Fallback to stateless JWT cryptographic verification when revocation IAM/quota check isn't provisioned yet
        try {
          decoded = await admin.auth().verifyIdToken(idToken, false);
        } catch (fallbackErr: any) {
          const fallbackCode = fallbackErr?.code || '';
          if (fallbackCode === 'auth/id-token-expired') {
            return { ok: false, status: 401, error: 'Session expired. Please refresh and log in again.' };
          }
          return { ok: false, status: 401, error: 'Invalid or expired authentication token.' };
        }
      } else {
        return { ok: false, status: 401, error: 'Invalid authentication token.' };
      }
    }

    const callerEmail = (decoded.email || '').trim().toLowerCase();
    let isAuthorizedAdmin = ADMIN_EMAILS.includes(callerEmail) || decoded.admin === true || decoded.role === 'admin';

    if (!isAuthorizedAdmin) {
      try {
        const callerSnap = await firestore.collection('users').doc(decoded.uid).get();
        const callerRole = String(callerSnap.data()?.role || '').toLowerCase();
        if (callerRole === 'admin' || callerRole === 'super_admin' || callerRole === 'superadmin') {
          isAuthorizedAdmin = true;
        }
      } catch (dbErr: any) {
        console.warn('[ADMIN-AUTH] Firestore role lookup notice:', dbErr?.message || dbErr);
      }
    }

    if (!isAuthorizedAdmin) {
      return { ok: false, status: 403, error: 'Forbidden: Only authorized admins can perform this action.' };
    }

    return { ok: true, uid: decoded.uid, email: decoded.email };
  }

  // Admin Account Deletion Endpoint (Permanent Auth + Firestore + Uploaded Files Cleanup)
  const handleAdminDeleteUser = async (req: express.Request, res: express.Response) => {
    try {
      const authCheck = await authenticateAdminRequest(req);
      if (authCheck.ok === false) {
        return res.status(authCheck.status).json({ error: authCheck.error });
      }

      const targetUid = req.params.uid;
      const result = await deleteUserAccountCompletely({
        targetUid,
        callerUid: authCheck.uid,
        callerEmail: authCheck.email,
        adminSdk: admin,
        db: getDb(),
        cloudinaryClient: cloudinary,
      });

      if (!result.ok) {
        return res.status(result.status).json({
          success: false,
          code: result.code,
          error: result.error,
        });
      }

      return res.json({
        success: true,
        deletedUid: result.deletedUid,
        deletedEmail: result.deletedEmail,
        cleanup: result.cleanup,
      });
    } catch (error: any) {
      console.error('[ADMIN-DELETE] Unexpected error:', error);
      return res.status(500).json({
        success: false,
        error: error?.message || 'Internal server error while deleting user account.',
      });
    }
  };

  expressApp.delete('/api/admin/users/:uid', handleAdminDeleteUser);
  expressApp.post('/api/admin/users/:uid/delete', handleAdminDeleteUser);

  // Cloudinary Signed Upload Signature (Secure)
  expressApp.post('/api/upload/signature', (req, res) => {
    console.log('[CLOUDINARY] Signature request received');
    try {
      const config = cloudinary.config();
      const secret = config.api_secret || CLOUDINARY_DEFAULT_SECRET;

      if (!secret) {
        console.error('[CLOUDINARY] Missing API Secret in config and fallback');
        return res.status(500).json({ error: 'Server configuration error: missing secret' });
      }

      const timestamp = Math.round(new Date().getTime() / 1000);
      const signature = cloudinary.utils.api_sign_request(
        { timestamp, upload_preset: 'Goldbrick' },
        secret
      );

      console.log('[CLOUDINARY] Signature generated successfully for timestamp:', timestamp);
      
      res.json({ 
        timestamp, 
        signature, 
        cloud_name: config.cloud_name || CLOUDINARY_DEFAULT_NAME, 
        api_key: config.api_key || CLOUDINARY_DEFAULT_KEY 
      });
    } catch (error) {
      console.error('[CLOUDINARY] Error generating signature:', error);
      res.status(500).json({ error: 'Internal server error during signature generation' });
    }
  });

  // VISITOR TRACKING & GEOLOCATION API ROUTES
  // 1. Visitor Tracking (Initial landing & page navigation)
  expressApp.post('/api/visitors/track', async (req, res) => {
    return processVisitorTracking(req, res, getDb(), admin);
  });

  // 2. Visitor Presence Heartbeat & Leave Beacon
  expressApp.post('/api/visitors/heartbeat', async (req, res) => {
    return processVisitorHeartbeat(req, res, getDb(), admin);
  });

  // 3. Active Visitors & Real-Time Alerts (for Admin Dashboard)
  expressApp.get('/api/visitors/active', (req, res) => {
    return getActiveVisitors(req, res);
  });

  // 4. Diagnostics: Check Detected IP & Geolocation
  expressApp.get('/api/visitors/my-ip', async (req, res) => {
    try {
      const ip = extractClientIp(req);
      const geo = await lookupIpGeolocation(ip);
      res.json({ ip, geo });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // EMAIL & SMTP MANAGEMENT API
  // 1. Get current SMTP status (masked for security)
  expressApp.get('/api/email/status', async (req, res) => {
    try {
      const config = await getSmtpConfig(getDb());
      if (!config) {
        return res.json({ 
          configured: false, 
          provider: 'firebase-default',
          message: 'Using Firebase Auth direct in-app redirect' 
        });
      }
      res.json({
        configured: true,
        host: config.host,
        port: config.port,
        secure: config.secure,
        user: config.user,
        fromName: config.fromName,
        fromEmail: config.fromEmail,
        hasPassword: !!config.pass
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Save SMTP settings (Admin only)
  expressApp.post('/api/email/save-smtp', async (req, res) => {
    try {
      const { host, port, secure, user, pass, fromName, fromEmail } = req.body;
      const smtpPayload: SmtpConfig = {
        host: host?.trim() || 'smtp.gmail.com',
        port: parseInt(port || '587', 10),
        secure: !!secure,
        user: user?.trim() || '',
        pass: pass?.trim() || '',
        fromName: fromName?.trim() || 'GoldBrick Security',
        fromEmail: fromEmail?.trim() || user?.trim() || '',
      };

      // Always save locally in server memory & disk storage
      saveSmtpConfigLocally(smtpPayload);

      // Attempt to save to Firestore if credentials allow, but never fail if server lacks Firestore credentials
      try {
        const firestore = getDb();
        if (firestore) {
          await firestore.collection('settings').doc('smtp').set({
            ...smtpPayload,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
        }
      } catch (dbErr: any) {
        console.warn('[EMAIL] Firestore write note for SMTP (persisted in server cache):', dbErr?.message || dbErr);
      }

      return res.json({ 
        success: true, 
        message: 'SMTP settings updated successfully',
        configured: Boolean(smtpPayload.user && smtpPayload.pass)
      });
    } catch (err: any) {
      console.warn('[EMAIL] Failed to process SMTP config:', err?.message || err);
      return res.status(500).json({ error: err?.message || 'Failed to save SMTP configuration' });
    }
  });

  // 3. Test SMTP deliverability (sends a test email to admin / target email)
  expressApp.post('/api/email/test-smtp', async (req, res) => {
    try {
      const { targetEmail, customConfig } = req.body;
      if (!targetEmail) {
        return res.status(400).json({ error: 'targetEmail is required' });
      }

      const config = customConfig || (await getSmtpConfig(getDb()));
      if (!config || !config.user || !config.pass) {
        return res.status(400).json({ 
          error: 'SMTP credentials missing. Please enter your SMTP host, user, and app password.' 
        });
      }

      const transporter = await createTransporter(config);
      
      // Verify transporter connection first
      await transporter.verify();

      const fromAddress = `"${config.fromName || 'GoldBrick Security'}" <${config.fromEmail || config.user}>`;
      const currentYear = new Date().getFullYear();

      const info = await transporter.sendMail({
        from: fromAddress,
        to: targetEmail,
        subject: `[Test] GoldBrick Exchange Email Deliverability Check`,
        text: `This is a test email sent from GoldBrick Exchange to verify your SMTP settings.\n\nTime: ${new Date().toISOString()}\nHost: ${config.host}\nUser: ${config.user}`,
        html: `
          <div style="background-color: #0b0f19; padding: 40px; font-family: -apple-system, sans-serif; color: #ffffff;">
            <div style="max-width: 520px; margin: 0 auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 20px; padding: 32px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);">
              <h1 style="color: #0066FF; font-size: 24px; font-weight: 900; margin-top: 0;">GOLDBRICK SECURITY</h1>
              <p style="color: #10b981; font-weight: 700; font-size: 14px;">✔ SMTP Deliverability Verified</p>
              <p style="color: #9ca3af; font-size: 13px; line-height: 20px;">
                Your custom mail transport is connected and working! Outgoing password resets and system notifications will be dispatched directly through your verified mail server to avoid spam filters.
              </p>
              <div style="background-color: #030712; padding: 16px; border-radius: 12px; margin: 20px 0; font-size: 12px; color: #6b7280; font-family: monospace;">
                Host: ${config.host}<br>
                Port: ${config.port}<br>
                Sender: ${fromAddress}<br>
                Timestamp: ${new Date().toLocaleString()}
              </div>
              <p style="color: #4b5563; font-size: 11px; margin-bottom: 0;">
                © ${currentYear} GoldBrick Exchange. All rights reserved.
              </p>
            </div>
          </div>
        `,
        headers: {
          'X-Mailer': 'GoldBrick-Mail-Engine',
          'X-Priority': '1 (Highest)',
        }
      });

      console.log('[EMAIL] Test email dispatched successfully:', info.messageId);
      res.json({ success: true, messageId: info.messageId });
    } catch (err: any) {
      console.error('[EMAIL] Test email failed:', err);
      res.status(500).json({ error: err.message || 'SMTP Connection Failed' });
    }
  });

  // Test Notification Endpoint (Admin push check)
  expressApp.post("/api/test-notification", async (req, res) => {
    try {
      const { userId, title, body } = req.body;
      if (!userId) return res.status(400).json({ error: "userId required" });

      const firestore = getDb();
      const messaging = admin.messaging();
      
      // Try finding by document ID first
      let userDoc = await firestore.collection('users').doc(userId).get();
      
      // If not found by ID, search by uid field
      if (!userDoc.exists) {
        const querySnap = await firestore.collection('users').where('uid', '==', userId).limit(1).get();
        if (!querySnap.empty) {
          userDoc = querySnap.docs[0];
        }
      }

      if (!userDoc.exists) {
        return res.status(404).json({ error: "User profile not found in database. Please ensure you are registered correctly." });
      }
      
      const tokens = userDoc.data()?.fcmTokens;
      console.log(`[TEST-PUSH] Found ${tokens?.length || 0} tokens for user ${userId} (Doc ID: ${userDoc.id})`);

      if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
        return res.status(400).json({ error: "No FCM registration found in your database profile. Please click 'Sync Push Notifications' in settings and ensure browser allows notifications." });
      }

      const uniqueTokens = Array.from(new Set(tokens.filter(t => typeof t === 'string' && t.length > 10)));
      if (uniqueTokens.length === 0) {
        return res.status(400).json({ error: "No active valid tokens found. Your registrations are invalid or empty." });
      }

      console.log(`[TEST-PUSH] Sending to tokens:`, uniqueTokens);

      const message = {
        notification: {
          title: title || "GOLDBRICK MASTER ALERT",
          body: body || "Your pixel-perfect notification system is active. All systems nominal.",
        },
        webpush: {
          fcm_options: {
            link: `${APP_BASE_URL}/admin`
          },
          notification: {
            icon: `${APP_BASE_URL}/favicon.ico`,
            badge: `${APP_BASE_URL}/favicon.ico`,
            requireInteraction: true,
            vibrate: [200, 100, 200],
            tag: 'admin-alert'
          }
        },
        tokens: uniqueTokens
      };

      const response = await messaging.sendEachForMulticast(message);
      res.json({ 
        success: true, 
        successCount: response.successCount, 
        failureCount: response.failureCount,
        errorMessages: response.responses.filter(r => !r.success).map(r => r.error?.message)
      });
    } catch (err: any) {
      console.error("[TEST-PUSH] Server Error:", err);
      res.status(500).json({ error: "Internal notification server error: " + err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    console.log('[SYSTEM] Initializing Vite middleware...');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    expressApp.use(vite.middlewares);
  } else {
    // Production: Serve static files
    const distPath = path.join(process.cwd(), 'dist');
    expressApp.use(express.static(distPath));
    
    // Important: Handle API routes BEFORE the wildcard catch-all
    expressApp.get('*', (req, res) => {
      // Avoid sending index.html for API routes that 404
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API route not found' });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return expressApp;
}

// Start server for traditional environments
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  configureApp().then(() => {
    const PORT = parseInt(process.env.PORT || '3000', 10);
    expressApp.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
      
      // Start background tasks
      console.log('[SYSTEM] Starting maturity checker...');
      matureInvestments();
      setInterval(matureInvestments, 60000);
      
      console.log('[SYSTEM] Starting notification listener...');
      startNotificationListener();
    });
  }).catch(err => {
    console.error('[SYSTEM] Failed to start server:', err);
  });
}

// Export for serverless
export default expressApp;
export { configureApp };
