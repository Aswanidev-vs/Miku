<p align="center">
  <img src="logo.png" alt="Miku Logo" width="150" height="150" style="border-radius: 100%;">   
</p>

<h1 align="center">Miku</h1>

<p align="center">
  <strong>A premium AniList client for Android & Desktop built with Wails 3</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Wails-3.0-blue?logo=wails" alt="Wails 3">
  <img src="https://img.shields.io/badge/Vue-3.4-brightgreen?logo=vue.js" alt="Vue 3">
  <img src="https://img.shields.io/badge/Go-1.25-00ADD8?logo=go" alt="Go">
  <img src="https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="License">
</p>

---

## About

Miku is a feature-rich AniList client that delivers a premium anime and manga tracking experience on Android and Desktop. Built with Wails 3, it combines a Go backend for OAuth2 authentication with a Vue 3 frontend featuring a custom dark anime-inspired design language with cherry blossom motifs.

## Features

### Core Features
- **OAuth2 Authentication** — Secure login via AniList's OAuth2 flow with localhost callback (works on desktop and Android)
- **Trending & Discovery** — Browse trending, popular, seasonal anime, and top manga
- **Advanced Search** — Full-text search with anime/manga/character/staff type filters
- **Personal Lists** — Manage your anime lists (Watching, Planning, Completed, Dropped, Paused)
- **List Management** — Add/update anime to your list directly from detail pages (status, score, progress)
- **Activity Feed** — Following-style feed showing your own activity plus the activity of everyone you follow on AniList (like the AniList site). Tap a friend's avatar to open their AniList profile
- **Profile & Stats** — View your profile with detailed statistics, favourite genres, and activity heatmap

### In-App Updates
- **Update Notifications** — Bell icon on Discover page checks GitHub Releases for new versions
- **Download APK** — Download updates directly in the app with real-time progress (speed, file size)
- **Auto-Install** — Opens the system installer after download
- **Version Display** — Profile page shows current version with update indicator

### Search Enhancements
- **Character Search** — Search by character name to find anime/manga
- **Staff Search** — Search by voice actor/staff name to find their works
- **Multi-Type Filters** — Switch between Anime, Manga, Characters, and Staff search

### Detail Pages
- **Media Details** — Full anime/manga detail pages with banner, cover, scores, genres, description, airing info
- **Characters & Voice Actors** — View cast with character images and Japanese voice actors
- **Multiple Voice Actors** — Shows all voice actors per character with "(child)" tag for child versions
- **Voice Actor Pages** — Click any voice actor to see all their voiced roles across anime (uses correct AniList API)
- **Relations** — Navigate between related anime (prequels, sequels, adaptations)
- **Recommendations** — Discover similar anime (deduplicated)

### Auto-Sync
- **Real-time List Sync** — Your anime list auto-syncs with AniList every 60 seconds
- **Activity Refresh** — Feed updates automatically when you switch tabs

### UI/UX
- **Dark Anime Theme** — Custom design system with deep purple/pink color palette
- **Cherry Blossom Motifs** — Unique branding with sakura-inspired animations
- **Smooth Animations** — Page transitions, skeleton loading, micro-interactions
- **Virtual Scrolling** — Optimized list rendering for smooth 60 FPS performance
- **Mobile-First Design** — Optimized for Android and desktop
- **Pull-to-Refresh** — Touch-based on mobile, manual button on desktop

### Technical
- **GraphQL API** — Efficient data fetching with AniList's GraphQL API
- **Type Safety** — Full TypeScript coverage with strict mode
- **State Management** — Pinia stores for reactive state handling
- **Cross-Platform** — Works on Windows, macOS, Linux, and Android
- **Go Tests** — Backend tests with testify library

## Screenshots

<p align="center">
  <img src="docs/screenshots/home.png" alt="Home" width="200">
  <img src="docs/screenshots/search.png" alt="Search" width="200">
  <img src="docs/screenshots/profile.png" alt="Profile" width="200">
  <img src="docs/screenshots/feed.png" alt="Feed" width="200">
