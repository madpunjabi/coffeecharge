"use client"
import { cn } from "@/lib/utils"

const RADIUS_OPTIONS = [25, 50, 100, 150, 200]

interface Props {
  value: number
  onChange: (miles: number) => void
}

export function RangeSlider({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <span className="text-xs text-muted-foreground shrink-0">Range</span>
      <div className="flex gap-1.5">
        {RADIUS_OPTIONS.map(mi => (
          <button
            key={mi}
            type="button"
            onClick={() => onChange(mi)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium transition-all active:scale-95",
              value === mi
                ? "bg-cc-charge-blue text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {mi}mi
          </button>
        ))}
      </div>
    </div>
  )
}
