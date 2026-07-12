# Miku

A native desktop client for [AniList](https://anilist.co) built with [Wails 3](https://wails.io), [Vue 3](https://vuejs.org), and [Go](https://go.dev). Browse trending anime and manga, manage your personal lists, track your activity feed, view your profile with statistics, and search the entire AniList catalog — all from a lightweight desktop app.

## Features

- **Trending & Discovery** — Browse trending anime, seasonal recommendations, and discover new titles
- **Search** — Full-text search across AniList's anime and manga database
- **Personal Lists** — View and manage your anime/manga lists (currently watching, planning, completed, dropped, etc.)
- **Activity Feed** — See what your friends and the community are up to
- **Profile & Stats** — View your profile with detailed statistics, favourite genres, and heatmap calendar
- **OAuth2 Authentication** — Secure login via AniList's OAuth2 flow
- **Settings** — Customize app preferences

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop framework | Wails 3 (alpha) |
| Frontend | Vue 3 + TypeScript + Vite |
| State management | Pinia |
| Routing | Vue Router |
| HTTP client | Axios |
| Local storage | Dexie (IndexedDB) |
| Backend | Go 1.25 |
| API | AniList GraphQL API |

## Prerequisites

- **Go** 1.25 or later — [install guide](https://go.dev/doc/install)
- **Node.js** 18+ and npm — [install guide](https://nodejs.org)
- **Wails 3 CLI** — `go install github.com/wailsapp/wails/v3/cmd/wails@latest`
- **Task** (optional) — [taskfile.dev](https://taskfile.dev) for convenience commands

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/Aswanidev-vs/Miku.git
   cd Miku
   ```

2. **Install frontend dependencies**

   ```bash
   cd frontend
   npm install
   cd ..
   ```

3. **Run in development mode**

   ```bash
   wails3 dev
   ```

   This starts both the Go backend and the Vite dev server with hot-reload.

4. **Build for production**

   ```bash
   wails3 build
   ```

   The compiled binary will be placed in the `build` directory.

## AniList API Setup

Miku uses the AniList GraphQL API. To authenticate with OAuth2 you need to register an application on AniList:

1. Go to **[anilist.co/settings/developer](https://anilist.co/settings/developer)**
2. Click **"Create New Client"**
3. Set the **Name** to `Miku` (or anything you prefer)
4. Set the **Redirect URL** to `miku://callback`
5. Copy the generated **Client ID** and **Client Secret**

Then set them as environment variables before running the app:

**Windows (PowerShell):**

```powershell
$env:ANILIST_CLIENT_ID = "your-client-id"
$env:ANILIST_CLIENT_SECRET = "your-client-secret"
```

**macOS / Linux:**

```bash
export ANILIST_CLIENT_ID="your-client-id"
export ANILIST_CLIENT_SECRET="your-client-secret"
```

Alternatively, you can create a `.env` file in the project root (make sure to add it to `.gitignore`):

```
ANILIST_CLIENT_ID=your-client-id
ANILIST_CLIENT_SECRET=your-client-secret
```

## Project Structure

```
Miku/
├── backend/
│   ├── api/              # AniList GraphQL client and queries
│   └── auth/             # OAuth2 service and token storage
├── frontend/
│   ├── src/
│   │   ├── components/   # Reusable Vue components (anime cards, grids, nav, etc.)
│   │   ├── views/        # Page components (Home, Discover, Search, Profile, etc.)
│   │   ├── stores/       # Pinia stores (auth, anime, manga, user)
│   │   ├── router/       # Vue Router configuration
│   │   └── types/        # TypeScript type definitions
│   └── public/           # Static assets
├── build/                # Platform-specific build configs (Windows, macOS, Linux)
├── docs/                 # Documentation
├── main.go               # Application entry point
├── go.mod                # Go module definition
└── Taskfile.yml          # Task runner configuration
```

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

### Guidelines

- Follow the existing code style and patterns
- Keep commits focused and atomic
- Write clear commit messages (conventional commits preferred: `feat:`, `fix:`, `docs:`, `refactor:`, etc.)
- Test your changes before submitting a PR

## License

This project is open source. See the repository for license details.

## Acknowledgments

- [AniList](https://anilist.co) for the API and platform
- [Wails](https://wails.io) for the desktop framework
- [Vue.js](https://vuejs.org) team for the frontend framework
