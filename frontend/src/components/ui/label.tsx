import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const labelVariants = cva(
  "text-sm font-semibold leading-none text-slate-700 tracking-wide peer-disabled:cursor-not-allowed peer-disabled:opacity-50 transition-colors"
)

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement>,
    VariantProps<typeof labelVariants> {}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(labelVariants(), className)}
      {...props}
    />
  )
)
Label.displayName = "Label"

export { Label }
