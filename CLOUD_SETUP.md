# Accounts and progress on Vercel

Recommended deployment: **Vercel hosts the app; Supabase provides email/password accounts and a private Postgres progress record per user.** GitHub remains the source repository. The default open deployment serves lessons and PDFs from Vercel. For paid course access, [COURSE_SETUP.md](COURSE_SETUP.md) explains the additional migration, private lesson storage, owner role and Vercel payment functions; PDFs remain freely available.

This repository contains the integration, not a provisioned Supabase project. Until you configure both public environment variables, the app keeps working in local guest mode. Cloud accounts and cross-device progress require the steps below.

## 1. Create the Supabase project and database

1. Open [Supabase](https://supabase.com/dashboard), create a project, and choose a region close to your learners. Save its database password privately.
2. Open **SQL Editor → New query**. Paste and run the complete contents of [the progress migration](supabase/migrations/202610040001_progress.sql) once. Alternatively, link the project with the Supabase CLI and run `supabase db push`.
3. Open **Authentication → Sign In / Providers**, enable **Email**, and keep email confirmation enabled for production. Configure a production SMTP provider in Auth email settings before inviting other learners; Supabase's default email service is for initial testing and has delivery/rate restrictions.
4. Under **Authentication → URL Configuration**, set **Site URL** to your deployed app, for example `https://your-app.vercel.app`. Add that exact app URL with its trailing slash to **Redirect URLs**. Add `http://localhost:3000/` only if you use local cloud testing. Use narrowly scoped preview URLs if you need preview builds; do not allow arbitrary domains.
5. Find the **Project URL** and **publishable key** in the project's Connect/API settings. A legacy **anon** key is also supported. These two values are intentionally public. **Do not use a secret or service-role key in Vercel's frontend configuration.**

The migration creates `study_progress`, enables row-level security, and allows signed-in users to select, insert or update only their own record. Anonymous visitors cannot access records. The `save_study_progress` function uses the signed-in user's ID and an expected revision, so simultaneous devices retry and merge before saving. Deleting a user through Supabase Auth also deletes their cloud progress.

## 2. Connect Vercel

In your existing Vercel project, keep the GitHub repository connected and set the production branch to `main`. Use **Framework Preset: Other**, **Build Command: `npm run build`**, and **Output Directory: `dist`**. The committed `vercel.json` supplies these settings. Do not keep an old output directory override pointing at the repository root.

Add these under **Project → Settings → Environment Variables**:

| Variable | Value |
| --- | --- |
| `GATEWISE_SUPABASE_URL` | `https://YOUR_PROJECT_REF.supabase.co` |
| `GATEWISE_SUPABASE_PUBLISHABLE_KEY` | Your `sb_publishable_...` key, or legacy anon JWT |

Select **Production**, and **Preview** only if you want preview deployments to use that database. Redeploy after adding or changing variables. The build generates `dist/cloud-config.js`; do not put keys into source files or commit a `.env` file. The build rejects a missing half of the configuration and secret/service-role keys.

Future pushes to `main` deploy automatically when Vercel's Git integration is enabled. GitHub stores the code; Supabase stores account progress. A frontend deployment does not run database migrations automatically. Apply future migrations before deploying code that needs them.

## 3. Check the deployment

1. Open the deployed app, click **Sign in → Create an account**, and confirm the email. Sign in, open a lesson, write a note and mark it read. Wait for **Up to date across devices**.
2. Sign in with the same account in another browser or on your phone. The read lesson and note should appear. Continue studying there and refresh the first device, or wait for its next sync (about 30 seconds while visible).
3. Create a second account using a different email. Its workspace should start empty. It must not show the first account's notes or history.
4. To move your earlier work into your account, open **My account → Import guest progress** on the browser/URL that holds that work. Guest storage belongs to that browser and origin; a new Vercel domain cannot automatically read progress from localhost or an older domain.
5. Disconnect the network while signed in and save a note. The status should say **Saved on this device · Offline**. Reconnect and wait for sync before checking another device.

If the account button says accounts are not enabled, check the Vercel environment variables and redeploy. If sign-in works but sync says cloud storage is not ready, check that the SQL migration ran in the same project as your URL/key. If confirmation/reset links fail, check Auth Site URL and Redirect URLs. A sync error never means a successful cloud save: pending work remains in the account's device cache for retry.

## What syncs and how conflicts work

Accounts sync profile preferences, read/check status, bookmarks, revision dates, rich-text module and topic notes, rich-text sticky notes, reading anchors, study days/tasks, question history, completed mock and past-paper history, saved active mock/paper answer sheets, completed study-timer sessions and their journal reflections. Rich notes and study timers use the existing progress record and need no new SQL migration. Sticky notes are stored separately by note ID, including module/lesson context, title, sanitized HTML and paper color, so two devices creating different notes in the same module retain both. Concurrent edits to the same sticky note use the last saved version. Their active timer drafts stay on the current browser and pause on sign-out, under their owning account. Guest progress stays separate unless imported. Import combines histories and sets, retains existing account notes on conflicts, and leaves the guest workspace intact. Only the application's own bank/PDF answer sheets are stored; PDFs and course content are shared static assets.

Local writes happen immediately. Online sync waits about 800 ms to group typing/reading updates; it also runs on reconnect, when returning to the tab and every 30 seconds while visible. The client applies local changes to the latest cloud snapshot and saves only if its revision still matches. Changes to separate lessons/answers are combined. Set changes include removals, so unbookmarking or undoing a read/task status can sync. History entries have stable IDs, preserving repeated attempts while avoiding duplicated imports. Concurrent edits to the same note, check, preference or answer use the last successfully saved edit. This is not live collaborative editing.

An active timed test keeps its original absolute deadline across devices; moving devices does not reset time. A stale draft cannot resurrect a test that another device has finished or replaced. Remote progress updates are used for subsequent navigation; an open lesson is not rebuilt underneath someone typing. Module and topic note editors refresh when idle. If another device updates the focused note, its text stays in place and the editor shows a notice; leaving the field loads the merged note, while typing a new edit makes that local text the next edit to sync.

Each account has a separate local cache. Signing out shows the guest workspace and clears the account cache if all changes reached the cloud. If sync fails, pending changes remain in that account's cache; sign in again on the same device to upload them. On a shared device, complete sync before signing out, or download progress before clearing site storage. Clearing browser data removes unsynced work. The application does not encrypt its device cache separately from the browser.

Email confirmation and password recovery use Supabase's PKCE flow. Open the email link in the browser where you requested it, so that the local verification code is available. Recovery opens the new-password form. The app does not send tokens/passwords in progress records and never needs a database password or privileged key in the browser.

## Local development and checks

Guest mode is still available with `python3 run-local.py` / `py -3 run-local.py`, without Node or cloud configuration. To test cloud mode locally, use Node 22 or later and set the two public variables in your shell, then run:

```sh
npm ci
npm run build
python3 -m http.server 3000 --directory dist
```

For example, in PowerShell set `$env:GATEWISE_SUPABASE_URL` and `$env:GATEWISE_SUPABASE_PUBLISHABLE_KEY` before the build; in bash use `export`. Use your own values without committing them. Run `npm run vendor:cloud` only when updating the pinned SDK, and commit the resulting vendor files and lockfile together. The generated deployment includes only runtime assets and JSON, not source scripts, tests or environment files.

`npm run test:cloud` checks merge/conflict semantics, public-key-only builds and runtime artifact contents, and executes the real SQL migration in embedded Postgres (PGlite), checking owner-only read/write, anonymous denial, revision conflicts, payload constraints and account deletion. Its `auth.uid()` helper emulates Supabase's authenticated user ID. `python3 tests/cloud_accounts.py` checks auth flows, account separation, cross-device sync, offline retry and simultaneous writes against a simulated Supabase HTTP service while running the **source** app on port 3000. These tests do not verify live project configuration or email delivery. After provisioning, perform the deployed checks above and verify RLS with the query in `supabase/tests/isolation.sql` against the real database.

Vercel/Supabase plan limits, database backups, email delivery and project maintenance are managed in their dashboards. Start with plans suited to your usage and review them before opening the site to many learners.
