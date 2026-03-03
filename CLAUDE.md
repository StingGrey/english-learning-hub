# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AI English Learning Hub** — A fully-featured, purely front-end static English learning application deployed to GitHub Pages. The learning loop is: RSS reading → word selection & marking → SM-2 spaced repetition review → speaking/writing AI practice → statistics. Single-user, no backend authentication, all data stored in the browser's IndexedDB.

**Target users:** Chinese English learners (中文 UI, 面向中国英语学习者)

---

## Commands

```bash
# Frontend development (run all commands inside frontend/)
cd frontend
npm install          # Install dependencies
npm run dev          # Local dev server at http://localhost:3000
npm run build        # Static export to frontend/out/
npm run lint         # ESLint check

# Backend development (optional, run inside backend/)
cd backend
pip install -r requirements.txt
python main.py       # http://localhost:8000 — API docs at /docs
```

---

## Architecture

**Frontend:** Next.js 14 static export + TypeScript (strict) + Tailwind CSS + Dexie.js (IndexedDB ORM)
**Backend:** FastAPI + SQLAlchemy + SQLite — *optional*, the frontend runs fully independently via its own `api.ts` layer.

### Directory Layout

```
english-learning-hub/
├── .github/workflows/deploy.yml   # GitHub Actions → GitHub Pages CI/CD
├── frontend/
│   ├── next.config.js             # output: "export", basePath: /english-learning-hub
│   ├── tailwind.config.ts         # Swiss style tokens (fonts, accent color)
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx         # Root layout
│   │   │   ├── globals.css        # Swiss style CSS components (.s-card, .s-btn, etc.)
│   │   │   └── (main)/            # Route group — all pages share Sidebar layout
│   │   │       ├── layout.tsx     # Sidebar + content wrapper
│   │   │       ├── page.tsx            # / — Dashboard
│   │   │       ├── plan/page.tsx       # /plan — AI daily plan
│   │   │       ├── discover/page.tsx   # /discover — RSS article browser
│   │   │       ├── reader/page.tsx     # /reader?id=N — Article reader
│   │   │       ├── vocab/page.tsx      # /vocab — SM-2 review queue
│   │   │       ├── wordbook/page.tsx   # /wordbook — Vocabulary books
│   │   │       ├── speaking/page.tsx   # /speaking — Conversation practice
│   │   │       ├── writing/page.tsx    # /writing — Essay evaluation
│   │   │       ├── stats/page.tsx      # /stats — Learning analytics
│   │   │       └── settings/page.tsx   # /settings — API keys & config
│   │   ├── components/
│   │   │   ├── layout/Sidebar.tsx      # Responsive nav (desktop fixed sidebar / mobile top+bottom)
│   │   │   └── reader/SelectionPopup.tsx # Text selection popup for word actions
│   │   ├── lib/
│   │   │   ├── db.ts              # Dexie ORM — 15-table IndexedDB schema (v4)
│   │   │   ├── ai.ts              # All AI capabilities (1000+ lines)
│   │   │   ├── api.ts             # Client-side API layer (700+ lines)
│   │   │   ├── rss.ts             # RSS fetching + content extraction + readability scoring
│   │   │   ├── review.ts          # SM-2 spaced repetition algorithm
│   │   │   └── webdav.ts          # WebDAV multi-device sync
│   │   └── hooks/
│   │       └── useFetch.ts        # Generic data-fetching React hook
├── backend/
│   ├── main.py                    # Uvicorn entry point
│   ├── app.py                     # FastAPI app factory
│   ├── config.py                  # Settings / env vars
│   ├── models/
│   │   ├── database.py            # SQLAlchemy engine & session
│   │   └── tables.py              # ORM table definitions
│   ├── schemas/schemas.py         # Pydantic request/response schemas
│   ├── api/                       # Route handlers (mirrors frontend api.ts namespaces)
│   │   ├── content.py, plan.py, settings.py, speaking.py
│   │   ├── stats.py, translate.py, vocab.py, writing.py
│   ├── services/
│   │   ├── ai_service.py, review_service.py, rss_service.py, scheduler.py
│   └── tests/
├── CLAUDE.md                      # This file
├── README.md                      # User-facing documentation
├── ASSUMPTIONS.md                 # Design constraint decisions
└── swiss-style-soft-prompt.md     # Full Swiss style design specification
```

