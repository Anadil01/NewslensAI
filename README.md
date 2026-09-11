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

**An AI-powered personalized news intelligence platform**

Ingests stories from Hacker News, NewsAPI, and RSS feeds, enriches them
with LLMs and embeddings, clusters related coverage, and delivers a
personalized, diversified feed.
:::

------------------------------------------------------------------------

## ✨ What it does

NewsLensAI is built around a simple pipeline:

**Collect → Clean → Enrich → Cluster → Rank → Personalize → Search**

It combines traditional backend services with an isolated Python
ingestion/AI workload so expensive scraping, NLP, embeddings, and LLM
operations do not block user-facing API requests.

### Highlights

-   📰 **Multi-source ingestion** --- Hacker News, NewsAPI, and RSS
    feeds
-   🤖 **AI enrichment** --- content extraction, summarization, entity
    extraction, and topic classification
-   🧠 **Semantic clustering** --- vector embeddings group stories
    covering the same event
-   🎯 **Behavioral recommendations** --- ranking adapts to reading
    behavior and preferences
-   ⚖️ **Feed diversification** --- cluster caps prevent one story from
    dominating the feed
-   🔎 **Fast search** --- OpenSearch indexing with Redis-backed caching
-   ⚙️ **Background processing** --- BullMQ + Redis Cloud + scheduled
    workers
-   🔐 **Production API** --- JWT authentication, validation, rate
    limiting, CORS, and Helmet
-   🚀 **Cloud deployment** --- Render for backend/ingestion and Vercel
    for the React SPA

------------------------------------------------------------------------

## 🏗️ Architecture

``` mermaid
flowchart TD
    A[News Sources<br/>Hacker News · NewsAPI · RSS] --> B[Python Ingestion]
    B --> C[Normalize · Validate · Deduplicate]
    C --> D[(PostgreSQL)]
    D --> E[AI Enrichment]

    E --> E1[Content Extraction]
    E --> E2[LLM Summary + Entities]
    E --> E3[Topic Classification]
    E --> E4[Vector Embeddings]

    E4 --> F[Story Clustering]
    F --> G[Source Bias + Perspective Analysis]

    G --> H[Node.js / Express API]
    D --> H

    H --> I[Recommendation Engine]
    I --> I1[Behavior Signals]
    I --> I2[Topic / Publisher Affinity]
    I --> I3[Quality Weighting]
    I --> I4[Penalties + Time Decay]
    I --> I5[Diversification]

    H --> J[OpenSearch]
    H --> K[(Redis Cloud)]
    K --> L[BullMQ Workers]

    H --> M[React 19 Frontend]
    M --> N[Feed · Clusters · Topics · Bookmarks · Settings]
```

### Runtime flow

1.  **Sources** provide articles and stories.
2.  **Python ingestion** fetches and normalizes content in the
    background.
3.  **PostgreSQL** stores the canonical application data.
4.  **AI enrichment** extracts useful semantic information from each
    story.
5.  **Embeddings + clustering** identify related coverage.
6.  **Node.js / Express** exposes the application API.
7.  **Recommendation scoring** combines behavioral, quality, recency,
    and affinity signals.
8.  **OpenSearch + Redis** provide fast search and caching.
9.  **React** consumes the API and renders the personalized experience.

> Ingestion is deliberately isolated from the web request path. This
> prevents scraping overhead, external API delays, and heavy AI
> processing from degrading API response times.

------------------------------------------------------------------------

## 🎯 Recommendation & Ranking Engine

The ranking engine in `backend/recommendation/` avoids a simple
chronological feed and instead produces a weighted behavioral score.

  -----------------------------------------------------------------------
  Module                              Responsibility
  ----------------------------------- -----------------------------------
  `signals.js`                        Parses dwell time, completion
                                      ratio, skips, and bookmarks;
                                      applies exponential time decay

  `affinity.js`                       Builds topic and publisher affinity
                                      from explicit preferences and
                                      implicit interactions

  `quality.js`                        Adds publisher credibility and
                                      foundational quality signals

  `penalties.js`                      Demotes consumed stories over time
                                      and strongly penalizes explicit
                                      skips/dislikes

  `normalize.js`                      Normalizes recency, popularity
                                      thresholds, and cold-start
                                      parameters

  `score.js`                          Produces the final hybrid score
                                      together with transparency metadata

  `diversify.js`                      Caps clusters so repeated coverage
                                      does not flood the feed
  -----------------------------------------------------------------------

### Ranking concept

``` text
User behavior
     │
     ├── Dwell time
     ├── Completion
     ├── Bookmarks
     ├── Clicks
     └── Skips / dislikes
             │
             ▼
      Behavioral signals
             │
             ├── Topic affinity
             ├── Publisher affinity
             ├── Quality
             ├── Recency
             └── Consumption penalties
             │
             ▼
       Hybrid score
             │
             ▼
     Cluster diversification
             │
             ▼
       Personalized feed
```

------------------------------------------------------------------------

## 🧰 Tech Stack

  -----------------------------------------------------------------------
  Area                                Technologies
  ----------------------------------- -----------------------------------
  **API & Backend**                   Node.js 22, Express 5, Prisma ORM
                                      7, BullMQ, `node-cron`, JWT,
                                      bcrypt, Helmet, Zod

  **Search & Caching**                OpenSearch, Redis Cloud, `ioredis`,
                                      `node-caching`

  **Ingestion & AI**                  Python 3.11+, BeautifulSoup4,
                                      Requests, Sentence-Transformers,
                                      Google Gemini API, OpenRouter

  **Database**                        PostgreSQL (Neon serverless)

  **Frontend**                        React 19, Vite, TanStack Query,
                                      Tailwind CSS 4, AppShell UI

  **Infrastructure**                  Docker, Debian Bookworm, Render,
                                      Vercel
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 📁 Repository Structure

