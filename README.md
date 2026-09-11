# NewsLensAI

A news intelligence platform. It ingests articles from multiple sources, enriches them with
an AI pipeline (summarization, topic classification, embedding-based story clustering, bias
signals), and serves a personalized, explainable feed over cached REST APIs.

The distinguishing idea is **story clustering**: rather than presenting a flat list of
headlines, articles covering the same event are grouped, so the same story can be read
across outlets with differing perspectives.

> **Current status:** NewsLensAI is now a full-stack project with an implemented
> Node.js/Express backend, Python ingestion and AI pipeline, and React/Vite frontend.
> Backend and ingestion are the active integration focus; the frontend has completed
> API-response, TanStack Query, and authentication/session alignment, with several
> product surfaces still in progress. A Dockerfile packages the backend and ingestion
> services, while CI/CD and external deployment configuration remain out of scope.
> See [`frontend/readme.md`](frontend/readme.md) for frontend progress,
> [`METRICS.md`](METRICS.md) for the benchmarking plan, and
> [`UpGradeProject.md`](UpGradeProject.md) for the upgrade roadmap.

---

## Architecture

```
Sources (Hacker News · NewsAPI · RSS)
        ↓
Python ingestion — registry + orchestrator, per-source failure isolation
        ↓
Normalize → validate → deduplicate
        ↓
PostgreSQL (Prisma schema + migrations)
        ↓
AI enrichment
   ├── content extraction
   ├── summarization (Gemini default · OpenRouter supported)
   ├── topic classification
   ├── embeddings → story clustering
   └── bias / tone signals
        ↓
Node.js API — stories, clusters, personalization
        ↓
Redis cache  +  Elasticsearch full-text search
        ↓
React frontend (API integration complete; feature completion in progress)
```

Ingestion runs as a separate Python service because scraping and AI enrichment are
asynchronous background workloads. Keeping them off the request path means a slow
external API or a failing scraper cannot degrade user-facing responses. BullMQ and Redis
carry the job handoff between the two.

## Tech stack

**Backend** — Node.js, Express 5, PostgreSQL, Prisma 7, Redis (ioredis), BullMQ,
Elasticsearch, JWT, bcrypt, Helmet, express-rate-limit, Zod. Tests run on the built-in
`node --test` runner with supertest for route-level coverage.

**Ingestion** — Python 3.9+, BeautifulSoup, requests, feed parsing, sentence-transformers
for embeddings, OpenAI-compatible clients for Gemini (default) and OpenRouter, and
psycopg2. Tests run on pytest.

**Frontend** — React 19, React Router 7, Axios, TanStack Query, Context API,
Tailwind CSS 4, and Vite 8.

## Repository layout

```
backend/           Express API, services, recommendation engine, Prisma schema, workers
  recommendation/  ranking engine (signals, affinity, penalties, scoring, diversification)
  tests/           unit + route tests
ingestion/         Python ingestion + AI pipeline
  config/sources/  source registry and per-source adapters
  tests/           automated pytest suite
  scripts/         manual verification scripts (see note below)
frontend/          React client; API integration complete, feature work in progress
Dockerfile         backend + ingestion container image
METRICS.md         benchmarking plan
UpGradeProject.md  upgrade roadmap and planned product work
```

## Getting started

### Prerequisites

PostgreSQL, Redis, and Elasticsearch running locally; Node.js 18+; Python 3.9+.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # then fill in the values below
npx prisma migrate deploy
npx prisma generate
npm run dev
```

### 2. Ingestion

```bash
cd ingestion
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
./venv/bin/python run_pipeline.py
```

The ingestion service reads its configuration from `backend/.env`, so there is a single
env file for the whole system.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

## Environment variables

Backend, in `backend/.env`:

```env
NODE_ENV=development
PORT=5001

DATABASE_URL=postgresql://user:password@localhost:5432/newslens

# Required at boot. Must be at least 32 characters.
JWT_SECRET=
JWT_ISSUER=newslens-api
JWT_AUDIENCE=newslens-web
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# Required at boot. Must be a redis:// or rediss:// URL.
REDIS_URL=redis://localhost:6379

ELASTICSEARCH_URL=http://localhost:9200
CLIENT_URL=http://localhost:5173

# Used by the ingestion service
AI_PROVIDER=gemini                 # gemini (default) or openrouter
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.6-flash
NEWS_API_KEY=
OPENROUTER_API_KEY=

