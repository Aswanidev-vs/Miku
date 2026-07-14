<script setup lang="ts">
import { onMounted, onUnmounted, ref, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { gqlQuery } from '../api/graphql'

const route = useRoute()
const router = useRouter()

const actor = ref<any>(null)
const roles = ref<{ media: any; character: any }[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const currentPage = ref(1)
const hasMoreMedia = ref(false)
const loadingMoreRoles = ref(false)
const sentinelRef = ref<HTMLElement | null>(null)
const MAX_MEDIA_PAGES = 60        // safety bound; real limiter is scroll
const MAX_CHARACTER_PAGES = 5     // extra char pages fetched for a long anime

// Per-media lazy state for anime whose character list is longer than the first
// 50 returned inline by the staffMedia query (e.g. Slime S4 has 500).
interface CharState { page: number; hasNext: boolean; loading: boolean; done: boolean; observed: boolean }
const mediaCharState = new Map<number, CharState>()

let actorId = 0
let charObserver: IntersectionObserver | null = null
let sentinelObserver: IntersectionObserver | null = null

// Staff info + their media in one query. Characters are nested (first 50 per
// anime) so a VA's roles surface without a request per anime; long series flag
// hasNextPage and are paginated lazily when scrolled into view.
const STAFF_QUERY = `
query ($id: Int!, $page: Int) {
  Staff(id: $id) {
    id
    name { full native }
    image { large medium }
    primaryOccupations
    gender
    age
    yearsActive
    homeTown
    description(asHtml: false)
    staffMedia(page: $page, perPage: 50, sort: POPULARITY_DESC, type: ANIME) {
      edges {
        node {
          id
          title { romaji english userPreferred }
          coverImage { medium }
          format
          status
          characters(perPage: 50, sort: ROLE) {
            pageInfo { currentPage hasNextPage }
            edges {
              node { id name { full } image { medium } }
              voiceActors(language: JAPANESE) { id name { full } }
            }
          }
        }
      }
      pageInfo { hasNextPage total }
    }
  }
}
`

const MEDIA_CHARACTERS_QUERY = `
query ($id: Int!, $page: Int, $perPage: Int) {
  Media(id: $id) {
    characters(page: $page, perPage: $perPage, sort: ROLE) {
      pageInfo { currentPage hasNextPage }
      edges {
        node { id name { full } image { medium } }
        voiceActors(language: JAPANESE) { id name { full } }
      }
    }
  }
}
`

onMounted(async () => {
  const raw = route.params.id
  actorId = Number(Array.isArray(raw) ? raw[0] : raw)
  if (!actorId) {
    error.value = 'Invalid voice actor ID'
    loading.value = false
    return
  }

  loading.value = true
  error.value = null
  currentPage.value = 1

  const root = document.querySelector('.main-content') as HTMLElement | null
  charObserver = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        const mid = Number((e.target as HTMLElement).dataset.mediaId)
        charObserver?.unobserve(e.target)
        loadMoreCharsForMedia(mid)
      }
    },
    { root, rootMargin: '300px' }
  )

  try {
    await fetchStaff(actorId, 1)
  } catch (e: any) {
    console.error('Voice actor fetch error:', e)
    error.value = e?.message || 'Failed to load voice actor'
  } finally {
    loading.value = false
    nextTick(setupSentinelObserver)
  }
})

// Observe the bottom sentinel so staffMedia pages stream in as the user scrolls
// (instead of eagerly fetching every page on mount).
function setupSentinelObserver() {
  const sentinel = sentinelRef.value
  const root = document.querySelector('.main-content') as HTMLElement | null
  if (!sentinel) return
  sentinelObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !loadingMoreRoles.value && hasMoreMedia.value) {
        loadMoreRoles()
      }
    },
    { root, rootMargin: '200px' }
  )
  sentinelObserver.observe(sentinel)
}

// Register a role row so its anime's extra character pages load once visible.
function registerRoleEl(el: HTMLElement | null, role: { media: any; character: any }) {
  if (!el || !charObserver) return
  const mid = role.media.id
  const st = mediaCharState.get(mid)
  if (!st || !st.hasNext || st.done || st.observed) return
  st.observed = true
  el.dataset.mediaId = String(mid)
  charObserver.observe(el)
}

async function fetchStaff(id: number, page: number) {
  const res = await gqlQuery(STAFF_QUERY, { id, page })
  if (!res?.data?.Staff) return

  actor.value = res.data.Staff

  const mediaEdges = res.data.Staff.staffMedia?.edges || []
  const pageInfo = res.data.Staff.staffMedia?.pageInfo
  hasMoreMedia.value = pageInfo?.hasNextPage ?? false
  currentPage.value = page

  const baseRoles = page === 1 ? [] : [...roles.value]
  const seen = new Set(baseRoles.map((r) => `${r.media.id}-${r.character.id}`))

  for (const mEdge of mediaEdges) {
    const m = mEdge.node
    const charConn = m.characters
    const charEdges = charConn?.edges ?? []
    if (charConn?.pageInfo?.hasNextPage && !mediaCharState.has(m.id)) {
      mediaCharState.set(m.id, { page: 2, hasNext: true, loading: false, done: false, observed: false })
    }
    for (const cEdge of charEdges) {
      const nid = cEdge?.node?.id
      if (!nid) continue
      const vaIds = (cEdge.voiceActors || []).map((va: any) => va.id)
      if (!vaIds.includes(id)) continue
      const key = `${m.id}-${nid}`
      if (!seen.has(key)) {
        seen.add(key)
        baseRoles.push({ media: m, character: cEdge.node })
      }
    }
  }
  roles.value = baseRoles
}

