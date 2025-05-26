'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function useRFIDListener() {
  const router = useRouter()

  useEffect(() => {
    const simulateHardwareRFID = setTimeout(() => {
      console.log('[HW] RFID card detected!')
      router.push('/products')
    }, 5000)

    return () => clearTimeout(simulateHardwareRFID)
  }, [router])
}
