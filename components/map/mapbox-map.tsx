"use client"
import { useEffect, useRef } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import type { Station } from "@/lib/types"
import { cn } from "@/lib/utils"

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

interface Props {
  stations: Station[]
  selectedStationId: string | null
  onSelectStation: (station: Station) => void
  onBoundsChange?: (bounds: mapboxgl.LngLatBounds) => void
  className?: string
}

export function MapboxMap({ stations, selectedStationId, onSelectStation, onBoundsChange, className }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const stationsRef = useRef(stations)
  stationsRef.current = stations
  // Use refs for callbacks to avoid map remounts when parent re-renders
  const onSelectRef = useRef(onSelectStation)
  onSelectRef.current = onSelectStation
  const onBoundsRef = useRef(onBoundsChange)
  onBoundsRef.current = onBoundsChange

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

  return <div ref={mapContainer} className={cn("w-full h-full", className)} />
}
