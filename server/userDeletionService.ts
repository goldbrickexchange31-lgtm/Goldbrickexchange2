import type admin from 'firebase-admin';
import type { v2 as cloudinaryType } from 'cloudinary';

const PROTECTED_ADMIN_EMAILS = ['goldbrickexchange31@gmail.com'];

export interface UserDeletionResult {
  ok: boolean;
  status: number;
  error?: string;
  code?: string;
  deletedUid?: string;
  deletedEmail?: string | null;
  cleanup?: {
    authRevoked: boolean;
    authDeleted: boolean;
    firestoreDocsDeleted: number;
    collectionsCleaned: string[];
    filesDeleted: number;
    warnings: string[];
  };
}

interface CloudinaryAssetRef {
  publicId: string;
  resourceType: 'image' | 'raw' | 'video';
}

/**
 * Extracts Cloudinary public_id and resource_type from a Cloudinary URL.
 * Returns null for non-Cloudinary URLs (e.g. Google avatar URLs).
 */
export function extractCloudinaryAsset(url: unknown): CloudinaryAssetRef | null {
  if (typeof url !== 'string' || !url.includes('res.cloudinary.com')) {
    return null;
  }

  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/(?:image|raw|video)\/upload\/(?:v\d+\/)?(.+)$/);
    if (!match || !match[1]) return null;

    let publicId = decodeURIComponent(match[1]);
    const resourceType: 'image' | 'raw' | 'video' = parsed.pathname.includes('/raw/upload/')
      ? 'raw'
      : parsed.pathname.includes('/video/upload/')
      ? 'video'
      : 'image';

    // Strip extension for image/video assets so Cloudinary destroy matches the public_id
    if (resourceType !== 'raw') {
      publicId = publicId.replace(/\.[a-zA-Z0-9]+$/, '');
    }

    return publicId ? { publicId, resourceType } : null;
  } catch {
    return null;
  }
}

/**
 * Deletes an array of Firestore DocumentReferences safely in chunks of <= 400.
 */
async function deleteDocRefsInBatches(
  db: admin.firestore.Firestore,
  refs: admin.firestore.DocumentReference[]
): Promise<number> {
  if (refs.length === 0) return 0;

  // Deduplicate by document path
  const uniqueMap = new Map<string, admin.firestore.DocumentReference>();
  for (const ref of refs) {
    uniqueMap.set(ref.path, ref);
  }
  const uniqueRefs = Array.from(uniqueMap.values());

  const CHUNK_SIZE = 400;
  let deletedCount = 0;

  for (let i = 0; i < uniqueRefs.length; i += CHUNK_SIZE) {
    const chunk = uniqueRefs.slice(i, i + CHUNK_SIZE);
    const batch = db.batch();
    for (const ref of chunk) {
      batch.delete(ref);
    }
    await batch.commit();
    deletedCount += chunk.length;
  }

  return deletedCount;
}

/**
 * Permanently deletes a user's Firebase Authentication account (revoking sessions first),
 * removes all user-owned Firestore records, and cleans up associated uploaded files
 * without affecting other users or shared platform configuration.
 */
