/*
 * CloudQuiz — AZ-900 Practice Studio (unofficial; not affiliated with Microsoft).
 * Vanilla JS. Question data lives in questions.js (window.QUESTION_BANK).
 *
 * Sections:
 *  1. Constants and config
 *  2. Validation (used for the bank, saved history and AI output)
 *  3. Storage (localStorage with in-memory fallback)
 *  4. Pure helpers (shuffle, stats, recommendations)
 *  5. DOM helpers and view switching
 *  6. Dashboard, setup, quiz, results, history
 *  7. Optional AI question generation
 *  8. Init
 */
(function () {
  'use strict';

  /* ============================ 1. Constants ============================ */

  const STORAGE_KEY = 'cloudquiz.v1';
  const SCHEMA_VERSION = 1;
  const MAX_SESSIONS = 30;          // keeps localStorage usage small
  const MAX_REPORTS = 100;
  const SECONDS_PER_QUESTION = 60;
  const WEAK_THRESHOLD = 70;        // % below which a topic is flagged
  const MIN_TOPIC_SAMPLE = 3;       // answers needed in one quiz to judge a topic
  const MIN_DASHBOARD_SAMPLE = 5;   // cumulative answers needed for strongest/weakest
  const MIN_READINESS_SAMPLE = 20;  // answers needed before showing an indicative band
  const AI_TIMEOUT_MS = 60000;
  const OPTION_LETTERS = ['A', 'B', 'C', 'D'];
  const COUNT_CHOICES = [5, 10, 15];

  const TOPICS = {
    cloud: {
      label: 'Cloud Concepts',
      blurb: 'Cloud models, shared responsibility, consumption-based pricing and the benefits of the cloud.',
      review: 'Review cloud models (public, private, hybrid), the shared responsibility model, service types (IaaS, PaaS, SaaS) and consumption-based pricing.'
    },
    architecture: {
      label: 'Azure Architecture and Services',
      blurb: 'Regions, availability zones, the resource hierarchy, compute, networking, storage and identity.',
      review: 'Revise regions, availability zones, resource groups, subscriptions and management groups, plus core Azure services for compute, networking, storage and identity.'
    },
    management: {
      label: 'Azure Management and Governance',
      blurb: 'Cost management, governance and compliance tools, security, monitoring and management tools.',
      review: 'Review cost management, governance tools (Azure Policy, locks, tags), security, compliance and monitoring services, and Azure management tools.'
    }
  };
  const DIFFICULTIES = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };

  const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

  /* ============================ 2. Validation ============================ */

  const isText = (value, min = 1) => typeof value === 'string' && value.trim().length >= min;

  /**
   * Checks the question data structure. Returns { valid, errors }.
   * Used for the built-in bank, questions restored from history and AI output.
   */
  function validateQuestion(q) {
    const errors = [];
    if (!q || typeof q !== 'object') return { valid: false, errors: ['Question is not an object'] };

    if (!isText(q.id)) errors.push('Missing id');
    if (!hasOwn(TOPICS, q.topic)) errors.push('Invalid topic');
    if (!hasOwn(DIFFICULTIES, q.difficulty)) errors.push('Invalid difficulty');
    if (!isText(q.question, 10)) errors.push('Missing question text');

    if (!Array.isArray(q.options) || q.options.length !== 4 || !q.options.every((o) => isText(o))) {
      errors.push('Exactly four non-empty options are required');
    } else if (new Set(q.options.map((o) => o.trim().toLowerCase())).size !== 4) {
      errors.push('Options must be distinct');
    }

    const answerOk = Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 3;
    if (!answerOk) errors.push('Answer must be an index from 0 to 3');

    if (!isText(q.explanation, 10)) errors.push('Missing explanation');

    if (!Array.isArray(q.whyWrong) || q.whyWrong.length !== 4 || !q.whyWrong.every((w) => typeof w === 'string')) {
      errors.push('whyWrong must be an array of four strings');
    } else if (answerOk) {
      q.whyWrong.forEach((reason, i) => {
        if (i !== q.answer && !isText(reason)) errors.push('Missing explanation for incorrect option ' + OPTION_LETTERS[i]);
      });
    }

    if (q.hint !== undefined && typeof q.hint !== 'string') errors.push('Hint must be a string');
    return { valid: errors.length === 0, errors };
  }

  function isValidSession(s) {
    if (!s || typeof s !== 'object') return false;
    if (!isText(s.id) || !isText(s.finishedAt) || Number.isNaN(Date.parse(s.finishedAt))) return false;
    if (!Number.isInteger(s.total) || s.total < 1) return false;
    if (!Number.isInteger(s.correct) || s.correct < 0 || s.correct > s.total) return false;
    if (!s.settings || typeof s.settings !== 'object') return false;
    if (s.settings.topic !== 'all' && !hasOwn(TOPICS, s.settings.topic)) return false;
    if (s.settings.difficulty !== 'all' && !hasOwn(DIFFICULTIES, s.settings.difficulty)) return false;
    if (!Array.isArray(s.answers) || s.answers.length !== s.total) return false;
    return s.answers.every((a) =>
      a && typeof a === 'object' && typeof a.correct === 'boolean' &&
      (a.selected === null || (Number.isInteger(a.selected) && a.selected >= 0 && a.selected <= 3)) &&
      validateQuestion(a.question).valid);
  }

  /** Rebuilds derived numbers from the stored answers so saved totals can never disagree with them. */
  function normalizeSession(s) {
    const total = s.answers.length;
    const correct = s.answers.filter((a) => a.correct).length;
    return Object.assign({}, s, {
      total,
      correct,
      percent: percent(correct, total),
      topicStats: computeTopicStats(s.answers),
      settings: Object.assign({}, s.settings, { source: s.settings.source === 'ai' ? 'ai' : 'bank', timed: s.settings.timed === true })
    });
  }

  function sanitizeSettings(raw) {
    const s = raw && typeof raw === 'object' ? raw : {};
    return {
      topic: s.topic === 'all' || hasOwn(TOPICS, s.topic) ? s.topic : 'all',
      difficulty: s.difficulty === 'all' || hasOwn(DIFFICULTIES, s.difficulty) ? s.difficulty : 'all',
      count: COUNT_CHOICES.includes(s.count) ? s.count : 10,
      timed: s.timed === true
    };
  }

  /* ============================ 3. Storage ============================ */

  const memoryStore = {};
  let storageAvailable = true;

  function probeStorage() {
    try {
      const key = STORAGE_KEY + '.probe';
      window.localStorage.setItem(key, '1');
      window.localStorage.removeItem(key);
      storageAvailable = true;
    } catch (err) {
      storageAvailable = false;
    }
  }

  function storageRead() {
    if (!storageAvailable) return memoryStore[STORAGE_KEY] || null;
    try { return window.localStorage.getItem(STORAGE_KEY); } catch (err) { storageAvailable = false; return memoryStore[STORAGE_KEY] || null; }
  }

  function storageWrite(text) {
    memoryStore[STORAGE_KEY] = text; // always mirror in memory so the session keeps working
    if (!storageAvailable) return false;
    try { window.localStorage.setItem(STORAGE_KEY, text); return true; } catch (err) { return false; }
  }

  function defaultState() {
    return {
      version: SCHEMA_VERSION,
      sessions: [],
      settings: sanitizeSettings(null),
      aiEndpoint: '',
      reports: []
    };
  }

  /** Reads saved data defensively: anything missing, corrupt or outdated falls back to defaults. */
  function loadState() {
    const raw = storageRead();
    if (!raw) return defaultState();
    let parsed;
    try { parsed = JSON.parse(raw); } catch (err) { return defaultState(); }
    if (!parsed || typeof parsed !== 'object' || parsed.version !== SCHEMA_VERSION) return defaultState();

    const state = defaultState();
    state.settings = sanitizeSettings(parsed.settings);
    state.sessions = Array.isArray(parsed.sessions)
      ? parsed.sessions.filter(isValidSession).slice(0, MAX_SESSIONS).map(normalizeSession)
      : [];
    state.aiEndpoint = typeof parsed.aiEndpoint === 'string' ? parsed.aiEndpoint : '';
    state.reports = Array.isArray(parsed.reports)
      ? parsed.reports.filter((r) => r && typeof r.questionId === 'string').slice(0, MAX_REPORTS)
      : [];
    return state;
  }

  function saveState() {
    let ok = storageWrite(JSON.stringify(state));
    // If the quota is exceeded, drop the oldest sessions until it fits.
    while (!ok && storageAvailable && state.sessions.length > 1) {
      state.sessions.pop();
      ok = storageWrite(JSON.stringify(state));
    }
    if (!ok) storageAvailable = false;
    $('#storage-warning').hidden = storageAvailable;
  }

  /* ============================ 4. Pure helpers ============================ */

  function shuffle(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /** Returns a copy of the question with shuffled options; the answer index and explanations follow the options. */
  function prepareQuestion(q) {
    const order = shuffle([0, 1, 2, 3]);
    return Object.assign({}, q, {
      options: order.map((i) => q.options[i]),
      whyWrong: order.map((i) => q.whyWrong[i]),
      answer: order.indexOf(q.answer)
    });
  }

  function questionsMatching(topic, difficulty) {
    return BANK.filter((q) =>
      (topic === 'all' || q.topic === topic) && (difficulty === 'all' || q.difficulty === difficulty));
  }

  /** 5, 10 and 15, limited by availability. Very small pools offer "all available". */
  function allowedCounts(available) {
    if (available <= 0) return [];
    const counts = COUNT_CHOICES.filter((n) => n <= available);
    return counts.length ? counts : [available];
  }

  const percent = (correct, total) => (total > 0 ? Math.round((correct / total) * 100) : 0);

  function emptyTopicStats() {
    const stats = {};
    Object.keys(TOPICS).forEach((key) => { stats[key] = { total: 0, correct: 0 }; });
    return stats;
  }

  function computeTopicStats(answers) {
    const stats = emptyTopicStats();
    answers.forEach((a) => {
      const bucket = stats[a.question.topic];
      bucket.total += 1;
      if (a.correct) bucket.correct += 1;
    });
    return stats;
  }

  function aggregateTopicStats(sessions) {
    const totals = emptyTopicStats();
    sessions.forEach((s) => {
      Object.keys(TOPICS).forEach((key) => {
        const t = s.topicStats[key];
        if (t && Number.isInteger(t.total) && Number.isInteger(t.correct)) {
          totals[key].total += t.total;
          totals[key].correct += t.correct;
        }
      });
    });
    return totals;
  }

  /**
   * Transparent recommendation rules:
   *  - a topic is flagged when it has at least MIN_TOPIC_SAMPLE answers and scored below WEAK_THRESHOLD %;
   *  - topics with fewer answers are reported as "not enough data" rather than judged.
   */
  function buildRecommendations(topicStats) {
    const flagged = [];
    const insufficient = [];
    Object.keys(TOPICS).forEach((key) => {
      const t = topicStats[key];
      if (t.total === 0) return;
      if (t.total < MIN_TOPIC_SAMPLE) insufficient.push(key);
      else if (percent(t.correct, t.total) < WEAK_THRESHOLD) flagged.push(key);
    });
    return { flagged, insufficient };
  }

  function formatDate(iso) {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }

  function describeSettings(settings) {
    const topic = settings.topic === 'all' ? 'All Topics' : TOPICS[settings.topic].label;
    const level = settings.difficulty === 'all' ? 'All levels' : DIFFICULTIES[settings.difficulty];
    return [topic, level, settings.timed ? 'Timed' : 'Untimed', settings.source === 'ai' ? 'AI-generated' : 'Built-in'].join(' · ');
  }

  /* ============================ 5. DOM helpers and views ============================ */

  const $ = (selector, root) => (root || document).querySelector(selector);
  const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));

  /** Builds an element. Text is always inserted with textContent / text nodes (never innerHTML). */
  function h(tag, props, ...children) {
    const node = document.createElement(tag);
    Object.entries(props || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === false) return;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? '' : String(value));
    });
    children.flat().forEach((child) => {
      if (child === null || child === undefined || child === false) return;
      node.append(typeof child === 'object' ? child : document.createTextNode(String(child)));
    });
    return node;
  }

  const BANK = (Array.isArray(window.QUESTION_BANK) ? window.QUESTION_BANK : []).filter((q) => {
    const result = validateQuestion(q);
    if (!result.valid) console.warn('Skipping invalid bank question', q && q.id, result.errors);
    return result.valid;
  });

  let state = defaultState();
  let quiz = null;           // active quiz session, or null
  let currentResult = null;  // result record shown on the results screen
  let aiQuestions = [];      // validated AI questions waiting to be practised
  let aiRequest = null;      // AbortController of an in-flight AI request
  let currentView = 'dashboard';

  const VIEW_IDS = ['dashboard', 'setup', 'quiz', 'results', 'history'];

  function showView(name) {
    currentView = name;
    VIEW_IDS.forEach((id) => { $('#view-' + id).hidden = id !== name; });
    $$('.nav-btn').forEach((btn) => {
      if (btn.dataset.nav === name || (name === 'results' && btn.dataset.nav === 'history')) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
    if (name === 'dashboard') renderDashboard();
    if (name === 'setup') renderSetup();
    if (name === 'history') renderHistory();
    window.scrollTo(0, 0);
    const heading = $('#view-' + name + ' [tabindex="-1"]');
    if (heading) heading.focus({ preventScroll: true });
  }

  /** Navigation entry point; asks before throwing away a quiz in progress. */
  function navigate(name) {
    if (quiz && name !== 'quiz') {
      if (!window.confirm('Leave this quiz? Your progress in this attempt will not be saved.')) return;
      stopTimer();
      quiz = null;
    }
    showView(name);
  }

  /* ============================ 6a. Dashboard ============================ */

  function renderDashboard() {
    const sessions = state.sessions;
    const totals = aggregateTopicStats(sessions);
    const answered = Object.values(totals).reduce((sum, t) => sum + t.total, 0);
    const correct = Object.values(totals).reduce((sum, t) => sum + t.correct, 0);

    const stat = (label, value, note) => h('div', { class: 'stat' },
      h('div', { class: 'stat-label', text: label }),
      h('div', { class: 'stat-value', text: value }),
      note ? h('div', { class: 'stat-note', text: note }) : null);

    $('#stats').replaceChildren(
      stat('Practice sessions', String(sessions.length)),
      stat('Questions answered', String(answered)),
      stat('Overall accuracy', answered ? percent(correct, answered) + '%' : '—', answered ? correct + ' of ' + answered + ' correct' : 'No data yet'),
      stat('Questions available', String(BANK.length), 'Built-in practice bank')
    );
    $('#first-use').hidden = sessions.length > 0;
    renderInsights(totals, answered, correct);
    renderTopicCards(totals);
    renderRecent();
  }

  function renderInsights(totals, answered, correct) {
    const box = $('#insights');
    box.replaceChildren();
    if (!state.sessions.length) return;

    const eligible = Object.keys(TOPICS).filter((k) => totals[k].total >= MIN_DASHBOARD_SAMPLE);
    if (eligible.length >= 2) {
      const ranked = eligible.slice().sort((a, b) => percent(totals[b].correct, totals[b].total) - percent(totals[a].correct, totals[a].total));
      const best = ranked[0];
      const worst = ranked[ranked.length - 1];
      box.append(
        h('div', { class: 'insight strong' }, h('h3', { text: 'Strongest topic' }),
          h('p', { text: TOPICS[best].label + ' — ' + percent(totals[best].correct, totals[best].total) + '% correct' })),
        h('div', { class: 'insight weak' }, h('h3', { text: 'Weakest topic' }),
          h('p', { text: TOPICS[worst].label + ' — ' + percent(totals[worst].correct, totals[worst].total) + '% correct' }))
      );
    } else {
      box.append(h('div', { class: 'insight info' }, h('h3', { text: 'Strongest and weakest topics' }),
        h('p', { text: 'Answer at least ' + MIN_DASHBOARD_SAMPLE + ' questions in two or more topics to compare them.' })));
    }

    if (answered >= MIN_READINESS_SAMPLE) {
      const acc = percent(correct, answered);
      const band = acc >= 80 ? 'Strong results so far' : acc >= WEAK_THRESHOLD ? 'Approaching a good level' : 'More practice recommended';
      box.append(h('div', { class: 'insight info' }, h('h3', { text: 'Indicative readiness: ' + band }),
        h('p', { text: 'Based on ' + answered + ' practice answers. This is an indicative estimate only. It is not an official prediction, and a practice score does not guarantee exam success.' })));
    }
  }

  function renderTopicCards(totals) {
    const cards = Object.keys(TOPICS).map((key) => {
      const available = questionsMatching(key, 'all').length;
      const t = totals[key];
      return h('article', { class: 'topic-card' },
        h('h3', { text: TOPICS[key].label }),
        h('p', { text: TOPICS[key].blurb }),
        h('div', { class: 'topic-foot' },
          h('span', { class: 'muted', text: available + ' questions' + (t.total ? ' · ' + percent(t.correct, t.total) + '% accuracy' : '') }),
          h('button', {
            type: 'button', class: 'btn secondary small', 'aria-label': 'Practice ' + TOPICS[key].label,
            onclick: () => { state.settings.topic = key; saveState(); navigate('setup'); }
          }, 'Practice')));
    });
    $('#topic-cards').replaceChildren(...cards);
  }

  function renderRecent() {
    const box = $('#recent-results');
    if (!state.sessions.length) {
      box.replaceChildren(h('p', { class: 'muted', text: 'Completed quizzes will appear here.' }));
      return;
    }
    box.replaceChildren(...state.sessions.slice(0, 3).map(historyItem));
  }

  /* ============================ 6b. Quiz setup ============================ */

  function setRadio(name, value) {
    $$('input[name="' + name + '"]').forEach((input) => { input.checked = input.value === value; });
  }

  function readSetup() {
    const form = $('#setup-form');
    return sanitizeSettings({
      topic: form.elements.topic.value,
      difficulty: form.elements.difficulty.value,
      count: Number($('#count-select').value),
      timed: $('#timed-toggle').checked
    });
  }

  function renderSetup() {
    setRadio('topic', state.settings.topic);
    setRadio('difficulty', state.settings.difficulty);
    $('#timed-toggle').checked = state.settings.timed;
    $('#ai-endpoint').value = state.aiEndpoint;
    refreshCountOptions(state.settings.count);
  }

  /** Rebuilds the count dropdown so it never offers more questions than exist for the filters. */
  function refreshCountOptions(preferred) {
    const topic = $('#setup-form').elements.topic.value || 'all';
    const difficulty = $('#setup-form').elements.difficulty.value || 'all';
    const available = questionsMatching(topic, difficulty).length;
    const counts = allowedCounts(available);
    const select = $('#count-select');
    select.replaceChildren(...counts.map((n) => h('option', { value: n, text: counts.length === 1 && n < COUNT_CHOICES[0] ? 'All ' + n : String(n) })));
    const fit = counts.filter((n) => n <= preferred).pop() || counts[0];
    if (fit !== undefined) select.value = String(fit);

    const none = available === 0;
    select.disabled = none;
    $('#start-quiz-btn').disabled = none || BANK.length === 0;
    $('#match-info').textContent = none
      ? 'No built-in questions match this combination. Try another topic or difficulty.'
      : available + ' built-in question' + (available === 1 ? '' : 's') + ' match your selection.';
  }

  function onSetupChange() {
    refreshCountOptions(Number($('#count-select').value));
    state.settings = readSetup();
    saveState();
  }

  function onSetupSubmit(event) {
    event.preventDefault();
    const settings = readSetup();
    const pool = questionsMatching(settings.topic, settings.difficulty);
    if (!pool.length) return;
    const count = Math.min(settings.count, pool.length);
    state.settings = settings;
    saveState();
    startQuiz(shuffle(pool).slice(0, count).map(prepareQuestion), Object.assign({}, settings, { count, source: 'bank' }));
  }

  /* ============================ 6c. Quiz engine ============================ */

  function startQuiz(questions, settings) {
    if (!questions.length) return;
    stopTimer();
    quiz = {
      questions,
      settings,
      index: 0,
      answers: [],
      selected: null,
      submitted: false,
      timerId: null,
      remaining: 0,
      reported: new Set()
    };
    showView('quiz');
    renderQuestion();
  }

  function renderQuestion() {
    const q = quiz.questions[quiz.index];
    const total = quiz.questions.length;
    quiz.selected = null;
    quiz.submitted = false;

    $('#quiz-title').textContent = 'Question ' + (quiz.index + 1) + ' of ' + total;
    setProgress(quiz.index, total);

    const badges = [h('span', { class: 'badge', text: TOPICS[q.topic].label }), h('span', { class: 'badge', text: DIFFICULTIES[q.difficulty] })];
    if (q.source === 'ai') badges.push(h('span', { class: 'badge badge-ai', text: 'AI-generated practice material' }));
    $('#quiz-badges').replaceChildren(...badges);

    $('#question-text').textContent = q.question;

    const hintBtn = $('#hint-btn');
    const hintText = $('#hint-text');
    hintText.hidden = true;
    hintText.textContent = q.hint || '';
    hintBtn.hidden = !q.hint;
    hintBtn.disabled = false;
    hintBtn.textContent = 'Show hint';
    hintBtn.setAttribute('aria-expanded', 'false');

    const options = q.options.map((text, i) => h('label', { class: 'option', 'data-index': i },
      h('input', { type: 'radio', name: 'answer', value: i, onchange: () => onSelect(i) }),
      h('span', { class: 'option-body' },
        h('span', { class: 'option-letter', 'aria-hidden': 'true', text: OPTION_LETTERS[i] }),
        h('span', { class: 'option-text' }, h('span', { class: 'sr-only-prefix' }, OPTION_LETTERS[i] + '. '), text,
          h('span', { class: 'option-tag', text: '' })))));
    $('#options').replaceChildren(...options);

    $('#quiz-message').textContent = '';
    $('#quiz-message').className = 'status';
    $('#submit-btn').hidden = false;
    $('#submit-btn').disabled = true;
    $('#next-btn').hidden = true;
    const feedback = $('#feedback');
    feedback.hidden = true;
    feedback.replaceChildren();

    $('#quit-btn').disabled = false;
    startTimer();
    $('#quiz-title').focus({ preventScroll: true });
  }

  function setProgress(done, total) {
    const pct = Math.round((done / total) * 100);
    $('#quiz-progress-bar').style.width = pct + '%';
    $('#quiz-progress').setAttribute('aria-valuenow', String(pct));
  }

  function onSelect(index) {
    if (!quiz || quiz.submitted) return;
    quiz.selected = index;
    $('#submit-btn').disabled = false;
    $('#quiz-message').textContent = '';
  }

  function toggleHint() {
    const hintText = $('#hint-text');
    const show = hintText.hidden;
    hintText.hidden = !show;
    $('#hint-btn').textContent = show ? 'Hide hint' : 'Show hint';
    $('#hint-btn').setAttribute('aria-expanded', String(show));
  }

  /* ---- timer ---- */

  function startTimer() {
    stopTimer();
    const timerEl = $('#quiz-timer');
    timerEl.hidden = !quiz.settings.timed;
    if (!quiz.settings.timed) return;
    quiz.remaining = SECONDS_PER_QUESTION;
    updateTimerDisplay();
    quiz.timerId = window.setInterval(() => {
      if (!quiz || quiz.submitted) { stopTimer(); return; }
      quiz.remaining -= 1;
      updateTimerDisplay();
      if (quiz.remaining <= 0) submitAnswer(true);
    }, 1000);
  }

  function stopTimer() {
    if (quiz && quiz.timerId !== null) window.clearInterval(quiz.timerId);
    if (quiz) quiz.timerId = null;
  }

  function updateTimerDisplay() {
    const el = $('#quiz-timer');
    const secs = Math.max(0, quiz.remaining);
    el.textContent = 'Time left: ' + Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0');
    el.classList.toggle('low', secs <= 10);
  }

  /* ---- submit / feedback ---- */

  function submitAnswer(timedOut) {
    if (!quiz || quiz.submitted) return; // blocks double submission
    if (!timedOut && quiz.selected === null) {
      const msg = $('#quiz-message');
      msg.textContent = 'Please select an answer before submitting.';
      msg.className = 'status error';
      return;
    }
    quiz.submitted = true;
    stopTimer();

    const q = quiz.questions[quiz.index];
    const selected = quiz.selected; // may be null when time ran out with nothing chosen
    const isCorrect = selected === q.answer;
    quiz.answers.push({ selected, correct: isCorrect, timedOut: timedOut === true, question: q });

    markOptions(q, selected);
    renderFeedback(q, selected, isCorrect, timedOut === true);
    setProgress(quiz.index + 1, quiz.questions.length);

    $('#submit-btn').hidden = true;
    $('#hint-btn').disabled = true;
    const next = $('#next-btn');
    next.textContent = quiz.index + 1 >= quiz.questions.length ? 'See Results' : 'Next Question';
    next.hidden = false;
    $('#feedback').focus({ preventScroll: false });
  }

  function markOptions(q, selected) {
    $$('#options .option').forEach((label) => {
      const i = Number(label.dataset.index);
      const input = $('input', label);
      input.disabled = true;
      label.classList.add('is-locked');
      const tag = $('.option-tag', label);
      if (i === q.answer) {
        label.classList.add('is-correct');
        tag.textContent = i === selected ? '✓ Correct — your answer' : '✓ Correct answer';
      } else if (i === selected) {
        label.classList.add('is-incorrect');
        tag.textContent = '✗ Your answer — incorrect';
      }
    });
  }

  function renderFeedback(q, selected, isCorrect, timedOut) {
    const box = $('#feedback');
    box.className = 'feedback ' + (isCorrect ? 'good' : 'bad');
    const heading = isCorrect ? 'Correct!' : timedOut && selected === null ? "Time's up" : 'Not quite';
    const wrongItems = q.options
      .map((text, i) => (i === q.answer ? null : h('li', {}, h('strong', { text: OPTION_LETTERS[i] + '. ' }), q.whyWrong[i])))
      .filter(Boolean);

    box.replaceChildren(
      h('h3', { text: heading }),
      h('p', {}, h('strong', { text: 'Correct answer: ' + OPTION_LETTERS[q.answer] + '. ' }), q.options[q.answer]),
      h('p', { text: q.explanation }),
      h('p', { class: 'sub', text: 'Why the other options are wrong' }),
      h('ul', {}, wrongItems),
      h('button', { type: 'button', class: 'btn ghost small', id: 'report-btn', onclick: reportQuestion }, 'Report this question'),
      h('p', { id: 'report-status', class: 'status', role: 'status' })
    );
    box.hidden = false;
  }

  /** Reports are stored on this device only (there is no server to send them to). */
  function reportQuestion() {
    if (!quiz) return;
    const q = quiz.questions[quiz.index];
    const status = $('#report-status');
    if (quiz.reported.has(q.id)) { status.textContent = 'You already reported this question.'; return; }
    quiz.reported.add(q.id);
    state.reports.unshift({ questionId: q.id, question: q.question, source: q.source === 'ai' ? 'ai' : 'bank', date: new Date().toISOString() });
    state.reports = state.reports.slice(0, MAX_REPORTS);
    saveState();
    status.textContent = 'Thanks. The report was saved on this device so you can review the question later.';
    status.className = 'status ok';
  }

  function nextQuestion() {
    if (!quiz || !quiz.submitted) return; // cannot advance before submitting
    if (quiz.index + 1 >= quiz.questions.length) finishQuiz();
    else { quiz.index += 1; renderQuestion(); }
  }

  function quitQuiz() {
    if (!quiz) return;
    if (!window.confirm('Quit this quiz? Your progress in this attempt will not be saved.')) return;
    stopTimer();
    quiz = null;
    showView('dashboard');
  }

  function finishQuiz() {
    stopTimer();
    const total = quiz.answers.length;
    const correct = quiz.answers.filter((a) => a.correct).length;
    const record = {
      id: 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      finishedAt: new Date().toISOString(),
      settings: Object.assign({}, quiz.settings, { count: total }),
      total,
      correct,
      percent: percent(correct, total),
      topicStats: computeTopicStats(quiz.answers),
      answers: quiz.answers.map((a) => ({ selected: a.selected, correct: a.correct, timedOut: a.timedOut, question: a.question }))
    };
    state.sessions.unshift(record);
    state.sessions = state.sessions.slice(0, MAX_SESSIONS);
    saveState();
    quiz = null;
    showResults(record);
  }

  /* ============================ 6d. Results ============================ */

  function showResults(record) {
    currentResult = record;
    renderResults(record);
    showView('results');
  }

  function renderResults(record) {
    const incorrect = record.total - record.correct;
    $('#results-sub').textContent = 'Completed ' + formatDate(record.finishedAt) + ' · ' + describeSettings(record.settings);

    const ring = h('div', { class: 'score-ring', role: 'img', 'aria-label': 'Score ' + record.percent + ' percent' }, h('span', { text: record.percent + '%' }));
    ring.style.setProperty('--pct', String(record.percent));

    const summary = h('section', { class: 'card score-card', 'aria-label': 'Score summary' }, ring,
      h('div', { class: 'score-lines' },
        h('p', { class: 'big', text: record.correct + ' of ' + record.total + ' correct' }),
        h('p', { text: 'Questions attempted: ' + record.total }),
        h('p', { text: 'Correct: ' + record.correct + ' · Incorrect: ' + incorrect }),
        h('p', { class: 'muted', text: 'Practice scores are indicative only and do not predict official exam results.' })));

    const topics = h('section', { class: 'card', 'aria-labelledby': 'res-topics' },
      h('h3', { id: 'res-topics', text: 'Topic-by-topic performance' }),
      ...Object.keys(TOPICS).map((key) => topicRow(key, record.topicStats[key])));

    const recos = renderRecommendations(record.topicStats);

    const wrong = record.answers.filter((a) => !a.correct);
    const right = record.answers.filter((a) => a.correct);
    const review = h('section', { class: 'card', 'aria-labelledby': 'res-review' },
      h('h3', { id: 'res-review', text: 'Questions answered incorrectly' }),
      wrong.length
        ? wrong.map((a) => reviewItem(a, record.answers.indexOf(a), true))
        : h('p', { text: 'You answered every question correctly. Nicely done!' }),
      right.length ? h('h3', { text: 'Questions answered correctly' }) : null,
      right.map((a) => reviewItem(a, record.answers.indexOf(a), false)));

    $('#results-content').replaceChildren(summary, topics, recos, review);
  }

  function topicRow(key, stats) {
    const t = stats || { total: 0, correct: 0 };
    const pct = percent(t.correct, t.total);
    const bar = h('div', { class: 'bar' }, h('div', { class: pct < WEAK_THRESHOLD && t.total ? 'low' : '' }));
    bar.firstChild.style.width = pct + '%';
    return h('div', { class: 'topic-row' },
      h('div', { class: 'topic-row-head' },
        h('span', { text: TOPICS[key].label }),
        h('span', { text: t.total ? t.correct + '/' + t.total + ' (' + pct + '%)' : 'Not covered' })),
      bar);
  }

  function renderRecommendations(topicStats) {
    const { flagged, insufficient } = buildRecommendations(topicStats);
    const wrap = h('section', { class: 'card', 'aria-labelledby': 'res-reco' }, h('h3', { id: 'res-reco', text: 'Recommended revision' }));
    flagged.forEach((key) => {
      const t = topicStats[key];
      wrap.append(h('div', { class: 'reco' },
        h('h4', { text: TOPICS[key].label + ' — ' + percent(t.correct, t.total) + '%' }),
        h('p', { text: TOPICS[key].review })));
    });
    if (!flagged.length) {
      wrap.append(h('div', { class: 'reco ok' }, h('h4', { text: 'No weak topics detected in this quiz' }),
        h('p', { text: 'No topic with at least ' + MIN_TOPIC_SAMPLE + ' answers scored below ' + WEAK_THRESHOLD + '%. Keep practising across all topics and difficulty levels.' })));
    }
    if (insufficient.length) {
      wrap.append(h('p', { class: 'muted', text: 'Not enough answers to judge: ' + insufficient.map((k) => TOPICS[k].label).join(', ') + ' (fewer than ' + MIN_TOPIC_SAMPLE + ' questions).' }));
    }
    wrap.append(h('p', { class: 'muted', text: 'Rule used: a topic is flagged when it has at least ' + MIN_TOPIC_SAMPLE + ' answers and a score below ' + WEAK_THRESHOLD + '%.' }));
    return wrap;
  }

  function reviewItem(answer, index, open) {
    const q = answer.question;
    const yours = answer.selected === null ? 'No answer (time ran out)' : OPTION_LETTERS[answer.selected] + '. ' + q.options[answer.selected];
    const details = h('details', { class: 'review' },
      h('summary', { text: (index + 1) + '. ' + q.question }),
      h('div', { class: 'review-body' },
        h('p', { class: 'muted', text: TOPICS[q.topic].label + ' · ' + DIFFICULTIES[q.difficulty] + (q.source === 'ai' ? ' · AI-generated practice material' : '') }),
        h('p', {}, h('strong', { text: 'Your answer: ' }), yours, answer.correct ? ' (correct)' : ' (incorrect)'),
        h('p', {}, h('strong', { text: 'Correct answer: ' }), OPTION_LETTERS[q.answer] + '. ' + q.options[q.answer]),
        h('p', { text: q.explanation }),
        h('ul', {}, q.options.map((text, i) => (i === q.answer ? null : h('li', {}, h('strong', { text: OPTION_LETTERS[i] + '. ' }), q.whyWrong[i]))).filter(Boolean))));
    if (open) details.open = true;
    return details;
  }

  /** Retry uses the same questions for AI sets, or draws a fresh set from the bank with the same settings. */
  function retryQuiz() {
    if (!currentResult) { navigate('setup'); return; }
    const settings = currentResult.settings;
    if (settings.source === 'ai') {
      startQuiz(shuffle(currentResult.answers.map((a) => a.question)).map(prepareQuestion), Object.assign({}, settings));
      return;
    }
    const pool = questionsMatching(settings.topic, settings.difficulty);
    if (!pool.length) { navigate('setup'); return; }
    const count = Math.min(settings.count, pool.length);
    startQuiz(shuffle(pool).slice(0, count).map(prepareQuestion), Object.assign({}, settings, { count }));
  }

  /* ============================ 6e. History ============================ */

  function historyItem(record) {
    return h('div', { class: 'history-item' },
      h('div', {},
        h('div', { class: 'score', text: record.percent + '% (' + record.correct + '/' + record.total + ')' }),
        h('div', { class: 'meta', text: formatDate(record.finishedAt) }),
        h('div', { class: 'meta', text: describeSettings(record.settings) })),
      h('button', {
        type: 'button', class: 'btn secondary small',
        'aria-label': 'Review result from ' + formatDate(record.finishedAt),
        onclick: () => showResults(record)
      }, 'Review'));
  }

  function renderHistory() {
    const list = $('#history-list');
    $('#clear-history-btn').disabled = state.sessions.length === 0;
    if (!state.sessions.length) {
      list.replaceChildren(h('div', { class: 'card empty-state' }, h('h3', { text: 'No history yet' }),
        h('p', { text: 'Finish a quiz and it will be listed here so you can review it later.' })));
      return;
    }
    list.replaceChildren(...state.sessions.map(historyItem));
  }

  function clearHistory() {
    if (!state.sessions.length) return;
    if (!window.confirm('Delete all saved practice history on this device? This cannot be undone.')) return;
    state.sessions = [];
    state.reports = [];
    currentResult = null;
    saveState();
    renderHistory();
    const status = $('#history-status');
    status.textContent = 'Practice history cleared.';
    status.className = 'status ok';
  }

  /* ============================ 7. AI question generation ============================ */

  function normalizeEndpoint(value) {
    const text = String(value || '').trim();
    if (!text) return null;
    try {
      const url = new URL(text);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
      return url.origin + url.pathname.replace(/\/+$/, '');
    } catch (err) {
      return null;
    }
  }

  function setAiStatus(message, kind) {
    const el = $('#ai-status');
    el.textContent = message;
    el.className = 'status' + (kind ? ' ' + kind : '');
  }

  /**
   * Validates what the AI returned. Questions that fail validation are rejected, not repaired.
   * Topic/difficulty fall back to the requested values only when a specific one was requested.
   */
  function acceptAiQuestions(rawList, requested) {
    const accepted = [];
    let rejected = 0;
    const stamp = Date.now().toString(36);
    rawList.forEach((raw, i) => {
      if (!raw || typeof raw !== 'object') { rejected += 1; return; }
      const candidate = Object.assign({}, raw, { id: 'ai-' + stamp + '-' + i });
      if (!hasOwn(TOPICS, candidate.topic) && requested.topic !== 'all') candidate.topic = requested.topic;
      if (!hasOwn(DIFFICULTIES, candidate.difficulty) && requested.difficulty !== 'all') candidate.difficulty = requested.difficulty;
      if (typeof candidate.hint !== 'string') delete candidate.hint;
      if (validateQuestion(candidate).valid) accepted.push(Object.assign(candidate, { source: 'ai' }));
      else rejected += 1;
    });
    return { accepted, rejected };
  }

  async function generateAiQuestions() {
    if (aiRequest) return; // one request at a time
    const endpoint = normalizeEndpoint($('#ai-endpoint').value);
    if (!endpoint) {
      setAiStatus('AI generation is not configured. Enter your backend URL (see the README), or keep practising with the built-in questions.', 'error');
      return;
    }
    state.aiEndpoint = endpoint;
    saveState();

    const requested = { topic: readSetup().topic, difficulty: readSetup().difficulty, count: Number($('#ai-count').value) || 5 };
    const button = $('#ai-generate-btn');
    const controller = new AbortController();
    aiRequest = controller;
    button.disabled = true;
    $('#ai-results').hidden = true;
    aiQuestions = [];
    setAiStatus('Generating questions… this can take up to a minute.');
    const timeout = window.setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    try {
      const response = await fetch(endpoint + '/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requested),
        signal: controller.signal
      });
      let payload = null;
      try { payload = await response.json(); } catch (err) { payload = null; }
      if (!response.ok) {
        const reason = payload && typeof payload.error === 'string' ? payload.error : 'The backend returned status ' + response.status + '.';
        throw new Error(reason);
      }
      if (!payload || !Array.isArray(payload.questions)) throw new Error('The backend response did not contain a questions list.');

      const { accepted, rejected } = acceptAiQuestions(payload.questions, requested);
      if (!accepted.length) throw new Error('None of the generated questions passed validation (' + rejected + ' rejected).');

      aiQuestions = accepted;
      renderAiPreview(requested);
      setAiStatus(accepted.length + ' question' + (accepted.length === 1 ? '' : 's') + ' ready' + (rejected ? '; ' + rejected + ' invalid question' + (rejected === 1 ? ' was' : 's were') + ' rejected' : '') + '.', 'ok');
    } catch (err) {
      const message = err && err.name === 'AbortError'
        ? 'The request timed out.'
        : err && err.message ? err.message : 'Something went wrong.';
      const network = err instanceof TypeError ? ' Could not reach the backend. Check the URL, that it is running, and that CORS allows this page.' : '';
      setAiStatus('AI generation failed: ' + message + network + ' You can still practise with the built-in question bank.', 'error');
    } finally {
      window.clearTimeout(timeout);
      aiRequest = null;
      button.disabled = false;
    }
  }

  function renderAiPreview() {
    $('#ai-list').replaceChildren(...aiQuestions.map((q) =>
      h('li', {}, q.question, ' ', h('span', { class: 'badge', text: TOPICS[q.topic].label + ' · ' + DIFFICULTIES[q.difficulty] }))));
    $('#ai-results').hidden = aiQuestions.length === 0;
  }

  function practiceAiQuestions() {
    if (!aiQuestions.length) return;
    const settings = readSetup();
    startQuiz(shuffle(aiQuestions).map(prepareQuestion), {
      topic: settings.topic,
      difficulty: settings.difficulty,
      count: aiQuestions.length,
      timed: settings.timed,
      source: 'ai'
    });
  }

  /* ============================ 8. Init ============================ */

  function bindEvents() {
    $$('.nav-btn').forEach((btn) => btn.addEventListener('click', () => navigate(btn.dataset.nav)));
    $('#start-practice-btn').addEventListener('click', () => navigate('setup'));
    $('#view-history-btn').addEventListener('click', () => navigate('history'));

    const form = $('#setup-form');
    form.addEventListener('change', onSetupChange);
    form.addEventListener('submit', onSetupSubmit);

    $('#hint-btn').addEventListener('click', toggleHint);
    $('#submit-btn').addEventListener('click', () => submitAnswer(false));
    $('#next-btn').addEventListener('click', nextQuestion);
    $('#quit-btn').addEventListener('click', quitQuiz);

    $('#retry-btn').addEventListener('click', retryQuiz);
    $('#results-dashboard-btn').addEventListener('click', () => navigate('dashboard'));
    $('#clear-history-btn').addEventListener('click', clearHistory);

    $('#ai-generate-btn').addEventListener('click', generateAiQuestions);
    $('#ai-practice-btn').addEventListener('click', practiceAiQuestions);
  }

  function init() {
    probeStorage();
    state = loadState();
    $('#storage-warning').hidden = storageAvailable;
    $('#bank-error').hidden = BANK.length > 0;
    $('#start-practice-btn').disabled = BANK.length === 0;
    bindEvents();
    showView('dashboard');
  }

  init();
})();
