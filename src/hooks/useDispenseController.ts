'use client'

export function useDispenseController(onSuccess: () => void) {
  const start = () => {
    console.log('[HW] Starting simulated dispense...')
    setTimeout(() => {
      console.log('[HW] Dispense complete')
      onSuccess()
    }, 3000)
  }

  return { start }
}
