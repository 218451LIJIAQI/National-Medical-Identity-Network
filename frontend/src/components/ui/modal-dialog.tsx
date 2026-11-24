import * as React from 'react'
import { createPortal } from 'react-dom'
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Info,
  RefreshCw,
  RotateCcw,
  SearchX,
  X,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { Button } from '@/components/ui/button'

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

export function DataErrorBanner({
  message,
  onRetry,
  className,
}: {
  message: string
  onRetry?: () => void
  className?: string
}) {
  const { t } = useTranslation()

  return (
    <div
      role="alert"
      className={cn(
        'rounded-2xl border border-red-200 bg-red-50/90 p-5 flex items-center justify-between gap-4 flex-wrap shadow-sm',
        className
      )}
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-red-950">{t.loadFailedTitle}</h3>
          <p className="text-xs text-red-800 mt-0.5 leading-relaxed">{message}</p>
        </div>
      </div>
      {onRetry && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="border-red-300 bg-white text-red-800 hover:bg-red-100 shrink-0 gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{t.retryLoad}</span>
        </Button>
      )}
    </div>
  )
}

export function EmptyStatePanel({
  icon: Icon = SearchX,
  title,
  description,
  hasActiveFilters = false,
  onClearFilters,
  action,
  className,
}: {
  icon?: LucideIcon
  title?: string
  description?: string
  hasActiveFilters?: boolean
  onClearFilters?: () => void
  action?: React.ReactNode
  className?: string
}) {
  const { t } = useTranslation()
  const resolvedTitle = title || t.noMatchingResults

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center',
        className
      )}
    >
      <div className="w-11 h-11 rounded-2xl bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center mx-auto mb-3">
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-sm font-bold text-slate-900">{resolvedTitle}</p>
      {description && (
        <p className="text-xs text-slate-600 max-w-md mx-auto mt-1 leading-relaxed">
          {description}
        </p>
      )}
      {(hasActiveFilters && onClearFilters) || action ? (
        <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
          {hasActiveFilters && onClearFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              className="gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.clearFilters}</span>
            </Button>
          )}
          {action}
        </div>
      ) : null}
    </div>
  )
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

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
  const dialogRef = React.useRef<HTMLDivElement | null>(null)
  const onCloseRef = React.useRef(onClose)
  onCloseRef.current = onClose

  React.useEffect(() => {
    if (!open) return

    const previousFocused = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusInitial = () => {
      const container = dialogRef.current
      if (!container || container.contains(document.activeElement)) return
      const preferred = container.querySelector<HTMLElement>(
        '[autofocus], [data-autofocus="true"], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])'
      )
      const fallback = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
      ;(preferred || fallback || container).focus()
    }
    focusInitial()
    const focusTimer = window.setTimeout(focusInitial, 0)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const container = dialogRef.current
      if (!container) return

      const focusables = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => el.offsetParent !== null || el === document.activeElement)

      if (focusables.length === 0) {
        event.preventDefault()
        container.focus()
        return
      }

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement as HTMLElement | null

      if (event.shiftKey) {
        if (!active || !container.contains(active) || active === first) {
          event.preventDefault()
          last.focus()
        }
      } else if (!active || !container.contains(active) || active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', handleKeyDown)
      if (previousFocused && typeof previousFocused.focus === 'function' && document.contains(previousFocused)) {
        previousFocused.focus()
      }
    }
  }, [open])

  if (!open) return null

  const dialogContent = (
    <div
      style={{ margin: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/55 backdrop-blur-sm p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[calc(100vh-3rem)] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl focus:outline-none',
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

  return typeof document !== 'undefined' ? createPortal(dialogContent, document.body) : dialogContent
}
