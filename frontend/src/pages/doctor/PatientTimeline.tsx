import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { centralApi, type MedicalRecordDto } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { useClinicalStore } from '@/store/clinical'
import { useTranslation } from '@/lib/i18n'
import {
  ArrowLeft,
  Plus,
  Building2,
  Calendar,
  User,
  AlertTriangle,
  FileText,
  Pill,
  Loader2,
  Shield,
  ShieldAlert,
  Edit3,
  Printer,
  Download,
  FlaskConical,
  Activity,
  Lock,
} from 'lucide-react'
import { downloadJsonFile, formatDate, formatIC, printHtmlDocument } from '@/lib/utils'
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

interface ActiveMedicationItem {
  name: string
  frequency: string
  instructions?: string
  hospital: string
}

export default function PatientTimeline() {
  const { icNumber } = useParams<{ icNumber: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { setActivePatient } = useClinicalStore()
  const { t } = useTranslation()
  const theme = getHospitalTheme(user?.hospitalId)

  const [loading, setLoading] = useState(true)
  const [accessDeniedError, setAccessDeniedError] = useState<string | null>(null)
  const [notFoundError, setNotFoundError] = useState<string | null>(null)
  const [partialFailureWarning, setPartialFailureWarning] = useState<string | null>(null)
  const [hospitalFilter, setHospitalFilter] = useState<string>('all')

  const [patient, setPatient] = useState<PatientInfo>({
    fullName: '',
    icNumber: formatIC(icNumber || ''),
    dateOfBirth: '',
    gender: '',
    bloodType: '',
    allergies: [],
    chronicConditions: [],
  })
  const [records, setRecords] = useState<MedicalRecordDto[]>([])
  const [medications, setMedications] = useState<ActiveMedicationItem[]>([])

  useEffect(() => {
    async function loadPatientData() {
      if (!icNumber) return
      setLoading(true)
      setAccessDeniedError(null)
      setNotFoundError(null)
      setPartialFailureWarning(null)

      try {
        const formattedIc = formatIC(icNumber)
        const [queryRes, patientRes] = await Promise.all([
          centralApi.queryPatient(formattedIc),
          centralApi.getPatient(formattedIc),
        ])

        if (queryRes.accessDenied || patientRes.accessDenied) {
          setAccessDeniedError(queryRes.error || patientRes.error || t.privacyRestrictedDesc)
          return
        }

        if ((queryRes.notFound || queryRes.status === 404) && (patientRes.notFound || patientRes.status === 404)) {
          setNotFoundError(queryRes.error || t.patientNotFoundDesc)
          return
        }

        if (queryRes.success && queryRes.data) {
          if (queryRes.data.partialFailure) {
            setPartialFailureWarning(
              `${t.partialHospitalFailureWarning} (${(queryRes.data.failedHospitals || []).join(', ')})`
            )
          }

          const allRecords: MedicalRecordDto[] = []
          const allMeds: ActiveMedicationItem[] = []

          queryRes.data.hospitals.forEach((hospital) => {
            hospital.records?.forEach((rec) => {
              const isLocalEditable =
                rec.isReadOnly === false && rec.hospitalId === user?.hospitalId
              allRecords.push({
                ...rec,
                hospitalId: rec.hospitalId || hospital.hospitalId,
                hospitalName: hospital.hospitalName,
                isReadOnly: !isLocalEditable,
              })

              rec.prescriptions?.forEach((rx) => {
                if (rx.isActive) {
                  allMeds.push({
                    name: `${rx.medicationName} ${rx.dosage}`,
                    frequency: rx.frequency,
                    instructions: rx.instructions,
                    hospital: hospital.hospitalName,
                  })
                }
              })
            })
          })

          allRecords.sort((a, b) => b.visitDate.localeCompare(a.visitDate))
          setRecords(allRecords)
          setMedications(allMeds)
        }

        if (patientRes.success && patientRes.data?.patient) {
          const p = patientRes.data.patient
          const info: PatientInfo = {
            fullName: String(p.fullName || 'Unknown Patient'),
            icNumber: formattedIc,
            dateOfBirth: String(p.dateOfBirth || ''),
            gender: String(p.gender || ''),
            bloodType: String(p.bloodType || ''),
            allergies: Array.isArray(p.allergies) ? (p.allergies as string[]) : [],
            chronicConditions: Array.isArray(p.chronicConditions) ? (p.chronicConditions as string[]) : [],
          }
          setPatient(info)
          setActivePatient({
            icNumber: info.icNumber,
            fullName: info.fullName,
            dateOfBirth: info.dateOfBirth,
            gender: info.gender,
            bloodType: info.bloodType,
            allergies: info.allergies,
            chronicConditions: info.chronicConditions,
          })
        }
      } catch (error) {
        console.error('Failed to load patient data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadPatientData()
  }, [icNumber, user?.hospitalId, setActivePatient, t.partialHospitalFailureWarning, t.patientNotFoundDesc, t.privacyRestrictedDesc])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={`h-8 w-8 animate-spin ${theme.iconColor}`} />
      </div>
    )
  }

  if (accessDeniedError) {
    return (
      <Card className="border-2 border-red-300 bg-red-50 rounded-2xl shadow-lg max-w-2xl mx-auto mt-10">
        <CardContent className="p-8 space-y-4">
          <div className="flex items-center gap-3 text-red-800">
            <ShieldAlert className="w-8 h-8 text-red-600 shrink-0" />
            <div>
              <h2 className="text-xl font-bold">{t.privacyRestrictedTitle}</h2>
              <p className="text-xs font-mono text-red-700 mt-0.5">IC: {formatIC(icNumber || '')}</p>
            </div>
          </div>
          <p className="text-sm text-red-800 leading-relaxed">{accessDeniedError}</p>
          <div className="pt-2">
            <Button variant="outline" onClick={() => navigate('/doctor/search')} className="rounded-xl">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Patient Search
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (notFoundError) {
    return (
      <Card className="border-2 border-amber-200 bg-amber-50 rounded-2xl shadow-md max-w-2xl mx-auto mt-10">
        <CardContent className="p-8 space-y-4">
          <h2 className="text-xl font-bold text-amber-950">{t.patientNotFoundTitle}</h2>
          <p className="text-sm text-amber-800">{notFoundError}</p>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => navigate('/doctor/search')} className="rounded-xl">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={() => navigate(`/doctor/patient/${encodeURIComponent(formatIC(icNumber || ''))}/new-record`)}
              className={`bg-gradient-to-r ${theme.buttonGradient} text-white rounded-xl`}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Register & Create First Record
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const uniqueHospitals = Array.from(
    new Map(records.map((r) => [r.hospitalId, r.hospitalName || r.hospitalId])).entries()
  )
  const filteredRecords =
    hospitalFilter === 'all' ? records : records.filter((r) => r.hospitalId === hospitalFilter)

  const handlePrintSummary = () => {
    const rowsHtml = filteredRecords
      .map(
        (r) => `<tr>
          <td>${formatDate(r.visitDate)}</td>
          <td>${r.hospitalName || r.hospitalId}</td>
          <td>${r.doctorName || r.doctorId}</td>
          <td>${r.diagnosis.join(', ')}</td>
          <td>${r.notes || '-'}</td>
        </tr>`
      )
      .join('')
    printHtmlDocument(
      `Federated Clinical Summary - ${patient.fullName}`,
      `<div class="header">
        <div>
          <h1>MedLink MY Federated Clinical Summary</h1>
          <p>${patient.fullName} (${patient.icNumber})</p>
        </div>
        <div>Generated by ${theme.name}</div>
      </div>
      <div class="meta">
        <strong>DOB:</strong> ${formatDate(patient.dateOfBirth)} |
        <strong>Gender:</strong> ${patient.gender} |
        <strong>Blood Type:</strong> ${patient.bloodType || 'Unknown'}<br/>
        <strong>Allergies:</strong> ${patient.allergies.join(', ') || 'None recorded'}
      </div>
      <table>
        <thead><tr><th>Date</th><th>Hospital</th><th>Attending Doctor</th><th>Diagnosis</th><th>Notes</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>`
    )
  }

  const handleExportJson = () => {
    downloadJsonFile(`medlink-timeline-${patient.icNumber}.json`, {
      exportedAt: new Date().toISOString(),
      patient,
      records: filteredRecords,
      activeMedications: medications,
    })
  }

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {partialFailureWarning && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-sm flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>{partialFailureWarning}</span>
        </div>
      )}

      {/* Header */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${theme.headerGradient} p-7 text-white shadow-xl`}>
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/doctor/search">
              <Button variant="ghost" size="icon" className="bg-white/20 hover:bg-white/30 text-white rounded-xl">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="p-3 bg-white/20 rounded-2xl border border-white/30">
              <User className="w-7 h-7" />
            </div>
            <div>
              <Badge className="bg-white/20 text-white border-0 mb-1">
                <Shield className="w-3 h-3 mr-1" /> Federated Clinical Timeline
              </Badge>
              <h1 className="text-2xl sm:text-3xl font-bold">{patient.fullName}</h1>
              <p className="text-white/85 font-mono text-sm">{formatIC(patient.icNumber)}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              type="button"
              variant="ghost"
              onClick={handlePrintSummary}
              className="bg-white/15 hover:bg-white/25 text-white rounded-xl"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              {t.printSummary}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleExportJson}
              className="bg-white/15 hover:bg-white/25 text-white rounded-xl"
            >
              <Download className="w-4 h-4 mr-1.5" />
              {t.exportJson}
            </Button>
            <Link to={`/doctor/patient/${encodeURIComponent(patient.icNumber)}/new-record`}>
              <Button className="bg-white text-slate-900 hover:bg-slate-100 gap-2 h-11 px-5 rounded-xl font-bold shadow">
                <Plus className="h-4 w-4" />
                {t.newRecord}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Patient Demographics & Clinical Alerts */}
      <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <div className={`h-1 bg-gradient-to-r ${theme.cardAccentGradient}`} />
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-slate-600" />
              Patient Demographics & Clinical Alerts
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Link to="/doctor/prescription">
                <Button variant="outline" size="sm" className="rounded-xl text-xs">
                  <Pill className="w-3.5 h-3.5 mr-1" /> Issue e-Rx
                </Button>
              </Link>
              <Link to="/doctor/lab">
                <Button variant="outline" size="sm" className="rounded-xl text-xs">
                  <FlaskConical className="w-3.5 h-3.5 mr-1" /> Order Lab
                </Button>
              </Link>
              <Link to="/doctor/mc">
                <Button variant="outline" size="sm" className="rounded-xl text-xs">
                  <FileText className="w-3.5 h-3.5 mr-1" /> Issue MC
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="p-3 rounded-xl bg-slate-50">
              <p className="text-xs text-slate-500">Full Name</p>
              <p className="font-semibold text-slate-900 mt-0.5">{patient.fullName}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50">
              <p className="text-xs text-slate-500">Date of Birth</p>
              <p className="font-semibold text-slate-900 mt-0.5">{formatDate(patient.dateOfBirth)}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50">
              <p className="text-xs text-slate-500">Gender</p>
              <p className="font-semibold text-slate-900 capitalize mt-0.5">{patient.gender || '-'}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50">
              <p className="text-xs text-slate-500">Blood Type</p>
              <p className="font-bold text-red-600 mt-0.5">{patient.bloodType || 'Unknown'}</p>
            </div>
          </div>

          {patient.allergies.length > 0 && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 flex-wrap">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
              <span className="text-sm font-bold text-red-800">Known Allergies:</span>
              {patient.allergies.map((allergy) => (
                <Badge key={allergy} variant="destructive">
                  {allergy}
                </Badge>
              ))}
            </div>
          )}

          {patient.chronicConditions.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Chronic Conditions:</span>
              {patient.chronicConditions.map((condition) => (
                <Badge key={condition} variant="secondary">
                  {condition}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Medical Records Timeline */}
      <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <div className={`h-1 bg-gradient-to-r ${theme.cardAccentGradient}`} />
        <CardHeader className="bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2.5 text-lg">
            <FileText className={`h-5 w-5 ${theme.iconColor}`} />
            Federated Consultations ({filteredRecords.length})
          </CardTitle>

          {uniqueHospitals.length > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setHospitalFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  hospitalFilter === 'all' ? `${theme.iconBg} text-white` : 'bg-white border text-slate-600'
                }`}
              >
                All Hospitals ({records.length})
              </button>
              {uniqueHospitals.map(([hId, hName]) => (
                <button
                  key={hId}
                  type="button"
                  onClick={() => setHospitalFilter(hId)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    hospitalFilter === hId ? `${theme.iconBg} text-white` : 'bg-white border text-slate-600'
                  }`}
                >
                  {hName}
                </button>
              ))}
            </div>
          )}
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No consultation records match the selected filter.</p>
            </div>
          ) : (
            filteredRecords.map((record) => {
              const recordTheme = getHospitalTheme(record.hospitalId)
              const canEdit = !record.isReadOnly && record.hospitalId === user?.hospitalId
              return (
                <div
                  key={record.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    canEdit ? `bg-white ${theme.borderColor} shadow-sm` : 'bg-slate-50/70 border-slate-200'
                  }`}
                  style={{ borderLeftWidth: 4, borderLeftColor: recordTheme.primaryColor }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-3 py-0.5 rounded-full text-xs font-semibold border ${recordTheme.badgeClass}`}>
                          <Building2 className="w-3 h-3 inline mr-1" />
                          {record.hospitalName || recordTheme.name}
                        </span>
                        <Badge variant="outline" className="capitalize text-xs">
                          {record.visitType}
                        </Badge>
                        {record.isReadOnly ? (
                          <Badge variant="outline" className="text-xs bg-slate-100 text-slate-600 gap-1">
                            <Lock className="w-3 h-3" /> Read-Only (External Hospital)
                          </Badge>
                        ) : (
                          <Badge className="text-xs bg-emerald-100 text-emerald-800 border-emerald-200">
                            Local Editable Record
                          </Badge>
                        )}
                      </div>

                      <h4 className="font-bold text-slate-900 text-lg">
                        {record.diagnosis.join(', ') || 'General Consultation'}
                      </h4>
                      <p className="text-xs text-slate-500">
                        Attending Clinician: <strong>{record.doctorName || record.doctorId}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(record.visitDate)}
                      </span>
                      {canEdit && (
                        <Link
                          to={`/doctor/patient/${encodeURIComponent(patient.icNumber)}/records/${encodeURIComponent(record.id)}/edit`}
                        >
                          <Button variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs">
                            <Edit3 className="w-3.5 h-3.5" />
                            {t.editRecord}
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Clinical Body */}
                  <div className="mt-4 pt-3 border-t border-slate-200/70 space-y-3 text-sm">
                    {record.chiefComplaint && (
                      <p className="text-slate-700">
                        <span className="font-semibold text-slate-900">Chief Complaint:</span> {record.chiefComplaint}
                      </p>
                    )}

                    {record.symptoms && record.symptoms.length > 0 && (
                      <p className="text-slate-700">
                        <span className="font-semibold text-slate-900">Symptoms:</span> {record.symptoms.join(', ')}
                      </p>
                    )}

                    {record.vitalSigns && Object.keys(record.vitalSigns).length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-slate-600 flex items-center gap-1">
                          <Activity className="w-3.5 h-3.5" /> Vitals:
                        </span>
                        {record.vitalSigns.bloodPressureSystolic && (
                          <Badge variant="outline">
                            BP {record.vitalSigns.bloodPressureSystolic}/{record.vitalSigns.bloodPressureDiastolic} mmHg
                          </Badge>
                        )}
                        {record.vitalSigns.heartRate && (
                          <Badge variant="outline">HR {record.vitalSigns.heartRate} bpm</Badge>
                        )}
                        {record.vitalSigns.temperature && (
                          <Badge variant="outline">Temp {Number(record.vitalSigns.temperature).toFixed(1)} °C</Badge>
                        )}
                        {record.vitalSigns.oxygenSaturation && (
                          <Badge variant="outline">SpO2 {record.vitalSigns.oxygenSaturation}%</Badge>
                        )}
                        {record.vitalSigns.weight && (
                          <Badge variant="outline">{record.vitalSigns.weight} kg</Badge>
                        )}
                      </div>
                    )}

                    {record.notes && (
                      <p className="text-slate-600 bg-white/80 p-3 rounded-xl border border-slate-100">
                        {record.notes}
                      </p>
                    )}

                    {/* Prescriptions Subtable */}
                    {record.prescriptions && record.prescriptions.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                          <Pill className="w-3.5 h-3.5" /> Prescriptions ({record.prescriptions.length})
                        </p>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {record.prescriptions.map((rx, idx) => (
                            <div
                              key={rx.id || idx}
                              className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs"
                            >
                              <p className="font-bold text-emerald-950">
                                {rx.medicationName} ({rx.dosage})
                              </p>
                              <p className="text-emerald-800">
                                {rx.frequency} • {rx.duration} (Qty: {rx.quantity})
                              </p>
                              {rx.instructions && <p className="text-emerald-700 mt-0.5">{rx.instructions}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Lab Reports Subtable */}
                    {record.labReports && record.labReports.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1">
                          <FlaskConical className="w-3.5 h-3.5" /> Lab Results ({record.labReports.length})
                        </p>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {record.labReports.map((lab, idx) => (
                            <div
                              key={lab.id || idx}
                              className={`p-2.5 rounded-xl border text-xs ${
                                lab.isAbnormal
                                  ? 'bg-red-50/80 border-red-200 text-red-950'
                                  : 'bg-indigo-50/60 border-indigo-100 text-indigo-950'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold">{lab.testName}</span>
                                {lab.isAbnormal && (
                                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                    Abnormal
                                  </Badge>
                                )}
                              </div>
                              <p className="mt-0.5">
                                Result: <strong>{lab.result} {lab.unit}</strong> (Ref: {lab.referenceRange || '-'})
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Active Medications Summary */}
      <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
        <CardHeader className="bg-emerald-50/40 border-b border-slate-100">
          <CardTitle className="flex items-center gap-2.5 text-lg">
            <Pill className="h-5 w-5 text-emerald-600" />
            Active Medications Across Hospitals ({medications.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {medications.length === 0 ? (
            <p className="text-center py-6 text-slate-500 text-sm">No active prescriptions recorded.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-3.5">
              {medications.map((med, i) => (
                <div
                  key={`${med.name}-${i}`}
                  className="flex items-center justify-between p-4 bg-emerald-50/60 rounded-xl border border-emerald-200"
                >
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{med.name}</p>
                    <p className="text-xs text-emerald-700 font-medium">{med.frequency}</p>
                  </div>
                  <Badge className="bg-white text-emerald-800 border border-emerald-200 text-xs">
                    {med.hospital}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
