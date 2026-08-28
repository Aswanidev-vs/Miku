<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAnimeStore } from '../../stores/anime'
import { useAuthStore } from '../../stores/auth'
import { useSettings } from '../../composables/useSettings'
import { preferredTitle } from '../../utils/mediaDisplay'
import type { Media, MediaListEntry, ListStatus, FuzzyDate } from '../../types'

const props = defineProps<{
  isOpen: boolean
  media: Media
  initialEntry?: MediaListEntry | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved', entry: MediaListEntry): void
  (e: 'deleted', entryId: number): void
}>()

const animeStore = useAnimeStore()
const authStore = useAuthStore()
const { settings } = useSettings()

// Form state
const status = ref<ListStatus | ''>('CURRENT')
const score = ref<number>(0)
const progress = ref<number>(0)
const startDate = ref<string>('')
const finishDate = ref<string>('')
const totalRewatches = ref<number>(0)
const notes = ref<string>('')
const hideFromStatusLists = ref<boolean>(false)
const isPrivate = ref<boolean>(false)
const customListsState = ref<Record<string, boolean>>({})

const isFavourite = ref<boolean>(false)
const saving = ref(false)
const deleting = ref(false)
const togglingFav = ref(false)
const showDeleteConfirm = ref(false)
const errorMessage = ref<string | null>(null)

const statusOptions: { label: string; value: ListStatus }[] = [
  { label: 'Watching', value: 'CURRENT' },
  { label: 'Planning', value: 'PLANNING' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Paused', value: 'PAUSED' },
  { label: 'Dropped', value: 'DROPPED' },
  { label: 'Repeating', value: 'REPEATING' },
]

// Determine available custom lists
const availableCustomLists = computed(() => {
  const listSet = new Set<string>()
  
  // From user profile settings
  const userLists = authStore.currentUser?.mediaListOptions?.animeList?.customLists
  if (Array.isArray(userLists)) {
    userLists.forEach(l => { if (l) listSet.add(l) })
  }

  // From anime store myList
  if (animeStore.myList?.lists) {
    animeStore.myList.lists.forEach(l => {
      if (l.isCustomList && l.name) {
        listSet.add(l.name)
      }
    })
  }

  // From current entry customLists
  const entryCustomLists = props.initialEntry?.customLists
  if (Array.isArray(entryCustomLists)) {
    entryCustomLists.forEach(l => { if (l) listSet.add(l) })
  } else if (entryCustomLists && typeof entryCustomLists === 'object') {
    Object.keys(entryCustomLists).forEach(k => listSet.add(k))
  }

  return Array.from(listSet)
})

function fuzzyDateToString(date?: FuzzyDate | any): string {
  if (!date) return ''
  if (typeof date === 'string') {
    return date.length >= 10 ? date.slice(0, 10) : date
  }
  if (date.year) {
    const y = String(date.year)
    const m = date.month ? String(date.month).padStart(2, '0') : '01'
    const d = date.day ? String(date.day).padStart(2, '0') : '01'
    return `${y}-${m}-${d}`
  }
  return ''
}

function stringToFuzzyDate(str?: string): FuzzyDate | undefined {
  if (!str) return undefined
  const parts = str.split('-').map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) return undefined
  return {
    year: parts[0],
    month: parts[1],
    day: parts[2],
  }
}

function getEffectiveEntry(): MediaListEntry | null {
  let entry = props.initialEntry || props.media.mediaListEntry || null

  if (animeStore.myList?.lists) {
    for (const list of animeStore.myList.lists) {
      const found = list.entries.find(e => e.mediaId === props.media.id || e.media?.id === props.media.id)
      if (found) {
        if (!entry) {
          entry = found
        } else {
          entry = {
            ...found,
            ...entry,
            startedAt: entry.startedAt?.year ? entry.startedAt : found.startedAt,
            completedAt: entry.completedAt?.year ? entry.completedAt : found.completedAt,
            customLists: entry.customLists ?? found.customLists,
            notes: entry.notes ?? found.notes,
          }
        }
        break
      }
    }
  }
  return entry
}

// Synchronize form when modal opens or initialEntry changes
function populateForm() {
  const entry = getEffectiveEntry()
  isFavourite.value = !!props.media.isFavourite

  if (entry) {
    status.value = entry.status || 'CURRENT'
    score.value = entry.score ?? 0
    progress.value = entry.progress ?? 0
    totalRewatches.value = entry.repeat ?? 0
    notes.value = entry.notes ?? ''
    hideFromStatusLists.value = !!entry.hiddenFromStatusLists
    isPrivate.value = !!entry.private
    startDate.value = fuzzyDateToString(entry.startedAt)
    finishDate.value = fuzzyDateToString(entry.completedAt)

    const cMap: Record<string, boolean> = {}
    if (Array.isArray(entry.customLists)) {
      entry.customLists.forEach(c => { cMap[c] = true })
    } else if (entry.customLists && typeof entry.customLists === 'object') {
      Object.entries(entry.customLists).forEach(([k, v]) => {
        cMap[k] = !!v
      })
    }
    customListsState.value = cMap
  } else {
    status.value = 'CURRENT'
    score.value = 0
    progress.value = 0
    totalRewatches.value = 0
    notes.value = ''
    hideFromStatusLists.value = false
    isPrivate.value = false
    startDate.value = ''
    finishDate.value = ''
    customListsState.value = {}
  }
  showDeleteConfirm.value = false
  errorMessage.value = null
}

watch(() => props.isOpen, (open) => {
  if (open) {
    populateForm()
  }
}, { immediate: true })

watch(() => [props.initialEntry, props.media.mediaListEntry], () => {
  if (props.isOpen) {
    populateForm()
  }
}, { deep: true })

// Auto-fill dates or progress on status change (e.g. COMPLETED sets finishDate and max progress)
function onStatusChange() {
  if (status.value === 'COMPLETED') {
    if (props.media.episodes && progress.value < props.media.episodes) {
      progress.value = props.media.episodes
    }
    if (!finishDate.value) {
      const today = new Date().toISOString().split('T')[0]
      finishDate.value = today
    }
  } else if (status.value === 'CURRENT') {
    if (!startDate.value) {
      const today = new Date().toISOString().split('T')[0]
      startDate.value = today
    }
  }
}

async function handleToggleFavourite() {
  if (togglingFav.value) return
  togglingFav.value = true
  try {
    await animeStore.toggleFavourite(props.media.id)
    isFavourite.value = !isFavourite.value
  } catch (e) {
    console.error('Failed to toggle favourite:', e)
  } finally {
    togglingFav.value = false
  }
}

async function handleSave() {
  saving.value = true
  errorMessage.value = null
  try {
    const selectedCustomLists = Object.entries(customListsState.value)
      .filter(([_, checked]) => checked)
      .map(([name]) => name)

    const entryId = props.initialEntry?.id || props.media.mediaListEntry?.id

    const entry = await animeStore.saveListEntry({
      id: entryId,
      mediaId: props.media.id,
      status: status.value || undefined,
      score: Number(score.value) || 0,
      progress: Number(progress.value) || 0,
      repeat: Number(totalRewatches.value) || 0,
      notes: notes.value,
      private: isPrivate.value,
      hiddenFromStatusLists: hideFromStatusLists.value,
      customLists: selectedCustomLists.length > 0 ? selectedCustomLists : undefined,
      startedAt: stringToFuzzyDate(startDate.value),
      completedAt: stringToFuzzyDate(finishDate.value),
    })

    if (entry) {
      emit('saved', entry)
      emit('close')
    }
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Failed to save entry'
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  const entryId = props.initialEntry?.id || props.media.mediaListEntry?.id
  if (!entryId) return
  deleting.value = true
  errorMessage.value = null
  try {
    await animeStore.deleteEntry(entryId)
    emit('deleted', entryId)
    emit('close')
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Failed to delete entry'
  } finally {
    deleting.value = false
  }
}

function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="isOpen" class="modal-backdrop" @click="handleBackdropClick">
        <div class="modal-dialog" role="dialog" aria-modal="true" @click.stop>
          <!-- Header Banner -->
          <div
            class="modal-header-banner"
            :style="media.bannerImage ? { backgroundImage: `url(${media.bannerImage})` } : {}"
          >
            <div class="banner-gradient"></div>

            <!-- Close Button -->
            <button class="btn-close" aria-label="Close" @click="emit('close')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <!-- Header Content Floating Row -->
            <div class="header-inner">
              <img
                :src="media.coverImage?.large || media.coverImage?.medium"
                :alt="preferredTitle(media.title, settings.titleLanguage)"
                class="header-cover"
              />

              <div class="header-details">
                <h2 class="media-title">
                  {{ preferredTitle(media.title, settings.titleLanguage) }}
                </h2>
              </div>

              <div class="header-actions">
                <!-- Favourite Heart -->
                <button
                  class="btn-heart"
                  :class="{ active: isFavourite, loading: togglingFav }"
                  :title="isFavourite ? 'Remove from Favourites' : 'Add to Favourites'"
                  @click="handleToggleFavourite"
                >
                  <svg viewBox="0 0 24 24" :fill="isFavourite ? '#e85d75' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </button>

                <!-- Save Button -->
                <button class="btn-save" :disabled="saving" @click="handleSave">
                  <span v-if="saving" class="btn-spinner"></span>
                  <span v-else>Save</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Error notice if any -->
          <div v-if="errorMessage" class="error-banner">
            {{ errorMessage }}
          </div>

          <!-- Form Body -->
          <div class="modal-body">
            <div class="form-grid">
              <!-- Left / Main Fields -->
              <div class="form-col">
                <div class="form-group">
                  <label class="form-label">Status</label>
                  <div class="select-wrapper">
                    <select v-model="status" class="form-select" @change="onStatusChange">
                      <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
                        {{ opt.label }}
                      </option>
                    </select>
                    <svg class="select-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">Start Date</label>
                  <div class="input-date-wrapper">
                    <input v-model="startDate" type="date" class="form-input date-input" />
                  </div>
                </div>
              </div>

              <!-- Center Fields -->
              <div class="form-col">
                <div class="form-group">
                  <label class="form-label">Score</label>
                  <div class="stepper-input">
                    <input
                      v-model.number="score"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      class="form-input"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">Finish Date</label>
                  <div class="input-date-wrapper">
                    <input v-model="finishDate" type="date" class="form-input date-input" />
                  </div>
                </div>
              </div>

              <!-- Right Fields -->
              <div class="form-col">
                <div class="form-group">
                  <label class="form-label">Episode Progress</label>
                  <div class="stepper-input">
                    <input
                      v-model.number="progress"
                      type="number"
                      min="0"
                      :max="media.episodes || undefined"
                      class="form-input"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">Total Rewatches</label>
                  <div class="stepper-input">
                    <input
                      v-model.number="totalRewatches"
                      type="number"
                      min="0"
                      class="form-input"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <!-- Custom Lists & Privacy Column -->
              <div class="form-col custom-lists-col">
                <label class="form-label">Custom Lists</label>
                <div class="custom-lists-container">
                  <template v-if="availableCustomLists.length > 0">
                    <label
                      v-for="cName in availableCustomLists"
                      :key="cName"
                      class="checkbox-label"
                    >
                      <input
                        v-model="customListsState[cName]"
                        type="checkbox"
                        class="form-checkbox"
                      />
                      <span>{{ cName }}</span>
                    </label>
                  </template>
                  <span v-else class="text-subtle-hint">No custom lists</span>

                  <div class="list-divider"></div>

                  <!-- Hide from status lists -->
                  <label class="checkbox-label">
                    <input
                      v-model="hideFromStatusLists"
                      type="checkbox"
                      class="form-checkbox"
                    />
                    <span>Hide from status lists</span>
                  </label>

                  <!-- Private -->
                  <label class="checkbox-label">
                    <input
                      v-model="isPrivate"
                      type="checkbox"
                      class="form-checkbox"
                    />
                    <span>Private</span>
                  </label>
                </div>
              </div>
            </div>

            <!-- Notes full width -->
            <div class="form-group notes-group">
              <label class="form-label">Notes</label>
              <textarea
                v-model="notes"
                class="form-textarea"
                rows="3"
                placeholder=""
              ></textarea>
            </div>

            <!-- Footer Actions -->
            <div class="modal-footer">
              <div class="footer-left"></div>
              <div class="footer-right">
                <template v-if="initialEntry?.id || media.mediaListEntry?.id">
                  <div v-if="showDeleteConfirm" class="delete-confirm-group">
                    <span class="delete-confirm-text">Delete entry?</span>
                    <button class="btn btn-delete-confirm" :disabled="deleting" @click="handleDelete">
                      <span v-if="deleting" class="btn-spinner"></span>
                      <span v-else>Confirm</span>
                    </button>
                    <button class="btn btn-cancel-delete" @click="showDeleteConfirm = false">Cancel</button>
                  </div>
                  <button
                    v-else
                    class="btn btn-delete"
                    @click="showDeleteConfirm = true"
                  >
                    Delete
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(4, 4, 7, 0.82);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-md);
}

