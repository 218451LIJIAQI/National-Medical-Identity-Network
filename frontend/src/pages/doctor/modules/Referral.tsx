import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRightLeft, Building2, User, FileText,
  Send, Search, CheckCircle2, AlertCircle,
  MapPin, ChevronRight
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
  appointmentPreferred?: string
}
const hospitals = [
  { id: 'hkl', name: 'Hospital Kuala Lumpur', city: 'Kuala Lumpur', state: 'W.P. Kuala Lumpur' },
  { id: 'hpj', name: 'Hospital Putrajaya', city: 'Putrajaya', state: 'W.P. Putrajaya' },
  { id: 'hsg', name: 'Hospital Sungai Buloh', city: 'Sungai Buloh', state: 'Selangor' },
  { id: 'htar', name: 'Hospital Tengku Ampuan Rahimah', city: 'Klang', state: 'Selangor' },
  { id: 'ppum', name: 'University of Malaya Medical Centre', city: 'Kuala Lumpur', state: 'W.P. Kuala Lumpur' },
  { id: 'hukm', name: 'Hospital Canselor Tuanku Muhriz (HUKM)', city: 'Cheras', state: 'W.P. Kuala Lumpur' },
  { id: 'ijn', name: 'National Heart Institute', city: 'Kuala Lumpur', state: 'W.P. Kuala Lumpur' },
  { id: 'hpg', name: 'Hospital Pulau Pinang', city: 'George Town', state: 'Pulau Pinang' },
  { id: 'hsajb', name: 'Hospital Sultanah Aminah', city: 'Johor Bahru', state: 'Johor' },
  { id: 'hus', name: 'Hospital Universiti Sains Malaysia', city: 'Kubang Kerian', state: 'Kelantan' },
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
  'Psychiatry',
  'Dermatology',
  'ENT (Ear, Nose & Throat)',
  'Ophthalmology',
  'Physiotherapy',
  'Radiology',
]

interface ReferralProps {
  patientName?: string
  patientIC?: string
  fromHospital?: string
  onSubmit?: (data: ReferralData) => void
}

