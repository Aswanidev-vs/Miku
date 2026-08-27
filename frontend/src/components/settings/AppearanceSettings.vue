<script setup lang="ts">
import { computed } from 'vue'
import { useSettings, type ThemeMode } from '../../composables/useSettings'

const { settings, set } = useSettings()

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'black', label: 'Black' },
]

const DEFAULT_ACCENT = '#ff6f91'
const ACCENT_PRESETS = ['#6aa9e2', '#9d8df1', '#69cf8c', '#f5c572', '#e57e6e', DEFAULT_ACCENT]

// Native <input type="color"> needs a concrete value, so show the default when unset
const pickerValue = computed(() => (settings.value.accentColor ?? DEFAULT_ACCENT).toLowerCase())

function isActiveAccent(hex: string): boolean {
  return pickerValue.value === hex.toLowerCase()
}

// Picking the default coral stores null so the token set (not inline overrides) applies
function selectAccent(hex: string) {
  set('accentColor', hex.toLowerCase() === DEFAULT_ACCENT ? null : hex)
}

function onCustomAccent(e: Event) {
  selectAccent((e.target as HTMLInputElement).value)
}
</script>

<template>
  <section class="settings-group">
    <h3 class="group-title">Appearance</h3>

    <div class="setting-row theme-row">
      <div class="setting-text">
        <span class="setting-label">Theme</span>
        <span class="setting-hint">System follows your OS light/dark setting</span>
      </div>
      <div class="theme-picker" role="radiogroup" aria-label="Theme">
        <button
          v-for="opt in THEME_OPTIONS"
          :key="opt.value"
          class="theme-btn"
          :class="{ active: settings.theme === opt.value }"
          role="radio"
          :aria-checked="settings.theme === opt.value"
          @click="set('theme', opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <div class="setting-row accent-row">
      <div class="setting-text">
        <span class="setting-label">Accent color</span>
        <span class="setting-hint">Buttons, switches &amp; highlights</span>
      </div>
      <div class="accent-picker">
        <button
          v-for="hex in ACCENT_PRESETS"
          :key="hex"
          class="swatch"
          :class="{ active: isActiveAccent(hex) }"
          :style="{ background: hex }"
          :aria-label="`Accent ${hex}`"
          :title="hex"
          @click="selectAccent(hex)"
        />
        <label class="custom-swatch" title="Custom color">
          <input
            type="color"
            class="custom-input"
            :value="pickerValue"
            aria-label="Custom accent color"
            @input="onCustomAccent"
          />
        </label>
        <button class="reset-btn" :disabled="!settings.accentColor" @click="set('accentColor', null)">
          Reset
        </button>
      </div>
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

/* Theme segmented picker */
.theme-picker {
  display: flex;
  flex-shrink: 0;
  gap: 2px;
  padding: 2px;
  background: var(--bg-deep);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-full);
}

.theme-btn {
  padding: 6px var(--space-md);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-wide);
  color: var(--text-muted);
  transition: background var(--transition-fast), color var(--transition-fast);
}

.theme-btn:hover:not(.active) {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.theme-btn.active {
  background: var(--color-primary);
  color: var(--text-on-primary);
}

/* Accent picker */
.accent-row {
  flex-wrap: wrap;
}

.accent-picker {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.swatch,
.custom-swatch {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border-radius: var(--radius-full);
  border: 1px solid var(--border-default);
  cursor: pointer;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.swatch:hover,
.custom-swatch:hover {
  transform: scale(1.1);
}

.swatch.active {
  outline: 2px solid var(--text-primary);
  outline-offset: 2px;
}

/* Rainbow ring hints that this swatch opens the system picker */
.custom-swatch {
  display: block;
  overflow: hidden;
  background: conic-gradient(#e57e6e, #f5c572, #69cf8c, #6aa9e2, #9d8df1, #e57e6e);
}

.custom-input {
  width: 100%;
  height: 100%;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  opacity: 0;
}

.reset-btn {
  padding: 4px var(--space-sm);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
  transition: color var(--transition-fast), background var(--transition-fast);
}

.reset-btn:hover:not(:disabled) {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.reset-btn:disabled {
  opacity: 0.45;
  cursor: default;
}

/* Small Android screens: full-width rows like Preferences */
@media (max-width: 420px) {
  .settings-group {
    padding-right: var(--space-sm);
    padding-left: var(--space-sm);
  }

  .setting-row {
    gap: var(--space-sm);
  }

  .theme-row,
  .accent-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
