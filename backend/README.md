# CloudQuiz AI backend (optional)

A tiny dependency-free Node.js (v18+) server that lets the static web app generate AI practice questions **without exposing an API key in the browser**. CloudQuiz works fully without it.

## Endpoints

| Method | Path            | Purpose |
| ------ | --------------- | ------- |
| GET    | `/health`       | Returns `{ ok, aiConfigured }`. |
| POST   | `/api/generate` | Body `{ "topic": "all\|cloud\|architecture\|management", "difficulty": "all\|beginner\|intermediate\|advanced", "count": 1-10 }`. Returns `{ "questions": [...] }`. |

The web page validates every returned question again (four options, valid answer index, explanations) and rejects anything malformed.

## Environment variables

| Variable            | Required | Default                                  | Notes |
| ------------------- | -------- | ---------------------------------------- | ----- |
| `ANTHROPIC_API_KEY` | yes      | none                                     | Keep it in the server environment only. Never commit it. |
| `ANTHROPIC_MODEL`   | no       | `claude-sonnet-5-5`                      | Any Messages API model you have access to. |
| `ALLOWED_ORIGIN`    | no       | `http://localhost:8000`                  | Comma-separated list of web page origins allowed by CORS, e.g. `https://yourname.github.io`. |
| `PORT`              | no       | `8787`                                   | |
| `ANTHROPIC_API_URL` | no       | `https://api.anthropic.com/v1/messages`  | For testing with a mock server. |

## Run locally

```bash
cd backend
export ANTHROPIC_API_KEY=your-key-here
export ALLOWED_ORIGIN=http://localhost:8000
node server.js
```

Serve the front end from the project root in another terminal (`python3 -m http.server 8000`), open `http://localhost:8000`, and enter `http://localhost:8787` as the Backend URL on the Practice screen.

## Deploy

Deploy `backend/` to any Node host (Render, Railway, Fly.io, Azure App Service, a VM). Set the environment variables above in the host's secret settings, set `ALLOWED_ORIGIN` to your GitHub Pages origin, and use the deployed `https://` URL as the Backend URL in the app. The front end must use an `https://` backend when it is served over `https://`.

## Safeguards and limits

- Request body capped at 4 KB, `count` capped at 10, in-memory rate limit of 10 requests per minute per address (resets when the server restarts; use a proper limiter for public deployments).
- The key is never sent to the browser and never logged.
- Generated questions are AI output and can contain mistakes; the UI labels them as AI-generated practice material.
