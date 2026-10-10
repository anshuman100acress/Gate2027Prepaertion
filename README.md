# GateClimb — GATE CS 2027

This public repository contains the protected frontend, 3 complete preview lessons, 10 sample questions and 24 past-year PDFs. The full course and paid answers are stored in Supabase and load only for an entitled learner or the owner. New premium authoring files are kept in a separate private workspace.

Clone this repository, then run `py -3 run-local.py` on Windows or `python3 run-local.py` on macOS/Linux to view the previews locally. No account or API key is needed for those previews. To enable sign-in and paid content, build with the public Supabase settings described in [COURSE_SETUP.md](COURSE_SETUP.md). See [LOCAL_SETUP.md](LOCAL_SETUP.md).

## Learning workflow

The uploaded CS syllabus is mapped into 72 sequenced lessons: 70 across its ten sections and two additional General Aptitude lessons. The library is searchable by syllabus terms, lesson titles and explanation text, with a separate roadmap per subject. Each lesson contains:

- Prerequisites and 257 detailed concept tutorials, followed by 275 supplementary explanations. Every named topic also has a focused extension explaining intuition, procedure and assumptions; 295 such extensions cover the topic contexts linked by all 305 syllabus entries.
- 1,286 interleaved worked examples, including 885 new examples in three styles for every topic: **Basic walkthrough**, **Exam-style application**, and **Trap or edge case**. Every new example has at least three reasoned steps, an answer and a check. Original examples remain available. Topic chips open the focused explanation, with shortcuts to all three example styles; earlier reading links still work.
- A topic-specific GATE solving method, equation references with assumptions, two explained traps/counterexamples, and revision reminders in every lesson.
- Two optional topic-specific checks with hints and explained solutions: 144 checks, mixing conceptual MCQs and numerical applications.
- Personal notes, bookmarking, scheduled reviews, and a saved reading position.

Lessons are continuous pages: an explanation is followed by the worked examples matched to it, then the next explanation. Every detailed tutorial is immediately followed by its own example. Original examples retain their section assignments and saved anchors. Topic chips and chapter links jump to the explanation; repeated topics link to their focused lesson. Optional questions come after all the teaching material and open on request, rather than interrupting reading. Reading a solution does not record a passed check. Marking a lesson read is separate from passing its two checks, and neither locks or unlocks other lessons. Passing these short checks is not a claim of full GATE mastery. Five interactive teaching demonstrations cover truth tables, signed encoding, pipelines, binary search, and FIFO/LRU page replacement. Selected programming/algorithm lessons include code or pseudocode.

Revision & notes collects saved topics, due dates and notes, and exports notes as Markdown. Study sessions focus on theory, worked examples and review. When upgrading from the old 34-summary version, old completion IDs are archived in browser storage rather than counting as reading the expanded curriculum. Existing names, practice history and mock results are retained.

[PRICING_AND_ACCESS.md](PRICING_AND_ACCESS.md) describes the free preview, one-time course pass and server-managed owner role. The public release builds in protected mode and loads full lessons from Supabase, with a pricing page and verified Razorpay checkout/webhook integration. Payment credentials and owner assignment stay on the server. Follow [COURSE_SETUP.md](COURSE_SETUP.md) to configure a deployment or publish updates from the private authoring workspace. Personal notes stay available regardless of paid access.

The 12-month course pass costs **₹299 through 31 October 2026, 11:59 PM IST**, then **₹499**. The frontend and checkout share the same fixed offer rules; checkout uses the server clock. A protected build contains only the course outline, selected complete preview lessons and preview practice. Full lesson and question-bank requests are checked by database permissions. The owner role gives full course access without payment and does not grant access to other learners' progress or notes. Existing public course material remains available in this repository and its history; exclusive future content needs private source storage.

Every subject roadmap has **Your notes for this module** for formulas and connections across lessons. Each lesson's **My notes** shortcut jumps to **Your notes for this topic**. Both areas use a rich-text editor with bold, italic, underline, headings, lists, highlights and safe links. Earlier text notes load automatically into the editor. Notes save as you type; the editor shows local, offline, syncing, successful-sync or retry status and includes **Sync now** / **Sign in to sync**. Sign in to the same Supabase account to sync both module and topic notes across devices. Guest notes stay on the current browser until explicitly imported. **Revision & notes → My notes** and Markdown exports preserve formatting. A cloud update refreshes an idle note editor without rebuilding the lesson; a focused editor retains its displayed text until you leave the field or make a new edit. Text and formatting merge together for concurrent edits of the same note; the last saved edit wins.

