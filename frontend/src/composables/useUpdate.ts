import { ref, computed } from 'vue'

let UpdateService: any = null
let loaded = false

async function ensureLoaded() {
  if (loaded) return
  try {
    UpdateService = await import(
      '../../bindings/github.com/Aswanidev-vs/Miku/backend/update/updateservice'
    )
  } catch (e) {
    console.warn('[Miku] Update service bindings not available:', e)
  }
  loaded = true
}

export interface UpdateInfo {
  available: boolean
  currentVersion: string
  latestVersion: string
  downloadUrl: string
  assetName: string
  assetSize: number
  releaseName: string
}

const checking = ref(false)
const checked = ref(false)
const downloading = ref(false)
const downloadProgress = ref(0)
const downloadTotal = ref(0)
const downloaded = ref(0)
const downloadSpeed = ref(0)
const updateInfo = ref<UpdateInfo | null>(null)
const currentVersionFromBackend = ref<string>('')
const error = ref<string | null>(null)
const downloadedApkPath = ref<string | null>(null)

export function useUpdate() {
  const hasUpdate = computed(() => updateInfo.value?.available ?? false)
  const currentVersion = computed(() => updateInfo.value?.currentVersion || currentVersionFromBackend.value || '')
  const latestVersion = computed(() => updateInfo.value?.latestVersion ?? '')

  async function fetchCurrentVersion(): Promise<string> {
    await ensureLoaded()
    if (!UpdateService) return ''
    try {
      const ver = await UpdateService.GetCurrentVersion() as string
      currentVersionFromBackend.value = ver
      return ver
    } catch (e) {
      console.warn('[Miku] Failed to get current version:', e)
      return ''
    }
  }

  async function checkForUpdate(): Promise<UpdateInfo | null> {
    await ensureLoaded()
    if (!UpdateService) return null

    checking.value = true
    checked.value = false
    error.value = null
    try {
      // Fetch current version first (always works, even offline)
      await fetchCurrentVersion()
      // Then check for updates (requires network)
      const info = (await UpdateService.CheckForUpdate()) as UpdateInfo
      updateInfo.value = info
      checked.value = true
      return info
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to check for update'
      checked.value = true
      return null
    } finally {
      checking.value = false
    }
  }

  async function downloadUpdate(): Promise<string | null> {
    const info = updateInfo.value
    if (!info?.available || !info.downloadUrl) return null

    await ensureLoaded()
    if (!UpdateService) return null

    downloading.value = true
    downloadProgress.value = 0
    downloaded.value = 0
    downloadSpeed.value = 0
    error.value = null

    let lastBytes = 0
    let lastTime = Date.now()

    try {
      const path = await UpdateService.DownloadUpdate(
        info.downloadUrl,
        (dl: number, total: number) => {
          const now = Date.now()
          const elapsed = (now - lastTime) / 1000
          if (elapsed > 0.1) {
            const bytesDiff = dl - lastBytes
            downloadSpeed.value = bytesDiff / elapsed
            lastBytes = dl
            lastTime = now
          }
          downloaded.value = dl
          downloadTotal.value = total
          downloadProgress.value = total > 0 ? Math.round((dl / total) * 100) : 0
        }
      )
      downloadedApkPath.value = path
      downloadSpeed.value = 0
      return path
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Download failed'
      downloadSpeed.value = 0
      return null
    } finally {
      downloading.value = false
    }
  }

  async function installUpdate(): Promise<void> {
    if (!downloadedApkPath.value) return
    await ensureLoaded()
    if (!UpdateService) return

    try {
      await UpdateService.InstallUpdate(downloadedApkPath.value)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Install failed'
    }
  }

  function dismissUpdate() {
    if (latestVersion.value) {
      localStorage.setItem('miku-dismissed-update', latestVersion.value)
    }
    updateInfo.value = null
  }

  function wasDismissedForCurrent(): boolean {
    const dismissed = localStorage.getItem('miku-dismissed-update')
    return dismissed === updateInfo.value?.latestVersion
  }

  async function cleanupOldApks(): Promise<void> {
    await ensureLoaded()
    if (!UpdateService) return
    try {
      await UpdateService.CleanupDownloads()
    } catch (e) {
      console.warn('[Miku] Failed to cleanup old APKs:', e)
    }
  }

  return {
    checking,
    checked,
    downloading,
    downloadProgress,
    downloadTotal,
    downloaded,
    downloadSpeed,
    updateInfo,
    error,
    downloadedApkPath,
    hasUpdate,
    currentVersion,
    latestVersion,
    checkForUpdate,
    fetchCurrentVersion,
    downloadUpdate,
    installUpdate,
    dismissUpdate,
    wasDismissedForCurrent,
    cleanupOldApks,
  }
}
