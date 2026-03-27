import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DialogContextValue { open: boolean; setOpen: (o: boolean) => void }
const DialogContext = React.createContext<DialogContextValue>({ open: false, setOpen: () => {} })

interface DialogProps { open?: boolean; defaultOpen?: boolean; onOpenChange?: (o: boolean) => void; children?: React.ReactNode }
const Dialog = ({ open, defaultOpen = false, onOpenChange, children }: DialogProps) => {
  const [internal, setInternal] = React.useState(defaultOpen)
  const current = open ?? internal
  const setOpen = (o: boolean) => { setInternal(o); onOpenChange?.(o) }
  return <DialogContext.Provider value={{ open: current, setOpen }}>{children}</DialogContext.Provider>
}

const DialogTrigger = ({ children, asChild }: { children?: React.ReactNode; asChild?: boolean }) => {
  const { setOpen } = React.useContext(DialogContext)
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, { onClick: () => setOpen(true) })
  }
  return <button type="button" onClick={() => setOpen(true)}>{children}</button>
}

const DialogPortal = ({ children }: { children?: React.ReactNode }) => <>{children}</>
const DialogClose = ({ children, className }: { children?: React.ReactNode; className?: string }) => {
  const { setOpen } = React.useContext(DialogContext)
  return <button type="button" className={className} onClick={() => setOpen(false)}>{children}</button>
}

const DialogOverlay = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("fixed inset-0 z-50 bg-black/80", className)} {...props} />
  )
)
DialogOverlay.displayName = "DialogOverlay"

const DialogContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen } = React.useContext(DialogContext)
    if (!open) return null
    return (
      <>
        <DialogOverlay onClick={() => setOpen(false)} />
        <div ref={ref} className={cn("fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg sm:rounded-lg", className)} {...props}>
          {children}
          <button type="button" onClick={() => setOpen(false)} className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 focus:outline-none">
            <X className="h-4 w-4" /><span className="sr-only">Close</span>
          </button>
        </div>
      </>
    )
  }
)
DialogContent.displayName = "DialogContent"

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
)
const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
)
const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => <h2 ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
)
DialogTitle.displayName = "DialogTitle"
const DialogDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
)
DialogDescription.displayName = "DialogDescription"

export { Dialog, DialogPortal, DialogOverlay, DialogClose, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription }
