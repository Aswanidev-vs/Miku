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
- **Advanced Search** — Full-text search with anime/manga type filter
- **Personal Lists** — Manage your anime lists (Watching, Planning, Completed, Dropped, Paused)
- **List Management** — Add/update anime to your list directly from detail pages (status, score, progress)
- **Activity Feed** — See your AniList activity feed
- **Profile & Stats** — View your profile with detailed statistics, favourite genres, and activity heatmap

### Detail Pages
- **Media Details** — Full anime/manga detail pages with banner, cover, scores, genres, description, airing info
- **Characters & Voice Actors** — View cast with character images and Japanese voice actors
- **Voice Actor Pages** — Click any voice actor to see all their voiced roles across anime
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

### Technical
- **GraphQL API** — Efficient data fetching with AniList's GraphQL API
- **Type Safety** — Full TypeScript coverage with strict mode
- **State Management** — Pinia stores for reactive state handling
- **Cross-Platform** — Works on Windows, macOS, Linux, and Android

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
| Backend | [Go](https://go.dev) 1.25 | OAuth2 localhost server, business logic |
| API | [AniList GraphQL](https://anilist.gitbook.io/anilist-apiv2-docs/) | Anime/manga data (via frontend fetch) |

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
- The `miku://` deep link intent filter is registered in `AndroidManifest.xml` as a fallback
- Chrome Custom Tabs handle the OAuth redirect to `http://localhost:43219/callback`

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

The APK will be generated at:
```
build/android/app/build/outputs/apk/debug/app-debug.apk
```

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
│   └── auth/
│       ├── oauth2.go          # OAuth2 authentication service
│       └── token_store.go     # Secure token persistence
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── anime/
│   │   │   │   ├── AnimeCard.vue      # Anime card component
│   │   │   │   └── AnimeGrid.vue      # Virtualized grid
│   │   │   ├── layout/
│   │   │   │   └── BottomNav.vue      # Bottom navigation
│   │   │   ├── profile/
│   │   │   │   ├── HeatmapCalendar.vue # Activity heatmap
│   │   │   │   ├── StatsCard.vue      # User statistics
│   │   │   │   └── FavoriteGenres.vue # Genre tags
│   │   │   └── common/
│   │   │       └── SkeletonLoader.vue # Loading skeleton
│   │   ├── views/
│   │   │   ├── DiscoverView.vue       # Discovery (Trending, Popular, Seasonal, Top Manga)
│   │   │   ├── SearchView.vue         # Search with anime/manga filter
│   │   │   ├── MyListView.vue         # Personal lists with status tabs + auto-sync
│   │   │   ├── FeedView.vue           # Activity feed
│   │   │   ├── ProfileView.vue        # User profile with heatmap
│   │   │   ├── MediaDetailView.vue    # Anime/manga detail with list management
│   │   │   ├── VoiceActorView.vue     # Voice actor page with voiced roles
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
5. **Commit** with a descriptive message
   ```bash
   git commit -m "feat: add your feature description"
   ```
6. **Push** to your fork and open a **Pull Request**

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

---

<p align="center">
  Made with <span style="color: #ff4081;">♥</span> by <a href="https://github.com/Aswanidev-vs">Aswanidev-vs</a>
</p>
