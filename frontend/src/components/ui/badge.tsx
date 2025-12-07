import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-gray-200/80 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 hover:from-gray-100 hover:to-gray-200",
        destructive: "border-transparent bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm shadow-red-500/20",
        outline: "border-gray-200 text-gray-700 bg-white/80 backdrop-blur-sm hover:bg-gray-50",
        success: "border-emerald-200/50 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700",
        warning: "border-amber-200/50 bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700",
        info: "border-blue-200/50 bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700",
        premium: "border-transparent bg-gradient-to-r from-blue-600 via-cyan-600 to-emerald-600 text-white shadow-md shadow-blue-500/25",
        glass: "border-white/20 bg-white/20 backdrop-blur-md text-white",
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

export { Badge, badgeVariants }
