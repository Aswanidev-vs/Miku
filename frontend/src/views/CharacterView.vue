<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { gqlQuery } from '../api/graphql'
import { ref } from 'vue'

const route = useRoute()
const router = useRouter()

const character = ref<any>(null)
const roles = ref<{ media: any; characterRole?: string; voiceActor?: any }[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const error = ref<string | null>(null)
const currentPage = ref(1)
const hasMoreMedia = ref(false)

// Character info + their anime roles in one query
const CHARACTER_QUERY = `
query ($id: Int!, $page: Int) {
  Character(id: $id) {
    id
    name { full native }
    image { large medium }
    gender
    description(asHtml: false)
    media(page: $page, perPage: 50, sort: POPULARITY_DESC, type: ANIME) {
      edges {
        node {
          id
          title { romaji english userPreferred }
          coverImage { medium }
          format
          status
        }
        characterRole
        voiceActors(language: JAPANESE) { id name { full } image { medium } }
      }
      pageInfo { hasNextPage total }
    }
  }
}
`

onMounted(async () => {
  const id = Number(route.params.id)
  if (!id) {
    error.value = 'Invalid character ID'
    loading.value = false
    return
  }

  loading.value = true
  error.value = null
  currentPage.value = 1

  try {
    await fetchCharacter(id, 1)
  } catch (e: any) {
    console.error('Character fetch error:', e)
    error.value = e?.message || 'Failed to load character'
  } finally {
    loading.value = false
  }
})

async function fetchCharacter(id: number, page: number) {
  const res = await gqlQuery(CHARACTER_QUERY, { id, page })

  if (res?.data?.Character) {
    character.value = res.data.Character

    const mediaEdges = res.data.Character.media?.edges || []
    const pageInfo = res.data.Character.media?.pageInfo
    hasMoreMedia.value = pageInfo?.hasNextPage ?? false
    currentPage.value = page

    const allRoles = page === 1 ? [] : [...roles.value]
    for (const e of mediaEdges) {
      allRoles.push({
        media: e.node,
        characterRole: e.characterRole,
        voiceActor: (e.voiceActors || [])[0],
      })
    }
    roles.value = allRoles
  }
}

async function loadMoreRoles() {
  const id = Number(route.params.id)
  if (!id || loadingMore.value || !hasMoreMedia.value) return
  loadingMore.value = true
  try {
    await fetchCharacter(id, currentPage.value + 1)
  } finally {
    loadingMore.value = false
  }
}

onUnmounted(() => {
  character.value = null
  roles.value = []
  error.value = null
  currentPage.value = 1
  hasMoreMedia.value = false
})

function goBack() { router.back() }
function goToMedia(id: number) { router.push({ name: 'media-detail', params: { id } }) }
function goToVA(id?: number) { if (id) router.push({ name: 'voice-actor', params: { id } }) }
function cleanDescription(desc?: string): string {
  if (!desc) return ''
  return desc.replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').trim()
}
</script>

<template>
  <div class="char-view">
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
    <template v-else-if="character">
      <div class="char-header">
        <button class="back-btn" @click="goBack">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <img v-if="character.image" :src="character.image.large || character.image.medium" :alt="character.name.full" class="char-avatar" />
        <h1 class="char-name">{{ character.name.full }}</h1>
        <p v-if="character.name.native" class="char-native">{{ character.name.native }}</p>
        <div class="char-meta">
          <span v-if="character.gender" class="meta-tag">{{ character.gender }}</span>
        </div>
      </div>

      <div v-if="character.description" class="char-section">
        <h3 class="section-title">About</h3>
        <p class="description-text">{{ cleanDescription(character.description) }}</p>
      </div>

      <div v-if="roles.length" class="char-section">
        <h3 class="section-title">Anime Roles ({{ roles.length }})</h3>
        <div class="role-list">
          <div v-for="role in roles" :key="role.media.id" class="role-item" @click="goToMedia(role.media.id)">
            <img v-if="role.media.coverImage" :src="role.media.coverImage.medium" :alt="role.media.title.romaji" class="role-media-img" />
            <div class="role-info">
              <span class="role-media-title">{{ role.media.title.userPreferred || role.media.title.romaji }}</span>
              <span v-if="role.characterRole" class="role-character-role">{{ role.characterRole.replace('_', ' ').toLowerCase() }}</span>
              <span v-if="role.voiceActor" class="role-va" @click.stop="goToVA(role.voiceActor.id)">{{ role.voiceActor.name.full }}</span>
            </div>
            <img v-if="role.voiceActor?.image" :src="role.voiceActor.image.medium" :alt="role.voiceActor.name.full" class="role-va-img" />
          </div>
        </div>
        <button v-if="hasMoreMedia" class="load-more-btn" @click="loadMoreRoles" :disabled="loadingMore">
          <span v-if="loadingMore" class="spinner" />
          <span v-else>Load More</span>
        </button>
      </div>

      <div v-if="!roles.length && !loading" class="char-section">
        <p class="no-roles">No anime roles found</p>
      </div>
    </template>

    <div v-else class="empty-state">
      <p>Character not found</p>
      <button class="btn-back" @click="goBack">Go Back</button>
    </div>
  </div>
</template>

<style scoped>
.char-view { min-height: 100%; background: var(--bg-deepest); padding-bottom: var(--space-xl); }

.loading-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 60vh; gap: var(--space-md); color: var(--text-secondary);
}

.spinner { width: 32px; height: 32px; border: 3px solid var(--bg-surface); border-top-color: var(--color-primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.char-header { display: flex; flex-direction: column; align-items: center; padding: var(--space-xl) var(--space-lg); text-align: center; position: relative; }

.back-btn {
  position: absolute; top: var(--space-md); left: var(--space-md);
  width: 36px; height: 36px; border-radius: var(--radius-full);
  background: rgba(0,0,0,0.6); backdrop-filter: blur(8px);
  border: none; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.back-btn svg { width: 20px; height: 20px; }

.char-avatar { width: 120px; height: 120px; border-radius: var(--radius-full); object-fit: cover; border: 3px solid var(--color-primary); margin-bottom: var(--space-md); }
.char-name { font-size: var(--font-size-xl); font-weight: var(--font-weight-bold); color: var(--text-primary); }
.char-native { font-size: var(--font-size-sm); color: var(--text-muted); margin-top: var(--space-xs); }

.char-meta { display: flex; flex-wrap: wrap; gap: var(--space-xs); justify-content: center; margin-top: var(--space-md); }
.meta-tag { font-size: var(--font-size-xs); padding: 2px 8px; border-radius: var(--radius-full); background: var(--bg-surface); color: var(--text-secondary); }

.char-section { padding: 0 var(--space-lg); margin-bottom: var(--space-xl); }
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
.role-media-title { font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.role-character-role { font-size: var(--font-size-xs); color: var(--color-primary-light); text-transform: capitalize; }
.role-va { font-size: var(--font-size-xs); color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.role-va:hover { color: var(--text-primary); }
.role-va-img { width: 36px; height: 36px; border-radius: var(--radius-full); object-fit: cover; flex-shrink: 0; }

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
