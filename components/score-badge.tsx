"use client"

import { cn } from "@/lib/utils"
import { getScoreTier } from "@/lib/types"

interface ScoreBadgeProps {
  score: number
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
  className?: string
}

export function ScoreBadge({ score, size = "md", showLabel = true, className }: ScoreBadgeProps) {
  const tier = getScoreTier(score)

  const colorMap: Record<string, { bg: string; text: string; ring: string }> = {
    "cc-gold": { bg: "bg-cc-gold/15", text: "text-cc-gold", ring: "ring-cc-gold/30" },
    "cc-charge-blue": { bg: "bg-cc-charge-blue/10", text: "text-cc-charge-blue", ring: "ring-cc-charge-blue/20" },
    "cc-brew-green": { bg: "bg-cc-brew-green/10", text: "text-cc-brew-green", ring: "ring-cc-brew-green/20" },
    "cc-caution-amber": { bg: "bg-cc-caution-amber/10", text: "text-cc-caution-amber", ring: "ring-cc-caution-amber/20" },
    "cc-alert-red": { bg: "bg-cc-alert-red/10", text: "text-cc-alert-red", ring: "ring-cc-alert-red/20" },
  }

  const colors = colorMap[tier.color] || colorMap["cc-charge-blue"]

  const sizeClasses = {
    sm: "px-2 py-1",
    md: "px-3 py-1.5",
    lg: "px-4 py-2",
  }

  const scoreSizeClasses = {
    sm: "text-base font-bold",
    md: "text-xl font-bold",
    lg: "text-3xl font-extrabold",
  }

  const labelSizeClasses = {
    sm: "text-[10px]",
    md: "text-xs",
    lg: "text-sm",
  }

  return (
    <div
      className={cn(
        "inline-flex flex-col items-center rounded-xl ring-1",
        colors.bg,
        colors.ring,
        sizeClasses[size],
        className
      )}
    >
      <div className="flex items-baseline gap-0.5">
        <span className={cn(scoreSizeClasses[size], colors.text)}>
          {score.toFixed(1)}
        </span>
        <span className={cn("font-medium opacity-50", colors.text, labelSizeClasses[size])}>
          /10
        </span>
      </div>
      {showLabel && (
        <span className={cn("font-semibold uppercase tracking-wider", colors.text, labelSizeClasses[size])}>
          {tier.label}
        </span>
      )}
    </div>
  )
}
