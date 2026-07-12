<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { Events } from '@wailsio/runtime'
import { useAuthStore } from './stores'
import * as OAuth2Service from '../bindings/github.com/Aswanidev-vs/Miku/backend/auth/oauth2service'
import BottomNav from './components/layout/BottomNav.vue'

const authStore = useAuthStore()

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

onMounted(() => {
  // Check authentication status on startup
  authStore.checkAuth().catch(err => {
    console.error('Initial auth check failed:', err)
  })

  // Listen for OAuth callback from the localhost server
  Events.On('oauth:callback', (eventData: any) => {
    const code = eventData?.data?.code ?? eventData?.code
    console.log('[Miku App] OAuth callback received, code length:', code?.length)
    if (code) {
      authStore.handleCallback(code).catch((err: unknown) => {
        console.error('[Miku App] handleCallback failed:', err)
      })
    }
  })

  // Fallback: check for pending code stored by Go backend
  Events.On('common:WindowFocus', () => {
    checkPendingCode()
  })
})
</script>

<template>
  <div class="app-container">
    <main class="main-content">
      <RouterView />
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
