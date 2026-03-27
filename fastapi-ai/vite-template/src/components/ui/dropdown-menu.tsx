import * as React from "react"
import { cn } from "@/lib/utils"

interface DropdownContextValue { open: boolean; setOpen: (o: boolean) => void }
const DropdownContext = React.createContext<DropdownContextValue>({ open: false, setOpen: () => {} })

const DropdownMenu = ({ children }: { children?: React.ReactNode }) => {
  const [open, setOpen] = React.useState(false)
  React.useEffect(() => {
    if (!open) return
    const handler = () => setOpen(false)
    document.addEventListener("click", handler, { capture: true, once: true })
    return () => document.removeEventListener("click", handler, { capture: true })
  }, [open])
  return <DropdownContext.Provider value={{ open, setOpen }}><div className="relative inline-block">{children}</div></DropdownContext.Provider>
}

const DropdownMenuTrigger = ({ children, asChild }: { children?: React.ReactNode; asChild?: boolean }) => {
  const { setOpen, open } = React.useContext(DropdownContext)
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, { onClick: (e: React.MouseEvent) => { e.stopPropagation(); setOpen(!open) } })
  }
  return <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(!open) }}>{children}</button>
}

const DropdownMenuContent = ({ className, children, align = "start" }: { className?: string; children?: React.ReactNode; align?: "start" | "end" | "center"; sideOffset?: number }) => {
  const { open } = React.useContext(DropdownContext)
  if (!open) return null
  return (
    <div className={cn("absolute z-50 mt-1 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md", align === "end" ? "right-0" : "left-0", className)}>
      {children}
    </div>
  )
}

const DropdownMenuItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { inset?: boolean; disabled?: boolean }>(
  ({ className, inset, disabled, ...props }, ref) => (
    <div ref={ref} className={cn("relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground", inset && "pl-8", disabled && "pointer-events-none opacity-50", className)} {...props} />
  )
)
DropdownMenuItem.displayName = "DropdownMenuItem"

const DropdownMenuLabel = ({ className, inset, ...props }: React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }) => (
  <div className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)} {...props} />
)
const DropdownMenuSeparator = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
)
const DropdownMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn("ml-auto text-xs tracking-widest opacity-60", className)} {...props} />
)
const DropdownMenuGroup = ({ children }: { children?: React.ReactNode }) => <>{children}</>
const DropdownMenuPortal = ({ children }: { children?: React.ReactNode }) => <>{children}</>
const DropdownMenuSub = ({ children }: { children?: React.ReactNode }) => <>{children}</>
const DropdownMenuSubTrigger = ({ children, className }: { children?: React.ReactNode; className?: string; inset?: boolean }) => (
  <div className={cn("flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent", className)}>{children}</div>
)
const DropdownMenuSubContent = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <div className={cn("z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md", className)}>{children}</div>
)
const DropdownMenuRadioGroup = ({ children }: { children?: React.ReactNode }) => <>{children}</>
const DropdownMenuCheckboxItem = ({ children, className, checked }: { children?: React.ReactNode; className?: string; checked?: boolean }) => (
  <div className={cn("relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm hover:bg-accent", className)}>
    {checked && <span className="absolute left-2">✓</span>}{children}
  </div>
)
const DropdownMenuRadioItem = ({ children, className }: { children?: React.ReactNode; className?: string; value?: string }) => (
  <div className={cn("relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm hover:bg-accent", className)}>{children}</div>
)

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuRadioItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuGroup, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuRadioGroup }
