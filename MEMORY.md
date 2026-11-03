# Miku project memory

## Discovered durable knowledge

- The mobile shell is controlled by `MobileHeader.vue` and `BottomNav.vue`: Settings routes to `settings`, while the header account control routes to `profile`.
- The Statistics heatmap keeps its readable cell grid on narrow screens but its outer card fills the available desktop content width.
- AniList `mediaListEntry.updatedAt` values are Unix seconds; convert them to milliseconds before comparing with browser timestamps, and invalidate superseded search requests during debounce windows.
