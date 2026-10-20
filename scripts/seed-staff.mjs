#!/usr/bin/env node
/**
 * One-time bootstrap script: creates the first real staff accounts
 * (Firebase Authentication users + matching Firestore `users/{uid}`
 * profile documents) so there's an initial admin who can log in and
 * manage everyone else from the in-app "Staff Accounts" screen.
 *
 * Why this exists: with firestore.rules locked down to admin-only writes
 * on the `users` collection, nothing inside the app itself can create the
 * very first admin account (that would be a chicken-and-egg problem).
 * This script runs with the Firebase Admin SDK, which bypasses Firestore
 * security rules entirely, so it's the one place that bootstrap is safe
 * to do.
 *
 * Usage:
 *   1. Firebase Console > Project Settings > Service Accounts >
 *      "Generate new private key" — save the downloaded JSON as
 *      service-account.json in the project root (already gitignored).
 *   2. Edit the STAFF list below with real names/emails/passwords, or
 *      leave the defaults to recreate the original demo roster.
 *   3. Run: npm run seed:staff
 *
 * Safe to re-run: existing accounts (matched by email) are left alone.
 */

import { readFileSync } from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const SERVICE_ACCOUNT_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json';
const FIRESTORE_DATABASE_ID = process.env.VITE_FIREBASE_FIRESTORE_DB_ID || '(default)';

const STAFF = [
  {
    name: 'Eleanor Vance',
    email: 'e.vance@grandaurahotel.com',
    password: 'ChangeMe123!',
    role: 'admin',
    title: 'General Manager',
  },
  {
    name: 'Marcus Chen',
    email: 'm.chen@grandaurahotel.com',
    password: 'ChangeMe123!',
    role: 'receptionist',
    title: 'Front Desk Lead',
  },
  {
    name: 'Rosa Morales',
    email: 'r.morales@grandaurahotel.com',
    password: 'ChangeMe123!',
    role: 'housekeeper',
    title: 'Executive Housekeeper',
  },
];

async function main() {
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));
  } catch (err) {
    console.error(
      `\nCouldn't read service account key at "${SERVICE_ACCOUNT_PATH}".\n` +
        'Download one from Firebase Console > Project Settings > Service Accounts\n' +
        '> Generate new private key, save it as service-account.json in the project root,\n' +
        'or set GOOGLE_APPLICATION_CREDENTIALS to its path.\n'
    );
    process.exit(1);
  }

  initializeApp({ credential: cert(serviceAccount) });
  const auth = getAuth();
  const db = getFirestore();
  if (FIRESTORE_DATABASE_ID !== '(default)') {
    db.settings({ databaseId: FIRESTORE_DATABASE_ID });
  }

  for (const staff of STAFF) {
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(staff.email);
      console.log(`Already exists, skipping auth creation: ${staff.email}`);
    } catch {
      userRecord = await auth.createUser({
        email: staff.email,
        password: staff.password,
        displayName: staff.name,
      });
      console.log(`Created Auth user: ${staff.email} (${userRecord.uid})`);
    }

    await db.collection('users').doc(userRecord.uid).set(
      {
        name: staff.name,
        email: staff.email,
        role: staff.role,
        title: staff.title,
      },
      { merge: true }
    );
    console.log(`  -> Firestore profile set: role=${staff.role}`);
  }

  console.log('\nDone. You can now log in with any of the emails above.');
  console.log('IMPORTANT: change these temporary passwords after first login.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
