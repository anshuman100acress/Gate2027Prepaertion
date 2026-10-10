# Activate pricing, protected lessons and the master account

The public repository contains a preview-only catalog and builds in protected mode. It serves previews from Vercel and retrieves full content from Supabase after checking access. Checkout uses Razorpay and grants access only after a verified payment webhook. Full course authoring and publishing use a separate private workspace.

This repository does not contain production payment credentials or an assigned master account. Applying SQL alone creates permissions; uploading the course and setting the deployment variables completes the connection.

## 1. Apply the course migration

Use the same Supabase project as your existing cloud accounts. Keep the existing progress migration installed. In **Supabase → SQL Editor**, run the complete [course migration](supabase/migrations/202610080001_course_access.sql). It creates course content, roles, entitlements and payment records without changing the existing `study_progress` privacy rules.

The migration allows public preview reads, checks full-content access against the authenticated user, and prevents learners from changing their roles or paid status. The master/owner role grants course access, not access to another learner's private notes. Payment and owner-assignment functions can be called only by trusted server operations.

## 2. Upload the course content

Use the **private full-content authoring workspace**, not a clone of the public preview repository. With Node 22 or later, run `npm ci` there. Set these environment variables privately:

| Variable | Value |
| --- | --- |
| `GATEWISE_SUPABASE_URL` | The same `https://YOUR_PROJECT_REF.supabase.co` project URL used for accounts |
| `GATEWISE_SUPABASE_SERVICE_ROLE_KEY` | That project's server secret/service-role key; never a frontend key |
| `GATEWISE_COURSE_ID` | `gate-cs-2027` (the default) |

Run:

```sh
npm run course:publish
```

This uploads the complete 72-lesson syllabus and 3 question resources. Only **Propositional logic**, **C memory and pointers**, and **Quantitative aptitude** are full free previews. A protected frontend contains exactly 10 sample questions, comprising six preview checks, three originals and one PYQ MCQ. The remaining 104 PYQ MCQs are in the protected `pyqs` resource, with source/page references and worked solutions. Uploading again updates stored content and preview flags; the expected result is **72 lessons, 3 previews and 3 resources**.

Premium Studio adds 323 lesson-specific topic guides with five worked cases and five guided practice tasks each, 72 original GATE transfer MCQs, 33 exam-clinic questions, 44 recall cards, targeted timed drills, mistake review and subject performance. Guided exercises use the original worked examples with solutions hidden until opened and a separate self-assessment. External course links are free at their source. Premium additions to preview lessons are stored on restricted lesson rows and restored only after paid/owner authorization, so anonymous preview API reads cannot retrieve them. No additional migration is required.

After changing content or the free tier, publish the complete catalog from the private workspace and export public previews:

```sh
npm run course:previews -- --outdir /separate/release/folder
```

Copy the exported `data/*.json` files into the public release and redeploy its frontend. Do not commit private authoring modules or full paid JSON. The `catalog-info.json` marker retains full-course counts and makes builds reject restricted data or open mode. `course:publish` refuses preview-only input before any database write, preventing a public checkout from replacing the paid bank with samples. Existing deployed static files change only after a frontend deployment. Use `GATEWISE_COURSE_MODE=protected` in Vercel. Leave payment secrets unset while Razorpay approval is pending; purchases remain disabled and the owner still has full access.

Alternatively, put your private values in a local, uncommitted `.env` file and use Node's environment-file support:

```sh
node --env-file=.env scripts/publish-course.mjs
```

The service key is used only by the upload/administration scripts and payment functions. Do not put it in `cloud-config.js`, `course-config.js`, browser JavaScript or source control.

Existing course text is already public in GitHub and its history. Protected hosting prevents unauthorised lesson requests to the deployed app; it cannot make previously published text secret. Keep exclusive future content in private source storage before uploading it.

## 3. Assign your master account

Create/confirm your normal Supabase sign-in account first. Open **Authentication → Users**, select that account, and copy its exact user UUID. With the same private server variables set, run:

```sh
npm run course:owner -- --user YOUR_SUPABASE_AUTH_USER_UUID
```

Or with a local `.env` file:

```sh
node --env-file=.env scripts/set-course-owner.mjs --user YOUR_SUPABASE_AUTH_USER_UUID
```

The command verifies that the Auth user exists and records the owner role with an audit entry. It does not create a hard-coded password or grant a role based on a frontend email match. Sign in with that ordinary account to receive full course access without payment or expiry. Role assignment is a server command; learners cannot promote themselves from the app.

No owner UUID is inferred from your GitHub account or email. The master account needs to be selected explicitly using the actual Auth UUID.

## 4. Configure the protected Vercel deployment

Keep **Framework: Other**, **Build: `npm run build`**, **Output: `dist`**, and GitHub's production branch `main`. Set these in **Vercel → Project → Settings → Environment Variables**:

