<template>
  <ion-page>
    <AppBar :title="store.name || 'Profile'" />
    <div class="profile">
      <template v-if="store.viewer">
        <img v-if="store.viewer.avatar?.large" :src="store.viewer.avatar.large" class="avatar" />
        <h1 class="name">{{ store.viewer.name }}</h1>
        <p class="sub">AniList member</p>
        <button class="logout" @click="store.logout()">Sign out</button>
      </template>
      <EmptyState v-else message="Sign in to sync your list and score">
        <button class="login" @click="goLogin">Sign in with AniList</button>
      </EmptyState>
    </div>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { IonPage } from '@ionic/vue'
import { useRouter } from 'vue-router'
import AppBar from '@/components/common/AppBar.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useUserStore } from '@/stores/user'

const store = useUserStore()
const router = useRouter()

function goLogin() {
  router.push('/tabs/login')
}
onMounted(() => store.loadViewer())
</script>

<style scoped>
.profile { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 48px 24px; text-align: center; }
.avatar { width: 96px; height: 96px; border-radius: 50%; border: 2px solid var(--accent-soft); }
.name { font-family: var(--font-display); font-weight: 800; font-size: 26px; margin: 0; color: var(--text-hi); }
.sub { margin: 0; color: var(--text-lo); font-family: var(--font-mono); font-size: 12px; }
.logout { margin-top: 12px; padding: 10px 20px; border-radius: 12px; border: 1px solid var(--hairline); background: transparent; color: var(--text-mid); cursor: pointer; }
.login { margin-top: 16px; padding: 12px 22px; border: 0; border-radius: 12px; background: var(--accent); color: #fff; font-weight: 700; cursor: pointer; }
</style>