// Infinite scroll for the anime listing.
async function loadMoreRoles() {
  if (loadingMoreRoles.value || !hasMoreMedia.value) return
  if (currentPage.value >= MAX_MEDIA_PAGES) {
    hasMoreMedia.value = false
    return
  }
  loadingMoreRoles.value = true
  try {
    await fetchStaff(actorId, currentPage.value + 1)
  } catch (e) {
    console.error('Voice actor load more error:', e)
  } finally {
    loadingMoreRoles.value = false
  }
}

// Lazily fetch a long anime's remaining character pages once it scrolls into
// view, so a VA's roles there aren't missed (e.g. Slime S4's 500 characters).
async function loadMoreCharsForMedia(mediaId: number) {
  const st = mediaCharState.get(mediaId)
  if (!st || st.loading || st.done) return
  st.loading = true

  const media = roles.value.find((r) => r.media.id === mediaId)?.media
  const seen = new Set(roles.value.filter((r) => r.media.id === mediaId).map((r) => r.character.id))

  try {
    let page = st.page
    let guard = 0
    let lastHasNext = st.hasNext
    while (page <= MAX_CHARACTER_PAGES && guard < MAX_CHARACTER_PAGES) {
      const res = await gqlQuery(MEDIA_CHARACTERS_QUERY, { id: mediaId, page, perPage: 50 })
      const conn = res?.data?.Media?.characters
      const newEdges = conn?.edges ?? []
      if (!newEdges.length) {
        st.done = true
        break
      }
      for (const cEdge of newEdges) {
        const nid = cEdge?.node?.id
        if (!nid) continue
        const vaIds = (cEdge.voiceActors || []).map((va: any) => va.id)
        if (vaIds.includes(actorId) && !seen.has(nid)) {
          seen.add(nid)
          roles.value.push({ media, character: cEdge.node })
        }
      }
      lastHasNext = conn?.pageInfo?.hasNextPage ?? false
      if (!lastHasNext) {
        st.done = true
        break
      }
      page++
      st.page = page
      guard++
    }
    if (guard >= MAX_CHARACTER_PAGES) st.done = true
    st.hasNext = !st.done && lastHasNext
  } catch {
    st.done = true
  } finally {
    st.loading = false
  }
}

onUnmounted(() => {
  charObserver?.disconnect()
  sentinelObserver?.disconnect()
  charObserver = null
  sentinelObserver = null
  mediaCharState.clear()
  actor.value = null
  roles.value = []
  error.value = null
  currentPage.value = 1
  hasMoreMedia.value = false
  loadingMoreRoles.value = false
})

function goBack() { router.back() }
function goToMedia(id: number) { router.push({ name: 'media-detail', params: { id } }) }
function cleanDescription(desc?: string): string {
  if (!desc) return ''
  return desc.replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').trim()
}
</script>

<template>
  <div class="va-view">
    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>Loading...</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="empty-state">
      <p>{{ error }}</p>
      <button class="btn-back" @click="goBack">Go Back</button>
    </div>

    <!-- Content -->
    <template v-else-if="actor">
      <div class="va-header">
        <button class="back-btn" @click="goBack">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <img v-if="actor.image" :src="actor.image.large || actor.image.medium" :alt="actor.name.full" class="va-avatar" />
        <h1 class="va-name">{{ actor.name.full }}</h1>
        <p v-if="actor.name.native" class="va-native">{{ actor.name.native }}</p>
        <div class="va-meta">
          <span v-if="actor.gender" class="meta-tag">{{ actor.gender }}</span>
          <span v-if="actor.age" class="meta-tag">Age {{ actor.age }}</span>
          <span v-if="actor.yearsActive?.length" class="meta-tag">Active {{ actor.yearsActive[0] }}–{{ actor.yearsActive[1] || 'present' }}</span>
          <span v-if="actor.homeTown" class="meta-tag">{{ actor.homeTown }}</span>
        </div>
        <div v-if="actor.primaryOccupations?.length" class="va-occupations">
          <span v-for="occ in actor.primaryOccupations" :key="occ" class="occupation-tag">{{ occ }}</span>
        </div>
      </div>

      <div v-if="actor.description" class="va-section">
        <h3 class="section-title">About</h3>
        <p class="description-text">{{ cleanDescription(actor.description) }}</p>
      </div>

      <div v-if="roles.length" class="va-section">
        <h3 class="section-title">Voiced Characters ({{ roles.length }})</h3>
        <div class="role-list">
          <div
            v-for="role in roles"
            :key="`${role.media.id}-${role.character.id}`"
            :ref="el => registerRoleEl(el as HTMLElement | null, role)"
            class="role-item"
            @click="goToMedia(role.media.id)"
          >
            <img v-if="role.media.coverImage" :src="role.media.coverImage.medium" :alt="role.media.title.romaji" class="role-media-img" />
            <div class="role-info">
              <span class="role-character">{{ role.character.name.full }}</span>
              <span class="role-media-title">{{ role.media.title.userPreferred || role.media.title.romaji }}</span>
              <span v-if="role.media.format" class="role-format">{{ role.media.format.replace('_', ' ').toLowerCase() }}</span>
            </div>
            <img v-if="role.character.image" :src="role.character.image.medium" :alt="role.character.name.full" class="role-char-img" />
          </div>
        </div>

        <div ref="sentinelRef" class="load-more-sentinel">
          <div v-if="loadingMoreRoles" class="loading-more">
            <div class="spinner"></div>
            <span>Loading more roles…</span>
          </div>
        </div>
      </div>

      <div v-else-if="!loading" class="va-section">
        <p class="no-roles">No voiced roles found</p>
      </div>
    </template>

    <div v-else class="empty-state">
      <p>Voice actor not found</p>
      <button class="btn-back" @click="goBack">Go Back</button>
    </div>
  </div>
</template>

<style scoped>
.va-view { min-height: 100%; background: var(--bg-deepest); padding-bottom: var(--space-xl); }

.loading-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 60vh; gap: var(--space-md); color: var(--text-secondary);
}

.spinner { width: 32px; height: 32px; border: 3px solid var(--bg-surface); border-top-color: var(--color-primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.va-header { display: flex; flex-direction: column; align-items: center; padding: var(--space-xl) var(--space-lg); text-align: center; position: relative; }

.back-btn {
  position: absolute; top: var(--space-md); left: var(--space-md);
  width: 36px; height: 36px; border-radius: var(--radius-full);
  background: rgba(0,0,0,0.6); backdrop-filter: blur(8px);
  border: none; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.back-btn svg { width: 20px; height: 20px; }

.va-avatar { width: 120px; height: 120px; border-radius: var(--radius-full); object-fit: cover; border: 3px solid var(--color-primary); margin-bottom: var(--space-md); }
.va-name { font-size: var(--font-size-xl); font-weight: var(--font-weight-bold); color: var(--text-primary); }
.va-native { font-size: var(--font-size-sm); color: var(--text-muted); margin-top: var(--space-xs); }

.va-meta { display: flex; flex-wrap: wrap; gap: var(--space-xs); justify-content: center; margin-top: var(--space-md); }
.meta-tag { font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-full); background: var(--bg-surface); color: var(--text-secondary); }

.va-occupations { display: flex; gap: var(--space-xs); margin-top: var(--space-sm); }
.occupation-tag { font-size: var(--font-size-xs); padding: 2px 10px; border-radius: var(--radius-full); background: var(--color-primary); color: var(--text-on-primary); }

.va-section { padding: 0 var(--space-lg); margin-bottom: var(--space-xl); }
.section-title { font-size: var(--font-size-md); font-weight: var(--font-weight-semibold); color: var(--text-primary); margin-bottom: var(--space-md); }
.description-text { font-size: var(--font-size-sm); color: var(--text-secondary); line-height: var(--line-height-relaxed); white-space: pre-line; }
.no-roles { font-size: var(--font-size-sm); color: var(--text-muted); text-align: center; }

.role-list { display: flex; flex-direction: column; gap: var(--space-xs); }
.role-item {
  display: flex; align-items: center; gap: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-surface); border-radius: var(--radius-md);
  cursor: pointer; transition: background var(--transition-fast);
}
.role-item:hover { background: var(--bg-hover); }

.role-media-img { width: 48px; height: 64px; border-radius: var(--radius-sm); object-fit: cover; flex-shrink: 0; }
.role-info { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.role-character { font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); color: var(--text-primary); }
.role-media-title { font-size: var(--font-size-xs); color: var(--color-primary-light); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.role-format { font-size: 10px; color: var(--text-muted); text-transform: capitalize; }
.role-char-img { width: 36px; height: 36px; border-radius: var(--radius-full); object-fit: cover; flex-shrink: 0; }

.load-more-sentinel { display: flex; justify-content: center; padding: var(--space-2xl) 0; }
.loading-more { display: flex; align-items: center; gap: var(--space-sm); color: var(--text-muted); font-size: var(--font-size-sm); }
.loading-more .spinner { width: 18px; height: 18px; border: 2px solid var(--border-default); border-top-color: var(--color-primary); border-radius: 50%; animation: spin 0.7s linear infinite; }

.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; gap: var(--space-lg); color: var(--text-muted); }
.btn-back { padding: var(--space-sm) var(--space-lg); border-radius: var(--radius-md); font-size: var(--font-size-sm); border: 1px solid var(--bg-hover); background: var(--bg-surface); color: var(--text-secondary); cursor: pointer; }
</style>
