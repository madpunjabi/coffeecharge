"use client"

import { cn } from "@/lib/utils"
import type { Amenity } from "@/lib/types"
import { Clock, MapPin, Star } from "lucide-react"

interface AmenityListProps {
  amenities: Amenity[]
  compact?: boolean
  className?: string
}

const categoryIcons: Record<string, string> = {
  coffee: "C",
  food: "F",
  grocery: "G",
  retail: "R",
  restroom: "WC",
  hotel: "H",
  gas: "G",
}

const categoryColors: Record<string, { bg: string; text: string }> = {
  coffee: { bg: "bg-cc-warm-brown/15", text: "text-cc-warm-brown" },
  food: { bg: "bg-cc-caution-amber/15", text: "text-cc-caution-amber" },
  grocery: { bg: "bg-cc-brew-green/15", text: "text-cc-brew-green" },
  retail: { bg: "bg-cc-charge-blue/15", text: "text-cc-charge-blue" },
  restroom: { bg: "bg-muted", text: "text-muted-foreground" },
  hotel: { bg: "bg-cc-gold/15", text: "text-cc-gold" },
  gas: { bg: "bg-muted", text: "text-muted-foreground" },
}

function AmenityIcon({ category }: { category: string }) {
  const colors = categoryColors[category] || categoryColors.restroom
  return (
    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold", colors.bg, colors.text)}>
      {categoryIcons[category] || "?"}
    </div>
  )
}

export function AmenityList({ amenities, compact = false, className }: AmenityListProps) {
  if (compact) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        {amenities.slice(0, 3).map((amenity) => (
          <div
            key={amenity.id}
            className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5"
            title={`${amenity.name} - ${amenity.walkMinutes} min walk`}
          >
            <span className="text-[10px] font-medium text-foreground">{amenity.brand}</span>
            <span className="text-[10px] text-muted-foreground">{amenity.walkMinutes}m</span>
          </div>
        ))}
        {amenities.length > 3 && (
          <span className="text-[10px] font-medium text-muted-foreground">+{amenities.length - 3}</span>
        )}
      </div>
    )
  }

  return (
    <div className={cn("space-y-1", className)}>
      {amenities.map((amenity) => (
        <div
          key={amenity.id}
          className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2.5 transition-colors hover:bg-muted"
        >
          <AmenityIcon category={amenity.category} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-foreground">{amenity.name}</span>
              {amenity.isOpenNow && (
                <span className="shrink-0 rounded-full bg-cc-brew-green/15 px-1.5 py-0.5 text-[10px] font-semibold text-cc-brew-green">
                  Open
                </span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-0.5">
                <MapPin className="h-3 w-3" aria-hidden="true" />
                {amenity.walkMinutes} min walk
              </span>
              <span className="flex items-center gap-0.5">
                <Star className="h-3 w-3" aria-hidden="true" />
                {amenity.rating}
              </span>
              <span className="flex items-center gap-0.5">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {amenity.hours}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
