"use client"

import { Component, type ReactNode } from "react"
import { MapPin } from "lucide-react"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class MapErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 bg-muted/20 text-center">
          <MapPin className="h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
          <p className="text-sm font-medium text-muted-foreground">Map failed to load</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="text-xs font-medium text-cc-charge-blue hover:underline"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