.modal-dialog {
  width: 100%;
  max-width: 840px;
  max-height: 90vh;
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-default);
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  animation: modalEnter 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalEnter {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Header Banner */
.modal-header-banner {
  position: relative;
  height: 130px;
  background-size: cover;
  background-position: center;
  background-color: var(--bg-deep);
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  padding: var(--space-md) var(--space-lg);
}

.banner-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(8, 7, 12, 0.45) 0%,
    rgba(21, 20, 29, 0.85) 60%,
    var(--bg-surface) 100%
  );
  pointer-events: none;
}

.btn-close {
  position: absolute;
  top: 12px;
  right: 14px;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border-subtle);
  background: rgba(8, 7, 12, 0.5);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  z-index: 10;
}

.btn-close svg {
  width: 16px;
  height: 16px;
}

.btn-close:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
  border-color: var(--border-strong);
}

.header-inner {
  position: relative;
  z-index: 2;
  width: 100%;
  display: flex;
  align-items: flex-end;
  gap: var(--space-md);
  margin-bottom: -18px;
}

.header-cover {
  width: 72px;
  height: 102px;
  border-radius: var(--radius-md);
  object-fit: cover;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.55);
  border: 2px solid var(--border-strong);
  flex-shrink: 0;
  background: var(--bg-elevated);
}

.header-details {
  flex: 1;
  min-width: 0;
  padding-bottom: 24px;
}

.media-title {
  font-family: var(--font-body);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  line-height: var(--line-height-tight);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.7);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding-bottom: 24px;
  flex-shrink: 0;
}

.btn-heart {
  width: 36px;
  height: 36px;
  background: var(--bg-deep);
  border: 1px solid var(--border-default);
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
  border-radius: var(--radius-full);
}

.btn-heart svg {
  width: 20px;
  height: 20px;
  transition: all var(--transition-fast);
}

.btn-heart:hover {
  transform: scale(1.1);
  color: var(--color-primary);
  border-color: var(--color-primary-glow);
}

.btn-heart.active {
  color: var(--color-primary);
  border-color: var(--color-primary);
  background: var(--color-primary-subtle);
}

.btn-heart.active svg {
  filter: drop-shadow(0 0 6px var(--color-primary-glow));
}

.btn-save {
  background: var(--color-primary);
  color: var(--text-on-primary);
  font-family: var(--font-body);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  padding: 8px 22px;
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 12px var(--color-primary-glow);
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 72px;
  height: 36px;
}

