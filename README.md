# GrandAura PMS — Hotel Property Management System

A front-desk operations system for a small/mid-size hotel: room inventory,
reservations, check-in/check-out, housekeeping task boards, billing &
folios, and a settings/audit panel — built as a React + TypeScript single
page app on top of Firebase (Firestore + Authentication).

## Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4
- **Backend:** Firebase — Firestore (data) + Firebase Authentication
  (staff sign-in). There is no separate server; the browser talks to
  Firebase directly, protected by `firestore.rules`.

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a Firebase project (or use the one already wired up via
   `firebase-applet-config.json`, which works out of the box with no
   `.env` file for local development/demo purposes).

   For your own Firebase project instead, copy `.env.example` to
   `.env.local` and fill in the values from **Firebase Console > Project
   Settings > General > Your apps**.
3. Deploy the security rules to your Firebase project (requires the
   [Firebase CLI](https://firebase.google.com/docs/cli)):
   ```bash
   firebase deploy --only firestore:rules --project <your-project-id>
   ```
4. Create your first admin account (see **Staff accounts** below).
5. Run the app:
   ```bash
   npm run dev
   ```

## Staff accounts & roles

There are three roles: `admin`, `receptionist`, `housekeeper`, each with a
different permission set (see `src/context/AuthContext.tsx`). Staff sign in
with a real email + password (Firebase Authentication); their role lives in
a matching Firestore document at `users/{uid}`.

**Bootstrapping the first admin.** Because the security rules only let an
*existing* admin create staff accounts, the very first one has to be
created outside the app, with the Firebase Admin SDK (which bypasses
Firestore rules):

1. Firebase Console → Project Settings → Service Accounts → **Generate new
   private key**. Save the file as `service-account.json` in the project
   root (already excluded from git).
2. Edit the `STAFF` list in `scripts/seed-staff.mjs` if you want different
   names/emails than the defaults (it recreates the original demo roster:
   an admin, a receptionist, a housekeeper).
3. Run:
   ```bash
   npm run seed:staff
   ```
4. Log in with one of those emails, then **change the temporary password**
   and add any further staff from **Settings → Staff Accounts** — no more
   script runs needed after this.

Removing a staff member's access from Settings deletes their Firestore
profile (they're immediately locked out), but doesn't delete the
underlying Firebase Auth account — do that from the Firebase console if
you want it gone entirely.

## Firestore security model

`firestore.rules` enforces, per collection:

| Collection | Read | Write |
|---|---|---|
| `users` (staff profiles) | any signed-in staff | admin only |
| `rooms` | any signed-in staff | create/delete: admin · update: admin/receptionist/housekeeper |
| `reservations` | any signed-in staff | admin/receptionist (delete: admin) |
| `invoices` | any signed-in staff | admin/receptionist (delete: admin) |
| `payments` | any signed-in staff | create: admin/receptionist · update/delete: admin |
| `housekeepingTasks` | any signed-in staff | create: admin/receptionist · update: +housekeeper · delete: admin |
| `auditLogs` | admin only | create: any signed-in staff · immutable (no update/delete) |
| `settings` | any signed-in staff | admin only |

Nothing is readable or writable by an unauthenticated client.

## Deploying

The app builds to static files (`npm run build` → `dist/`) and can be
hosted anywhere that serves static sites — Netlify, Firebase Hosting,
Vercel, etc. This repo ships a `netlify.toml` for Netlify:

1. Push the repo to GitHub/GitLab and connect it on
   [netlify.com](https://netlify.com), or run `netlify deploy` with the
   Netlify CLI.
2. In **Site settings → Environment variables**, add the `VITE_FIREBASE_*`
   variables from `.env.example` with your Firebase project's real values.
   (If you skip this, the app falls back to the config baked into
   `firebase-applet-config.json`, which still works but points at the
   original demo Firebase project.)
3. Netlify picks up the build command (`npm run build`) and publish
   directory (`dist`) from `netlify.toml` automatically.

Firebase web config values (API key, etc.) are not secret in the way a
server API key is — they're meant to ship in the client bundle. Real
protection comes from `firestore.rules` and Authentication, and
optionally from restricting the API key's allowed referrers / enabling
Firebase App Check in the Firebase console for extra hardening.

## Project structure

```
src/
  components/      UI views, modals, and the login screen
  context/          AuthContext — current staff user + role permissions
  services/
    pmsService.ts   All hotel data CRUD (rooms, reservations, billing, ...)
    authService.ts  Firebase Auth wiring + staff account management
  lib/firebase.ts    Firebase app/auth/firestore initialization
  types/hotel.ts      Shared TypeScript types
scripts/seed-staff.mjs  One-time admin bootstrap (Firebase Admin SDK)
```

## Run and deploy your AI Studio app

This project was originally scaffolded in Google AI Studio:
https://ai.studio/apps/b596fe7a-c1c2-4ff3-89dc-03819fbbed1e
