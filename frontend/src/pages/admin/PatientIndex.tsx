import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ModalDialog, StatusBadge } from '@/components/ui/modal-dialog'
import { centralApi } from '@/lib/api'
import { useTranslation } from '@/lib/i18n'
import { downloadCsvFile, formatDate, formatIC, getHospitalColor } from '@/lib/utils'
import {
  Database,
  Search,
  Loader2,
  Users,
  Building2,
  TrendingUp,
  RefreshCw,
  FileText,
  Download,
  MapPin,
} from 'lucide-react'

interface PatientIndex {
  icNumber: string
  hospitals: string[]
  lastUpdated: string
}

interface Hospital {
  id: string
  name: string
  shortName: string
  city: string
}

export default function PatientIndexPage() {
  const { t } = useTranslation()
  const [patientIndexes, setPatientIndexes] = useState<PatientIndex[]>([])
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [inspectingIc, setInspectingIc] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [indexDetail, setIndexDetail] = useState<
    Awaited<ReturnType<typeof centralApi.searchPatientIndex>>['data'] | null
  >(null)

  const inspectReqSeq = useRef(0)

  const loadData = async () => {
    try {
      const [indexesRes, hospitalsRes] = await Promise.all([
        centralApi.getAllPatientIndexes(),
        centralApi.getHospitals(),
      ])

      if (indexesRes.success && indexesRes.data) {
        setPatientIndexes(indexesRes.data)
      }
      if (hospitalsRes.success && hospitalsRes.data) {
        setHospitals(hospitalsRes.data as unknown as Hospital[])
      }
    } catch (error) {
      console.error('Failed to load patient indexes:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    void loadData()
  }

  const handleInspectPatient = async (icNumber: string) => {
    const seq = ++inspectReqSeq.current
    setInspectingIc(icNumber)
    setDetailLoading(true)
    setIndexDetail(null)
    try {
      const res = await centralApi.searchPatientIndex(icNumber)
      if (seq !== inspectReqSeq.current) return
      if (res.success && res.data) {
        setIndexDetail(res.data)
      }
    } finally {
      if (seq === inspectReqSeq.current) {
        setDetailLoading(false)
      }
    }
  }

  const closeInspection = () => {
    inspectReqSeq.current++
    setInspectingIc(null)
    setDetailLoading(false)
  }

  const filteredIndexes = patientIndexes.filter((idx) =>
    idx.icNumber.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleExportCsv = () => {
    downloadCsvFile(
      `central-patient-index-${new Date().toISOString().split('T')[0]}.csv`,
      ['MyKad IC Number', 'Hospital Count', 'Connected Hospital IDs', 'Last Updated'],
      filteredIndexes.map((idx) => [
        idx.icNumber,
        idx.hospitals.length,
        idx.hospitals.join('; '),
        idx.lastUpdated,
      ])
    )
  }

  const multiHospitalPatients = patientIndexes.filter((idx) => idx.hospitals.length > 1).length
  const avgHospitalsPerPatient =
    patientIndexes.length > 0
      ? Math.round(
          (patientIndexes.reduce((sum, idx) => sum + idx.hospitals.length, 0) /
            patientIndexes.length) *
            10
        ) / 10
      : 0

  const hospitalCounts = hospitals
    .map((h) => ({
      ...h,
      count: patientIndexes.filter((idx) => idx.hospitals.includes(h.id)).length,
    }))
    .sort((a, b) => b.count - a.count)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl shadow-sm text-white">
            <Database className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t.patientIndex}</h1>
            <p className="text-slate-600 text-xs">
              National pointer directory mapping MyKad ICs to federated hospital nodes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleExportCsv}
            className="bg-violet-700 hover:bg-violet-800 text-white gap-1.5"
          >
            <Download className="w-4 h-4" />
            {t.exportCsv}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: 'Indexed Patients',
            value: patientIndexes.length,
            icon: Users,
            bgClass: 'bg-violet-50',
            iconClass: 'text-violet-700',
          },
          {
            label: t.connectedHospitals,
            value: hospitals.length,
            icon: Building2,
            bgClass: 'bg-blue-50',
            iconClass: 'text-blue-700',
          },
          {
            label: 'Multi-Hospital Patients',
            value: multiHospitalPatients,
            icon: TrendingUp,
            bgClass: 'bg-emerald-50',
            iconClass: 'text-emerald-700',
          },
          {
            label: 'Avg Hospitals / Patient',
            value: avgHospitalsPerPatient,
            icon: FileText,
            bgClass: 'bg-amber-50',
            iconClass: 'text-amber-800',
          },
        ].map((stat) => (
          <Card key={stat.label} className="border border-slate-200 shadow-sm rounded-2xl">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-2xl font-extrabold text-slate-900 tabular-nums">{stat.value}</p>
                <p className="text-xs font-semibold text-slate-600 mt-1">{stat.label}</p>
              </div>
              <div className={`p-2.5 ${stat.bgClass} rounded-xl`}>
                <stat.icon className={`w-5 h-5 ${stat.iconClass}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border border-slate-200 shadow-sm rounded-2xl">
        <div className="p-4 px-5 border-b border-slate-100 bg-slate-50/70">
          <h2 className="text-sm font-bold text-slate-900">
            Patient Pointer Distribution by Hospital Node
          </h2>
        </div>
        <CardContent className="p-5 grid grid-cols-5 gap-3.5">
          {hospitalCounts.map((hospital) => {
            const color = getHospitalColor(hospital.id)
            const percentage =
              patientIndexes.length > 0
                ? Math.round((hospital.count / patientIndexes.length) * 100)
                : 0
            return (
              <div
                key={hospital.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-white"
                style={{ borderTopWidth: 4, borderTopColor: color }}
              >
                <h3 className="font-bold text-slate-900 text-xs truncate">{hospital.name}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{hospital.city}</p>
                <div className="flex items-center justify-between mt-3 tabular-nums">
                  <span className="text-xl font-extrabold text-slate-900">{hospital.count}</span>
                  <Badge variant="outline" className="text-[11px]">
                    {percentage}%
                  </Badge>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Master Patient Pointer Table</h2>
            <p className="text-xs text-slate-600">
              Click any row to inspect federated hospital distribution & record counts
            </p>
          </div>
          <Badge variant="secondary" className="tabular-nums">
            {filteredIndexes.length} patients
          </Badge>
        </div>
        <CardContent className="p-5 space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Filter by MyKad IC number…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 font-mono tabular-nums"
            />
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 grid grid-cols-12 gap-4 text-xs font-bold uppercase text-slate-600">
              <div className="col-span-4">MyKad IC Number</div>
              <div className="col-span-5">Indexed Hospitals</div>
              <div className="col-span-3 text-right">Last Synced</div>
            </div>
            <div className="max-h-[440px] overflow-y-auto divide-y divide-slate-100">
              {filteredIndexes.length === 0 ? (
                <div className="p-10 text-center text-slate-500 text-xs">
                  No matching IC numbers found.
                </div>
              ) : (
                filteredIndexes.slice(0, 100).map((idx) => (
                  <button
                    key={idx.icNumber}
                    type="button"
                    onClick={() => handleInspectPatient(idx.icNumber)}
                    className="w-full text-left px-4 py-3 grid grid-cols-12 gap-4 items-center text-xs hover:bg-violet-50/60 transition-colors"
                  >
                    <div className="col-span-4 font-mono font-bold text-slate-900 tabular-nums">
                      {formatIC(idx.icNumber)}
                    </div>
                    <div className="col-span-5 flex flex-wrap gap-1.5">
                      {idx.hospitals.map((hId) => {
                        const h = hospitals.find((hosp) => hosp.id === hId)
                        const color = getHospitalColor(hId)
                        return (
                          <Badge
                            key={hId}
                            variant="outline"
                            className="text-[11px]"
                            style={{ borderColor: color, color }}
                          >
                            {h?.shortName || hId}
                          </Badge>
                        )
                      })}
                    </div>
                    <div className="col-span-3 text-right text-slate-600 tabular-nums">
                      {formatDate(idx.lastUpdated)}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patient Index Distribution Modal */}
      <ModalDialog
        open={Boolean(inspectingIc)}
        onClose={closeInspection}
        title="Federated Index Inspection"
        description={inspectingIc ? `MyKad IC: ${formatIC(inspectingIc)}` : undefined}
        icon={
          <div className="p-2 rounded-xl bg-violet-100 text-violet-800 border border-violet-200">
            <Database className="w-5 h-5" />
          </div>
        }
        maxWidthClassName="max-w-lg"
        footer={
          <Button variant="outline" onClick={closeInspection}>
            Close
          </Button>
        }
      >
        {detailLoading ? (
          <div className="py-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
          </div>
        ) : indexDetail ? (
          <div className="space-y-4">
            {indexDetail.patient && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <p className="font-bold text-slate-900 text-base">{indexDetail.patient.fullName}</p>
                <p className="text-xs text-slate-600 capitalize tabular-nums">
                  {indexDetail.patient.gender} • Blood Type:{' '}
                  <strong>{indexDetail.patient.bloodType || 'Unknown'}</strong> • DOB:{' '}
                  {indexDetail.patient.dateOfBirth}
                </p>
                {indexDetail.patient.allergies?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {indexDetail.patient.allergies.map((alg) => (
                      <StatusBadge key={alg} tone="critical" label={`Allergy: ${alg}`} />
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase text-slate-600 tabular-nums">
                Indexed Hospital Nodes ({indexDetail.totalHospitals}) • Total Records:{' '}
                {indexDetail.totalRecords}
              </p>
              {indexDetail.hospitals.map((h) => (
                <div
                  key={h.hospitalId}
                  className="p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{h.hospitalName}</p>
                    <p className="text-xs text-slate-600 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {h.city}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      tone={h.isActive ? 'success' : 'critical'}
                      label={h.isActive ? 'Online' : 'Offline'}
                    />
                    <Badge variant="secondary" className="tabular-nums">
                      {h.recordCount} record(s)
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-600">Unable to load index details.</p>
        )}
      </ModalDialog>
    </div>
  )
}
