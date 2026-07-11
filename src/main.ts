import { createApp } from 'vue'
import { IonicVue } from '@ionic/vue'
import App from '@/App.vue'
import router from '@/router'
import { createPinia } from 'pinia'
import '@ionic/vue/css/core.css'
import '@ionic/vue/css/normalize.css'
import '@ionic/vue/css/structure.css'
import '@ionic/vue/css/typography.css'
import './theme/variables.css'

const app = createApp(App)
  .use(IonicVue, { mode: 'md' })
  .use(createPinia())
  .use(router)

router.isReady().then(() => app.mount('#app'))
