# Gatewise — GATE CS 2027

Clone this repository, then run `py -3 run-local.py` on Windows or `python3 run-local.py` on macOS/Linux. The launcher opens the app and serves all lessons and PDFs locally. Keep the terminal running. No Node.js, package installation, account, or API key is needed. See [LOCAL_SETUP.md](LOCAL_SETUP.md).

## Learning workflow

The uploaded CS syllabus is mapped into 72 sequenced lessons: 70 across its ten sections and two additional General Aptitude lessons. The library is searchable by syllabus terms, lesson titles and explanation text, with a separate roadmap per subject. Each lesson contains:

- Prerequisites and 167 detailed concept tutorials, followed by 275 supplementary explanations. The new teaching text adds more than 27,000 words of definitions, procedures, derivations and assumptions across all subjects.
- 311 interleaved worked examples: one for each detailed tutorial plus the 144 existing examples. Every new example has at least three explained steps, an answer and a verification; 89 of the existing examples also have expanded reasoning.
- A topic-specific GATE solving method, equation references with assumptions, two explained traps/counterexamples, and revision reminders in every lesson.
- Two optional topic-specific checks with hints and explained solutions: 144 checks, mixing conceptual MCQs and numerical applications.
- Personal notes, bookmarking, scheduled reviews, and a saved reading position.

Lessons are continuous pages: an explanation is followed by the worked examples matched to it, then the next explanation. Every detailed tutorial is immediately followed by its own example. Original examples retain their section assignments and saved anchors. Topic chips and chapter links jump to the explanation; repeated topics link to their focused lesson. Optional questions come after all the teaching material and open on request, rather than interrupting reading. Reading a solution does not record a passed check. Marking a lesson read is separate from passing its two checks, and neither locks or unlocks other lessons. Passing these short checks is not a claim of full GATE mastery. Five interactive teaching demonstrations cover truth tables, signed encoding, pipelines, binary search, and FIFO/LRU page replacement. Selected programming/algorithm lessons include code or pseudocode.

Revision & notes collects saved topics, due dates and notes, and exports notes as Markdown. Study sessions focus on theory, worked examples and review. When upgrading from the old 34-summary version, old completion IDs are archived in browser storage rather than counting as reading the expanded curriculum. Existing names, practice history and mock results are retained.

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
