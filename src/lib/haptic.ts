/**
 * Safely triggers a short haptic vibration on supported devices.
 * Uses a default light tick duration of 15ms.
 */
export function haptic(pattern: number | number[] = 15) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (err) {
      // Gracefully swallow errors (e.g. security permission restrictions in frame contexts)
    }
  }
}
