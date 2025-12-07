import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-xl border-2 border-gray-200 bg-white/80 backdrop-blur-sm px-4 py-3 text-sm font-medium text-gray-900 ring-offset-background transition-all duration-300 file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-blue-600 placeholder:text-gray-400 placeholder:font-normal hover:border-gray-300 hover:shadow-sm focus-visible:outline-none focus-visible:border-blue-500 focus-visible:ring-4 focus-visible:ring-blue-500/10 focus-visible:shadow-[0_0_0_4px_rgba(59,130,246,0.1)] disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
