"use client"
import { useEffect, useLayoutEffect, useRef } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import type GeoJSON from "geojson"
import type { Station } from "@/lib/types"
import { cn } from "@/lib/utils"

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

interface Props {
  stations: Station[]
  selectedStationId: string | null
  onSelectStation: (station: Station) => void
  onBoundsChange?: (bounds: mapboxgl.LngLatBounds) => void
  userPosition?: { lat: number; lng: number } | null
  flyToRef?: React.MutableRefObject<((lat: number, lng: number) => void) | null>
  routeGeometry?: GeoJSON.LineString | null
  className?: string
}

export function MapboxMap({ stations, selectedStationId, onSelectStation, onBoundsChange, userPosition, flyToRef, routeGeometry, className }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const stationsRef = useRef(stations)
  const onSelectRef = useRef(onSelectStation)
  const onBoundsRef = useRef(onBoundsChange)
  // Use refs for callbacks to avoid map remounts when parent re-renders
  useLayoutEffect(() => { stationsRef.current = stations }, [stations])
  useLayoutEffect(() => { onSelectRef.current = onSelectStation }, [onSelectStation])
  useLayoutEffect(() => { onBoundsRef.current = onBoundsChange }, [onBoundsChange])

  useEffect(() => {
    if (map.current || !mapContainer.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-98.5795, 39.8283],  // Center of US
      zoom: 4,
    })

    map.current.on("load", () => {
      // Add GeoJSON source
      map.current!.addSource("stations", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 12,
        clusterRadius: 50,
      })

      // Cluster circles
      map.current!.addLayer({
        id: "clusters",
        type: "circle",
        source: "stations",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#1565C0",
          "circle-radius": ["step", ["get", "point_count"], 20, 10, 28, 50, 36],
          "circle-opacity": 0.85,
        },
      })

      // Cluster count labels
      map.current!.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "stations",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-size": 12,
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
        },
        paint: { "text-color": "#ffffff" },
      })

      // Route line source (empty initially)
      map.current!.addSource("route", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      })

      // Route line layer — drawn below station pins
      map.current!.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#1565C0",
          "line-width": 4,
          "line-opacity": 0.7,
        },
      }, "clusters") // insert below cluster/station layers so pins appear on top

      // Individual station pins
      map.current!.addLayer({
        id: "stations-layer",
        type: "circle",
        source: "stations",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["case",
            ["==", ["get", "reliability"], "high"], "#2E7D32",
            ["==", ["get", "reliability"], "medium"], "#E65100",
            "#C62828"
          ],
          "circle-radius": 8,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      })

      // Click handler
      map.current!.on("click", "stations-layer", (e) => {
        const stationId = e.features?.[0]?.properties?.stationId
        if (!stationId) return
        const station = stationsRef.current.find(s => s.id === stationId)
        if (station) onSelectRef.current(station)
      })

      map.current!.on("moveend", () => {
        onBoundsRef.current?.(map.current!.getBounds()!)
      })

      // Fire initial bounds once the map has finished its first render
      map.current!.once("idle", () => {
        onBoundsRef.current?.(map.current!.getBounds()!)
      })
    })

    return () => { map.current?.remove(); map.current = null }
  }, [])

  // Expose flyTo function via ref so parent can trigger centering
  useLayoutEffect(() => {
    if (!flyToRef) return
    flyToRef.current = (lat: number, lng: number) => {
      map.current?.flyTo({ center: [lng, lat], zoom: 11, duration: 800 })
    }
    return () => { if (flyToRef) flyToRef.current = null }
  }, [flyToRef])

  // Update user location dot when position changes
  useEffect(() => {
    if (!map.current || !userPosition) return
    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat([userPosition.lng, userPosition.lat])
    } else {
      const el = document.createElement("div")
      el.style.cssText =
        "width:16px;height:16px;background:#1565C0;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3)"
      userMarkerRef.current = new mapboxgl.Marker(el)
        .setLngLat([userPosition.lng, userPosition.lat])
        .addTo(map.current)
    }
  }, [userPosition])

  // Update GeoJSON when stations change
  useEffect(() => {
    const source = map.current?.getSource("stations") as mapboxgl.GeoJSONSource | undefined
    if (!source) return
    source.setData({
      type: "FeatureCollection",
      features: stations.map(s => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [s.lng, s.lat] },
        properties: { stationId: s.id, ccScore: s.ccScore, reliability: s.reliability },
      })),
    })
  }, [stations])

  // Update route line when routeGeometry changes
  useEffect(() => {
    const source = map.current?.getSource("route") as mapboxgl.GeoJSONSource | undefined
    if (!source) return
    if (routeGeometry) {
      source.setData({ type: "Feature", geometry: routeGeometry, properties: {} })
      // Fit map to route bounds
      const coords = routeGeometry.coordinates as [number, number][]
      const bounds = coords.reduce(
        (b, c) => b.extend(c as [number, number]),
        new mapboxgl.LngLatBounds(coords[0], coords[0])
      )
      map.current?.fitBounds(bounds, { padding: 60, duration: 800 })
    } else {
      source.setData({ type: "FeatureCollection", features: [] })
    }
  }, [routeGeometry])

  return <div ref={mapContainer} className={cn("w-full h-full", className)} />
}
