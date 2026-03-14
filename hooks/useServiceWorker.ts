'use client'

import { useEffect } from 'react'

export function useServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.register('/sw.js').then((registration) => {
      console.log('Service Worker registered:', registration)
    }).catch((error) => {
      console.error('Service Worker registration failed:', error)
    })
  }, [])
}
