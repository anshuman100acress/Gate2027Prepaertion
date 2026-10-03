# Gatewise — GATE CS 2027

Clone this repository, then run `py -3 run-local.py` on Windows or `python3 run-local.py` on macOS/Linux. The launcher opens the app and serves all lessons and PDFs locally. Keep the terminal running. No Node.js, package installation, account, or API key is needed. See [LOCAL_SETUP.md](LOCAL_SETUP.md).

## Learning workflow

The uploaded CS syllabus is mapped into 72 sequenced lessons: 70 across its ten sections and two additional General Aptitude lessons. The library is searchable by syllabus terms, lesson titles and explanation text, with a separate roadmap per subject. Each lesson contains:

- Prerequisites, an intuitive introduction and at least three explanatory sections; Engineering Mathematics has additional derivations and reasoning.
- Two fully visible worked examples with three explicit steps each: 144 worked examples in total.
- Common mistakes and a concise revision sheet.
- Two optional topic-specific checks with hints and explained solutions: 144 checks, mixing conceptual MCQs and numerical applications.
- Personal notes, bookmarking, scheduled reviews, and a saved reading position.

Lessons are continuous pages: an explanation is followed by the worked examples matched to it, then the next explanation. The worked examples have explicit editorial section assignments across all 72 lessons. Optional questions come after all the teaching material and open on request, rather than interrupting reading. Reading a solution does not record a passed check. Marking a lesson read is separate from passing its two checks, and neither locks or unlocks other lessons. Passing these short checks is not a claim of full GATE mastery. Five interactive teaching demonstrations cover truth tables, signed encoding, pipelines, binary search, and FIFO/LRU page replacement. Selected programming/algorithm lessons include code or pseudocode.

Revision & notes collects saved topics, due dates and notes, and exports notes as Markdown. Study sessions focus on theory, worked examples and review. When upgrading from the old 34-summary version, old completion IDs are archived in browser storage rather than counting as reading the expanded curriculum. Existing names, practice history and mock results are retained.

## Practice and mocks

Practice separates topic learning checks, the 132 original subject-wide questions and nine checked 2018 PYQs. Exact topic selection only includes questions explicitly associated with that lesson; it does not silently substitute unrelated subject questions. The original bank includes parameterized variations. These and the learning checks are not official PYQs.

A full-length original mock contains 65 questions, 180 minutes and 100 marks, including 10 GA questions / 15 marks. It uses the original bank, with MCQ-only negative marking, no MSQ partial credit, answer navigation, review flags, resumable timing and post-test explanations. Its topic weights do not predict the actual exam. Check official 2027 examination rules when published.

## Past-year papers

All 24 uploaded PDFs spanning 2007–2026 are retained in `papers/`. Some bundle multiple sessions/paper codes and some contain scanned pages. Original PDF viewing preserves equations and diagrams.

Each PDF supports a labelled timed attempt, saved answer sheet, history, review and JSON export. The 2018 PDF has a fully matched included scoring key: 65 entries, 100 marks, original GA/CS numbering and NAT acceptance ranges. Other papers remain unscored until their exact session/code keys are verified. Nine individually checked 2018 MCQs have explanations and source labels. The remaining PDF questions have not all been converted into individually interactive questions or solved explanations.

## Try the continuous-reader feature branch

```powershell
git fetch origin
git switch --track origin/feature/interleaved-lessons
py -3 run-local.py
```

If you already have the branch locally, use `git switch feature/interleaved-lessons`, then `git pull`. Stop the server before switching and refresh your browser afterward. Retain any local edits before switching. Prior read/check progress and notes persist, and old tab-stage positions migrate to reading anchors. `main` retains the previous tabbed version.

## Data and checks

`python data/build.py` regenerates lessons and topic questions from authored modules under `data/content/`. `python data/questions.py` regenerates only the original practice bank. Neither operation needs network access.

The app saves progress in localStorage, without cross-device synchronization. Keep the same browser and URL to retain progress. External Google Fonts are optional; system fonts work when unavailable. Everything required for the lessons and PDFs is local.

`tests/learning_flow.py` checks the continuous reading flow, section/example pairing, all lesson rendering, worked steps, hints, independent read/check status, notes, revision, resume, topic filters, demonstrations, migration, mocks, paper links and mobile layout. It requires Playwright and a Chromium executable for development, not for running the app. Set `CHROMIUM_PATH` if Chromium is not at `/usr/bin/chromium`, start the server on port 3000, then run the script.

Content is original instructional material organized against the supplied syllabus. It is not an official GATE course or a substitute for all reference-book exercises. See [SYLLABUS_COVERAGE.md](SYLLABUS_COVERAGE.md) for the topic-to-lesson map.
