"use client"
import { useState, useEffect } from "react"
import type { GeoPoint } from "@/lib/types"

interface GeolocationState {
  position: GeoPoint | null
  error: string | null
  isLoading: boolean
}

export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    isLoading: true,
  })

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({ position: null, error: "Geolocation not supported", isLoading: false })
      return
    }
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
