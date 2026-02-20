"use client"
import { useState, useEffect } from "react"
import type { GeoPoint } from "@/lib/types"

interface GeolocationState {
  position: GeoPoint | null
  error: string | null
  isLoading: boolean
}

export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>(() => {
    // Lazy initializer avoids a synchronous setState on mount when unsupported
    const supported = typeof navigator !== "undefined" && !!navigator.geolocation
    return { position: null, error: supported ? null : "Geolocation not supported", isLoading: supported }
  })

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setState({
        position: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        error: null,
        isLoading: false,
      }),
      (err) => setState({ position: null, error: err.message, isLoading: false })
    )
  }, [])

  return state
}
