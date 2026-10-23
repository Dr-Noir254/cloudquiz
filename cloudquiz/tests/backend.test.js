/*
 * Dev-only backend test using a mock "AI" upstream. No real API key or network needed.
 * Run: node tests/backend.test.js
 */
'use strict';
const http = require('node:http');
const path = require('node:path');
const { spawn } = require('node:child_process');

let passed = 0;
let failed = 0;
const check = (name, ok, detail) => { if (ok) { passed += 1; console.log('  ok   ' + name); } else { failed += 1; console.log('  FAIL ' + name + (detail ? ' -> ' + detail : '')); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function request(port, method, urlPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? null : typeof body === 'string' ? body : JSON.stringify(body);
    const req = http.request({ port, method, path: urlPath, headers: Object.assign({ 'Content-Type': 'application/json' }, headers) }, (res) => {
      let text = '';
      res.on('data', (c) => { text += c; });
      res.on('end', () => { let json = null; try { json = JSON.parse(text); } catch (e) { /* not json */ } resolve({ status: res.statusCode, json, headers: res.headers }); });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function startServer(env) {
  const child = spawn(process.execPath, [path.join(__dirname, '..', 'backend', 'server.js')], { env: Object.assign({}, process.env, env), stdio: 'ignore' });
  return child;
}

(async function main() {
  let upstreamHits = 0;
  let lastUpstream = null;
  let mode = 'ok';
  const question = { topic: 'cloud', difficulty: 'beginner', question: 'Which model charges only for what you use?', options: ['Consumption-based', 'Fixed', 'Prepaid hardware', 'Per employee'], answer: 0, explanation: 'You pay for usage.', whyWrong: ['', 'a', 'b', 'c'], hint: 'Utility bill' };
  const upstream = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      upstreamHits += 1;
      lastUpstream = { headers: req.headers, body: JSON.parse(raw) };
      if (mode === 'error') { res.writeHead(500); res.end('{}'); return; }
      const text = mode === 'prose'
        ? 'Sure! Here you go:\n```json\n' + JSON.stringify({ questions: [question] }) + '\n```'
        : mode === 'garbage' ? 'I could not do that.' : JSON.stringify({ questions: [question] });
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ content: [{ type: 'text', text }] }));
    });
  });
  await new Promise((r) => upstream.listen(9911, r));

  const withKey = startServer({ PORT: '8788', ANTHROPIC_API_KEY: 'test-key', ANTHROPIC_API_URL: 'http://localhost:9911', ALLOWED_ORIGIN: 'http://localhost:8000' });
  const noKey = startServer({ PORT: '8789', ANTHROPIC_API_KEY: '', ALLOWED_ORIGIN: 'http://localhost:8000' });
  await sleep(700);
  const origin = { Origin: 'http://localhost:8000' };

  try {
    console.log('Backend with key');
    let r = await request(8788, 'GET', '/health', undefined, origin);
    check('health ok + aiConfigured', r.status === 200 && r.json.aiConfigured === true);
    check('CORS header for allowed origin', r.headers['access-control-allow-origin'] === 'http://localhost:8000');
    r = await request(8788, 'OPTIONS', '/api/generate', undefined, Object.assign({ 'Access-Control-Request-Method': 'POST' }, origin));
    check('preflight 204', r.status === 204);

    r = await request(8788, 'POST', '/api/generate', { topic: 'cloud', difficulty: 'beginner', count: 1 }, origin);
    check('valid request returns questions', r.status === 200 && Array.isArray(r.json.questions) && r.json.questions.length === 1);
    check('API key sent upstream in header only', lastUpstream.headers['x-api-key'] === 'test-key' && !JSON.stringify(r.json).includes('test-key'));
    check('system prompt requires original, valid JSON', /ORIGINAL/.test(lastUpstream.body.system) && /ONLY a JSON object/.test(lastUpstream.body.system));
    check('user prompt carries topic/difficulty/count', /Write 1 original/.test(lastUpstream.body.messages[0].content) && /Cloud Concepts/.test(lastUpstream.body.messages[0].content));

    mode = 'prose';
    r = await request(8788, 'POST', '/api/generate', { topic: 'all', difficulty: 'all', count: 3 }, origin);
    check('JSON extracted from fenced/prose reply', r.status === 200 && r.json.questions.length === 1);

    mode = 'garbage';
    r = await request(8788, 'POST', '/api/generate', { topic: 'all', difficulty: 'all', count: 3 }, origin);
    check('non-JSON model reply -> 502 with safe message', r.status === 502 && /try again/i.test(r.json.error));
    mode = 'error';
    r = await request(8788, 'POST', '/api/generate', { topic: 'all', difficulty: 'all', count: 3 }, origin);
    check('upstream error -> 502', r.status === 502);
    mode = 'ok';

    const before = upstreamHits;
    r = await request(8788, 'POST', '/api/generate', { topic: 'nope', difficulty: 'all', count: 3 }, origin);
    check('invalid topic -> 400', r.status === 400);
    r = await request(8788, 'POST', '/api/generate', { topic: 'all', difficulty: 'x', count: 3 }, origin);
    check('invalid difficulty -> 400', r.status === 400);
    r = await request(8788, 'POST', '/api/generate', { topic: 'all', difficulty: 'all', count: 99 }, origin);
    check('count above cap -> 400', r.status === 400);
    r = await request(8788, 'POST', '/api/generate', 'not json', origin);
    check('bad JSON body -> 400', r.status === 400);
    r = await request(8788, 'POST', '/api/generate', 'x'.repeat(10000), origin);
    check('oversized body rejected with 413', r.status === 413, String(r.status));
    r = await request(8788, 'POST', '/api/generate', { topic: 'all', difficulty: 'all', count: 3 }, { Origin: 'http://evil.example' });
    check('disallowed origin -> 403, no CORS header', r.status === 403 && !r.headers['access-control-allow-origin']);
    check('rejected requests never reached upstream', upstreamHits === before);
    r = await request(8788, 'GET', '/nope', undefined, origin);
    check('unknown route 404', r.status === 404);

    console.log('Backend without key');
    r = await request(8789, 'GET', '/health', undefined, origin);
    check('health reports not configured', r.json.aiConfigured === false);
    r = await request(8789, 'POST', '/api/generate', { topic: 'all', difficulty: 'all', count: 2 }, origin);
    check('generate -> 503 with helpful message', r.status === 503 && /ANTHROPIC_API_KEY/.test(r.json.error));

    console.log('Rate limit');
    let limited = false;
    for (let i = 0; i < 14; i += 1) {
      r = await request(8788, 'POST', '/api/generate', { topic: 'cloud', difficulty: 'beginner', count: 1 }, origin);
      if (r.status === 429) limited = true;
    }
    check('rate limit returns 429 after burst', limited);
  } finally {
    withKey.kill(); noKey.kill(); upstream.close();
  }
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch((err) => { console.error(err); process.exit(2); });
