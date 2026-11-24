import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/ui/modal-dialog'
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
  CheckCircle2,
} from 'lucide-react'
import {
  cn,
  downloadJsonFile,
  escapeHtml,
  formatDate,
  formatIC,
  printHtmlDocument,
} from '@/lib/utils'
import { getHospitalTheme } from '@/lib/hospital-themes'

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
    let cancelled = false

    async function loadPatientData() {
      if (!icNumber) return
      setLoading(true)
      setAccessDeniedError(null)
      setNotFoundError(null)
      setPartialFailureWarning(null)
      setHospitalFilter('all')

      try {
        const formattedIc = formatIC(icNumber)
        const [queryRes, patientRes] = await Promise.all([
          centralApi.queryPatient(formattedIc),
          centralApi.getPatient(formattedIc),
        ])

        if (cancelled) return

        if (queryRes.accessDenied || patientRes.accessDenied) {
          setAccessDeniedError(queryRes.error || patientRes.error || t.privacyRestrictedDesc)
          return
        }

        if (
          (queryRes.notFound || queryRes.status === 404) &&
          (patientRes.notFound || patientRes.status === 404)
        ) {
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
            })
          })

          allRecords.sort(
            (a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()
          )

          const dedupMedMap = new Map<string, ActiveMedicationItem>()
          for (const rec of allRecords) {
            for (const rx of rec.prescriptions || []) {
              if (!rx.isActive || !rx.medicationName) continue
              const key = `${rx.medicationName.toLowerCase()}|${rx.dosage.toLowerCase()}`
              if (!dedupMedMap.has(key)) {
                dedupMedMap.set(key, {
                  name: `${rx.medicationName} ${rx.dosage}`,
                  frequency: rx.frequency,
                  instructions: rx.instructions,
                  hospital: rec.hospitalName || rec.hospitalId,
                })
              }
            }
          }

          setRecords(allRecords)
          setMedications(Array.from(dedupMedMap.values()))
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
            chronicConditions: Array.isArray(p.chronicConditions)
              ? (p.chronicConditions as string[])
              : [],
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
            scopedHospitalId: user?.hospitalId,
            scopedDoctorId: user?.doctorId,
          })
        }
      } catch (error) {
        console.error('Failed to load patient data:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadPatientData()
    return () => {
      cancelled = true
    }
  }, [
    icNumber,
    user?.hospitalId,
    user?.doctorId,
    setActivePatient,
    t.partialHospitalFailureWarning,
    t.patientNotFoundDesc,
    t.privacyRestrictedDesc,
  ])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={cn('h-8 w-8 animate-spin', theme.iconColor)} />
      </div>
    )
  }

  if (accessDeniedError) {
    return (
      <Card className="border-2 border-red-300 bg-red-50 rounded-2xl shadow-sm max-w-2xl mx-auto mt-10">
        <CardContent className="p-8 space-y-4">
          <div className="flex items-center gap-3 text-red-900">
            <ShieldAlert className="w-8 h-8 text-red-700 shrink-0" />
            <div>
              <h2 className="text-xl font-bold">{t.privacyRestrictedTitle}</h2>
              <p className="text-xs font-mono text-red-800 mt-0.5 tabular-nums">
                IC: {formatIC(icNumber || '')}
              </p>
            </div>
          </div>
          <p className="text-sm text-red-900 leading-relaxed">{accessDeniedError}</p>
          <div className="pt-2">
            <Button variant="outline" onClick={() => navigate('/doctor/search')}>
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
      <Card className="border-2 border-amber-300 bg-amber-50 rounded-2xl shadow-sm max-w-2xl mx-auto mt-10">
        <CardContent className="p-8 space-y-4">
          <h2 className="text-xl font-bold text-amber-950">{t.patientNotFoundTitle}</h2>
          <p className="text-sm text-amber-900">{notFoundError}</p>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => navigate('/doctor/search')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={() =>
                navigate(`/doctor/patient/${encodeURIComponent(formatIC(icNumber || ''))}/new-record`)
              }
              className={cn('bg-gradient-to-r text-white', theme.buttonGradient)}
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
          <td>${escapeHtml(formatDate(r.visitDate))}</td>
          <td>${escapeHtml(r.hospitalName || r.hospitalId)}</td>
          <td>${escapeHtml(r.doctorName || r.doctorId)}</td>
          <td>${escapeHtml(r.diagnosis.join(', '))}</td>
          <td>${escapeHtml(r.notes || '—')}</td>
        </tr>`
      )
      .join('')
    printHtmlDocument(
      `Federated Clinical Summary - ${patient.fullName}`,
      `<div class="header">
        <div>
          <h1>MedLink MY Federated Clinical Summary</h1>
          <p>${escapeHtml(patient.fullName)} (${escapeHtml(patient.icNumber)})</p>
        </div>
        <div>Generated by ${escapeHtml(theme.name)}</div>
      </div>
      <div class="meta">
        <strong>DOB:</strong> ${escapeHtml(formatDate(patient.dateOfBirth))} |
        <strong>Gender:</strong> ${escapeHtml(patient.gender)} |
        <strong>Blood Type:</strong> ${escapeHtml(patient.bloodType || 'Unknown')}<br/>
        <strong>Allergies:</strong> ${escapeHtml(patient.allergies.join(', ') || 'None recorded')}
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
    <div className="space-y-6">
      {partialFailureWarning && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-semibold flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-800 shrink-0" />
          <span>{partialFailureWarning}</span>
        </div>
      )}

      {/* Header */}
      <div
        className={cn(
          'rounded-2xl bg-gradient-to-r p-6 text-white shadow-md flex items-center justify-between gap-4 flex-wrap',
          theme.headerGradient
        )}
      >
        <div className="flex items-center gap-4">
          <Link to="/doctor/search">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Back to patient search"
              className="bg-white/20 hover:bg-white/30 text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="p-2.5 bg-white/20 rounded-xl border border-white/25">
            <User className="w-6 h-6" />
          </div>
          <div>
            <Badge className="bg-white/20 text-white border-0 mb-1">
              <Shield className="w-3 h-3 mr-1" /> Federated Clinical Timeline
            </Badge>
            <h1 className="text-2xl font-bold">{patient.fullName}</h1>
            <p className="text-white/85 font-mono text-xs tabular-nums">
              {formatIC(patient.icNumber)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="ghost"
            onClick={handlePrintSummary}
            className="bg-white/15 hover:bg-white/25 text-white"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            {t.printSummary}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleExportJson}
            className="bg-white/15 hover:bg-white/25 text-white"
          >
            <Download className="w-4 h-4 mr-1.5" />
            {t.exportJson}
          </Button>
          <Link to={`/doctor/patient/${encodeURIComponent(patient.icNumber)}/new-record`}>
            <Button className="bg-white text-slate-900 hover:bg-slate-100 gap-1.5 font-bold shadow-sm">
              <Plus className="h-4 w-4" />
              {t.newRecord}
            </Button>
          </Link>
        </div>
      </div>

      {/* Patient Demographics & Clinical Alerts */}
      <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <div className={cn('h-1 bg-gradient-to-r', theme.cardAccentGradient)} />
        <CardHeader className="py-4 px-5 border-b border-slate-100">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-slate-600" />
              <span>Patient Demographics & Clinical Safety Profile</span>
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Link to="/doctor/prescription">
                <Button variant="outline" size="sm">
                  <Pill className="w-3.5 h-3.5 mr-1" /> Issue e-Rx
                </Button>
              </Link>
              <Link to="/doctor/lab">
                <Button variant="outline" size="sm">
                  <FlaskConical className="w-3.5 h-3.5 mr-1" /> Order Lab
                </Button>
              </Link>
              <Link to="/doctor/mc">
                <Button variant="outline" size="sm">
                  <FileText className="w-3.5 h-3.5 mr-1" /> Issue MC
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-4 gap-3 text-sm">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <p className="text-xs text-slate-500">Full Name</p>
              <p className="font-bold text-slate-900 mt-0.5">{patient.fullName}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <p className="text-xs text-slate-500">Date of Birth</p>
              <p className="font-bold text-slate-900 mt-0.5 tabular-nums">
                {formatDate(patient.dateOfBirth)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <p className="text-xs text-slate-500">Gender</p>
              <p className="font-bold text-slate-900 capitalize mt-0.5">{patient.gender || '—'}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <p className="text-xs text-slate-500">Blood Group</p>
              <p className="font-extrabold text-red-700 mt-0.5">{patient.bloodType || 'Unknown'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {patient.allergies.length > 0 ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-red-900">
                  {t.allergiesOnFile}:
                </span>
                {patient.allergies.map((allergy) => (
                  <StatusBadge key={allergy} tone="critical" label={allergy} />
                ))}
              </div>
            ) : (
              <StatusBadge tone="success" icon={CheckCircle2} label={t.nkdaVerified} />
            )}

            {patient.chronicConditions.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap ml-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  {t.chronicConditionsOnFile}:
                </span>
                {patient.chronicConditions.map((condition) => (
                  <StatusBadge key={condition} tone="warning" label={condition} />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Medical Records Timeline */}
      <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <div className={cn('h-1 bg-gradient-to-r', theme.cardAccentGradient)} />
        <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-4 px-5 flex flex-row items-center justify-between gap-3 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className={cn('h-4 w-4', theme.iconColor)} />
            <span>Federated Consultations ({filteredRecords.length})</span>
          </CardTitle>

          {uniqueHospitals.length > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setHospitalFilter('all')}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-semibold transition-colors',
                  hospitalFilter === 'all'
                    ? `${theme.iconBg} text-white`
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                )}
              >
                All Hospitals ({records.length})
              </button>
              {uniqueHospitals.map(([hId, hName]) => (
                <button
                  key={hId}
                  type="button"
                  onClick={() => setHospitalFilter(hId)}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-semibold transition-colors',
                    hospitalFilter === hId
                      ? `${theme.iconBg} text-white`
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  )}
                >
                  {hName}
                </button>
              ))}
            </div>
          )}
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">
              <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p>No consultation records match the selected hospital filter.</p>
            </div>
          ) : (
            filteredRecords.map((record) => {
              const recordTheme = getHospitalTheme(record.hospitalId)
              const canEdit = !record.isReadOnly && record.hospitalId === user?.hospitalId
              return (
                <div
                  key={record.id}
                  className={cn(
                    'p-5 rounded-2xl border transition-colors',
                    canEdit ? `bg-white ${theme.borderColor} shadow-sm` : 'bg-slate-50/70 border-slate-200'
                  )}
                  style={{ borderLeftWidth: 4, borderLeftColor: recordTheme.primaryColor }}
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            'px-2.5 py-0.5 rounded-full text-xs font-bold border inline-flex items-center gap-1',
                            recordTheme.badgeClass
                          )}
                        >
                          <Building2 className="w-3 h-3" />
                          {record.hospitalName || recordTheme.name}
                        </span>
                        <Badge variant="outline" className="capitalize text-xs">
                          {record.visitType}
                        </Badge>
                        {record.isReadOnly ? (
                          <StatusBadge
                            tone="neutral"
                            icon={Lock}
                            label="Read-Only (External Hospital)"
                          />
                        ) : (
                          <StatusBadge
                            tone="success"
                            icon={CheckCircle2}
                            label="Local Editable Record"
                          />
                        )}
                      </div>

                      <h3 className="font-bold text-slate-900 text-base">
                        {record.diagnosis.join(', ') || 'General Consultation'}
                        {record.diagnosisCodes?.length ? (
                          <span className="ml-2 text-xs font-mono text-slate-500">
                            [{record.diagnosisCodes.join(', ')}]
                          </span>
                        ) : null}
                      </h3>
                      <p className="text-xs text-slate-600">
                        Attending Clinician: <strong>{record.doctorName || record.doctorId}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-xl tabular-nums">
                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
                        {formatDate(record.visitDate)}
                      </span>
                      {canEdit && (
                        <Link
                          to={`/doctor/patient/${encodeURIComponent(patient.icNumber)}/records/${encodeURIComponent(record.id)}/edit`}
                        >
                          <Button variant="outline" size="sm" className="gap-1.5">
                            <Edit3 className="w-3.5 h-3.5" />
                            {t.editRecord}
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Clinical Body */}
                  <div className="mt-4 pt-3 border-t border-slate-200/80 space-y-3 text-xs">
                    {record.chiefComplaint && (
                      <p className="text-slate-700 text-sm">
                        <span className="font-bold text-slate-900">Chief Complaint:</span>{' '}
                        {record.chiefComplaint}
                      </p>
                    )}

                    {record.symptoms && record.symptoms.length > 0 && (
                      <p className="text-slate-700">
                        <span className="font-bold text-slate-900">Symptoms:</span>{' '}
                        {record.symptoms.join(', ')}
                      </p>
                    )}

                    {record.vitalSigns && Object.keys(record.vitalSigns).length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 tabular-nums">
                        <span className="font-bold text-slate-700 flex items-center gap-1">
                          <Activity className="w-3.5 h-3.5" /> Vitals:
                        </span>
                        {record.vitalSigns.bloodPressureSystolic && (
                          <Badge variant="outline">
                            BP {record.vitalSigns.bloodPressureSystolic}/
                            {record.vitalSigns.bloodPressureDiastolic} mmHg
                          </Badge>
                        )}
                        {record.vitalSigns.heartRate && (
                          <Badge variant="outline">HR {record.vitalSigns.heartRate} bpm</Badge>
                        )}
                        {record.vitalSigns.temperature && (
                          <Badge variant="outline">
                            Temp {Number(record.vitalSigns.temperature).toFixed(1)} °C
                          </Badge>
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
                      <p className="text-slate-700 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed">
                        {record.notes}
                      </p>
                    )}

                    {/* Structured Prescriptions Table */}
                    {record.prescriptions && record.prescriptions.length > 0 && (
                      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                        <table className="w-full text-xs">
                          <thead className="bg-emerald-50/80 text-emerald-950 border-b border-slate-200">
                            <tr>
                              <th className="py-2 px-3 text-left font-bold">Medication</th>
                              <th className="py-2 px-3 text-left font-bold">Dosage</th>
                              <th className="py-2 px-3 text-left font-bold">Frequency</th>
                              <th className="py-2 px-3 text-left font-bold">Duration / Qty</th>
                              <th className="py-2 px-3 text-left font-bold">Instructions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {record.prescriptions.map((rx, idx) => (
                              <tr key={rx.id || idx}>
                                <td className="py-2 px-3 font-bold text-slate-900">
                                  {rx.medicationName}
                                </td>
                                <td className="py-2 px-3 text-slate-700">{rx.dosage}</td>
                                <td className="py-2 px-3 text-slate-700">{rx.frequency}</td>
                                <td className="py-2 px-3 text-slate-700 tabular-nums">
                                  {rx.duration || '—'} (Qty: {rx.quantity || 1})
                                </td>
                                <td className="py-2 px-3 text-slate-600">
                                  {rx.instructions || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Structured Lab Results Table */}
                    {record.labReports && record.labReports.length > 0 && (
                      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                        <table className="w-full text-xs">
                          <thead className="bg-indigo-50/80 text-indigo-950 border-b border-slate-200">
                            <tr>
                              <th className="py-2 px-3 text-left font-bold">Test</th>
                              <th className="py-2 px-3 text-left font-bold">Result</th>
                              <th className="py-2 px-3 text-left font-bold">Ref Range</th>
                              <th className="py-2 px-3 text-left font-bold">Status</th>
                              <th className="py-2 px-3 text-left font-bold">Notes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {record.labReports.map((lab, idx) => (
                              <tr
                                key={lab.id || idx}
                                className={lab.isAbnormal ? 'bg-red-50/50' : undefined}
                              >
                                <td className="py-2 px-3 font-bold text-slate-900">
                                  {lab.testName}
                                </td>
                                <td className="py-2 px-3 font-bold text-slate-900 tabular-nums">
                                  {lab.result} {lab.unit}
                                </td>
                                <td className="py-2 px-3 text-slate-600 tabular-nums">
                                  {lab.referenceRange || '—'}
                                </td>
                                <td className="py-2 px-3">
                                  {lab.isAbnormal ? (
                                    <StatusBadge tone="critical" label="Abnormal" />
                                  ) : (
                                    <StatusBadge tone="success" label="Normal" />
                                  )}
                                </td>
                                <td className="py-2 px-3 text-slate-600">{lab.notes || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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
        <div className="h-1 bg-gradient-to-r from-emerald-600 to-teal-600" />
        <CardHeader className="bg-emerald-50/40 border-b border-slate-100 py-4 px-5">
          <CardTitle className="flex items-center gap-2 text-base">
            <Pill className="h-4 w-4 text-emerald-700" />
            <span>Active Medications Across Hospitals ({medications.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          {medications.length === 0 ? (
            <p className="text-center py-4 text-slate-500 text-xs">No active prescriptions recorded.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {medications.map((med, i) => (
                <div
                  key={`${med.name}-${i}`}
                  className="flex items-center justify-between gap-3 p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200"
                >
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{med.name}</p>
                    <p className="text-xs text-emerald-800 font-semibold">{med.frequency}</p>
                  </div>
                  <Badge className="bg-white text-emerald-900 border border-emerald-200 text-xs shrink-0">
                    {med.hospital}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
