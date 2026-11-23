import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Building2, FileText, Siren, User, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export interface EmergencyReportData {
  id: string
  timestamp: string
  targetIcNumber?: string
  actorRole: string
  actorId: string
  sourceLocation: string
  details?: string
  granted: boolean
}

interface EmergencyReportModalProps {
  report: EmergencyReportData | null
  onClose: () => void
}

export function EmergencyReportModal({ report, onClose }: EmergencyReportModalProps) {
  return (
    <AnimatePresence>
      {report && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 bg-gradient-to-r from-orange-500 to-red-600 text-white">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-xl animate-pulse">
                    <Siren className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Emergency Access Report</h2>
                    <p className="text-white/80 text-sm">Detailed critical patient data access event</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  title="Close"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                <div className="flex items-center gap-2 text-orange-700 font-medium mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  Emergency Protocol Activated
                </div>
                <p className="text-sm text-orange-600">
                  This access bypassed standard consent requirements due to an emergency medical situation.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Patient IC</p>
                  <p className="font-mono font-semibold text-gray-900">
                    {report.targetIcNumber || 'N/A'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Access Time</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(report.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Accessed By</p>
                    <p className="text-gray-900">{report.actorRole}</p>
                    <p className="text-xs text-gray-500 font-mono">{report.actorId}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Source Location</p>
                    <p className="text-gray-900">{report.sourceLocation}</p>
                  </div>
                </div>

                {report.details && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Details</p>
                      <p className="text-gray-900">{report.details}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Badge className={report.granted ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                    {report.granted ? 'Access Granted' : 'Access Denied'}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    Log ID: {report.id.slice(0, 8)}...
                  </span>
                </div>
              </div>
            </div>

            <div className="px-6 pb-6">
              <Button
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                onClick={onClose}
              >
                Close Report
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
