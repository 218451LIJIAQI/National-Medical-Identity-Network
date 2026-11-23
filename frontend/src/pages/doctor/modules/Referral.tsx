import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/auth'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { triggerPrintDocument, useSessionState } from '@/lib/workstation-storage'
import { WorkstationPatientBar, useWorkstationPatient } from '@/components/WorkstationPatientBar'
import { useToast } from '@/components/ui/use-toast'
import {
  ArrowRightLeft, Building2, FileText,
  Send, Search, CheckCircle2, AlertCircle,
  MapPin, ChevronRight, Printer
} from 'lucide-react'

export interface ReferralData {
  patientName: string
  icNumber: string
  referToHospital: string
  referToDepartment: string
  urgency: 'routine' | 'urgent' | 'emergency'
  reason: string
  clinicalSummary: string
  investigations: string[]
  appointmentPreferred?: string
}

const hospitals = [
  { id: 'hospital-kl', name: 'Kuala Lumpur General Hospital', city: 'Kuala Lumpur', state: 'W.P. Kuala Lumpur' },
  { id: 'hospital-penang', name: 'Penang General Hospital', city: 'George Town', state: 'Pulau Pinang' },
  { id: 'hospital-jb', name: 'Sultanah Aminah Hospital', city: 'Johor Bahru', state: 'Johor' },
  { id: 'hospital-kuching', name: 'Sarawak General Hospital', city: 'Kuching', state: 'Sarawak' },
  { id: 'hospital-kk', name: 'Queen Elizabeth Hospital', city: 'Kota Kinabalu', state: 'Sabah' },
  { id: 'ijn', name: 'National Heart Institute (IJN)', city: 'Kuala Lumpur', state: 'W.P. Kuala Lumpur' },
  { id: 'ppum', name: 'University of Malaya Medical Centre', city: 'Kuala Lumpur', state: 'W.P. Kuala Lumpur' },
  { id: 'hpj', name: 'Hospital Putrajaya', city: 'Putrajaya', state: 'W.P. Putrajaya' },
]

