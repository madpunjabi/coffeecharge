"use client"

import { cn } from "@/lib/utils"

interface BrewScoreProps {
  score: number
  size?: "sm" | "md"
  showLabel?: boolean
  className?: string
}

function CupIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 18 20"
      fill="none"
      className={cn("h-4 w-3.5", className)}
      aria-hidden="true"
    >
      <path
        d="M2 6H13V14C13 15.6569 11.6569 17 10 17H5C3.34315 17 2 15.6569 2 14V6Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <path
        d="M13 8H14.5C15.8807 8 17 9.11929 17 10.5C17 11.8807 15.8807 13 14.5 13H13"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 3C5 3 5.5 1 7.5 1C9.5 1 10 3 10 3"
        stroke="currentColor"
        strokeWidth={1.2}
        strokeLinecap="round"
        opacity={filled ? 0.6 : 0.2}
      />
    </svg>
  )
}

export function BrewScore({ score, size = "md", showLabel = true, className }: BrewScoreProps) {
  const filledCount = Math.round(score)

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className="flex items-center gap-0.5 text-cc-brew-green" aria-label={`Brew score ${score} out of 5`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <CupIcon key={i} filled={i < filledCount} className={i >= filledCount ? "opacity-25" : ""} />
        ))}
      </div>
      {showLabel && (
        <span className={cn(
          "font-semibold text-cc-brew-green",
          size === "sm" ? "text-xs" : "text-sm"
        )}>
          {score.toFixed(1)}
        </span>
      )}
    </div>
  )
}
