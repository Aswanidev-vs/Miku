| # | Status | Finding |
|---|---|---|
| 1 | Completed | `SearchView.vue`: removing the route query leaves stale search text/results. |
| 2 | Completed | `SearchDialog.vue`: overlapping requests can apply results using the wrong category and loading state. |
| 3 | Completed | `MyListView.vue`: Favourite items lack list-entry data, so score/progress/updated sorting is ineffective. |
| 4 | Completed | `MyListView.vue`: one filtered item reduces the grid to one stretched column. |
| 5 | Completed | `MobileHeader.vue`: left/right safe-area insets are swapped. |
| 6 | Completed | `App.vue`: sidebar collapsed state can disagree after resizing below/above desktop width. |
| 7 | Reviewed - false positive | `DesktopSidebar.vue`: signed-out profile already renders a valid AniList sign-in control. Routing to Profile is not broken; Settings would only be a UX preference. |
| 8 | Completed | `build/Taskfile.yml`: iOS Xcode generation can run before branding synchronization. |
| 9 | Completed | `build/darwin/Taskfile.yml`: stale `Assets.car` can remain in reused non-Darwin bundles. |
| 10 | Completed - already fixed | The current icon SVG embeds synchronized `logo.png`, and `sync:branding` copies the current logo before icon generation. |
| 11 | Completed | `backend/update/update.go`: malformed checksum sidecars fail closed but can prevent fallback to a later valid sidecar. |
| 12 | Completed | `FEATURES.md`: contains drafting/control-marker artifacts. |
| 13 | Completed | `FEATURES.md`: contains a developer-local absolute path. |
| 14 | Completed | `FEATURES.md`: route inventory is missing `/statistics` and incorrectly describes `/settings` as a redirect. |
| 15 | Completed | `desktop-layout.md`: scope text incorrectly rules out characters, staff, favourites, and social features. |
| 16 | Completed | `desktop-layout.md`: documents a two-pane Settings layout that is not implemented. |
| 17 | Completed | `desktop-layout.md`: describes AniList login as mandatory even though Discover works signed out. |
| 18 | Completed | `desktop-layout.md`: documents unavailable filters and grid/list controls. |
| 19 | Completed | `desktop-layout.md`: includes Profile as a sidebar item even though the account block opens it. |
| 20 | Completed | `desktop-layout.md`: My List documentation does not match the current tabs, sorting, filters, and card grid. |
| 21 | Completed | `DiscoverView.vue`: compares seconds-based AniList timestamps with millisecond timestamps. |
| 22 | Completed | `DiscoverCarouselSettings.vue`: preview animations ignore reduced-motion preferences. |
| 23 | Completed | `DiscoverView.vue`: updating an entry does not refresh the shared `myList` store. |
| 24 | Completed | `ProfileView.vue`: a signed-in user can briefly see the signed-out empty state while profile data loads. |
| 25 | Completed | `DiscoverCarouselSettings.vue`: Preview Carousel only shows a saved message and has no timeout cleanup. |
| 26 | Completed | `ProfileView.vue`: auto-sync watches only the setting, not authentication/user changes, and is not immediate. |
