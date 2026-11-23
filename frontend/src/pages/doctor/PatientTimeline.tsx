import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { centralApi, type MedicalRecordDto, type PatientDto } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import {
  ArrowLeft, Plus, Building2, Calendar, AlertTriangle, Pill, Loader2, ShieldOff, Lock, Stethoscope, FlaskConical,
} from 'lucide-react'
import { formatDate, formatDoctorName, formatIC } from '@/lib/utils'
import { getHospitalTheme } from '@/lib/hospital-themes'

interface TimelineRecord extends MedicalRecordDto {
  resolvedHospitalId: string
  resolvedHospitalName: string
}

export default function PatientTimeline() {
  const { icNumber } = useParams<{ icNumber: string }>()
  const { user } = useAuthStore()
  const myTheme = getHospitalTheme(user?.hospitalId)

  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [deniedMessage, setDeniedMessage] = useState('')
  const [patient, setPatient] = useState<PatientDto | null>(null)
  const [records, setRecords] = useState<TimelineRecord[]>([])

  useEffect(() => {
    async function loadTimeline() {
      if (!icNumber) return
      setLoading(true)
      try {
        const [queryRes, patientRes] = await Promise.all([
          centralApi.queryPatient(icNumber),
          centralApi.getPatient(icNumber),
        ])

        if (queryRes.success && queryRes.data?.accessDenied) {
          setAccessDenied(true)
          setDeniedMessage(queryRes.data.message || 'Patient has restricted access from this hospital.')
          return
        }

        if (queryRes.success && queryRes.data) {
          const collected: TimelineRecord[] = []
          for (const hosp of queryRes.data.hospitals) {
            for (const rec of hosp.records || []) {
              collected.push({
                ...rec,
                resolvedHospitalId: rec.hospitalId || hosp.hospitalId,
                resolvedHospitalName: hosp.hospitalName,
              })
            }
          }
          collected.sort((a, b) => b.visitDate.localeCompare(a.visitDate))
          setRecords(collected)
        }

        if (patientRes.success && patientRes.data?.patient) {
          setPatient(patientRes.data.patient)
        }
      } finally {
        setLoading(false)
      }
    }

    void loadTimeline()
  }, [icNumber])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={`h-9 w-9 animate-spin ${myTheme.iconColor}`} />
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <Link to="/doctor/search">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Search
          </Button>
        </Link>
        <Card className="border-red-200 bg-red-50/70">
          <CardContent className="p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <ShieldOff className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold text-red-900">Cross-Hospital Access Restricted</h1>
            <p className="text-sm text-red-700 max-w-lg mx-auto">{deniedMessage}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const activeMedications = Array.from(
    new Map(
      records
        .flatMap((r) =>
          (r.prescriptions || [])
            .filter((rx) => rx.isActive)
            .map((rx) => [
              `${rx.medicationName}-${rx.dosage}`,
              {
                label: `${rx.medicationName} ${rx.dosage}`,
                frequency: rx.frequency,
                hospital: r.resolvedHospitalName,
              },
            ] as const)
        )
    ).values()
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/doctor/search">
          <Button variant="ghost" className="gap-2 rounded-xl">
            <ArrowLeft className="w-4 h-4" />
            Back to Patient Search
          </Button>
        </Link>

        <Link to={`/doctor/patient/${encodeURIComponent(icNumber || '')}/new-record`}>
          <Button className={`gap-2 rounded-xl text-white bg-gradient-to-r ${myTheme.buttonGradient}`}>
            <Plus className="w-4 h-4" />
            New Record at {myTheme.displayShortName}
          </Button>
        </Link>
      </div>

      <Card className="border-slate-200/80 shadow-md">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {patient?.fullName || 'Registered Citizen'}
              </h1>
              <p className="text-sm font-mono text-gray-500 mt-0.5">
                IC: {formatIC(icNumber)}
                {patient?.gender ? ` · ${patient.gender.toUpperCase()}` : ''}
                {patient?.dateOfBirth ? ` · DOB ${formatDate(patient.dateOfBirth)}` : ''}
              </p>
            </div>
            {patient?.bloodType && (
              <div className="px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-center">
                <p className="text-[11px] font-semibold uppercase text-red-600">Blood Group</p>
                <p className="text-xl font-black text-red-700">{patient.bloodType}</p>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-400 mb-1.5">Allergies</p>
              {patient?.allergies && patient.allergies.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {patient.allergies.map((a) => (
                    <Badge key={a} variant="destructive" className="gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {a}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-emerald-600 font-medium">No known allergies</p>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-gray-400 mb-1.5">Chronic Conditions</p>
              {patient?.chronicConditions && patient.chronicConditions.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {patient.chronicConditions.map((c) => (
                    <Badge key={c} variant="secondary">{c}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">None recorded</p>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-gray-400 mb-1.5">Active Medications</p>
              {activeMedications.length > 0 ? (
                <div className="space-y-1">
                  {activeMedications.slice(0, 3).map((m) => (
                    <p key={m.label} className="text-xs text-gray-700 flex items-center gap-1.5">
                      <Pill className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="font-medium">{m.label}</span>
                      <span className="text-gray-400">({m.frequency})</span>
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">No active prescriptions</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900">
          Longitudinal Clinical Encounters ({records.length})
        </h2>

        {records.length === 0 ? (
          <Card className="border-slate-200/80">
            <CardContent className="p-8 text-center text-gray-500">
              No clinical encounters found yet.
            </CardContent>
          </Card>
        ) : (
          records.map((rec) => {
            const hospTheme = getHospitalTheme(rec.resolvedHospitalId)
            const isExternal = rec.resolvedHospitalId !== user?.hospitalId
            return (
              <Card key={rec.id} className="border-slate-200/80 overflow-hidden">
                <div className="h-1" style={{ backgroundColor: hospTheme.primaryColor }} />
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={hospTheme.badgeClass}>
                        <Building2 className="w-3 h-3 mr-1" />
                        {rec.resolvedHospitalName}
                      </Badge>
                      <Badge variant="outline" className="capitalize">{rec.visitType}</Badge>
                      {isExternal && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Lock className="w-3 h-3" />
                          Read-Only Federated Copy
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(rec.visitDate)}
                    </span>
                  </div>
                  <CardTitle className="text-lg pt-1">
                    {rec.chiefComplaint || rec.diagnosis[0] || 'Clinical Consultation'}
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3 text-sm">
                  <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5" />
                    Attending: {formatDoctorName(rec.doctorName)}
                  </p>

                  {rec.diagnosis.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {rec.diagnosis.map((d) => (
                        <Badge key={d} variant="secondary">{d}</Badge>
                      ))}
                    </div>
                  )}

                  {rec.notes && <p className="text-gray-700 leading-relaxed">{rec.notes}</p>}

                  {rec.vitalSigns && (
                    <div className="flex flex-wrap gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100 text-gray-700">
                      {rec.vitalSigns.bloodPressureSystolic && rec.vitalSigns.bloodPressureDiastolic && (
                        <span>BP: <strong>{rec.vitalSigns.bloodPressureSystolic}/{rec.vitalSigns.bloodPressureDiastolic}</strong> mmHg</span>
                      )}
                      {rec.vitalSigns.heartRate && <span>HR: <strong>{rec.vitalSigns.heartRate}</strong> bpm</span>}
                      {rec.vitalSigns.temperature && <span>Temp: <strong>{rec.vitalSigns.temperature}</strong> °C</span>}
                      {rec.vitalSigns.oxygenSaturation && <span>SpO2: <strong>{rec.vitalSigns.oxygenSaturation}</strong>%</span>}
                    </div>
                  )}

                  {rec.prescriptions && rec.prescriptions.length > 0 && (
                    <div className="grid sm:grid-cols-2 gap-2 pt-1">
                      {rec.prescriptions.map((rx, idx) => (
                        <div key={`${rx.medicationName}-${idx}`} className="p-2.5 rounded-lg bg-blue-50/50 border border-blue-100 text-xs">
                          <p className="font-semibold text-gray-900">{rx.medicationName} {rx.dosage}</p>
                          <p className="text-gray-600">{rx.frequency} &middot; {rx.duration}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {rec.labReports && rec.labReports.length > 0 && (
                    <div className="grid sm:grid-cols-2 gap-2 pt-1">
                      {rec.labReports.map((lab, idx) => (
                        <div key={`${lab.testName}-${idx}`} className="p-2.5 rounded-lg bg-purple-50/50 border border-purple-100 text-xs flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 font-medium text-gray-900">
                            <FlaskConical className="w-3.5 h-3.5 text-purple-600" />
                            {lab.testName}
                          </span>
                          <Badge variant={lab.isAbnormal ? 'destructive' : 'secondary'}>
                            {lab.result} {lab.unit}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
