<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  useSettings,
  type DefaultTab,
  type TitleLanguagePref,
  type ScoreFormatPref,
} from '../../composables/useSettings'
import { useAuthStore, useUserStore } from '../../stores'
import { effectiveIsAdult } from '../../utils/mediaDisplay'

const { settings, set } = useSettings()
const authStore = useAuthStore()
const userStore = useUserStore()

const TITLE_LANGUAGE_OPTIONS: { value: TitleLanguagePref; label: string }[] = [
  { value: 'ACCOUNT', label: 'Account default' },
  { value: 'ROMAJI', label: 'Romaji' },
  { value: 'ENGLISH', label: 'English' },
  { value: 'NATIVE', label: 'Native' },
]

const SCORE_FORMAT_OPTIONS: { value: ScoreFormatPref; label: string }[] = [
  { value: 'ACCOUNT', label: 'Account default' },
  { value: 'POINT_100', label: '100-point' },
  { value: 'POINT_10_DECIMAL', label: '10-point decimal' },
  { value: 'POINT_10', label: '10-point' },
  { value: 'POINT_5', label: '5-star' },
  { value: 'POINT_3', label: '3-point' },
]

const DEFAULT_TAB_OPTIONS: { value: DefaultTab; label: string }[] = [
  { value: '/', label: 'Discover' },
  { value: '/search', label: 'Search' },
  { value: '/mylist', label: 'My List' },
  { value: '/feed', label: 'Feed' },
  { value: '/profile', label: 'Profile' },
]

const accountAdult = computed(() => authStore.currentUser?.options?.displayAdultContent)

// null = follow the AniList account; the switch previews the effective value.
const shownAdult = computed(() =>
  effectiveIsAdult(settings.value.adultContent, accountAdult.value)
)

function toggleAdult() {
  set('adultContent', !shownAdult.value)
}

const saving = ref(false)
const saveState = ref<'idle' | 'saved' | 'error'>('idle')
const saveError = ref('')

async function saveToAniList() {
  saving.value = true
  saveState.value = 'idle'
  try {
    // ACCOUNT / null mean "keep the account value" — omitted from the mutation
    await userStore.updatePreferences({
      titleLanguage: settings.value.titleLanguage === 'ACCOUNT' ? undefined : settings.value.titleLanguage,
      displayAdultContent: settings.value.adultContent ?? undefined,
      scoreFormat: settings.value.scoreFormat === 'ACCOUNT' ? undefined : settings.value.scoreFormat,
    })
    saveState.value = 'saved'
    await authStore.fetchUser()
  } catch (e) {
    saveState.value = 'error'
    saveError.value = e instanceof Error ? e.message : 'Save failed'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="settings-group">
    <h3 class="group-title">AniList Preferences</h3>

    <div class="setting-row pref-row">
      <div class="setting-text">
        <span class="setting-label">Title Language</span>
        <span class="setting-hint">How media titles are displayed</span>
      </div>
      <div class="seg-picker" role="radiogroup" aria-label="Title Language">
        <button
          v-for="opt in TITLE_LANGUAGE_OPTIONS"
          :key="opt.value"
          class="seg-btn"
          :class="{ active: settings.titleLanguage === opt.value }"
          role="radio"
          :aria-checked="settings.titleLanguage === opt.value"
          @click="set('titleLanguage', opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <div class="setting-row pref-row">
      <div class="setting-text">
        <span class="setting-label">Score Format</span>
        <span class="setting-hint">How scores are displayed</span>
      </div>
      <div class="seg-picker" role="radiogroup" aria-label="Score Format">
        <button
          v-for="opt in SCORE_FORMAT_OPTIONS"
          :key="opt.value"
          class="seg-btn"
          :class="{ active: settings.scoreFormat === opt.value }"
          role="radio"
          :aria-checked="settings.scoreFormat === opt.value"
          @click="set('scoreFormat', opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <div class="setting-row pref-row">
      <div class="setting-text">
        <span class="setting-label">Default Tab</span>
        <span class="setting-hint">Tab opened when the app launches</span>
      </div>
      <div class="seg-picker" role="radiogroup" aria-label="Default Tab">
        <button
          v-for="opt in DEFAULT_TAB_OPTIONS"
          :key="opt.value"
          class="seg-btn"
          :class="{ active: settings.defaultTab === opt.value }"
          role="radio"
          :aria-checked="settings.defaultTab === opt.value"
          @click="set('defaultTab', opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <div class="setting-row">
      <div class="setting-text">
        <span class="setting-label">Adult Content</span>
        <span class="setting-hint">
          <template v-if="settings.adultContent === null">
            Following your AniList account{{ accountAdult === undefined ? '' : accountAdult ? ' · on' : ' · off' }}
          </template>
          <template v-else>Show 18+ titles in browse &amp; search</template>
        </span>
      </div>
      <button
        v-if="settings.adultContent !== null"
        class="reset-btn"
        @click="set('adultContent', null)"
      >
        Use account setting
      </button>
      <button
        class="switch"
        :class="{ on: shownAdult }"
        role="switch"
        :aria-checked="shownAdult"
        @click="toggleAdult"
      >
        <span class="switch-knob" />
      </button>
    </div>

    <div class="setting-row pref-save-row">
      <span v-if="saveState === 'error'" class="save-msg save-error">{{ saveError }}</span>
      <span v-else-if="saveState === 'saved'" class="save-msg save-status">Saved to your AniList account</span>
      <span v-else class="save-msg save-hint">Applies these to your AniList account</span>
      <button
        class="save-btn"
        :disabled="saving || !authStore.isLoggedIn"
        @click="saveToAniList"
      >
        {{ saving ? 'Saving…' : 'Save to AniList' }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.settings-group {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-md) var(--space-md) var(--space-lg);
}

.group-title {
  font-family: var(--font-heading);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: var(--space-md);
  padding-left: var(--space-xs);
}

.setting-row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-xs);
  border-radius: var(--radius-md);
}

