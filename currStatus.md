# NewsLensAI — Current Status

**Last audited:** 2 September 2026
**Scope:** backend + ingestion only. The frontend is deliberately out of scope for this phase.
**Verification:**
- `cd backend && npm test` → **186 passing, 0 failing**
- `cd ingestion && ./venv/bin/python -m pytest` → **6 passing, 0 failing**

Legend: 🟢 done and verified · 🟡 partial · 🔴 not started

---

## Snapshot

The backend has moved from "prototype with gaps" to a working product core. Personalization is no
longer just a schema — it has APIs, a real recommendation engine, and test coverage. The multi-source
clustering layer is exposed through APIs. The two critical bugs from the last audit (queue path
skipping source ingestion, and missing cache invalidation) are fixed.

The remaining backend gaps are, in priority order: real source political-lean and reliability data,
DB-backed integration tests and CI, containerization and deployment, and scaling source coverage
from 3 adapters toward the 100+ target.

---

## Status by area

| # | Area | Status | Evidence / remaining gap |
|---|------|--------|--------------------------|
| 1–2 | Project understanding, architecture | 🟢 | Clean React / Express / PostgreSQL / Python-ingestion split. |
| 3 | Configuration | 🟢 | **Changed from 🟡.** `config/env.js` validates required vars at boot. `.env.example` now matches what the code actually reads: `MONGO_URI` removed; `DATABASE_URL`, `ELASTICSEARCH_URL`, `NEWS_API_KEY`, `OPENROUTER_API_KEY`, `PYTHON_BIN` added. |
| 4–6 | Errors, controllers, validation | 🟢 | Central error handler, service/controller split, Zod schemas per route. Search query is still hand-validated instead of using the shared validation layer. |
| 7 | Authentication / security | 🟢 | JWT, bcrypt, Helmet, auth + global `/api` rate limiting. No Google OAuth, token rotation/revocation, or account recovery. |
| 8 | API responses | 🟢 | `ApiResponse` used consistently across controllers. |
| 9 | Service / business layer | 🟢 | auth, story, bookmark, search, cache, persistence, cluster, personalization, job services. |
| 10–12 | Database / PostgreSQL / Prisma | 🟢 | Schema, migrations, relationships, unique constraints, integrity checks in place. |
| 13 | DB indexing / optimization | 🟡 | Core indexes exist. Feed ordering by `points` still has no matching composite index; pagination is offset-based. |
| 14 | Redis | 🟢 | Redis clients, cache helpers, BullMQ connection. Operational resilience (reconnect/backoff policy, env validation) still thin. |
| 15 | Elasticsearch | 🟢 | Index creation, per-story indexing, bulk indexing, search API, sync-check script. |
| 16 | Scraping architecture | 🟢 architecture · 🔴 coverage | Registry, validation, normalization, persistence. **3 adapters**: Hacker News, NewsAPI, RSS. Target is 100+ sources. |
| 17 | Background jobs / queues | 🟢 | **Previously critical, now fixed.** The pipeline calls `run_all_sources()` before enrichment, with a regression test asserting sources run first. |
| 18 | AI pipeline | 🟡 | Extraction → OpenRouter summarization → topic classification → clustering → bias stages all exist. No durable per-stage job state, no stage-level dead-letter/retry policy, no live end-to-end verification. |
| 19 | Personalization | 🟢 | **Changed from ⏳.** Schema, 15 APIs, and a real ranking engine. See detail below. |
| 20 | Story clustering | 🟢 backend | **Changed from 🟡.** Clustering, embeddings, persistence, plus `GET /clusters`, `GET /clusters/:id`, `GET /stories/:id/related` with validation and controllers. Live-DB verification still pending. |
| 21 | Bias & reliability | 🟡 | `SourcePoliticalLean` enum (LEFT → RIGHT, UNKNOWN) and `reliabilityScore` exist in schema and are exposed by the cluster API. A per-article word-list tone detector exists. **No AllSides / Ad Fontes data** — repo-wide search found zero references, so lean values are effectively unpopulated. |
| 22 | Caching | 🟢 | **Changed from 🟡.** `storyPersistenceService` invalidates story caches after persistence, closing the stale-feed hole. |
| 23 | Security hardening | 🟡 | Baseline middleware present; production controls incomplete. |
| 24 | Logging / monitoring | 🟡 | Console logs, health endpoint, pipeline timing. No structured logging, metrics backend, tracing, alerting, or error reporting. |
| 25 | Testing | 🟢 unit · 🟡 integration · 🔴 CI | **Changed from 🟡.** Backend: `npm test` runs `node --test`, 186 tests pass, `supertest` route-level tests exist. Ingestion: `pytest` now runs the suite in one command, 6 tests pass. Missing: DB-backed integration tests, coverage reporting, CI pipeline (no `.github/`). |
| 26 | Docker | 🔴 | No Dockerfile or Compose configuration. |
| 27 | AWS deployment | 🔴 | No deployment or IaC configuration. |
| 28 | Production optimization | 🔴 | Not yet a defined stage. |
| 29 | Frontend | — | **Out of scope this phase.** Noted below for context only. |

---

## Personalization detail

### Data model

Present in the Prisma schema with unique constraints and indexes:
`UserPreference`, `UserSourcePreference`, `ReadingHistory`, `StoryFeedback`, `StorySkip`, plus topic
and source relationships.

### API surface

All routes mount under `/api`. Every personalization route sits behind `protect` via
`router.use(protect)` in `routes/personalizationRoutes.js`.