.btn-save:hover:not(:disabled) {
  background: var(--color-primary-light);
  transform: translateY(-1px);
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-banner {
  background: rgba(229, 126, 110, 0.15);
  border: 1px solid rgba(229, 126, 110, 0.3);
  color: var(--status-dropped);
  padding: var(--space-xs) var(--space-md);
  margin: var(--space-md) var(--space-lg) 0;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
}

/* Modal Body */
.modal-body {
  padding: 34px var(--space-lg) var(--space-lg);
  overflow-y: auto;
  flex: 1;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1.2fr;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
}

.form-col {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-family: var(--font-body);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--text-secondary);
  letter-spacing: 0.01em;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  background: var(--bg-deepest);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: var(--font-size-sm);
  padding: 8px 12px;
  outline: none;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-glow);
}

.select-wrapper {
  position: relative;
}

.form-select {
  appearance: none;
  -webkit-appearance: none;
  padding-right: 28px;
  cursor: pointer;
}

.select-arrow {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  color: var(--text-muted);
  pointer-events: none;
}

.date-input {
  color-scheme: dark;
}

/* Custom Lists Column */
.custom-lists-col {
  background: var(--bg-deep);
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
}

.custom-lists-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}

.form-checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid var(--border-strong);
  background: var(--bg-deepest);
  cursor: pointer;
  display: grid;
  place-content: center;
  transition: all var(--transition-fast);
  margin: 0;
  flex-shrink: 0;
}

.form-checkbox:checked {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.form-checkbox:checked::before {
  content: '';
  width: 8px;
  height: 4px;
  border-left: 2px solid var(--text-on-primary);
  border-bottom: 2px solid var(--text-on-primary);
  transform: rotate(-45deg) translate(1px, -1px);
}

.list-divider {
  height: 1px;
  background: var(--border-subtle);
  margin: 4px 0;
}

.text-subtle-hint {
  font-size: var(--font-size-2xs);
  color: var(--text-muted);
  font-style: italic;
}

/* Notes */
.notes-group {
  margin-top: var(--space-xs);
}

.form-textarea {
  resize: vertical;
  min-height: 64px;
  line-height: var(--line-height-normal);
}

/* Modal Footer */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--space-md);
  padding-top: var(--space-sm);
}

.btn-delete {
  background: rgba(229, 126, 110, 0.1);
  color: var(--status-dropped);
  border: 1px solid rgba(229, 126, 110, 0.2);
  border-radius: var(--radius-sm);
  padding: 6px 14px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-delete:hover {
  background: rgba(229, 126, 110, 0.2);
  border-color: rgba(229, 126, 110, 0.4);
}

.delete-confirm-group {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.delete-confirm-text {
  font-size: var(--font-size-xs);
  color: var(--status-dropped);
}

.btn-delete-confirm {
  background: var(--status-dropped);
  color: #ffffff;
  border: none;
  border-radius: var(--radius-sm);
  padding: 5px 12px;
  font-size: var(--font-size-xs);
  cursor: pointer;
}

.btn-cancel-delete {
  background: transparent;
  color: var(--text-muted);
  border: none;
  font-size: var(--font-size-xs);
  cursor: pointer;
}

.btn-cancel-delete:hover {
  color: var(--text-primary);
}

/* Modal transition */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity var(--transition-fast);
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .modal-dialog {
    max-height: 94vh;
  }

  .form-grid {
    grid-template-columns: 1fr 1fr;
    gap: var(--space-sm);
  }

  .custom-lists-col {
    grid-column: span 2;
  }

  .modal-header-banner {
    height: 110px;
    padding: var(--space-sm) var(--space-md);
  }

  .header-cover {
    width: 58px;
    height: 82px;
  }

  .media-title {
    font-size: var(--font-size-sm);
  }

  .modal-body {
    padding: 24px var(--space-md) var(--space-md);
  }
}

@media (max-width: 480px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .custom-lists-col {
    grid-column: span 1;
  }

  .header-actions {
    padding-bottom: 16px;
  }

  .header-details {
    padding-bottom: 16px;
  }
}
</style>
