<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { RouterView } from 'vue-router'
import { useAuthStore } from './stores'
import { usePlatform } from './composables/usePlatform'
import BottomNav from './components/layout/BottomNav.vue'

const authStore = useAuthStore()
const { os, isDesktop, isMobile, screenSmall, screenMedium, screenLarge } = usePlatform()

// Lazy-load Wails runtime imports to avoid crash if runtime isn't ready
let Events: any = null
let OAuth2Service: any = null

async function loadWailsRuntime() {
  try {
    const wailsRuntime = await import('@wailsio/runtime')
    Events = wailsRuntime.Events
  } catch (e) {
    console.warn('[Miku] Wails runtime not available:', e)
  }
  try {
    OAuth2Service = await import('../bindings/github.com/Aswanidev-vs/Miku/backend/auth/oauth2service')
  } catch (e) {
    console.warn('[Miku] OAuth2 bindings not available:', e)
  }
}

async function checkPendingCode() {
  if (!OAuth2Service) return
  try {
    const code = await OAuth2Service.GetPendingCode()
    if (code) {
      console.log('[Miku App] Got pending code from binding, length:', code.length)
      await authStore.handleCallback(code)
    }
  } catch (err) {
    console.error('[Miku App] Failed to get pending code:', err)
  }
}

// Apply platform classes to document root
watch([os, isDesktop, isMobile, screenSmall, screenMedium, screenLarge], () => {
  const root = document.documentElement
  root.classList.remove('platform-windows', 'platform-darwin', 'platform-linux', 'platform-android', 'platform-ios')
  root.classList.remove('is-desktop', 'is-mobile', 'screen-sm', 'screen-md', 'screen-lg')

  if (os.value) root.classList.add(`platform-${os.value}`)
  if (isDesktop.value) root.classList.add('is-desktop')
  if (isMobile.value) root.classList.add('is-mobile')
  if (screenSmall.value) root.classList.add('screen-sm')
  if (screenMedium.value) root.classList.add('screen-md')
  if (screenLarge.value) root.classList.add('screen-lg')
}, { immediate: true })

// Poll for pending OAuth callback
let pollTimer: ReturnType<typeof setInterval> | null = null
let pollStopTimer: ReturnType<typeof setTimeout> | null = null

onMounted(async () => {
  await loadWailsRuntime()

  authStore.checkAuth().catch(err => {
    console.error('Initial auth check failed:', err)
  })

  if (Events) {
    Events.On('oauth:callback', (eventData: any) => {
      const code = eventData?.data?.code ?? eventData?.code
      console.log('[Miku App] OAuth callback received, code length:', code?.length)
      if (code) {
        authStore.handleCallback(code).catch((err: unknown) => {
          console.error('[Miku App] handleCallback failed:', err)
        })
      }
    })

    Events.On('common:WindowFocus', () => {
      checkPendingCode()
    })
  }

  // Start polling when login begins
  watch(() => authStore.loading, (isLoading) => {
    if (isLoading && !authStore.isLoggedIn) {
      if (pollTimer) clearInterval(pollTimer)
      if (pollStopTimer) clearTimeout(pollStopTimer)
      let attempts = 0
      pollTimer = setInterval(async () => {
        attempts++
        await checkPendingCode()
        if (authStore.isLoggedIn) {
          if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
          if (pollStopTimer) { clearTimeout(pollStopTimer); pollStopTimer = null }
        }
      }, 2000)
      pollStopTimer = setTimeout(() => {
        if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
      }, 120_000)
    }
  })
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  if (pollStopTimer) clearTimeout(pollStopTimer)
})
</script>

<template>
  <div class="app-container">
    <main class="main-content">
      <RouterView v-slot="{ Component }">
        <Transition name="view-fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
    <BottomNav />
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.main-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
  touch-action: pan-y;
  padding-bottom: var(--nav-height);
}
</style>
