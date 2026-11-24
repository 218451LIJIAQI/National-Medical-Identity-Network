import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"
import { useAuthStore } from "@/store/auth"
import { getHospitalTheme } from "@/lib/hospital-themes"

export function Toaster() {
  const { toasts, dismiss } = useToast()
  const user = useAuthStore((s) => s.user)
  const isBottomDock =
    (user?.role === "doctor" || user?.role === "hospital_admin") &&
    getHospitalTheme(user?.hospitalId).shellVariant === "bottom-dock"

  return (
    <ToastProvider>
      <ToastViewport
        className={isBottomDock ? "bottom-24" : undefined}
        style={isBottomDock ? { bottom: "5.5rem" } : undefined}
      >
        {toasts.map(function ({ id, title, description, action, ...props }) {
          return (
            <Toast key={id} {...props}>
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && <ToastDescription>{description}</ToastDescription>}
              </div>
              {action}
              <ToastClose onClick={() => dismiss(id)} />
            </Toast>
          )
        })}
      </ToastViewport>
    </ToastProvider>
  )
}
