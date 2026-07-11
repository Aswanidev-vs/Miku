import { Haptics, ImpactStyle } from '@capacitor/haptics'

/** Tactile feedback for key actions; no-ops where the plugin is unavailable. */
export function useHaptics() {
  async function impact(style: ImpactStyle = ImpactStyle.Light) {
    try {
      await Haptics.impact({ style })
    } catch {
      /* not on native / unsupported — silent */
    }
  }
  return {
    tap: () => impact(ImpactStyle.Light),
    select: () => impact(ImpactStyle.Medium),
    success: () => impact(ImpactStyle.Heavy),
  }
}
