<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { gqlQuery } from '../../api/graphql'

type SearchKind = 'ANIME' | 'MANGA' | 'PEOPLE'
type ResultKind = 'ANIME' | 'MANGA' | 'CHARACTER' | 'STAFF'
type SearchResult = {
  id: number
  kind: ResultKind
  title: string
  subtitle: string
  image?: string
}

const emit = defineEmits<{
  close: []
  submit: [query: string]
}>()

const router = useRouter()
const query = ref('')
const activeKind = ref<SearchKind>('ANIME')
const input = ref<HTMLInputElement | null>(null)
const results = ref<SearchResult[]>([])
const loading = ref(false)
const hasSearched = ref(false)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const MEDIA_SEARCH_QUERY = `
query ($search: String, $type: MediaType) {
  Page(perPage: 6) {
    media(search: $search, type: $type, sort: SEARCH_MATCH) {
      id
      title { romaji english native userPreferred }
      coverImage { medium large }
      format
      status
    }
  }
}
`

const PEOPLE_SEARCH_QUERY = `
query ($search: String) {
  Page(perPage: 4) {
    characters(search: $search, sort: SEARCH_MATCH) {
      id
      name { full native }
      image { medium large }
    }
    staff(search: $search, sort: SEARCH_MATCH) {
      id
      name { full native }
      image { medium large }
      primaryOccupations
    }
  }
}
`

function close() {
  emit('close')
}

function submit() {
  const value = query.value.trim()
  if (value) emit('submit', value)
}

function titleFor(title: { userPreferred?: string; english?: string; romaji?: string; native?: string }) {
  return title.userPreferred || title.english || title.romaji || title.native || 'Untitled'
}

function mediaSubtitle(media: { format?: string; status?: string }) {
  return [media.format, media.status?.replaceAll('_', ' ').toLowerCase()].filter(Boolean).join(' · ')
}

async function fetchResults() {
  const value = query.value.trim()
  if (value.length < 2) {
    results.value = []
    hasSearched.value = false
    loading.value = false
    return
  }
  loading.value = true
  hasSearched.value = true
  try {
    if (activeKind.value === 'PEOPLE') {
      const response = await gqlQuery(PEOPLE_SEARCH_QUERY, { search: value })
      const page = response?.data?.Page
      const characters: SearchResult[] = (page?.characters || []).map((person: any) => ({
        id: person.id,
        kind: 'CHARACTER',
        title: person.name?.full || 'Unknown character',
        subtitle: person.name?.native || 'Character',
        image: person.image?.large || person.image?.medium,
      }))
      const staff: SearchResult[] = (page?.staff || []).map((person: any) => ({
        id: person.id,
        kind: 'STAFF',
        title: person.name?.full || 'Unknown staff member',
        subtitle: person.primaryOccupations?.join(', ') || 'Staff',
        image: person.image?.large || person.image?.medium,
      }))
      results.value = [...characters, ...staff]
    } else {
      const response = await gqlQuery(MEDIA_SEARCH_QUERY, { search: value, type: activeKind.value })
      results.value = (response?.data?.Page?.media || []).map((media: any) => ({
        id: media.id,
        kind: activeKind.value,
        title: titleFor(media.title || {}),
        subtitle: mediaSubtitle(media),
        image: media.coverImage?.large || media.coverImage?.medium,
      }))
    }
  } catch {
    results.value = []
  } finally {
    loading.value = false
  }
}

function scheduleSearch() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(fetchResults, 280)
}

function setKind(kind: SearchKind) {
  activeKind.value = kind
  scheduleSearch()
}

