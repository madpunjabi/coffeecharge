"use client"

import { cn } from "@/lib/utils"
import type { Station } from "@/lib/types"

interface MapPlaceholderProps {
  stations: Station[]
  selectedStationId: string | null
  onSelectStation: (station: Station) => void
  className?: string
}

/*
  A stylized SVG map of the I-80 corridor from Lake Tahoe to San Francisco.
  Each station is rendered as a tappable pin at its approximate position
  on a simplified geographic layout.
*/

// Map stations to approximate x,y positions on a 800x500 canvas
// representing the Tahoe -> SF corridor (east to west)
function stationPosition(station: Station): { x: number; y: number } {
  const positions: Record<string, { x: number; y: number }> = {
    "truckee-sc": { x: 720, y: 120 },
    "colfax-ea": { x: 620, y: 170 },
    "auburn-cp": { x: 550, y: 200 },
    "rocklin-sc": { x: 500, y: 225 },
    "sac-midtown": { x: 430, y: 260 },
    "davis-cp": { x: 360, y: 270 },
    "vacaville-sc": { x: 290, y: 290 },
    "fairfield-ea": { x: 230, y: 310 },
    "vallejo-cp": { x: 160, y: 340 },
    "berkeley-sc": { x: 90, y: 370 },
  }
  return positions[station.id] || { x: 400, y: 250 }
}

const reliabilityColor: Record<string, string> = {
  high: "#2E7D32",
  medium: "#E65100",
  low: "#C62828",
}

