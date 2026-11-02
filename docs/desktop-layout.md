# Miku Desktop UI/UX Layout Specification

Structure, information architecture, screen layout, and component placement only.
No colors, gradients, typography, visual themes, or decorative styling — neutral placeholders throughout.
Target: desktop application window (Wails 3, Go backend, Vue 3).

---

## A. Overall Desktop Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Top Application Header (full width)                                          │
├──────────────┬──────────────────────────────────────────────┬────────────────┤
│              │                                              │                │
│  Left Nav    │         Main Content Area                    │  Contextual    │
│  Sidebar     │         (scrollable)                         │  Panel         │
│  (fixed)     │                                              │  (optional)    │
│              │                                              │                │
└──────────────┴──────────────────────────────────────────────┴────────────────┘
```

- **Window**: standard application window; min width ~1024px; remembered size/position.
- **Left nav sidebar**: fixed, persistent, width ~220px (collapsible to rail ~64px).
- **Top header**: fixed, full width, height ~56px, spans above sidebar + content.
- **Main content area**: scrollable, fills remaining width; max content width ~1200px centered on very wide screens.
- **Contextual panel**: optional right-side panel (~320px) for detail/edit/quick actions; hidden when not needed.

---

## B. Main Navigation Sidebar

Vertical, top-to-bottom:

1. **Miku logo + app name** (top, clickable → Discover)
2. Discover
3. Search
4. My List
5. Activity
6. Profile
7. Statistics
8. Settings

**Bottom (pinned):** logged-in AniList account block
- Avatar (placeholder)
- Username
- Connection status ("Connected to AniList" / "Not signed in")
- Sign out / Sign in action

Active item: distinct highlight. Keyboard shortcuts shown as hints on hover.

---

## C. Discover Screen

Main content, top-to-bottom:

1. **Page Header**
   - Title: "Discover"
   - Search shortcut (input or button → Search)
   - Notifications (bell, unread badge)
   - User profile (avatar → Profile)

2. **Featured Media**
   - Large featured card (cover placeholder left, info right)
   - Cover image placeholder
   - Title
   - Format + release status
   - Short synopsis (2–3 lines)
   - "View Details" action

3. **Quick Actions**
   - Update Progress
   - Open My List
   - View Statistics

4. **Seasonal Anime**
   - Section heading + "See All"
   - Horizontal scrollable row of media cards

5. **Popular Manga**
   - Section heading + "See All"
   - Horizontal scrollable row of media cards

6. **Additional Discovery Sections**
   - Trending Anime (row)
   - Popular Anime (row)
   - Recommended Media (row)

Each media card: cover placeholder, title, format, status/score (neutral placeholders).

---

## D. Search Screen

- Top: search input (full width, prominent)
- Filter row: Anime / Manga / Character / Staff (toggle chips)
- Optional filters: genre (multi-select), format (TV/Movie/OVA/etc.)
- Results area: grid (default) or list toggle
- Each result: cover placeholder, title, format, status, score
- Click → relevant detail screen (Media / Character / Staff)

---

## E. Media Details Screen

Layout: two-column (cover left, info right) on desktop.

- **Left column**: large cover image placeholder
- **Right column**:
  - Title + alternative title
  - Prominent "Add to List / Edit List" action (near title)
  - Synopsis
  - Metadata block: Format, Status, Season, Year, Episode/Chapter count
  - Genres and tags (chips)
  - Average score + popularity
  - Studios / Authors
- **Below (full width)**:
  - Characters section (grid/list with VA)
  - Staff section
  - Related media (row)
  - Recommendations (row)

---

## F. Add to List / Edit Progress Panel

Modal (centered) or right-side contextual panel:

- Status selector (dropdown/chips)
- Episode/Chapter progress control (stepper + total)
- Score selector
- Start date
- Finish date
- Notes field (textarea, optional)
- Actions: Save (primary), Cancel (secondary)

---

## G. My List Screen

- Page heading: "My List"
- Anime / Manga selector (tabs or segmented control)
- Status tabs: Watching, Completed, Planning, Paused, Dropped
- Toolbar: search input + sort control (title, score, progress, updated)
- Content: table (desktop) or dense list
  - Columns: Cover (thumb), Title, Progress, Total, Score, Status, Edit action
- Row click → Media Details; Edit → panel (F)

---

## H. Activity Feed

- Heading: "Activity"
- Vertical feed of activity cards
- Each card:
  - User avatar + name
  - Timestamp
  - Media cover (thumb) + title
  - Progress update text ("watched episode 12 of …")
  - Like / Comment actions (if supported)
- Pull/refresh on tab switch; composer at top (if supported)

---

## I. Profile and Statistics

Sections top-to-bottom:

1. **Header**: avatar, AniList username, profile summary, "Edit on AniList" link
2. **Counts**: anime count, manga count, episodes/chapters
3. **Favorites**: anime, manga, characters, staff (rows/grids)
4. **Activity heatmap** (calendar grid)
5. **Genre & format statistics** (charts/lists)
6. **Watch-time statistics**
7. **Anime list summary** + **Manga list summary**

---

## J. Settings Screen

Two-pane layout:

- **Left**: settings category list (vertical)
  - Account & AniList connection
  - Synchronization
  - Appearance
  - Notifications
  - Data & privacy
  - About & app info
- **Right**: main settings panel (scrollable) rendering selected category

Each category section: grouped rows (label + hint + control).

---

## K. Desktop Workflow Diagram

```
Launch → AniList Login → Discover → Search → Media Details → Add to List → Update Progress → My List → Sync with AniList
```

---

## Desktop Layout Requirements

- Prioritize efficient use of wide screens (multi-column, master-detail).
- Persistent navigation sidebar at all times.
- Consistent spacing and alignment (4px grid).
- Media cards and data tables organized in grids/tables.
- Clear hierarchy: page heading > section heading > card/row.
- No streaming players, video playback controls, or watch buttons.
- No features beyond anime/manga tracking.
- Neutral placeholders for all visual styling.