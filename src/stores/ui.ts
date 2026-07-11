import { defineStore } from 'pinia'

export type Density = 'comfortable' | 'compact'

export const useUiStore = defineStore('ui', {
  state: () => ({
    density: 'comfortable' as Density,
    reducedMotion: false,
    toast: '' as string,
  }),
  actions: {
    setDensity(d: Density) {
      this.density = d
    },
    toggleReducedMotion() {
      this.reducedMotion = !this.reducedMotion
    },
    showToast(msg: string) {
      this.toast = msg
      window.setTimeout(() => {
        if (this.toast === msg) this.toast = ''
      }, 2600)
    },
  },
})
