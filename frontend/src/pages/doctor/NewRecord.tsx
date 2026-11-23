import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/store/auth'
import { useClinicalStore } from '@/store/clinical'
import { hospitalApi, type PrescriptionDto, type LabReportDto } from '@/lib/api'
import { useTranslation } from '@/lib/i18n'
import {
  ArrowLeft,
  Save,
  Loader2,
  FileText,
  Calendar,
  Stethoscope,
  User,
  AlertTriangle,
  Heart,
  Thermometer,
  Activity,
  Pill,
  FlaskConical,
  Plus,
  Trash2,
  ShieldAlert,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { formatIC, parseMyKadDemographics } from '@/lib/utils'

const EMPTY_PRESCRIPTION: PrescriptionDto = {
  medicationName: '',
  dosage: '',
  frequency: 'Once daily',
  duration: '7 days',
  quantity: 7,
  instructions: 'Take after meals',
  isActive: true,
}

const EMPTY_LAB_REPORT: LabReportDto = {
  testType: 'Blood Chemistry',
  testName: '',
  result: '',
  unit: '',
  referenceRange: '',
  isAbnormal: false,
  reportDate: new Date().toISOString().split('T')[0],
  notes: '',
}

export default function NewRecord() {
  const { icNumber, recordId } = useParams<{ icNumber: string; recordId?: string }>()
  const isEditMode = Boolean(recordId)
  const formattedIc = formatIC(icNumber || '')

  const navigate = useNavigate()
  const { toast } = useToast()
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const { setActivePatient } = useClinicalStore()
  const theme = getHospitalTheme(user?.hospitalId)

  const [saving, setSaving] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [blockingError, setBlockingError] = useState<string | null>(null)
  const [patientExists, setPatientExists] = useState(false)
  const [isFederatedFirstVisit, setIsFederatedFirstVisit] = useState(false)

  const [patientInfo, setPatientInfo] = useState<{
    fullName: string
    dateOfBirth: string
    gender: 'male' | 'female'
    bloodType: string
    allergies: string[]
    chronicConditions: string[]
  } | null>(null)

  const inferredDemographics = parseMyKadDemographics(formattedIc)

  const [formData, setFormData] = useState({
    visitDate: new Date().toISOString().split('T')[0],
    visitType: 'outpatient',
    chiefComplaint: '',
    diagnosis: '',
    diagnosisCodes: '',
    symptoms: '',
    notes: '',
    followUpDate: '',
    patientName: '',
    dateOfBirth: inferredDemographics?.dateOfBirth || '',
    gender: (inferredDemographics?.gender || 'male') as 'male' | 'female',
    bloodType: '',
    allergiesInput: '',
    chronicConditionsInput: '',
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    heartRate: '',
    temperature: '',
    oxygenSaturation: '',
    weight: '',
    height: '',
  })

  const [prescriptions, setPrescriptions] = useState<PrescriptionDto[]>([])
  const [labReports, setLabReports] = useState<LabReportDto[]>([])

  useEffect(() => {
    async function initializeForm() {
      if (!formattedIc || !user?.hospitalId) {
        setLoadingInitial(false)
        return
      }

      setLoadingInitial(true)
      setBlockingError(null)

      try {
        const patientRes = await hospitalApi.getPatient(user.hospitalId, formattedIc)

        if (patientRes.accessDenied) {
          setBlockingError(patientRes.error || t.privacyRestrictedDesc)
          setLoadingInitial(false)
          return
        }

        if (patientRes.success && patientRes.data?.patient) {
          const p = patientRes.data.patient
          const fullName = String(p.fullName || '')
          const genderVal = p.gender === 'female' ? 'female' : 'male'
          const allergiesArr = Array.isArray(p.allergies) ? (p.allergies as string[]) : []
          const conditionsArr = Array.isArray(p.chronicConditions) ? (p.chronicConditions as string[]) : []

          setPatientExists(true)
          setIsFederatedFirstVisit(!patientRes.data.isLocal)
          setPatientInfo({
            fullName,
            dateOfBirth: String(p.dateOfBirth || ''),
            gender: genderVal,
            bloodType: String(p.bloodType || ''),
            allergies: allergiesArr,
            chronicConditions: conditionsArr,
          })
          setActivePatient({
            icNumber: formattedIc,
            fullName,
            dateOfBirth: String(p.dateOfBirth || ''),
            gender: genderVal,
            bloodType: String(p.bloodType || ''),
            allergies: allergiesArr,
            chronicConditions: conditionsArr,
          })
          setFormData((prev) => ({
            ...prev,
            patientName: fullName,
            dateOfBirth: String(p.dateOfBirth || prev.dateOfBirth),
            gender: genderVal,
            bloodType: String(p.bloodType || ''),
            allergiesInput: allergiesArr.join(', '),
            chronicConditionsInput: conditionsArr.join(', '),
          }))
        } else {
          setPatientExists(false)
        }

        if (isEditMode && recordId) {
          const recordRes = await hospitalApi.getRecord(user.hospitalId, recordId)
          if (!recordRes.success || !recordRes.data) {
            setBlockingError(
              recordRes.error || 'Record not found or cross-hospital records cannot be modified.'
            )
            setLoadingInitial(false)
            return
          }

          const rec = recordRes.data
          if (rec.hospitalId !== user.hospitalId || rec.isReadOnly) {
            setBlockingError('Cross-hospital records are strictly read-only.')
            setLoadingInitial(false)
            return
          }

          setFormData((prev) => ({
            ...prev,
            visitDate: rec.visitDate || prev.visitDate,
            visitType: rec.visitType || 'outpatient',
            chiefComplaint: rec.chiefComplaint || '',
            diagnosis: (rec.diagnosis || []).join(', '),
            diagnosisCodes: (rec.diagnosisCodes || []).join(', '),
            symptoms: (rec.symptoms || []).join(', '),
            notes: rec.notes || '',
            followUpDate: rec.followUpDate || '',
            bloodPressureSystolic: rec.vitalSigns?.bloodPressureSystolic
              ? String(rec.vitalSigns.bloodPressureSystolic)
              : '',
            bloodPressureDiastolic: rec.vitalSigns?.bloodPressureDiastolic
              ? String(rec.vitalSigns.bloodPressureDiastolic)
              : '',
            heartRate: rec.vitalSigns?.heartRate ? String(rec.vitalSigns.heartRate) : '',
            temperature: rec.vitalSigns?.temperature ? String(rec.vitalSigns.temperature) : '',
            oxygenSaturation: rec.vitalSigns?.oxygenSaturation
              ? String(rec.vitalSigns.oxygenSaturation)
              : '',
            weight: rec.vitalSigns?.weight ? String(rec.vitalSigns.weight) : '',
            height: rec.vitalSigns?.height ? String(rec.vitalSigns.height) : '',
          }))
          setPrescriptions(rec.prescriptions || [])
          setLabReports(rec.labReports || [])
        }
      } catch {
        setBlockingError('Unable to load clinical record context.')
      } finally {
        setLoadingInitial(false)
      }
    }

    initializeForm()
  }, [formattedIc, isEditMode, recordId, user?.hospitalId, setActivePatient, t.privacyRestrictedDesc])

  const knownAllergies = (
    patientInfo?.allergies?.length
      ? patientInfo.allergies
      : formData.allergiesInput.split(',').map((a) => a.trim()).filter(Boolean)
  ).map((a) => a.toLowerCase())

  const conflictingMeds = prescriptions.filter((rx) => {
    const medLower = rx.medicationName.trim().toLowerCase()
    if (!medLower) return false
    return knownAllergies.some((alg) => medLower.includes(alg) || alg.includes(medLower))
  })

  const addPrescription = () => {
    setPrescriptions((prev) => [...prev, { ...EMPTY_PRESCRIPTION }])
  }

  const updatePrescriptionRow = (idx: number, patch: Partial<PrescriptionDto>) => {
    setPrescriptions((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)))
  }

  const removePrescriptionRow = (idx: number) => {
    setPrescriptions((prev) => prev.filter((_, i) => i !== idx))
  }

  const addLabReport = () => {
    setLabReports((prev) => [...prev, { ...EMPTY_LAB_REPORT, reportDate: formData.visitDate }])
  }

  const updateLabReportRow = (idx: number, patch: Partial<LabReportDto>) => {
    setLabReports((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)))
  }

  const removeLabReportRow = (idx: number) => {
    setLabReports((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const diagnoses = formData.diagnosis
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean)
    if (diagnoses.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'At least one clinical diagnosis is required',
        variant: 'destructive',
      })
      return
    }

    if (!user?.hospitalId) {
      toast({
        title: 'Session Error',
        description: 'Hospital context missing. Please sign in again.',
        variant: 'destructive',
      })
      return
    }

    const cleanedPrescriptions = prescriptions
      .filter((rx) => rx.medicationName.trim().length > 0)
      .map((rx) => ({
        ...rx,
        medicationName: rx.medicationName.trim(),
        dosage: rx.dosage.trim() || 'Standard',
        quantity: Number(rx.quantity) || 1,
      }))

    const cleanedLabReports = labReports
      .filter((lab) => lab.testName.trim().length > 0 && lab.result.trim().length > 0)
      .map((lab) => ({
        ...lab,
        testName: lab.testName.trim(),
        result: lab.result.trim(),
        reportDate: lab.reportDate || formData.visitDate,
      }))

    setSaving(true)
    try {
      const vitalSigns: Record<string, unknown> = {}
      const numericFields = [
        'bloodPressureSystolic',
        'bloodPressureDiastolic',
        'heartRate',
        'temperature',
        'oxygenSaturation',
        'weight',
        'height',
      ] as const
      for (const field of numericFields) {
        if (formData[field] !== '') {
          const parsed = Number(formData[field])
          if (!Number.isNaN(parsed)) {
            vitalSigns[field] = parsed
          }
        }
      }

      const payload = {
        icNumber: formattedIc,
        visitDate: formData.visitDate,
        visitType: formData.visitType,
        chiefComplaint: formData.chiefComplaint.trim(),
        diagnosis: diagnoses,
        diagnosisCodes: formData.diagnosisCodes
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
        symptoms: formData.symptoms
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        notes: formData.notes.trim(),
        followUpDate: formData.followUpDate || undefined,
        vitalSigns: Object.keys(vitalSigns).length > 0 ? vitalSigns : undefined,
        prescriptions: cleanedPrescriptions,
        labReports: cleanedLabReports,
        patientName: formData.patientName.trim() || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender,
        bloodType: formData.bloodType.trim() || undefined,
        allergies: formData.allergiesInput
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
        chronicConditions: formData.chronicConditionsInput
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
      }

      const response =
        isEditMode && recordId
          ? await hospitalApi.updateRecord(user.hospitalId, recordId, payload)
          : await hospitalApi.createRecord(user.hospitalId, payload)

      if (response.success) {
        toast({
          title: isEditMode ? 'Record Updated' : 'Medical Record Created',
          description: `Saved consultation with ${cleanedPrescriptions.length} prescription(s) and ${cleanedLabReports.length} lab report(s).`,
        })
        navigate(`/doctor/patient/${encodeURIComponent(formattedIc)}`)
      } else {
        toast({
          title: 'Save Rejected',
          description: response.error || 'Failed to persist medical record',
          variant: 'destructive',
        })
      }
    } finally {
      setSaving(false)
    }
  }

  if (loadingInitial) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={`w-8 h-8 animate-spin ${theme.iconColor}`} />
      </div>
    )
  }

  if (blockingError) {
    return (
      <Card className="border-2 border-red-300 bg-red-50 rounded-2xl max-w-2xl mx-auto mt-10">
        <CardContent className="p-8 space-y-4">
          <div className="flex items-center gap-3 text-red-800">
            <ShieldAlert className="w-7 h-7 text-red-600 shrink-0" />
            <h2 className="text-xl font-bold">Action Blocked</h2>
          </div>
          <p className="text-sm text-red-800">{blockingError}</p>
          <Button variant="outline" onClick={() => navigate(-1)} className="rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${theme.headerGradient} p-7 text-white shadow-xl`}>
        <div className="relative z-10 flex items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="bg-white/20 hover:bg-white/30 text-white rounded-xl"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="p-3 bg-white/20 rounded-2xl border border-white/30">
            <FileText className="w-7 h-7" />
          </div>
          <div>
            <Badge className="bg-white/20 text-white border-0 mb-1">
              <Stethoscope className="w-3 h-3 mr-1" />
              {isEditMode ? t.editRecord : t.newRecord} • {theme.shortName}
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-bold">
              {isEditMode ? 'Edit Local Medical Record' : 'New Clinical Consultation Record'}
            </h1>
            <p className="text-white/85 text-sm">
              Patient MyKad IC: <span className="font-mono font-semibold">{formattedIc}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Patient Banner */}
      {patientExists && patientInfo ? (
        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <div className={`h-1 bg-gradient-to-r ${theme.cardAccentGradient}`} />
          <CardContent className="p-5 flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`p-3 ${theme.bgLight} rounded-xl`}>
                <User className={`w-6 h-6 ${theme.iconColor}`} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-lg text-slate-900">{patientInfo.fullName}</h3>
                  {isFederatedFirstVisit && (
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                      Cross-Hospital First Visit • Federated Profile Inherited
                    </Badge>
                  )}
                </div>
                <p className="text-slate-600 text-sm mt-0.5 capitalize">
                  {patientInfo.gender} • Blood: <strong>{patientInfo.bloodType || 'Unknown'}</strong> • DOB: {patientInfo.dateOfBirth}
                </p>
                {patientInfo.allergies.length > 0 && (
                  <div className="mt-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg inline-flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span className="text-red-800 text-xs font-bold">
                      Allergies: {patientInfo.allergies.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-200 bg-amber-50 rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-sm">
              <p className="font-bold text-amber-900">New Network Patient Registration</p>
              <p className="text-amber-800 text-xs">
                Date of birth and gender have been pre-parsed from MyKad IC ({formattedIc}). Complete patient profile below.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* New Patient Demographics Section */}
        {!patientExists && (
          <Card className="border border-slate-200 shadow-sm rounded-2xl">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <User className={`w-5 h-5 ${theme.iconColor}`} />
                New Patient Demographics & Baseline Allergies
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 grid md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="patientName">Patient Full Name *</Label>
                <Input
                  id="patientName"
                  required
                  placeholder="e.g., Muhammad Faiz bin Ismail"
                  value={formData.patientName}
                  onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gender">Gender</Label>
                <select
                  id="gender"
                  className="w-full h-10 px-3 border border-slate-200 rounded-md bg-white text-sm"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' })}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bloodType">Blood Type</Label>
                <select
                  id="bloodType"
                  className="w-full h-10 px-3 border border-slate-200 rounded-md bg-white text-sm"
                  value={formData.bloodType}
                  onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })}
                >
                  <option value="">Unknown</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bt) => (
                    <option key={bt} value={bt}>{bt}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="allergiesInput">Known Allergies (comma-separated)</Label>
                <Input
                  id="allergiesInput"
                  placeholder="e.g., Penicillin, Aspirin"
                  value={formData.allergiesInput}
                  onChange={(e) => setFormData({ ...formData, allergiesInput: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="chronicInput">Chronic Conditions (comma-separated)</Label>
                <Input
                  id="chronicInput"
                  placeholder="e.g., Asthma, Hypertension"
                  value={formData.chronicConditionsInput}
                  onChange={(e) => setFormData({ ...formData, chronicConditionsInput: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Consultation & Vitals */}
        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <div className={`h-1 bg-gradient-to-r ${theme.cardAccentGradient}`} />
          <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className={`w-5 h-5 ${theme.iconColor}`} />
              Encounter Details & Vital Signs
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="visitDate">Visit Date</Label>
                <Input
                  id="visitDate"
                  type="date"
                  value={formData.visitDate}
                  onChange={(e) => setFormData({ ...formData, visitDate: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="visitType">Visit Type</Label>
                <select
                  id="visitType"
                  title="Visit Type"
                  className="w-full h-10 px-3 border border-slate-200 rounded-md bg-white text-sm font-medium"
                  value={formData.visitType}
                  onChange={(e) => setFormData({ ...formData, visitType: e.target.value })}
                >
                  <option value="outpatient">Outpatient</option>
                  <option value="inpatient">Inpatient</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="followUpDate">Follow-Up Date (Optional)</Label>
                <Input
                  id="followUpDate"
                  type="date"
                  value={formData.followUpDate}
                  onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                />
              </div>
            </div>

            {/* Vital Signs */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-slate-700">
                <Activity className="w-4 h-4 text-slate-500" />
                Vital Signs
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <div>
                  <Label className="text-xs text-slate-500 flex items-center gap-1">
                    <Heart className="w-3 h-3" /> Systolic BP
                  </Label>
                  <Input
                    placeholder="120"
                    value={formData.bloodPressureSystolic}
                    onChange={(e) => setFormData({ ...formData, bloodPressureSystolic: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Diastolic BP</Label>
                  <Input
                    placeholder="80"
                    value={formData.bloodPressureDiastolic}
                    onChange={(e) => setFormData({ ...formData, bloodPressureDiastolic: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Heart Rate (bpm)</Label>
                  <Input
                    placeholder="72"
                    value={formData.heartRate}
                    onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500 flex items-center gap-1">
                    <Thermometer className="w-3 h-3" /> Temp (°C)
                  </Label>
                  <Input
                    placeholder="36.6"
                    value={formData.temperature}
                    onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">SpO2 (%)</Label>
                  <Input
                    placeholder="98"
                    value={formData.oxygenSaturation}
                    onChange={(e) => setFormData({ ...formData, oxygenSaturation: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Weight (kg)</Label>
                  <Input
                    placeholder="70"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="chiefComplaint">Chief Complaint</Label>
                <Input
                  id="chiefComplaint"
                  placeholder="Patient's primary reason for consultation..."
                  value={formData.chiefComplaint}
                  onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="symptoms">Presenting Symptoms (comma-separated)</Label>
                <Input
                  id="symptoms"
                  placeholder="e.g., Fever, Headache, Cough"
                  value={formData.symptoms}
                  onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <Label htmlFor="diagnosis">Clinical Diagnosis * (comma-separated)</Label>
                <Input
                  id="diagnosis"
                  required
                  placeholder="e.g., Essential Hypertension, Type 2 Diabetes"
                  value={formData.diagnosis}
                  onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="diagnosisCodes">ICD-10 Codes (comma-separated)</Label>
                <Input
                  id="diagnosisCodes"
                  placeholder="e.g., I10, E11.9"
                  value={formData.diagnosisCodes}
                  onChange={(e) => setFormData({ ...formData, diagnosisCodes: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Clinical Assessment & Plan</Label>
              <textarea
                id="notes"
                rows={3}
                className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Examination findings, assessment, and management plan..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Prescriptions Editor */}
        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-emerald-50/50 border-b border-slate-100 py-4 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2 text-emerald-950">
              <Pill className="w-5 h-5 text-emerald-600" />
              Prescriptions ({prescriptions.length})
            </CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addPrescription} className="rounded-xl gap-1">
              <Plus className="w-4 h-4" /> Add Medication
            </Button>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {conflictingMeds.length > 0 && (
              <div className="p-3.5 rounded-xl bg-red-50 border-2 border-red-300 text-red-900 text-sm flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <span>
                  <strong>Drug Allergy Alert:</strong> {conflictingMeds.map((m) => m.medicationName).join(', ')} matches recorded patient allergies ({patientInfo?.allergies.join(', ') || formData.allergiesInput})!
                </span>
              </div>
            )}

            {prescriptions.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-3">
                No prescriptions attached to this encounter. Click "Add Medication" to prescribe.
              </p>
            ) : (
              prescriptions.map((rx, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="grid sm:grid-cols-2 md:grid-cols-6 gap-3">
                    <div className="md:col-span-2">
                      <Label className="text-xs">Medication Name *</Label>
                      <Input
                        placeholder="e.g., Metformin"
                        value={rx.medicationName}
                        onChange={(e) => updatePrescriptionRow(idx, { medicationName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Dosage</Label>
                      <Input
                        placeholder="500mg"
                        value={rx.dosage}
                        onChange={(e) => updatePrescriptionRow(idx, { dosage: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Frequency</Label>
                      <Input
                        placeholder="Twice daily"
                        value={rx.frequency}
                        onChange={(e) => updatePrescriptionRow(idx, { frequency: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Duration</Label>
                      <Input
                        placeholder="30 days"
                        value={rx.duration}
                        onChange={(e) => updatePrescriptionRow(idx, { duration: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Qty</Label>
                      <Input
                        type="number"
                        min={1}
                        value={rx.quantity}
                        onChange={(e) => updatePrescriptionRow(idx, { quantity: Number(e.target.value) || 1 })}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Input
                      placeholder="Instructions (e.g. Take after meals)"
                      value={rx.instructions}
                      onChange={(e) => updatePrescriptionRow(idx, { instructions: e.target.value })}
                      className="flex-1 min-w-[200px]"
                    />
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={rx.isActive}
                        onChange={(e) => updatePrescriptionRow(idx, { isActive: e.target.checked })}
                      />
                      Active Medication
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePrescriptionRow(idx)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Lab Reports Editor */}
        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-indigo-50/50 border-b border-slate-100 py-4 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2 text-indigo-950">
              <FlaskConical className="w-5 h-5 text-indigo-600" />
              Laboratory Reports ({labReports.length})
            </CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addLabReport} className="rounded-xl gap-1">
              <Plus className="w-4 h-4" /> Add Lab Result
            </Button>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {labReports.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-3">
                No laboratory results attached to this encounter. Click "Add Lab Result" to record findings.
              </p>
            ) : (
              labReports.map((lab, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="grid sm:grid-cols-2 md:grid-cols-5 gap-3">
                    <div>
                      <Label className="text-xs">Category</Label>
                      <Input
                        placeholder="Blood Chemistry"
                        value={lab.testType}
                        onChange={(e) => updateLabReportRow(idx, { testType: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Test Name *</Label>
                      <Input
                        placeholder="HbA1c"
                        value={lab.testName}
                        onChange={(e) => updateLabReportRow(idx, { testName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Result *</Label>
                      <Input
                        placeholder="6.8"
                        value={lab.result}
                        onChange={(e) => updateLabReportRow(idx, { result: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Unit</Label>
                      <Input
                        placeholder="%"
                        value={lab.unit}
                        onChange={(e) => updateLabReportRow(idx, { unit: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Ref Range</Label>
                      <Input
                        placeholder="4.0 - 5.6"
                        value={lab.referenceRange}
                        onChange={(e) => updateLabReportRow(idx, { referenceRange: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Input
                      placeholder="Lab notes..."
                      value={lab.notes}
                      onChange={(e) => updateLabReportRow(idx, { notes: e.target.value })}
                      className="flex-1 min-w-[200px]"
                    />
                    <label className="flex items-center gap-2 text-xs font-medium text-red-700">
                      <input
                        type="checkbox"
                        checked={lab.isAbnormal}
                        onChange={(e) => updateLabReportRow(idx, { isAbnormal: e.target.checked })}
                      />
                      Flag Abnormal
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLabReportRow(idx)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 pb-8">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            disabled={saving}
            className="h-12 px-6 rounded-xl font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className={`h-12 px-8 rounded-xl bg-gradient-to-r ${theme.buttonGradient} text-white shadow-lg font-semibold`}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" />
                {isEditMode ? 'Update Medical Record' : 'Save Medical Record'}
              </>
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  )
}
