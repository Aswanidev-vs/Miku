<script setup lang="ts">
import { onMounted, onUnmounted, ref, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { gqlQuery } from '../api/graphql'

const route = useRoute()
const router = useRouter()

const actor = ref<any>(null)
const roles = ref<{ media: any; character: any; characterRole: string }[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const currentPage = ref(1)
const hasMoreRoles = ref(false)
const loadingMoreRoles = ref(false)
const sentinelRef = ref<HTMLElement | null>(null)
const MAX_PAGES = 50

let actorId = 0
let sentinelObserver: IntersectionObserver | null = null

// AniList's actual query for staff page - uses characterMedia (not staffMedia!)
const STAFF_QUERY = `
query ($id: Int!, $page: Int, $sort: [MediaSort]) {
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
    characterMedia(page: $page, sort: $sort) {
      pageInfo { total perPage currentPage lastPage hasNextPage }
      edges {
        characterRole
        characterName
        node {
          id
          type
          title { romaji english userPreferred }
          coverImage { large medium }
          format
          status
          startDate { year }
        }
        characters {
          id
          name { full userPreferred }
          image { large medium }
        }
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

function setupSentinelObserver() {
  const sentinel = sentinelRef.value
  const root = document.querySelector('.main-content') as HTMLElement | null
  if (!sentinel) return
  sentinelObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !loadingMoreRoles.value && hasMoreRoles.value) {
        loadMoreRoles()
      }
    },
    { root, rootMargin: '300px' }
  )
  sentinelObserver.observe(sentinel)
}

async function fetchStaff(id: number, page: number) {
  const res = await gqlQuery(STAFF_QUERY, {
    id,
    page,
    sort: 'START_DATE_DESC'
  })

  if (!res?.data?.Staff) {
    console.error('[VoiceActor] Query returned no data')
    return
  }

  actor.value = res.data.Staff

  const charMedia = res.data.Staff.characterMedia
  const edges = charMedia?.edges || []
  const pageInfo = charMedia?.pageInfo
  hasMoreRoles.value = pageInfo?.hasNextPage ?? false
  currentPage.value = page

  console.log(`[VoiceActor] Page ${page}: ${edges.length} roles, total: ${pageInfo?.total}, hasNext: ${pageInfo?.hasNextPage}`)

  const baseRoles = page === 1 ? [] : [...roles.value]
  const seen = new Set(baseRoles.map((r) => `${r.media.id}-${r.character.id}`))

  for (const edge of edges) {
    const media = edge.node
    const chars = edge.characters || []
    const characterRole = edge.characterRole || ''

    for (const char of chars) {
      const key = `${media.id}-${char.id}`
      if (!seen.has(key)) {
        seen.add(key)
        baseRoles.push({
          media,
          character: char,
          characterRole
        })
      }
    }
  }

  console.log(`[VoiceActor] Total roles found: ${baseRoles.length}`)
  roles.value = baseRoles
}

async function loadMoreRoles() {
  if (loadingMoreRoles.value || !hasMoreRoles.value) return
  if (currentPage.value >= MAX_PAGES) {
    hasMoreRoles.value = false
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

onUnmounted(() => {
  sentinelObserver?.disconnect()
  sentinelObserver = null
  actor.value = null
  roles.value = []
  error.value = null
  currentPage.value = 1
  hasMoreRoles.value = false
  loadingMoreRoles.value = false
})

function goBack() { router.back() }
function goToMedia(id: number) { router.push({ name: 'media-detail', params: { id } }) }

function parseDescription(desc?: string): string {
  if (!desc) return ''
  // Remove HTML tags
  let text = desc.replace(/<[^>]+>/g, '')
  // Parse markdown links: [text](url) -> <a href="url">text</a>
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="description-link">$1</a>')
  // Clean up extra newlines
  text = text.replace(/\n{3,}/g, '\n\n')
  return text.trim()
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
        <div class="description-text" v-html="parseDescription(actor.description)"></div>
      </div>

      <div v-if="roles.length" class="va-section">
        <h3 class="section-title">Voiced Characters ({{ roles.length }})</h3>
        <div class="role-list">
          <div
            v-for="role in roles"
            :key="`${role.media.id}-${role.character.id}`"
            class="role-item"
            @click="goToMedia(role.media.id)"
          >
            <img v-if="role.media.coverImage" :src="role.media.coverImage.medium" :alt="role.media.title.romaji" class="role-media-img" />
            <div class="role-info">
              <span class="role-character">{{ role.character.name?.full || role.character.name?.userPreferred || 'Unknown' }}</span>
              <span class="role-media-title">{{ role.media.title.userPreferred || role.media.title.romaji }}</span>
              <span class="role-format">
                {{ role.media.format?.replace('_', ' ')?.toLowerCase() || '' }}
                <span v-if="role.characterRole" class="role-type"> · {{ role.characterRole }}</span>
              </span>
            </div>
            <img v-if="role.character.image" :src="role.character.image.medium || role.character.image.large" :alt="role.character.name?.full" class="role-char-img" />
          </div>
        </div>

        <div ref="sentinelRef" class="load-more-sentinel">
          <div v-if="loadingMoreRoles" class="loading-more">
            <div class="spinner"></div>
            <span>Loading more roles…</span>
          </div>
          <button
            v-else-if="hasMoreRoles"
            class="load-more-btn"
            @click="loadMoreRoles"
          >
            Load More Roles
          </button>
          <p v-else-if="roles.length > 0" class="all-loaded">All roles loaded</p>
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
.description-text :deep(.description-link) {
  color: var(--color-primary-light);
  text-decoration: none;
  transition: color var(--transition-fast);
}
.description-text :deep(.description-link:hover) {
  color: var(--color-primary);
  text-decoration: underline;
}
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
.role-type { color: var(--text-secondary); }
.role-char-img { width: 36px; height: 36px; border-radius: var(--radius-full); object-fit: cover; flex-shrink: 0; }

.load-more-sentinel { display: flex; flex-direction: column; align-items: center; gap: var(--space-md); padding: var(--space-2xl) 0; }
.loading-more { display: flex; align-items: center; gap: var(--space-sm); color: var(--text-muted); font-size: var(--font-size-sm); }
.loading-more .spinner { width: 18px; height: 18px; border: 2px solid var(--border-default); border-top-color: var(--color-primary); border-radius: 50%; animation: spin 0.7s linear infinite; }

.load-more-btn {
  padding: var(--space-sm) var(--space-lg);
  background: var(--bg-surface);
  border: 1px solid var(--bg-hover);
  color: var(--text-secondary);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  font-family: var(--font-body);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.load-more-btn:hover {
  background: var(--bg-elevated);
  border-color: var(--color-primary);
  color: var(--text-primary);
}

.all-loaded {
  font-size: var(--font-size-sm);
  color: var(--text-muted);
}

.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; gap: var(--space-lg); color: var(--text-muted); }
.btn-back { padding: var(--space-sm) var(--space-lg); border-radius: var(--radius-md); font-size: var(--font-size-sm); border: 1px solid var(--bg-hover); background: var(--bg-surface); color: var(--text-secondary); cursor: pointer; }
</style>
