'use strict';
/*
 * CloudQuiz AI backend (optional). Dependency-free Node.js (v18+) server.
 *
 * It keeps the API key on the server: the web page sends only
 * { topic, difficulty, count } and receives { questions: [...] }.
 * The page validates every returned question again before using it.
 *
 * Environment variables (see backend/README.md):
 *   ANTHROPIC_API_KEY   required for generation
 *   ANTHROPIC_MODEL     default "claude-sonnet-5-5"
 *   ALLOWED_ORIGIN      comma-separated origins allowed by CORS (default http://localhost:8000)
 *   PORT                default 8787
 *   ANTHROPIC_API_URL   override for testing (default https://api.anthropic.com/v1/messages)
 */
const http = require('node:http');

const PORT = Number(process.env.PORT) || 8787;
const API_KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
const API_URL = process.env.ANTHROPIC_API_URL || 'https://api.anthropic.com/v1/messages';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || 'http://localhost:8000').split(',').map((s) => s.trim()).filter(Boolean);

const TOPIC_LABELS = {
  cloud: 'Cloud Concepts (cloud models, shared responsibility, consumption-based pricing, benefits of cloud, IaaS/PaaS/SaaS)',
  architecture: 'Azure Architecture and Services (regions, availability zones, resource groups, subscriptions, management groups, compute, networking, storage, identity such as Microsoft Entra ID)',
  management: 'Azure Management and Governance (cost management, Azure Policy, locks, tags, Microsoft Defender for Cloud, Microsoft Purview, Azure Monitor, Azure Advisor, Service Health, Azure Arc, Cloud Shell, CLI and PowerShell)'
};
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];
const MAX_BODY_BYTES = 4096;
const RATE_LIMIT = 10;            // requests per minute per client address
const UPSTREAM_TIMEOUT_MS = 55000;

const SYSTEM_PROMPT = [
  'You are an experienced Microsoft Azure Fundamentals (AZ-900) educator writing practice questions for learners.',
  '',
  'Rules:',
  '- Write ORIGINAL questions. Never reproduce, paraphrase closely, or imitate real certification exam questions or leaked question banks.',
  '- Cover only AZ-900-level, foundational knowledge. Use current Azure names (for example Microsoft Entra ID, not Azure Active Directory).',
  '- Every question must have exactly four plausible options and exactly ONE unambiguously correct answer. Avoid "all of the above", "none of the above" and trick wording.',
  '- Distractors must be plausible to a learner but clearly wrong to someone who knows the concept.',
  '- Make only claims you are confident are accurate. If you are unsure about a detail (limits, prices, exact feature behaviour), choose a different question instead of guessing.',
  '- Vary the position of the correct answer across questions.',
  '- Respect the requested topic and difficulty. Beginner = definitions and recognition; intermediate = applying a concept to a short scenario; advanced = distinguishing between similar services or responsibilities.',
  '- Write a concise explanation of why the correct answer is right, and a one-sentence reason why EACH incorrect option is wrong.',
  '- Add a short hint that helps reasoning without revealing the answer.',
  '',
  'Output format: return ONLY a JSON object, with no markdown fences and no commentary, shaped exactly like:',
  '{"questions":[{"topic":"cloud|architecture|management","difficulty":"beginner|intermediate|advanced","question":"...","options":["...","...","...","..."],"answer":0,"explanation":"...","whyWrong":["...","...","...","..."],"hint":"..."}]}',
  '',
  'Field rules: "answer" is the zero-based index (0-3) of the correct option. "whyWrong" has four strings aligned with "options"; the entry at the answer index must be an empty string "".'
].join('\n');

/* ---------- tiny in-memory rate limiter ---------- */
const hits = new Map();
function rateLimited(key) {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < 60000);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > RATE_LIMIT;
}

function corsHeaders(origin) {
  const headers = { Vary: 'Origin' };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'POST, GET, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
    headers['Access-Control-Max-Age'] = '600';
  }
  return headers;
}

