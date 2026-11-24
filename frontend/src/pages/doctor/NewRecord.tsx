import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/ui/modal-dialog'
import { Skeleton } from '@/components/ui/skeleton'
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
  RefreshCw,
} from 'lucide-react'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { cn, formatIC, isValidMyKad, parseMyKadDemographics, toDateInputValue } from '@/lib/utils'

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

const VITAL_FIELD_LIMITS = [
  { key: 'bloodPressureSystolic', min: 30, max: 300, label: 'Systolic BP (30–300 mmHg)' },
  { key: 'bloodPressureDiastolic', min: 15, max: 220, label: 'Diastolic BP (15–220 mmHg)' },
  { key: 'heartRate', min: 15, max: 300, label: 'Heart Rate (15–300 bpm)' },
  { key: 'respiratoryRate', min: 4, max: 60, label: 'Respiratory Rate (4–60 /min)' },
  { key: 'temperature', min: 25, max: 45, label: 'Temperature (25–45 °C)' },
  { key: 'oxygenSaturation', min: 30, max: 100, label: 'SpO2 (30–100 %)' },
  { key: 'weight', min: 0.3, max: 500, label: 'Weight (0.3–500 kg)' },
  { key: 'height', min: 20, max: 260, label: 'Height (20–260 cm)' },
] as const