``` text
NewslensAI/
├── backend/
│   ├── config/             # Environment schema & validation
│   ├── controllers/        # Request handling
│   ├── middleware/         # Auth, CORS, rate limits, error boundary
│   ├── prisma/             # Schema definitions & migrations
│   ├── queues/             # BullMQ queue definitions & Redis connections
│   ├── recommendation/     # Ranking & diversification engine
│   ├── routes/             # Versioned API routes
│   ├── services/           # Database, search & cache services
│   ├── utils/              # Prisma, Redis & OpenSearch singletons
│   └── workers/             # Ingestion queue workers
│
├── frontend/
│   ├── src/
│   │   ├── api/            # Axios + React Query hooks
│   │   ├── components/     # UI components and cards
│   │   ├── context/        # Auth, theme & application state
│   │   ├── pages/          # Feed, Clusters, Bookmarks, Topics, Settings
│   │   └── Router.jsx      # Client-side routing
│
├── ingestion/
│   ├── ai/                 # Gemini / OpenRouter providers
│   ├── clustering/         # Embeddings & cosine grouping
│   ├── config/sources/     # Source registries & scrapers
│   ├── persistence/        # Direct database repositories
│   └── run_pipeline.py     # Main pipeline entry point
│
├── Dockerfile              # Production multi-runtime image
├── METRICS.md              # Pipeline benchmarks & profiling
└── UpGradeProject.md       # Feature roadmap & tracking
```

------------------------------------------------------------------------

## 🔄 Background Processing

Background work is handled through **BullMQ**, **Redis Cloud**, and
scheduled workers.

-   Queue definitions live under `backend/queues/`
-   Queue execution lives under `backend/workers/`
-   `node-cron` triggers recurring ingestion jobs
-   Heavy Python/AI work stays outside the synchronous API path
-   Redis provides the queue/cache layer
-   OpenSearch receives synchronized search indexes

This separation makes the application easier to scale because API
traffic and ingestion workloads can be handled independently.

------------------------------------------------------------------------

## 🚀 Deployment

### Backend & ingestion --- Render

The backend is deployed as a Docker Web Service using the root
`Dockerfile`.

-   **Base:** Debian Bookworm
-   **Runtime:** Node.js + Python virtual environment
-   **API:** Express
-   **Workers:** BullMQ / background ingestion
-   **Scheduling:** `node-cron`
-   **Database:** PostgreSQL / Neon
-   **Cache & queues:** Redis Cloud

The ingestion schedule runs automatically after startup and continues on
the configured recurring interval.

### Frontend --- Vercel

The frontend is deployed separately as a Vite application.

  Setting             Value
  ------------------- ---------------------------------
  Root directory      `frontend`
  Framework           Vite
  Build output        `dist`
  API configuration   `VITE_API_URL` → Render backend

------------------------------------------------------------------------

## 🛠️ Getting Started

### Prerequisites

Install:

-   Node.js **20.x or 22.x**
-   Python **3.11+**
-   PostgreSQL
-   Redis
-   OpenSearch / Elasticsearch-compatible search service

### 1. Clone the repository

``` bash
git clone <your-repository-url>
cd NewslensAI
```

### 2. Configure the backend

Create the backend environment file required by the project's
configuration schema, then provide your PostgreSQL, Redis, OpenSearch,
authentication, and AI provider settings.

``` bash
cd backend
npm install
```

### 3. Prepare the database

Run the Prisma workflow required by your environment, for example:

``` bash
npx prisma generate
npx prisma migrate dev
```

### 4. Install Python dependencies

``` bash
cd ../ingestion
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 5. Start the frontend

``` bash
cd ../frontend
npm install
npm run dev
```

> The exact environment variable names and production commands should
> follow the project's `.env.example`, package scripts, and deployment
> configuration.

------------------------------------------------------------------------

## 📊 Performance & Observability

Pipeline benchmarks and profiling notes are maintained in:

``` text
METRICS.md
```

Use this document to track ingestion throughput, processing bottlenecks,
and performance improvements as the pipeline evolves.

------------------------------------------------------------------------

## 🧩 Design Principles

### 1. Personalization over chronology

The feed should reflect what a reader finds useful, not simply what was
published most recently.

### 2. Semantic understanding

Stories are enriched with topics, entities, summaries, and embeddings
before recommendation decisions are made.

### 3. Diversity by design

Related stories are clustered and capped so the feed can represent
multiple events and perspectives.

### 4. Explainable ranking

The ranking pipeline keeps transparency metadata alongside composite
scores, making recommendation behavior easier to inspect and improve.

### 5. Async-first ingestion

Scraping, external APIs, embeddings, and LLM calls are isolated from
user-facing request handling.

------------------------------------------------------------------------

## 📌 Project Status

NewsLensAI is an actively evolving project. The feature roadmap and
ongoing improvements are tracked in:

``` text
UpGradeProject.md
```

------------------------------------------------------------------------

## 📄 License

Distributed under the **MIT License**.