const departments = [
  'General Medicine',
  'General Surgery',
  'Orthopaedics',
  'Obstetrics & Gynaecology (O&G)',
  'Paediatrics',
  'Cardiology',
  'Neurology',
  'Oncology',
  'Nephrology',
  'Pulmonology',
  'Emergency & Trauma',
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
  patientName,
  patientIC,
  fromHospital,
  onSubmit,
}: ReferralProps) {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const resolvedFromHospital = fromHospital || getHospitalTheme(user?.hospitalId).name
  const { patient, lookupPatient, loading, lookupNotice } = useWorkstationPatient(patientName, patientIC)

  const [formData, setFormData] = useState<ReferralData>({
    patientName: patient.fullName,
    icNumber: patient.icNumber,
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
  const [referralsSent, setReferralsSent] = useSessionState<
    Array<ReferralData & { refNo: string; sentAt: string }>
  >(`referrals:${user?.hospitalId || 'default'}`, [])

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      patientName: patient.fullName,
      icNumber: patient.icNumber,
    }))
  }, [patient.fullName, patient.icNumber])

  const filteredHospitals = hospitals.filter(
    (h) =>
      h.id !== user?.hospitalId &&
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

  const handlePrint = (data: ReferralData, refNo = 'DRAFT') => {
    triggerPrintDocument(
      `Referral Letter ${refNo}`,
      `<h1>Inter-Hospital Specialist Referral Letter</h1>
       <div class="meta">Ref: <strong>${refNo}</strong> • From: <strong>${resolvedFromHospital}</strong> (${user?.fullName || 'Medical Officer'})</div>
       <p><strong>To:</strong> ${data.referToDepartment}, ${data.referToHospital}</p>
       <p><strong>Patient:</strong> ${data.patientName} (IC: ${data.icNumber}) • <strong>Urgency:</strong> ${data.urgency.toUpperCase()}</p>
       <h2>Reason for Referral</h2><p>${data.reason}</p>
       <h2>Clinical Summary</h2><p>${data.clinicalSummary}</p>
       <h2>Completed Investigations</h2><p>${data.investigations.join(', ') || 'None attached'}</p>`
    )
  }

  const handleSubmit = () => {
    if (!isStepValid(1) || !isStepValid(2)) return
    onSubmit?.(formData)
    const refNo = `REF-${Date.now().toString().slice(-6)}`
    setReferralsSent((prev) => [
      {
        ...formData,
        refNo,
        sentAt: new Date().toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }),
      },
      ...prev.slice(0, 9),
    ])
    toast({
      title: `Referral ${refNo} Dispatched`,
      description: `Referred ${formData.patientName} to ${formData.referToDepartment} at ${formData.referToHospital}`,
    })
    setFormData((prev) => ({
      ...prev,
      referToHospital: '',
      referToDepartment: '',
      reason: '',
      clinicalSummary: '',
      investigations: [],
    }))
    setSearchHospital('')
    setStep(1)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Patient Referral</h2>
          <p className="text-gray-500 text-sm">Inter-Hospital Specialist Transfer Letter (session-persisted)</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl">
          <Building2 className="w-5 h-5 text-blue-600" />
          <span className="text-blue-700 font-medium text-sm">{resolvedFromHospital}</span>
          <ArrowRightLeft className="w-4 h-4 text-blue-400" />
        </div>
      </div>

      <WorkstationPatientBar
        patient={patient}
        onLookup={lookupPatient}
        loading={loading}
        notice={lookupNotice}
        accentClass="from-indigo-50 to-blue-50 border-indigo-200"
      />

      <div className="flex items-center justify-center gap-3 flex-wrap">
        {[
          { num: 1, label: 'Destination' },
          { num: 2, label: 'Clinical Summary' },
          { num: 3, label: 'Review & Dispatch' },
        ].map((s, idx) => (
          <div key={s.num} className="flex items-center">
            <button
              type="button"
              onClick={() => {
                if (s.num === 1 || (s.num === 2 && isStepValid(1)) || (s.num === 3 && isStepValid(1) && isStepValid(2))) {
                  setStep(s.num)
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all text-sm ${
                step === s.num
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : step > s.num
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-500'
              }`}
            >
              {step > s.num ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                  {s.num}
                </span>
              )}
              <span className="font-medium">{s.label}</span>
            </button>
            {idx < 2 && <ChevronRight className="w-4 h-4 text-gray-300 mx-2" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              Receiving Hospital
            </h3>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search destination hospital..."
                value={searchHospital}
                onChange={(e) => {
                  setSearchHospital(e.target.value)
                  setShowHospitalList(true)
                }}
                onFocus={() => setShowHospitalList(true)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
              />

              {showHospitalList && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-xl z-50 max-h-64 overflow-y-auto">
                  {filteredHospitals.map((hospital) => (
                    <button
                      key={hospital.id}
                      type="button"
                      onClick={() => selectHospital(hospital)}
                      className="w-full p-3.5 text-left hover:bg-indigo-50 border-b border-gray-50 last:border-0"
                    >
                      <p className="font-medium text-gray-800 text-sm">{hospital.name}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {hospital.city}, {hospital.state}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {formData.referToHospital && (
              <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                <div>
                  <p className="font-medium text-indigo-800 text-sm">{formData.referToHospital}</p>
                  <p className="text-xs text-indigo-600">Destination hospital selected</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Specialist Department
            </h3>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {departments.map((dept) => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => updateField('referToDepartment', dept)}
                  className={`w-full p-3 text-left rounded-lg text-sm transition-all ${
                    formData.referToDepartment === dept
                      ? 'bg-indigo-100 text-indigo-800 border-2 border-indigo-300 font-medium'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-2 border-transparent'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Urgency Level</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {URGENCY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateField('urgency', opt.value)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    formData.urgency === opt.value ? opt.activeClass : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full ${opt.dotClass} mb-2`} />
                  <p className="font-semibold text-gray-800">{opt.label}</p>
                  <p className="text-sm text-gray-500">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-800 mb-3">Reason for Referral *</h3>
            <textarea
              value={formData.reason}
              onChange={(e) => updateField('reason', e.target.value)}
              placeholder="State clinical indication for specialist opinion or transfer..."
              className="w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none h-28 text-sm"
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-800 mb-3">Clinical Summary *</h3>
            <textarea
              value={formData.clinicalSummary}
              onChange={(e) => updateField('clinicalSummary', e.target.value)}
              placeholder="Relevant history, physical examination findings, current medications..."
              className="w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none h-32 text-sm"
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-800 mb-3">Investigations Completed</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {['FBC', 'RFT', 'LFT', 'ECG', 'CXR', 'CT Scan', 'MRI', 'Ultrasound'].map((inv) => (
                <button
                  key={inv}
                  type="button"
                  onClick={() => toggleInvestigation(inv)}
                  className={`p-3 rounded-lg text-sm font-medium transition-all ${
                    formData.investigations.includes(inv)
                      ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
                  }`}
                >
                  {inv}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-8">
          <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">Referral Confirmation</h3>

          <div className="max-w-2xl mx-auto space-y-5">
            <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl grid sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-gray-500 mb-1">Patient</p>
                <p className="font-semibold text-gray-800">{formData.patientName}</p>
                <code className="text-xs text-gray-600 font-mono">{formData.icNumber}</code>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Refer To</p>
                <p className="font-semibold text-gray-800">{formData.referToHospital}</p>
                <p className="text-sm text-gray-600">{formData.referToDepartment}</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Reason for Referral</p>
              <p className="text-gray-800 text-sm">{formData.reason}</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Clinical Summary</p>
              <p className="text-gray-800 text-sm">{formData.clinicalSummary}</p>
            </div>

            <div className={`p-4 rounded-lg flex items-center gap-3 ${
              formData.urgency === 'emergency' ? 'bg-red-100' : formData.urgency === 'urgent' ? 'bg-amber-100' : 'bg-emerald-100'
            }`}>
              <AlertCircle className="w-5 h-5 text-gray-700" />
              <span className="font-semibold text-gray-800 uppercase text-sm">{formData.urgency} REFERRAL</span>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handlePrint(formData)}
                className="px-5 py-3.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 flex items-center gap-2"
              >
                <Printer className="w-5 h-5" />
                Print Letter
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="flex-1 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                Dispatch Referral
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-medium disabled:opacity-50"
        >
          Back
        </button>
        {step < 3 && (
          <button
            type="button"
            onClick={() => setStep(Math.min(3, step + 1))}
            disabled={!isStepValid(step)}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-50"
          >
            Next
          </button>
        )}
      </div>

      {referralsSent.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Dispatched Referrals This Session</h3>
          <div className="space-y-2">
            {referralsSent.map((r) => (
              <div key={r.refNo} className="flex flex-wrap items-center justify-between gap-2 text-xs p-2.5 bg-gray-50 rounded-lg">
                <span className="font-mono font-semibold text-indigo-700">{r.refNo}</span>
                <span className="font-medium text-gray-800">{r.patientName} → {r.referToHospital} ({r.referToDepartment})</span>
                <button
                  type="button"
                  onClick={() => handlePrint(r, r.refNo)}
                  className="text-indigo-600 hover:underline font-medium"
                >
                  Print Letter
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
