<template>
  <ion-page>
    <AppBar title="Sign in" />
    <div class="login">
      <img src="/logo.svg" alt="Miku logo" class="logo" />
      <p class="lede">A faster, denser AniList for Android.</p>
      <button class="cta" :disabled="busy" @click="authorize">
        {{ busy ? 'Opening AniList…' : 'Continue with AniList' }}
      </button>
      <p v-if="error" class="err">{{ error }}</p>
    </div>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { IonPage } from '@ionic/vue'
import { useRouter } from 'vue-router'
import AppBar from '@/components/common/AppBar.vue'
import { generatePkce, buildAuthorizeUrl, ANILIST_AUTH } from '@/data/auth/pkce'
import { tokenStore } from '@/data/auth/tokenStore'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const busy = ref(false)
const error = ref('')

async function authorize() {
  busy.value = true
  try {
    const { verifier, challenge } = await generatePkce()
    tokenStore.setVerifier(verifier)
    window.location.href = buildAuthorizeUrl(challenge)
  } catch {
    error.value = 'Could not start login.'
    busy.value = false
  }
}

/** Exchange the returned `code` for an access token (PKCE). */
async function exchange(code: string) {
  const verifier = tokenStore.getVerifier()
  if (!verifier) throw new Error('missing verifier')
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: ANILIST_AUTH.clientId,
    code,
    code_verifier: verifier,
    redirect_uri: ANILIST_AUTH.redirectUri,
  })
  const res = await fetch(ANILIST_AUTH.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  const json = (await res.json()) as { access_token: string }
  if (!json.access_token) throw new Error('no token')
  // Resolve viewer id, then persist session.
  const viewer = await (
    await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${json.access_token}`,
      },
      body: JSON.stringify({ query: 'query { Viewer { id } }' }),
    })
  ).json()
  const userId = viewer?.data?.Viewer?.id as number
  auth.setSession(json.access_token, userId)
  tokenStore.clearVerifier()
}

onMounted(async () => {
  const code = new URLSearchParams(window.location.search).get('code')
  if (!code) return
  busy.value = true
  try {
    await exchange(code)
    router.replace('/tabs/profile')
  } catch {
    error.value = 'Login failed. Try again.'
  } finally {
    busy.value = false
  }
})
</script>

<style scoped>
.login { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; min-height: 70vh; padding: 24px; text-align: center; }
.logo { width: 120px; height: 120px; border-radius: 28px; filter: drop-shadow(0 4px 24px var(--accent-glow)); }
.lede { color: var(--text-mid); font-family: var(--font-body); margin: 0; }
.cta { margin-top: 12px; padding: 14px 26px; border: 0; border-radius: 14px; background: var(--accent); color: #fff; font-weight: 700; font-size: 15px; cursor: pointer; }
.cta:disabled { opacity: .6; }
.err { color: var(--accent); font-size: 13px; }
</style>