| Variable | Value / purpose |
| --- | --- |
| `GATEWISE_SUPABASE_URL` | Existing Supabase project URL |
| `GATEWISE_SUPABASE_PUBLISHABLE_KEY` | Existing publishable or legacy anon key; public by design |
| `GATEWISE_COURSE_MODE` | `protected` |
| `GATEWISE_COURSE_ID` | `gate-cs-2027` |
| `GATEWISE_COURSE_PRICE_MINOR` | Regular price: `49900` for ₹499 (default) |
| `GATEWISE_COURSE_OFFER_PRICE_MINOR` | Offer price: `29900` for ₹299 (default) |
| `GATEWISE_COURSE_OFFER_ENDS_AT` | `2026-10-31T18:30:00.000Z` (default): midnight after 31 October in India |
| `GATEWISE_SUPABASE_SERVICE_ROLE_KEY` | Private server key used by payment functions |

Redeploy after adding or changing variables. Protected builds contain the complete outline, 3 full preview lessons and selected preview practice; full lessons and solutions are omitted from public deployment files. Supabase serves the restricted rows only to a paid learner with a valid course entitlement or an owner. PDFs and the learner's own notes remain available.

The pass uses INR and lasts 12 calendar months from confirmed payment. The ₹299 offer ends after **31 October 2026, 11:59 PM IST** and automatically returns to ₹499 without a redeploy. `course-offer.js` is shared by the build, browser and checkout; the server clock determines the charged amount. The deadline never resets per visitor. Keep the same offer variables in the frontend build and server runtime. Each order stores its amount and duration, so a later price change does not reinterpret an earlier payment.

Without payment configuration, the pricing page explains that purchasing is unavailable and leaves previews usable. Full-content access can already be tested with the owner account.

## 5. Connect and test Razorpay checkout

Start with Razorpay **test-mode** credentials in a test deployment. Add:

| Variable | Value / purpose |
| --- | --- |
| `GATEWISE_RAZORPAY_KEY_ID` | Razorpay test key ID, then the live key ID when launching |
| `GATEWISE_RAZORPAY_KEY_SECRET` | Matching private key secret |
| `GATEWISE_RAZORPAY_WEBHOOK_SECRET` | A separate secret set on the webhook in Razorpay |

Create a Razorpay webhook pointing to:

```text
https://YOUR_APP_DOMAIN/api/payment-webhook
```

Subscribe to **payment.captured** and **refund.processed**. Use the same webhook secret as the Vercel variable and redeploy. Checkout creates the order on `/api/checkout` after verifying the signed-in account. The server selects the course and price; browser-supplied prices or user IDs cannot grant access.

A browser checkout success only starts an access refresh. The signed webhook must match a server-created order, its amount/currency and provider payment ID before the database grants the pass. Duplicate callbacks do not extend access. Successful refunds revoke the associated pass, and a delayed capture callback cannot reactivate that refunded purchase. Publish that refund/access behaviour with your sale terms before enabling live purchases; personal notes are retained.

Test a purchase, access on a second device, a refund, and a duplicate/delayed webhook. Use live credentials only after your offer and payment account are ready. This code update does not create a Razorpay business account or enable live charging by itself.

## 6. Verify the deployed result

- **Guest/free learner:** can read all topic titles and free previews; full lesson requests and paid question banks are denied. Own notes stay available after signing in.
- **Paid learner:** the matching course is available until its entitlement expires or is revoked, including after sign-in on another device.
- **Master/owner:** full course access without checkout; another learner's progress/notes remain inaccessible.
- **Account switch/sign-out:** premium content disappears from the current page and memory. A delayed response for the earlier account cannot restore it.
- **Payment:** invalid signatures, mismatched orders/amounts/currencies and learner attempts to edit roles cannot grant access; repeat events preserve the original expiry.

Protected content is kept in memory for the current session rather than stored in browser progress. Access failures show previews and a retry option. Protected lessons need a connection; note edits retain the existing offline save-and-sync behaviour.

## Local checks and rollback

```sh
npm run check
npm run test:cloud
npm run test:course
npm run build
```

`npm run test:release` checks the exported catalog and protected build. Serve `dist` locally and run `TEST_SITE_URL=http://127.0.0.1:3001/ python3 tests/course_release_ui.py` for read-only free-access and mobile checks. In the private authoring workspace, `python3 tests/course_accounts.py` checks paid learner behaviour against simulated Supabase responses. The SQL test executes the real migrations in embedded Postgres. Payment tests use local provider/auth doubles; they do not confirm live credentials or webhook delivery.

Rollback a frontend release by selecting a previous protected Vercel deployment. The public preview checkout deliberately rejects open-mode builds. Open mode is available only in the private full-content workspace and would publish that workspace's full static course. It does not delete accounts, notes, entitlements or payment history.
