import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>{children}</>
)

const ToastViewport = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="region"
    aria-label="Notifications"
    className={cn(
      "fixed bottom-5 right-5 z-[120] flex max-h-screen w-[400px] max-w-[calc(100vw-2.5rem)] flex-col gap-2.5 pointer-events-none",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = "ToastViewport"

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-start justify-between gap-3 overflow-hidden rounded-xl border p-4 pr-10 shadow-xl transition-all duration-150 backdrop-blur-md",
  {
    variants: {
      variant: {
        default: "border-slate-200 bg-white/98 text-slate-900",
        destructive: "destructive group border-red-300 bg-red-50 text-red-950",
        success: "border-emerald-300 bg-emerald-50 text-emerald-950",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface ToastProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title">,
    VariantProps<typeof toastVariants> {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant, open = true, onOpenChange, onKeyDown, ...props }, ref) => {
    if (!open) return null
    return (
      <div
        ref={ref}
        role={variant === "destructive" ? "alert" : "status"}
        aria-live={variant === "destructive" ? "assertive" : "polite"}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            onOpenChange?.(false)
          }
          onKeyDown?.(e)
        }}
        className={cn(toastVariants({ variant }), className)}
        {...props}
      />
    )
  }
)
Toast.displayName = "Toast"

const ToastClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, type = "button", ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    aria-label="Dismiss notification"
    className={cn(
      "absolute right-2.5 top-2.5 rounded-lg p-1.5 text-slate-500 opacity-80 transition-colors hover:bg-slate-100 hover:text-slate-800 hover:opacity-100 focus-visible:opacity-100 group-[.destructive]:text-red-700 group-[.destructive]:hover:bg-red-100",
      className
    )}
    {...props}
  >
    <X className="h-4 w-4" />
  </button>
))
ToastClose.displayName = "ToastClose"

const ToastTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm font-bold tracking-tight", className)}
    {...props}
  />
))
ToastTitle.displayName = "ToastTitle"

const ToastDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs text-slate-700 font-medium leading-relaxed", className)}
    {...props}
  />
))
ToastDescription.displayName = "ToastDescription"

type ToastActionElement = React.ReactElement

export {
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
}