---

## Core Library Modules (`frontend/src/lib/`)

### `db.ts` — IndexedDB Schema (Dexie v4)

Defines **15 tables** across **4 schema versions**:

| Table | Purpose |
|---|---|
| `UserProfile` | AI config, learning goals, WebDAV credentials |
| `DailyPlan` | Today's generated learning plan |
| `PlanTask` | Individual tasks within a plan |
| `NewsSource` | RSS feed sources |
| `Article` | Fetched articles with metadata & readability score |
| `ArticleSentence` | Sentence-level breakdown with translations |
| `VocabItem` | Words with SM-2 state (interval, ease, repetitions) |
| `VocabReview` | Review history (quality ratings) |
| `SpeakingSession` | Conversation session metadata |
| `SpeakingTurn` | Individual turns in a speaking conversation |
| `WritingSubmission` | Submitted essays |
| `WritingFeedback` | AI evaluation results |
| `StudySession` | Daily learning session tracking |
| `VocabBook` | Custom vocabulary collections |
| `VocabBookWord` | Words within vocab books |

Schema v4 added `fetched_at` index on `Article` and seeded default news sources.

### `ai.ts` — AI Service Abstraction

Supports three API formats, all user-configured in Settings:

- **OpenAI** — standard `Authorization: Bearer <key>` + `/chat/completions`
- **Claude (Anthropic)** — `x-api-key` header
- **Gemini / Vertex AI** — Google Cloud with optional JWT (RS256) auth for Vertex; token cached 1 hour

**Key exported functions:**

| Function | Description |
|---|---|
| `translateText()` | English → Chinese translation |
| `translateSentences()` | Batch sentence translation |
| `explainText()` | Grammar & usage explanation |
| `getWordDefinition()` | Lemma, POS, pronunciation, definitions, examples |
| `generatePlanTasks()` | AI-powered daily study plan generation |
| `generateSummary()` | Article summarization |
| `generateArticleFromWords()` | Create practice article from a word list |
| `speakingReply()` | Conversation partner with error correction |
| `evaluateWriting()` | Essay feedback: grammar, structure, score, improved version |
| `extractWordsFromText()` | Vocabulary extraction from arbitrary text |
| `fetchModels()` | List available models for an API endpoint |
| `testModelConnection()` | Validate API key + endpoint connectivity |

Users can configure separate specialized models for translation and vocabulary tasks.

### `api.ts` — Client-Side API Layer

Bridges UI components with IndexedDB (and optionally the backend). Organized into namespaces that mirror the backend route handlers:

- `api.plan` — task generation & completion
- `api.content` — article fetching, filtering, recommendations
- `api.translate` — text & sentence translation
- `api.vocab` — word marking, SM-2 review, deletion
- `api.speaking` — session & turn management
- `api.writing` — submission & evaluation
- `api.stats` — daily & weekly learning metrics
- `api.settings` — UserProfile CRUD
- `api.vocabBook` — book management & article generation

Key behaviors: lazy sentence translation, content fallback chain (RSS → r.jina.ai → DOM parser), SM-2 scheduling on review completion.

### `rss.ts` — RSS & Content Extraction

- **CORS proxies:** `api.allorigins.win` (primary) → `corsproxy.io` (fallback), 15-second timeout
- **Content extraction:** r.jina.ai reader API for markdown → DOM parser fallback
- **Readability scoring:** Flesch Reading Ease → Easy (≥70) / Medium (40–69) / Hard (<40)
- **Sentence splitting:** regex tokenizer, filters < 10-word sentences
- **RSS parsing:** XML DOM, extracts title/link/description/pubDate/content:encoded

