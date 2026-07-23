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

// Poll for pending OAuth callback using recursive setTimeout (not throttled in background)
let pollTimer: ReturnType<typeof setTimeout> | null = null
let pollStopTimer: ReturnType<typeof setTimeout> | null = null
let isPolling = false

// Native DOM handlers — reliable on Android even when Wails Events
// don't fire on resume from Chrome Custom Tab (JS timers are throttled in background).
function onFocus() { checkPendingCode() }
function onVisibilityChange() {
  if (document.visibilityState === 'visible') checkPendingCode()
}
function onPageShow() { checkPendingCode() }

onMounted(async () => {
  await loadWailsRuntime()

  await authStore.checkAuth().catch(err => {
    console.error('Initial auth check failed:', err)
  })

  // If the OAuth callback completed while the app was backgrounded (Chrome
  // Custom Tab open) and Android recreated the WebView on return, no poll is
  // running — yet the pending code still lives in backend memory. Exchange it
  // now so the user isn't forced to tap "Sign in" a second time.
  if (!authStore.isLoggedIn) {
    await checkPendingCode()
  }

  window.addEventListener('focus', onFocus)
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('pageshow', onPageShow)

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

  // Start polling when the external Android OAuth flow begins.
  // Uses recursive setTimeout (not setInterval) to avoid background throttling.
  watch(() => authStore.authFlowInProgress, (inProgress) => {
    if (inProgress && !authStore.isLoggedIn) {
      if (pollTimer) clearTimeout(pollTimer)
      if (pollStopTimer) clearTimeout(pollStopTimer)
      isPolling = true

      const attempt = async () => {
        if (!isPolling) return
        await checkPendingCode()
        if (authStore.isLoggedIn) {
          isPolling = false
          if (pollTimer) { clearTimeout(pollTimer); pollTimer = null }
          if (pollStopTimer) { clearTimeout(pollStopTimer); pollStopTimer = null }
          return
        }
        // Schedule next check — 250ms interval, not throttled in background
        pollTimer = setTimeout(attempt, 250)
      }
      // Initial immediate check
      attempt()
      // Safety timeout
      pollStopTimer = setTimeout(() => {
        isPolling = false
        if (pollTimer) { clearTimeout(pollTimer); pollTimer = null }
      }, 120_000)
    }
  })
})

onUnmounted(() => {
  isPolling = false
  if (pollTimer) clearTimeout(pollTimer)
  if (pollStopTimer) clearTimeout(pollStopTimer)
  window.removeEventListener('focus', onFocus)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('pageshow', onPageShow)
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
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100dvh;
  overflow: hidden;
}

.main-content {
  position: absolute;
  inset: 0;
  overflow-x: hidden;
  overflow-y: scroll;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
  touch-action: pan-y;
  padding-bottom: var(--nav-height);
}
</style>
