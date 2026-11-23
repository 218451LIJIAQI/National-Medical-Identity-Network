import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import { useClinicalStore } from '@/store/clinical'
import { hospitalApi } from '@/lib/api'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { printHtmlDocument } from '@/lib/utils'
import { ClinicalPatientBanner } from '@/components/ClinicalPatientBanner'
import { useToast } from '@/components/ui/use-toast'
import {
  ArrowRightLeft,
  Building2,
  FileText,
  Send,
  Search,
  CheckCircle2,
  AlertCircle,
  MapPin,
  ChevronRight,
  Printer,
  Loader2,
} from 'lucide-react'

interface ReferralData {
  patientName: string
  icNumber: string
  referToHospital: string
  referToDepartment: string
  urgency: 'routine' | 'urgent' | 'emergency'
  reason: string
  clinicalSummary: string
  investigations: string[]
}

const hospitals = [
  { id: 'hospital-kl', name: 'KL General Hospital', city: 'Kuala Lumpur', state: 'W.P. Kuala Lumpur' },
  { id: 'hospital-penang', name: 'Penang Medical Centre', city: 'Georgetown', state: 'Pulau Pinang' },
  { id: 'hospital-jb', name: 'Johor Specialist Hospital', city: 'Johor Bahru', state: 'Johor' },
  { id: 'hospital-kuching', name: 'Sarawak General Hospital', city: 'Kuching', state: 'Sarawak' },
  { id: 'hospital-kk', name: 'Queen Elizabeth Hospital', city: 'Kota Kinabalu', state: 'Sabah' },
  { id: 'ijn', name: 'Institut Jantung Negara (IJN)', city: 'Kuala Lumpur', state: 'W.P. Kuala Lumpur' },
  { id: 'ppum', name: 'University of Malaya Medical Centre', city: 'Kuala Lumpur', state: 'W.P. Kuala Lumpur' },
]

const departments = [
  'General Medicine',
  'General Surgery',
  'Orthopaedics',
  'Cardiology',
  'Neurology',
  'Oncology',
  'Nephrology',
  'Pulmonology',
  'Obstetrics & Gynaecology (O&G)',
  'Paediatrics',
]

const URGENCY_OPTIONS: Array<{
  value: ReferralData['urgency']
  label: string
  desc: string
  activeClass: string
  dotClass: string
}> = [
  { value: 'routine', label: 'Routine', desc: 'Within 2-4 weeks', activeClass: 'border-emerald-400 bg-emerald-50', dotClass: 'bg-emerald-500' },
  { value: 'urgent', label: 'Urgent', desc: 'Within 48-72 hours', activeClass: 'border-amber-400 bg-amber-50', dotClass: 'bg-amber-500' },
  { value: 'emergency', label: 'Emergency', desc: 'Immediate transfer', activeClass: 'border-red-400 bg-red-50', dotClass: 'bg-red-500' },
]

interface ReferralProps {
  patientName?: string
  patientIC?: string
  fromHospital?: string
  onSubmit?: (data: ReferralData) => void
}