export async function deleteUserAccountCompletely(options: {
  targetUid: string;
  callerUid: string;
  callerEmail?: string;
  adminSdk: typeof admin;
  db: admin.firestore.Firestore;
  cloudinaryClient: typeof cloudinaryType;
}): Promise<UserDeletionResult> {
  const { targetUid, callerUid, adminSdk, db, cloudinaryClient } = options;
  const warnings: string[] = [];

  if (!targetUid || typeof targetUid !== 'string' || targetUid.trim().length === 0) {
    return {
      ok: false,
      status: 400,
      code: 'invalid-uid',
      error: 'Target user ID is required.',
    };
  }

  const uid = targetUid.trim();

  if (uid === callerUid) {
    return {
      ok: false,
      status: 400,
      code: 'self-deletion-blocked',
      error: 'You cannot delete your own active admin account.',
    };
  }

  // 1. Inspect Firebase Auth user & Firestore user document before deleting anything
  let authUser: admin.auth.UserRecord | null = null;
  let authExists = true;
  try {
    authUser = await adminSdk.auth().getUser(uid);
  } catch (err: any) {
    const errMsg = String(err?.message || '');
    if (err?.code === 'auth/user-not-found') {
      authExists = false;
    } else if (errMsg.includes('Could not load the default credentials')) {
      return {
        ok: false,
        status: 500,
        code: 'missing-service-account',
        error:
          'Firebase Admin credentials are not configured on this server. Add FIREBASE_SERVICE_ACCOUNT_KEY to your server environment variables to enable permanent user deletion.',
      };
    } else if (
      err?.code === 'auth/insufficient-permission' ||
      err?.code === 'auth/internal-error' ||
      err?.code === 'app/invalid-credential' ||
      errMsg.includes('PERMISSION_DENIED') ||
      errMsg.includes('USER_PROJECT_DENIED') ||
      errMsg.includes('SERVICE_DISABLED')
    ) {
      return {
        ok: false,
        status: 500,
        code: 'admin-iam-required',
        error:
          'Firebase Admin Auth permission missing on project goldbrick-cd2b5. Grant roles/firebaseauth.admin and roles/serviceusage.serviceUsageConsumer to your service account in Google Cloud IAM, or set FIREBASE_SERVICE_ACCOUNT_KEY.',
      };
    } else {
      return {
        ok: false,
        status: 500,
        code: err?.code || 'auth-lookup-failed',
        error: errMsg || 'Failed to inspect Firebase Authentication account.',
      };
    }
  }

  let firestoreUserSnap: admin.firestore.DocumentSnapshot | null = null;
  let firestoreUserData: admin.firestore.DocumentData | undefined;
  try {
    firestoreUserSnap = await db.collection('users').doc(uid).get();
    firestoreUserData = firestoreUserSnap.exists ? firestoreUserSnap.data() : undefined;
  } catch (err: any) {
    if (err?.code === 7 || err?.message?.includes('PERMISSION_DENIED')) {
      return {
        ok: false,
        status: 500,
        code: 'firestore-iam-required',
        error:
          'Firebase Admin SDK does not have Firestore write permissions yet. Grant roles/datastore.user to your preview service account in Google Cloud IAM.',
      };
    }
    throw err;
  }

  if (!authExists && !firestoreUserSnap?.exists) {
    return {
      ok: false,
      status: 404,
      code: 'user-not-found',
      error: 'User account no longer exists.',
    };
  }

  // 2. Enforce strict protection against deleting Admin or Super-Admin accounts
  const targetEmail = (authUser?.email || firestoreUserData?.email || '').trim().toLowerCase();
  const firestoreRole = String(firestoreUserData?.role || '').trim().toLowerCase();
  const customClaims = authUser?.customClaims || {};
  const customRole = String(customClaims.role || '').trim().toLowerCase();

  const isProtectedAdmin =
    PROTECTED_ADMIN_EMAILS.includes(targetEmail) ||
    firestoreRole === 'admin' ||
    firestoreRole === 'super_admin' ||
    firestoreRole === 'superadmin' ||
    customClaims.admin === true ||
    customClaims.superAdmin === true ||
    customRole === 'admin' ||
    customRole === 'super_admin' ||
    customRole === 'superadmin';

  if (isProtectedAdmin) {
    return {
      ok: false,
      status: 403,
      code: 'protected-admin-account',
      error: 'Protected admin and super-admin accounts cannot be deleted.',
    };
  }

  // 3. Collect all user-owned Firestore documents and uploaded file references BEFORE deletion
  const refsToDelete: admin.firestore.DocumentReference[] = [];
  const collectionsCleaned = new Set<string>();
  const cloudinaryAssets: CloudinaryAssetRef[] = [];

  if (firestoreUserSnap?.exists) {
    refsToDelete.push(firestoreUserSnap.ref);
    collectionsCleaned.add('users');
    const avatarAsset = extractCloudinaryAsset(firestoreUserData?.profilePic);
    if (avatarAsset) cloudinaryAssets.push(avatarAsset);
  }

  // Check if any duplicate user docs reference uid field
  const extraUsersSnap = await db.collection('users').where('uid', '==', uid).get();
  extraUsersSnap.forEach((docSnap) => {
    refsToDelete.push(docSnap.ref);
    collectionsCleaned.add('users');
    const asset = extractCloudinaryAsset(docSnap.data()?.profilePic);
    if (asset) cloudinaryAssets.push(asset);
  });

  // Investments owned by user
  const investmentsSnap = await db.collection('investments').where('userId', '==', uid).get();
  if (!investmentsSnap.empty) {
    collectionsCleaned.add('investments');
    investmentsSnap.forEach((docSnap) => refsToDelete.push(docSnap.ref));
  }

  // Transactions owned by user (also collect Cloudinary receipts)
  const txSnap = await db.collection('transactions').where('userId', '==', uid).get();
  if (!txSnap.empty) {
    collectionsCleaned.add('transactions');
    txSnap.forEach((docSnap) => {
      refsToDelete.push(docSnap.ref);
      const receiptAsset = extractCloudinaryAsset(docSnap.data()?.receiptUrl);
      if (receiptAsset) cloudinaryAssets.push(receiptAsset);
    });
  }

  // Activation requests owned by user (also collect Cloudinary proof images)
  const activationSnap = await db.collection('activationRequests').where('userId', '==', uid).get();
  if (!activationSnap.empty) {
    collectionsCleaned.add('activationRequests');
    activationSnap.forEach((docSnap) => {
      refsToDelete.push(docSnap.ref);
      const proofAsset = extractCloudinaryAsset(docSnap.data()?.paymentProof);
      if (proofAsset) cloudinaryAssets.push(proofAsset);
    });
  }

  // Support chat document and all messages subcollection docs
  const chatRef = db.collection('chats').doc(uid);
  const chatSnap = await chatRef.get();
  const chatMessagesSnap = await chatRef.collection('messages').get();
  if (!chatMessagesSnap.empty) {
    collectionsCleaned.add('chats/messages');
    chatMessagesSnap.forEach((msgSnap) => refsToDelete.push(msgSnap.ref));
  }
  if (chatSnap.exists) {
    collectionsCleaned.add('chats');
    refsToDelete.push(chatRef);
  }

  // Optional visitor records tied specifically to this userId (do not touch anonymous/other visitor records)
  const visitorSnap = await db.collection('visitors').where('userId', '==', uid).get();
  if (!visitorSnap.empty) {
    collectionsCleaned.add('visitors');
    visitorSnap.forEach((docSnap) => refsToDelete.push(docSnap.ref));
  }

  const visitorNotifSnap = await db.collection('visitor_notifications').where('userId', '==', uid).get();
  if (!visitorNotifSnap.empty) {
    collectionsCleaned.add('visitor_notifications');
    visitorNotifSnap.forEach((docSnap) => refsToDelete.push(docSnap.ref));
  }

  // 4. Revoke sessions and permanently delete Firebase Authentication user first
  let authRevoked = false;
  let authDeleted = false;

  if (authExists) {
    try {
      await adminSdk.auth().revokeRefreshTokens(uid);
      authRevoked = true;
    } catch (err: any) {
      if (err?.code !== 'auth/user-not-found') {
        warnings.push(`Session revocation warning: ${err?.message || 'Unable to revoke refresh tokens'}`);
      }
    }

    try {
      await adminSdk.auth().deleteUser(uid);
      authDeleted = true;
    } catch (err: any) {
      const errMsg = String(err?.message || '');
      if (err?.code === 'auth/user-not-found') {
        authDeleted = true;
      } else if (
        err?.code === 'auth/insufficient-permission' ||
        err?.code === 'auth/internal-error' ||
        errMsg.includes('PERMISSION_DENIED') ||
        errMsg.includes('USER_PROJECT_DENIED') ||
        errMsg.includes('SERVICE_DISABLED')
      ) {
        return {
          ok: false,
          status: 500,
          code: 'admin-iam-required',
          error:
            'Firebase Admin Auth permission missing on project goldbrick-cd2b5. Grant roles/firebaseauth.admin and roles/serviceusage.serviceUsageConsumer to your service account in Google Cloud IAM, or set FIREBASE_SERVICE_ACCOUNT_KEY.',
        };
      } else {
        return {
          ok: false,
          status: 500,
          code: err?.code || 'auth-delete-failed',
          error: `Failed to delete Firebase Authentication user: ${errMsg || 'Unknown Auth error'}`,
        };
      }
    }
  }

  // 5. Delete collected Firestore documents
  let firestoreDocsDeleted = 0;
  try {
    firestoreDocsDeleted = await deleteDocRefsInBatches(db, refsToDelete);
  } catch (err: any) {
    warnings.push(`Partial Firestore cleanup failure: ${err?.message || 'Could not remove all Firestore documents'}`);
  }

  // 6. Clean up uploaded Cloudinary assets & optional Firebase Storage files
  let filesDeleted = 0;
  if (cloudinaryAssets.length > 0) {
    const uniqueAssets = new Map<string, CloudinaryAssetRef>();
    for (const asset of cloudinaryAssets) {
      uniqueAssets.set(`${asset.resourceType}:${asset.publicId}`, asset);
    }

    const destroyResults = await Promise.allSettled(
      Array.from(uniqueAssets.values()).map((asset) =>
        cloudinaryClient.uploader.destroy(asset.publicId, {
          resource_type: asset.resourceType,
          invalidate: true,
        })
      )
    );

    destroyResults.forEach((res, idx) => {
      if (res.status === 'fulfilled') {
        if (res.value?.result === 'ok' || res.value?.result === 'not found') {
          if (res.value?.result === 'ok') filesDeleted += 1;
        }
      } else {
        warnings.push(`File cleanup #${idx + 1} failed: ${res.reason?.message || 'Cloudinary error'}`);
      }
    });
  }

  // Also attempt safe Firebase Storage prefix cleanup if a default bucket exists
  try {
    const storage = adminSdk.storage();
    const bucket = storage.bucket();
    if (bucket?.name) {
      const [storageFiles] = await bucket.getFiles({ prefix: `users/${uid}/` });
      if (storageFiles.length > 0) {
        await Promise.allSettled(storageFiles.map((f) => f.delete()));
        filesDeleted += storageFiles.length;
      }
    }
  } catch {
    // Firebase Storage bucket may not be used (app uses Cloudinary); ignore cleanly
  }

  console.log(
    `[ADMIN-DELETE] Deleted user ${uid} (${targetEmail || 'no-email'}): authDeleted=${authDeleted}, firestoreDocs=${firestoreDocsDeleted}, filesDeleted=${filesDeleted}`
  );

  return {
    ok: true,
    status: 200,
    deletedUid: uid,
    deletedEmail: authUser?.email || firestoreUserData?.email || null,
    cleanup: {
      authRevoked,
      authDeleted,
      firestoreDocsDeleted,
      collectionsCleaned: Array.from(collectionsCleaned),
      filesDeleted,
      warnings,
    },
  };
}
