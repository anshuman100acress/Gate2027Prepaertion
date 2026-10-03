# Gatewise — GATE CS 2027

Run `npm start` or `python -m http.server 3000` in this directory, then open http://localhost:3000. No package installation required. The app is static and can be hosted on any static web host.

Features: responsive dashboard; searchable subject library; 34 concise concept lessons covering the uploaded ten CS syllabus sections and an additional General Aptitude lesson; 132 original questions, including parameterized variations, in MCQ/MSQ/NAT formats; subject and format filters; explanations; local progress and personalization; adaptive session priorities; resumable timed mock; 65 questions, 180 minutes, 100 marks and MCQ-only negative marking.

Content is a starter study library rather than an exhaustive textbook. Questions are original and not official PYQs. Mock topic weights do not predict the actual examination. The uploaded past-year PDFs are integrated as described below. The CS syllabus is included as `syllabus.pdf`; General Aptitude was added separately. Official 2027 rules should be checked when available.

Progress lives in this browser's localStorage, without an account or cross-device synchronization. External Google Fonts are optional; system fonts work offline. Static assets otherwise have no service dependencies. Use `python data/build.py` and `python data/questions.py` to regenerate JSON content.

## Past-year papers

24 user-uploaded PDFs spanning every year 2007–2026 are in `papers/` and the Past-year papers navigation. Several uploads bundle multiple sessions or paper codes, and older PDFs may contain scanned pages. Original PDFs preserve diagrams and mathematical notation. No OCR text is silently substituted for original questions.

Each PDF supports a labelled timed attempt and a persisted answer sheet, historical answer review, and JSON export. Only the 2018 upload currently has a fully matched scoring key: 65 entries, 100 marks, GA and CS numbering, NAT acceptance ranges, and MCQ negative marking. Other uploads remain unscored pending key verification. Included keys in other PDFs have not yet been matched to their specific session/code.

Nine manually checked 2018 MCQs with explanations are available through the Verified PYQs source filter in Practice arena. These are distinct from the 132 original questions. The remaining PYQs are available in their original PDFs and have not all been converted into individual interactive questions or detailed solutions. Original generated mocks continue to use only the original practice bank.

Checks cover PDF accessibility, year/source filters, answer persistence after reload, 2018 scoring and negative marks, unscored paper attempts, and mobile layout.
