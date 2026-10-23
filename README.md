# CloudQuiz — AZ-900 Practice Studio

> **Unofficial project.** CloudQuiz is an independent educational project. It is not affiliated with, endorsed by, or sponsored by Microsoft. It uses no Microsoft logos, and every question is original practice material, not real exam content. Azure and Microsoft are trademarks of Microsoft Corporation.

A responsive, framework-free practice app for the Microsoft Azure Fundamentals (AZ-900) exam: original questions, instant feedback, explanations for every option, and revision recommendations based on your results.

## The problem it solves

Fundamentals learners often find out *what* they got wrong but not *why*, or which area to revise next. CloudQuiz explains every answer (including why each wrong option is wrong), tracks accuracy per topic, and applies a transparent rule to recommend what to review.

## Main features

- **Dashboard** with branding, disclaimer, topic cards, question counts, overall accuracy, recent results, and strongest/weakest topic (shown only with enough data). A first-use state appears when there is no history.
- **Quiz setup**: topic, difficulty, question count (5/10/15, capped by what exists for your filters), and optional timed mode (60 s per question). All of these controls really drive the quiz.
- **Question bank**: 36 original questions across the three areas of the current skills outline (Cloud Concepts; Azure Architecture and Services; Azure Management and Governance), at beginner, intermediate and advanced levels. Each has four options, one key, an explanation, a reason for every wrong option, and a hint.
- **Quiz engine**: one question at a time, progress bar, submit gating, instant correct/incorrect feedback (not colour-only), locked options after submit, no advancing before submitting, double-submit protection, quit/retry.
- **Results**: score, correct/incorrect, topic-by-topic bars, incorrect questions with explanations, and recommendations from an explicit rule: *a topic with at least 3 answers and a score below 70% is flagged*. Practice scores are labelled indicative only.
- **History** in LocalStorage: past attempts with full review, clear-history button. Corrupt, outdated or tampered data falls back safely; the app still works if storage is blocked.
- **Optional AI question generation** (needs the backend in `backend/`): generates original questions for the selected topic, difficulty and count; every returned question is validated and rejected if malformed; results are labelled AI-generated; a "Report this question" button stores a report on the device.
- Accessibility: semantic HTML, skip link, labelled controls, native radio inputs (keyboard operable), visible focus rings, `aria-live` feedback, `prefers-reduced-motion` respected.

## Technologies

HTML5, CSS3, vanilla JavaScript, LocalStorage. The optional backend is a dependency-free Node.js (v18+) script. No frameworks and no build step.

```
index.html      page structure
style.css       styling
script.js       quiz logic, rendering, storage, AI client
questions.js    question bank (data only; schema documented at the top)
backend/        optional AI proxy (own README with environment variables)
tests/          dev-only automated tests
```

`questions.js` is a separate data file so questions can be added without touching logic.

## Run locally

The core app needs no key, backend or internet after the files load.

```bash
python3 -m http.server 8000     # or: npx serve
# open http://localhost:8000
```

Opening `index.html` directly also works for the quiz.

## Deploy (GitHub Pages)

1. Push this folder to a GitHub repository (do not commit `.env` files or keys).
2. Repository **Settings → Pages**: deploy from the `main` branch, root folder.
3. Open the published URL. The quiz works immediately.
4. For AI generation, deploy `backend/` separately (see `backend/README.md`), set `ALLOWED_ORIGIN` to your Pages origin, and paste the backend's `https://` URL into the Practice screen.

## AI: what needs an external service

- **Needs it:** only the "Generate Questions" panel. The browser never holds an API key; it calls your backend, which calls the AI API.
- **Does not need it:** everything else.
- If the backend is missing, unreachable or returns bad data, the page shows a message and you keep practising with the built-in bank. AI features never substitute built-in questions while claiming they are AI-generated.
- **Prompt design** (in `backend/server.js`): educator persona; original questions only; exactly four plausible options with one unambiguous key; no claims the model is unsure of; correct-answer position varied; difficulty definitions; per-option wrong-answer reasons; hints that don't reveal the answer; strict JSON output shape. The page then re-validates everything.

