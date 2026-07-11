<p align="center">
  <img src="public/logo-wordmark.svg" alt="Miku — AniList Android Client" width="300" />
</p>

<p align="center">
  <strong>A high-performance, unofficial AniList client for Android</strong><br/>
  Built with Ionic + Vue 3 + TypeScript · Material mode · Neon Ink design system
</p>

---

## Features

- **Cache-first data layer** — normalized GraphQL cache backed by IndexedDB; instant cold-start restores
- **Request coalescing** — identical in-flight queries deduplicate to a single network call
- **Optimistic mutations** — list edits (progress, score, status) apply immediately with automatic rollback on failure
- **60fps motion budget** — physics springs, shared-element FLIP transitions, staggered hero reveals; all transform/opacity only
- **Dark-first design** — "Neon Ink" system: ink-black base, coral `#FF4D6D` accent, Bricolage Grotesque + Hanken Grotesk + Departure Mono type stack
- **Gesture navigation** — swipe-back, elastic pull-to-refresh, drag-dismiss bottom sheets
- **Rate-limit aware** — serialized write scheduler respects AniList API limits
- **Responsive** — adapts from 320px phones to 768px+ tablets; safe-area aware; 44dp touch targets

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Ionic 8 + Vue 3 (Composition API, `<script setup>`) |
| Language | TypeScript (strict) |
| State | Pinia (normalized stores per domain) |
| Transport | AniList GraphQL API (typed documents) |
| Cache | In-memory LRU Map + IndexedDB (`idb-keyval`) |
| Build | Vite 5 |
| Native | Capacitor 6 (Android target) |
| Testing | Vitest (unit) + Cypress (e2e, planned) |

## Architecture

```
UI Layer (Ionic Vue pages + components)
        │ calls
Domain Layer (Pinia stores: media, list, user, social, auth, ui)
        │ reads/writes
Data Layer (repositories → GraphQL client + coalescer + normalized cache + sync scheduler)
        │ HTTPS
AniList GraphQL API
```

Key invariants:
- UI never talks to the network directly; it calls store actions
- Stores never know about HTTP; they call repository methods
- The repository owns caching, coalescing, and revalidation
- All mutations are optimistic with rollback on failure

## Project Structure

```
Miku/
├── public/                  Static assets (logo SVGs)
├── src/
│   ├── main.ts              Entry point
│   ├── App.vue              Root shell
│   ├── router/              Vue Router (lazy page routes)
│   ├── layouts/             TabsLayout (bottom nav)
│   ├── pages/               Home, Search, MediaDetail, MyList, Social, Profile, Login
│   ├── components/
│   │   ├── common/          AppBar, VirtualScroller, SkeletonBlock, EmptyState
│   │   ├── media/           MediaCard, MediaGrid, ScoreRing, StatusChip
│   │   ├── list/            ListRow, ListEditorSheet, ProgressStepper
│   │   ├── social/          ActivityItem, ThreadCard
│   │   └── gesture/         SwipeableCard, PullRefresh
│   ├── composables/         useFps, useHaptics, useGesture, useInfiniteScroll
│   ├── directives/          vSharedElement, vLongPress, vParallax
│   ├── stores/              Pinia: media, list, user, social, auth, ui
│   ├── data/
│   │   ├── graphql/         Client, documents (typed queries)
│   │   ├── auth/            PKCE flow, token storage
│   │   ├── cache/           NormalizedCache (LRU + IndexedDB), coalescer
│   │   ├── repositories/    media, list, user, social
│   │   └── sunc/            SyncScheduler (rate-limit batching)
│   ├── types/               AniList TypeScript types
│   └── theme/               Neon Ink CSS variables
├── tests/
│   └── unit/                Vitest specs (client, cache, stores)
├── docs/compose/            Roadmap, task plans, design system
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- An AniList app registration (for OAuth client ID)

### Install

```bash
git clone <repo-url> Miku
cd Miku
npm install
```

### Development

```bash
npm run dev        # Vite dev server at localhost:5173
npm run typecheck  # vue-tsc strict
npm run test:unit  # Vitest
```

### Environment Variables

Create `.env`:

```
VITE_ANILIST_CLIENT_ID=your_client_id
VITE_ANILIST_REDIRECT=miku://auth
```

### Build

```bash
npm run build      # typecheck + production build → dist/
```

### Android (Capacitor)

```bash
npx cap add android
npx cap sync
npx cap open android   # opens Android Studio
```

## Design System

Miku uses the **Neon Ink** design system — defined in `docs/compose/specs/2026-07-11-miku-design-system.md`.

**Palette:**
| Token | Value | Use |
|-------|-------|-----|
| `--bg-base` | `#0C0A0F` | Page background |
| `--bg-surface` | `#15121B` | Cards, sheets |
| `--accent` | `#FF4D6D` | Primary coral |
| `--aurora-1/2` | coral → periwinkle | Hero gradients only |

**Typography:**
| Role | Font | Weight |
|------|------|--------|
| Display | Bricolage Grotesque | 700–800 |
| Body | Hanken Grotesk | 400–500 |
| Stats/numbers | Departure Mono | 400 |

**Motion:** Spring easing (`cubic-bezier(.34,1.56,.64,1)`), `transform`/`opacity` only, `prefers-reduced-motion` respected.

## Testing

```bash
npm run test:unit    # 16 unit tests (client, cache, coalescer, stores)
```

Tests cover:
- GraphQL client error mapping (429 → RateLimitError, schema errors)
- Request coalescing (identical in-flight dedup)
- Normalized cache persistence + LRU eviction
- Optimistic mutation rollback on failure
- UI store density/motion toggles

## Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | Done | Scaffold, Ionic md mode, Neon Ink theme, router, stores |
| Phase 2 | Done | GraphQL client, cache, auth PKCE, repositories, stores |
| Phase 3 | Done | Core UI (Home, Search, Detail, MyList, Social, Profile) |
| Phase 4 | Done | Perf budget, gestures, motion, density toggle |

**Planned:**
- Cypress e2e tests + 60fps perf gate
- Web Worker normalization for heavy batches
- Push notifications for list updates
- Android native splash screen + app icon

## License

Unofficial — not affiliated with AniList. Respect AniList API terms of service.