**Default sources (11):** BBC, Reuters, NPR, The Guardian, VOA, AP News, CNN, ABC News, Al Jazeera, Scientific American, TIME.

### `review.ts` — SM-2 Spaced Repetition

Quality scale 0–5 (0 = blackout, 5 = perfect). Algorithm:
- First review → 1 day; second → 6 days; subsequent → `interval × ease_factor`
- Quality ≥ 3: interval increases; quality < 3: reset to 1 day
- **Mastery:** 5+ reviews all with quality ≥ 4

### `webdav.ts` — Multi-Device Sync

Supports Nutstore (坚果云), NextCloud, Synology NAS.

- `testConnection()` — PROPFIND health check
- `backup()` — Save `english-hub-data.json` + timestamped backup to WebDAV
- `restore()` — Restore all 15 tables from WebDAV JSON
- `exportToFile()` / `importFromFile()` — Local JSON download/upload

Export format: version 2 JSON containing all 15 table snapshots.

---

## Route Reference

| Route | Page | Key Features |
|---|---|---|
| `/` | Dashboard | Stats cards, quick actions, recommended articles |
| `/plan` | Daily Plan | AI-generated task list, completion checkboxes |
| `/discover` | RSS Browser | Source list, difficulty filter, topic search, per-source limits |
| `/reader?id=N` | Article Reader | Text selection popup, dual translation, vocab marking |
| `/vocab` | Vocab Review | SM-2 queue, quality rating buttons (0–5) |
| `/wordbook` | Vocab Books | Create books, AI word extraction, bulk add, article generation |
| `/speaking` | Speaking | Multi-scenario AI conversation partner, error correction |
| `/writing` | Writing | Essay submission, AI scoring, grammar/structure feedback |
| `/stats` | Statistics | Daily & 7-day breakdown, task/review completion charts |
| `/settings` | Settings | AI model config, API keys, Vertex AI, WebDAV, data export |

---

## Components

### `Sidebar.tsx`
- **Desktop:** Fixed left sidebar (56px/14rem width), 9 nav items
- **Mobile:** Top navbar (hamburger menu opens full nav) + bottom quick-nav bar
- Active route highlighted; supports dark mode
- Icon set: `lucide-react`

### `SelectionPopup.tsx`
Appears on text selection in the Reader. Provides quick actions: translate, explain, define, add to vocab.

---

## Swiss Style Design Rules (STRICTLY ENFORCED)

Full specification in `swiss-style-soft-prompt.md`. Violations will be rejected.

### Global Enforcement
`globals.css` applies `border-radius: 0 !important` to **every element** — no exceptions.

### Required
- `rounded-none` on all UI elements
- `border-black` / `border-2` borders
- `font-sans` (Helvetica Neue / Inter) for headings and buttons
- `font-mono` (JetBrains Mono) for body text and inputs
- Flat, solid colors only
- Hard-offset shadows: `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`
- Dark mode via `dark:` prefix (system `prefers-color-scheme`)

### Forbidden
- `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-full`
- `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl` (standard Tailwind shadows)
- `bg-gradient-to-*` (any gradient)
- `font-serif`, `italic`
- `border-dashed`, `border-dotted`

### Predefined CSS Component Classes (use these, don't reinvent)

| Class | Usage |
|---|---|
| `.s-card` | Base card: 2px black border, white bg, `p-4 md:p-6` |
| `.s-card-hover` | Card + hard shadow + pink hover shadow + translate on hover |
| `.s-btn` | Primary button: black bg, white text, pink hard shadow |
| `.s-btn-outline` | Secondary button: white bg, black border, black hard shadow |
| `.s-btn-ghost` | Minimal button: no border, gray text |
| `.s-btn-sm` | Small button variant with border |
| `.s-input` | Text input: black border, mono font, pink focus shadow |
| `.s-textarea` | Textarea: extends `.s-input` |
| `.s-label` | Field label: uppercase, tracked, small, gray |
| `.s-tag` | Inline badge: outlined, uppercase |
| `.s-tag-accent` | Accent (pink `#ff006e`) filled badge |
| `.s-tag-filled` | Black filled badge |
| `.s-divider` | 2px black horizontal rule |

