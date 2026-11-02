<script setup lang="ts">
import { ref } from 'vue'
import {
  carouselDefaults,
  useSettings,
  type CarouselSource,
  type Settings,
} from '../../composables/useSettings'

const { settings, set, toggle } = useSettings()
const saved = ref(false)

const sourceOptions: { value: CarouselSource; label: string; hint: string }[] = [
  { value: 'trending', label: 'Trending Anime', hint: 'What AniList users are watching now' },
  { value: 'seasonal', label: 'Seasonal Anime', hint: 'Popular titles from the current season' },
  { value: 'popular', label: 'Popular Anime', hint: 'All-time popular anime' },
  { value: 'popular-manga', label: 'Popular Manga', hint: 'Popular manga titles' },
  { value: 'recommended-anime', label: 'Recommended Anime', hint: 'Recommendations from your AniList list' },
  { value: 'recommended-manga', label: 'Recommended Manga', hint: 'Manga recommendations from AniList' },
  { value: 'currently-watching', label: 'Currently Watching', hint: 'Your in-progress list entries' },
  { value: 'recently-updated', label: 'Recently Updated', hint: 'Titles recently updated on AniList' },
]

function update<K extends keyof Settings>(key: K, value: Settings[K]) {
  set(key, value)
  saved.value = false
}

function toggleSource(source: CarouselSource) {
  const sources = settings.value.carouselSources
  const next = sources.includes(source)
    ? sources.filter((item) => item !== source)
    : [...sources, source]
  update('carouselSources', next.length ? next : ['trending'])
}

function resetCarousel() {
  for (const [key, value] of Object.entries(carouselDefaults) as [keyof typeof carouselDefaults, never][]) {
    set(key, Array.isArray(value) ? [...value] as never : value)
  }
  saved.value = true
}

function saveCarousel() {
  saved.value = true
  window.setTimeout(() => { saved.value = false }, 2600)
}

function previewCarousel() {
  saved.value = true
  window.setTimeout(() => { saved.value = false }, 2600)
}
</script>

