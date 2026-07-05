# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

YuNi Stellar Chart is a Next.js 15 (App Router) app that fetches and ranks YouTube videos for a single channel (Vsinger YuNi), with an optional RAG-powered chatbot. It's a package-manager-agnostic Next.js project using `pnpm` (lockfile present) with `next.config.mjs` deliberately ignoring ESLint/TypeScript errors during build (`ignoreDuringBuilds` / `ignoreBuildErrors`) and using unoptimized images — this is a v0.dev-scaffolded project.

## Commands

```bash
pnpm dev              # start dev server (localhost:3000)
pnpm build            # production build
pnpm start            # run production build
pnpm lint             # next lint

pnpm index-videos     # index video data into Upstash Vector DB (scripts/index-videos.ts)
pnpm validate-index   # validate/clean Vector DB data (scripts/validate-index.ts)
```

There is no test runner configured in this repo (no `test` script, no test files).

### Required environment variables (`.env.local`)

- `YOUTUBE_API_KEY`, `YOUTUBE_CHANNEL_ID` — required for core video-ranking functionality.
- `ENABLE_CHATBOT`, `GROQ_API_KEY` — chatbot feature (currently under construction / disabled by default logic, see below).
- `GEMINI_API_KEY`, `UPSTASH_VECTOR_REST_URL`, `UPSTASH_VECTOR_REST_TOKEN` — RAG feature backing the chatbot.
- `ADMIN_API_KEY` — admin-only functionality.
- `SHOW_HERO_SECTION` — toggles the hero section (default true).
- `DEBUG_MODE` — enables verbose logging in non-dev environments (see `lib/utils.ts`).

## Architecture

### Data flow: YouTube → Server Actions → UI

1. `lib/youtube.ts` — all direct YouTube Data API v3 calls live here (`getChannelVideos`, formatting helpers). Notably, Shorts detection works by issuing a `HEAD` request to `https://www.youtube.com/shorts/{id}` with `redirect: "manual"` and checking whether YouTube redirects to a `/watch` URL; title text containing `#shorts`/`#short` is a backup signal. This is fragile against YouTube behavior changes — if Shorts misclassification bugs appear, check this logic first.
2. `app/actions.ts` — Server Actions (`"use server"`) wrap `lib/youtube.ts` with an in-memory cache (`cachedData`, 1-hour TTL via `CACHE_DURATION`). `fetchYuNiVideosWithCache()` is the primary entry point used by pages; `refreshVideoData()` clears the cache and calls `revalidatePath("/")` for the manual refresh button. Because the cache is a module-level variable, it is per-server-instance (not shared across serverless invocations/regions).
3. `app/page.tsx` sets `export const revalidate = 3600` (ISR) on top of the in-memory cache — two layers of caching are active simultaneously.
4. `components/video-ranking.tsx` (~800 lines) is the main client component: search, year/content-type filtering, sort (by view/like/comment count or published date, asc/desc), grid/list view, and pagination-by-limit. All filtering/sorting is done client-side in memory over the full initial video set — there's no server-side pagination.

### Chatbot / RAG pipeline (feature flagged, marked "under construction" in README)

- `app/api/chat/route.ts` — API route; gates on `isChatbotEnabled()` (`ENABLE_CHATBOT !== 'false'` AND `GROQ_API_KEY` present).
- `lib/groq.ts` — classifies each user message into `statistical | search | recent | general` via regex heuristics (`analyzeQueryType`), then decides how to source video context — either through RAG search or by passing recent/full video data — before calling Groq's Llama model.
- `lib/vector-db.ts` — wraps Upstash Vector + Google Gemini (`text-embedding-004`) embeddings. Each video is indexed as **two separate vectors**: a "general" one (title/description/date, for semantic search) and a "statistical" one (adds rounded view/like/comment counts, filtered via `searchType = 'statistical'`). A special `__last_update_timestamp__` vector tracks last reindex time; indexing is skipped unless `FORCE_UPDATE=true` or more than `UPDATE_INTERVAL_HOURS` (1h) has passed since last index. All of `indexVideos`/`searchVideos`/`searchVideosForStats` no-op gracefully (return `[]`/skip) if Gemini/Upstash env vars are absent, so the rest of the app functions without RAG configured.
- `scripts/index-videos.ts` / `scripts/validate-index.ts` are standalone `tsx` scripts (not part of the Next.js request lifecycle) for populating/validating the Vector DB — run manually, not on a schedule from within the app.

### Internationalization

- `lib/language-context.tsx` implements i18n via a hand-rolled React Context (`LanguageProvider`/`useLanguage`), not a library like `next-intl`. Supports `ja | en | zh | ko`, persisted to `localStorage`, defaults to `ja`. All UI strings live in the `translations` object in this one file — when adding user-facing text, add a key to all four locales here rather than hardcoding strings in components.
- `formatDate`/`formatLargeNumber` in `lib/youtube.ts` are locale- and timezone-aware (JST for `ja`, UTC otherwise) and should be used instead of ad hoc `Date` formatting.

### UI component structure

- `components/ui/` — shadcn/ui primitives (Radix-based), configured via `components.json` (aliases: `@/components`, `@/lib`, `@/hooks`, style `default`, baseColor `neutral`).
- `components/backgrounds/`, `components/music/` — decorative Canvas/CSS animations for the neon/music-themed UI; these are performance-sensitive (FPS capped and reduced on mobile/low-end devices, see README's "パフォーマンス最適化" section) — avoid adding uncapped `requestAnimationFrame` loops here.
- `components/cards/neon-video-card.tsx`, `components/neon/neon-text.tsx` — themed presentational components used by `video-ranking.tsx`.
- Path alias `@/*` maps to repo root (see `tsconfig.json`).

### Logging

Use `debugLog`/`debugError`/`debugWarn` from `lib/utils.ts` instead of raw `console.*` — they're gated behind `isDebugMode` (`NODE_ENV === 'development'` or `DEBUG_MODE === 'true'`), so logs don't leak into production output unless explicitly enabled.
