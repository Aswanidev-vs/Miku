<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { RouterView } from 'vue-router'
import { Events } from '@wailsio/runtime'
import { useAuthStore } from './stores'
import { usePlatform } from './composables/usePlatform'
import * as OAuth2Service from '../bindings/github.com/Aswanidev-vs/Miku/backend/auth/oauth2service'
import BottomNav from './components/layout/BottomNav.vue'

const authStore = useAuthStore()
const { os, isDesktop, isMobile, screenSmall, screenMedium, screenLarge } = usePlatform()

async function checkPendingCode() {
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

onMounted(() => {
  authStore.checkAuth().catch(err => {
    console.error('Initial auth check failed:', err)
  })

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
  min-height: 100vh;
  min-height: 100dvh;
}

.main-content {
  flex: 1;
  padding-bottom: var(--nav-height);
}
</style>
