import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import('@/layouts/TabsLayout.vue'),
    children: [
      { path: '', redirect: '/tabs/home' },
      { path: 'tabs/home', name: 'home', component: () => import('@/pages/Home.vue') },
      { path: 'tabs/search', name: 'search', component: () => import('@/pages/Search.vue') },
      { path: 'tabs/list', name: 'list', component: () => import('@/pages/MyList.vue') },
      { path: 'tabs/social', name: 'social', component: () => import('@/pages/Social.vue') },
      { path: 'tabs/profile', name: 'profile', component: () => import('@/pages/Profile.vue') },
      { path: 'tabs/login', name: 'login', component: () => import('@/pages/Login.vue') },
    ],
  },
  { path: '/media/:id', name: 'media-detail', component: () => import('@/pages/MediaDetail.vue') },
]

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})
