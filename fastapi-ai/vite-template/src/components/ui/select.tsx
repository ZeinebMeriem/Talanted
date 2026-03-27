import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface SelectContextValue { value: string; onValueChange: (v: string) => void; open: boolean; setOpen: (o: boolean) => void }
const SelectContext = React.createContext<SelectContextValue>({ value: "", onValueChange: () => {}, open: false, setOpen: () => {} })

interface SelectProps { value?: string; defaultValue?: string; onValueChange?: (v: string) => void; children?: React.ReactNode }
const Select = ({ value, defaultValue = "", onValueChange, children }: SelectProps) => {
  const [internal, setInternal] = React.useState(defaultValue)
  const [open, setOpen] = React.useState(false)
  const current = value ?? internal
  const handleChange = (v: string) => { setInternal(v); onValueChange?.(v); setOpen(false) }
  return <SelectContext.Provider value={{ value: current, onValueChange: handleChange, open, setOpen }}><div className="relative">{children}</div></SelectContext.Provider>
}

const SelectGroup = ({ children }: { children?: React.ReactNode }) => <>{children}</>
const SelectValue = ({ placeholder }: { placeholder?: string }) => {
  const { value } = React.useContext(SelectContext)
  return <span>{value || placeholder}</span>
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, children, ...props }, ref) => {
    const { setOpen, open } = React.useContext(SelectContext)
    return (
      <button ref={ref} type="button" onClick={() => setOpen(!open)}
        className={cn("flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50", className)} {...props}>
        {children}<ChevronDown className="h-4 w-4 opacity-50" />
      </button>
    )
  }
)
SelectTrigger.displayName = "SelectTrigger"

const SelectContent = ({ className, children }: { className?: string; children?: React.ReactNode }) => {
  const { open } = React.useContext(SelectContext)
  if (!open) return null
  return <div className={cn("absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md", className)}><div className="p-1">{children}</div></div>
}

const SelectLabel = ({ className, children }: { className?: string; children?: React.ReactNode }) => (
  <div className={cn("py-1.5 pl-2 pr-2 text-sm font-semibold", className)}>{children}</div>
)

interface SelectItemProps { value: string; className?: string; children?: React.ReactNode; disabled?: boolean }
const SelectItem = ({ value, className, children, disabled }: SelectItemProps) => {
  const { onValueChange, value: current } = React.useContext(SelectContext)
  return (
    <div onClick={() => !disabled && onValueChange(value)}
      className={cn("relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground", current === value && "bg-accent", disabled && "pointer-events-none opacity-50", className)}>
      {children}
    </div>
  )
}

const SelectSeparator = ({ className }: { className?: string }) => (
  <div className={cn("-mx-1 my-1 h-px bg-muted", className)} />
)

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel, SelectItem, SelectSeparator }