export default function Referral({
  patientName = '',
  patientIC = '',
  fromHospital,
  onSubmit,
}: ReferralProps) {
  const { user } = useAuthStore()
  const { activePatient } = useClinicalStore()
  const { toast } = useToast()
  const resolvedFromHospital = fromHospital || getHospitalTheme(user?.hospitalId).name

  const [formData, setFormData] = useState<ReferralData>({
    patientName: activePatient?.fullName || patientName,
    icNumber: activePatient?.icNumber || patientIC,
    referToHospital: '',
    referToDepartment: '',
    urgency: 'routine',
    reason: '',
    clinicalSummary: '',
    investigations: [],
  })
  const [searchHospital, setSearchHospital] = useState('')
  const [showHospitalList, setShowHospitalList] = useState(false)
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [submittedRef, setSubmittedRef] = useState<string | null>(null)

  useEffect(() => {
    if (activePatient) {
      setFormData((prev) => ({
        ...prev,
        patientName: activePatient.fullName,
        icNumber: activePatient.icNumber,
      }))
    }
  }, [activePatient])

  const filteredHospitals = hospitals.filter(
    (h) =>
      h.name !== resolvedFromHospital &&
      (h.name.toLowerCase().includes(searchHospital.toLowerCase()) ||
        h.city.toLowerCase().includes(searchHospital.toLowerCase()))
  )

  const updateField = <K extends keyof ReferralData>(field: K, value: ReferralData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const selectHospital = (hospital: (typeof hospitals)[0]) => {
    updateField('referToHospital', hospital.name)
    setSearchHospital(hospital.name)
    setShowHospitalList(false)
  }

  const toggleInvestigation = (inv: string) => {
    const current = formData.investigations
    updateField(
      'investigations',
      current.includes(inv) ? current.filter((i) => i !== inv) : [...current, inv]
    )
  }

  const isStepValid = (stepNum: number) => {
    if (stepNum === 1) return Boolean(formData.referToHospital && formData.referToDepartment)
    if (stepNum === 2) return Boolean(formData.reason.trim() && formData.clinicalSummary.trim())
    return stepNum === 3
  }

  const handlePrintReferral = () => {
    printHtmlDocument(
      `Inter-Hospital Referral ${submittedRef || ''}`,
      `<div class="header">
        <div><h1>Inter-Hospital Specialist Referral</h1><p>From: ${resolvedFromHospital}</p></div>
        <div><strong>Ref: ${submittedRef || 'PENDING'}</strong></div>
      </div>
      <div class="meta">
        <strong>Patient:</strong> ${formData.patientName || '-'} (${formData.icNumber || '-'})<br/>
        <strong>Destination:</strong> ${formData.referToHospital} — ${formData.referToDepartment}<br/>
        <strong>Urgency:</strong> ${formData.urgency.toUpperCase()}
      </div>
      <h3>Reason for Referral</h3><p>${formData.reason}</p>
      <h3>Clinical Summary</h3><p>${formData.clinicalSummary}</p>
      <h3>Completed Investigations</h3><p>${formData.investigations.join(', ') || 'None'}</p>
      <div class="footer">Referring Clinician: ${user?.fullName || 'Medical Officer'} • ${new Date().toLocaleString()}</div>`
    )
  }

  const handleSubmit = async () => {
    if (!formData.icNumber.trim()) {
      toast({
        title: 'Patient Required',
        description: 'Bind an active patient MyKad IC in the banner above before submitting referral.',
        variant: 'destructive',
      })
      return
    }

    onSubmit?.(formData)
    setSubmitting(true)
    try {
      const refId = `REF-${Date.now().toString().slice(-6)}`
      if (user?.role === 'doctor' && user.hospitalId) {
        const res = await hospitalApi.createRecord(user.hospitalId, {
          icNumber: formData.icNumber.trim(),
          visitDate: new Date().toISOString().split('T')[0],
          visitType: formData.urgency === 'emergency' ? 'emergency' : 'outpatient',
          chiefComplaint: `Referral to ${formData.referToHospital} (${formData.referToDepartment})`,
          diagnosis: [formData.reason.trim()],
          notes: `[${refId}] Inter-hospital ${formData.urgency} referral to ${formData.referToHospital} (${formData.referToDepartment}). Summary: ${formData.clinicalSummary}. Investigations: ${formData.investigations.join(', ') || 'None'}.`,
          patientName: formData.patientName.trim() || undefined,
        })
        if (!res.success) {
          toast({
            title: 'Referral Save Blocked',
            description: res.error || 'Could not save referral note.',
            variant: 'destructive',
          })
          return
        }
      }

      setSubmittedRef(refId)
      toast({
        title: 'Inter-Hospital Referral Transmitted',
        description: `${refId} sent to ${formData.referToHospital} (${formData.referToDepartment}).`,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <ClinicalPatientBanner />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Inter-Hospital Patient Referral</h2>
          <p className="text-gray-500 text-sm">Federated specialist transfer & clinical handover</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl text-sm">
          <Building2 className="w-4 h-4 text-blue-600" />
          <span className="text-blue-700 font-semibold">{resolvedFromHospital}</span>
          <ArrowRightLeft className="w-4 h-4 text-blue-400" />
        </div>
      </div>

      {submittedRef && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-emerald-900 text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Referral <code>{submittedRef}</code> recorded & transmitted to {formData.referToHospital}.</span>
          </div>
          <button
            type="button"
            onClick={handlePrintReferral}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-semibold text-emerald-800"
          >
            <Printer className="w-3.5 h-3.5" /> Print Letter
          </button>
        </div>
      )}

      <div className="flex items-center justify-center gap-3">
        {[
          { num: 1, label: 'Destination' },
          { num: 2, label: 'Clinical Summary' },
          { num: 3, label: 'Review & Transmit' },
        ].map((s, idx) => (
          <div key={s.num} className="flex items-center">
            <button
              type="button"
              onClick={() => setStep(s.num)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                step === s.num
                  ? 'bg-indigo-600 text-white shadow'
                  : step > s.num
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-500'
              }`}
            >
              <span>{s.num}.</span>
              <span>{s.label}</span>
            </button>
            {idx < 2 && <ChevronRight className="w-4 h-4 text-gray-300 mx-2" />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="grid md:grid-cols-2 gap-6"
          >
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                Receiving Hospital
              </h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search receiving hospital..."
                  value={searchHospital}
                  onChange={(e) => {
                    setSearchHospital(e.target.value)
                    setShowHospitalList(true)
                  }}
                  onFocus={() => setShowHospitalList(true)}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm"
                />
                {showHospitalList && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-gray-200 shadow-xl z-40 max-h-60 overflow-y-auto">
                    {filteredHospitals.map((hospital) => (
                      <button
                        key={hospital.id}
                        type="button"
                        onClick={() => selectHospital(hospital)}
                        className="w-full p-3 text-left hover:bg-indigo-50 border-b border-gray-50"
                      >
                        <p className="font-medium text-gray-900 text-sm">{hospital.name}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {hospital.city}, {hospital.state}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {formData.referToHospital && (
                <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200 flex items-center gap-2 text-sm text-indigo-800 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  <span>{formData.referToHospital}</span>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Specialty Department
              </h3>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {departments.map((dept) => (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => updateField('referToDepartment', dept)}
                    className={`w-full p-2.5 text-left rounded-lg text-sm transition-all ${
                      formData.referToDepartment === dept
                        ? 'bg-indigo-100 text-indigo-800 font-semibold border border-indigo-300'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-3">Referral Urgency</h3>
              <div className="grid sm:grid-cols-3 gap-4">
                {URGENCY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateField('urgency', opt.value)}
                    className={`p-4 rounded-xl border-2 text-left ${
                      formData.urgency === opt.value ? opt.activeClass : 'border-gray-200'
                    }`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${opt.dotClass} mb-2`} />
                    <p className="font-semibold text-gray-900 text-sm">{opt.label}</p>
                    <p className="text-xs text-gray-500">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-2">Primary Reason for Referral *</h3>
              <textarea
                value={formData.reason}
                onChange={(e) => updateField('reason', e.target.value)}
                placeholder="Specify provisional diagnosis and reason for specialist intervention..."
                className="w-full p-3 border border-gray-200 rounded-lg text-sm resize-none h-24"
              />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-2">Clinical Handover Summary *</h3>
              <textarea
                value={formData.clinicalSummary}
                onChange={(e) => updateField('clinicalSummary', e.target.value)}
                placeholder="History of presenting illness, examination findings, current medications..."
                className="w-full p-3 border border-gray-200 rounded-lg text-sm resize-none h-32"
              />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-3">Completed Workup Attached</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {['FBC', 'RFT', 'LFT', 'ECG', 'CXR', 'CT Scan', 'MRI', 'Ultrasound'].map((inv) => (
                  <button
                    key={inv}
                    type="button"
                    onClick={() => toggleInvestigation(inv)}
                    className={`p-2.5 rounded-lg text-xs font-semibold border ${
                      formData.investigations.includes(inv)
                        ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                        : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    {inv}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="bg-white rounded-xl border border-gray-200 shadow-lg p-7 max-w-2xl mx-auto space-y-5"
          >
            <h3 className="text-xl font-bold text-gray-900 text-center">Confirm Specialist Referral</h3>
            <div className="grid grid-cols-2 gap-4 p-4 bg-indigo-50 rounded-xl text-sm">
              <div>
                <p className="text-xs text-gray-500">Patient</p>
                <p className="font-bold text-gray-900">{formData.patientName || 'Unassigned'}</p>
                <code className="text-xs text-gray-600">{formData.icNumber || '-'}</code>
              </div>
              <div>
                <p className="text-xs text-gray-500">Destination</p>
                <p className="font-bold text-gray-900">{formData.referToHospital}</p>
                <p className="text-xs text-indigo-700">{formData.referToDepartment}</p>
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl text-sm space-y-2">
              <p><strong>Reason:</strong> {formData.reason}</p>
              <p><strong>Summary:</strong> {formData.clinicalSummary}</p>
              <p><strong>Urgency:</strong> <span className="uppercase font-bold">{formData.urgency}</span></p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handlePrintReferral}
                className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-50"
              >
                <Printer className="w-4 h-4" /> Print Letter
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                Transmit Referral & Save
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="px-5 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium disabled:opacity-40"
        >
          Previous Step
        </button>
        {step < 3 && (
          <button
            type="button"
            onClick={() => setStep(Math.min(3, step + 1))}
            disabled={!isStepValid(step)}
            className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
          >
            Next Step
          </button>
        )}
      </div>
    </div>
  )
}
