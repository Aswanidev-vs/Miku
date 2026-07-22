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
const updateInfo = ref<UpdateInfo | null>(null)
const error = ref<string | null>(null)
const downloadedApkPath = ref<string | null>(null)

export function useUpdate() {
  const hasUpdate = computed(() => updateInfo.value?.available ?? false)
  const currentVersion = computed(() => updateInfo.value?.currentVersion ?? '')
  const latestVersion = computed(() => updateInfo.value?.latestVersion ?? '')

  async function checkForUpdate(): Promise<UpdateInfo | null> {
    await ensureLoaded()
    if (!UpdateService) return null

    checking.value = true
    checked.value = false
    error.value = null
    try {
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
    error.value = null
    try {
      const path = await UpdateService.DownloadUpdate(
        info.downloadUrl,
        (dl: number, total: number) => {
          downloaded.value = dl
          downloadTotal.value = total
          downloadProgress.value = total > 0 ? Math.round((dl / total) * 100) : 0
        }
      )
      downloadedApkPath.value = path
      return path
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Download failed'
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
    updateInfo,
    error,
    downloadedApkPath,
    hasUpdate,
    currentVersion,
    latestVersion,
    checkForUpdate,
    downloadUpdate,
    installUpdate,
    dismissUpdate,
    wasDismissedForCurrent,
    cleanupOldApks,
  }
}