export function MapPlaceholder({ stations, selectedStationId, onSelectStation, className }: MapPlaceholderProps) {
  // Build route path through stations in order
  const orderedStations = [...stations].sort((a, b) => {
    const posA = stationPosition(a)
    const posB = stationPosition(b)
    return posB.x - posA.x
  })

  const routePoints = orderedStations.map((s) => stationPosition(s))
  const routePath = routePoints.reduce((path, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`
    const prevPt = routePoints[i - 1]
    const cpx1 = prevPt.x - (prevPt.x - pt.x) * 0.3
    const cpy1 = prevPt.y
    const cpx2 = pt.x + (prevPt.x - pt.x) * 0.3
    const cpy2 = pt.y
    return `${path} C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${pt.x} ${pt.y}`
  }, "")

  return (
    <div className={cn("relative w-full overflow-hidden rounded-2xl", className)}>
      <svg
        viewBox="0 0 800 500"
        className="h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label="Map showing EV charging stations along the I-80 corridor from Lake Tahoe to San Francisco"
      >
        <defs>
          {/* Terrain gradient */}
          <linearGradient id="terrain" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E8F5E9" />
            <stop offset="40%" stopColor="#FFF8E1" />
            <stop offset="70%" stopColor="#F1F8E9" />
            <stop offset="100%" stopColor="#E3F2FD" />
          </linearGradient>

          {/* Mountain pattern */}
          <pattern id="mountains" x="0" y="0" width="120" height="80" patternUnits="userSpaceOnUse">
            <polygon points="0,80 30,30 60,80" fill="#C8E6C9" opacity="0.3" />
            <polygon points="40,80 70,20 100,80" fill="#A5D6A7" opacity="0.25" />
            <polygon points="80,80 110,35 140,80" fill="#C8E6C9" opacity="0.2" />
          </pattern>

          {/* Water */}
          <pattern id="water" x="0" y="0" width="40" height="10" patternUnits="userSpaceOnUse">
            <path d="M0 5 Q10 2 20 5 Q30 8 40 5" fill="none" stroke="#90CAF9" strokeWidth="0.5" opacity="0.4" />
          </pattern>

          {/* Selected pin glow */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Route dash */}
          <filter id="routeShadow">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#1565C0" floodOpacity="0.2" />
          </filter>
        </defs>

        {/* Background */}
        <rect width="800" height="500" fill="url(#terrain)" />

        {/* Mountain region (Tahoe side) */}
        <rect x="600" y="0" width="200" height="250" fill="url(#mountains)" />
        <rect x="650" y="20" width="150" height="200" fill="url(#mountains)" opacity="0.5" />

        {/* Lake Tahoe */}
        <ellipse cx="760" cy="95" rx="35" ry="50" fill="#BBDEFB" opacity="0.5" />
        <ellipse cx="760" cy="95" rx="35" ry="50" fill="url(#water)" />

        {/* Sacramento River region */}
        <path d="M 450 200 Q 420 250 430 310 Q 440 360 420 400 Q 400 450 380 500" 
              fill="none" stroke="#90CAF9" strokeWidth="8" opacity="0.2" />

        {/* SF Bay */}
        <path d="M 30 300 Q 60 350 50 400 Q 40 440 80 480 Q 120 500 60 500 L 0 500 L 0 300 Z"
              fill="#BBDEFB" opacity="0.3" />
        <path d="M 30 300 Q 60 350 50 400 Q 40 440 80 480"
              fill="none" stroke="#90CAF9" strokeWidth="3" opacity="0.3" />

        {/* City labels */}
        <text x="740" y="60" className="fill-muted-foreground text-[11px] font-sans" opacity="0.5" textAnchor="middle">Lake Tahoe</text>
        <text x="430" y="245" className="fill-muted-foreground text-[11px] font-sans" opacity="0.5" textAnchor="middle">Sacramento</text>
        <text x="70" y="355" className="fill-muted-foreground text-[11px] font-sans" opacity="0.5" textAnchor="middle">Berkeley</text>
        <text x="25" y="295" className="fill-muted-foreground text-[11px] font-sans" opacity="0.5" textAnchor="middle">SF</text>

        {/* I-80 label */}
        <text x="400" y="200" className="fill-foreground text-[13px] font-sans font-semibold" opacity="0.15" textAnchor="middle">I-80</text>

        {/* Route line */}
        <path
          d={routePath}
          fill="none"
          stroke="#1565C0"
          strokeWidth="3"
          strokeDasharray="8 4"
          opacity="0.4"
          filter="url(#routeShadow)"
        />
        <path
          d={routePath}
          fill="none"
          stroke="#1565C0"
          strokeWidth="1.5"
          opacity="0.6"
        />

        {/* Station pins */}
        {orderedStations.map((station) => {
          const pos = stationPosition(station)
          const isSelected = station.id === selectedStationId
          const pinColor = reliabilityColor[station.reliability]

          return (
            <g
              key={station.id}
              className="cursor-pointer"
              onClick={() => onSelectStation(station)}
              role="button"
              tabIndex={0}
              aria-label={`${station.name} - Score ${station.ccScore}`}
              onKeyDown={(e) => { if (e.key === "Enter") onSelectStation(station) }}
            >
              {/* Selection ring */}
              {isSelected && (
                <>
                  <circle cx={pos.x} cy={pos.y} r="20" fill={pinColor} opacity="0.15" filter="url(#glow)">
                    <animate attributeName="r" values="18;24;18" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.15;0.08;0.15" dur="2s" repeatCount="indefinite" />
                  </circle>
                </>
              )}

              {/* Pin body */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={isSelected ? "10" : "7"}
                fill={pinColor}
                stroke="#FFFFFF"
                strokeWidth="2.5"
                className="transition-all duration-200"
              />

              {/* Bolt icon inside pin */}
              <path
                d={`M ${pos.x + 1} ${pos.y - 3.5} L ${pos.x - 2} ${pos.y + 0.5} H ${pos.x + 0.5} L ${pos.x - 1} ${pos.y + 3.5} L ${pos.x + 2} ${pos.y - 0.5} H ${pos.x - 0.5} Z`}
                fill="#FFFFFF"
                opacity="0.9"
              />

              {/* Label */}
              {isSelected && (
                <g>
                  <rect
                    x={pos.x - 45}
                    y={pos.y - 32}
                    width="90"
                    height="18"
                    rx="9"
                    fill="#212121"
                    opacity="0.85"
                  />
                  <text
                    x={pos.x}
                    y={pos.y - 20}
                    textAnchor="middle"
                    className="fill-white text-[10px] font-sans font-medium"
                  >
                    {station.city} - {station.ccScore}
                  </text>
                </g>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
