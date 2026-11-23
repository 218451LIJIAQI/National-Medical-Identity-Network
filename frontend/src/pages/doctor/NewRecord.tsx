import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { useAuthStore } from '@/store/auth'
import {
  hospitalApi,
  centralApi,
  type PrescriptionDto,
  type LabReportDto,
  type VitalSignsDto,
} from '@/lib/api'
import { formatIC } from '@/lib/utils'
import { getHospitalTheme } from '@/lib/hospital-themes'
import {
  ArrowLeft, Save, Loader2, AlertTriangle, Activity, Pill, FlaskConical, Plus, Trash2,
} from 'lucide-react'

export default function NewRecord() {
  const { icNumber } = useParams<{ icNumber: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuthStore()
  const theme = getHospitalTheme(user?.hospitalId)

  const [saving, setSaving] = useState(false)
  const [loadingPatient, setLoadingPatient] = useState(true)
  const [patientExists, setPatientExists] = useState(false)
  const [patientInfo, setPatientInfo] = useState<{
    fullName: string
    bloodType: string
    allergies: string[]
    chronicConditions: string[]
  } | null>(null)

  const [formData, setFormData] = useState({
    visitDate: new Date().toISOString().split('T')[0],
    visitType: 'outpatient' as 'outpatient' | 'inpatient' | 'emergency',
    chiefComplaint: '',
    diagnosis: '',
    symptoms: '',
    notes: '',
    followUpDate: '',
    patientName: '',
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
    async function loadPatient() {
      if (!icNumber) return
      try {
        const response = await centralApi.getPatient(icNumber)
        if (response.success && response.data?.patient) {
          const p = response.data.patient
          setPatientExists(true)
          setPatientInfo({
            fullName: p.fullName,
            bloodType: p.bloodType || '',
            allergies: p.allergies || [],
            chronicConditions: p.chronicConditions || [],
          })
          setFormData((prev) => ({ ...prev, patientName: p.fullName }))
        }
      } finally {
        setLoadingPatient(false)
      }
    }
    void loadPatient()
  }, [icNumber])

  const addPrescription = () => {
    setPrescriptions((prev) => [
      ...prev,
      {
        medicationName: '',
        dosage: '500mg',
        frequency: 'Twice daily',
        duration: '7 days',
        quantity: 14,
        instructions: 'Take after meals',
        isActive: true,
      },
    ])
  }

  const addLabReport = () => {
    setLabReports((prev) => [
      ...prev,
      {
        testType: 'Blood Panel',
        testName: '',
        result: '',
        unit: 'mmol/L',
        referenceRange: '4.0 - 5.6',
        isAbnormal: false,
        reportDate: formData.visitDate,
        notes: '',
      },
    ])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const diagnoses = formData.diagnosis.split(',').map((d) => d.trim()).filter(Boolean)
    if (diagnoses.length === 0) {
      toast({
        title: 'Diagnosis required',
        description: 'Enter at least one primary diagnosis before saving.',
        variant: 'destructive',
      })
      return
    }

    if (!user?.hospitalId) {
      toast({
        title: 'Session error',
        description: 'No hospital context found. Please sign in again.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const vitalSigns: VitalSignsDto = {}
      const setNumeric = (key: keyof VitalSignsDto, raw: string) => {
        if (!raw.trim()) return
        const parsed = Number(raw)
        if (Number.isFinite(parsed) && parsed > 0) {
          vitalSigns[key] = parsed
        }
      }
      setNumeric('bloodPressureSystolic', formData.bloodPressureSystolic)
      setNumeric('bloodPressureDiastolic', formData.bloodPressureDiastolic)
      setNumeric('heartRate', formData.heartRate)
      setNumeric('temperature', formData.temperature)
      setNumeric('oxygenSaturation', formData.oxygenSaturation)
      setNumeric('weight', formData.weight)
      setNumeric('height', formData.height)

      const validPrescriptions = prescriptions.filter((rx) => rx.medicationName.trim())
      const validLabReports = labReports.filter((lab) => lab.testName.trim() && lab.result.trim())

      const response = await hospitalApi.createRecord(user.hospitalId, {
        icNumber: formatIC(icNumber || ''),
        doctorId: user.doctorId,
        visitDate: formData.visitDate,
        visitType: formData.visitType,
        chiefComplaint: formData.chiefComplaint.trim(),
        diagnosis: diagnoses,
        symptoms: formData.symptoms.split(',').map((s) => s.trim()).filter(Boolean),
        notes: formData.notes.trim(),
        followUpDate: formData.followUpDate || undefined,
        vitalSigns: Object.keys(vitalSigns).length > 0 ? vitalSigns : undefined,
        prescriptions: validPrescriptions.length > 0 ? validPrescriptions : undefined,
        labReports: validLabReports.length > 0 ? validLabReports : undefined,
        patientName: formData.patientName.trim() || undefined,
      })

      if (!response.success) {
        toast({
          title: 'Failed to save record',
          description: response.error || 'Could not persist encounter.',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Medical record saved',
        description: `Recorded encounter at ${theme.name} and updated National Index.`,
      })
      navigate(`/doctor/patient/${encodeURIComponent(formatIC(icNumber || ''))}`)
    } finally {
      setSaving(false)
    }
  }

  if (loadingPatient) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={`w-8 h-8 animate-spin ${theme.iconColor}`} />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 rounded-xl">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <Badge className={theme.badgeClass}>{theme.name}</Badge>
      </div>

      {patientExists && patientInfo ? (
        <Card className="border-slate-200/80 bg-slate-50/70">
          <CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{patientInfo.fullName}</h1>
              <p className="text-xs font-mono text-gray-500">IC: {formatIC(icNumber)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {patientInfo.bloodType && <Badge variant="secondary">Blood: {patientInfo.bloodType}</Badge>}
              {patientInfo.allergies.map((allergy) => (
                <Badge key={allergy} variant="destructive" className="gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Allergy: {allergy}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="p-5 space-y-3">
            <p className="text-sm font-semibold text-amber-900">
              New Patient Registration ({formatIC(icNumber)})
            </p>
            <div className="max-w-md">
              <Label htmlFor="patientFullName">Patient Full Name</Label>
              <Input
                id="patientFullName"
                value={formData.patientName}
                onChange={(e) => setFormData((prev) => ({ ...prev, patientName: e.target.value }))}
                placeholder="Enter full name as shown on MyKad"
                className="mt-1 bg-white"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-slate-200/80">
          <CardHeader>
            <CardTitle className="text-lg">Clinical Assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="visitDate">Visit Date</Label>
                <Input
                  id="visitDate"
                  type="date"
                  value={formData.visitDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, visitDate: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="visitType">Visit Type</Label>
                <select
                  id="visitType"
                  value={formData.visitType}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      visitType: e.target.value as 'outpatient' | 'inpatient' | 'emergency',
                    }))
                  }
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
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
                  onChange={(e) => setFormData((prev) => ({ ...prev, followUpDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="chiefComplaint">Chief Complaint</Label>
              <Input
                id="chiefComplaint"
                value={formData.chiefComplaint}
                onChange={(e) => setFormData((prev) => ({ ...prev, chiefComplaint: e.target.value }))}
                placeholder="e.g. Persistent chest tightness for 2 days"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="diagnosis">Diagnosis (comma-separated) *</Label>
                <Input
                  id="diagnosis"
                  required
                  value={formData.diagnosis}
                  onChange={(e) => setFormData((prev) => ({ ...prev, diagnosis: e.target.value }))}
                  placeholder="e.g. Essential Hypertension, Dyslipidemia"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="symptoms">Symptoms (comma-separated)</Label>
                <Input
                  id="symptoms"
                  value={formData.symptoms}
                  onChange={(e) => setFormData((prev) => ({ ...prev, symptoms: e.target.value }))}
                  placeholder="e.g. Headache, Fatigue"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="clinicalNotes">Clinical Notes &amp; Plan</Label>
              <textarea
                id="clinicalNotes"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Document physical examination findings and management plan..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-rose-500" />
              Vital Signs
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: 'bloodPressureSystolic', label: 'Systolic BP (mmHg)', placeholder: '120' },
              { id: 'bloodPressureDiastolic', label: 'Diastolic BP (mmHg)', placeholder: '80' },
              { id: 'heartRate', label: 'Heart Rate (bpm)', placeholder: '72' },
              { id: 'temperature', label: 'Temp (°C)', placeholder: '36.8' },
              { id: 'oxygenSaturation', label: 'SpO2 (%)', placeholder: '98' },
              { id: 'weight', label: 'Weight (kg)', placeholder: '68' },
              { id: 'height', label: 'Height (cm)', placeholder: '170' },
            ].map((field) => (
              <div key={field.id} className="space-y-1">
                <Label htmlFor={field.id} className="text-xs">{field.label}</Label>
                <Input
                  id={field.id}
                  type="number"
                  step="any"
                  placeholder={field.placeholder}
                  value={formData[field.id as keyof typeof formData]}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, [field.id]: e.target.value }))
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200/80">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Pill className="w-5 h-5 text-blue-600" />
              Prescriptions ({prescriptions.length})
            </CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addPrescription} className="gap-1">
              <Plus className="w-4 h-4" />
              Add Medication
            </Button>
          </CardHeader>
          {prescriptions.length > 0 && (
            <CardContent className="space-y-3">
              {prescriptions.map((rx, idx) => (
                <div key={idx} className="grid sm:grid-cols-5 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 items-end">
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Medication</Label>
                    <Input
                      placeholder="e.g. Amlodipine"
                      value={rx.medicationName}
                      onChange={(e) =>
                        setPrescriptions((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, medicationName: e.target.value } : item))
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Dosage</Label>
                    <Input
                      value={rx.dosage}
                      onChange={(e) =>
                        setPrescriptions((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, dosage: e.target.value } : item))
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Frequency</Label>
                    <Input
                      value={rx.frequency}
                      onChange={(e) =>
                        setPrescriptions((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, frequency: e.target.value } : item))
                        )
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Duration"
                      value={rx.duration}
                      onChange={(e) =>
                        setPrescriptions((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, duration: e.target.value } : item))
                        )
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setPrescriptions((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-red-500 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>

        <Card className="border-slate-200/80">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-purple-600" />
              Laboratory Results ({labReports.length})
            </CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addLabReport} className="gap-1">
              <Plus className="w-4 h-4" />
              Add Lab Result
            </Button>
          </CardHeader>
          {labReports.length > 0 && (
            <CardContent className="space-y-3">
              {labReports.map((lab, idx) => (
                <div key={idx} className="grid sm:grid-cols-5 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 items-end">
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Test Name</Label>
                    <Input
                      placeholder="e.g. HbA1c"
                      value={lab.testName}
                      onChange={(e) =>
                        setLabReports((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, testName: e.target.value } : item))
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Result</Label>
                    <Input
                      placeholder="6.4"
                      value={lab.result}
                      onChange={(e) =>
                        setLabReports((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, result: e.target.value } : item))
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Unit</Label>
                    <Input
                      value={lab.unit}
                      onChange={(e) =>
                        setLabReports((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, unit: e.target.value } : item))
                        )
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-1.5 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        checked={lab.isAbnormal}
                        onChange={(e) =>
                          setLabReports((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, isAbnormal: e.target.checked } : item))
                          )
                        }
                      />
                      Abnormal
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setLabReports((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-red-500 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)} className="rounded-xl">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className={`rounded-xl px-6 gap-2 text-white bg-gradient-to-r ${theme.buttonGradient}`}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Clinical Record
          </Button>
        </div>
      </form>
    </div>
  )
}