### Color Tokens
- **Accent:** `#ff006e` (`bg-accent`, `text-accent`)
- **Dark surfaces:** `zinc-900` (cards), `zinc-950` (page bg)
- **Dark borders/text:** `white` replaces `black`

---

## Data Flow

```
User Action (React Component)
        │
        ▼
  useFetch hook → api.ts (API Layer)
        │
        ├─► Local data  →  Dexie.js  →  Browser IndexedDB
        │
        ├─► AI calls    →  ai.ts  →  OpenAI / Claude / Gemini APIs
        │
        ├─► RSS content →  rss.ts →  CORS proxy → News sites
        │                           └─► r.jina.ai (full text)
        │
        └─► Sync        →  webdav.ts  →  WebDAV server
```

All user data (API keys, vocab, history) stays in the browser. API keys are never sent to any third party.

---

## Deployment

**Trigger:** Push to `main` branch or manual workflow dispatch.

**Pipeline** (`.github/workflows/deploy.yml`):
1. Checkout → Node 20 setup (npm cache)
2. `npm ci` in `frontend/`
3. `next build` → static export to `frontend/out/`
4. Add `.nojekyll` file
5. Upload artifact → deploy to GitHub Pages

**Live URL:** `https://<username>.github.io/english-learning-hub/`
**Base path:** `/english-learning-hub` (set in `next.config.js`)

---

## Key Design Decisions

1. **Pure front-end architecture** — `api.ts` fully implements every backend endpoint locally using IndexedDB. The FastAPI backend is an optional enhancement, not a requirement.

2. **RSS via CORS proxy** — Articles are fetched client-side through `allorigins.win` / `corsproxy.io`. Full text is extracted via r.jina.ai reader, with DOM parsing as a fallback.

3. **Three AI provider formats** — OpenAI-compatible, Anthropic Claude, and Google Gemini/Vertex. All configured at runtime in Settings; model lists are fetched dynamically.

4. **Vertex AI JWT auth** — For Google Cloud Vertex AI, a service account JSON can be uploaded in Settings. JWT tokens are generated in-browser (RS256) and cached for 1 hour.

5. **SM-2 algorithm** — Standard SuperMemo-2 for vocabulary spaced repetition. Mastery requires 5+ reviews with quality ≥ 4.

6. **Flesch readability auto-grading** — RSS articles are automatically scored and tagged Easy/Medium/Hard so users can filter by their level.

7. **WebDAV sync** — Optional multi-device backup via any WebDAV-compatible server (Nutstore, NextCloud, Synology). All 15 database tables are exported as a single JSON file.

8. **Chinese UI** — All interface text is in Chinese. The app targets Chinese English learners specifically.

9. **No rounding** — `border-radius: 0 !important` is set globally in CSS. This is intentional Swiss style and must never be overridden.

10. **mammoth + pdfjs** — The wordbook page can import `.docx` and `.pdf` files for word extraction.

---

## Adding New Features — Checklist

When adding pages or components:

- [ ] Place new pages under `frontend/src/app/(main)/` so they inherit the Sidebar layout
- [ ] Use `"use client"` directive at the top of all interactive components
- [ ] Use only predefined `.s-*` CSS classes for UI elements
- [ ] Never add `rounded-*` classes (enforced globally anyway)
- [ ] Never use standard Tailwind shadows — only `shadow-[4px_4px_0px_0px_rgba(...)]`
- [ ] Support `dark:` variants for all colors
- [ ] Add new data shapes to `db.ts` and increment the schema version with a migration
- [ ] Add corresponding operations to the correct `api.ts` namespace
- [ ] If adding AI functionality, add it to `ai.ts` and respect the existing provider abstraction
- [ ] Test that `npm run build` succeeds (static export, no server-side code)
