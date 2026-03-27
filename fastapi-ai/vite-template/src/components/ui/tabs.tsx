import * as React from "react"
import { cn } from "@/lib/utils"

interface TabsContextValue { active: string; setActive: (v: string) => void }
const TabsContext = React.createContext<TabsContextValue>({ active: "", setActive: () => {} })

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> { defaultValue?: string; value?: string; onValueChange?: (v: string) => void }
const Tabs = ({ defaultValue = "", value, onValueChange, children, className, ...props }: TabsProps) => {
  const [internal, setInternal] = React.useState(defaultValue)
  const active = value ?? internal
  const setActive = (v: string) => { setInternal(v); onValueChange?.(v) }
  return <TabsContext.Provider value={{ active, setActive }}><div className={cn("", className)} {...props}>{children}</div></TabsContext.Provider>
}

const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground", className)} {...props} />
)
TabsList.displayName = "TabsList"

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { value: string }
const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, ...props }, ref) => {
    const { active, setActive } = React.useContext(TabsContext)
    return <button ref={ref} onClick={() => setActive(value)} data-state={active === value ? "active" : "inactive"} className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm", className)} {...props} />
  }
)
TabsTrigger.displayName = "TabsTrigger"

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> { value: string }
const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, ...props }, ref) => {
    const { active } = React.useContext(TabsContext)
    if (active !== value) return null
    return <div ref={ref} className={cn("mt-2", className)} {...props} />
  }
)
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
