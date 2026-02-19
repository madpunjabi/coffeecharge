"use client"

import { cn } from "@/lib/utils"
import { Search, ChevronRight } from "lucide-react"

interface SearchBarProps {
  className?: string
}

export function SearchBar({ className }: SearchBarProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="truncate text-sm font-medium text-foreground">Lake Tahoe</span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate text-sm font-medium text-foreground">San Francisco</span>
        </div>
      </div>
    </div>
  )
}