Every module roadmap and lesson also has a **Sticky notes** board. Choose **Add sticky note**, give it a title, and use bold, italic, underline, headings, bulleted/numbered lists, highlights and links in its rich-text editor. Choose a yellow, green, blue or pink paper color; add multiple notes for the same module. Changes autosave locally and sync through your existing Supabase account. Sticky notes appear in **Revision & notes → My notes** and in the Markdown export. Imported or cloud HTML is restricted to supported formatting and safe links. Each sticky note merges separately across devices; concurrent edits to the same note use the last saved version. Remote updates wait until you leave a focused note, and a remotely deleted focused note stays visible for copying until you leave it. Offline/failed cloud saves remain in the account cache for retry. No additional Supabase migration is needed.

## Study timer and session journal

Use the **Timer** button in the header, **Time this lesson** in a lesson, or **Study tools** in the navigation. Start a stopwatch, a 25/5 or 50/10 Pomodoro, or a custom 1–180-minute focus block with a 1–30-minute break. Optionally choose a topic, activity and one achievable session goal. A compact timer stays visible while moving between lessons and practice; pause/resume works there as well as in the timer dialog. A running timer continues across navigation, background tabs and refreshes on this browser. Pause before stepping away. Changing topics does not silently relabel an existing session; finish it and start another for the new topic.

Finish a stopwatch to save its time. Pomodoro focus blocks save automatically at the focus deadline, start their break, and wait for you to start the next block. Pauses and breaks never count as study time. Delayed browser callbacks do not extend the focus allocation or automatically create more blocks. Sessions crossing midnight split their time between dates in India time.

The overview and Study tools show progress toward your existing daily hours target, totals for the last seven days and all tracked time, an interactive day chart, activity totals and the latest 50 session records. Completed time and optional session reflections sync with your account and combine records from different devices without duplication. Daily/weekly/all-time totals count overlapping intervals only once if two devices accidentally run timers together; activity entries show the time logged for each activity. The active timer stays on its current browser. Signing out pauses the unfinished timer and keeps its draft under its owner's account; it is restored when that account signs in on the same browser. Guest sessions can be imported into an account using the existing guest import action. A timer measures the intervals you explicitly start; it does not detect attention or retroactively time past study.

After a session, optionally explain one concept from memory, record a mistake/confusion, and write your next action. If the session is attached to a lesson, **Review this topic tomorrow** adds it to Revision & notes, retaining an earlier existing due date. Time and reflection never mark a lesson read or a learning check passed.

`npm run test:study` checks timer arithmetic, midnight allocation and cloud merge semantics. With the local server on port 3000, `python tests/study_tools.py` checks stopwatch controls, pause, navigation/refresh, topic context, reflection, scheduled review, Pomodoro recovery, multi-tab behavior and mobile layout using a simulated clock. Cloud account tests also cover synced time, journal entries and account isolation for unfinished drafts.

With the source app on port 3000, `python3 tests/module_notes.py` checks rich module/topic editors, local persistence, revision, Markdown export, deletion, literal text, storage failures and phone layout. `python3 tests/cloud_accounts.py` also checks rich note-editor autosaving, cross-device text/format updates, focused-editor preservation, offline reconnect and account isolation using simulated Supabase responses. `npm run test:cloud` includes regression checks for formatting-only conflicts, guest imports and repeated local-storage failures.

`python3 tests/sticky_notes.py` checks rich formatting, colors, multiple module/lesson notes, safe paste and cloud HTML, preservation of earlier notes, revision/export, deletion, storage retry and mobile layout. Cloud account checks also cover rich-text sticky autosaving, same-module notes from separate devices, offline creation, reload after failed sync, guest imports and remote deletion while a note is focused.

## Practice and mocks

Practice separates 144 topic learning checks, 132 original subject-wide questions, 33 exam-clinic questions, 72 lesson-specific GATE transfer MCQs and **105 PYQ-based MCQs across all 24 uploaded papers**: **486 scored questions** in total. **PYQ MCQs** provides paper/year/topic filtering, answer checking, worked solutions and original PDF page references. A protected build serves exactly one free PYQ MCQ alongside three original questions and six lesson checks; the other 104 PYQ MCQs load only for paid/owner accounts. Each answer states whether it matches an official final key, an included key, or an independent solution. Adapted numerical questions are labelled. The curated generator and complete content checks run in the private authoring workspace. Exact topic selection only includes questions explicitly associated with that lesson; it does not silently substitute unrelated subject questions. The original bank includes parameterized variations; their solutions show the substituted values and explain the calculation and common interpretation errors. These and the learning checks are not official PYQs.

In protected mode, free learners receive 3 full preview lessons (logic, C memory and quantitative aptitude) and exactly 10 sample questions, including the preview checks. Personal notes, saved progress, study timers and public paper PDFs remain available.