function openResult(result: SearchResult) {
  close()
  if (result.kind === 'CHARACTER') router.push({ name: 'character', params: { id: result.id } })
  else if (result.kind === 'STAFF') router.push({ name: 'voice-actor', params: { id: result.id } })
  else router.push({ name: 'media-detail', params: { id: result.id } })
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

watch(query, scheduleSearch)
onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  nextTick(() => input.value?.focus())
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="search-dialog">
      <div class="search-dialog-backdrop" role="presentation" @click.self="close">
        <section class="search-dialog" role="dialog" aria-modal="true" aria-labelledby="search-dialog-title">
          <div class="search-dialog-header">
            <div>
              <p class="search-dialog-kicker">Miku search</p>
              <h2 id="search-dialog-title">Find something to watch</h2>
            </div>
            <button class="search-dialog-close" type="button" aria-label="Close search" @click="close">×</button>
          </div>
          <form class="search-dialog-form" @submit.prevent="submit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" />
            </svg>
            <input ref="input" v-model="query" type="search" placeholder="Search anime, manga, people" autocomplete="off" />
            <kbd>Enter</kbd>
          </form>
          <div class="search-dialog-filters" role="tablist" aria-label="Search category">
            <button type="button" :class="{ active: activeKind === 'ANIME' }" @click="setKind('ANIME')">Anime</button>
            <button type="button" :class="{ active: activeKind === 'MANGA' }" @click="setKind('MANGA')">Manga</button>
            <button type="button" :class="{ active: activeKind === 'PEOPLE' }" @click="setKind('PEOPLE')">People</button>
          </div>
          <div v-if="loading" class="search-dialog-state">Searching AniList…</div>
          <div v-else-if="results.length" class="search-dialog-results" aria-live="polite">
            <button v-for="result in results" :key="`${result.kind}-${result.id}`" class="search-dialog-result" type="button" @click="openResult(result)">
              <img v-if="result.image" :src="result.image" :alt="result.title" />
              <span v-else class="search-dialog-result-placeholder" aria-hidden="true">?</span>
              <span class="search-dialog-result-copy"><strong>{{ result.title }}</strong><small>{{ result.subtitle || result.kind.toLowerCase() }}</small></span>
              <span class="search-dialog-result-arrow" aria-hidden="true">→</span>
            </button>
          </div>
          <div v-else-if="hasSearched" class="search-dialog-state">No matching AniList results.</div>
          <p class="search-dialog-hint">Results update from AniList as you type. Press <kbd>Esc</kbd> to close.</p>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.search-dialog-backdrop { position: fixed; inset: 0; z-index: var(--z-modal); display: flex; align-items: flex-start; justify-content: center; padding: min(16vh, 128px) var(--space-md); background: rgba(4, 4, 7, .72); backdrop-filter: blur(8px); }
.search-dialog { width: min(620px, 100%); overflow: hidden; background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); }
.search-dialog-header { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-md); padding: var(--space-lg) var(--space-lg) var(--space-md); }
.search-dialog-kicker { margin-bottom: 4px; color: var(--color-primary); font-size: var(--font-size-2xs); font-weight: var(--font-weight-bold); letter-spacing: var(--letter-spacing-wide); text-transform: uppercase; }
.search-dialog h2 { color: var(--text-primary); font-family: var(--font-heading); font-size: var(--font-size-xl); }
.search-dialog-close { width: 30px; height: 30px; color: var(--text-muted); background: var(--bg-hover); border-radius: 50%; font-size: 22px; line-height: 1; }
.search-dialog-close:hover { color: var(--text-primary); background: var(--border-subtle); }
.search-dialog-form { display: flex; align-items: center; gap: var(--space-sm); margin: 0 var(--space-lg); padding: var(--space-sm) var(--space-md); background: var(--bg-deep); border: 1px solid var(--border-default); border-radius: var(--radius-md); }
.search-dialog-form:focus-within { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-glow); }
.search-dialog-form svg { width: 20px; height: 20px; flex-shrink: 0; color: var(--text-muted); }
.search-dialog-form input { width: 100%; min-width: 0; height: 34px; color: var(--text-primary); background: transparent; border: 0; outline: 0; font: inherit; }
.search-dialog-form input::placeholder { color: var(--text-muted); }
kbd { padding: 3px 6px; color: var(--text-muted); background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: 4px; font-size: 10px; white-space: nowrap; }
.search-dialog-filters { display: flex; gap: 6px; padding: var(--space-md) var(--space-lg) var(--space-sm); }
.search-dialog-filters button { padding: 6px 10px; color: var(--text-muted); background: transparent; border: 1px solid transparent; border-radius: var(--radius-full); font-size: var(--font-size-xs); }
.search-dialog-filters button:hover { color: var(--text-primary); background: var(--bg-hover); }
.search-dialog-filters button.active { color: var(--text-on-primary); background: var(--color-primary); }
.search-dialog-results { display: grid; gap: 4px; max-height: 288px; padding: 0 var(--space-lg) var(--space-sm); overflow-y: auto; }
.search-dialog-result { display: flex; align-items: center; gap: var(--space-sm); width: 100%; padding: 7px; color: var(--text-secondary); background: transparent; border: 1px solid transparent; border-radius: var(--radius-sm); text-align: left; }
.search-dialog-result:hover { color: var(--text-primary); background: var(--bg-hover); border-color: var(--border-subtle); }
.search-dialog-result img, .search-dialog-result-placeholder { width: 34px; height: 44px; flex: 0 0 34px; border-radius: 4px; object-fit: cover; }
.search-dialog-result-placeholder { display: grid; place-items: center; color: var(--text-muted); background: var(--bg-surface); font-size: var(--font-size-xs); }
.search-dialog-result-copy { display: flex; flex: 1; flex-direction: column; min-width: 0; }
.search-dialog-result-copy strong { overflow: hidden; color: inherit; font-size: var(--font-size-sm); text-overflow: ellipsis; white-space: nowrap; }
.search-dialog-result-copy small { margin-top: 2px; overflow: hidden; color: var(--text-muted); font-size: var(--font-size-2xs); text-overflow: ellipsis; white-space: nowrap; text-transform: capitalize; }
.search-dialog-result-arrow { color: var(--text-muted); font-size: var(--font-size-md); }
.search-dialog-state { padding: var(--space-md) var(--space-lg); color: var(--text-muted); font-size: var(--font-size-xs); }
.search-dialog-hint { padding: var(--space-sm) var(--space-lg) var(--space-lg); color: var(--text-muted); font-size: var(--font-size-xs); }
.search-dialog-enter-active, .search-dialog-leave-active { transition: opacity var(--transition-fast); }
.search-dialog-enter-active .search-dialog, .search-dialog-leave-active .search-dialog { transition: transform var(--transition-fast), opacity var(--transition-fast); }
.search-dialog-enter-from, .search-dialog-leave-to { opacity: 0; }
.search-dialog-enter-from .search-dialog, .search-dialog-leave-to .search-dialog { opacity: 0; transform: translateY(-10px) scale(.98); }
@media (max-width: 500px) { .search-dialog-header, .search-dialog-hint, .search-dialog-filters { padding-right: var(--space-md); padding-left: var(--space-md); } .search-dialog-form { margin-inline: var(--space-md); } .search-dialog-results { padding-inline: var(--space-md); } }
</style>