# Interpreter the backend uses to invoke the Python pipeline
PYTHON_BIN=
```

`config/env.js` validates `JWT_SECRET`, `REDIS_URL`, and `BCRYPT_ROUNDS` at startup and
refuses to boot on bad values, so misconfiguration fails immediately rather than at first
request. `NEWS_API_KEY` is validated lazily, which means a Hacker-News-only or
summarization-only run works without a NewsAPI key.

Frontend, in `frontend/.env`:

```env
VITE_API_URL=http://localhost:5001/api
```

## API

All application routes are under `/api` and behind a global rate limiter. Everything
except registration, login, `GET /api/topics`, and `/health` requires a JWT.

**Auth**

```
POST   /api/auth/register
POST   /api/auth/login
```

**Stories, search, bookmarks**

```
GET    /api/stories
GET    /api/stories/:id
GET    /api/stories/search
POST   /api/stories/:id/bookmark
GET    /api/bookmarks
POST   /api/admin/ingestion/run        # admin only
```

**Story clusters** — the multi-source view

```
GET    /api/clusters
GET    /api/clusters/:id
GET    /api/stories/:id/related
```

**Personalization**

```
GET    /api/feed/personalized          # modes: personalized | latest | trending
GET    /api/me/preferences
PUT    /api/me/preferences
POST   /api/stories/:id/reading

GET    /api/topics                     # public
POST   /api/topics/:topicId/follow
DELETE /api/topics/:topicId/follow

POST   /api/stories/:id/feedback       # LIKE | DISLIKE
GET    /api/stories/:id/feedback
DELETE /api/stories/:id/feedback

POST   /api/stories/:id/skip
GET    /api/stories/:id/skip
DELETE /api/stories/:id/skip

GET    /api/me/source-preferences
POST   /api/sources/:sourceId/follow
DELETE /api/sources/:sourceId/follow
```

**Health**

```
GET    /health
```

## Recommendation engine

`backend/recommendation/` ranks the personalized feed. It is not a popularity sort — it
builds a user profile from behaviour and combines weighted signals:

| Module | Responsibility |
|--------|----------------|
| `signals.js` | User profile from reads, feedback, skips, bookmarks; classifies reads (completed / long / short / bounce) with time decay |
| `affinity.js` | Topic and source affinity — explicit preferences blended with behavioural signal |
| `quality.js` | Source-level quality contribution |
| `penalties.js` | Already-read suppression that recovers as the read ages; dislike and skip demotion |
| `normalize.js` | Freshness and popularity normalization, with unknown-popularity fallback |
| `score.js` | Weighted combination, cold-start blending by signal strength, deterministic tie-breaking |
| `diversify.js` | Cluster capping so one story cluster cannot dominate the feed |
| `weights.js` | Central tunable weights |

Every ranked item carries an explainability breakdown — topic affinity, source affinity,
popularity, and the applied penalty multiplier — rather than an opaque score. Cold start is
handled by blending toward popularity when behavioural signal is weak.

Feed modes: `personalized` runs the engine, `trending` applies popularity × recency with
round-robin cluster diversification, `latest` orders by publication time.

## Testing

```bash
cd backend    && npm test                        # 186 tests
cd ingestion  && ./venv/bin/python -m pytest     # 6 tests
```

Both suites pass. Two caveats worth knowing:

- Backend tests run against a **mocked Prisma client**. They verify ranking logic, route
  wiring, and validation — not live PostgreSQL, Redis, or Elasticsearch behaviour.
  DB-backed integration tests are the next testing milestone.
- `ingestion/scripts/` contains files named `test_*.py` that are **manual verification
  scripts, not automated tests** — several make live API calls or connect to a real
  database at import time. `pytest.ini` scopes collection to `tests/` so they are never
  picked up. Run one deliberately with, for example,
  `./venv/bin/python -m scripts.test_newsapi`.

## Adding a news source

Sources are adapters registered in `ingestion/config/sources/registry.py`. Each one
provides a scraper callable and a normalizer that converts the raw response into the common
article schema, so the orchestrator and everything downstream stay source-agnostic. The
registry validates required fields and rejects duplicate slugs at import time, and
`enabled` gates whether a source actually runs.

The orchestrator wraps each source execution independently: a timeout or parse error in one
source is recorded and the run continues with the rest.

Current coverage is 3 adapters — Hacker News, NewsAPI, and RSS. RSS is the multiplier for
reaching broad source coverage, since adding feeds is configuration rather than new code.

## Known gaps

Honest accounting of what is not done, in rough priority order:

- **Source bias data is unpopulated.** The schema has `SourcePoliticalLean` and
  `reliabilityScore`, and the cluster API exposes them, but no AllSides / Ad Fontes ratings
  have been ingested. This is the highest-value remaining work — it unlocks the product's
  core differentiator and the plumbing already exists.
- **No integration tests or CI.** No `.github/` workflows or coverage reporting.
- **Deployment is not production-ready.** A Dockerfile packages the backend and ingestion
  services, but there is no CI/CD, external platform configuration, or documented
  multi-service deployment for PostgreSQL, Redis, Elasticsearch, and the frontend.
- **AI pipeline has no durable per-stage state** or stage-level dead-letter policy.
- **Source coverage is 3 adapters**, against a target of many more.
- **Pagination is still offset-based in core endpoints.** Story, search, cluster, and feed
  flows use page/skip or in-memory slicing; the API's `nextCursor` field is not yet a
  complete cursor-pagination implementation.
- **Observability is console logging only** — no structured logs, metrics backend, tracing,
  or alerting.

## Author

Anadil
