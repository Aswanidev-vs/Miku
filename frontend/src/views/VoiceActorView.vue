<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { gqlQuery } from '../api/graphql'
import { ref } from 'vue'

const route = useRoute()
const router = useRouter()

const actor = ref<any>(null)
const roles = ref<{ media: any; character: any }[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const error = ref<string | null>(null)
const currentPage = ref(1)
const hasMoreMedia = ref(false)

// Staff info + their media in one query
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

onMounted(async () => {
  const id = Number(route.params.id)
  if (!id) {
    error.value = 'Invalid voice actor ID'
    loading.value = false
    return
  }

  loading.value = true
  error.value = null
  currentPage.value = 1

  try {
    await fetchStaff(id, 1)
  } catch (e: any) {
    console.error('Voice actor fetch error:', e)
    error.value = e?.message || 'Failed to load voice actor'
  } finally {
    loading.value = false
  }
})

async function fetchStaff(id: number, page: number) {
  const res = await gqlQuery(STAFF_QUERY, { id, page })

  if (res?.data?.Staff) {
    actor.value = res.data.Staff

    const mediaEdges = res.data.Staff.staffMedia?.edges || []
    const pageInfo = res.data.Staff.staffMedia?.pageInfo
    hasMoreMedia.value = pageInfo?.hasNextPage ?? false
    currentPage.value = page

    const seen = new Set<string>()
    // If loading more, keep existing roles
    const allRoles = page === 1 ? [] : [...roles.value]
    for (const r of allRoles) seen.add(`${r.media.id}-${r.character.id}`)

    for (const mEdge of mediaEdges) {
      const m = mEdge.node
      for (const cEdge of (m.characters?.edges || [])) {
        const vaIds = (cEdge.voiceActors || []).map((va: any) => va.id)
        if (vaIds.includes(id)) {
          const key = `${m.id}-${cEdge.node.id}`
          if (!seen.has(key)) {
            seen.add(key)
            allRoles.push({ media: m, character: cEdge.node })
          }
        }
      }
    }
    roles.value = allRoles
  }
}

async function loadMoreRoles() {
  const id = Number(route.params.id)
  if (!id || loadingMore.value || !hasMoreMedia.value) return
  loadingMore.value = true
  try {
    await fetchStaff(id, currentPage.value + 1)
  } finally {
    loadingMore.value = false
  }
}

onUnmounted(() => {
  actor.value = null
  roles.value = []
  error.value = null
  currentPage.value = 1
  hasMoreMedia.value = false
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
          <div v-for="role in roles" :key="`${role.media.id}-${role.character.id}`" class="role-item" @click="goToMedia(role.media.id)">
            <img v-if="role.media.coverImage" :src="role.media.coverImage.medium" :alt="role.media.title.romaji" class="role-media-img" />
            <div class="role-info">
              <span class="role-character">{{ role.character.name.full }}</span>
              <span class="role-media-title">{{ role.media.title.userPreferred || role.media.title.romaji }}</span>
              <span v-if="role.media.format" class="role-format">{{ role.media.format.replace('_', ' ').toLowerCase() }}</span>
            </div>
            <img v-if="role.character.image" :src="role.character.image.medium" :alt="role.character.name.full" class="role-char-img" />
          </div>
        </div>
        <button v-if="hasMoreMedia" class="load-more-btn" @click="loadMoreRoles" :disabled="loadingMore">
          <span v-if="loadingMore" class="spinner" />
          <span v-else>Load More</span>
        </button>
      </div>

      <div v-if="!roles.length && !loading" class="va-section">
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

.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; gap: var(--space-lg); color: var(--text-muted); }
.btn-back { padding: var(--space-sm) var(--space-lg); border-radius: var(--radius-md); font-size: var(--font-size-sm); border: 1px solid var(--bg-hover); background: var(--bg-surface); color: var(--text-secondary); cursor: pointer; }

.load-more-btn {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  margin-top: var(--space-lg);
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  color: var(--text-secondary);
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  transition: all var(--transition-fast);
}
.load-more-btn:hover { border-color: var(--color-primary); color: var(--text-primary); }
.load-more-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.load-more-btn .spinner { width: 16px; height: 16px; border: 2px solid var(--border-default); border-top-color: var(--color-primary); border-radius: 50%; animation: spin 0.7s linear infinite; }
</style>
