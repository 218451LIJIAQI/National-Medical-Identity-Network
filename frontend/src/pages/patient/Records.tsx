import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/auth'
import { centralApi, type MedicalRecordDto } from '@/lib/api'
import { useTranslation } from '@/lib/i18n'
import {
  Building2, Calendar, FileText, Loader2, Stethoscope, Clock,
  Pill, FlaskConical, Activity, Download, Printer, ChevronDown,
  ChevronUp, Search, AlertTriangle
} from 'lucide-react'
import {
  formatDate,
  getHospitalColor,
  formatActorDisplayName,
  downloadCsvFile,
  downloadJsonFile,
  printHtmlDocument,
} from '@/lib/utils'
import { motion } from 'framer-motion'

export default function PatientRecords() {
  const { user } = useAuthStore()
  const { t } = useTranslation()
  const [records, setRecords] = useState<MedicalRecordDto[]>([])
  const [partialFailure, setPartialFailure] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedHospital, setSelectedHospital] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedRecordIds, setExpandedRecordIds] = useState<Record<string, boolean>>({})

  useEffect(() => {
    async function loadRecords() {
      if (!user?.icNumber) {
        setLoading(false)
        return
      }
      try {
        const response = await centralApi.queryPatient(user.icNumber)
        if (response.success && response.data) {
          setPartialFailure(Boolean(response.data.partialFailure))
          const allRecords: MedicalRecordDto[] = []
          response.data.hospitals.forEach((hospital) => {
            hospital.records?.forEach((record) => {
              allRecords.push({
                ...record,
                hospitalId: hospital.hospitalId,
                hospitalName: hospital.hospitalName,
              })
            })
          })
          allRecords.sort(
            (a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()
          )
          setRecords(allRecords)
          if (allRecords[0]?.id) {
            setExpandedRecordIds({ [allRecords[0].id]: true })
          }
        }
      } catch (error) {
        console.error('Failed to load records:', error)
      } finally {
        setLoading(false)
      }
    }
    loadRecords()
  }, [user?.icNumber])

  const hospitalOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of records) {
      map.set(r.hospitalId, r.hospitalName || r.hospitalId)
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [records])

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return records.filter((rec) => {
      if (selectedHospital !== 'all' && rec.hospitalId !== selectedHospital) return false
      if (!q) return true
      const haystack = [
        rec.hospitalName,
        rec.doctorName,
        rec.chiefComplaint,
        rec.notes,
        ...(rec.diagnosis || []),
        ...(rec.prescriptions || []).map((p) => p.medicationName),
        ...(rec.labReports || []).map((l) => l.testName),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [records, selectedHospital, searchQuery])

  const toggleExpand = (id: string) => {
    setExpandedRecordIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleExportCsv = () => {
    downloadCsvFile(
      `medlink-records-${user?.icNumber || 'patient'}.csv`,
      [
        'Visit Date',
        'Hospital',
        'Visit Type',
        'Attending Doctor',
        'Chief Complaint',
        'Diagnosis',
        'Prescriptions',
        'Lab Reports',
        'Clinical Notes',
      ],
      filteredRecords.map((r) => [
        r.visitDate,
        r.hospitalName || r.hospitalId,
        r.visitType,
        r.doctorName || formatActorDisplayName(undefined, r.doctorId, 'doctor'),
        r.chiefComplaint || '',
        (r.diagnosis || []).join('; '),
        (r.prescriptions || [])
          .map((p) => `${p.medicationName} ${p.dosage} (${p.frequency})`)
          .join('; '),
        (r.labReports || [])
          .map((l) => `${l.testName}: ${l.result} ${l.unit}${l.isAbnormal ? ' [ABNORMAL]' : ''}`)
          .join('; '),
        r.notes || '',
      ])
    )
  }

  const handleExportJson = () => {
    downloadJsonFile(`medlink-records-${user?.icNumber || 'patient'}.json`, {
      exportedAt: new Date().toISOString(),
      patientName: user?.fullName,
      icNumber: user?.icNumber,
      recordCount: filteredRecords.length,
      records: filteredRecords,
    })
  }

  const handlePrint = () => {
    const rowsHtml = filteredRecords
      .map(
        (r) => `<tr>
          <td>${formatDate(r.visitDate)}</td>
          <td>${r.hospitalName || r.hospitalId}</td>
          <td>${r.visitType}</td>
          <td>${r.doctorName || formatActorDisplayName(undefined, r.doctorId, 'doctor')}</td>
          <td>${(r.diagnosis || []).join(', ') || r.chiefComplaint || '-'}</td>
          <td>${(r.prescriptions || []).map((p) => `${p.medicationName} ${p.dosage}`).join(', ') || '-'}</td>
        </tr>`
      )
      .join('')
    printHtmlDocument(
      `Medical Records Summary - ${user?.fullName || user?.icNumber || ''}`,
      `<div class="header">
        <div>
          <h1>MedLink MY — Personal Medical History</h1>
          <p>Patient: <strong>${user?.fullName || '-'}</strong> | MyKad IC: <strong>${user?.icNumber || '-'}</strong></p>
        </div>
        <div>Generated: ${new Date().toLocaleString('en-MY')}</div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Hospital</th>
            <th>Type</th>
            <th>Doctor</th>
            <th>Diagnosis / Complaint</th>
            <th>Medications</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <div class="footer">National Medical Identity Network (MedLink MY) — Official Patient Copy</div>`
    )
  }

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

  const uniqueHospitalsCount = hospitalOptions.length

  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-8 text-white shadow-2xl shadow-blue-500/25">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30 shadow-lg">
                <FileText className="w-7 h-7" />
              </div>
              <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm px-3 py-1">
                {t.myRecords}
              </Badge>
            </div>
            <h1 className="text-4xl font-bold mb-2">My Medical History</h1>
            <p className="text-blue-100 text-lg">
              Complete federated records from{' '}
              <span className="font-semibold text-white">{uniqueHospitalsCount} hospitals</span> •{' '}
              <span className="font-semibold text-white">{records.length} visits</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleExportCsv}
              disabled={filteredRecords.length === 0}
              className="bg-white/15 border-white/30 text-white hover:bg-white/25 gap-2"
            >
              <Download className="w-4 h-4" />
              {t.exportCsv}
            </Button>
            <Button
              variant="outline"
              onClick={handleExportJson}
              disabled={filteredRecords.length === 0}
              className="bg-white/15 border-white/30 text-white hover:bg-white/25 gap-2"
            >
              <Download className="w-4 h-4" />
              {t.exportJson}
            </Button>
            <Button
              variant="outline"
              onClick={handlePrint}
              disabled={filteredRecords.length === 0}
              className="bg-white text-indigo-700 hover:bg-blue-50 border-white gap-2 font-semibold"
            >
              <Printer className="w-4 h-4" />
              {t.printSummary}
            </Button>
          </div>
        </div>
      </div>

      {partialFailure && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3.5 text-sm text-amber-900 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <span>{t.partialHospitalFailureWarning}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
          <CardContent className="pt-5">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-md">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{uniqueHospitalsCount}</p>
                <p className="text-sm text-gray-500 font-medium">{t.hospitalsVisited}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <CardContent className="pt-5">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl shadow-md">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{records.length}</p>
                <p className="text-sm text-gray-500 font-medium">{t.medicalRecordsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
          <CardContent className="pt-5">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl shadow-md">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">
                  {records.length > 0 ? formatDate(records[0].visitDate) : '-'}
                </p>
                <p className="text-sm text-gray-500 font-medium">{t.lastVisit}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-xl shadow-gray-200/50 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
        <div className="p-6 border-b bg-gradient-to-r from-blue-50/50 to-white space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg shadow-blue-500/25">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Medical History Timeline</h2>
                <p className="text-sm text-gray-500">
                  Showing {filteredRecords.length} of {records.length} visits • Click any visit to inspect prescriptions, labs & vitals
                </p>
              </div>
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter diagnosis, drug, lab, doctor..."
                className="pl-9"
              />
            </div>
          </div>

          {hospitalOptions.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={selectedHospital === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedHospital('all')}
              >
                All Hospitals ({records.length})
              </Button>
              {hospitalOptions.map((h) => (
                <Button
                  key={h.id}
                  size="sm"
                  variant={selectedHospital === h.id ? 'default' : 'outline'}
                  onClick={() => setSelectedHospital(h.id)}
                >
                  {h.name}
                </Button>
              ))}
            </div>
          )}
        </div>

        <CardContent className="p-0">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No matching medical records found</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredRecords.map((record) => {
                const color = getHospitalColor(record.hospitalId)
                const isExpanded = Boolean(expandedRecordIds[record.id])
                const doctorLabel =
                  record.doctorName || formatActorDisplayName(undefined, record.doctorId, 'doctor')
                const vitals = record.vitalSigns || {}
                const hasVitals =
                  vitals.bloodPressureSystolic !== undefined ||
                  vitals.heartRate !== undefined ||
                  vitals.temperature !== undefined ||
                  vitals.oxygenSaturation !== undefined

                return (
                  <div key={record.id} className="p-5 hover:bg-gray-50/70 transition-colors">
                    <div
                      className="flex items-start gap-4 cursor-pointer"
                      onClick={() => toggleExpand(record.id)}
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        <Building2 className="w-6 h-6" style={{ color }} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-gray-900">{record.hospitalName}</p>
                            <p className="text-gray-800 font-medium mt-1">
                              {record.diagnosis?.length > 0
                                ? record.diagnosis.join(', ')
                                : record.chiefComplaint || 'General consultation'}
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
                              {(record.prescriptions?.length || 0) > 0 && (
                                <span className="flex items-center gap-1 text-violet-600 font-medium">
                                  <Pill className="w-4 h-4" />
                                  {record.prescriptions!.length} Rx
                                </span>
                              )}
                              {(record.labReports?.length || 0) > 0 && (
                                <span className="flex items-center gap-1 text-cyan-600 font-medium">
                                  <FlaskConical className="w-4 h-4" />
                                  {record.labReports!.length} Lab
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge
                              className={
                                record.visitType === 'emergency'
                                  ? 'bg-red-100 text-red-700'
                                  : record.visitType === 'inpatient'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-blue-100 text-blue-700'
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

                        {isExpanded && (
                          <div
                            className="mt-4 pt-4 border-t border-gray-200 space-y-4 cursor-default"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {record.chiefComplaint && (
                              <div className="text-sm">
                                <span className="font-semibold text-gray-700">Chief Complaint: </span>
                                <span className="text-gray-600">{record.chiefComplaint}</span>
                              </div>
                            )}

                            {hasVitals && (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs">
                                {vitals.bloodPressureSystolic !== undefined && (
                                  <div className="flex items-center gap-1.5">
                                    <Activity className="w-3.5 h-3.5 text-rose-500" />
                                    <span className="text-gray-500">BP:</span>
                                    <span className="font-semibold text-gray-900">
                                      {vitals.bloodPressureSystolic}/{vitals.bloodPressureDiastolic} mmHg
                                    </span>
                                  </div>
                                )}
                                {vitals.heartRate !== undefined && (
                                  <div>
                                    <span className="text-gray-500">HR: </span>
                                    <span className="font-semibold text-gray-900">{vitals.heartRate} bpm</span>
                                  </div>
                                )}
                                {vitals.temperature !== undefined && (
                                  <div>
                                    <span className="text-gray-500">Temp: </span>
                                    <span className="font-semibold text-gray-900">
                                      {Number(vitals.temperature).toFixed(1)} °C
                                    </span>
                                  </div>
                                )}
                                {vitals.oxygenSaturation !== undefined && (
                                  <div>
                                    <span className="text-gray-500">SpO2: </span>
                                    <span className="font-semibold text-gray-900">{vitals.oxygenSaturation}%</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {record.notes && (
                              <div className="text-sm bg-gray-50 rounded-xl p-3 border border-gray-100 text-gray-700">
                                <p className="font-semibold text-gray-800 mb-1">Clinical Notes</p>
                                <p>{record.notes}</p>
                              </div>
                            )}

                            {record.prescriptions && record.prescriptions.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                                  Prescriptions ({record.prescriptions.length})
                                </p>
                                <div className="grid sm:grid-cols-2 gap-2">
                                  {record.prescriptions.map((rx, idx) => (
                                    <div
                                      key={rx.id || `${record.id}-rx-${idx}`}
                                      className="p-3 rounded-xl border border-violet-100 bg-violet-50/40 text-sm"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-semibold text-gray-900">
                                          {rx.medicationName} ({rx.dosage})
                                        </span>
                                        <Badge
                                          variant="outline"
                                          className={
                                            rx.isActive !== false
                                              ? 'border-emerald-300 text-emerald-700 bg-emerald-50 text-xs'
                                              : 'text-gray-500 text-xs'
                                          }
                                        >
                                          {rx.isActive !== false ? 'Active' : 'Completed'}
                                        </Badge>
                                      </div>
                                      <p className="text-xs text-gray-600 mt-1">
                                        {rx.frequency} • {rx.duration}
                                        {rx.instructions ? ` — ${rx.instructions}` : ''}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {record.labReports && record.labReports.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                                  Laboratory Reports ({record.labReports.length})
                                </p>
                                <div className="grid sm:grid-cols-2 gap-2">
                                  {record.labReports.map((lab, idx) => (
                                    <div
                                      key={lab.id || `${record.id}-lab-${idx}`}
                                      className={`p-3 rounded-xl border text-sm ${
                                        lab.isAbnormal
                                          ? 'border-red-200 bg-red-50/50'
                                          : 'border-cyan-100 bg-cyan-50/30'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-semibold text-gray-900">{lab.testName}</span>
                                        {lab.isAbnormal && (
                                          <Badge variant="destructive" className="text-xs">
                                            Abnormal
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-gray-700 mt-1">
                                        Result: <strong>{lab.result} {lab.unit}</strong> (Ref: {lab.referenceRange || '-'})
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {record.followUpDate && (
                              <p className="text-xs text-indigo-700 font-medium">
                                Scheduled Follow-up: {formatDate(record.followUpDate)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
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