## How AI was used during development

This project was built with Claude (Anthropic) as a coding assistant, working from the hackathon brief: it wrote the code, the original questions and the tests. The study-guide domains and terminology were checked against Microsoft's published AZ-900 skills outline (January 2026 update). Question content is still AI-written, so please verify anything surprising on Microsoft Learn before relying on it.

## Testing

### Automated (dev only)

```bash
mkdir -p /tmp/jt && cd /tmp/jt && npm i jsdom && cd -
NODE_PATH=/tmp/jt/node_modules node tests/smoke.test.js   # 130 checks, UI flow in jsdom
node tests/backend.test.js                                # 21 checks, mock AI upstream
```

Covered: bank integrity, dashboard first-use, filters and count caps, answer feedback, double submit, score and topic maths, results content, persistence across reload, clearing history, corrupt/outdated/tampered storage, timed expiry, AI success/partial/invalid/failure paths, HTML-injection safety, blocked storage, and backend validation, CORS, rate limiting, missing key and upstream errors.

### Manual checklist

- [ ] Dashboard loads; disclaimer is visible; first-use message shows with no history.
- [ ] Quiz works with no backend and no internet.
- [ ] Each topic/difficulty combination starts a quiz of the right size; counts never exceed what's available.
- [ ] Submit is disabled until an option is chosen; Next appears only after submitting.
- [ ] Correct and incorrect answers show distinct feedback, the right answer, and all explanations.
- [ ] Finishing shows score %, topic bars, incorrect questions, and a revision recommendation for a topic under 70%.
- [ ] Refresh: history and dashboard stats persist. Clear history removes them.
- [ ] Set `localStorage['cloudquiz.v1']` to garbage in dev tools and reload: the app still loads.
- [ ] Timed mode: timer counts down and auto-submits at 0.
- [ ] Keyboard only: Tab/arrow keys through setup, options, Submit, Next; focus ring always visible.
- [ ] Phone width (~375 px): no horizontal scroll; buttons and options are easy to tap.
- [ ] With the backend running: Generate Questions shows labelled AI questions; with it stopped, a helpful error appears and the built-in quiz still starts.
- [ ] Search the front-end files: no API keys.

## Known limitations

- 36 questions is a small bank; repeats are likely across attempts and per-topic statistics are coarse.
- AI generation was tested against a mock upstream, **not a live API call with a real key**. The request format follows the standard Messages API, but verify it once with your key.
- AI questions can be wrong. They are validated for structure, not factual accuracy.
- "Report this question" saves reports on the device only; there is no server collecting them.
- The backend rate limiter is in-memory and per-instance.
- History is per browser; it holds up to the 30 most recent attempts.
- Practice results are indicative only and do not predict exam outcomes. Always consult the official study guide for current exam objectives.

## Three-minute demo script

1. **(0:00)** Dashboard: point out the unofficial disclaimer and topic cards. Click **Start Practice**.
2. **(0:25)** Choose *Cloud Concepts*, *All levels*, 5 questions. **Start Quiz**.
3. **(0:40)** Answer one correctly and one deliberately wrong: show instant feedback, the correct answer, and the per-option explanations. Show the hint button.
4. **(1:30)** Finish: show the score, topic bars, and the **Recommended revision** card, including the visible 70% rule.
5. **(2:00)** Back on the dashboard, show accuracy and history; open a past result.
6. **(2:20)** If your backend is running: **Generate Questions**, show the AI label and that invalid output is rejected. Otherwise show the graceful "not configured" message.
7. **(2:50)** Close on the prompt-engineering and security points: no key in the browser, validation of AI output.

## Status

Unofficial, independent, educational. Not affiliated with Microsoft.
