import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/store/auth'
import {
  hospitalApi,
  centralApi,
  type PrescriptionPayload,
  type LabReportPayload,
} from '@/lib/api'
import {
  ArrowLeft, Save, Loader2, FileText, Calendar, Stethoscope, User,
  AlertTriangle, Heart, Thermometer, Activity, Pill, FlaskConical, Plus, Trash2
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { formatIC, parseMyKadDemographics } from '@/lib/utils'

export default function NewRecord() {
  const { icNumber } = useParams<{ icNumber: string }>()
  const cleanIc = formatIC(icNumber || '')
  const inferred = parseMyKadDemographics(cleanIc)
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuthStore()
  const theme = getHospitalTheme(user?.hospitalId)

  const [saving, setSaving] = useState(false)
  const [loadingPatient, setLoadingPatient] = useState(true)
  const [patientExists, setPatientExists] = useState(false)
  const [accessRestricted, setAccessRestricted] = useState(false)
  const [patientInfo, setPatientInfo] = useState<{
    fullName: string
    dateOfBirth: string
    gender: string
    bloodType: string
    allergies: string[]
    chronicConditions: string[]
  } | null>(null)

  const [formData, setFormData] = useState({
    visitDate: new Date().toISOString().split('T')[0],
    visitType: 'outpatient',
    chiefComplaint: '',
    diagnosis: '',
    symptoms: '',
    notes: '',
    followUpDate: '',
    patientName: '',
    dateOfBirth: inferred.dateOfBirth,
    gender: inferred.gender as 'male' | 'female',
    bloodType: 'O+',
    allergiesInput: '',
    chronicConditionsInput: '',
    emergencyContact: '',
    emergencyPhone: '',
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    heartRate: '',
    temperature: '',
    weight: '',
    height: '',
  })

  const [prescriptions, setPrescriptions] = useState<PrescriptionPayload[]>([])
  const [labReports, setLabReports] = useState<LabReportPayload[]>([])

  useEffect(() => {
    let active = true
    async function loadPatient() {
      if (!cleanIc) return
      try {
        const response = await centralApi.getPatient(cleanIc)
        if (!active) return
        if (response.accessDenied) {
          setAccessRestricted(true)
          setPatientExists(false)
          return
        }
        if (response.success && response.data?.patient) {
          const p = response.data.patient
          const fullName = String(p.fullName || '')
          setPatientExists(true)
          setPatientInfo({
            fullName,
            dateOfBirth: String(p.dateOfBirth || inferred.dateOfBirth),
            gender: String(p.gender || inferred.gender),
            bloodType: String(p.bloodType || ''),
            allergies: p.allergies || [],
            chronicConditions: p.chronicConditions || [],
          })
          setFormData((prev) => ({
            ...prev,
            patientName: fullName,
            dateOfBirth: p.dateOfBirth || prev.dateOfBirth,
            gender: p.gender === 'female' ? 'female' : 'male',
            bloodType: p.bloodType || prev.bloodType,
          }))
        } else {
          setPatientExists(false)
        }
      } catch {
        if (active) setPatientExists(false)
      } finally {
        if (active) setLoadingPatient(false)
      }
    }
    loadPatient()
    return () => {
      active = false
    }
  }, [cleanIc, inferred.dateOfBirth, inferred.gender])

  const addPrescriptionRow = () => {
    setPrescriptions((prev) => [
      ...prev,
      {
        medicationName: '',
        dosage: '',
        frequency: 'Once daily',
        duration: '7 days',
        quantity: 7,
        instructions: 'Take after meals',
        isActive: true,
      },
    ])
  }

  const updatePrescriptionRow = (idx: number, patch: Partial<PrescriptionPayload>) => {
    setPrescriptions((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)))
  }

  const removePrescriptionRow = (idx: number) => {
    setPrescriptions((prev) => prev.filter((_, i) => i !== idx))
  }

  const addLabReportRow = () => {
    setLabReports((prev) => [
      ...prev,
      {
        testType: 'Biochemistry',
        testName: '',
        result: '',
        unit: '',
        referenceRange: '',
        isAbnormal: false,
        reportDate: formData.visitDate,
        notes: '',
      },
    ])
  }

  const updateLabReportRow = (idx: number, patch: Partial<LabReportPayload>) => {
    setLabReports((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)))
  }

  const removeLabReportRow = (idx: number) => {
    setLabReports((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.diagnosis.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter at least one diagnosis',
        variant: 'destructive',
      })
      return
    }

    if (!user?.hospitalId || !user?.doctorId) {
      toast({
        title: 'Error',
        description: 'Hospital ID or Doctor ID not found. Please sign in again.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const vitalSigns: Record<string, number> = {}
      const numericFields = [
        'bloodPressureSystolic',
        'bloodPressureDiastolic',
        'heartRate',
        'temperature',
        'weight',
        'height',
      ] as const
      for (const field of numericFields) {
        const val = Number(formData[field])
        if (formData[field] && Number.isFinite(val) && val > 0) {
          vitalSigns[field] = val
        }
      }

      const validPrescriptions = prescriptions.filter((rx) => rx.medicationName.trim().length > 0)
      const validLabs = labReports.filter((lab) => lab.testName.trim().length > 0)

      const response = await hospitalApi.createRecord(user.hospitalId, {
        icNumber: cleanIc,
        doctorId: user.doctorId,
        visitDate: formData.visitDate,
        visitType: formData.visitType,
        chiefComplaint: formData.chiefComplaint,
        diagnosis: formData.diagnosis.split(',').map((d) => d.trim()).filter(Boolean),
        symptoms: formData.symptoms.split(',').map((s) => s.trim()).filter(Boolean),
        notes: formData.notes,
        followUpDate: formData.followUpDate || undefined,
        vitalSigns: Object.keys(vitalSigns).length > 0 ? vitalSigns : undefined,
        prescriptions: validPrescriptions.length > 0 ? validPrescriptions : undefined,
        labReports: validLabs.length > 0 ? validLabs : undefined,
        patientName: formData.patientName || undefined,
        dateOfBirth: !patientExists ? formData.dateOfBirth : undefined,
        gender: !patientExists ? formData.gender : undefined,
        bloodType: !patientExists ? formData.bloodType : undefined,
        allergies:
          !patientExists && formData.allergiesInput.trim()
            ? formData.allergiesInput.split(',').map((a) => a.trim()).filter(Boolean)
            : undefined,
        chronicConditions:
          !patientExists && formData.chronicConditionsInput.trim()
            ? formData.chronicConditionsInput.split(',').map((c) => c.trim()).filter(Boolean)
            : undefined,
        emergencyContact: !patientExists && formData.emergencyContact.trim() ? formData.emergencyContact.trim() : undefined,
        emergencyPhone: !patientExists && formData.emergencyPhone.trim() ? formData.emergencyPhone.trim() : undefined,
      })

      if (response.success) {
        toast({
          title: 'Success',
          description: 'Medical record (including prescriptions & lab reports) saved to hospital database',
        })
        navigate(accessRestricted ? '/doctor/search' : `/doctor/patient/${encodeURIComponent(cleanIc)}`)
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to save record',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An error occurred while saving',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div className="space-y-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.headerGradient} p-8 text-white shadow-2xl ${theme.shadowColor}`}>
        <div className="relative z-10 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="bg-white/20 hover:bg-white/30 rounded-xl text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <Badge className="bg-white/20 text-white border-0 mb-1">
                <Stethoscope className="w-3 h-3 mr-1" /> New Clinical Entry
              </Badge>
              <h1 className="text-3xl font-bold drop-shadow-lg">New Medical Record</h1>
              <p className="text-white/80">Patient IC: <span className="font-mono font-semibold">{cleanIc}</span></p>
            </div>
          </div>
        </div>
      </div>

      {loadingPatient ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400 mr-2" />
            <span className="text-gray-500">Loading patient demographics...</span>
          </CardContent>
        </Card>
      ) : patientInfo ? (
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className={`h-1 bg-gradient-to-r ${theme.cardAccentGradient}`} />
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className={`p-3 ${theme.bgLight} rounded-xl`}>
                <User className={`w-6 h-6 ${theme.iconColor}`} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">{patientInfo.fullName}</h3>
                <p className="text-gray-500 text-sm capitalize">
                  {patientInfo.gender} • {patientInfo.bloodType || 'Blood type unknown'} • DOB: {patientInfo.dateOfBirth}
                </p>
                {patientInfo.allergies.length > 0 && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="text-red-700 text-sm font-medium">Allergies: {patientInfo.allergies.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-medium text-amber-900">
                {accessRestricted ? 'Cross-Hospital Demographics Restricted' : 'First-Time Hospital Registration'}
              </p>
              <p className="text-sm text-amber-700">
                Date of birth ({inferred.dateOfBirth}) and gender ({inferred.gender}) have been pre-filled from the MyKad IC structure. Complete demographic fields below.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-xl shadow-gray-200/50 overflow-hidden">
        <div className={`h-1.5 bg-gradient-to-r ${theme.cardAccentGradient}`} />
        <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className={`p-2 ${theme.bgLight} rounded-lg`}>
              <Calendar className={`w-5 h-5 ${theme.iconColor}`} />
            </div>
            Consultation, Sub-Entities & Clinical Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="visitDate">Visit Date</Label>
                <Input
                  id="visitDate"
                  type="date"
                  value={formData.visitDate}
                  onChange={(e) => setFormData({ ...formData, visitDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="visitType">Visit Type</Label>
                <select
                  id="visitType"
                  title="Visit Type"
                  className="w-full h-10 px-3 border border-gray-200 rounded-md bg-white text-sm font-medium text-gray-900"
                  value={formData.visitType}
                  onChange={(e) => setFormData({ ...formData, visitType: e.target.value })}
                >
                  <option value="outpatient">Outpatient</option>
                  <option value="inpatient">Inpatient</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="followUpDate">Follow-up Date (Optional)</Label>
                <Input
                  id="followUpDate"
                  type="date"
                  value={formData.followUpDate}
                  onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                />
              </div>
            </div>

            {!patientExists && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <p className="text-sm font-bold text-gray-800">Patient Registration Demographics</p>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="md:col-span-2 space-y-1.5">
                    <Label htmlFor="patientName">Patient Full Name *</Label>
                    <Input
                      id="patientName"
                      placeholder="Enter patient's full name"
                      value={formData.patientName}
                      onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                      required={!patientExists}
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
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="gender">Gender</Label>
                      <select
                        id="gender"
                        className="w-full h-10 px-2 border border-gray-200 rounded-md bg-white text-sm"
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' })}
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bloodType">Blood</Label>
                      <select
                        id="bloodType"
                        className="w-full h-10 px-2 border border-gray-200 rounded-md bg-white text-sm"
                        value={formData.bloodType}
                        onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })}
                      >
                        {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bt) => (
                          <option key={bt} value={bt}>{bt}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="allergies">Known Allergies (comma-separated)</Label>
                    <Input
                      id="allergies"
                      placeholder="e.g., Penicillin, Aspirin"
                      value={formData.allergiesInput}
                      onChange={(e) => setFormData({ ...formData, allergiesInput: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="chronic">Chronic Conditions (comma-separated)</Label>
                    <Input
                      id="chronic"
                      placeholder="e.g., Hypertension, Asthma"
                      value={formData.chronicConditionsInput}
                      onChange={(e) => setFormData({ ...formData, chronicConditionsInput: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="emergContact">Emergency Contact Name</Label>
                    <Input
                      id="emergContact"
                      placeholder="Next of kin name"
                      value={formData.emergencyContact}
                      onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="emergPhone">Emergency Contact Phone</Label>
                    <Input
                      id="emergPhone"
                      placeholder="+6012-3456789"
                      value={formData.emergencyPhone}
                      onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-gray-500" />
                Vital Signs
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="space-y-1 col-span-2 md:col-span-1">
                  <Label htmlFor="bp" className="text-xs text-gray-500 flex items-center gap-1">
                    <Heart className="w-3 h-3" /> BP (mmHg)
                  </Label>
                  <div className="flex items-center gap-1">
                    <Input
                      id="bp"
                      placeholder="120"
                      value={formData.bloodPressureSystolic}
                      onChange={(e) => setFormData({ ...formData, bloodPressureSystolic: e.target.value })}
                    />
                    <span>/</span>
                    <Input
                      placeholder="80"
                      value={formData.bloodPressureDiastolic}
                      onChange={(e) => setFormData({ ...formData, bloodPressureDiastolic: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="hr" className="text-xs text-gray-500">Heart Rate (bpm)</Label>
                  <Input
                    id="hr"
                    placeholder="72"
                    value={formData.heartRate}
                    onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="temp" className="text-xs text-gray-500 flex items-center gap-1">
                    <Thermometer className="w-3 h-3" /> Temp (°C)
                  </Label>
                  <Input
                    id="temp"
                    placeholder="36.5"
                    value={formData.temperature}
                    onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="weight" className="text-xs text-gray-500">Weight (kg)</Label>
                  <Input
                    id="weight"
                    placeholder="70"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="height" className="text-xs text-gray-500">Height (cm)</Label>
                  <Input
                    id="height"
                    placeholder="170"
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="chiefComplaint">Chief Complaint</Label>
              <textarea
                id="chiefComplaint"
                className="w-full p-3 border border-gray-200 rounded-xl bg-white text-sm text-gray-900"
                rows={2}
                placeholder="Patient's main reason for visit..."
                value={formData.chiefComplaint}
                onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="symptoms">Symptoms (comma-separated)</Label>
                <Input
                  id="symptoms"
                  placeholder="e.g., Headache, Fever, Fatigue"
                  value={formData.symptoms}
                  onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="diagnosis">Diagnosis * (comma-separated)</Label>
                <Input
                  id="diagnosis"
                  placeholder="e.g., Essential Hypertension, Type 2 Diabetes"
                  value={formData.diagnosis}
                  onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Clinical Notes</Label>
              <textarea
                id="notes"
                className="w-full p-3 border border-gray-200 rounded-xl bg-white text-sm text-gray-900"
                rows={3}
                placeholder="Detailed clinical notes, examination findings, treatment plan..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className="p-4 rounded-2xl bg-violet-50/50 border border-violet-100 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-violet-900 font-semibold">
                  <Pill className="w-4 h-4 text-violet-600" />
                  Prescriptions ({prescriptions.length})
                </Label>
                <Button type="button" size="sm" variant="outline" onClick={addPrescriptionRow} className="bg-white">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Medication
                </Button>
              </div>
              {prescriptions.map((rx, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-2 p-3 bg-white rounded-xl border border-violet-100 items-center">
                  <Input
                    placeholder="Medication (e.g. Amlodipine)"
                    value={rx.medicationName}
                    onChange={(e) => updatePrescriptionRow(idx, { medicationName: e.target.value })}
                    className="md:col-span-2"
                  />
                  <Input
                    placeholder="Dosage (e.g. 5mg)"
                    value={rx.dosage}
                    onChange={(e) => updatePrescriptionRow(idx, { dosage: e.target.value })}
                  />
                  <Input
                    placeholder="Frequency"
                    value={rx.frequency}
                    onChange={(e) => updatePrescriptionRow(idx, { frequency: e.target.value })}
                  />
                  <Input
                    placeholder="Duration"
                    value={rx.duration}
                    onChange={(e) => updatePrescriptionRow(idx, { duration: e.target.value })}
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      placeholder="Qty"
                      value={rx.quantity}
                      onChange={(e) => updatePrescriptionRow(idx, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                    />
                    <button
                      type="button"
                      onClick={() => removePrescriptionRow(idx)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      title="Remove prescription"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-100 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-teal-900 font-semibold">
                  <FlaskConical className="w-4 h-4 text-teal-600" />
                  Lab Reports ({labReports.length})
                </Label>
                <Button type="button" size="sm" variant="outline" onClick={addLabReportRow} className="bg-white">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Lab Result
                </Button>
              </div>
              {labReports.map((lab, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-2 p-3 bg-white rounded-xl border border-teal-100 items-center">
                  <Input
                    placeholder="Test Name (e.g. HbA1c)"
                    value={lab.testName}
                    onChange={(e) => updateLabReportRow(idx, { testName: e.target.value })}
                    className="md:col-span-2"
                  />
                  <Input
                    placeholder="Result (e.g. 6.8)"
                    value={lab.result}
                    onChange={(e) => updateLabReportRow(idx, { result: e.target.value })}
                  />
                  <Input
                    placeholder="Unit (e.g. %)"
                    value={lab.unit}
                    onChange={(e) => updateLabReportRow(idx, { unit: e.target.value })}
                  />
                  <Input
                    placeholder="Ref Range (e.g. 4.0-5.6)"
                    value={lab.referenceRange}
                    onChange={(e) => updateLabReportRow(idx, { referenceRange: e.target.value })}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={lab.isAbnormal}
                        onChange={(e) => updateLabReportRow(idx, { isAbnormal: e.target.checked })}
                      />
                      Abnormal
                    </label>
                    <button
                      type="button"
                      onClick={() => removeLabReportRow(idx)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      title="Remove lab report"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-4 pt-6 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={saving}
                className="h-12 px-6 rounded-xl border-2 font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className={`h-12 px-8 rounded-xl bg-gradient-to-r ${theme.buttonGradient} shadow-xl font-semibold`}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Saving Record...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-5 w-5" />
                    Save Medical Record
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  )
}