export default function NewRecord() {
  const { icNumber, recordId } = useParams<{ icNumber: string; recordId?: string }>()
  const isEditMode = Boolean(recordId)
  const formattedIc = formatIC(icNumber || '')

  const navigate = useNavigate()
  const { toast } = useToast()
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const { activePatient, setActivePatient, clearActivePatient } = useClinicalStore()
  const theme = getHospitalTheme(user?.hospitalId)

  const submittingRef = useRef(false)
  const [saving, setSaving] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [blockingError, setBlockingError] = useState<string | null>(null)
  const [canRetryLoad, setCanRetryLoad] = useState(false)
  const [reloadNonce, setReloadNonce] = useState(0)
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
    respiratoryRate: '',
    temperature: '',
    oxygenSaturation: '',
    weight: '',
    height: '',
  })

  const [prescriptions, setPrescriptions] = useState<PrescriptionDto[]>([])
  const [labReports, setLabReports] = useState<LabReportDto[]>([])

  const triggerReload = useCallback(() => setReloadNonce((n) => n + 1), [])

  useEffect(() => {
    const controller = new AbortController()

    async function initializeForm() {
      if (!formattedIc || !user?.hospitalId) {
        setLoadingInitial(false)
        return
      }
      if (!isValidMyKad(formattedIc)) {
        setBlockingError(t.invalidMyKadFormat)
        setCanRetryLoad(false)
        setLoadingInitial(false)
        return
      }

      setLoadingInitial(true)
      setBlockingError(null)
      setCanRetryLoad(false)
      setPatientInfo(null)
      setPrescriptions([])
      setLabReports([])

      try {
        const patientRes = await hospitalApi.getPatient(user.hospitalId, formattedIc, controller.signal)
        if (patientRes.aborted || controller.signal.aborted) return

        if (patientRes.accessDenied) {
          if (activePatient?.icNumber === formattedIc) {
            clearActivePatient()
          }
          setBlockingError(patientRes.error || t.privacyRestrictedDesc)
          setCanRetryLoad(false)
          setLoadingInitial(false)
          return
        }

        if (patientRes.nodesUnavailable || patientRes.status === 503) {
          setBlockingError(patientRes.error || t.allNodesUnavailableDesc)
          setCanRetryLoad(true)
          setLoadingInitial(false)
          return
        }

        if (patientRes.success && patientRes.data?.patient) {
          const p = patientRes.data.patient
          const fullName = String(p.fullName || '')
          const genderVal = p.gender === 'female' ? 'female' : 'male'
          const dobStr = toDateInputValue(String(p.dateOfBirth || ''))
          const allergiesArr = Array.isArray(p.allergies) ? (p.allergies as string[]) : []
          const conditionsArr = Array.isArray(p.chronicConditions) ? (p.chronicConditions as string[]) : []

          setPatientExists(true)
          setIsFederatedFirstVisit(!patientRes.data.isLocal)
          setPatientInfo({
            fullName,
            dateOfBirth: dobStr,
            gender: genderVal,
            bloodType: String(p.bloodType || ''),
            allergies: allergiesArr,
            chronicConditions: conditionsArr,
          })
          setActivePatient({
            icNumber: formattedIc,
            fullName,
            dateOfBirth: dobStr,
            gender: genderVal,
            bloodType: String(p.bloodType || ''),
            allergies: allergiesArr,
            allergiesUnverified: false,
            chronicConditions: conditionsArr,
            scopedHospitalId: user.hospitalId,
            scopedDoctorId: user.doctorId,
          })
          setFormData((prev) => ({
            ...prev,
            patientName: fullName,
            dateOfBirth: dobStr || prev.dateOfBirth,
            gender: genderVal,
            bloodType: String(p.bloodType || ''),
            allergiesInput: allergiesArr.join(', '),
            chronicConditionsInput: conditionsArr.join(', '),
          }))
        } else if (patientRes.notFound || patientRes.status === 404) {
          const inferred = parseMyKadDemographics(formattedIc)
          setPatientExists(false)
          setIsFederatedFirstVisit(false)
          setFormData((prev) => ({
            ...prev,
            patientName: '',
            dateOfBirth: inferred?.dateOfBirth || '',
            gender: (inferred?.gender || 'male') as 'male' | 'female',
            bloodType: '',
            allergiesInput: '',
            chronicConditionsInput: '',
          }))
        } else {
          setBlockingError(patientRes.error || t.networkError)
          setCanRetryLoad(true)
          setLoadingInitial(false)
          return
        }

        if (isEditMode && recordId) {
          const recordRes = await hospitalApi.getRecord(user.hospitalId, recordId, controller.signal)
          if (recordRes.aborted || controller.signal.aborted) return

          if (!recordRes.success || !recordRes.data) {
            setBlockingError(
              recordRes.error || 'Record not found or cross-hospital records cannot be modified.'
            )
            setCanRetryLoad(false)
            setLoadingInitial(false)
            return
          }

          const rec = recordRes.data
          if (formatIC(rec.icNumber) !== formattedIc) {
            setBlockingError('Record patient identity mismatch: this record belongs to another patient.')
            setCanRetryLoad(false)
            setLoadingInitial(false)
            return
          }
          if (rec.hospitalId !== user.hospitalId || rec.isReadOnly) {
            setBlockingError('Cross-hospital records are strictly read-only.')
            setCanRetryLoad(false)
            setLoadingInitial(false)
            return
          }

          const normalizedVisitDate = toDateInputValue(rec.visitDate) || new Date().toISOString().split('T')[0]

          setFormData((prev) => ({
            ...prev,
            visitDate: normalizedVisitDate,
            visitType: rec.visitType || 'outpatient',
            chiefComplaint: rec.chiefComplaint || '',
            diagnosis: (rec.diagnosis || []).join(', '),
            diagnosisCodes: (rec.diagnosisCodes || []).join(', '),
            symptoms: (rec.symptoms || []).join(', '),
            notes: rec.notes || '',
            followUpDate: toDateInputValue(rec.followUpDate),
            bloodPressureSystolic:
              rec.vitalSigns?.bloodPressureSystolic !== undefined
                ? String(rec.vitalSigns.bloodPressureSystolic)
                : '',
            bloodPressureDiastolic:
              rec.vitalSigns?.bloodPressureDiastolic !== undefined
                ? String(rec.vitalSigns.bloodPressureDiastolic)
                : '',
            heartRate:
              rec.vitalSigns?.heartRate !== undefined ? String(rec.vitalSigns.heartRate) : '',
            respiratoryRate:
              rec.vitalSigns?.respiratoryRate !== undefined
                ? String(rec.vitalSigns.respiratoryRate)
                : '',
            temperature:
              rec.vitalSigns?.temperature !== undefined ? String(rec.vitalSigns.temperature) : '',
            oxygenSaturation:
              rec.vitalSigns?.oxygenSaturation !== undefined
                ? String(rec.vitalSigns.oxygenSaturation)
                : '',
            weight: rec.vitalSigns?.weight !== undefined ? String(rec.vitalSigns.weight) : '',
            height: rec.vitalSigns?.height !== undefined ? String(rec.vitalSigns.height) : '',
          }))
          setPrescriptions(rec.prescriptions || [])
          setLabReports(
            (rec.labReports || []).map((l) => ({
              ...l,
              reportDate: toDateInputValue(l.reportDate) || normalizedVisitDate,
            }))
          )
        }
      } catch {
        if (!controller.signal.aborted) {
          setBlockingError('Unable to load clinical record context.')
          setCanRetryLoad(true)
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingInitial(false)
        }
      }
    }

    void initializeForm()
    return () => {
      controller.abort()
    }
  }, [
    formattedIc,
    isEditMode,
    recordId,
    reloadNonce,
    user?.hospitalId,
    user?.doctorId,
    setActivePatient,
    clearActivePatient,
    t.allNodesUnavailableDesc,
    t.invalidMyKadFormat,
    t.privacyRestrictedDesc,
    t.networkError,
  ])

  const effectiveAllergies = formData.allergiesInput
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean)
  const knownAllergiesLower = effectiveAllergies.map((a) => a.toLowerCase())

  const conflictingMeds = prescriptions.filter((rx) => {
    const medLower = rx.medicationName.trim().toLowerCase()
    if (!medLower) return false
    return knownAllergiesLower.some((alg) => medLower.includes(alg) || alg.includes(medLower))
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
    if (submittingRef.current) return

    const diagnoses = formData.diagnosis
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean)
    if (diagnoses.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'At least one clinical diagnosis is required.',
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

    const vitalSigns: Record<string, number> = {}
    for (const rule of VITAL_FIELD_LIMITS) {
      const rawVal = formData[rule.key].trim()
      if (!rawVal) continue
      const num = Number(rawVal)
      if (Number.isNaN(num) || num < rule.min || num > rule.max) {
        toast({
          title: 'Vital Sign Out of Bounds',
          description: `Please check ${rule.label}.`,
          variant: 'destructive',
        })
        return
      }
      vitalSigns[rule.key] = num
    }

    if (
      vitalSigns.bloodPressureSystolic !== undefined &&
      vitalSigns.bloodPressureDiastolic !== undefined &&
      vitalSigns.bloodPressureDiastolic >= vitalSigns.bloodPressureSystolic
    ) {
      toast({
        title: 'Invalid Blood Pressure',
        description: 'Diastolic blood pressure must be lower than systolic blood pressure.',
        variant: 'destructive',
      })
      return
    }

    const cleanedPrescriptions: PrescriptionDto[] = []
    for (let i = 0; i < prescriptions.length; i++) {
      const rx = prescriptions[i]
      const med = rx.medicationName.trim()
      const dose = rx.dosage.trim()
      const freq = rx.frequency.trim()
      if (!med && !dose) continue
      if (!med || !dose || !freq) {
        toast({
          title: `Incomplete Prescription (#${i + 1})`,
          description: 'Medication name, dosage, and frequency are all required.',
          variant: 'destructive',
        })
        return
      }
      cleanedPrescriptions.push({
        ...rx,
        medicationName: med,
        dosage: dose,
        frequency: freq,
        quantity: Math.max(1, Math.trunc(Number(rx.quantity) || 1)),
      })
    }

    const cleanedLabReports: LabReportDto[] = []
    for (let i = 0; i < labReports.length; i++) {
      const lab = labReports[i]
      const name = lab.testName.trim()
      const resVal = lab.result.trim()
      const hasAux = Boolean(lab.unit.trim() || lab.referenceRange.trim() || lab.notes.trim())
      if (!name && !resVal && !hasAux) continue
      if (!name || !resVal) {
        toast({
          title: `Incomplete Lab Result (#${i + 1})`,
          description: 'Both Test Name and Result are required for laboratory entries.',
          variant: 'destructive',
        })
        return
      }
      cleanedLabReports.push({
        ...lab,
        testName: name,
        result: resVal,
        reportDate: toDateInputValue(lab.reportDate) || formData.visitDate,
      })
    }

    submittingRef.current = true
    setSaving(true)
    try {
      const cleanedConditions = formData.chronicConditionsInput
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)

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
        bloodType: formData.bloodType.trim(),
        allergies: effectiveAllergies,
        chronicConditions: cleanedConditions,
        replaceAllergiesAndConditions: true,
      }

      const response =
        isEditMode && recordId
          ? await hospitalApi.updateRecord(user.hospitalId, recordId, payload)
          : await hospitalApi.createRecord(user.hospitalId, payload)

      if (response.success) {
        toast({
          title: isEditMode ? 'Medical Record Updated' : 'Medical Record Created',
          description: `Saved encounter with ${cleanedPrescriptions.length} prescription(s) and ${cleanedLabReports.length} lab report(s).`,
          variant: 'success',
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
      submittingRef.current = false
      setSaving(false)
    }
  }

  if (loadingInitial) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    )
  }

  if (blockingError) {
    return (
      <Card className="border-2 border-red-300 bg-red-50 rounded-2xl max-w-2xl mx-auto mt-10">
        <CardContent className="p-8 space-y-4">
          <div className="flex items-center gap-3 text-red-900">
            <ShieldAlert className="w-7 h-7 text-red-700 shrink-0" />
            <h2 className="text-xl font-bold">
              {canRetryLoad ? t.loadFailedTitle : 'Action Blocked'}
            </h2>
          </div>
          <p className="text-sm text-red-900">{blockingError}</p>
          <div className="flex items-center gap-2.5">
            <Button variant="outline" onClick={() => navigate(-1)} className="bg-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            {canRetryLoad && (
              <Button onClick={triggerReload} className={cn('text-white bg-gradient-to-r', theme.buttonGradient)}>
                <RefreshCw className="w-4 h-4 mr-1.5" />
                {t.retryLoad}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className={cn(
          'rounded-2xl bg-gradient-to-r p-6 text-white shadow-md flex items-center gap-4',
          theme.headerGradient
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Go back"
          onClick={() => navigate(-1)}
          className="bg-white/20 hover:bg-white/30 text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="p-2.5 bg-white/20 rounded-xl border border-white/25">
          <FileText className="w-6 h-6" />
        </div>
        <div>
          <Badge className="bg-white/20 text-white border-0 mb-1">
            <Stethoscope className="w-3 h-3 mr-1" />
            {isEditMode ? t.editRecord : t.newRecord} • {theme.name}
          </Badge>
          <h1 className="text-2xl font-bold">
            {isEditMode ? 'Edit Local Medical Record' : 'New Clinical Consultation Record'}
          </h1>
          <p className="text-white/85 text-xs mt-0.5">
            Patient MyKad IC: <span className="font-mono font-bold tabular-nums">{formattedIc}</span>
          </p>
        </div>
      </div>

      {/* Patient Banner */}
      {patientExists && patientInfo ? (
        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <div className={cn('h-1 bg-gradient-to-r', theme.cardAccentGradient)} />
          <CardContent className="p-5 flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3.5">
              <div className={cn('p-2.5 rounded-xl', theme.bgLight)}>
                <User className={cn('w-5 h-5', theme.iconColor)} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-base text-slate-900">{patientInfo.fullName}</h2>
                  {isFederatedFirstVisit && (
                    <StatusBadge
                      tone="info"
                      label="Cross-Hospital First Visit • Federated Profile Inherited"
                    />
                  )}
                </div>
                <p className="text-slate-600 text-xs mt-0.5 capitalize tabular-nums">
                  {patientInfo.gender} • Blood: <strong>{patientInfo.bloodType || 'Unknown'}</strong> • DOB:{' '}
                  {patientInfo.dateOfBirth || '—'}
                </p>
                {effectiveAllergies.length > 0 && (
                  <div className="mt-2">
                    <StatusBadge
                      tone="critical"
                      label={`Recorded Allergies: ${effectiveAllergies.join(', ')}`}
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-300 bg-amber-50 rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-800 shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-sm text-amber-950">New Network Patient Registration</p>
              <p className="text-amber-900">
                Date of birth and gender have been pre-parsed from MyKad IC ({formattedIc}). Complete patient demographics and verify allergies below.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Demographics & Allergy / Condition Updates */}
        <Card className="border border-slate-200 shadow-sm rounded-2xl">
          <CardHeader className="border-b border-slate-100 py-4 px-5">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <User className={cn('w-4 h-4', theme.iconColor)} />
              <span>
                {patientExists
                  ? 'Baseline Allergies, Blood Type & Chronic Condition Updates'
                  : 'New Patient Demographics & Baseline Allergies'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            {!patientExists && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="patientName" className="text-xs font-bold">
                    Patient Full Name *
                  </Label>
                  <Input
                    id="patientName"
                    required
                    placeholder="e.g., Muhammad Faiz bin Ismail"
                    value={formData.patientName}
                    onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dob" className="text-xs font-bold">
                    Date of Birth
                  </Label>
                  <Input
                    id="dob"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gender" className="text-xs font-bold">
                    Gender
                  </Label>
                  <select
                    id="gender"
                    className="w-full h-10 px-3 border border-slate-300 rounded-xl bg-white text-sm"
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value as 'male' | 'female' })
                    }
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="bloodType" className="text-xs font-bold">
                Blood Type
              </Label>
              <select
                id="bloodType"
                className="w-full h-10 px-3 border border-slate-300 rounded-xl bg-white text-sm"
                value={formData.bloodType}
                onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })}
              >
                <option value="">Unknown</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bt) => (
                  <option key={bt} value={bt}>
                    {bt}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="allergiesInput" className="text-xs font-bold">
                Known Drug / Food Allergies (comma-separated)
              </Label>
              <Input
                id="allergiesInput"
                placeholder="e.g., Penicillin, Aspirin"
                value={formData.allergiesInput}
                onChange={(e) => setFormData({ ...formData, allergiesInput: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="chronicInput" className="text-xs font-bold">
                Chronic Conditions (comma-separated)
              </Label>
              <Input
                id="chronicInput"
                placeholder="e.g., Asthma, Hypertension"
                value={formData.chronicConditionsInput}
                onChange={(e) =>
                  setFormData({ ...formData, chronicConditionsInput: e.target.value })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Consultation & Vitals */}
        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <div className={cn('h-1 bg-gradient-to-r', theme.cardAccentGradient)} />
          <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-4 px-5">
            <CardTitle className="flex items-center gap-2 text-sm font-bold">
              <Calendar className={cn('w-4 h-4', theme.iconColor)} />
              <span>Encounter Details & Vital Signs</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="visitDate" className="text-xs font-bold">
                  Visit Date
                </Label>
                <Input
                  id="visitDate"
                  type="date"
                  value={formData.visitDate}
                  onChange={(e) => setFormData({ ...formData, visitDate: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="visitType" className="text-xs font-bold">
                  Visit Type
                </Label>
                <select
                  id="visitType"
                  title="Visit Type"
                  className="w-full h-10 px-3 border border-slate-300 rounded-xl bg-white text-sm font-medium"
                  value={formData.visitType}
                  onChange={(e) => setFormData({ ...formData, visitType: e.target.value })}
                >
                  <option value="outpatient">Outpatient</option>
                  <option value="inpatient">Inpatient</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="followUpDate" className="text-xs font-bold">
                  Follow-Up Date (Optional)
                </Label>
                <Input
                  id="followUpDate"
                  type="date"
                  value={formData.followUpDate}
                  onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                />
              </div>
            </div>

            {/* Complete 8-Metric Physiological Vital Signs */}
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Activity className="w-3.5 h-3.5 text-slate-500" />
                Vital Signs (Tabular Clinical Metrics)
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label htmlFor="v-sys" className="text-[11px] text-slate-600 flex items-center gap-1 mb-1">
                    <Heart className="w-3 h-3" /> Systolic BP (mmHg)
                  </Label>
                  <Input
                    id="v-sys"
                    type="number"
                    placeholder="120"
                    className="tabular-nums"
                    value={formData.bloodPressureSystolic}
                    onChange={(e) =>
                      setFormData({ ...formData, bloodPressureSystolic: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="v-dia" className="text-[11px] text-slate-600 mb-1 block">
                    Diastolic BP (mmHg)
                  </Label>
                  <Input
                    id="v-dia"
                    type="number"
                    placeholder="80"
                    className="tabular-nums"
                    value={formData.bloodPressureDiastolic}
                    onChange={(e) =>
                      setFormData({ ...formData, bloodPressureDiastolic: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="v-hr" className="text-[11px] text-slate-600 mb-1 block">
                    Heart Rate (bpm)
                  </Label>
                  <Input
                    id="v-hr"
                    type="number"
                    placeholder="72"
                    className="tabular-nums"
                    value={formData.heartRate}
                    onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="v-rr" className="text-[11px] text-slate-600 mb-1 block">
                    Resp. Rate (/min)
                  </Label>
                  <Input
                    id="v-rr"
                    type="number"
                    placeholder="16"
                    className="tabular-nums"
                    value={formData.respiratoryRate}
                    onChange={(e) => setFormData({ ...formData, respiratoryRate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="v-temp" className="text-[11px] text-slate-600 flex items-center gap-1 mb-1">
                    <Thermometer className="w-3 h-3" /> Temp (°C)
                  </Label>
                  <Input
                    id="v-temp"
                    type="number"
                    step="0.1"
                    placeholder="36.6"
                    className="tabular-nums"
                    value={formData.temperature}
                    onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="v-spo2" className="text-[11px] text-slate-600 mb-1 block">
                    SpO2 (%)
                  </Label>
                  <Input
                    id="v-spo2"
                    type="number"
                    placeholder="98"
                    className="tabular-nums"
                    value={formData.oxygenSaturation}
                    onChange={(e) =>
                      setFormData({ ...formData, oxygenSaturation: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="v-wt" className="text-[11px] text-slate-600 mb-1 block">
                    Weight (kg)
                  </Label>
                  <Input
                    id="v-wt"
                    type="number"
                    step="0.1"
                    placeholder="70"
                    className="tabular-nums"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="v-ht" className="text-[11px] text-slate-600 mb-1 block">
                    Height (cm)
                  </Label>
                  <Input
                    id="v-ht"
                    type="number"
                    step="0.1"
                    placeholder="170"
                    className="tabular-nums"
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="chiefComplaint" className="text-xs font-bold">
                  Chief Complaint
                </Label>
                <Input
                  id="chiefComplaint"
                  maxLength={500}
                  placeholder="Patient's primary reason for consultation…"
                  value={formData.chiefComplaint}
                  onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="symptoms" className="text-xs font-bold">
                  Presenting Symptoms (comma-separated)
                </Label>
                <Input
                  id="symptoms"
                  placeholder="e.g., Fever, Headache, Cough"
                  value={formData.symptoms}
                  onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <Label htmlFor="diagnosis" className="text-xs font-bold">
                  Clinical Diagnosis * (comma-separated)
                </Label>
                <Input
                  id="diagnosis"
                  required
                  placeholder="e.g., Essential Hypertension, Type 2 Diabetes"
                  value={formData.diagnosis}
                  onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="diagnosisCodes" className="text-xs font-bold">
                  ICD-10 Codes (comma-separated)
                </Label>
                <Input
                  id="diagnosisCodes"
                  placeholder="e.g., I10, E11.9"
                  className="font-mono"
                  value={formData.diagnosisCodes}
                  onChange={(e) => setFormData({ ...formData, diagnosisCodes: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-bold">
                Clinical Assessment & Management Plan
              </Label>
              <textarea
                id="notes"
                rows={3}
                maxLength={10000}
                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                placeholder="Examination findings, clinical assessment, and management plan…"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Prescriptions Editor */}
        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-emerald-50/50 border-b border-slate-100 py-3.5 px-5 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-950">
              <Pill className="w-4 h-4 text-emerald-700" />
              <span>Prescriptions ({prescriptions.length})</span>
            </CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addPrescription} className="gap-1">
              <Plus className="w-3.5 h-3.5" /> Add Medication
            </Button>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {conflictingMeds.length > 0 && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-red-50 border-2 border-red-300 text-red-950 text-xs flex items-center gap-2.5"
              >
                <AlertTriangle className="w-5 h-5 text-red-700 shrink-0" />
                <span>
                  <strong>Drug Allergy Contraindication Alert:</strong>{' '}
                  {conflictingMeds.map((m) => m.medicationName).join(', ')} matches recorded patient allergies (
                  {effectiveAllergies.join(', ')})!
                </span>
              </div>
            )}

            {prescriptions.length === 0 ? (
              <p className="text-xs text-slate-600 text-center py-2">
                No prescriptions attached to this encounter. Click "Add Medication" to prescribe.
              </p>
            ) : (
              prescriptions.map((rx, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                    <div className="col-span-2 space-y-1">
                      <Label htmlFor={`rx-med-${idx}`} className="text-xs font-semibold">
                        Medication Name *
                      </Label>
                      <Input
                        id={`rx-med-${idx}`}
                        placeholder="e.g., Metformin"
                        value={rx.medicationName}
                        onChange={(e) => updatePrescriptionRow(idx, { medicationName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`rx-dose-${idx}`} className="text-xs font-semibold">
                        Dosage *
                      </Label>
                      <Input
                        id={`rx-dose-${idx}`}
                        placeholder="500mg"
                        value={rx.dosage}
                        onChange={(e) => updatePrescriptionRow(idx, { dosage: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`rx-freq-${idx}`} className="text-xs font-semibold">
                        Frequency *
                      </Label>
                      <Input
                        id={`rx-freq-${idx}`}
                        placeholder="Twice daily"
                        value={rx.frequency}
                        onChange={(e) => updatePrescriptionRow(idx, { frequency: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`rx-dur-${idx}`} className="text-xs font-semibold">
                        Duration
                      </Label>
                      <Input
                        id={`rx-dur-${idx}`}
                        placeholder="30 days"
                        value={rx.duration}
                        onChange={(e) => updatePrescriptionRow(idx, { duration: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`rx-qty-${idx}`} className="text-xs font-semibold">
                        Qty
                      </Label>
                      <Input
                        id={`rx-qty-${idx}`}
                        type="number"
                        min={1}
                        className="tabular-nums"
                        value={rx.quantity}
                        onChange={(e) =>
                          updatePrescriptionRow(idx, { quantity: Number(e.target.value) || 1 })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <Input
                      id={`rx-inst-${idx}`}
                      aria-label={`Prescription ${idx + 1} administration instructions`}
                      placeholder="Administration instructions (e.g. Take after meals)"
                      value={rx.instructions}
                      onChange={(e) => updatePrescriptionRow(idx, { instructions: e.target.value })}
                      className="flex-1 min-w-[200px]"
                    />
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 shrink-0 cursor-pointer">
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
                      aria-label={`Remove prescription ${idx + 1}`}
                      onClick={() => removePrescriptionRow(idx)}
                      className="text-red-700 hover:bg-red-50"
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
          <CardHeader className="bg-indigo-50/50 border-b border-slate-100 py-3.5 px-5 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-indigo-950">
              <FlaskConical className="w-4 h-4 text-indigo-700" />
              <span>Laboratory Reports ({labReports.length})</span>
            </CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addLabReport} className="gap-1">
              <Plus className="w-3.5 h-3.5" /> Add Lab Result
            </Button>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {labReports.length === 0 ? (
              <p className="text-xs text-slate-600 text-center py-2">
                No laboratory results attached to this encounter. Click "Add Lab Result" to record findings.
              </p>
            ) : (
              labReports.map((lab, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor={`lab-cat-${idx}`} className="text-xs font-semibold">
                        Category
                      </Label>
                      <Input
                        id={`lab-cat-${idx}`}
                        placeholder="Blood Chemistry"
                        value={lab.testType}
                        onChange={(e) => updateLabReportRow(idx, { testType: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`lab-name-${idx}`} className="text-xs font-semibold">
                        Test Name *
                      </Label>
                      <Input
                        id={`lab-name-${idx}`}
                        placeholder="HbA1c"
                        value={lab.testName}
                        onChange={(e) => updateLabReportRow(idx, { testName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`lab-res-${idx}`} className="text-xs font-semibold">
                        Result *
                      </Label>
                      <Input
                        id={`lab-res-${idx}`}
                        placeholder="6.8"
                        className="tabular-nums"
                        value={lab.result}
                        onChange={(e) => updateLabReportRow(idx, { result: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`lab-unit-${idx}`} className="text-xs font-semibold">
                        Unit
                      </Label>
                      <Input
                        id={`lab-unit-${idx}`}
                        placeholder="%"
                        value={lab.unit}
                        onChange={(e) => updateLabReportRow(idx, { unit: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`lab-ref-${idx}`} className="text-xs font-semibold">
                        Ref Range
                      </Label>
                      <Input
                        id={`lab-ref-${idx}`}
                        placeholder="4.0 - 5.6"
                        className="tabular-nums"
                        value={lab.referenceRange}
                        onChange={(e) => updateLabReportRow(idx, { referenceRange: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <Input
                      id={`lab-notes-${idx}`}
                      aria-label={`Lab report ${idx + 1} pathology notes`}
                      placeholder="Pathology notes…"
                      value={lab.notes}
                      onChange={(e) => updateLabReportRow(idx, { notes: e.target.value })}
                      className="flex-1 min-w-[200px]"
                    />
                    <label className="flex items-center gap-2 text-xs font-bold text-red-800 shrink-0 cursor-pointer">
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
                      aria-label={`Remove lab report ${idx + 1}`}
                      onClick={() => removeLabReportRow(idx)}
                      className="text-red-700 hover:bg-red-50"
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
        <div className="flex justify-end gap-3 pt-2 pb-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            disabled={saving}
            className="h-11 px-6"
          >
            {t.cancel}
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className={cn(
              'h-11 px-7 bg-gradient-to-r text-white font-bold shadow-sm',
              theme.buttonGradient
            )}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {isEditMode ? 'Update Medical Record' : 'Save Medical Record'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
