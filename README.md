# NewsLensAI

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-5FA04E?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![Python](https://img.shields.io/badge/Python_3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite_8-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
<br />
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma_7-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![OpenSearch](https://img.shields.io/badge/OpenSearch-005EB8?style=for-the-badge&logo=opensearch&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=black)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

<p align="center">
  <strong>An AI-powered news intelligence and multi-perspective story clustering platform.</strong>
</p>

</div>

---

NewsLensAI ingests news articles across multiple external sources, enriches them through an asynchronous AI pipeline (summarization, structured entity extraction, topic classification, embedding-based story clustering, and bias signals), and serves an explainable, personalized briefing over low-latency REST APIs.

The core differentiator is **story clustering**: rather than presenting a disjointed list of duplicate headlines, articles covering the same event are grouped into connected clusters. Readers can evaluate coverage of identical events across competing outlets with transparent bias and reliability signals.

> **Status:** Full-stack operational. The backend API, queue worker, and Python AI pipeline are containerized via a single hybrid Docker container running on **Render**. Primary relational storage is provisioned via **Neon PostgreSQL**, real-time caching and task orchestration via **Redis Cloud (BullMQ)**, search indexing via **Bonsai OpenSearch**, and the client single-page application is hosted on **Vercel**.

---

## Architecture Overview

Sources (Hacker News · NewsAPI · RSS Feeds)
│
▼
Python Ingestion & Processing
(Source Orchestrator · Failure Isolation · Rate Pacing)
│
▼
Normalize → Validate → Deduplicate
│
▼
PostgreSQL (Prisma 7 Schema & Relations)
│
▼
AI Enrichment Pipeline
├── Content Extraction & Parsing
├── LLM Summarization & Entity Extraction (Gemini / OpenRouter)
├── Topic Classification
├── Vector Embeddings → Story Clustering
└── Source Bias & Perspective Analysis
│
▼
Node.js / Express API
├── Explainable Personalization & Recommendation Engine
├── Background Queue Processing (BullMQ + node-cron)
└── Synchronized Search Indexing
│                     │
▼                     ▼
Redis Cloud Cache    OpenSearch / Bonsai
│                     │
└──────────┬──────────┘
▼
React 19 Frontend (Vite)
(TanStack Query · Tailwind CSS 4 · AppShell UI)


Ingestion runs as an isolated background workload to keep scraping overhead, external API timeouts, and heavy LLM extraction from blocking the web request path. Job handoff and scheduling are driven by **BullMQ**, automated background **node-cron** intervals, and direct queue workers.

---

## Tech Stack

| Domain | Technologies |
|---|---|
| **API & Backend** | Node.js 22, Express 5, Prisma ORM 7, BullMQ, `node-cron`, JWT, bcrypt, Helmet, Zod |
| **Search & Caching** | OpenSearch (`@opensearch-project/opensearch`), Redis Cloud (`ioredis` with `noeviction`) |
| **Ingestion & AI** | Python 3.11+, BeautifulSoup4, Requests, Sentence-Transformers, Google Gemini API / OpenRouter |
| **Database** | PostgreSQL (Neon serverless) |
| **Frontend** | React 19, Vite 8, React Router 7, TanStack Query, Tailwind CSS 4, Axios, Lucide Icons |
| **Infrastructure** | Root Dockerfile (`node:22-bookworm`), Render (API & Worker), Vercel (SPA) |

---

## Repository Structure

├── backend/
│   ├── config/              # Environment schema & validation
│   ├── controllers/         # Request handling logic
│   ├── middleware/          # Auth, CORS, rate limits, error boundary
│   ├── prisma/              # Schema definitions and SQL migrations
│   ├── queues/              # BullMQ queue definitions and Redis connections
│   ├── recommendation/      # Behavioral ranking & diversification engine
│   ├── routes/              # Versioned API routes
│   ├── services/            # Database transactions, search & cache services
│   ├── utils/               # Prisma, Redis, and OpenSearch singletons
│   └── workers/             # Ingestion queue execution processes
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios instance & React Query hooks
│   │   ├── components/      # UI components, cards, navigation shells
│   │   ├── context/         # Auth, theme, and application state
│   │   ├── pages/           # Feed, Clusters, Bookmarks, Topics, Settings
│   │   └── Router.jsx       # Client routing definitions
├── ingestion/
│   ├── ai/                  # LLM providers (Gemini, OpenRouter) & prompt routers
│   ├── clustering/          # Embedding generation & cosine grouping
│   ├── config/sources/      # Source registries & scrapers (HN, RSS, NewsAPI)
│   ├── persistence/         # Direct database repositories
│   └── run_pipeline.py      # Main pipeline entrypoint
├── Dockerfile               # Production multi-runtime image (Node + Python)
├── METRICS.md               # Pipeline benchmarks and performance profiling
└── UpGradeProject.md        # Feature roadmap and tracking


---

## Getting Started

### Local Prerequisites
- Node.js `20.x` or `22.x`
- Python `3.11+`
- Local or managed instances of **PostgreSQL**, **Redis**, and **OpenSearch / Elasticsearch**

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env

# Run database migrations and generate Prisma client
npx prisma migrate deploy
npx prisma generate

# Seed OpenSearch stories index
node scripts/indexStories.js

npm run dev

2. Ingestion Engine Setup

cd ingestion
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run an initial manual ingestion pass
python run_pipeline.py

3. Frontend Setup

cd frontend
npm install
npm run dev

Environment Variables

Backend Configuration (backend/.env)

NODE_ENV=production
PORT=5001

# Primary Database
DATABASE_URL="postgresql://<user>:<password>@<neon-host>/<db>?sslmode=require"

# Cache and Task Queues (Redis Cloud instance must have `noeviction` configured)
REDIS_URL="rediss://:<password>@<redis-cloud-host>:<port>"

# Search Engine (Bonsai or OpenSearch compatible)
ELASTICSEARCH_URL="https://<user>:<password>@<bonsai-host>.bonsaisearch.net"

# Client CORS Configuration
CLIENT_URL="[https://newslens-ai-gamma.vercel.app](https://newslens-ai-gamma.vercel.app)"

# Security & Tokens
JWT_SECRET="generate-a-secure-random-32-character-secret"
JWT_ISSUER="newslens-api"
JWT_AUDIENCE="newslens-web"
JWT_EXPIRES_IN="7d"
BCRYPT_ROUNDS=12

# AI Ingestion Pipeline Configuration
AI_PROVIDER="gemini"                   # Options: gemini | openrouter
GEMINI_API_KEY="your-api-key"
GEMINI_MODEL="gemini-2.5-flash"
NEWS_API_KEY="your-newsapi-key"
OPENROUTER_API_KEY="optional-openrouter-key"

# Path to Python Virtual Environment (used by the queue runner)
PYTHON_BIN="/app/ingestion/venv/bin/python3"

Frontend Configuration (frontend/.env)

VITE_API_URL="[https://newslensai-backend.onrender.com/api](https://newslensai-backend.onrender.com/api)"


## Recommendation & Ranking Engine

The feed ranking engine located at `backend/recommendation/` rejects static chronological sorts in favor of a weighted behavioral heuristic:

| **Module**     | **Functionality**                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------------------------- |
| `signals.js`   | Parses dwell time, completion ratios, skips, and bookmarks; applies exponential time-decay to historical engagements. |
| `affinity.js`  | Calculates affinity matrices across topics and publisher sources based on direct preferences and implicit clicks.     |
| `quality.js`   | Injects publisher credibility weighting and foundational scoring.                                                     |
| `penalties.js` | Progressively demotes consumed articles (recovering over time) while heavily penalizing explicit skips and dislikes.  |
| `normalize.js` | Normalizes recency, popularity thresholds, and cold-start fallback parameters.                                        |
| `score.js`     | Generates final hybrid composite scores alongside transparency metadata.                                              |
| `diversify.js` | Enforces cluster capping to prevent high-volume stories from flooding user feeds.                                     |

## Deployment Workflow

### Backend & Ingestion (Render Web Service)

1. Hosted as a **Docker Web Service** using the root `Dockerfile`.
2. Debian Bookworm base guarantees support for both Node.js runtime and Python venv libraries.
3. Automated ingestion triggers run immediately upon boot and continue every 30 minutes via `node-cron` without requiring external scheduler endpoints.

### Frontend (Vercel)

1. Root directory configured to `frontend`.
2. Framework preset: **Vite**.
3. Output directory: `dist`.
4. Production environment variables configured to point `VITE_API_URL` to the Render backend domain.

## License

Distributed under the MIT License.
