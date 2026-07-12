<script setup lang="ts">
import { computed } from 'vue'
import type { Activity } from '../../types'

const props = defineProps<{
  activities: Activity[]
}>()

const CELL_SIZE = 12
const CELL_GAP = 3
const WEEKS = 52
const WEEK_DAYS = 7

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getActivityDate(activity: Activity): string {
  const date = new Date(activity.createdAt * 1000)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const activityMap = computed(() => {
  const map: Record<string, number> = {}
  for (const activity of props.activities) {
    const date = getActivityDate(activity)
    map[date] = (map[date] || 0) + 1
  }
  return map
})

const heatmapData = computed(() => {
  const cells: { date: string; count: number; x: number; y: number }[] = []
  const today = new Date()
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - (WEEKS * WEEK_DAYS - 1))
  // Align to Sunday
  startDate.setDate(startDate.getDate() - startDate.getDay())

  for (let week = 0; week < WEEKS; week++) {
    for (let day = 0; day < WEEK_DAYS; day++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + (week * WEEK_DAYS + day))
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const count = activityMap.value[dateStr] || 0
      cells.push({
        date: dateStr,
        count,
        x: week * (CELL_SIZE + CELL_GAP),
        y: day * (CELL_SIZE + CELL_GAP),
      })
    }
  }
  return cells
})

const totalActivity = computed(() => {
  return Object.values(activityMap.value).reduce((sum, count) => sum + count, 0)
})

const uniqueDays = computed(() => {
  return Object.keys(activityMap.value).length
})

function getIntensityClass(count: number): string {
  if (count === 0) return 'level-0'
  if (count === 1) return 'level-1'
  if (count <= 3) return 'level-2'
  if (count <= 6) return 'level-3'
  return 'level-4'
}

function formatTooltip(date: string, count: number): string {
  const d = new Date(date)
  const formatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return count === 1 ? `1 activity on ${formatted}` : `${count} activities on ${formatted}`
}
</script>

<template>
  <div class="heatmap-container">
    <div class="heatmap-header">
      <h3 class="heatmap-title">Activity Heatmap</h3>
      <div class="heatmap-legend">
        <span class="legend-text">Less</span>
        <div class="legend-cell level-0" />
        <div class="legend-cell level-1" />
        <div class="legend-cell level-2" />
        <div class="legend-cell level-3" />
        <div class="legend-cell level-4" />
        <span class="legend-text">More</span>
      </div>
    </div>

    <div class="heatmap-scroll">
      <div class="heatmap-wrapper">
        <div class="day-labels">
          <span v-for="(label, i) in dayLabels" :key="i" class="day-label">
            {{ i % 2 === 1 ? label : '' }}
          </span>
        </div>
        <svg
          class="heatmap-svg"
          :width="WEEKS * (CELL_SIZE + CELL_GAP)"
          :height="WEEK_DAYS * (CELL_SIZE + CELL_GAP)"
        >
          <rect
            v-for="(cell, i) in heatmapData"
            :key="i"
            :x="cell.x"
            :y="cell.y"
            :width="CELL_SIZE"
            :height="CELL_SIZE"
            :rx="2"
            :ry="2"
            :class="['heatmap-cell', getIntensityClass(cell.count)]"
          >
            <title>{{ formatTooltip(cell.date, cell.count) }}</title>
          </rect>
        </svg>
      </div>
    </div>

    <div class="heatmap-stats">
      <span class="stat"><strong>{{ totalActivity }}</strong> activities in the past year</span>
      <span class="stat-sep">|</span>
      <span class="stat"><strong>{{ uniqueDays }}</strong> active days</span>
    </div>
  </div>
</template>

<style scoped>
.heatmap-container {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
}

.heatmap-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-md);
}

.heatmap-title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.heatmap-legend {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.legend-text {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}

.legend-cell {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.heatmap-scroll {
  overflow-x: auto;
  margin: 0 calc(-1 * var(--space-lg));
  padding: 0 var(--space-lg);
}

.heatmap-wrapper {
  display: flex;
  gap: var(--space-xs);
  min-width: fit-content;
}

.day-labels {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-top: 0;
}

.day-label {
  height: 12px;
  font-size: 9px;
  color: var(--text-muted);
  line-height: 12px;
  width: 24px;
  text-align: right;
  padding-right: 4px;
}

.heatmap-svg {
  display: block;
}

.heatmap-cell {
  transition: opacity var(--transition-fast);
}

.heatmap-cell:hover {
  opacity: 0.8;
  stroke: var(--text-secondary);
  stroke-width: 1;
}

.level-0 {
  fill: var(--bg-elevated);
}

.level-1 {
  fill: rgba(156, 39, 176, 0.25);
}

.level-2 {
  fill: rgba(156, 39, 176, 0.45);
}

.level-3 {
  fill: rgba(156, 39, 176, 0.65);
}

.level-4 {
  fill: var(--color-primary);
}

.heatmap-stats {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-top: var(--space-md);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.stat strong {
  color: var(--text-primary);
  font-weight: var(--font-weight-semibold);
}

.stat-sep {
  color: var(--text-muted);
}
</style>
