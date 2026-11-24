import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        secondary: "border-slate-200 bg-slate-100 text-slate-800",
        destructive: "border-red-700/20 bg-red-600 text-white shadow-sm",
        outline: "border-slate-300 text-slate-700 bg-white",
        success: "border-emerald-300 bg-emerald-50 text-emerald-800",
        warning: "border-amber-300 bg-amber-50 text-amber-900",
        info: "border-blue-200 bg-blue-50 text-blue-800",
        glass: "border-white/30 bg-white/20 backdrop-blur-md text-white",
      },
    },
    defaultVariants: {
      variant: "outline",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge }
