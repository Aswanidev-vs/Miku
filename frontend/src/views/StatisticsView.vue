<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useUserStore } from '../stores/user'
import StatsCard from '../components/profile/StatsCard.vue'
import StatsBreakdown from '../components/profile/StatsBreakdown.vue'
import HeatmapCalendar from '../components/profile/HeatmapCalendar.vue'
import UserFavorites from '../components/profile/UserFavorites.vue'

const router = useRouter()
const authStore = useAuthStore()
const userStore = useUserStore()
const user = computed(() => authStore.currentUser)

watch(user, (value) => {
  if (value) userStore.fetchAllActivitiesForHeatmap(value.id)
}, { immediate: true })

function openProfile() {
  router.push({ name: 'profile' })
}
</script>

<template>
  <div class="statistics-view">
    <header class="statistics-header safe-area-top">
      <div>
        <p class="statistics-kicker">Your AniList history</p>
        <h1>Statistics</h1>
        <p class="statistics-subtitle">A clear view of what you watch, read, and return to</p>
      </div>
      <button v-if="user" class="btn btn-secondary" type="button" @click="openProfile">Open profile</button>
    </header>

    <div v-if="!user" class="statistics-empty">
      <h2>Sign in to see your statistics</h2>
      <p>Connect AniList to bring your anime and manga history into Miku.</p>
      <button class="btn btn-primary" type="button" @click="openProfile">Connect AniList</button>
    </div>

    <template v-else-if="user.statistics">
      <StatsCard :statistics="user.statistics" />
      <section class="statistics-section">
        <div class="section-heading">
          <h2>Breakdown</h2>
          <p>Genres, formats, studios, and staff across your lists</p>
        </div>
        <StatsBreakdown :statistics="user.statistics" />
      </section>
      <section class="statistics-section">
        <div class="section-heading">
          <h2>Activity heatmap</h2>
          <p>Your activity over the last year</p>
        </div>
        <HeatmapCalendar :activities="userStore.heatmapActivities" />
      </section>
      <section v-if="user.favourites" class="statistics-section">
        <div class="section-heading">
          <h2>Favorites</h2>
          <p>The titles and people you keep close</p>
        </div>
        <UserFavorites :favorites="user.favourites" />
      </section>
    </template>
  </div>
</template>

<style scoped>
.statistics-view {
  width: min(100%, var(--content-max));
  min-height: 100%;
  margin: 0 auto;
  padding: var(--space-3xl) max(var(--space-2xl), env(safe-area-inset-left, 0px)) var(--space-5xl);
}

.statistics-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-xl);
  margin-bottom: var(--space-2xl);
}

.statistics-kicker {
  margin-bottom: var(--space-xs);
  color: var(--color-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.statistics-header h1 {
  font-family: var(--font-heading);
  font-size: var(--font-size-2xl);
}

.statistics-subtitle,
.section-heading p {
  margin-top: var(--space-xs);
  color: var(--text-muted);
  font-size: var(--font-size-sm);
}

.statistics-view :deep(.stats-section) {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-md);
}

.statistics-view :deep(.stats-group) {
  min-width: 0;
}

.statistics-section {
  margin-top: var(--space-3xl);
}

.section-heading {
  margin-bottom: var(--space-md);
}

.section-heading h2 {
  font-family: var(--font-heading);
  font-size: var(--font-size-lg);
}

.statistics-empty {
  display: grid;
  min-height: 50vh;
  place-content: center;
  justify-items: center;
  gap: var(--space-sm);
  text-align: center;
}

.statistics-empty h2 {
  font-size: var(--font-size-lg);
}

.statistics-empty p {
  max-width: 42ch;
  color: var(--text-muted);
  font-size: var(--font-size-sm);
}

.statistics-empty .btn {
  margin-top: var(--space-md);
}

@media (max-width: 820px) {
  .statistics-view {
    padding-inline: var(--space-lg);
  }

  .statistics-view :deep(.stats-section) {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .statistics-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
