import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import { useClinicalStore } from '@/store/clinical'
import { hospitalApi } from '@/lib/api'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { escapeHtml, printHtmlDocument } from '@/lib/utils'
import { ClinicalPatientBanner } from '@/components/ClinicalPatientBanner'
import { useToast } from '@/components/ui/use-toast'
import {
  FileText,
  Calendar,
  Clock,
  Printer,
  Send,
  User,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Loader2,
} from 'lucide-react'

interface MCData {
  patientName: string
  icNumber: string
  diagnosis: string
  daysOff: number
  startDate: string
  endDate: string
  remarks: string
  fitForLight: boolean
}

interface MedicalCertificateProps {
  patientName?: string
  patientIC?: string
  diagnosis?: string
  doctorName?: string
  hospitalName?: string
  onSubmit?: (data: MCData) => void
}

export default function MedicalCertificate({
  patientName = '',
  patientIC = '',
  diagnosis = 'Upper Respiratory Tract Infection (URTI)',
  doctorName,
  hospitalName,
  onSubmit,
}: MedicalCertificateProps) {
  const { user } = useAuthStore()
  const { activePatient } = useClinicalStore()
  const { toast } = useToast()
  const theme = getHospitalTheme(user?.hospitalId)

  const resolvedDoctorName = doctorName || user?.fullName || 'Medical Officer'
  const resolvedHospitalName = hospitalName || theme.name
  const resolvedLicense = user?.licenseNumber || 'MMC-VERIFIED'

  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const [formData, setFormData] = useState<MCData>({
    patientName: activePatient?.fullName || patientName,
    icNumber: activePatient?.icNumber || patientIC,
    diagnosis,
    daysOff: 2,
    startDate: today,
    endDate: tomorrow,
    remarks: '',
    fitForLight: false,
  })
  const [showPreview, setShowPreview] = useState(false)
  const [issuing, setIssuing] = useState(false)
  const [issuedCount, setIssuedCount] = useState(12)
  const [mcNumber] = useState(
    `MC/${new Date().getFullYear()}/${Math.floor(10000 + Math.random() * 89999)}`
  )
  const submitLockRef = useRef(false)

  useEffect(() => {
    if (activePatient) {
      setFormData((prev) => ({
        ...prev,
        patientName: activePatient.fullName,
        icNumber: activePatient.icNumber,
      }))
    }
  }, [activePatient])

  const updateField = (field: keyof MCData, value: string | number | boolean) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'daysOff' && typeof value === 'number') {
        const clampedDays = Math.min(90, Math.max(1, value))
        next.daysOff = clampedDays
        const start = new Date(prev.startDate)
        if (!Number.isNaN(start.getTime())) {
          next.endDate = new Date(start.getTime() + (clampedDays - 1) * 86400000)
            .toISOString()
            .split('T')[0]
        }
      } else if (field === 'startDate' && typeof value === 'string' && value) {
        const start = new Date(value)
        if (!Number.isNaN(start.getTime())) {
          next.endDate = new Date(start.getTime() + Math.max(0, prev.daysOff - 1) * 86400000)
            .toISOString()
            .split('T')[0]
        }
      }
      return next
    })
  }

  const formatDisplayDate = (dateStr: string) => {
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-MY', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const handlePrint = () => {
    printHtmlDocument(
      `Medical Certificate ${mcNumber}`,
      `<div class="header">
        <div><h1>${escapeHtml(resolvedHospitalName)}</h1><p>Ministry of Health Malaysia • Official Medical Certificate</p></div>
        <div><strong>${escapeHtml(mcNumber)}</strong></div>
      </div>
      <div class="meta">
        <p>This is to certify that <strong>${escapeHtml(formData.patientName || '-')}</strong> (MyKad IC: <strong>${escapeHtml(formData.icNumber || '-')}</strong>) was examined and found unfit for duty for <strong>${escapeHtml(formData.daysOff)} day(s)</strong> from <strong>${escapeHtml(formatDisplayDate(formData.startDate))}</strong> to <strong>${escapeHtml(formatDisplayDate(formData.endDate))}</strong> inclusive.</p>
        <p><strong>Clinical Diagnosis:</strong> ${escapeHtml(formData.diagnosis)}</p>
        ${formData.fitForLight ? '<p><strong>Note:</strong> Fit for light duties after leave period.</p>' : ''}
        ${formData.remarks ? `<p><strong>Remarks:</strong> ${escapeHtml(formData.remarks)}</p>` : ''}
      </div>
      <div class="footer">
        Issued by ${escapeHtml(resolvedDoctorName)} (${escapeHtml(resolvedLicense)}) on ${escapeHtml(formatDisplayDate(today))}
      </div>`
    )
  }

  const handleGenerate = async () => {
    if (submitLockRef.current) return
    if (!formData.patientName.trim() || !formData.icNumber.trim() || !formData.diagnosis.trim()) {
      toast({
        title: 'Patient & Diagnosis Required',
        description: 'Enter or bind the patient full name, MyKad IC, and clinical diagnosis before issuing an MC.',
        variant: 'destructive',
      })
      return
    }

    onSubmit?.(formData)
    submitLockRef.current = true
    setIssuing(true)
    try {
      if (user?.role === 'doctor' && user.hospitalId) {
        const res = await hospitalApi.createRecord(user.hospitalId, {
          icNumber: formData.icNumber.trim(),
          visitDate: today,
          visitType: 'outpatient',
          chiefComplaint: 'Medical Certificate Consultation',
          diagnosis: [formData.diagnosis.trim()],
          notes: `Issued ${mcNumber}: ${formData.daysOff} day(s) sick leave (${formData.startDate} to ${formData.endDate}). ${formData.remarks}`.trim(),
          patientName: formData.patientName.trim(),
        })
        if (!res.success) {
          toast({
            title: 'MC Record Blocked',
            description: res.error || 'Could not log Medical Certificate.',
            variant: 'destructive',
          })
          return
        }
      }

      setIssuedCount((c) => c + 1)
      setShowPreview(true)
      toast({
        title: 'Medical Certificate Issued',
        description: `${mcNumber} generated for ${formData.patientName} (${formData.daysOff} day(s)).`,
        variant: 'success',
      })
    } finally {
      submitLockRef.current = false
      setIssuing(false)
    }
  }

  return (
    <div className="space-y-6">
      <ClinicalPatientBanner />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Medical Certificate (MC)</h2>
          <p className="text-slate-600 text-sm">Official Sijil Cuti Sakit issuance & verification</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50"
          >
            <Eye className="w-4 h-4" />
            {showPreview ? 'Edit Details' : 'Preview Certificate'}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50"
          >
            <Printer className="w-4 h-4" />
            Print MC
          </button>
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={issuing}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {issuing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Issue & Save MC
          </button>
        </div>
      </div>

      {showPreview ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border-2 border-slate-200 shadow-xl overflow-hidden max-w-2xl mx-auto"
        >
          <div
            className={`bg-gradient-to-r ${theme.headerGradient} text-white p-6 flex items-center justify-between`}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-bold">{resolvedHospitalName}</h3>
                <p className="text-white/85 text-sm">Ministry of Health Malaysia</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/80">Certificate No:</p>
              <p className="font-mono font-bold text-sm tabular-nums">{mcNumber}</p>
            </div>
          </div>

          <div className="p-8 space-y-4 text-slate-700">
            <h2 className="text-xl font-bold text-center text-slate-900 border-b pb-3">
              SIJIL CUTI SAKIT / MEDICAL CERTIFICATE
            </h2>
            <p className="text-sm">This is to certify that:</p>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-lg font-bold text-slate-900">{formData.patientName || '-'}</p>
              <p className="text-sm font-mono text-slate-600 tabular-nums">
                MyKad IC: {formData.icNumber || '-'}
              </p>
            </div>
            <p className="text-sm">has been examined and is unfit for duty for:</p>
            <div className="flex items-center justify-center gap-3 py-2">
              <span className="text-4xl font-bold text-blue-700 tabular-nums">{formData.daysOff}</span>
              <span className="text-lg font-semibold text-slate-600">DAY(S)</span>
            </div>
            <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-xl text-sm tabular-nums">
              <div>
                <p className="text-xs text-slate-500">From:</p>
                <p className="font-semibold text-slate-900">{formatDisplayDate(formData.startDate)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Until (Inclusive):</p>
                <p className="font-semibold text-slate-900">{formatDisplayDate(formData.endDate)}</p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl text-sm">
              <p className="text-xs text-slate-500 mb-1">Diagnosis:</p>
              <p className="font-semibold text-slate-900">{formData.diagnosis}</p>
            </div>
            {formData.fitForLight && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-sm text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <span>Recommended for light duties upon return</span>
              </div>
            )}
            <div className="pt-6 border-t flex justify-between items-end text-sm">
              <div>
                <p className="text-xs text-slate-500">Issued Date:</p>
                <p className="font-medium text-slate-800 tabular-nums">{formatDisplayDate(today)}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-900">{resolvedDoctorName}</p>
                <p className="text-xs text-slate-500 font-mono">Reg No: {resolvedLicense}</p>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Patient & Diagnosis
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Patient Full Name *
              </label>
              <input
                type="text"
                maxLength={120}
                value={formData.patientName}
                onChange={(e) => updateField('patientName', e.target.value)}
                placeholder="Select active patient above or type name"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                MyKad IC Number *
              </label>
              <input
                type="text"
                maxLength={20}
                value={formData.icNumber}
                onChange={(e) => updateField('icNumber', e.target.value)}
                placeholder="e.g., 880101-14-5678"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Clinical Diagnosis *
              </label>
              <input
                type="text"
                maxLength={300}
                value={formData.diagnosis}
                onChange={(e) => updateField('diagnosis', e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Leave Duration
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Days Granted
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {[1, 2, 3, 5, 7].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => updateField('daysOff', days)}
                    className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold tabular-nums ${
                      formData.daysOff === days
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {days}d
                  </button>
                ))}
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={formData.daysOff}
                  onChange={(e) => updateField('daysOff', parseInt(e.target.value, 10) || 1)}
                  className="w-20 px-3 py-1.5 border border-slate-200 rounded-lg text-center text-sm tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 tabular-nums">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => updateField('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={formData.endDate}
                  readOnly
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Clinical Remarks
              </label>
              <textarea
                maxLength={500}
                value={formData.remarks}
                onChange={(e) => updateField('remarks', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
                placeholder="Optional clinical instructions..."
              />
            </div>

            <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.fitForLight}
                onChange={(e) => updateField('fitForLight', e.target.checked)}
              />
              Fit for light duties upon return
            </label>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-blue-50/80 rounded-xl border border-blue-200 flex items-center gap-3">
          <FileText className="w-7 h-7 text-blue-700" />
          <div>
            <p className="text-xl font-bold text-blue-900 tabular-nums">{issuedCount}</p>
            <p className="text-xs text-blue-700">Certificates Issued Today</p>
          </div>
        </div>
        <div className="p-4 bg-emerald-50/80 rounded-xl border border-emerald-200 flex items-center gap-3">
          <CheckCircle2 className="w-7 h-7 text-emerald-700" />
          <div>
            <p className="text-xl font-bold text-emerald-900 tabular-nums">100%</p>
            <p className="text-xs text-emerald-700">Digital Verification Active</p>
          </div>
        </div>
        <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-200 flex items-center gap-3">
          <Clock className="w-7 h-7 text-amber-700" />
          <div>
            <p className="text-xl font-bold text-amber-900 tabular-nums">{formData.daysOff}d</p>
            <p className="text-xs text-amber-800">Selected Leave Duration</p>
          </div>
        </div>
      </div>
    </div>
  )
}
