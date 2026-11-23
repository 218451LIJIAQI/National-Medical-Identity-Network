import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { centralApi, hospitalApi, type MedicalRecordPayload } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import {
  ArrowLeft, Plus, Building2, Calendar, User, AlertTriangle, FileText,
  Pill, Loader2, Shield, ShieldAlert, FlaskConical, Activity, Edit3, Save, X, Stethoscope
} from 'lucide-react'
import { formatActorDisplayName, formatDate, formatIC } from '@/lib/utils'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { motion } from 'framer-motion'

interface PatientInfo {
  fullName: string
  icNumber: string
  dateOfBirth: string
  gender: string
  bloodType: string
  allergies: string[]
  chronicConditions: string[]
}

interface Medication {
  name: string
  frequency: string
  hospital: string
}

export default function PatientTimeline() {
  const { icNumber } = useParams<{ icNumber: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuthStore()
  const theme = getHospitalTheme(user?.hospitalId)
  const cleanIc = formatIC(icNumber || '')

  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [deniedMessage, setDeniedMessage] = useState('')
  const [failedHospitals, setFailedHospitals] = useState<string[]>([])
  const [patient, setPatient] = useState<PatientInfo>({
    fullName: '',
    icNumber: cleanIc,
    dateOfBirth: '',
    gender: '',
    bloodType: '',
    allergies: [],
    chronicConditions: [],
  })
  const [records, setRecords] = useState<MedicalRecordPayload[]>([])
  const [medications, setMedications] = useState<Medication[]>([])

  const [editingRecord, setEditingRecord] = useState<MedicalRecordPayload | null>(null)
  const [editDiagnosis, setEditDiagnosis] = useState('')
  const [editChiefComplaint, setEditChiefComplaint] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const loadPatientData = useCallback(async () => {
    if (!cleanIc) return
    setLoading(true)
    setAccessDenied(false)
    try {
      const [queryRes, patientRes] = await Promise.all([
        centralApi.queryPatient(cleanIc),
        centralApi.getPatient(cleanIc),
      ])

      if (queryRes.accessDenied || queryRes.data?.accessDenied || patientRes.accessDenied) {
        setAccessDenied(true)
        setDeniedMessage(
          queryRes.data?.message ||
            queryRes.error ||
            patientRes.error ||
            'Patient has blocked cross-hospital record access for your hospital.'
        )
        return
      }

      if (queryRes.success && queryRes.data) {
        const allRecords: MedicalRecordPayload[] = []
        const allMeds: Medication[] = []
        const failed: string[] = []

        queryRes.data.hospitals.forEach((hospital) => {
          if (hospital.status !== 'success') {
            failed.push(hospital.hospitalName)
          }
          hospital.records?.forEach((record) => {
            const effectiveHospitalId = record.hospitalId || hospital.hospitalId
            allRecords.push({
              ...record,
              hospitalId: effectiveHospitalId,
              hospitalName: record.hospitalName || hospital.hospitalName,
              isReadOnly: effectiveHospitalId !== user?.hospitalId,
            })
            record.prescriptions?.forEach((rx) => {
              if (rx.isActive) {
                allMeds.push({
                  name: `${rx.medicationName} ${rx.dosage}`.trim(),
                  frequency: rx.frequency || '',
                  hospital: hospital.hospitalName,
                })
              }
            })
          })
        })

        allRecords.sort((a, b) => b.visitDate.localeCompare(a.visitDate))
        setRecords(allRecords)
        setMedications(allMeds)
        setFailedHospitals(failed)
      }

      if (patientRes.success && patientRes.data?.patient) {
        const p = patientRes.data.patient
        setPatient({
          fullName: p.fullName || `Patient ${cleanIc}`,
          icNumber: cleanIc,
          dateOfBirth: p.dateOfBirth || '',
          gender: p.gender || '',
          bloodType: p.bloodType || '',
          allergies: p.allergies || [],
          chronicConditions: p.chronicConditions || [],
        })
      } else {
        setPatient((prev) => ({
          ...prev,
          fullName: `Unregistered Patient (${cleanIc})`,
          icNumber: cleanIc,
        }))
      }
    } catch (error) {
      console.error('Failed to load patient data:', error)
    } finally {
      setLoading(false)
    }
  }, [cleanIc, user?.hospitalId])

  useEffect(() => {
    loadPatientData()
  }, [loadPatientData])

  const openEditModal = (rec: MedicalRecordPayload) => {
    if (rec.isReadOnly || rec.hospitalId !== user?.hospitalId) return
    setEditingRecord(rec)
    setEditDiagnosis(rec.diagnosis.join(', '))
    setEditChiefComplaint(rec.chiefComplaint || '')
    setEditNotes(rec.notes || '')
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRecord || !user?.hospitalId) return
    const diagList = editDiagnosis.split(',').map((s) => s.trim()).filter(Boolean)
    if (diagList.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Diagnosis cannot be empty',
        variant: 'destructive',
      })
      return
    }
    setSavingEdit(true)
    try {
      const res = await hospitalApi.updateRecord(user.hospitalId, editingRecord.id, {
        diagnosis: diagList,
        chiefComplaint: editChiefComplaint,
        notes: editNotes,
      })
      if (res.success) {
        toast({
          title: 'Record Updated',
          description: 'Local hospital medical record updated successfully',
        })
        setEditingRecord(null)
        await loadPatientData()
      } else {
        toast({
          title: 'Update Denied',
          description: res.error || 'Could not update record',
          variant: 'destructive',
        })
      }
    } finally {
      setSavingEdit(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={`h-8 w-8 animate-spin ${theme.iconColor}`} />
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-6">
        <Card className="border-2 border-red-300 bg-red-50/70 rounded-3xl overflow-hidden shadow-xl">
          <div className="h-2 bg-gradient-to-r from-red-500 to-rose-600" />
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-2xl flex items-center justify-center">
              <ShieldAlert className="w-9 h-9 text-red-600" />
            </div>
            <Badge variant="destructive">Consent Restricted</Badge>
            <h1 className="text-2xl font-bold text-red-900">Access Restricted by Patient Privacy Settings</h1>
            <p className="text-red-800 text-sm">{deniedMessage}</p>
            <p className="text-xs text-red-600">
              Patient IC: <span className="font-mono font-semibold">{cleanIc}</span> • Attempt logged in Central Audit Ledger
            </p>
            <div className="flex justify-center gap-3 pt-4">
              <Button variant="outline" onClick={() => navigate('/doctor/search')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Search
              </Button>
              <Button
                className={`bg-gradient-to-r ${theme.buttonGradient} text-white`}
                onClick={() => navigate(`/doctor/patient/${encodeURIComponent(cleanIc)}/new-record`)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Local Visit
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <motion.div className="space-y-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.headerGradient} p-8 text-white shadow-2xl ${theme.shadowColor}`}>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/doctor/search">
              <Button variant="ghost" size="icon" className="bg-white/20 hover:bg-white/30 rounded-xl text-white">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30">
              <User className="w-7 h-7" />
            </div>
            <div>
              <Badge className="bg-white/20 text-white border-0 mb-1">
                <Shield className="w-3 h-3 mr-1" /> Federated Timeline
              </Badge>
              <h1 className="text-3xl font-bold drop-shadow-lg">{patient.fullName}</h1>
              <p className="text-white/80 font-mono">{cleanIc}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to={`/doctor/prescription?ic=${encodeURIComponent(cleanIc)}`}>
              <Button variant="ghost" className="border border-white/30 bg-white/15 hover:bg-white/25 text-white h-12 px-5 rounded-xl font-semibold gap-2">
                <Pill className="h-4 w-4" />
                e-Prescribe
              </Button>
            </Link>
            <Link to={`/doctor/patient/${encodeURIComponent(cleanIc)}/new-record`}>
              <Button className="bg-white text-gray-900 hover:bg-gray-100 gap-2 shadow-xl h-12 px-6 rounded-xl font-semibold">
                <Plus className="h-5 w-5" />
                New Record
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {failedHospitals.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-center gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>
            Warning: <strong>{failedHospitals.join(', ')}</strong> did not respond during federated retrieval. Records from offline nodes are omitted.
          </span>
        </div>
      )}

      <Card className="border-0 shadow-xl shadow-gray-200/50 overflow-hidden">
        <div className={`h-1 bg-gradient-to-r ${theme.cardAccentGradient}`} />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Patient Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Full Name</p>
              <p className="font-medium">{patient.fullName || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Date of Birth</p>
              <p className="font-medium">{formatDate(patient.dateOfBirth)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Gender</p>
              <p className="font-medium capitalize">{patient.gender || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Blood Type</p>
              <p className="font-medium">{patient.bloodType || '-'}</p>
            </div>
          </div>

          {patient.allergies.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 flex-wrap">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Allergies:</span>
                {patient.allergies.map((allergy) => (
                  <Badge key={allergy} variant="destructive" className="ml-1">
                    {allergy}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {patient.chronicConditions.length > 0 && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-500">Chronic Conditions:</span>
              {patient.chronicConditions.map((condition) => (
                <Badge key={condition} variant="secondary">
                  {condition}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-xl shadow-gray-200/50 overflow-hidden">
        <div className={`h-1 bg-gradient-to-r ${theme.cardAccentGradient}`} />
        <CardHeader className="bg-gradient-to-r from-gray-50/50 to-white border-b border-gray-100">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className={`p-2.5 bg-gradient-to-br ${theme.cardAccentGradient} rounded-xl shadow-lg`}>
              <FileText className="h-5 w-5 text-white" />
            </div>
            Medical Records Timeline ({records.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {records.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No medical records found</p>
              </div>
            ) : (
              records.map((record) => {
                const recordTheme = getHospitalTheme(record.hospitalId)
                const doctorLabel = formatActorDisplayName(record.doctorName, record.doctorId, 'doctor')
                const vitals = record.vitalSigns || {}

                return (
                  <div
                    key={record.id}
                    className={`p-5 rounded-2xl border-2 transition-all duration-200 ${
                      record.isReadOnly
                        ? 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200'
                        : `${theme.bgLight} ${theme.borderColor}`
                    }`}
                    style={{ borderLeftWidth: 4, borderLeftColor: recordTheme.primaryColor }}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div
                          className="p-3 rounded-xl shadow-sm shrink-0"
                          style={{ backgroundColor: `${recordTheme.primaryColor}15` }}
                        >
                          <Building2 className="h-6 w-6" style={{ color: recordTheme.primaryColor }} />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${recordTheme.badgeClass}`}>
                              {record.hospitalName}
                            </span>
                            {record.isReadOnly ? (
                              <Badge variant="outline" className="text-xs rounded-full px-3 bg-gray-100">
                                🔒 Cross-Hospital Read-Only
                              </Badge>
                            ) : (
                              <Badge className="text-xs rounded-full px-3 bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Local Hospital Record
                              </Badge>
                            )}
                          </div>

                          <h4 className="font-bold text-gray-900 text-lg">
                            {record.diagnosis.join(', ') || 'Clinical Consultation'}
                          </h4>

                          <p className="text-sm text-gray-600 flex items-center gap-1.5">
                            <Stethoscope className="w-4 h-4 text-gray-400" />
                            Attending: <strong>{doctorLabel}</strong>
                          </p>

                          {record.chiefComplaint && (
                            <p className="text-sm text-gray-700">
                              <span className="font-semibold text-gray-500">Chief Complaint:</span> {record.chiefComplaint}
                            </p>
                          )}

                          {record.symptoms && record.symptoms.length > 0 && (
                            <p className="text-xs text-gray-500">
                              Symptoms: {record.symptoms.join(', ')}
                            </p>
                          )}

                          {record.notes && (
                            <div className="p-3 rounded-xl bg-white/80 border border-gray-200 text-sm text-gray-700 whitespace-pre-line">
                              {record.notes}
                            </div>
                          )}

                          {Object.keys(vitals).length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Activity className="w-3.5 h-3.5" /> Vitals:
                              </span>
                              {vitals.bloodPressureSystolic && vitals.bloodPressureDiastolic && (
                                <Badge variant="outline" className="text-xs">
                                  BP {vitals.bloodPressureSystolic}/{vitals.bloodPressureDiastolic} mmHg
                                </Badge>
                              )}
                              {vitals.heartRate && <Badge variant="outline" className="text-xs">HR {vitals.heartRate} bpm</Badge>}
                              {vitals.temperature && <Badge variant="outline" className="text-xs">Temp {vitals.temperature} °C</Badge>}
                              {vitals.weight && <Badge variant="outline" className="text-xs">{vitals.weight} kg</Badge>}
                            </div>
                          )}

                          {record.prescriptions && record.prescriptions.length > 0 && (
                            <div className="pt-2 space-y-1.5">
                              <p className="text-xs font-semibold text-violet-700 uppercase flex items-center gap-1">
                                <Pill className="w-3.5 h-3.5" /> Prescriptions ({record.prescriptions.length})
                              </p>
                              <div className="grid sm:grid-cols-2 gap-2">
                                {record.prescriptions.map((rx, idx) => (
                                  <div key={rx.id || idx} className="p-2.5 rounded-lg bg-violet-50/70 border border-violet-100 text-xs">
                                    <p className="font-semibold text-gray-900">{rx.medicationName} {rx.dosage}</p>
                                    <p className="text-gray-600">{rx.frequency} • {rx.duration}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {record.labReports && record.labReports.length > 0 && (
                            <div className="pt-2 space-y-1.5">
                              <p className="text-xs font-semibold text-teal-700 uppercase flex items-center gap-1">
                                <FlaskConical className="w-3.5 h-3.5" /> Lab Reports ({record.labReports.length})
                              </p>
                              <div className="grid sm:grid-cols-2 gap-2">
                                {record.labReports.map((lab, idx) => (
                                  <div key={lab.id || idx} className="p-2.5 rounded-lg bg-teal-50/70 border border-teal-100 text-xs flex items-center justify-between">
                                    <div>
                                      <p className="font-semibold text-gray-900">{lab.testName}</p>
                                      <p className="text-gray-600">{lab.result} {lab.unit} {lab.referenceRange ? `(${lab.referenceRange})` : ''}</p>
                                    </div>
                                    {lab.isAbnormal && <Badge variant="destructive" className="text-[10px]">Abnormal</Badge>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex md:flex-col items-end justify-between gap-2 shrink-0">
                        <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
                          <Calendar className="h-4 w-4" />
                          {formatDate(record.visitDate)}
                        </div>
                        <Badge
                          className={`rounded-full px-4 ${
                            record.visitType === 'emergency'
                              ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {record.visitType}
                        </Badge>
                        {!record.isReadOnly && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2 gap-1.5 text-xs"
                            onClick={() => openEditModal(record)}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Edit Record
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-xl shadow-gray-200/50 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
        <CardHeader className="bg-gradient-to-r from-emerald-50/50 to-white border-b border-gray-100">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl shadow-lg">
              <Pill className="h-5 w-5 text-white" />
            </div>
            Active Medications
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-4">
            {medications.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-gray-500">
                <Pill className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p>No active medications found</p>
              </div>
            ) : (
              medications.map((med, i) => (
                <div
                  key={`${med.name}-${i}`}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl">
                      <Pill className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{med.name}</p>
                      <p className="text-sm text-emerald-700 font-medium">{med.frequency}</p>
                    </div>
                  </div>
                  <Badge className="rounded-full px-3 py-1 bg-white text-emerald-700 border border-emerald-200">
                    {med.hospital}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {editingRecord && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setEditingRecord(null)}
        >
          <Card className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="border-b flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Edit Local Medical Record</CardTitle>
              <button onClick={() => setEditingRecord(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <Label>Diagnosis (comma-separated) *</Label>
                  <Input
                    value={editDiagnosis}
                    onChange={(e) => setEditDiagnosis(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>Chief Complaint</Label>
                  <Input
                    value={editChiefComplaint}
                    onChange={(e) => setEditChiefComplaint(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Clinical Notes</Label>
                  <textarea
                    rows={4}
                    className="w-full p-3 border rounded-xl text-sm"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setEditingRecord(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={savingEdit} className={`bg-gradient-to-r ${theme.buttonGradient} text-white`}>
                    {savingEdit ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </motion.div>
  )
}
