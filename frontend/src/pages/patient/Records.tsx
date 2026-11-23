import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/auth'
import { centralApi, type MedicalRecordPayload } from '@/lib/api'
import {
  Building2, Calendar, FileText, Loader2, Stethoscope, Clock,
  Pill, FlaskConical, Activity, AlertTriangle, ChevronDown, ChevronUp
} from 'lucide-react'
import { formatActorDisplayName, formatDate, getHospitalColor } from '@/lib/utils'
import { motion } from 'framer-motion'

export default function PatientRecords() {
  const { user } = useAuthStore()
  const [records, setRecords] = useState<MedicalRecordPayload[]>([])
  const [failedHospitals, setFailedHospitals] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function loadRecords() {
      if (!user?.icNumber) return
      try {
        const response = await centralApi.queryPatient(user.icNumber)
        if (!active) return
        if (response.success && response.data) {
          const allRecords: MedicalRecordPayload[] = []
          const failed: string[] = []
          response.data.hospitals.forEach((hospital) => {
            if (hospital.status !== 'success') {
              failed.push(hospital.hospitalName)
            }
            hospital.records?.forEach((record) => {
              allRecords.push({
                ...record,
                hospitalId: record.hospitalId || hospital.hospitalId,
                hospitalName: record.hospitalName || hospital.hospitalName,
              })
            })
          })
          allRecords.sort((a, b) => b.visitDate.localeCompare(a.visitDate))
          setRecords(allRecords)
          setFailedHospitals(failed)
          if (allRecords[0]) setExpandedId(allRecords[0].id)
        } else {
          setErrorMessage(response.error || 'Unable to retrieve records right now')
        }
      } catch (error) {
        console.error('Failed to load records:', error)
        if (active) setErrorMessage('Network error while loading your records')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadRecords()
    return () => {
      active = false
    }
  }, [user?.icNumber])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading your medical records...</p>
        </div>
      </div>
    )
  }

  const uniqueHospitalsCount = new Set(records.map((r) => r.hospitalId)).size

  return (
    <motion.div className="space-y-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-8 text-white shadow-2xl shadow-blue-500/25">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30 shadow-lg">
              <FileText className="w-7 h-7 drop-shadow" />
            </div>
            <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm px-3 py-1">Medical Records</Badge>
          </div>
          <h1 className="text-4xl font-bold mb-3 drop-shadow-lg">My Medical History</h1>
          <p className="text-blue-100 text-lg">
            Complete records from <span className="font-semibold text-white">{uniqueHospitalsCount} hospitals</span> • <span className="font-semibold text-white">{records.length} total visits</span>
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {failedHospitals.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
          <span>
            Partial results shown: hospital node(s) <strong>{failedHospitals.join(', ')}</strong> could not be reached.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-xl shadow-blue-100/50 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
          <CardContent className="pt-5">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg shadow-blue-200">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{uniqueHospitalsCount}</p>
                <p className="text-sm text-gray-500 font-medium">Hospitals</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl shadow-emerald-100/50 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <CardContent className="pt-5">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl shadow-lg shadow-emerald-200">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{records.length}</p>
                <p className="text-sm text-gray-500 font-medium">Total Records</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl shadow-violet-100/50 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
          <CardContent className="pt-5">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl shadow-lg shadow-violet-200">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{records.length > 0 ? formatDate(records[0].visitDate) : '-'}</p>
                <p className="text-sm text-gray-500 font-medium">Last Visit</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-xl shadow-gray-200/50 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
        <div className="p-6 border-b bg-gradient-to-r from-blue-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg shadow-blue-500/25">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Medical History Timeline</h2>
              <p className="text-sm text-gray-500">Click any visit entry to inspect clinical notes, vitals, prescriptions, and lab results</p>
            </div>
          </div>
        </div>
        <CardContent className="p-0">
          {records.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No medical records found</p>
              <p className="text-sm text-gray-400">Your records will appear here once created by a connected hospital</p>
            </div>
          ) : (
            <div className="divide-y">
              {records.map((record) => {
                const color = getHospitalColor(record.hospitalId)
                const isExpanded = expandedId === record.id
                const doctorLabel = formatActorDisplayName(record.doctorName, record.doctorId, 'doctor')
                const vitals = record.vitalSigns || {}

                return (
                  <div key={record.id} className="p-5 hover:bg-gray-50/70 transition-colors">
                    <div
                      className="flex items-start gap-4 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : record.id)}
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        <Building2 className="w-6 h-6" style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold text-gray-900">{record.hospitalName}</p>
                            <p className="text-gray-800 font-medium mt-1">
                              {record.diagnosis.length > 0 ? record.diagnosis.join(', ') : 'General consultation'}
                            </p>
                            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {formatDate(record.visitDate)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Stethoscope className="w-4 h-4" />
                                {doctorLabel}
                              </span>
                              {record.prescriptions && record.prescriptions.length > 0 && (
                                <span className="flex items-center gap-1 text-violet-600">
                                  <Pill className="w-4 h-4" />
                                  {record.prescriptions.length} Rx
                                </span>
                              )}
                              {record.labReports && record.labReports.length > 0 && (
                                <span className="flex items-center gap-1 text-teal-600">
                                  <FlaskConical className="w-4 h-4" />
                                  {record.labReports.length} Lab(s)
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              className={
                                record.visitType === 'emergency'
                                  ? 'bg-red-100 text-red-700'
                                  : record.visitType === 'outpatient'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-amber-100 text-amber-800'
                              }
                            >
                              {record.visitType}
                            </Badge>
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pl-16 space-y-4 text-sm">
                        {record.chiefComplaint && (
                          <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                            <p className="text-xs font-semibold text-gray-500 uppercase">Chief Complaint</p>
                            <p className="text-gray-800 mt-1">{record.chiefComplaint}</p>
                          </div>
                        )}

                        {record.notes && (
                          <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100">
                            <p className="text-xs font-semibold text-blue-700 uppercase">Clinical Notes</p>
                            <p className="text-gray-800 mt-1 whitespace-pre-line">{record.notes}</p>
                          </div>
                        )}

                        {Object.keys(vitals).length > 0 && (
                          <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-xs font-semibold text-gray-500 flex items-center gap-1 mr-1">
                              <Activity className="w-3.5 h-3.5" /> Vitals:
                            </span>
                            {vitals.bloodPressureSystolic && vitals.bloodPressureDiastolic && (
                              <Badge variant="outline">BP {vitals.bloodPressureSystolic}/{vitals.bloodPressureDiastolic} mmHg</Badge>
                            )}
                            {vitals.heartRate && <Badge variant="outline">HR {vitals.heartRate} bpm</Badge>}
                            {vitals.temperature && <Badge variant="outline">Temp {vitals.temperature} °C</Badge>}
                            {vitals.weight && <Badge variant="outline">Weight {vitals.weight} kg</Badge>}
                          </div>
                        )}

                        {record.prescriptions && record.prescriptions.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                              <Pill className="w-3.5 h-3.5 text-violet-600" /> Prescriptions
                            </p>
                            <div className="grid md:grid-cols-2 gap-2">
                              {record.prescriptions.map((rx, idx) => (
                                <div key={rx.id || idx} className="p-3 rounded-xl bg-violet-50/60 border border-violet-100 flex items-center justify-between">
                                  <div>
                                    <p className="font-semibold text-gray-900">{rx.medicationName} {rx.dosage}</p>
                                    <p className="text-xs text-gray-600">{rx.frequency} • {rx.duration}</p>
                                    {rx.instructions && <p className="text-xs text-gray-500 mt-0.5">{rx.instructions}</p>}
                                  </div>
                                  <Badge variant={rx.isActive ? 'success' : 'secondary'} className="text-xs">
                                    {rx.isActive ? 'Active' : 'Completed'}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {record.labReports && record.labReports.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                              <FlaskConical className="w-3.5 h-3.5 text-teal-600" /> Lab Results
                            </p>
                            <div className="grid md:grid-cols-2 gap-2">
                              {record.labReports.map((lab, idx) => (
                                <div key={lab.id || idx} className="p-3 rounded-xl bg-teal-50/60 border border-teal-100 flex items-center justify-between">
                                  <div>
                                    <p className="font-semibold text-gray-900">{lab.testName}</p>
                                    <p className="text-xs text-gray-600">
                                      Result: <strong>{lab.result} {lab.unit}</strong> {lab.referenceRange ? `(Ref: ${lab.referenceRange})` : ''}
                                    </p>
                                  </div>
                                  {lab.isAbnormal && (
                                    <Badge variant="destructive" className="text-xs">Abnormal</Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