</p>

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Desktop/Mobile Framework | [Wails 3](https://wails.io) | Cross-platform native apps with Go |
| Frontend | [Vue 3](https://vuejs.org) + TypeScript | UI rendering and state management |
| Build Tool | [Vite](https://vitejs.dev) | Fast development and production builds |
| State Management | [Pinia](https://pinia.vuejs.org) | Reactive state stores |
| Routing | [Vue Router](https://router.vuejs.org) | Client-side navigation |
| Backend | [Go](https://go.dev) 1.25 | OAuth2 localhost server, update service, business logic |
| API | [AniList GraphQL](https://anilist.gitbook.io/anilist-apiv2-docs/) | Anime/manga data (via frontend fetch) |
| Testing | [Testify](https://github.com/stretchr/testify) | Go testing assertions |

## Prerequisites

- **Go** 1.25 or later — [install guide](https://go.dev/doc/install)
- **Node.js** 18+ and npm — [install guide](https://nodejs.org)
- **Wails 3 CLI** — `go install github.com/wailsapp/wails/v3/cmd/wails3@latest`
- **Android SDK** (for Android builds) — [install guide](https://developer.android.com/studio)

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/Aswanidev-vs/Miku.git
cd Miku
```

### 2. Install frontend dependencies

```bash
cd frontend
npm install
cd ..
```

### 3. Set up AniList API credentials

Create a `.env` file in the project root:

```env
ANILIST_CLIENT_ID=your-client-id
ANILIST_CLIENT_SECRET=your-client-secret
```

See [AniList API Setup](#anilist-api-setup) below for detailed instructions.

### 4. Run in development mode

```bash
wails3 dev
```

This starts both the Go backend and the Vite dev server with hot-reload.

### 5. Build for production

```bash
wails3 build
```

The compiled binary will be placed in the `build` directory.

## Building for Android

### Prerequisites

- Android SDK (API level 33+)
- Java Development Kit (JDK 17+)
- Android NDK

### Notes

- The app includes a `network_security_config.xml` that allows cleartext HTTP to `localhost` for the OAuth callback
- OAuth on Android uses Chrome Custom Tabs redirecting to `http://localhost:43219/callback` (there is no custom-scheme deep link — Chrome Custom Tabs cannot navigate to custom-scheme URLs)
- Debug builds keep the `x86_64` ABI so the app also runs in the Android Emulator; release/device APKs are `arm64-v8a` only

### Build Size Optimizations

The installed size is dominated by the Go `libwails.so` native library, so release builds are tuned to minimize it:

- **arm64-v8a only for release** — `x86_64` is restricted to debug builds. Every real device is arm64, so release APKs stop shipping the redundant x86_64 `.so`.
- **Stripped symbols by default** — Android builds run with `PRODUCTION=true`, linking Go with `-ldflags="-w -s"` (no debug info), shrinking `libwails.so` by roughly 40–50%.
- **R8 shrinking without obfuscation** — Release builds enable R8 minification for dead-code removal while keeping `-dontobfuscate`, so the Go↔Java JNI bridge methods are never renamed. `-dontwarn` rules cover annotation classes (`javax.annotation.*`, checkerframework, errorprone) pulled in transitively by `androidx.security-crypto` (Tink/Guava) that aren't present at runtime, keeping the release build green.

### Build Commands

```bash
# Generate Wails bindings
wails3 generate bindings

# Build APK
wails3 task android:build

# Build and run on emulator
wails3 task android:run
```

### Output

- **Debug APK**: `build/android/app/build/outputs/apk/debug/app-debug.apk`
- **Release APK**: `build/android/app/build/outputs/apk/release/app-release.apk` (also copied to `bin/miku.apk`)

## AniList API Setup

Miku uses the AniList GraphQL API with OAuth2 authentication. The app runs a local HTTP server on port 43219 to receive the OAuth callback — this works on both desktop and Android (Chrome Custom Tabs redirect to `http://localhost:43219/callback` on the device).

### Register Your Application

1. Go to **[anilist.co/settings/developer](https://anilist.co/settings/developer)**
2. Click **"Create New Client"**
3. Fill in the details:
   - **Name**: `Miku` (or anything you prefer)
   - **Redirect URL**: `http://localhost:43219/callback`
4. Click **"Create"**
5. Copy the generated **Client ID** and **Client Secret**

### Setting Environment Variables

**Windows (PowerShell):**

```powershell
$env:ANILIST_CLIENT_ID = "your-client-id"
$env:ANILIST_CLIENT_SECRET = "your-client-secret"
```

**Windows (Command Prompt):**

```cmd
set ANILIST_CLIENT_ID=your-client-id
set ANILIST_CLIENT_SECRET=your-client-secret
```

**macOS / Linux:**

```bash
export ANILIST_CLIENT_ID="your-client-id"
export ANILIST_CLIENT_SECRET="your-client-secret"
```

**Persistent (`.env` file):**

Create a `.env` file in the project root:

```env
ANILIST_CLIENT_ID=your-client-id
ANILIST_CLIENT_SECRET=your-client-secret
```

> **Note:** Add `.env` to `.gitignore` to avoid committing credentials.

## Project Structure

```
Miku/
├── backend/
│   ├── api/
│   │   ├── client.go          # GraphQL client implementation
│   │   ├── queries.go         # AniList query definitions
│   │   └── mutations.go       # AniList mutation definitions
│   ├── auth/
│   │   ├── oauth2.go          # OAuth2 authentication service
│   │   └── token_store.go     # Secure token persistence
│   ├── update/
│   │   ├── update.go          # In-app update service (GitHub Releases)
│   │   └── update_test.go     # Update service tests
│   └── platform/
│       └── platform.go        # OS/arch detection service
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── graphql.ts     # GraphQL client with cache
│   │   ├── components/
│   │   │   ├── anime/
│   │   │   │   ├── AnimeCard.vue      # Anime card component
│   │   │   │   └── AnimeGrid.vue      # Virtualized grid
│   │   │   ├── layout/
│   │   │   │   ├── BottomNav.vue      # Bottom navigation
│   │   │   │   └── UpdateNotification.vue  # Update bell & panel
│   │   │   ├── profile/
│   │   │   │   ├── HeatmapCalendar.vue # Activity heatmap
│   │   │   │   ├── StatsCard.vue      # User statistics
│   │   │   │   └── FavoriteGenres.vue # Genre tags
│   │   │   └── common/
│   │   │       ├── SkeletonLoader.vue # Loading skeleton
│   │   │       └── PullToRefresh.vue  # Pull-to-refresh component
│   │   ├── composables/
│   │   │   ├── usePlatform.ts   # Platform detection
│   │   │   ├── useSettings.ts   # App settings
│   │   │   ├── useUpdate.ts     # Update state management
│   │   │   └── usePullToRefresh.ts  # Pull-to-refresh logic
│   │   ├── views/
│   │   │   ├── DiscoverView.vue       # Discovery (Trending, Popular, Seasonal, Top Manga)
│   │   │   ├── SearchView.vue         # Search with anime/manga/character/staff filters
│   │   │   ├── MyListView.vue         # Personal lists with status tabs + auto-sync
│   │   │   ├── FeedView.vue           # Activity feed
│   │   │   ├── ProfileView.vue        # User profile with heatmap & version
│   │   │   ├── MediaDetailView.vue    # Anime/manga detail with list management
│   │   │   ├── VoiceActorView.vue     # Voice actor page with voiced roles
│   │   │   ├── CharacterView.vue      # Character detail page
│   │   │   ├── SettingsView.vue       # Settings
│   │   │   └── LoginView.vue          # Login
│   │   ├── stores/
│   │   │   ├── auth.ts                # Authentication state
│   │   │   ├── anime.ts               # Anime data
│   │   │   ├── manga.ts               # Manga data
│   │   │   └── user.ts                # User data
│   │   ├── router/
│   │   │   └── index.ts               # Route definitions
│   │   ├── types/
│   │   │   └── index.ts               # TypeScript types
│   │   ├── styles/
│   │   │   ├── variables.css           # Design tokens
│   │   │   ├── base.css               # Base styles
│   │   │   └── animations.css         # Animations
│   │   ├── App.vue                    # Root component
│   │   └── main.ts                    # Entry point
│   └── public/
│       └── logo.svg                   # App logo
├── build/
│   ├── android/               # Android build config
│   ├── ios/                   # iOS build config
│   ├── darwin/                # macOS build config
│   ├── windows/               # Windows build config
│   └── linux/                 # Linux build config
├── docs/
│   └── compose/               # Specs, plans, reports
├── main.go                    # Application entry point
├── go.mod                     # Go module definition
├── go.sum                     # Go dependencies
└── Taskfile.yml               # Task runner config
```

## Development

### Available Scripts

```bash
# Development mode with hot-reload
wails3 dev

# Build for production
wails3 build

# Generate Wails bindings
wails3 generate bindings

# Build for Android
wails3 task android:build

# Run on Android emulator
wails3 task android:run

# Run Go tests
go test ./backend/... -v

# Frontend only (without Go backend)
cd frontend && npm run dev
```

### Code Style

- **Vue**: Composition API with `<script setup lang="ts">`
- **TypeScript**: Strict mode enabled
- **CSS**: Custom properties (CSS variables) for theming
- **Go**: Standard Go formatting with `gofmt`

### Git Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat:     New feature
fix:      Bug fix
docs:     Documentation changes
style:    Code style changes (formatting, etc.)
refactor: Code refactoring
test:     Adding or updating tests
chore:    Maintenance tasks
```

## CI/CD

This project uses GitHub Actions for automated builds. See [`.github/workflows/build.yml`](.github/workflows/build.yml) for the workflow configuration.

### Automated Builds

- **Push to main**: Builds Android APK and attaches to release
- **Pull Request**: Validates build compiles successfully
- **Manual trigger**: Build from Actions tab

## Changelog

### v0.9.4 (Latest)

#### New Features
- **Staff Search** — Search by voice actor/staff name to find their works
- **Multiple Voice Actors** — Shows all voice actors per character with "(child)" tag for child versions

#### Bug Fixes
- Fixed voice actor page not showing all voiced roles (uses correct AniList API)
- Fixed character images not loading for child voice actors
- Fixed child VA row not showing character name

### v0.9.0

#### New Features
- **In-App Update Notifications** — Bell icon on Discover page checks GitHub Releases for new versions
- **Download APK Updates** — Download updates directly in the app with real-time progress (speed, file size)
- **Character Search** — Search by character name to find anime/manga
- **Version Display** — Profile page shows current version with update indicator
- **Go Tests** — Backend tests with testify library

#### Improvements
- **Activity Heatmap** — Now fetches full year of activity data
- **Search UI** — Added 4 filter tabs: Anime, Manga, Characters, Staff
- **Mobile Responsive** — Update notification bell visible on all devices

#### Bug Fixes
- Fixed version not displaying in ProfileView

### v0.8.14

- Initial release with core features

## Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch from `main`
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make** your changes
4. **Test** your changes in development mode
   ```bash
   wails3 dev
   ```
5. **Run** Go tests
   ```bash
   go test ./backend/... -v
   ```
6. **Commit** with a descriptive message
   ```bash
   git commit -m "feat: add your feature description"
   ```
7. **Push** to your fork and open a **Pull Request**

### Development Setup

1. Follow the [Installation](#installation) steps
2. Create a `.env` file with your AniList credentials
3. Run `wails3 dev` to start development
4. Make your changes with hot-reload
5. Test thoroughly before submitting

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [AniList](https://anilist.co) — For the API and platform
- [Wails](https://wails.io) — For the cross-platform framework
- [Vue.js](https://vuejs.org) — For the frontend framework
- [Pinia](https://pinia.vuejs.org) — For state management
- [Dexie.js](https://dexie.org) — For IndexedDB wrapper
- [Testify](https://github.com/stretchr/testify) — For Go testing assertions

---

<p align="center">
  Made with <span style="color: #ff4081;">♥</span> by <a href="https://github.com/Aswanidev-vs">Aswanidev-vs</a>
</p>