**Premium studio** contains 323 lesson-specific guides covering every named topic (293 distinct topic names). Each combines an explanation, a solving method, five worked cases and five guided practice tasks with reasoning levels, saved working, self-assessment and links to primary resources from MIT, Stanford, NPTEL, Berkeley, OSTEP, OpenStax and Purdue. The 1,615 worked-case placements and 1,615 guided tasks use focused topic examples, a teaching-unit application and a comparative reasoning problem. Guided practice reinforces those cases with solutions hidden and self-assessment; 72 new lesson transfer MCQs use separate instances and join the scored bank. Five course reasoning levels run from Foundation to Synthesis. Formulas include their conditions, and solving tips explain when a shortcut is valid. Broad navigation categories have a lesson-specific practice set. External sources are freely available and are linked, not copied into paid content.

Paid learners and the master can also use timed subject/lesson drills, a latest-mistake retry queue, practice performance by subject, and 44 spaced-recall cards across all 11 subjects. Recall intervals are 1, 3, 7, 14 and 30 days; “Again” queues an immediate review. Focused drills measure accuracy without negative marking, while full mocks retain GATE-style scoring. In-progress drills save only question IDs, answers and timing; course text and solutions are never persisted in protected browser progress. Signed-in working, recall schedules and completed drills sync through the existing private progress record.

In the private authoring workspace, `npm run test:premium` checks complete topic coverage, new numerical questions and progress merges, and `python3 tests/course_accounts.py` checks paid/free browser flows against simulated Supabase. In a public checkout, the premium and PYQ test commands instead validate preview isolation; full-content fixtures are intentionally absent. `npm run test:release` checks preview counts, build isolation, the offer deadline and protection against publishing previews over the full course. Serve a protected build and run `TEST_SITE_URL=http://127.0.0.1:3001/ python3 tests/course_release_ui.py` for read-only browser checks.

A full-length original mock contains 65 questions, 180 minutes and 100 marks, including 10 GA questions / 15 marks. It uses the original bank, with MCQ-only negative marking, no MSQ partial credit, answer navigation, review flags, resumable timing and post-test explanations. Its topic weights do not predict the actual exam. Check official 2027 examination rules when published.

## Past-year papers

All 24 uploaded PDFs spanning 2007–2026 are retained in `papers/`. Some bundle multiple sessions/paper codes and some contain scanned pages. Original PDF viewing preserves equations and diagrams.

Each PDF supports a labelled timed attempt, saved answer sheet, history, review and JSON export. The 2018 PDF has a fully matched included scoring key: 65 entries, 100 marks, original GA/CS numbering and NAT acceptance ranges. Other papers remain unscored until their exact session/code keys are verified. Nine individually checked 2018 MCQs have explanations and source labels. The remaining PDF questions have not all been converted into individually interactive questions or solved explanations.

## Update to the continuous reader

The continuous concept/example reader is available on `main`.

```powershell
git fetch origin
git switch main
git pull origin main
py -3 run-local.py
```

Stop the server before updating and refresh your browser afterward. Retain any local edits before switching. Prior read/check progress and notes persist, and old tab-stage positions migrate to reading anchors.

## Data and checks

Regenerate and publish the complete catalog only from the private authoring workspace. Before updating this public repository, run `npm run course:previews -- --outdir /separate/release/folder` there and copy the exported `data/*.json` files into the public release. Its `catalog-info.json` records full-course counts without paid answers. The build validates that this export contains only previews, and `course:publish` rejects a preview-only checkout before writing to Supabase. Legacy generators and already published course text remain in repository history; they do not contain the new premium additions.

Mathematical notation uses local KaTeX 0.16.22 (MIT) with bundled fonts and accessible MathML. It renders LaTeX in lessons, worked examples, dynamically inserted practice feedback and mock review; code and personal notes stay literal. No CDN or package installation is needed. See `vendor/katex/LICENSE` and `VERSION.txt`.

Guest progress saves in this browser. Supabase accounts sync private progress across devices, including lessons, notes, reading positions, practice history, and mock/past-paper attempts. Vercel remains the frontend host. See [CLOUD_SETUP.md](CLOUD_SETUP.md) for the database migration, email settings, Vercel variables and deployment checks. The cloud integration is inactive until a Supabase project is configured. External Google Fonts are optional; system fonts work when unavailable. Preview lessons and PDFs are local assets; paid lessons require an authorized Supabase connection.

The complete learning-flow, math-rendering, topic-tutorial and simulated paid-account browser tests require the private full-content fixtures. The public release uses `tests/course_release_ui.py` for preview and locked-page verification. Browser scripts require Playwright and Chromium for development, not for running the app.

Content is original instructional material organized against the supplied syllabus. It is not an official GATE course or a substitute for all reference-book exercises. See [SYLLABUS_COVERAGE.md](SYLLABUS_COVERAGE.md) for the topic-to-lesson map.

## Mobile app and installation

Phones have a dedicated home screen, compact learning paths, bottom navigation and study controls. The protected production build is installable as a PWA and reopens offline with free previews and saved personal work. See [MOBILE_PWA.md](MOBILE_PWA.md) for installation, caching boundaries and mobile browser checks.
