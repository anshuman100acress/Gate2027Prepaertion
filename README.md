# Gatewise — GATE CS 2027

Clone this repository, then run `py -3 run-local.py` on Windows or `python3 run-local.py` on macOS/Linux. The launcher opens the app and serves all lessons and PDFs locally. Keep the terminal running. No Node.js, package installation, account, or API key is needed. See [LOCAL_SETUP.md](LOCAL_SETUP.md).

## Learning workflow

The uploaded CS syllabus is mapped into 72 sequenced lessons: 70 across its ten sections and two additional General Aptitude lessons. The library is searchable by syllabus terms, lesson titles and explanation text, with a separate roadmap per subject. Each lesson contains:

- Prerequisites and 257 detailed concept tutorials, followed by 275 supplementary explanations. Every named topic also has a focused extension explaining intuition, procedure and assumptions; 295 such extensions cover the topic contexts linked by all 305 syllabus entries.
- 1,286 interleaved worked examples, including 885 new examples in three styles for every topic: **Basic walkthrough**, **Exam-style application**, and **Trap or edge case**. Every new example has at least three reasoned steps, an answer and a check. Original examples remain available. Topic chips open the focused explanation, with shortcuts to all three example styles; earlier reading links still work.
- A topic-specific GATE solving method, equation references with assumptions, two explained traps/counterexamples, and revision reminders in every lesson.
- Two optional topic-specific checks with hints and explained solutions: 144 checks, mixing conceptual MCQs and numerical applications.
- Personal notes, bookmarking, scheduled reviews, and a saved reading position.

Lessons are continuous pages: an explanation is followed by the worked examples matched to it, then the next explanation. Every detailed tutorial is immediately followed by its own example. Original examples retain their section assignments and saved anchors. Topic chips and chapter links jump to the explanation; repeated topics link to their focused lesson. Optional questions come after all the teaching material and open on request, rather than interrupting reading. Reading a solution does not record a passed check. Marking a lesson read is separate from passing its two checks, and neither locks or unlocks other lessons. Passing these short checks is not a claim of full GATE mastery. Five interactive teaching demonstrations cover truth tables, signed encoding, pipelines, binary search, and FIFO/LRU page replacement. Selected programming/algorithm lessons include code or pseudocode.

Revision & notes collects saved topics, due dates and notes, and exports notes as Markdown. Study sessions focus on theory, worked examples and review. When upgrading from the old 34-summary version, old completion IDs are archived in browser storage rather than counting as reading the expanded curriculum. Existing names, practice history and mock results are retained.

[PRICING_AND_ACCESS.md](PRICING_AND_ACCESS.md) proposes a free preview, a one-time course pass and a server-managed owner role. It includes suggested price experiments, backend content protection, payment verification and a launch sequence. Pricing, payments and access restrictions are not enabled by this update; the current static course and public repository remain accessible.

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

Practice separates topic learning checks, the 132 original subject-wide questions and nine checked 2018 PYQs. Exact topic selection only includes questions explicitly associated with that lesson; it does not silently substitute unrelated subject questions. The original bank includes parameterized variations; their solutions show the substituted values and explain the calculation and common interpretation errors. These and the learning checks are not official PYQs.

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

`python data/build.py` regenerates lessons, topic questions, `data/topic-coverage.json` and [TOPIC_TUTORIALS.md](TOPIC_TUTORIALS.md) from authored modules under `data/content/`. `python data/questions.py` regenerates only the original practice bank. Neither operation needs network access.

Mathematical notation uses local KaTeX 0.16.22 (MIT) with bundled fonts and accessible MathML. It renders LaTeX in lessons, worked examples, dynamically inserted practice feedback and mock review; code and personal notes stay literal. No CDN or package installation is needed. See `vendor/katex/LICENSE` and `VERSION.txt`.

Guest progress saves in this browser. Optional Supabase accounts sync private progress across devices, including lessons, notes, reading positions, practice history, and mock/past-paper attempts. Vercel remains the frontend host. See [CLOUD_SETUP.md](CLOUD_SETUP.md) for the database migration, email settings, Vercel variables and deployment checks. The cloud integration is inactive until a Supabase project is configured. External Google Fonts are optional; system fonts work when unavailable. Lessons and PDFs remain local assets.

`tests/learning_flow.py` checks the continuous reading flow, section/example pairing, all lesson rendering, worked steps, hints, independent read/check status, notes, revision, resume, topic filters, demonstrations, migration, mocks, paper links and mobile layout. `tests/math_rendering.py` additionally checks all 72 lessons with external requests blocked, MathML, dynamic solutions, matrices, literal notes and phone-width formula overflow. `node tests/validate_math.js` strictly validates every authored LaTeX expression using the bundled renderer. `tests/topic_tutorials.py` checks topic-to-chapter coverage, the Gaussian elimination arithmetic, topic/direct links, notes and resume. The browser scripts require Playwright and a Chromium executable for development, not for running the app. Set `CHROMIUM_PATH` if Chromium is not at `/usr/bin/chromium`, start the server on port 3000, then run the script.

Content is original instructional material organized against the supplied syllabus. It is not an official GATE course or a substitute for all reference-book exercises. See [SYLLABUS_COVERAGE.md](SYLLABUS_COVERAGE.md) for the topic-to-lesson map.
