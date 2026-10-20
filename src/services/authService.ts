import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, collection, onSnapshot } from 'firebase/firestore';
import { auth, db, getSecondaryAuth, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { StaffUser, UserRole } from '../types/hotel.ts';
import { logAudit } from './pmsService.ts';

const USERS_COL = 'users';

/**
 * Wires Firebase Auth state to a staff profile stored in Firestore
 * (users/{uid}). Being authenticated is not enough on its own — a signed-in
 * account with no matching profile document is treated as unauthorized and
 * signed back out, so staff access is always driven by an admin-provisioned
 * Firestore record, not just a valid login.
 */
export function subscribeAuthState(
  callback: (user: StaffUser | null, loading: boolean, error?: string) => void
) {
  return onAuthStateChanged(auth, async (fbUser) => {
    if (!fbUser) {
      callback(null, false);
      return;
    }
    try {
      const snap = await getDoc(doc(db, USERS_COL, fbUser.uid));
      if (!snap.exists()) {
        await signOut(auth);
        callback(
          null,
          false,
          'Your account is not yet set up with a staff profile. Contact your hotel administrator.'
        );
        return;
      }
      const data = snap.data() as Omit<StaffUser, 'id'>;
      callback({ id: fbUser.uid, ...data }, false);
    } catch (err) {
      console.error('Failed to load staff profile:', err);
      callback(null, false, 'Could not load your staff profile. Please try again.');
    }
  });
}

export async function loginWithEmail(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export function subscribeStaffUsers(callback: (staff: StaffUser[]) => void) {
  try {
    return onSnapshot(
      collection(db, USERS_COL),
      (snapshot) => {
        const staff: StaffUser[] = [];
        snapshot.forEach((docSnap) => {
          staff.push({ id: docSnap.id, ...docSnap.data() } as StaffUser);
        });
        staff.sort((a, b) => a.name.localeCompare(b.name));
        callback(staff);
      },
      (error) => handleFirestoreError(error, OperationType.GET, USERS_COL)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, USERS_COL);
    return () => {};
  }
}

export async function createStaffAccount(
  data: { name: string; email: string; password: string; role: UserRole; title: string },
  actingAdmin: StaffUser
): Promise<string> {
  const secondaryAuth = getSecondaryAuth();
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, data.email.trim(), data.password);
    const uid = cred.user.uid;

    const profile: Omit<StaffUser, 'id'> = {
      name: data.name,
      email: data.email.trim(),
      role: data.role,
      title: data.title,
    };
    await setDoc(doc(db, USERS_COL, uid), profile);

    await logAudit(
      'CREATE_STAFF_ACCOUNT',
      'Settings',
      uid,
      actingAdmin.name,
      `Created ${data.role} account for ${data.name} (${data.email})`
    );

    return uid;
  } finally {
    // Always drop the throwaway secondary session, success or failure.
    await signOut(secondaryAuth).catch(() => {});
  }
}

export async function removeStaffAccount(
  staffId: string,
  staffName: string,
  actingAdmin: StaffUser
): Promise<void> {
  await deleteDoc(doc(db, USERS_COL, staffId));
  await logAudit(
    'REMOVE_STAFF_ACCOUNT',
    'Settings',
    staffId,
    actingAdmin.name,
    `Removed staff profile for ${staffName}. Their sign-in access is revoked immediately; ` +
      `delete the matching Firebase Authentication account in the console to fully remove it.`
  );
}
