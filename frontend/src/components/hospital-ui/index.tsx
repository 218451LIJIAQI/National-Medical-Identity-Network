// ============================================================================
// Hospital-Specific UI Components
// Dynamically styled components based on user's hospital theme
// ============================================================================

import { useAuthStore } from '@/store/auth'
import { getHospitalUI } from '@/lib/hospital-ui-system'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { motion, HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'
import { forwardRef, ButtonHTMLAttributes, InputHTMLAttributes } from 'react'

// ============================================================================
// Hospital Button - Styled based on hospital theme
// ============================================================================
interface HospitalButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const HospitalButton = forwardRef<HTMLButtonElement, HospitalButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, disabled, loading, ...props }, ref) => {
    const { user } = useAuthStore()
    const ui = getHospitalUI(user?.hospitalId)
    
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-5 py-2.5 text-base',
      lg: 'px-7 py-3.5 text-lg',
    }
    
    const variantClasses = {
      primary: ui.customClasses.button,
      secondary: ui.customClasses.buttonSecondary,
      ghost: 'bg-transparent hover:bg-gray-100 text-gray-700',
    }
    
    return (
      <motion.button
        ref={ref}
        className={cn(
          'font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed',
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        whileHover={!disabled ? { scale: 1.02 } : undefined}
        whileTap={!disabled ? { scale: 0.98 } : undefined}
        disabled={disabled || loading}
        {...(props as HTMLMotionProps<"button">)}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <motion.div
              className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            Loading...
          </span>
        ) : children}
      </motion.button>
    )
  }
)
HospitalButton.displayName = 'HospitalButton'

// ============================================================================
// Hospital Card - Styled based on hospital theme
// ============================================================================
interface HospitalCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function HospitalCard({ children, className, hover = true, padding = 'md' }: HospitalCardProps) {
  const { user } = useAuthStore()
  const ui = getHospitalUI(user?.hospitalId)
  
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }
  
  return (
    <motion.div
      className={cn(ui.customClasses.card, paddingClasses[padding], className)}
      whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : undefined}
    >
      {children}
    </motion.div>
  )
}

// ============================================================================
// Hospital Input - Styled based on hospital theme
// ============================================================================
interface HospitalInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const HospitalInput = forwardRef<HTMLInputElement, HospitalInputProps>(
  ({ className, label, error, ...props }, ref) => {
    const { user } = useAuthStore()
    const ui = getHospitalUI(user?.hospitalId)
    
    return (
      <div className="space-y-1">
        {label && (
          <label className="text-sm font-medium text-gray-700">{label}</label>
        )}
        <input
          ref={ref}
          className={cn(
            ui.customClasses.input,
            'w-full transition-all duration-200',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </div>
    )
  }
)
HospitalInput.displayName = 'HospitalInput'

// ============================================================================
// Hospital Badge - Styled based on hospital theme
// ============================================================================
interface HospitalBadgeProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'success' | 'warning' | 'error'
}

export function HospitalBadge({ children, className, variant = 'default' }: HospitalBadgeProps) {
  const { user } = useAuthStore()
  const ui = getHospitalUI(user?.hospitalId)
  
  const variantClasses = {
    default: ui.customClasses.badge,
    success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-100 text-amber-700 border-amber-200',
    error: 'bg-red-100 text-red-700 border-red-200',
  }
  
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border',
      variantClasses[variant],
      className
    )}>
      {children}
    </span>
  )
}

// ============================================================================
// Hospital Header - Styled based on hospital theme
// ============================================================================
interface HospitalHeaderProps {
  title: string
  description?: string
  icon?: React.ReactNode
  actions?: React.ReactNode
}

export function HospitalHeader({ title, description, icon, actions }: HospitalHeaderProps) {
  const { user } = useAuthStore()
  const theme = getHospitalTheme(user?.hospitalId)
  const ui = getHospitalUI(user?.hospitalId)
  
  return (
    <motion.div
      className="mb-8"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {icon && (
            <div className={cn(
              'p-3 rounded-xl',
              ui.prefersDarkMode ? 'bg-purple-500/20' : theme.bgMedium
            )}>
              {icon}
            </div>
          )}
          <div>
            <h1 className={cn(
              'text-2xl font-bold',
              ui.prefersDarkMode ? 'text-white' : 'text-gray-900'
            )}>
              {title}
            </h1>
            {description && (
              <p className={cn(
                'mt-1',
                ui.prefersDarkMode ? 'text-purple-300/70' : 'text-gray-500'
              )}>
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ============================================================================
// Hospital Container - Wrapper with hospital-specific background
// ============================================================================
interface HospitalContainerProps {
  children: React.ReactNode
  className?: string
}

export function HospitalContainer({ children, className }: HospitalContainerProps) {
  const { user } = useAuthStore()
  const ui = getHospitalUI(user?.hospitalId)
  
  // Only apply container styles for hospital users (doctor/hospital_admin)
  const isHospitalUser = user?.role === 'doctor' || user?.role === 'hospital_admin'
  
  if (!isHospitalUser) {
    return <div className={className}>{children}</div>
  }
  
  return (
    <div className={cn(ui.customClasses.container, className)}>
      {children}
    </div>
  )
}

// ============================================================================
// Hospital Stats Card - Pre-styled stat display
// ============================================================================
interface HospitalStatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  trend?: { value: string; positive: boolean }
  delay?: number
}

export function HospitalStatCard({ label, value, icon, trend, delay = 0 }: HospitalStatCardProps) {
  const { user } = useAuthStore()
  const theme = getHospitalTheme(user?.hospitalId)
  const ui = getHospitalUI(user?.hospitalId)
  
  return (
    <motion.div
      className={ui.customClasses.card}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
    >
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className={cn(
              'text-sm font-medium',
              ui.prefersDarkMode ? 'text-purple-300/70' : 'text-gray-500'
            )}>
              {label}
            </p>
            <motion.p
              className={cn(
                'text-3xl font-bold mt-1',
                ui.prefersDarkMode ? 'text-white' : 'text-gray-900'
              )}
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ delay: delay + 0.1, type: "spring" }}
            >
              {value}
            </motion.p>
            {trend && (
              <p className={cn(
                'text-sm mt-2',
                trend.positive ? 'text-emerald-600' : 'text-red-600'
              )}>
                {trend.value}
              </p>
            )}
          </div>
          <div className={cn(
            'p-3 rounded-xl',
            ui.prefersDarkMode ? 'bg-purple-500/20' : theme.bgMedium
          )}>
            {icon}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
