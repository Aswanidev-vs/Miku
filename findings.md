| # | Verdict | Finding |
|---|---|---|
| 1 | Legit | `SearchView.vue`: removing the route query leaves stale search text/results. |
| 2 | Legit | `SearchDialog.vue`: overlapping requests can apply results using the wrong category and loading state. |
| 3 | Legit | `MyListView.vue`: Favourite items lack list-entry data, so score/progress/updated sorting is ineffective. |
| 4 | Legit | `MyListView.vue`: one filtered item reduces the grid to one stretched column. |
| 5 | Legit | `MobileHeader.vue`: left/right safe-area insets are swapped. |
| 6 | Legit | `App.vue`: sidebar collapsed state can disagree after resizing below/above desktop width. |
| 7 | False positive | `DesktopSidebar.vue`: signed-out profile already renders a valid AniList sign-in control. Routing to Profile is not broken; Settings would only be a UX preference. |
| 8 | Legit | `build/Taskfile.yml`: iOS Xcode generation can run before branding synchronization. |
| 9 | Legit | `build/darwin/Taskfile.yml`: stale `Assets.car` can remain in reused non-Darwin bundles. |
| 10 | False positive / already fixed | The current icon SVG embeds synchronized `logo.png`, and `sync:branding` copies the current logo before icon generation. |
| 11 | Legit | `backend/update/update.go`: malformed checksum sidecars fail closed but can prevent fallback to a later valid sidecar. |
| 12 | Legit | `FEATURES.md`: contains drafting/control-marker artifacts. |
| 13 | Legit | `FEATURES.md`: contains a developer-local absolute path. |
| 14 | Legit | `FEATURES.md`: route inventory is missing `/statistics` and incorrectly describes `/settings` as a redirect. |
| 15 | Legit | `desktop-layout.md`: scope text incorrectly rules out characters, staff, favourites, and social features. |
| 16 | Legit | `desktop-layout.md`: documents a two-pane Settings layout that is not implemented. |
| 17 | Legit | `desktop-layout.md`: describes AniList login as mandatory even though Discover works signed out. |
| 18 | Legit | `desktop-layout.md`: documents unavailable filters and grid/list controls. |
| 19 | Legit | `desktop-layout.md`: includes Profile as a sidebar item even though the account block opens it. |
| 20 | Legit | `desktop-layout.md`: My List documentation does not match the current tabs, sorting, filters, and card grid. |
| 21 | Legit | `DiscoverView.vue`: compares seconds-based AniList timestamps with millisecond timestamps. |
| 22 | Legit | `DiscoverCarouselSettings.vue`: preview animations ignore reduced-motion preferences. |
| 23 | Legit | `DiscoverView.vue`: updating an entry does not refresh the shared `myList` store. |
| 24 | Legit | `ProfileView.vue`: a signed-in user can briefly see the signed-out empty state while profile data loads. |
| 25 | Legit | `DiscoverCarouselSettings.vue`: Preview Carousel only shows a saved message and has no timeout cleanup. |
| 26 | Legit | `ProfileView.vue`: auto-sync watches only the setting, not authentication/user changes, and is not immediate. |