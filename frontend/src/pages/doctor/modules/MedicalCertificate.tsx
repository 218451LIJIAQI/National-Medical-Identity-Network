import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/auth'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { triggerPrintDocument, useSessionState } from '@/lib/workstation-storage'
import { WorkstationPatientBar, useWorkstationPatient } from '@/components/WorkstationPatientBar'
import { useToast } from '@/components/ui/use-toast'
import {
  FileText, Calendar, Clock, Printer, Send,
  User, Building2, CheckCircle2, AlertTriangle, Eye
} from 'lucide-react'

export interface MCData {
  patientName: string
  icNumber: string
  diagnosis: string
  daysOff: number
  startDate: string
  endDate: string
  remarks: string
  fitForLight: boolean
  followUp: boolean
  followUpDate?: string
}

interface IssuedMCRecord extends MCData {
  mcNumber: string
  issuedAt: string
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
  patientName,
  patientIC,
  diagnosis = 'Upper Respiratory Tract Infection (URTI)',
  doctorName,
  hospitalName,
  onSubmit,
}: MedicalCertificateProps) {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const theme = getHospitalTheme(user?.hospitalId)
  const { patient, lookupPatient, loading, lookupNotice } = useWorkstationPatient(patientName, patientIC)

  const resolvedDoctorName = doctorName || user?.fullName || 'Medical Officer'
  const resolvedHospitalName = hospitalName || theme.name

  const [issuedList, setIssuedList] = useSessionState<IssuedMCRecord[]>(
    `mc-issued:${user?.hospitalId || 'default'}`,
    []
  )

  const todayStr = new Date().toISOString().split('T')[0]
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const [formData, setFormData] = useState<MCData>({
    patientName: patient.fullName,
    icNumber: patient.icNumber,
    diagnosis,
    daysOff: 2,
    startDate: todayStr,
    endDate: tomorrowStr,
    remarks: '',
    fitForLight: false,
    followUp: false,
    followUpDate: '',
  })
  const [showPreview, setShowPreview] = useState(false)
  const [mcNumber, setMcNumber] = useState(
    () => `MC/${new Date().getFullYear()}/${String(1000 + issuedList.length + 1).padStart(5, '0')}`
  )

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      patientName: patient.fullName,
      icNumber: patient.icNumber,
    }))
  }, [patient.fullName, patient.icNumber])

  const updateField = <K extends keyof MCData>(field: K, value: MCData[K]) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'daysOff' && typeof value === 'number') {
        const clamped = Math.max(1, Math.min(30, value))
        next.daysOff = clamped
        const start = new Date(`${prev.startDate}T00:00:00`)
        next.endDate = new Date(start.getTime() + (clamped - 1) * 86400000).toISOString().split('T')[0]
      } else if (field === 'startDate' && typeof value === 'string' && value) {
        const start = new Date(`${value}T00:00:00`)
        next.endDate = new Date(start.getTime() + (prev.daysOff - 1) * 86400000).toISOString().split('T')[0]
      }
      return next
    })
  }

  const formatMalaysianDate = (dateStr: string) =>
    new Date(`${dateStr.slice(0, 10)}T00:00:00`).toLocaleDateString('en-MY', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

  const handlePrint = () => {
    triggerPrintDocument(
      `Medical Certificate ${mcNumber}`,
      `<h1>${resolvedHospitalName} — MEDICAL CERTIFICATE</h1>
       <div class="meta">Certificate No: <strong>${mcNumber}</strong> • Ministry of Health Malaysia</div>
       <p>This is to certify that <strong>${formData.patientName}</strong> (IC: <strong>${formData.icNumber}</strong>) has been examined and found unfit for duty for <strong>${formData.daysOff} day(s)</strong> from <strong>${formatMalaysianDate(formData.startDate)}</strong> to <strong>${formatMalaysianDate(formData.endDate)}</strong>.</p>
       <p><strong>Diagnosis:</strong> ${formData.diagnosis}</p>
       ${formData.fitForLight ? '<p><strong>Note:</strong> Fit for light duties after leave period.</p>' : ''}
       ${formData.followUp && formData.followUpDate ? `<p><strong>Follow-up Date:</strong> ${formatMalaysianDate(formData.followUpDate)}</p>` : ''}
       ${formData.remarks ? `<p><strong>Remarks:</strong> ${formData.remarks}</p>` : ''}
       <p style="margin-top:24px;">Issued by: <strong>${resolvedDoctorName}</strong></p>`
    )
  }

  const handleSubmit = () => {
    onSubmit?.(formData)
    const record: IssuedMCRecord = {
      ...formData,
      mcNumber,
      issuedAt: new Date().toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }),
    }
    const nextList = [record, ...issuedList]
    setIssuedList(nextList)
    setShowPreview(true)
    toast({
      title: `Certificate ${mcNumber} Issued`,
      description: `${formData.daysOff} day(s) sick leave generated for ${formData.patientName}`,
    })
    setMcNumber(`MC/${new Date().getFullYear()}/${String(1000 + nextList.length + 1).padStart(5, '0')}`)
  }

  const avgDays =
    issuedList.length > 0
      ? (issuedList.reduce((acc, item) => acc + item.daysOff, 0) / issuedList.length).toFixed(1)
      : formData.daysOff.toFixed(1)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Medical Certificate (MC)</h2>
          <p className="text-gray-500 text-sm">Official Sijil Cuti Sakit Generator (session-persisted)</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
          >
            <Eye className="w-5 h-5" />
            {showPreview ? 'Edit Form' : 'Preview'}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
          >
            <Printer className="w-5 h-5" />
            Print
          </button>
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold shadow-lg hover:bg-blue-700"
          >
            <Send className="w-5 h-5" />
            Issue MC
          </button>
        </div>
      </div>

      <WorkstationPatientBar
        patient={patient}
        onLookup={lookupPatient}
        loading={loading}
        notice={lookupNotice}
        accentClass="from-sky-50 to-blue-50 border-sky-200"
      />

      {showPreview ? (
        <div className="bg-white rounded-xl border-2 border-gray-200 shadow-xl overflow-hidden max-w-2xl mx-auto">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-bold">{resolvedHospitalName}</h3>
                <p className="text-blue-100 text-sm">Ministry of Health Malaysia</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-100">Serial No:</p>
              <p className="font-mono font-bold">{mcNumber}</p>
            </div>
          </div>

          <div className="p-8 space-y-4 text-gray-700">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-6 border-b-2 border-gray-200 pb-4">
              MEDICAL CERTIFICATE
            </h2>

            <p>This is to certify that</p>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xl font-bold text-gray-800">{formData.patientName}</p>
              <p className="text-gray-600 font-mono text-sm">IC No: {formData.icNumber}</p>
            </div>

            <p>has been examined and found unfit for work for</p>

            <div className="flex items-center justify-center gap-4 py-3">
              <span className="text-4xl font-bold text-blue-600">{formData.daysOff}</span>
              <span className="text-xl text-gray-600">DAY(S)</span>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-500">From:</p>
                <p className="font-semibold text-gray-800">{formatMalaysianDate(formData.startDate)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Until:</p>
                <p className="font-semibold text-gray-800">{formatMalaysianDate(formData.endDate)}</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Diagnosis:</p>
              <p className="font-medium text-gray-800">{formData.diagnosis}</p>
            </div>

            {formData.fitForLight && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <p className="text-amber-800 text-sm">Fit for light duties upon return</p>
              </div>
            )}

            {formData.followUp && formData.followUpDate && (
              <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200 text-sm text-indigo-800">
                Scheduled Follow-up: <strong>{formatMalaysianDate(formData.followUpDate)}</strong>
              </div>
            )}

            {formData.remarks && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Remarks:</p>
                <p className="text-gray-800 text-sm">{formData.remarks}</p>
              </div>
            )}

            <div className="mt-8 pt-6 border-t-2 border-gray-200 flex justify-between items-end">
              <div>
                <p className="text-xs text-gray-500">Issued Date:</p>
                <p className="font-medium text-gray-800">{formatMalaysianDate(todayStr)}</p>
              </div>
              <div className="text-right">
                <div className="w-40 border-b-2 border-gray-400 mb-2 ml-auto" />
                <p className="font-semibold text-gray-800">{resolvedDoctorName}</p>
                <p className="text-xs text-gray-500">{user?.specialization || 'Medical Officer'}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Patient & Diagnosis
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Full Name</label>
              <input
                type="text"
                value={formData.patientName}
                onChange={(e) => updateField('patientName', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">IC Number</label>
              <input
                type="text"
                value={formData.icNumber}
                onChange={(e) => updateField('icNumber', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Diagnosis</label>
              <input
                type="text"
                value={formData.diagnosis}
                onChange={(e) => updateField('diagnosis', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Sick Leave Duration
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Number of Days</label>
              <div className="flex flex-wrap items-center gap-2">
                {[1, 2, 3, 5, 7].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => updateField('daysOff', days)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      formData.daysOff === days ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {days}
                  </button>
                ))}
                <input
                  type="number"
                  value={formData.daysOff}
                  onChange={(e) => updateField('daysOff', parseInt(e.target.value, 10) || 1)}
                  className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-center"
                  min={1}
                  max={30}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => updateField('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={formData.endDate}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Remarks</label>
              <textarea
                value={formData.remarks}
                onChange={(e) => updateField('remarks', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none h-16 text-sm"
                placeholder="Additional clinical instructions..."
              />
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.fitForLight}
                  onChange={(e) => updateField('fitForLight', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Fit for light duties only</span>
              </label>

              <label className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.followUp}
                  onChange={(e) => updateField('followUp', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Follow-up appointment required</span>
              </label>

              {formData.followUp && (
                <input
                  type="date"
                  value={formData.followUpDate || ''}
                  onChange={(e) => updateField('followUpDate', e.target.value)}
                  className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm"
                />
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-3">
          <FileText className="w-8 h-8 text-blue-600" />
          <div>
            <p className="text-2xl font-bold text-blue-700">{issuedList.length}</p>
            <p className="text-sm text-blue-600">MCs issued this session</p>
          </div>
        </div>

        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          <div>
            <p className="text-2xl font-bold text-emerald-700">Digital</p>
            <p className="text-sm text-emerald-600">Serial-numbered verification</p>
          </div>
        </div>

        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-center gap-3">
          <Clock className="w-8 h-8 text-amber-600" />
          <div>
            <p className="text-2xl font-bold text-amber-700">{avgDays}</p>
            <p className="text-sm text-amber-600">Average MC days</p>
          </div>
        </div>
      </div>
    </div>
  )
}