function send(res, status, body, origin) {
  res.writeHead(status, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, corsHeaders(origin)));
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let tooLarge = false;
    const chunks = [];
    req.on('data', (chunk) => {
      if (tooLarge) return;           // keep draining so the 413 reply can be delivered
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        tooLarge = true;
        chunks.length = 0;
        reject(Object.assign(new Error('Request body too large.'), { status: 413 }));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/** Pulls the JSON object out of the model reply even if it wrapped it in prose or fences. */
function extractJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('No JSON object found in model reply.');
  return JSON.parse(text.slice(start, end + 1));
}

function buildUserPrompt({ topic, difficulty, count }) {
  const topicText = topic === 'all'
    ? 'a balanced mix across all three areas: ' + Object.values(TOPIC_LABELS).join('; ')
    : TOPIC_LABELS[topic];
  const level = difficulty === 'all' ? 'a mix of beginner, intermediate and advanced' : difficulty;
  return 'Write ' + count + ' original AZ-900 practice question' + (count === 1 ? '' : 's') + '.\nTopic: ' + topicText + '\nDifficulty: ' + level + '\nSet each question\'s "topic" and "difficulty" fields to the exact allowed values.';
}

async function generate(params) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(params) }]
    }),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
  });
  if (!response.ok) {
    console.error('Upstream error', response.status);
    throw Object.assign(new Error('The AI service returned an error (status ' + response.status + ').'), { status: 502 });
  }
  const data = await response.json();
  const text = Array.isArray(data.content) ? data.content.filter((b) => b.type === 'text').map((b) => b.text).join('') : '';
  const parsed = extractJson(text);
  if (!Array.isArray(parsed.questions)) throw new Error('Model reply did not contain a questions array.');
  return parsed.questions;
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  const url = new URL(req.url, 'http://localhost');

  try {
    if (req.method === 'OPTIONS') { res.writeHead(204, corsHeaders(origin)); res.end(); return; }
    if (req.method === 'GET' && url.pathname === '/health') {
      send(res, 200, { ok: true, aiConfigured: Boolean(API_KEY) }, origin);
      return;
    }
    if (req.method !== 'POST' || url.pathname !== '/api/generate') { send(res, 404, { error: 'Not found.' }, origin); return; }

    if (origin && !ALLOWED_ORIGINS.includes(origin)) { send(res, 403, { error: 'Origin not allowed.' }, origin); return; }
    if (!API_KEY) { send(res, 503, { error: 'The server has no ANTHROPIC_API_KEY configured.' }, origin); return; }
    if (rateLimited(req.socket.remoteAddress || 'unknown')) { send(res, 429, { error: 'Too many requests. Please wait a minute.' }, origin); return; }

    let input;
    try { input = JSON.parse(await readBody(req)); } catch (err) {
      send(res, err.status || 400, { error: err.status ? err.message : 'Request body must be valid JSON.' }, origin);
      return;
    }
    const topic = input && input.topic;
    const difficulty = input && input.difficulty;
    const count = input && input.count;
    if (topic !== 'all' && !Object.prototype.hasOwnProperty.call(TOPIC_LABELS, topic)) { send(res, 400, { error: 'Invalid topic.' }, origin); return; }
    if (difficulty !== 'all' && !DIFFICULTIES.includes(difficulty)) { send(res, 400, { error: 'Invalid difficulty.' }, origin); return; }
    if (!Number.isInteger(count) || count < 1 || count > 10) { send(res, 400, { error: 'count must be an integer from 1 to 10.' }, origin); return; }

    const questions = await generate({ topic, difficulty, count });
    send(res, 200, { questions }, origin);
  } catch (err) {
    console.error('Generation failed:', err.message);
    const status = err.status || (err.name === 'TimeoutError' ? 504 : 502);
    send(res, status, { error: status === 504 ? 'The AI service timed out.' : err.status ? err.message : 'Could not generate valid questions. Please try again.' }, origin);
  }
});

server.listen(PORT, () => {
  console.log('CloudQuiz AI backend listening on port ' + PORT + (API_KEY ? '' : ' (no API key set: generation disabled)'));
});
