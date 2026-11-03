# Feature Inventory — Miku AniList Client

Repo: `Aswanidev-vs/Miku`. Status legend: **exists** = implemented in code; **needs verify** = present but wiring/state uncertain.

## Routes (frontend/src/router/index.ts)
| Path | Name | Component |
|---|---|---|
| `/` | discover | DiscoverView.vue |
| `/search` | search | SearchView.vue |
| `/mylist` | mylist | MyListView.vue |
| `/feed` | feed | FeedView.vue |
| `/profile` | profile | ProfileView.vue |
| `/statistics` | statistics | StatisticsView.vue |
| `/media/:id` | media-detail | MediaDetailView.vue |
| `/voice-actor/:id` | voice-actor | VoiceActorView.vue |
| `/character/:id` | character | CharacterView.vue |
| `/settings` | settings | SettingsView.vue |
| `/login` | login | LoginView.vue |

## Stores (frontend/src/stores/)
- `auth.ts` — auth state, login/logout, currentUser
- `anime.ts` — trending, myList, favourites, sync (startSync/stopSync, 60s)
- `manga.ts` — manga data, fetchMyList
- `user.ts` — activities, following, followers, heatmap

## OAuth2 login
- Backend OAuth2 service: `backend/auth/oauth2.go` (authorize URL, token exchange, callback server port 43219)
- Token persistence: `backend/auth/token_store.go`
- Login view: `frontend/src/views/LoginView.vue`
- Auth store: `frontend/src/stores/auth.ts`
- Status: exists

## Discover sections
- Trending Now, Most Popular, This Season, Newly Added Anime, Newly Added Manga, Top Manga — `frontend/src/views/DiscoverView.vue:441-491` (queries lines 41-126; loaders 139-224)
- Lazy loading via IntersectionObserver: `DiscoverView.vue:358-392`
- Infinite scroll load-more: `DiscoverView.vue:394-410`
- Status: exists

## Update / notification bell
- Component: `frontend/src/components/layout/UpdateNotification.vue`
- Composable: `frontend/src/composables/useUpdate.ts`
- Backend: `backend/update/update.go` (GitHub Releases check, download, install)
- Features: app update badge, download progress (speed/size), install, dismiss/mark read; episode notices for Watching list; mark all as read; persistent episode read state (localStorage) — `UpdateNotification.vue:29-60, 101-118`
- Status: exists

## Search filters
- View: `frontend/src/views/SearchView.vue`
- Type tabs Anime/Manga/Characters/Staff: lines 259-285; queries lines 59-79; results handling 124-147
- Status: exists

## My List status tabs + auto-sync
- View: `frontend/src/views/MyListView.vue`
- Tabs Watching/Planning/Completed/Paused/Dropped/Favourites: lines 42-49
- Auto-sync: `stores/anime.ts:706-718` (60s setInterval); startSync/stopSync
- Pull-to-refresh refresh: `MyListView.vue:51-56`
- Status: exists

## Feed composer + markdown
- Composer component: `frontend/src/components/feed/ActivityComposer.vue` (textarea, Ctrl/Cmd+Enter) — exists but not imported in any view (needs verify wiring)
- Feed view: `frontend/src/views/FeedView.vue`
- Markdown rendering: `frontend/src/utils/markdown.ts`, `activityHtml.ts`
- ActivityItem: `frontend/src/components/feed/ActivityItem.vue`
- Status: component exists; wiring needs verify

## Profile stats/breakdowns/favourites/following/history/heatmap/About Me/version
- View: `frontend/src/views/ProfileView.vue`
- StatsCard: `components/profile/StatsCard.vue`
- StatsBreakdown: `components/profile/StatsBreakdown.vue`
- UserFavorites: `components/profile/UserFavorites.vue`
- SocialList (following/followers): `components/profile/SocialList.vue`
- HeatmapCalendar: `components/profile/HeatmapCalendar.vue`
- About Me markdown: `ProfileView.vue:431-433`
- Version display: `ProfileView.vue:479-487`
- Recent activity history pagination: `ProfileView.vue:60-88`
- Status: exists

## Detail pages
- View: `frontend/src/views/MediaDetailView.vue`
- Banner/cover: lines 321, 333
- Scores: lines 419-434
- Genres: lines 439-440
- Airing countdown: lines 109-117, 444-447
- Characters + VA (multiple VA, child tag): lines 476-590
- Relations: lines 599-616
- Recommendations (deduped): lines 57-80, 625-640
- List management (status/score/progress): `components/anime/ListEditorModal.vue`, `MediaDetailView.vue:252-292, 373-386`
- Status: exists

## Voice Actor & Character pages
- VoiceActorView: `frontend/src/views/VoiceActorView.vue` (voiced roles, pagination)
- CharacterView: `frontend/src/views/CharacterView.vue`
- Status: exists

## In-app updates
- Backend service: `backend/update/update.go` (CheckForUpdate, DownloadUpdate, InstallUpdate)
- Composable: `frontend/src/composables/useUpdate.ts`
- Profile check-for-updates card: `ProfileView.vue:226-247`
- Status: exists

## Settings
- AppearanceSettings: `frontend/src/components/settings/AppearanceSettings.vue` (themes system/dark/light/black, accent picker)
- AniListPreferences: `frontend/src/components/settings/AniListPreferences.vue` (title language, score format, default tab, adult content)
- ProfileView toggles: auto-sync, compact, reduce motion, recent activity, per-section stats (genres/tags/studios/staff/VA), About Me — `ProfileView.vue:250-420`
- useSettings: `frontend/src/composables/useSettings.ts`
- Status: exists

## Virtualised grid
- AnimeGrid: `frontend/src/components/anime/AnimeGrid.vue` (CSS grid, skeletons) — not virtual-windowed; status needs verify

## Skeletons
- SkeletonLoader: `frontend/src/components/common/SkeletonLoader.vue`
- Used in AnimeGrid loading state: `AnimeGrid.vue:25-34`
- Status: exists

## Pull-to-refresh
- Component: `frontend/src/components/common/PullToRefresh.vue`
- Composable: `frontend/src/composables/usePullToRefresh.ts`
- Used in Discover/MyList/Feed: respective views
- Status: exists

## External link behaviour
- Android: `ProfileView.vue:155-170` openUrl uses wails android bridge; OAuth uses Chrome Custom Tabs (README)
- Feed/Profile user links open AniList in browser: `FeedView.vue:96-98`, `ProfileView.vue:102-104`
- Status: exists

## Collapsible stats on mobile
- StatsBreakdown component: `frontend/src/components/profile/StatsBreakdown.vue` — needs verify collapsible implementation; check file.
- Status: needs verify
