import { ref, computed, onMounted, onUnmounted } from 'vue'

const platform = ref<{
  os: string
  isDesktop: boolean
  isMobile: boolean
  isTouch: boolean
  hasHover: boolean
} | null>(null)

const screenWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)
const screenHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 768)

function detectPlatform() {
  const ua = navigator.userAgent.toLowerCase()
  const isAndroid = /android/.test(ua)
  const isIOS = /iphone|ipad|ipod/.test(ua)
  const isMobile = isAndroid || isIOS

  let os = 'linux'
  if (/windows/.test(ua)) os = 'windows'
  else if (/macintosh|mac os/.test(ua)) os = 'darwin'
  else if (isAndroid) os = 'android'
  else if (isIOS) os = 'ios'

  return {
    os,
    isDesktop: !isMobile,
    isMobile,
    isTouch: isMobile || ('ontouchstart' in window),
    hasHover: !isMobile && !('ontouchstart' in window),
  }
}

function onResize() {
  screenWidth.value = window.innerWidth
  screenHeight.value = window.innerHeight
}

export function usePlatform() {
  if (!platform.value) {
    platform.value = detectPlatform()
  }

  onMounted(() => {
    window.addEventListener('resize', onResize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', onResize)
  })

  const os = computed(() => platform.value?.os || 'unknown')
  const isDesktop = computed(() => platform.value?.isDesktop ?? true)
  const isMobile = computed(() => platform.value?.isMobile ?? false)
  const isTouch = computed(() => platform.value?.isTouch ?? false)
  const hasHover = computed(() => platform.value?.hasHover ?? true)

  const screenSmall = computed(() => screenWidth.value < 640)
  const screenMedium = computed(() => screenWidth.value >= 640 && screenWidth.value < 1024)
  const screenLarge = computed(() => screenWidth.value >= 1024)

  const gridColumns = computed(() => {
    if (screenSmall.value) return 3
    if (screenMedium.value) return 4
    return 5
  })

  const cardSize = computed(() => {
    if (screenSmall.value) return 'sm'
    if (screenMedium.value) return 'md'
    return 'lg'
  })

  return {
    platform,
    os,
    isDesktop,
    isMobile,
    isTouch,
    hasHover,
    screenSmall,
    screenMedium,
    screenLarge,
    screenWidth,
    screenHeight,
    gridColumns,
    cardSize,
  }
}
