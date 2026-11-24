import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/modal-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/store/auth'
import { centralApi, type MedicalRecordDto } from '@/lib/api'
import { useTranslation } from '@/lib/i18n'
import {
  Building2,
  Calendar,
  FileText,
  Stethoscope,
  Clock,
  Pill,
  FlaskConical,
  Activity,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  Search,
  AlertTriangle,
  WifiOff,
  RefreshCw,
} from 'lucide-react'
import {
  escapeHtml,
  formatBloodPressure,
  formatDate,
  formatIC,
  getHospitalColor,
  formatActorDisplayName,
  downloadCsvFile,
  downloadJsonFile,
  isPendingLabValue,
  printHtmlDocument,
} from '@/lib/utils'

export default function PatientRecords() {
  const { user } = useAuthStore()
  const { t } = useTranslation()
  const [records, setRecords] = useState<MedicalRecordDto[]>([])
  const [partialFailure, setPartialFailure] = useState(false)
  const [allNodesFailed, setAllNodesFailed] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedHospital, setSelectedHospital] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedRecordIds, setExpandedRecordIds] = useState<Record<string, boolean>>({})

  const loadRecords = useCallback(async (signal?: AbortSignal) => {
    if (!user?.icNumber) {
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)
    setAllNodesFailed(false)
    setPartialFailure(false)
    try {
      const response = await centralApi.queryPatient(user.icNumber, signal)
      if (response.aborted || signal?.aborted) return
      if (response.success && response.data) {
        if (response.data.allNodesFailed) {
          setAllNodesFailed(true)
          setRecords([])
          setLoadError(response.data.message || t.allNodesUnavailableDesc)
          return
        }
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
      } else if (response.notFound || response.status === 404) {
        setRecords([])
      } else {
        setLoadError(response.error || t.networkError)
      }
    } catch {
      if (!signal?.aborted) setLoadError(t.networkError)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [user?.icNumber, t.allNodesUnavailableDesc, t.networkError])

  useEffect(() => {
    const controller = new AbortController()
    void loadRecords(controller.signal)
    return () => controller.abort()
  }, [loadRecords])

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
      .map((r) => {
        const docName = r.doctorName || formatActorDisplayName(undefined, r.doctorId, 'doctor')
        const diagText = (r.diagnosis || []).join(', ') || r.chiefComplaint || '—'
        const medText =
          (r.prescriptions || []).map((p) => `${p.medicationName} ${p.dosage}`).join(', ') || '—'
        return `<tr>
          <td>${escapeHtml(formatDate(r.visitDate))}</td>
          <td>${escapeHtml(r.hospitalName || r.hospitalId)}</td>
          <td>${escapeHtml(r.visitType)}</td>
          <td>${escapeHtml(docName)}</td>
          <td>${escapeHtml(diagText)}</td>
          <td>${escapeHtml(medText)}</td>
        </tr>`
      })
      .join('')
    printHtmlDocument(
      `Medical Records Summary - ${user?.fullName || user?.icNumber || ''}`,
      `<div class="header">
        <div>
          <h1>MedLink MY — Personal Medical History</h1>
          <p>Patient: <strong>${escapeHtml(user?.fullName || '—')}</strong> | MyKad IC: <strong>${escapeHtml(user?.icNumber ? formatIC(user.icNumber) : '—')}</strong></p>
        </div>
        <div>Generated: ${escapeHtml(new Date().toLocaleString('en-MY'))}</div>
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
      <div class="footer">National Medical Identity Network (MedLink MY) — Official Citizen Patient Copy</div>`
    )
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    )
  }

  const uniqueHospitalsCount = hospitalOptions.length
  const hasActiveFilter = selectedHospital !== 'all' || Boolean(searchQuery.trim())

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-800 p-7 text-white shadow-md flex items-center justify-between gap-6 flex-wrap">
        <div>
          <Badge className="bg-white/20 text-white border-0 mb-2">{t.myRecords}</Badge>
          <h1 className="text-2xl xl:text-3xl font-bold">My Federated Medical History</h1>
          <p className="text-blue-100 text-xs mt-1 tabular-nums">
            Aggregated across <strong className="text-white">{uniqueHospitalsCount} hospital(s)</strong> •{' '}
            <strong className="text-white">{records.length} clinical visits</strong>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            onClick={handleExportCsv}
            disabled={filteredRecords.length === 0}
            className="bg-white/15 border border-white/25 text-white hover:bg-white/25 gap-1.5"
          >
            <Download className="w-4 h-4" />
            {t.exportCsv}
          </Button>
          <Button
            variant="ghost"
            onClick={handleExportJson}
            disabled={filteredRecords.length === 0}
            className="bg-white/15 border border-white/25 text-white hover:bg-white/25 gap-1.5"
          >
            <Download className="w-4 h-4" />
            {t.exportJson}
          </Button>
          <Button
            onClick={handlePrint}
            disabled={filteredRecords.length === 0}
            className="bg-white text-indigo-900 hover:bg-blue-50 gap-1.5 font-bold"
          >
            <Printer className="w-4 h-4" />
            {t.printSummary}
          </Button>
        </div>
      </div>

      {partialFailure && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3.5 text-xs font-semibold text-amber-950 flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-800 shrink-0" />
          <span>{t.partialHospitalFailureWarning}</span>
        </div>
      )}

      {loadError ? (
        <Card className="border-2 border-red-200 bg-red-50/70 rounded-2xl shadow-sm">
          <CardContent className="p-6 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 text-red-900">
              <WifiOff className="w-6 h-6 text-red-700 shrink-0" />
              <div>
                <p className="font-bold text-sm">
                  {allNodesFailed ? t.allNodesUnavailableTitle : t.loadFailedTitle}
                </p>
                <p className="text-xs text-red-800 mt-0.5">{loadError}</p>
              </div>
            </div>
            <Button variant="outline" onClick={loadRecords} className="bg-white">
              <RefreshCw className="w-4 h-4 mr-1.5" />
              {t.retryLoad}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border border-slate-200 shadow-sm rounded-2xl">
              <CardContent className="p-5 flex items-center gap-3.5">
                <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
                    {uniqueHospitalsCount}
                  </p>
                  <p className="text-xs font-semibold text-slate-600">{t.hospitalsVisited}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-slate-200 shadow-sm rounded-2xl">
              <CardContent className="p-5 flex items-center gap-3.5">
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-slate-900 tabular-nums">{records.length}</p>
                  <p className="text-xs font-semibold text-slate-600">{t.medicalRecordsCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-slate-200 shadow-sm rounded-2xl">
              <CardContent className="p-5 flex items-center gap-3.5">
                <div className="p-3 bg-violet-50 text-violet-700 rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-lg font-extrabold text-slate-900 tabular-nums">
                    {records.length > 0 ? formatDate(records[0].visitDate) : '—'}
                  </p>
                  <p className="text-xs font-semibold text-slate-600">{t.lastVisit}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/70 space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Medical History Timeline</h2>
                  <p className="text-xs text-slate-600 tabular-nums">
                    Showing {filteredRecords.length} of {records.length} visits • Expand any visit to inspect prescriptions, labs & vitals
                  </p>
                </div>

                <div className="relative w-72 max-w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <Input
                    id="patient-records-filter"
                    aria-label="Filter medical records"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter diagnosis, drug, lab, doctor…"
                    className="pl-10 h-10 bg-white"
                  />
                </div>
              </div>

              {hospitalOptions.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
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
              {records.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-700 font-bold">No Hospital Visits Recorded Yet</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Clinical encounters from participating hospitals will automatically appear here once indexed under your MyKad.
                  </p>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-3">
                  <Search className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-sm text-slate-600 font-medium">{t.noMatchingResults}</p>
                  {hasActiveFilter && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedHospital('all')
                        setSearchQuery('')
                      }}
                    >
                      {t.clearFilters}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredRecords.map((record) => {
                    const color = getHospitalColor(record.hospitalId)
                    const isExpanded = Boolean(expandedRecordIds[record.id])
                    const doctorLabel =
                      record.doctorName || formatActorDisplayName(undefined, record.doctorId, 'doctor')
                    const vitals = record.vitalSigns || {}
                    const hasVitals =
                      vitals.bloodPressureSystolic !== undefined ||
                      vitals.heartRate !== undefined ||
                      vitals.respiratoryRate !== undefined ||
                      vitals.temperature !== undefined ||
                      vitals.oxygenSaturation !== undefined

                    return (
                      <div key={record.id} className="p-5 hover:bg-slate-50/60 transition-colors">
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          onClick={() => toggleExpand(record.id)}
                          className="w-full text-left flex items-start gap-4"
                        >
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${color}18` }}
                          >
                            <Building2 className="w-5 h-5" style={{ color }} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-bold text-sm text-slate-900">{record.hospitalName}</p>
                                <p className="text-slate-800 font-semibold text-sm mt-0.5">
                                  {record.diagnosis?.length > 0
                                    ? record.diagnosis.join(', ')
                                    : record.chiefComplaint || 'General consultation'}
                                </p>
                                <div className="flex flex-wrap items-center gap-3.5 mt-1.5 text-xs text-slate-600 tabular-nums">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {formatDate(record.visitDate)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Stethoscope className="w-3.5 h-3.5" />
                                    {doctorLabel}
                                  </span>
                                  {(record.prescriptions?.length || 0) > 0 && (
                                    <span className="flex items-center gap-1 text-violet-800 font-semibold">
                                      <Pill className="w-3.5 h-3.5" />
                                      {record.prescriptions!.length} Rx
                                    </span>
                                  )}
                                  {(record.labReports?.length || 0) > 0 && (
                                    <span className="flex items-center gap-1 text-indigo-800 font-semibold">
                                      <FlaskConical className="w-3.5 h-3.5" />
                                      {record.labReports!.length} Lab
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <Badge
                                  variant={
                                    record.visitType === 'emergency'
                                      ? 'destructive'
                                      : record.visitType === 'inpatient'
                                        ? 'warning'
                                        : 'info'
                                  }
                                  className="capitalize"
                                >
                                  {record.visitType}
                                </Badge>
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-slate-500" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-slate-500" />
                                )}
                              </div>
                            </div>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="mt-4 pt-4 pl-4 md:pl-14 border-t border-slate-200/80 space-y-3.5 text-xs">
                            {record.chiefComplaint && (
                              <div>
                                <span className="font-bold text-slate-800">Chief Complaint: </span>
                                <span className="text-slate-700">{record.chiefComplaint}</span>
                              </div>
                            )}

                            {hasVitals && (
                              <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 tabular-nums">
                                {formatBloodPressure(
                                  vitals.bloodPressureSystolic,
                                  vitals.bloodPressureDiastolic
                                ) && (
                                  <div className="flex items-center gap-1.5">
                                    <Activity className="w-3.5 h-3.5 text-red-600" />
                                    <span className="text-slate-600">BP:</span>
                                    <span className="font-bold text-slate-900">
                                      {formatBloodPressure(
                                        vitals.bloodPressureSystolic,
                                        vitals.bloodPressureDiastolic
                                      )}{' '}
                                      mmHg
                                    </span>
                                  </div>
                                )}
                                {vitals.heartRate !== undefined && (
                                  <div>
                                    <span className="text-slate-600">HR: </span>
                                    <span className="font-bold text-slate-900">{vitals.heartRate} bpm</span>
                                  </div>
                                )}
                                {vitals.respiratoryRate !== undefined && (
                                  <div>
                                    <span className="text-slate-600">RR: </span>
                                    <span className="font-bold text-slate-900">{vitals.respiratoryRate} /min</span>
                                  </div>
                                )}
                                {vitals.temperature !== undefined && (
                                  <div>
                                    <span className="text-slate-600">Temp: </span>
                                    <span className="font-bold text-slate-900">
                                      {Number(vitals.temperature).toFixed(1)} °C
                                    </span>
                                  </div>
                                )}
                                {vitals.oxygenSaturation !== undefined && (
                                  <div>
                                    <span className="text-slate-600">SpO2: </span>
                                    <span className="font-bold text-slate-900">
                                      {vitals.oxygenSaturation}%
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {record.notes && (
                              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-slate-700 leading-relaxed whitespace-pre-line">
                                <p className="font-bold text-slate-900 mb-1">Clinical Notes</p>
                                <p>{record.notes}</p>
                              </div>
                            )}

                            {record.prescriptions && record.prescriptions.length > 0 && (
                              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                                <table className="w-full text-xs">
                                  <thead className="bg-violet-50/70 text-violet-950 border-b border-slate-200">
                                    <tr>
                                      <th className="py-2 px-3 text-left font-bold">Medication</th>
                                      <th className="py-2 px-3 text-left font-bold">Dosage & Regimen</th>
                                      <th className="py-2 px-3 text-left font-bold">Instructions</th>
                                      <th className="py-2 px-3 text-left font-bold">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {record.prescriptions.map((rx, idx) => (
                                      <tr key={rx.id || `${record.id}-rx-${idx}`}>
                                        <td className="py-2 px-3 font-bold text-slate-900">
                                          {rx.medicationName}
                                        </td>
                                        <td className="py-2 px-3 text-slate-700">
                                          {rx.dosage} • {rx.frequency} ({rx.duration || '—'})
                                        </td>
                                        <td className="py-2 px-3 text-slate-600">
                                          {rx.instructions || '—'}
                                        </td>
                                        <td className="py-2 px-3">
                                          <StatusBadge
                                            tone={rx.isActive !== false ? 'success' : 'neutral'}
                                            label={rx.isActive !== false ? 'Active' : t.dispensedStatus}
                                          />
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {record.labReports && record.labReports.length > 0 && (
                              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                                <table className="w-full text-xs">
                                  <thead className="bg-indigo-50/70 text-indigo-950 border-b border-slate-200">
                                    <tr>
                                      <th className="py-2 px-3 text-left font-bold">Test</th>
                                      <th className="py-2 px-3 text-left font-bold">Result</th>
                                      <th className="py-2 px-3 text-left font-bold">Reference Range</th>
                                      <th className="py-2 px-3 text-left font-bold">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {record.labReports.map((lab, idx) => {
                                      const pending = isPendingLabValue(lab.result)
                                      return (
                                        <tr
                                          key={lab.id || `${record.id}-lab-${idx}`}
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
                                            {pending ? (
                                              <StatusBadge tone="warning" label="Pending" />
                                            ) : lab.isAbnormal ? (
                                              <StatusBadge tone="critical" label="Abnormal" />
                                            ) : (
                                              <StatusBadge tone="success" label="Normal" />
                                            )}
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {record.followUpDate && (
                              <p className="text-xs text-indigo-800 font-bold tabular-nums">
                                Scheduled Follow-up: {formatDate(record.followUpDate)}
                              </p>
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
        </>
      )}
    </div>
  )
}
