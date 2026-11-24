import * as React from 'react'
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Info,
  X,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type StatusTone = 'critical' | 'warning' | 'success' | 'info' | 'neutral' | 'blocked'

const STATUS_TONE_STYLES: Record<
  StatusTone,
  { classes: string; defaultIcon: LucideIcon }
> = {
  critical: {
    classes: 'bg-red-50 text-red-800 border-red-300',
    defaultIcon: AlertTriangle,
  },
  blocked: {
    classes: 'bg-rose-50 text-rose-900 border-rose-300',
    defaultIcon: Ban,
  },
  warning: {
    classes: 'bg-amber-50 text-amber-900 border-amber-300',
    defaultIcon: AlertCircle,
  },
  success: {
    classes: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    defaultIcon: CheckCircle2,
  },
  info: {
    classes: 'bg-blue-50 text-blue-800 border-blue-200',
    defaultIcon: Info,
  },
  neutral: {
    classes: 'bg-slate-100 text-slate-700 border-slate-200',
    defaultIcon: Clock,
  },
}

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone: StatusTone
  icon?: LucideIcon
  label: React.ReactNode
  size?: 'sm' | 'md'
}

export function StatusBadge({
  tone,
  icon,
  label,
  size = 'sm',
  className,
  ...props
}: StatusBadgeProps) {
  const config = STATUS_TONE_STYLES[tone] || STATUS_TONE_STYLES.neutral
  const IconComp = icon || config.defaultIcon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap',
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-xs',
        config.classes,
        className
      )}
      {...props}
    >
      <IconComp className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  )
}

export interface ModalDialogProps {
  open: boolean
  onClose: () => void
  title: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  maxWidthClassName?: string
  headerClassName?: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export function ModalDialog({
  open,
  onClose,
  title,
  description,
  icon,
  maxWidthClassName = 'max-w-xl',
  headerClassName,
  children,
  footer,
}: ModalDialogProps) {
  const titleId = React.useId()
  const descId = React.useId()

  React.useEffect(() => {
    if (!open) return

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-sm p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={cn(
          'relative flex max-h-[calc(100vh-3rem)] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl',
          maxWidthClassName
        )}
      >
        <div
          className={cn(
            'flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4 bg-slate-50/70 shrink-0',
            headerClassName
          )}
        >
          <div className="flex items-start gap-3 min-w-0">
            {icon && <div className="shrink-0 mt-0.5">{icon}</div>}
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-bold text-slate-900 leading-snug">
                {title}
              </h2>
              {description && (
                <p id={descId} className="mt-0.5 text-sm text-slate-600">
                  {description}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 transition-colors shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/80 px-6 py-3.5 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