export default function Referral({
  patientName = 'Ahmad bin Abdullah',
  patientIC = '880515-14-5678',
  fromHospital = 'Hospital Kuala Lumpur',
  onSubmit
}: ReferralProps) {
  const [formData, setFormData] = useState<ReferralData>({
    patientName,
    icNumber: patientIC,
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

  const filteredHospitals = hospitals.filter(h =>
    h.name.toLowerCase().includes(searchHospital.toLowerCase()) ||
    h.city.toLowerCase().includes(searchHospital.toLowerCase())
  )

  const updateField = (field: keyof ReferralData, value: string | string[]) => {
    setFormData({ ...formData, [field]: value })
  }

  const selectHospital = (hospital: typeof hospitals[0]) => {
    updateField('referToHospital', hospital.name)
    setSearchHospital(hospital.name)
    setShowHospitalList(false)
  }

  const toggleInvestigation = (inv: string) => {
    const current = formData.investigations
    if (current.includes(inv)) {
      updateField('investigations', current.filter(i => i !== inv))
    } else {
      updateField('investigations', [...current, inv])
    }
  }

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit(formData)
    }
  }

  const isStepValid = (stepNum: number) => {
    switch (stepNum) {
      case 1: return formData.referToHospital && formData.referToDepartment
      case 2: return formData.reason && formData.clinicalSummary
      case 3: return true
      default: return false
    }
  }

  return (
    <div className="space-y-6">
            <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Patient Referral</h2>
          <p className="text-gray-500">Patient Referral • Referral Form</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl">
          <Building2 className="w-5 h-5 text-blue-600" />
          <span className="text-blue-700 font-medium">{fromHospital}</span>
          <ArrowRightLeft className="w-4 h-4 text-blue-400" />
        </div>
      </div>

            <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center">
            <User className="w-7 h-7 text-indigo-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-lg">{formData.patientName}</p>
            <code className="text-sm text-gray-600 bg-white px-2 py-0.5 rounded">{formData.icNumber}</code>
          </div>
        </div>
      </div>

            <div className="flex items-center justify-center gap-4">
        {[
          { num: 1, label: 'Destination' },
          { num: 2, label: 'Clinical Info' },
          { num: 3, label: 'Confirmation' },
        ].map((s, idx) => (
          <div key={s.num} className="flex items-center">
            <motion.button
              onClick={() => setStep(s.num)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                step === s.num
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : step > s.num
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-500'
              }`}
              whileHover={{ scale: 1.05 }}
            >
              {step > s.num ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                  {s.num}
                </span>
              )}
              <span className="font-medium">{s.label}</span>
            </motion.button>
            {idx < 2 && (
              <ChevronRight className="w-5 h-5 text-gray-300 mx-2" />
            )}
          </div>
        ))}
      </div>

            <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-2 gap-6"
          >
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                Referral Hospital
              </h3>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search hospital..."
                  value={searchHospital}
                  onChange={(e) => {
                    setSearchHospital(e.target.value)
                    setShowHospitalList(true)
                  }}
                  onFocus={() => setShowHospitalList(true)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />

                {showHospitalList && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-xl z-50 max-h-64 overflow-y-auto">
                    {filteredHospitals.map(hospital => (
                      <button
                        key={hospital.id}
                        onClick={() => selectHospital(hospital)}
                        className="w-full p-4 text-left hover:bg-indigo-50 border-b border-gray-50 last:border-0"
                      >
                        <p className="font-medium text-gray-800">{hospital.name}</p>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {hospital.city}, {hospital.state}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {formData.referToHospital && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                    <div>
                      <p className="font-medium text-indigo-800">{formData.referToHospital}</p>
                      <p className="text-sm text-indigo-600">Hospital selected</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Department
              </h3>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {departments.map(dept => (
                  <button
                    key={dept}
                    onClick={() => updateField('referToDepartment', dept)}
                    className={`w-full p-3 text-left rounded-lg transition-all ${
                      formData.referToDepartment === dept
                        ? 'bg-indigo-100 text-indigo-800 border-2 border-indigo-300'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </div>

                        <div className="col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Urgency Level</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { value: 'routine', label: 'Routine', desc: 'Within 2-4 weeks', color: 'emerald' },
                  { value: 'urgent', label: 'Urgent', desc: 'Within 48-72 hours', color: 'amber' },
                  { value: 'emergency', label: 'Emergency', desc: 'Immediately', color: 'red' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => updateField('urgency', opt.value)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      formData.urgency === opt.value
                        ? `border-${opt.color}-400 bg-${opt.color}-50`
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full bg-${opt.color}-500 mb-2`} />
                    <p className="font-semibold text-gray-800">{opt.label}</p>
                    <p className="text-sm text-gray-500">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Reason for Referral</h3>
              <textarea
                value={formData.reason}
                onChange={(e) => updateField('reason', e.target.value)}
                placeholder="State reason for referral clearly..."
                className="w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none h-32"
              />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Clinical Summary</h3>
              <textarea
                value={formData.clinicalSummary}
                onChange={(e) => updateField('clinicalSummary', e.target.value)}
                placeholder="Patient history, symptoms, physical examination findings..."
                className="w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none h-40"
              />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Investigations Done</h3>
              <div className="grid grid-cols-4 gap-3">
                {['FBC', 'RFT', 'LFT', 'ECG', 'CXR', 'CT Scan', 'MRI', 'Ultrasound'].map(inv => (
                  <button
                    key={inv}
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
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-xl border border-gray-200 shadow-lg p-8"
          >
            <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">Referral Confirmation</h3>

            <div className="max-w-2xl mx-auto space-y-6">
                            <div className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Patient</p>
                    <p className="font-semibold text-gray-800">{formData.patientName}</p>
                    <code className="text-sm text-gray-600">{formData.icNumber}</code>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Refer To</p>
                    <p className="font-semibold text-gray-800">{formData.referToHospital || '-'}</p>
                    <p className="text-sm text-gray-600">{formData.referToDepartment || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Reason for Referral</p>
                <p className="text-gray-800">{formData.reason || '-'}</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Clinical Summary</p>
                <p className="text-gray-800">{formData.clinicalSummary || '-'}</p>
              </div>

              <div className={`p-4 rounded-lg flex items-center gap-3 ${
                formData.urgency === 'emergency' ? 'bg-red-100' :
                formData.urgency === 'urgent' ? 'bg-amber-100' : 'bg-emerald-100'
              }`}>
                <AlertCircle className={`w-5 h-5 ${
                  formData.urgency === 'emergency' ? 'text-red-600' :
                  formData.urgency === 'urgent' ? 'text-amber-600' : 'text-emerald-600'
                }`} />
                <div>
                  <p className="font-semibold text-gray-800">
                    {formData.urgency === 'emergency' ? 'EMERGENCY' :
                     formData.urgency === 'urgent' ? 'URGENT' : 'ROUTINE'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {formData.urgency === 'emergency' ? 'Referral will be sent immediately' :
                     formData.urgency === 'urgent' ? 'Appointment within 48-72 hours' : 'Appointment within 2-4 weeks'}
                  </p>
                </div>
              </div>

              <motion.button
                onClick={handleSubmit}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Send className="w-6 h-6" />
                Submit Referral
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

            <div className="flex justify-between">
        <button
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
        >
          Back
        </button>
        {step < 3 && (
          <button
            onClick={() => setStep(Math.min(3, step + 1))}
            disabled={!isStepValid(step)}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700"
          >
            Next
          </button>
        )}
      </div>
    </div>
  )
}