<template>
  <section class="settings-group carousel-settings">
    <div class="carousel-settings-heading">
      <div>
        <p class="settings-kicker">Discover</p>
        <h3 class="group-title">Discover Carousel</h3>
        <p class="settings-intro">Tune the featured AniList titles shown at the top of Discover.</p>
      </div>
      <span v-if="saved" class="saved-note" role="status">Saved</span>
    </div>

    <div class="carousel-settings-grid">
      <div class="carousel-settings-column">
        <div class="settings-subhead">Autoplay</div>
        <div class="setting-row">
          <div class="setting-text"><span class="setting-label">Enable autoplay</span><span class="setting-hint">Advance featured titles automatically</span></div>
          <button class="switch" :class="{ on: settings.carouselAutoplay }" role="switch" :aria-checked="settings.carouselAutoplay" @click="toggle('carouselAutoplay')"><span class="switch-knob" /></button>
        </div>
        <div class="setting-row range-row">
          <div class="setting-text"><span class="setting-label">Slide duration</span><span class="setting-hint">How long each title stays visible</span></div>
          <label class="range-control"><input type="range" min="3" max="15" step="1" :value="settings.carouselDuration" @input="update('carouselDuration', Number(($event.target as HTMLInputElement).value))" /><output>{{ settings.carouselDuration }}s</output></label>
        </div>
        <div class="setting-row">
          <div class="setting-text"><span class="setting-label">Pause on hover</span><span class="setting-hint">Pause while you inspect a slide</span></div>
          <button class="switch" :class="{ on: settings.carouselPauseOnHover }" role="switch" :aria-checked="settings.carouselPauseOnHover" @click="toggle('carouselPauseOnHover')"><span class="switch-knob" /></button>
        </div>
        <div class="setting-row">
          <div class="setting-text"><span class="setting-label">Resume after interaction</span><span class="setting-hint">Restart autoplay after manual navigation</span></div>
          <button class="switch" :class="{ on: settings.carouselResumeAfterInteraction }" role="switch" :aria-checked="settings.carouselResumeAfterInteraction" @click="toggle('carouselResumeAfterInteraction')"><span class="switch-knob" /></button>
        </div>

        <div class="settings-subhead">Animation</div>
        <div class="select-row">
          <label for="carousel-transition">Transition style</label>
          <select id="carousel-transition" :value="settings.carouselTransition" @change="update('carouselTransition', ($event.target as HTMLSelectElement).value as Settings['carouselTransition'])">
            <option value="crossfade">Crossfade</option><option value="slide">Slide horizontally</option><option value="fade-zoom">Fade and zoom</option><option value="none">No animation</option>
          </select>
        </div>
        <div class="select-row">
          <label for="carousel-speed">Animation speed</label>
          <select id="carousel-speed" :value="settings.carouselAnimationSpeed" @change="update('carouselAnimationSpeed', ($event.target as HTMLSelectElement).value as Settings['carouselAnimationSpeed'])">
            <option value="slow">Slow</option><option value="normal">Normal</option><option value="fast">Fast</option>
          </select>
        </div>
        <div class="setting-row"><div class="setting-text"><span class="setting-label">Background zoom</span><span class="setting-hint">Add a restrained cinematic scale</span></div><button class="switch" :class="{ on: settings.carouselBackgroundZoom }" role="switch" :aria-checked="settings.carouselBackgroundZoom" @click="toggle('carouselBackgroundZoom')"><span class="switch-knob" /></button></div>
        <div class="setting-row"><div class="setting-text"><span class="setting-label">Text entrance</span><span class="setting-hint">Move copy into place on each slide</span></div><button class="switch" :class="{ on: settings.carouselTextEntrance }" role="switch" :aria-checked="settings.carouselTextEntrance" @click="toggle('carouselTextEntrance')"><span class="switch-knob" /></button></div>
        <div class="setting-row"><div class="setting-text"><span class="setting-label">Respect reduced motion</span><span class="setting-hint">Follow your system accessibility preference</span></div><button class="switch" :class="{ on: settings.carouselRespectReducedMotion }" role="switch" :aria-checked="settings.carouselRespectReducedMotion" @click="toggle('carouselRespectReducedMotion')"><span class="switch-knob" /></button></div>
      </div>

      <div class="carousel-settings-column">
        <div class="settings-subhead">Navigation</div>
        <div class="setting-row"><div class="setting-text"><span class="setting-label">Previous / next buttons</span><span class="setting-hint">Keep the visible slide controls</span></div><button class="switch" :class="{ on: settings.carouselShowNavigation }" role="switch" :aria-checked="settings.carouselShowNavigation" @click="toggle('carouselShowNavigation')"><span class="switch-knob" /></button></div>
        <div class="setting-row"><div class="setting-text"><span class="setting-label">Pagination indicators</span><span class="setting-hint">Show position and progress</span></div><button class="switch" :class="{ on: settings.carouselShowPagination }" role="switch" :aria-checked="settings.carouselShowPagination" @click="toggle('carouselShowPagination')"><span class="switch-knob" /></button></div>
        <div class="select-row"><label for="carousel-pagination">Pagination style</label><select id="carousel-pagination" :value="settings.carouselPaginationStyle" @change="update('carouselPaginationStyle', ($event.target as HTMLSelectElement).value as Settings['carouselPaginationStyle'])"><option value="dots">Dots</option><option value="progress">Progress bar</option><option value="minimal">Minimal indicators</option></select></div>
        <div class="setting-row"><div class="setting-text"><span class="setting-label">Keyboard navigation</span><span class="setting-hint">Use the arrow keys while focused</span></div><button class="switch" :class="{ on: settings.carouselKeyboardNavigation }" role="switch" :aria-checked="settings.carouselKeyboardNavigation" @click="toggle('carouselKeyboardNavigation')"><span class="switch-knob" /></button></div>
        <div class="setting-row"><div class="setting-text"><span class="setting-label">Touch swipe</span><span class="setting-hint">Swipe left or right on touch devices</span></div><button class="switch" :class="{ on: settings.carouselTouchNavigation }" role="switch" :aria-checked="settings.carouselTouchNavigation" @click="toggle('carouselTouchNavigation')"><span class="switch-knob" /></button></div>

        <div class="settings-subhead">Content</div>
        <div class="source-list">
          <label v-for="source in sourceOptions" :key="source.value" class="source-option">
            <input type="checkbox" :checked="settings.carouselSources.includes(source.value)" @change="toggleSource(source.value)" />
            <span><strong>{{ source.label }}</strong><small>{{ source.hint }}</small></span>
          </label>
        </div>
        <div class="content-controls">
          <div class="select-row"><label for="carousel-media-filter">Media</label><select id="carousel-media-filter" :value="settings.carouselMediaFilter" @change="update('carouselMediaFilter', ($event.target as HTMLSelectElement).value as Settings['carouselMediaFilter'])"><option value="ANIME">Anime</option><option value="MANGA">Manga</option><option value="BOTH">Anime &amp; Manga</option></select></div>
          <div class="select-row"><label for="carousel-max-slides">Maximum slides</label><select id="carousel-max-slides" :value="settings.carouselMaxSlides" @change="update('carouselMaxSlides', Number(($event.target as HTMLSelectElement).value))"><option v-for="count in [3, 4, 5, 6, 8, 10]" :key="count" :value="count">{{ count }}</option></select></div>
        </div>
        <div class="setting-row"><div class="setting-text"><span class="setting-label">Prefer my AniList entries</span><span class="setting-hint">Place list titles first when available</span></div><button class="switch" :class="{ on: settings.carouselPreferList }" role="switch" :aria-checked="settings.carouselPreferList" @click="toggle('carouselPreferList')"><span class="switch-knob" /></button></div>
        <div class="setting-row"><div class="setting-text"><span class="setting-label">Hide completed or dropped</span><span class="setting-hint">Exclude those statuses from list-based slides</span></div><button class="switch" :class="{ on: settings.carouselHideCompletedDropped }" role="switch" :aria-checked="settings.carouselHideCompletedDropped" @click="toggle('carouselHideCompletedDropped')"><span class="switch-knob" /></button></div>
      </div>
    </div>

    <div class="carousel-layout-settings">
      <div class="settings-subhead">Layout</div>
      <div class="layout-toggle-grid">
        <label v-for="item in [{ key: 'carouselShowCover', label: 'Cover image' }, { key: 'carouselShowSynopsis', label: 'Synopsis' }, { key: 'carouselShowMetadata', label: 'Metadata' }, { key: 'carouselShowProgress', label: 'Tracking progress' }]" :key="item.key" class="check-control"><input type="checkbox" :checked="settings[item.key as keyof Settings] as boolean" @change="toggle(item.key as keyof Settings)" />{{ item.label }}</label>
      </div>
      <div class="layout-selects">
        <div class="select-row"><label for="carousel-alignment">Content alignment</label><select id="carousel-alignment" :value="settings.carouselAlignment" @change="update('carouselAlignment', ($event.target as HTMLSelectElement).value as Settings['carouselAlignment'])"><option value="left">Left</option><option value="center">Center</option></select></div>
        <div class="select-row"><label for="carousel-height">Hero height</label><select id="carousel-height" :value="settings.carouselHeroHeight" @change="update('carouselHeroHeight', ($event.target as HTMLSelectElement).value as Settings['carouselHeroHeight'])"><option value="compact">Compact</option><option value="standard">Standard</option><option value="large">Large</option></select></div>
      </div>
    </div>

    <div class="carousel-preview">
      <div class="preview-copy"><span class="settings-kicker">Live preview</span><strong>Featured AniList title</strong><small>{{ settings.carouselTransition === 'fade-zoom' ? 'Fade + zoom' : settings.carouselTransition === 'slide' ? 'Horizontal slide' : settings.carouselTransition === 'none' ? 'Static transition' : 'Crossfade' }} · {{ settings.carouselDuration }} seconds</small></div>
      <div class="preview-art" :class="`preview-${settings.carouselTransition}`" aria-hidden="true"></div>
    </div>

    <div class="carousel-actions">
      <button class="btn btn-primary" type="button" @click="saveCarousel">Save Changes</button>
      <button class="btn btn-secondary" type="button" @click="resetCarousel">Reset to Defaults</button>
      <button class="btn btn-ghost" type="button" @click="previewCarousel">Preview Carousel</button>
    </div>
    <p v-if="saved" class="settings-confirmation" role="status">Carousel preferences are saved on this device.</p>
  </section>