.setting-row + .setting-row {
  border-top: 1px solid var(--border-subtle);
}

.setting-text {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.setting-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.setting-hint {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  margin-top: 1px;
}

/* Segmented picker — theme-picker styling, wrapping for longer option sets */
.seg-picker {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  flex-shrink: 1;
  min-width: 0;
  gap: 2px;
  padding: 2px;
  background: var(--bg-deep);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
}

.seg-btn {
  padding: 6px var(--space-sm);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-wide);
  color: var(--text-muted);
  white-space: nowrap;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.seg-btn:hover:not(.active) {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.seg-btn.active {
  background: var(--color-primary);
  color: var(--text-on-primary);
}

.reset-btn {
  padding: 4px var(--space-sm);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
  white-space: nowrap;
  flex-shrink: 0;
  transition: color var(--transition-fast), background var(--transition-fast);
}

.reset-btn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.pref-save-row {
  justify-content: space-between;
  gap: var(--space-md);
}

.save-msg {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  min-width: 0;
}

.save-error {
  color: var(--status-dropped, #e05b6a);
}

.save-btn {
  padding: 6px var(--space-md);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  background: var(--color-primary);
  color: var(--text-on-primary);
  white-space: nowrap;
  flex-shrink: 0;
  transition: opacity var(--transition-fast);
}

.save-btn:hover:not(:disabled) {
  opacity: 0.85;
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

/* Switch (same pattern as the Preferences group) */
.switch {
  position: relative;
  width: 46px;
  height: 28px;
  flex-shrink: 0;
  border-radius: var(--radius-full);
  background: var(--bg-hover);
  border: 1px solid var(--border-default);
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast);
}

.switch.on {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  border-color: transparent;
}

.switch-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 22px;
  height: 22px;
  border-radius: var(--radius-full);
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: transform var(--transition-fast);
}

.switch.on .switch-knob {
  transform: translateX(18px);
}

/* Small screens: stack the picker below the label */
@media (max-width: 540px) {
  .pref-row {
    flex-direction: column;
    align-items: stretch;
  }

  .seg-picker {
    justify-content: flex-start;
  }

  .pref-save-row {
    flex-direction: column;
    align-items: stretch;
  }

  .pref-save-row .save-btn {
    padding: var(--space-sm) var(--space-md);
  }
}

@media (max-width: 420px) {
  .settings-group {
    padding-right: var(--space-sm);
    padding-left: var(--space-sm);
  }

  .setting-row {
    gap: var(--space-sm);
  }
}
</style>
