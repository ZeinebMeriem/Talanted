import * as React from "react"
import { cn } from "@/lib/utils"

const TooltipProvider = ({ children }: { children?: React.ReactNode }) => <>{children}</>

interface TooltipContextValue { open: boolean; setOpen: (o: boolean) => void }
const TooltipContext = React.createContext<TooltipContextValue>({ open: false, setOpen: () => {} })

const Tooltip = ({ children }: { children?: React.ReactNode }) => {
  const [open, setOpen] = React.useState(false)
  return <TooltipContext.Provider value={{ open, setOpen }}><div className="relative inline-flex">{children}</div></TooltipContext.Provider>
}

const TooltipTrigger = ({ children, asChild }: { children?: React.ReactNode; asChild?: boolean }) => {
  const { setOpen } = React.useContext(TooltipContext)
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, { onMouseEnter: () => setOpen(true), onMouseLeave: () => setOpen(false) })
  }
  return <span onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>{children}</span>
}

const TooltipContent = ({ className, children, sideOffset = 4 }: { className?: string; children?: React.ReactNode; sideOffset?: number }) => {
  const { open } = React.useContext(TooltipContext)
  if (!open) return null
  return (
    <div style={{ bottom: `calc(100% + ${sideOffset}px)` }} className={cn("absolute left-1/2 z-50 -translate-x-1/2 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md whitespace-nowrap", className)}>
      {children}
    </div>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
