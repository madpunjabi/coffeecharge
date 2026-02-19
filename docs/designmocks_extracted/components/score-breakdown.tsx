"use client"

import { cn } from "@/lib/utils"
import type { ChargeScore as ChargeScoreType, BrewScore as BrewScoreType } from "@/lib/types"
import { useState } from "react"
import { ChevronDown } from "lucide-react"

interface ScoreBreakdownProps {
  type: "charge" | "brew"
  chargeScore?: ChargeScoreType
  brewScore?: BrewScoreType
  className?: string
}

const chargeLabels: { key: keyof ChargeScoreType; label: string; description: string }[] = [
  { key: "uptimeHistory", label: "Uptime History", description: "Historical reliability over 90 days" },
  { key: "realTimeAvailability", label: "Real-time Availability", description: "Current stall availability" },
  { key: "communityVerification", label: "Community Reports", description: "Recent check-ins and reports" },
  { key: "networkBenchmark", label: "Network Benchmark", description: "Performance vs. network average" },
]

const brewLabels: { key: keyof BrewScoreType; label: string; description: string }[] = [
  { key: "foodOptions", label: "Food Options", description: "Quality and variety of dining" },
  { key: "restroomAccess", label: "Restroom Access", description: "Clean, accessible facilities" },
  { key: "retailQuality", label: "Retail Quality", description: "Nearby shopping options" },
  { key: "venueQuality", label: "Venue Quality", description: "Ambiance and comfort" },
  { key: "environment", label: "Environment", description: "Safety, lighting, and walkability" },
  { key: "hoursCoverage", label: "Hours Coverage", description: "Availability during travel times" },
]

function ScoreBar({ value, maxValue = 5, color }: { value: number; maxValue?: number; color: string }) {
  const percentage = (value / maxValue) * 100
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-7 text-right text-xs font-semibold tabular-nums text-foreground">
        {value.toFixed(1)}
      </span>
    </div>
  )
}

export function ScoreBreakdown({ type, chargeScore, brewScore, className }: ScoreBreakdownProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const items = type === "charge" ? chargeLabels : brewLabels
  const score = type === "charge" ? chargeScore : brewScore
  const color = type === "charge" ? "bg-cc-charge-blue" : "bg-cc-brew-green"
  const textColor = type === "charge" ? "text-cc-charge-blue" : "text-cc-brew-green"
  const bgColor = type === "charge" ? "bg-cc-charge-blue/5" : "bg-cc-brew-green/5"
  const title = type === "charge" ? "Charge Confidence" : "Brew Score"

  if (!score) return null

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border", bgColor, className)}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/30"
      >
        <div className="flex items-center gap-2">
          <span className={cn("text-sm font-semibold", textColor)}>{title}</span>
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", color, "text-white")}>
            {score.overall.toFixed(1)}/5
          </span>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            isExpanded && "rotate-180"
          )}
        />
      </button>

      {isExpanded && (
        <div className="space-y-3 px-4 pb-4">
          {items.map((item) => {
            const key = item.key as string
            const value = (score as Record<string, number>)[key]
            if (key === "overall" || value === undefined) return null
            return (
              <div key={key}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">{item.label}</span>
                </div>
                <ScoreBar value={value} color={color} />
                <p className="mt-0.5 text-[10px] text-muted-foreground">{item.description}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
