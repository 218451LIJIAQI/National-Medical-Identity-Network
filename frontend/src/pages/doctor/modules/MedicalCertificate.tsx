import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/auth'
import { useClinicalStore } from '@/store/clinical'
import { hospitalApi } from '@/lib/api'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { useTranslation } from '@/lib/i18n'
import { cn, escapeHtml, formatDate, printHtmlDocument } from '@/lib/utils'
import {
  ClinicalPatientBanner,
  WorkstationModuleHeader,
  PatientRequiredGate,
} from '@/components/ClinicalPatientBanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import {
  FileText,
  Printer,
  Send,
  Building2,
  Eye,
  Loader2,
  CheckCircle2,
} from 'lucide-react'

function generateMcSerial(code: string) {
  return `MC/${code}/${new Date().getFullYear()}/${Math.floor(10000 + Math.random() * 89999)}`
}

export default function MedicalCertificate() {
  const user = useAuthStore((s) => s.user)
  const { activePatient } = useClinicalStore()
  const { t } = useTranslation()
  const { toast } = useToast()
  const theme = getHospitalTheme(user?.hospitalId)

  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const [diagnosis, setDiagnosis] = useState('Upper Respiratory Tract Infection (URTI)')
  const [daysOff, setDaysOff] = useState(2)
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(tomorrow)
  const [remarks, setRemarks] = useState('')
  const [fitForLight, setFitForLight] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [issuing, setIssuing] = useState(false)
  const [issuedMcNo, setIssuedMcNo] = useState<string | null>(null)
  const [mcNumber, setMcNumber] = useState(() => generateMcSerial(theme.code))
  const submitLockRef = useRef(false)

  // Reset MC form & regenerate serial whenever active patient switches or unbinds
  useEffect(() => {
    setDiagnosis('Upper Respiratory Tract Infection (URTI)')
    setDaysOff(2)
    setStartDate(today)
    setEndDate(tomorrow)
    setRemarks('')
    setFitForLight(false)
    setShowPreview(false)
    setIssuedMcNo(null)
    setMcNumber(generateMcSerial(theme.code))
  }, [activePatient?.icNumber, theme.code, today, tomorrow])

  const handleDaysChange = (val: number) => {
    const clamped = Math.min(90, Math.max(1, val))
    setDaysOff(clamped)
    const start = new Date(startDate)
    if (!Number.isNaN(start.getTime())) {
      setEndDate(new Date(start.getTime() + (clamped - 1) * 86400000).toISOString().split('T')[0])
    }
  }

  const handleStartChange = (val: string) => {
    setStartDate(val)
    const start = new Date(val)
    if (!Number.isNaN(start.getTime())) {
      setEndDate(new Date(start.getTime() + Math.max(0, daysOff - 1) * 86400000).toISOString().split('T')[0])
    }
  }

  const resolvedDoctorName = user?.fullName || `Dr. ${user?.icNumber}`
  const resolvedLicense = user?.licenseNumber || 'MMC-VERIFIED'

  const handlePrint = () => {
    if (!activePatient) return
    printHtmlDocument(
      `Medical Certificate ${mcNumber}`,
      `<div class="header">
        <div><h1>${escapeHtml(theme.name)}</h1><p>Ministry of Health Malaysia • Official Sijil Cuti Sakit</p></div>
        <div><strong>${escapeHtml(mcNumber)}</strong></div>
      </div>
      <div class="meta">
        <p>This is to certify that <strong>${escapeHtml(activePatient.fullName)}</strong> (MyKad IC: <strong>${escapeHtml(activePatient.icNumber)}</strong>) was clinically examined and found unfit for duty for <strong>${escapeHtml(daysOff)} day(s)</strong> from <strong>${escapeHtml(formatDate(startDate))}</strong> to <strong>${escapeHtml(formatDate(endDate))}</strong> inclusive.</p>
        <p><strong>Clinical Diagnosis:</strong> ${escapeHtml(diagnosis)}</p>
        ${fitForLight ? '<p><strong>Note:</strong> Fit for light duties upon return.</p>' : ''}
        ${remarks ? `<p><strong>Remarks:</strong> ${escapeHtml(remarks)}</p>` : ''}
      </div>
      <div class="footer">
        Issued by ${escapeHtml(resolvedDoctorName)} (${escapeHtml(resolvedLicense)}) on ${escapeHtml(formatDate(today))}
      </div>`
    )
  }

  const handleIssue = async () => {
    if (!activePatient || submitLockRef.current || !user?.hospitalId) return
    if (!diagnosis.trim()) {
      toast({
        title: 'Diagnosis Required',
        description: 'Enter a clinical diagnosis before issuing an official Medical Certificate.',
        variant: 'destructive',
      })
      return
    }

    submitLockRef.current = true
    setIssuing(true)
    try {
      const currentSerial = issuedMcNo ? generateMcSerial(theme.code) : mcNumber
      const res = await hospitalApi.createRecord(user.hospitalId, {
        icNumber: activePatient.icNumber,
        visitDate: today,
        visitType: 'outpatient',
        chiefComplaint: 'Medical Certificate Consultation',
        diagnosis: [diagnosis.trim()],
        notes: `Issued ${currentSerial}: ${daysOff} day(s) sick leave (${startDate} to ${endDate}).${fitForLight ? ' Fit for light duties.' : ''} ${remarks}`.trim(),
        patientName: activePatient.fullName,
      })

      if (res.success) {
        setMcNumber(currentSerial)
        setIssuedMcNo(currentSerial)
        setShowPreview(true)
        toast({
          title: 'Medical Certificate Issued',
          description: `${currentSerial} saved to ${activePatient.fullName}'s medical record.`,
          variant: 'success',
        })
      } else {
        toast({
          title: 'MC Issuance Blocked',
          description: res.error || 'Could not log Medical Certificate.',
          variant: 'destructive',
        })
      }
    } finally {
      submitLockRef.current = false
      setIssuing(false)
    }
  }

  return (
    <div className="space-y-6">
      <ClinicalPatientBanner />

      <WorkstationModuleHeader
        icon={FileText}
        title={t.medicalCert}
        subtitle="Official MOH Sijil Cuti Sakit issuance with serial audit & patient timeline logging"
        actions={
          activePatient ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowPreview((p) => !p)}>
                <Eye className="w-4 h-4 mr-1.5" />
                {showPreview ? 'Edit Form' : 'Preview MC'}
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-1.5" />
                {t.printSummary}
              </Button>
              <Button
                size="sm"
                disabled={issuing}
                onClick={handleIssue}
                className={cn('text-white bg-gradient-to-r font-bold', theme.buttonGradient)}
              >
                {issuing ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Send className="w-4 h-4 mr-1.5" />}
                Issue & Save MC
              </Button>
            </>
          ) : undefined
        }
      />

      {!activePatient ? (
        <PatientRequiredGate moduleTitle={t.medicalCert} />
      ) : (
        <>
          {issuedMcNo && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                Certificate <code className="font-mono tabular-nums">{issuedMcNo}</code> issued and permanently recorded in {activePatient.fullName}'s federated history.
              </span>
            </div>
          )}

          {showPreview ? (
            <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-lg overflow-hidden max-w-2xl mx-auto">
              <div className={cn('bg-gradient-to-r text-white p-6 flex items-center justify-between gap-4', theme.headerGradient)}>
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">{theme.name}</h2>
                    <p className="text-white/85 text-xs">Kementerian Kesihatan Malaysia</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-white/80">Serial No</p>
                  <p className="font-mono font-bold text-xs tabular-nums">{mcNumber}</p>
                </div>
              </div>

              <div className="p-7 space-y-4 text-sm text-slate-700">
                <h3 className="text-base font-bold text-center text-slate-900 border-b border-slate-200 pb-3">
                  SIJIL CUTI SAKIT / OFFICIAL MEDICAL CERTIFICATE
                </h3>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <p>
                    Patient Name: <strong className="text-slate-900">{activePatient.fullName}</strong>
                  </p>
                  <p className="tabular-nums">
                    MyKad IC: <strong className="font-mono text-slate-900">{activePatient.icNumber}</strong>
                  </p>
                </div>
                <p className="leading-relaxed tabular-nums">
                  I hereby certify that I have clinically examined the above-named patient and consider them unfit for duty for{' '}
                  <strong className="text-slate-900">{daysOff} day(s)</strong> from{' '}
                  <strong className="text-slate-900">{formatDate(startDate)}</strong> to{' '}
                  <strong className="text-slate-900">{formatDate(endDate)}</strong> inclusive.
                </p>
                <p>
                  <strong>Diagnosis:</strong> {diagnosis}
                </p>
                {fitForLight && (
                  <p className="text-xs font-semibold text-amber-800">
                    • Recommended for light duties upon completion of medical leave.
                  </p>
                )}
                {remarks && (
                  <p className="text-xs text-slate-600">
                    <strong>Clinician Remarks:</strong> {remarks}
                  </p>
                )}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 tabular-nums">
                  <span>
                    Attending Clinician: <strong className="text-slate-800">{resolvedDoctorName}</strong> ({resolvedLicense})
                  </span>
                  <span>Date: {formatDate(today)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5 max-w-3xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="mc-patient-name" className="text-xs font-bold text-slate-600">
                    Bound Patient Name
                  </label>
                  <Input id="mc-patient-name" value={activePatient.fullName} readOnly className="mt-1 bg-slate-50 font-semibold" />
                </div>
                <div>
                  <label htmlFor="mc-patient-ic" className="text-xs font-bold text-slate-600">
                    Bound MyKad IC
                  </label>
                  <Input id="mc-patient-ic" value={activePatient.icNumber} readOnly className="mt-1 bg-slate-50 font-mono tabular-nums" />
                </div>
              </div>

              <div>
                <label htmlFor="mc-diagnosis" className="text-xs font-bold text-slate-700">
                  Clinical Diagnosis *
                </label>
                <Input
                  id="mc-diagnosis"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="mt-1"
                  placeholder="Primary clinical diagnosis…"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 tabular-nums">
                <div>
                  <label htmlFor="mc-days" className="text-xs font-bold text-slate-700">
                    Leave Duration (Days)
                  </label>
                  <Input
                    id="mc-days"
                    type="number"
                    min={1}
                    max={90}
                    value={daysOff}
                    onChange={(e) => handleDaysChange(Number(e.target.value) || 1)}
                    className="mt-1 tabular-nums"
                  />
                </div>
                <div>
                  <label htmlFor="mc-start" className="text-xs font-bold text-slate-700">
                    Start Date
                  </label>
                  <Input
                    id="mc-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => handleStartChange(e.target.value)}
                    className="mt-1 tabular-nums"
                  />
                </div>
                <div>
                  <label htmlFor="mc-end" className="text-xs font-bold text-slate-700">
                    End Date (Inclusive)
                  </label>
                  <Input id="mc-end" type="date" value={endDate} readOnly className="mt-1 bg-slate-50 tabular-nums" />
                </div>
              </div>

              <div>
                <label htmlFor="mc-remarks" className="text-xs font-bold text-slate-700">
                  Clinical Remarks (Optional)
                </label>
                <Input
                  id="mc-remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Rest advised, review if fever persists…"
                  className="mt-1"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fitForLight}
                  onChange={(e) => setFitForLight(e.target.checked)}
                />
                Recommend light duties after medical leave period
              </label>
            </div>
          )}
        </>
      )}
    </div>
  )
}
