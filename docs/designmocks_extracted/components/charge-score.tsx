"use client"

import { cn } from "@/lib/utils"

interface ChargeScoreProps {
  score: number
  size?: "sm" | "md"
  showLabel?: boolean
  className?: string
}

function BoltIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 16 20"
      fill="none"
      className={cn("h-4 w-3", className)}
      aria-hidden="true"
    >
      <path
        d="M9.5 1L1 11.5H8L6.5 19L15 8.5H8L9.5 1Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ChargeScore({ score, size = "md", showLabel = true, className }: ChargeScoreProps) {
  const filledCount = Math.round(score)

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className="flex items-center gap-0.5 text-cc-charge-blue" aria-label={`Charge score ${score} out of 5`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <BoltIcon key={i} filled={i < filledCount} className={i >= filledCount ? "opacity-25" : ""} />
        ))}
      </div>
      {showLabel && (
        <span className={cn(
          "font-semibold text-cc-charge-blue",
          size === "sm" ? "text-xs" : "text-sm"
        )}>
          {score.toFixed(1)}
        </span>
      )}
    </div>
  )
}
