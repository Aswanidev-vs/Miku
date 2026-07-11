<template>
  <ion-page>
    <ion-router-outlet />
    <ion-tabs>
      <ion-router-outlet />
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="home" href="/tabs/home">
          <ion-icon :icon="home" /><ion-label>Home</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="search" href="/tabs/search">
          <ion-icon :icon="search" /><ion-label>Search</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="list" href="/tabs/list">
          <ion-icon :icon="list" /><ion-label>My List</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="social" href="/tabs/social">
          <ion-icon :icon="people" /><ion-label>Social</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="profile" href="/tabs/profile">
          <ion-icon :icon="person" /><ion-label>Profile</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
} from '@ionic/vue'
import { home, search, list, people, person } from 'ionicons/icons'
</script>

<style scoped>
ion-tab-bar {
  --border: 1px solid var(--hairline);
  background: color-mix(in srgb, var(--bg-surface) 88%, transparent);
  backdrop-filter: blur(14px);
  padding-bottom: env(safe-area-inset-bottom);
}
ion-tab-button {
  --color-selected: var(--accent);
  --color: var(--text-lo);
}
</style>
