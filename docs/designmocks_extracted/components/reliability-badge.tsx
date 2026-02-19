"use client"

import { cn } from "@/lib/utils"
import type { ReliabilityLevel } from "@/lib/types"

interface ReliabilityBadgeProps {
  level: ReliabilityLevel
  className?: string
}

const config: Record<ReliabilityLevel, { label: string; dotClass: string; textClass: string; bgClass: string }> = {
  high: {
    label: "Reliable",
    dotClass: "bg-cc-brew-green",
    textClass: "text-cc-brew-green",
    bgClass: "bg-cc-brew-green/10",
  },
  medium: {
    label: "Moderate",
    dotClass: "bg-cc-caution-amber",
    textClass: "text-cc-caution-amber",
    bgClass: "bg-cc-caution-amber/10",
  },
  low: {
    label: "Unreliable",
    dotClass: "bg-cc-alert-red",
    textClass: "text-cc-alert-red",
    bgClass: "bg-cc-alert-red/10",
  },
}

export function ReliabilityBadge({ level, className }: ReliabilityBadgeProps) {
  const c = config[level]

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        c.bgClass,
        c.textClass,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dotClass)} aria-hidden="true" />
      {c.label}
    </span>
  )
}
