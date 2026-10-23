/*
 * Dev-only smoke tests for CloudQuiz. Not needed to run the app.
 * Setup:  mkdir /tmp/jt && cd /tmp/jt && npm i jsdom
 * Run:    NODE_PATH=/tmp/jt/node_modules node tests/smoke.test.js
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const questionsSrc = fs.readFileSync(path.join(root, 'questions.js'), 'utf8');
const scriptSrc = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const KEY = 'cloudquiz.v1';

let passed = 0;
let failed = 0;
function check(name, condition, detail) {
  if (condition) { passed += 1; console.log('  ok   ' + name); }
  else { failed += 1; console.log('  FAIL ' + name + (detail ? '  -> ' + detail : '')); }
}
const tick = () => new Promise((r) => setTimeout(r, 0));
const flush = async () => { for (let i = 0; i < 5; i += 1) await tick(); };

function boot(opts = {}) {
  const timers = [];
  const page = html
    .replace('<script src="questions.js"></script>', () => '<script>' + questionsSrc + '</script>')
    .replace('<script src="script.js"></script>', () => '<script>' + scriptSrc + '</script>');
  const calls = [];
  const dom = new JSDOM(page, {
    url: 'http://localhost:8000/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(w) {
      Object.entries(opts.storage || {}).forEach(([k, v]) => w.localStorage.setItem(k, v));
      w.confirm = () => opts.confirm !== false;
      w.scrollTo = () => {};
      w.__errors = [];
      w.addEventListener('error', (e) => w.__errors.push(e.message));
      if (opts.fetchImpl) w.fetch = (...args) => { calls.push(args); return opts.fetchImpl(...args); };
      w.setInterval = (fn) => { timers.push(fn); return timers.length; };
      w.clearInterval = (id) => { timers[id - 1] = null; };
    }
  });
  const w = dom.window;
  return { w, doc: w.document, timers, calls, $: (s) => w.document.querySelector(s), $$: (s) => Array.from(w.document.querySelectorAll(s)) };
}

function setSetup(app, { topic, difficulty, count, timed }) {
  const { w, doc } = app;
  const fire = (el) => el.dispatchEvent(new w.Event('change', { bubbles: true }));
  const topicEl = doc.querySelector('input[name="topic"][value="' + topic + '"]');
  topicEl.checked = true; fire(topicEl);
  const diffEl = doc.querySelector('input[name="difficulty"][value="' + difficulty + '"]');
  diffEl.checked = true; fire(diffEl);
  if (count) { const sel = doc.querySelector('#count-select'); sel.value = String(count); fire(sel); }
  const t = doc.querySelector('#timed-toggle'); t.checked = !!timed; fire(t);
}
function submitSetup(app) {
  const form = app.$('#setup-form');
  form.dispatchEvent(new app.w.Event('submit', { bubbles: true, cancelable: true }));
}
const visible = (app, id) => !app.$(id).hidden;

function currentBankQuestion(app) {
  const text = app.$('#question-text').textContent;
  return app.w.QUESTION_BANK.find((q) => q.question === text);
}
function optionIndexByText(app, text) {
  return app.$$('#options .option').findIndex((l) => l.querySelector('.option-text').textContent.includes(text));
}

(async function main() {
  /* ---------- 1. Question bank ---------- */
  console.log('Question bank');
  {
    const app = boot();
    const bank = app.w.QUESTION_BANK;
    check('at least 30 questions', bank.length >= 30, String(bank.length));
    check('unique ids', new Set(bank.map((q) => q.id)).size === bank.length);
    check('unique question text', new Set(bank.map((q) => q.question)).size === bank.length);
    check('every question has 4 distinct options', bank.every((q) => q.options.length === 4 && new Set(q.options).size === 4));
    check('every answer index is 0-3', bank.every((q) => Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 3));
    check('whyWrong filled for every wrong option, blank for the right one',
      bank.every((q) => q.whyWrong.length === 4 && q.whyWrong.every((w, i) => (i === q.answer ? w === '' : w.length > 5))));
    check('every question has explanation', bank.every((q) => q.explanation.length > 20));
    const topics = ['cloud', 'architecture', 'management'];
    check('each topic has >= 10 questions', topics.every((t) => bank.filter((q) => q.topic === t).length >= 10));
    check('all three difficulties present per topic', topics.every((t) => ['beginner', 'intermediate', 'advanced'].every((d) => bank.some((q) => q.topic === t && q.difficulty === d))));
    check('correct answers are spread across positions', new Set(bank.map((q) => q.answer)).size === 4);
    check('no script errors on load', app.w.__errors.length === 0, app.w.__errors.join('; '));
    check('answer keys all validate in app (none skipped)', app.$$('#stats .stat-value')[3].textContent === String(bank.length));
  }

  /* ---------- 2. Dashboard first use ---------- */
  console.log('Dashboard');
  {
    const app = boot();
    check('dashboard visible', visible(app, '#view-dashboard'));
    check('first-use state shown', visible(app, '#first-use'));
    check('unofficial disclaimer visible', /not affiliated with, endorsed by, or sponsored by Microsoft/.test(app.$('.disclaimer').textContent));
    check('3 topic cards', app.$$('.topic-card').length === 3);
    check('accuracy placeholder with no data', app.$$('#stats .stat-value')[2].textContent === '—');
    check('no external scripts / API keys in html', !/sk-|api[_-]?key\s*[:=]/i.test(html + scriptSrc));
  }

  /* ---------- 3. Full quiz flow ---------- */
  console.log('Quiz flow (cloud, 5 questions, answer 3 right / 2 wrong)');
  let savedStorage;
  {
    const app = boot();
    app.$('#start-practice-btn').click();
    check('setup view opens', visible(app, '#view-setup'));
    setSetup(app, { topic: 'cloud', difficulty: 'all', count: 5, timed: false });
    check('count select limited to available (12 cloud -> 5,10)', Array.from(app.$('#count-select').options).map((o) => o.value).join() === '5,10');
    submitSetup(app);
    check('quiz view opens', visible(app, '#view-quiz'));
    check('title shows 1 of 5', app.$('#quiz-title').textContent === 'Question 1 of 5');

    const seen = new Set();
    for (let i = 0; i < 5; i += 1) {
      const q = currentBankQuestion(app);
      check('Q' + (i + 1) + ': question found in bank & unique', !!q && !seen.has(q.id));
      seen.add(q && q.id);
      check('Q' + (i + 1) + ': topic matches filter', q.topic === 'cloud');
      check('Q' + (i + 1) + ': 4 options rendered', app.$$('#options .option').length === 4);
      check('Q' + (i + 1) + ': submit disabled, next hidden before answering', app.$('#submit-btn').disabled && app.$('#next-btn').hidden);

      if (i === 0) {
        app.$('#submit-btn').disabled = false; // simulate forced click with nothing selected
        app.$('#submit-btn').click();
        check('submitting with no selection is blocked with a message', app.$('#feedback').hidden && /select an answer/i.test(app.$('#quiz-message').textContent));
        app.$('#submit-btn').disabled = true;
      }

      const correctIdx = optionIndexByText(app, q.options[q.answer]);
      const wrongIdx = [0, 1, 2, 3].find((n) => n !== correctIdx);
      const pick = i < 3 ? correctIdx : wrongIdx;
      app.$$('#options input')[pick].click();
      check('Q' + (i + 1) + ': submit enabled after selecting', !app.$('#submit-btn').disabled);
      app.$('#submit-btn').click();
      app.$('#submit-btn').click(); // double submit attempt
      const fb = app.$('#feedback');
      check('Q' + (i + 1) + ': feedback ' + (i < 3 ? 'good' : 'bad'), !fb.hidden && fb.classList.contains(i < 3 ? 'good' : 'bad'));
      check('Q' + (i + 1) + ': correct option marked', app.$$('#options .option')[correctIdx].classList.contains('is-correct'));
      if (i >= 3) check('Q' + (i + 1) + ': chosen wrong option marked incorrect', app.$$('#options .option')[pick].classList.contains('is-incorrect'));
      check('Q' + (i + 1) + ': options locked', app.$$('#options input').every((r) => r.disabled));
      check('Q' + (i + 1) + ': explanation + 3 wrong-option reasons shown', fb.textContent.includes(q.explanation) && fb.querySelectorAll('ul li').length === 3);
      check('Q' + (i + 1) + ': next visible', !app.$('#next-btn').hidden);
      if (i === 4) check('last button reads See Results', app.$('#next-btn').textContent === 'See Results');
      app.$('#next-btn').click();
    }

    check('results view opens', visible(app, '#view-results'));
    check('score ring 60%', app.$('.score-ring span').textContent === '60%');
    check('3 of 5 correct', /3 of 5 correct/.test(app.$('#results-content').textContent));
    check('correct/incorrect counts', /Correct: 3 · Incorrect: 2/.test(app.$('#results-content').textContent));
    check('cloud topic row 3/5 (60%)', /3\/5 \(60%\)/.test(app.$('#results-content').textContent));
    check('other topics show Not covered', (app.$('#results-content').textContent.match(/Not covered/g) || []).length === 2);
    check('weak topic recommendation for Cloud Concepts', /Cloud Concepts — 60%/.test(app.$('.reco').textContent) && /shared responsibility/.test(app.$('.reco').textContent));
    check('2 incorrect questions listed open', app.$$('details.review[open]').length === 2);
    check('no console/script errors', app.w.__errors.length === 0, app.w.__errors.join('; '));

    const stored = JSON.parse(app.w.localStorage.getItem(KEY));
    check('history saved to localStorage', stored.sessions.length === 1 && stored.sessions[0].correct === 3 && stored.sessions[0].total === 5);
    check('settings saved', stored.settings.topic === 'cloud' && stored.settings.count === 5);
    savedStorage = app.w.localStorage.getItem(KEY);

    app.$('#retry-btn').click();
    check('retry starts a new 5-question quiz', visible(app, '#view-quiz') && app.$('#quiz-title').textContent === 'Question 1 of 5');
    app.$('#quit-btn').click();
    check('quit returns to dashboard', visible(app, '#view-dashboard'));
    check('quitting does not save a session', JSON.parse(app.w.localStorage.getItem(KEY)).sessions.length === 1);
  }

  /* ---------- 4. Persistence, history, clear ---------- */
  console.log('Persistence and history');
  {
    const app = boot({ storage: { [KEY]: savedStorage } });
    check('dashboard shows saved session after "refresh"', app.$$('#stats .stat-value')[0].textContent === '1' && app.$$('#stats .stat-value')[2].textContent === '60%');
    check('first-use hidden once history exists', !visible(app, '#first-use'));
    app.$('[data-nav="history"]').click();
    check('history lists the attempt', app.$$('#history-list .history-item').length === 1);
    app.$('#history-list .btn').click();
    check('review opens past result with 60%', visible(app, '#view-results') && app.$('.score-ring span').textContent === '60%');
    app.$('[data-nav="history"]').click();
    app.$('#clear-history-btn').click();
    check('clear history empties list', app.$$('#history-list .history-item').length === 0 && /No history yet/.test(app.$('#history-list').textContent));
    check('clear history removes stored sessions', JSON.parse(app.w.localStorage.getItem(KEY)).sessions.length === 0);
    const declined = boot({ storage: { [KEY]: savedStorage }, confirm: false });
    declined.$('[data-nav="history"]').click();
    declined.$('#clear-history-btn').click();
    check('declining the confirm keeps history', declined.$$('#history-list .history-item').length === 1);
  }

  console.log('Invalid / outdated saved data');
  {
    const cases = {
      'corrupt JSON': '{not json',
      'wrong types': '[1,2,3]',
      'outdated schema version': JSON.stringify({ version: 0, sessions: [{ id: 'x' }] }),
      'garbage sessions + bad settings': JSON.stringify({ version: 1, sessions: [{ id: 1 }, null, 'x', { id: 'a', finishedAt: 'nope', total: 5, correct: 9 }], settings: { topic: 'zzz', count: 99 }, reports: 'bad' })
    };
    for (const [name, value] of Object.entries(cases)) {
      const app = boot({ storage: { [KEY]: value } });
      app.$('[data-nav="history"]').click();
      app.$('[data-nav="setup"]').click();
      check(name + ': app loads with defaults, no errors', app.w.__errors.length === 0 && visible(app, '#view-setup') && app.doc.querySelector('input[name="topic"]:checked').value === 'all', app.w.__errors.join('; '));
    }
    // a stored session whose numbers disagree with its answers gets recomputed
    const app0 = boot({ storage: { [KEY]: savedStorage } });
    const tampered = JSON.parse(savedStorage);
    tampered.sessions[0].correct = 5; tampered.sessions[0].percent = 100; tampered.sessions[0].topicStats = {};
    const app1 = boot({ storage: { [KEY]: JSON.stringify(tampered) } });
    check('saved totals are recomputed from answers', app1.$$('#stats .stat-value')[2].textContent === '60%');
    app0.w.close();
  }

  /* ---------- 5. Filters ---------- */
  console.log('Filters');
  {
    const app = boot();
    app.$('#start-practice-btn').click();
    setSetup(app, { topic: 'management', difficulty: 'advanced', count: 5 });
    const opts = Array.from(app.$('#count-select').options).map((o) => o.textContent);
    check('few matches -> "All 3" option only', opts.join() === 'All 3', opts.join());
    check('match info reports count', /3 built-in questions/.test(app.$('#match-info').textContent));
    submitSetup(app);
    check('quiz has 3 questions', app.$('#quiz-title').textContent === 'Question 1 of 3');
    const badgesOk = [];
    for (let i = 0; i < 3; i += 1) {
      badgesOk.push(/Management/.test(app.$('#quiz-badges').textContent) && /Advanced/.test(app.$('#quiz-badges').textContent));
      app.$$('#options input')[0].click(); app.$('#submit-btn').click(); app.$('#next-btn').click();
    }
    check('every question honored topic + difficulty', badgesOk.every(Boolean));
    check('3-question quiz completed to results', visible(app, '#view-results'));

    const app2 = boot();
    app2.$('#start-practice-btn').click();
    setSetup(app2, { topic: 'all', difficulty: 'all', count: 15 });
    check('all/all offers 5,10,15', Array.from(app2.$('#count-select').options).map((o) => o.value).join() === '5,10,15');
    submitSetup(app2);
    check('15 questions started', app2.$('#quiz-title').textContent === 'Question 1 of 15');
    const app3 = boot();
    app3.$('#start-practice-btn').click();
    setSetup(app3, { topic: 'architecture', difficulty: 'beginner', count: 15 });
    check('beginner architecture (5 available) caps count at 5', Array.from(app3.$('#count-select').options).map((o) => o.value).join() === '5');
  }

  /* ---------- 6. Timed mode ---------- */
  console.log('Timed mode');
  {
    const app = boot();
    app.$('#start-practice-btn').click();
    setSetup(app, { topic: 'cloud', difficulty: 'all', count: 5, timed: true });
    submitSetup(app);
    check('timer shown', !app.$('#quiz-timer').hidden && /1:00/.test(app.$('#quiz-timer').textContent));
    const tickFn = app.timers.filter(Boolean).pop();
    for (let i = 0; i < 60; i += 1) tickFn();
    check('time expiry auto-submits as incorrect', !app.$('#feedback').hidden && /Time's up/.test(app.$('#feedback').textContent));
    app.$('#next-btn').click();
    check('moves on after expiry', app.$('#quiz-title').textContent === 'Question 2 of 5');
  }

  /* ---------- 7. AI generation ---------- */
  console.log('AI generation');
  {
    const bank = boot().w.QUESTION_BANK;
    const base = bank.find((q) => q.id === 'mg-03');
    const good = { topic: 'management', difficulty: 'beginner', question: 'Which service enforces rules on how resources are configured in Azure?', options: base.options, answer: base.answer, explanation: base.explanation, whyWrong: base.whyWrong, hint: 'Rules.' };
    const evil = Object.assign({}, good, { question: 'What does <img src=x onerror=alert(1)> do for Azure governance?' });
    const bad1 = Object.assign({}, good, { answer: 7 });
    const bad2 = Object.assign({}, good, { options: ['a', 'b'] });
    const bad3 = Object.assign({}, good, { whyWrong: ['', '', '', ''] });
    const okResponse = (body, status = 200) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });

    // not configured
    const none = boot();
    none.$('#start-practice-btn').click();
    none.$('#ai-generate-btn').click(); await flush();
    check('unconfigured: helpful message, no crash', /not configured/i.test(none.$('#ai-status').textContent) && none.$('#ai-results').hidden);
    none.$('#start-quiz-btn').click();

    // success with mixed valid/invalid
    const ok = boot({ fetchImpl: () => okResponse({ questions: [good, evil, bad1, bad2, bad3, null] }) });
    ok.$('#start-practice-btn').click();
    setSetup(ok, { topic: 'management', difficulty: 'beginner' });
    ok.$('#ai-endpoint').value = 'http://localhost:8787/';
    ok.$('#ai-generate-btn').click(); await flush();
    check('request went to /api/generate with settings', ok.calls[0][0] === 'http://localhost:8787/api/generate' && JSON.parse(ok.calls[0][1].body).topic === 'management' && JSON.parse(ok.calls[0][1].body).count === 5);
    check('only valid questions accepted (2 of 6)', ok.$$('#ai-list li').length === 2, String(ok.$$('#ai-list li').length));
    check('rejections reported', /4 invalid questions were rejected/.test(ok.$('#ai-status').textContent), ok.$('#ai-status').textContent);
    check('AI label shown', /AI-generated practice material/.test(ok.$('#ai-results').textContent));
    check('endpoint saved', JSON.parse(ok.w.localStorage.getItem(KEY)).aiEndpoint === 'http://localhost:8787');
    ok.$('#ai-practice-btn').click();
    check('AI quiz starts with AI badge', visible(ok, '#view-quiz') && /AI-generated practice material/.test(ok.$('#quiz-badges').textContent));
    check('HTML in AI text is not injected', ok.$$('#question-text *').length === 0 && ok.$$('img').length === 0);
    for (let i = 0; i < 2; i += 1) { ok.$$('#options input')[0].click(); ok.$('#submit-btn').click(); ok.$('#next-btn').click(); }
    check('AI quiz result saved with AI source', JSON.parse(ok.w.localStorage.getItem(KEY)).sessions[0].settings.source === 'ai');
    ok.$('#retry-btn').click();
    check('retrying an AI quiz replays the same 2 questions', ok.$('#quiz-title').textContent === 'Question 1 of 2');

    // all invalid
    const allBad = boot({ fetchImpl: () => okResponse({ questions: [bad1, bad2] }) });
    allBad.$('#start-practice-btn').click();
    allBad.$('#ai-endpoint').value = 'http://localhost:8787';
    allBad.$('#ai-generate-btn').click(); await flush();
    check('all-invalid output rejected safely', /failed/i.test(allBad.$('#ai-status').textContent) && allBad.$('#ai-results').hidden);

    // network error and HTTP error fall back to local quiz
    const net = boot({ fetchImpl: () => Promise.reject(new TypeError('Failed to fetch')) });
    net.$('#start-practice-btn').click();
    net.$('#ai-endpoint').value = 'http://localhost:8787';
    net.$('#ai-generate-btn').click(); await flush();
    check('network failure message mentions built-in bank', /built-in question bank/.test(net.$('#ai-status').textContent) && !net.$('#ai-generate-btn').disabled);
    setSetup(net, { topic: 'all', difficulty: 'all', count: 5 });
    submitSetup(net);
    check('local quiz still works after AI failure', visible(net, '#view-quiz'));

    const http503 = boot({ fetchImpl: () => okResponse({ error: 'The server has no ANTHROPIC_API_KEY configured.' }, 503) });
    http503.$('#start-practice-btn').click();
    http503.$('#ai-endpoint').value = 'http://localhost:8787';
    http503.$('#ai-generate-btn').click(); await flush();
    check('server error text surfaced', /no ANTHROPIC_API_KEY/.test(http503.$('#ai-status').textContent));

    const badUrl = boot();
    badUrl.$('#start-practice-btn').click();
    badUrl.$('#ai-endpoint').value = 'javascript:alert(1)';
    badUrl.$('#ai-generate-btn').click(); await flush();
    check('non-http(s) backend URL rejected', /not configured/i.test(badUrl.$('#ai-status').textContent));
  }

  /* ---------- 8. Storage unavailable ---------- */
  console.log('Storage unavailable');
  {
    const page = html
      .replace('<script src="questions.js"></script>', () => '<script>' + questionsSrc + '</script>')
      .replace('<script src="script.js"></script>', () => '<script>' + scriptSrc + '</script>');
    const dom = new JSDOM(page, {
      url: 'http://localhost:8000/', runScripts: 'dangerously', pretendToBeVisual: true,
      beforeParse(w) {
        Object.defineProperty(w, 'localStorage', { get() { throw new w.DOMException('blocked', 'SecurityError'); } });
        w.confirm = () => true; w.scrollTo = () => {}; w.__errors = [];
        w.addEventListener('error', (e) => w.__errors.push(e.message));
      }
    });
    const d = dom.window.document;
    check('warning banner shown', !d.querySelector('#storage-warning').hidden);
    d.querySelector('#start-practice-btn').click();
    d.querySelector('#setup-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    for (let i = 0; i < 10; i += 1) { d.querySelectorAll('#options input')[0].click(); d.querySelector('#submit-btn').click(); d.querySelector('#next-btn').click(); }
    check('quiz completes without storage', !d.querySelector('#view-results').hidden && dom.window.__errors.length === 0, dom.window.__errors.join('; '));
  }

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch((err) => { console.error(err); process.exit(2); });
