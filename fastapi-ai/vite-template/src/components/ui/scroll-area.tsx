import * as React from "react"
import { cn } from "@/lib/utils"

const ScrollArea = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("relative overflow-auto", className)} {...props}>
      {children}
    </div>
  )
)
ScrollArea.displayName = "ScrollArea"

const ScrollBar = ({ className, orientation = "vertical" }: { className?: string; orientation?: "vertical" | "horizontal" }) => (
  <div className={cn("flex touch-none select-none transition-colors", orientation === "vertical" ? "h-full w-2.5 border-l border-l-transparent p-[1px]" : "h-2.5 flex-col border-t border-t-transparent p-[1px]", className)} />
)

export { ScrollArea, ScrollBar }