</template>

<style scoped>
.carousel-settings { margin-top: var(--space-lg); }
.carousel-settings-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-md); }
.group-title { margin-bottom: 3px; }
.settings-kicker { color: var(--color-primary); font-size: var(--font-size-2xs); font-weight: var(--font-weight-bold); letter-spacing: var(--letter-spacing-wide); text-transform: uppercase; }
.settings-intro { color: var(--text-muted); font-size: var(--font-size-xs); }
.saved-note { color: var(--status-watching); font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); }
.carousel-settings-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-xl); margin-top: var(--space-lg); }
.settings-subhead { padding: var(--space-sm) var(--space-xs) var(--space-xs); color: var(--text-primary); font-size: var(--font-size-xs); font-weight: var(--font-weight-bold); letter-spacing: var(--letter-spacing-wide); text-transform: uppercase; }
.setting-row { display: flex; align-items: center; gap: var(--space-md); padding: var(--space-sm) var(--space-xs); border-top: 1px solid var(--border-subtle); }
.setting-text { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.setting-label { color: var(--text-primary); font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); }
.setting-hint { margin-top: 1px; color: var(--text-muted); font-size: var(--font-size-xs); }
.switch { position: relative; width: 42px; height: 24px; flex-shrink: 0; border: 1px solid var(--border-default); border-radius: var(--radius-full); background: var(--bg-hover); cursor: pointer; }
.switch.on { border-color: transparent; background: var(--color-primary); }
.switch-knob { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: transform var(--transition-fast); }
.switch.on .switch-knob { transform: translateX(18px); }
.range-control { display: flex; align-items: center; gap: var(--space-sm); width: min(180px, 42%); color: var(--text-secondary); }
.range-control input { width: 100%; accent-color: var(--color-primary); }
.range-control output { width: 30px; color: var(--text-primary); font-size: var(--font-size-xs); font-variant-numeric: tabular-nums; }
.select-row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-md); padding: var(--space-sm) var(--space-xs); border-top: 1px solid var(--border-subtle); }
.select-row label { color: var(--text-secondary); font-size: var(--font-size-sm); }
select { max-width: 52%; padding: 7px 28px 7px 9px; color: var(--text-primary); background: var(--bg-deep); border: 1px solid var(--border-default); border-radius: var(--radius-sm); font: inherit; font-size: var(--font-size-xs); }
.source-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5px; padding: var(--space-xs); border-top: 1px solid var(--border-subtle); }
.source-option { display: flex; align-items: flex-start; gap: 7px; padding: 7px; border-radius: var(--radius-sm); cursor: pointer; }
.source-option:hover { background: var(--bg-hover); }
.source-option input, .check-control input { accent-color: var(--color-primary); margin-top: 3px; }
.source-option span { display: flex; flex-direction: column; min-width: 0; }
.source-option strong { color: var(--text-secondary); font-size: var(--font-size-xs); }
.source-option small { margin-top: 2px; color: var(--text-muted); font-size: 10px; line-height: 1.25; }
.content-controls, .layout-selects { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-sm); }
.content-controls .select-row, .layout-selects .select-row { display: flex; flex-direction: column; align-items: stretch; gap: 5px; }
.content-controls select, .layout-selects select { max-width: none; }
.carousel-layout-settings { margin-top: var(--space-xl); padding-top: var(--space-sm); border-top: 1px solid var(--border-subtle); }
.layout-toggle-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-sm); padding: var(--space-xs); }
.check-control { display: flex; gap: 7px; align-items: center; padding: var(--space-sm); color: var(--text-secondary); background: var(--bg-deep); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); font-size: var(--font-size-xs); cursor: pointer; }
.carousel-preview { position: relative; display: flex; align-items: flex-end; justify-content: space-between; min-height: 118px; margin-top: var(--space-xl); padding: var(--space-lg); overflow: hidden; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: linear-gradient(100deg, rgba(16, 15, 23, .96), rgba(16, 15, 23, .52)), url('/logo.png') center / cover; }
.preview-copy { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 4px; }
.preview-copy strong { color: var(--text-primary); font-family: var(--font-heading); font-size: var(--font-size-lg); }
.preview-copy small { color: var(--text-muted); font-size: var(--font-size-xs); }
.preview-art { position: absolute; right: 10%; bottom: 0; width: 28%; height: 85%; border-radius: 50% 50% 0 0; background: linear-gradient(140deg, var(--color-primary), #704f9c); opacity: .46; transform-origin: bottom right; }
.preview-fade-zoom { animation: preview-zoom 3s ease-in-out infinite alternate; }
.preview-slide { animation: preview-slide 3s ease-in-out infinite alternate; }
@keyframes preview-zoom { from { transform: scale(.9); } to { transform: scale(1.06); } }
@keyframes preview-slide { from { transform: translateX(12%); } to { transform: translateX(-8%); } }
.carousel-actions { display: flex; flex-wrap: wrap; gap: var(--space-sm); margin-top: var(--space-lg); }
.carousel-actions .btn { min-height: 36px; }
.settings-confirmation { margin-top: var(--space-sm); color: var(--status-watching); font-size: var(--font-size-xs); }
@media (max-width: 780px) { .carousel-settings-grid { grid-template-columns: 1fr; gap: var(--space-md); } .layout-toggle-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 500px) { .source-list, .content-controls, .layout-selects { grid-template-columns: 1fr; } .range-control { width: 45%; } }
</style>