```
GET    /api/feed/personalized          # modes: personalized | latest | trending
GET    /api/me/preferences
PUT    /api/me/preferences

POST   /api/stories/:id/reading        # duration + completion

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

Note: `GET /api/topics` is registered directly in `app.js` *before* the protected router, so it is
public. Reasonable for a public topic list, but it is an inconsistency worth a deliberate decision.

Validation constrains topic preference values to −5 → +5 and restricts feed mode to the three
supported values.

### Recommendation engine

The engine lives in `backend/recommendation/` and is no longer the simple
`topic + source + popularity` sum described in the previous audit:

| Module | Responsibility |
|--------|----------------|
| `signals.js` | Builds a user profile from reads, feedback, skips, bookmarks; classifies reads (completed / long / short / bounce) with time decay. |
| `affinity.js` | Topic and source affinity from explicit preferences blended with behavioural signal. |
| `quality.js` | Source-level quality contribution. |
| `penalties.js` | Already-read suppression that recovers as the read ages; dislike and skip demotion. |
| `normalize.js` | Freshness and popularity normalization, including unknown-popularity fallback. |
| `score.js` | Weighted combination, cold-start blending via signal strength, deterministic tie-breaking. |
| `diversify.js` | Cluster capping so one story cluster cannot dominate the feed. |
| `weights.js` | Central tunable weights. |

Signals now in use: explicit topic preferences, explicit source preferences, reading history as an
independent ranking signal, likes/dislikes, skips, bookmarks, freshness, popularity, source quality,
already-read decay, and cluster importance. Every ranked item carries a full explainability
breakdown (`topicAffinity`, `sourceAffinity`, `popularity`, `penaltyMultiplier`) plus feed-level
`personalization` metadata.

Feed modes: `personalized` runs the engine; `trending` applies popularity × recency with round-robin
cluster diversification; `latest` orders by publication/creation time.

Remaining work here is **tuning against real usage data**, not missing signals.

### Test coverage

```
tests/recommendationSignals.test.js      tests/personalizationRoutes.test.js
tests/recommendationAffinity.test.js     tests/personalizationSourceRoutes.test.js
tests/recommendationScore.test.js        tests/personalizationTopics.test.js
tests/recommendationPenalties.test.js    tests/personalizationFeedback.test.js
tests/recommendationQuality.test.js      tests/personalizationSkip.test.js
tests/recommendationNormalize.test.js    tests/personalizationSourcePreferences.test.js
tests/recommendationDiversify.test.js    tests/personalizationFeedModes.test.js
tests/personalizedFeed.test.js           tests/personalizationCluster.test.js
```

---

## Core loop — what is real

```
Sources (3 adapters — target 100+)        🔴 coverage
      ↓
Ingestion (registry, orchestrator)        🟢
      ↓
Normalize + Deduplicate                   🟢
      ↓
PostgreSQL                                🟢
      ↓
AI Processing                             🟡 no durable stage state
 ┌────┼─────────┐
 ↓    ↓         ↓
Summary Topics  Embedding
              ↓
      Story Clustering                    🟢
              ↓
     Multi-source Story APIs              🟢
              ↓
     Personalization Engine               🟢
              ↓
       Redis Cached Feed                  🟢
              ↓
           React UI                       out of scope
```

The backend pipeline is continuous from ingestion through to a cached, ranked, explainable feed.

---

## Next phases (backend + ingestion)

### Phase A — Bias & Reliability  ← next
```
├── Populate source metadata (lean + reliabilityScore)
├── Ingest AllSides / Ad Fontes ratings
├── Source-level bias API
└── Bias distribution over a user's reading history
```
This is the highest-value remaining work: the schema and API exposure already exist, so the gap is
data plus one endpoint. It also unlocks the product's core differentiator.

### Phase B — Testing & CI
```
├── DB-backed integration tests (Postgres test database)
├── Auth + feed + cluster route integration coverage
├── Ingestion / AI pipeline integration coverage
├── Coverage reporting
└── CI pipeline (GitHub Actions)
```

### Phase C — Containerization & Operations
```
├── Dockerfile (backend, worker, ingestion)
├── Compose: Postgres + Redis + Elasticsearch + worker
├── Structured logging
├── Metrics + error tracking
└── AWS deployment + CI/CD
```

### Phase D — Scale
```
├── Expand RSS source configs toward 100+
├── Cursor pagination
├── Composite index for feed ordering by points
├── Pipeline throughput optimization
└── Load testing
```

RSS is the multiplier for source coverage — reaching 100+ is now largely a configuration exercise
rather than new engineering, which is why it sits last rather than first.

---

## Deferred — not in scope

Explicitly parked until the core backend loop is production-ready:

- Fact-check layer (PolitiFact / Snopes)
- Reading-time tracker and weekly reading report
- Weekly email digest (SendGrid)
- Offline reading and reader-mode caching
- Journalist profiles
- News quiz
- Monetization tiers and the publisher API
- All frontend work, including the multi-source story view, onboarding, and bias UI

---

## Known debt

- ~~`.env.example` is stale~~ — fixed. It now lists every variable the backend and ingestion service actually read, with the boot-time validation rules noted inline.
- `ingestion/config/sources/failing_test.py` is a deliberate fixture, not a leftover — `registry.py` imports it into `SOURCES` to exercise source-failure isolation. It is guarded by `enabled: False`, so `get_active_sources()` never returns it. Still worth questioning: a test fixture that raises on call sits in the production source registry, protected only by one flag.
- `ingestion/scripts/` holds 18 `test_*.py` files that are manual `main()` scripts, not automated tests. Some hit live APIs or a real database. `pytest.ini` scopes collection to `tests/` so they are never auto-run, but the naming stays misleading.
- Feed ordering by `points` has no matching composite index.
- Pagination is offset-based throughout.
- Search query validation bypasses the shared Zod layer.
- No durable per-stage state or dead-letter policy in the AI pipeline.
- `backend/recommendation/` and the seven `recommendation*.test.js` files are **untracked in git** — the engine is not yet committed.
