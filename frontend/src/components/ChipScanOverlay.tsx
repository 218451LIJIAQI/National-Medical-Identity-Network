import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, CreditCard, Shield, Wifi } from 'lucide-react'

export type ScanPhase = 'idle' | 'insert' | 'reading' | 'verifying' | 'success'

interface ChipScanOverlayProps {
  open: boolean
  phase: ScanPhase
  title: string
  subtitle?: string
  icNumber?: string
  holderName?: string
  accentFrom?: string
  accentTo?: string
  onCancel?: () => void
}

const PHASE_LABELS: Record<Exclude<ScanPhase, 'idle'>, string> = {
  insert: 'Detecting MyKad smart chip...',
  reading: 'Reading encrypted identity certificate...',
  verifying: 'Verifying credentials with National Registry...',
  success: 'Identity verified',
}

export default function ChipScanOverlay({
  open,
  phase,
  title,
  subtitle,
  icNumber,
  holderName,
  accentFrom = 'from-blue-600',
  accentTo = 'to-cyan-600',
  onCancel,
}: ChipScanOverlayProps) {
  return (
    <AnimatePresence>
      {open && phase !== 'idle' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            className="w-full max-w-md rounded-3xl bg-slate-900 border border-white/15 p-8 text-white shadow-2xl"
          >
            <div className="text-center mb-6">
              <div className={`mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br ${accentFrom} ${accentTo} flex items-center justify-center shadow-lg`}>
                {phase === 'success' ? (
                  <CheckCircle2 className="w-9 h-9 text-white" />
                ) : (
                  <CreditCard className="w-8 h-8 text-white" />
                )}
              </div>
              <h3 className="text-xl font-bold">{title}</h3>
              {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
            </div>

            <div className="relative rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-5 mb-6 overflow-hidden">
              {phase !== 'success' && (
                <motion.div
                  className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
                  animate={{ top: ['10%', '90%', '10%'] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                  MALAYSIA IDENTITY CARD
                </span>
                <Wifi className="w-4 h-4 text-cyan-400 rotate-90" />
              </div>
              <div className="flex items-center gap-4">
                <div className="w-11 h-9 rounded-md bg-gradient-to-br from-amber-300 to-yellow-500 border border-amber-200/60 shadow-inner" />
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm text-white truncate">{icNumber || '••••••-••-••••'}</p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{holderName || 'Authorized Cardholder'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm text-cyan-200">
                <Shield className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>{PHASE_LABELS[phase]}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <motion.div
                  className={`h-full bg-gradient-to-r ${accentFrom} ${accentTo}`}
                  initial={{ width: '15%' }}
                  animate={{
                    width:
                      phase === 'insert'
                        ? '30%'
                        : phase === 'reading'
                        ? '65%'
                        : phase === 'verifying'
                        ? '88%'
                        : '100%',
                  }}
                  transition={{ duration: 0.35 }}
                />
              </div>
            </div>

            {onCancel && phase !== 'success' && (
              <button
                type="button"
                onClick={onCancel}
                className="mt-6 w-full py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel Scan
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
