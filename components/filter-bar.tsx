"use client"

import { cn } from "@/lib/utils"
import { filterOptions } from "@/lib/mock-data"
import { Zap, Coffee, ShoppingBag, Wifi, UtensilsCrossed, Fuel, CheckCircle2 } from "lucide-react"
import type { FilterOption } from "@/lib/types"

interface FilterBarProps {
  activeFilters: Set<string>
  onToggle: (filterId: string) => void
  className?: string
}

function FilterIcon({ filter }: { filter: FilterOption }) {
  const iconClass = "h-3.5 w-3.5"
  switch (filter.id) {
    case "ccs":
    case "chademo":
    case "nacs":
      return <Zap className={iconClass} />
    case "fast":
    case "ultrafast":
      return <Fuel className={iconClass} />
    case "starbucks":
      return <Coffee className={iconClass} />
    case "mcdonalds":
      return <UtensilsCrossed className={iconClass} />
    case "target":
      return <ShoppingBag className={iconClass} />
    case "restrooms":
      return <span className="text-xs font-bold">WC</span>
    case "wifi":
      return <Wifi className={iconClass} />
    case "grocery":
      return <ShoppingBag className={iconClass} />
    case "available":
      return <CheckCircle2 className={iconClass} />
    case "tesla":
    case "electrify-america":
    case "evgo":
      return <Zap className={iconClass} />
    default:
      return null
  }
}

export function FilterBar({ activeFilters, onToggle, className }: FilterBarProps) {
  return (
    <div className={cn("relative", className)}>
      <div
        className="flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-none"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {filterOptions.map((filter) => {
          const isActive = activeFilters.has(filter.id)
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => onToggle(filter.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-all active:scale-95",
                isActive
                  ? "border-cc-charge-blue bg-cc-charge-blue text-primary-foreground shadow-sm"
                  : "border-border bg-card text-foreground hover:bg-muted"
              )}
            >
              <FilterIcon filter={filter} />
              {filter.label}
            </button>
          )
        })}
      </div>
      {/* Fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-background to-transparent" />
    </div>
  )
}
