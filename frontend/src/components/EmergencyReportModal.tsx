import { Button } from '@/components/ui/button'
import { ModalDialog, StatusBadge } from '@/components/ui/modal-dialog'
import { formatDateTime, formatIC } from '@/lib/utils'
import { AlertTriangle, Building2, FileText, Siren, User } from 'lucide-react'

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
    <ModalDialog
      open={Boolean(report)}
      onClose={onClose}
      title="Emergency Break-Glass Access Report"
      description="Immutable audit record for critical emergency override"
      icon={
        <div className="p-2 bg-red-100 text-red-700 rounded-xl border border-red-200">
          <Siren className="w-5 h-5" />
        </div>
      }
      maxWidthClassName="max-w-lg"
      footer={
        <Button onClick={onClose} className="bg-slate-900 hover:bg-slate-800 text-white">
          Close Report
        </Button>
      }
    >
      {report && (
        <div className="space-y-4">
          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm mb-1">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Emergency Break-Glass Protocol Invoked</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              Standard hospital consent filters were bypassed under emergency clinical protocol. Full source IP and timestamp telemetry are permanently recorded.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <p className="text-xs font-medium text-slate-500 mb-1">Patient MyKad IC</p>
              <p className="font-mono font-bold text-sm text-slate-900 tabular-nums">
                {report.targetIcNumber ? formatIC(report.targetIcNumber) : 'N/A'}
              </p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <p className="text-xs font-medium text-slate-500 mb-1">Timestamp</p>
              <p className="font-semibold text-sm text-slate-900 tabular-nums">
                {formatDateTime(report.timestamp)}
              </p>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 p-4">
            <div className="flex items-start gap-3">
              <User className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">Responder Identity</p>
                <p className="text-sm font-semibold text-slate-900">{report.actorRole}</p>
                <p className="text-xs text-slate-600 font-mono truncate">{report.actorId}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Building2 className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">Terminal / Source Node</p>
                <p className="text-sm font-semibold text-slate-900">{report.sourceLocation}</p>
              </div>
            </div>

            {report.details && (
              <div className="flex items-start gap-3">
                <FileText className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500">Audit Details</p>
                  <p className="text-xs text-slate-800 leading-relaxed">{report.details}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <StatusBadge
              tone={report.granted ? 'success' : 'blocked'}
              label={report.granted ? 'Break-Glass Granted' : 'Break-Glass Rejected'}
            />
            <span className="text-xs font-mono text-slate-500 tabular-nums">
              Audit ID: {report.id.slice(0, 12)}
            </span>
          </div>
        </div>
      )}
    </ModalDialog>
  )
}
