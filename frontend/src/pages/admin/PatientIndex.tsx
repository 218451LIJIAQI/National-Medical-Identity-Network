import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { centralApi } from '@/lib/api'
import { exportToCsv } from '@/lib/workstation-storage'
import { getHospitalColor, formatDate } from '@/lib/utils'
import { getHospitalTheme } from '@/lib/hospital-themes'
import {
  Database,
  Search,
  Building2,
  Users,
  Calendar,
  RefreshCw,
  CheckCircle2,
  Network,
  ArrowUpDown,
  Download,
  X,
  AlertCircle,
  FileText,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface PatientIndexItem {
  icNumber: string
  hospitals: string[]
  lastUpdated: string
}

interface PatientIndexDetail {
  icNumber: string
  patient: {
    fullName: string
    icNumber: string
    dateOfBirth: string
    gender: string
    bloodType: string
    allergies: string[]
    chronicConditions: string[]
  } | null
  hospitals: Array<{
    hospitalId: string
    hospitalName: string
    shortName: string
    city: string
    recordCount: number
    isActive: boolean
  }>
  totalHospitals: number
  totalRecords: number
  lastUpdated: string
}

export default function PatientIndex() {
  const [indexes, setIndexes] = useState<PatientIndexItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'ic' | 'hospitals' | 'updated'>('updated')
  const [sortAsc, setSortAsc] = useState(false)
  const [selectedDetail, setSelectedDetail] = useState<PatientIndexDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const indexRes = await centralApi.getAllPatientIndexes()
      if (indexRes.success && indexRes.data) {
        setIndexes(indexRes.data)
      } else {
        setLoadError(indexRes.error || 'Failed to load national patient index.')
      }
    } catch {
      setLoadError('Network error while loading national patient index.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const openIndexDetail = async (icNumber: string) => {
    setDetailLoading(true)
    setDetailError(null)
    setSelectedDetail(null)
    try {
      const res = await centralApi.searchPatientIndex(icNumber)
      if (res.success && res.data) {
        setSelectedDetail(res.data)
      } else {
        setDetailError(res.error || `Failed to inspect index pointer for ${icNumber}`)
      }
    } catch {
      setDetailError('Network error while querying index distribution.')
    } finally {
      setDetailLoading(false)
    }
  }

  const getHospitalName = (id: string) => getHospitalTheme(id).shortName || id

  const filteredIndexes = indexes
    .filter((idx) => {
      const q = searchQuery.trim().toLowerCase()
      return (
        !q ||
        idx.icNumber.toLowerCase().includes(q) ||
        idx.hospitals.some(
          (h) =>
            getHospitalName(h).toLowerCase().includes(q) ||
            getHospitalTheme(h).name.toLowerCase().includes(q)
        )
      )
    })
    .sort((a, b) => {
      let cmp = 0
      if (sortBy === 'ic') cmp = a.icNumber.localeCompare(b.icNumber)
      else if (sortBy === 'hospitals') cmp = a.hospitals.length - b.hospitals.length
      else cmp = new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime()
      return sortAsc ? cmp : -cmp
    })

  const toggleSort = (field: 'ic' | 'hospitals' | 'updated') => {
    if (sortBy === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortBy(field)
      setSortAsc(false)
    }
  }

  const handleExportCsv = () => {
    exportToCsv(
      `medlink-patient-index-${new Date().toISOString().slice(0, 10)}.csv`,
      ['MyKad IC Number', 'Indexed Hospital Count', 'Hospital Short Codes', 'Last Updated'],
      filteredIndexes.map((idx) => [
        idx.icNumber,
        idx.hospitals.length,
        idx.hospitals.map(getHospitalName).join('; '),
        new Date(idx.lastUpdated).toISOString(),
      ])
    )
  }

  const totalPatients = indexes.length
  const multiHospitalPatients = indexes.filter((i) => i.hospitals.length > 1).length
  const avgHospitals =
    totalPatients > 0
      ? (indexes.reduce((acc, i) => acc + i.hospitals.length, 0) / totalPatients).toFixed(1)
      : '0'

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white">
              <Database className="h-6 w-6" />
            </div>
            Patient Index Directory
          </h1>
          <p className="text-gray-500 mt-1">
            Central pointer registry mapping MyKad identities to participating hospital databases (zero clinical text stored centrally)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void loadData()} className="gap-2" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={handleExportCsv}
            disabled={filteredIndexes.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between gap-3 text-red-700 text-sm">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {loadError}
          </span>
          <Button size="sm" variant="outline" onClick={() => void loadData()}>
            Retry
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Indexed Patients</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{loading ? '-' : totalPatients}</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-teal-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600">Multi-Hospital Patients</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{loading ? '-' : multiHospitalPatients}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {totalPatients > 0 ? `${Math.round((multiHospitalPatients / totalPatients) * 100)}% of total` : ''}
                </p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl">
                <Network className="h-8 w-8 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Avg Hospitals / Patient</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{loading ? '-' : avgHospitals}</p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-xl">
                <Building2 className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-xl">
        <CardHeader className="border-b bg-gray-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Index Records</CardTitle>
              <CardDescription>
                Click any patient row to inspect real-time record distribution across hospital nodes
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by IC or hospital..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-100/80 text-xs font-semibold text-gray-600 uppercase tracking-wider border-b">
            <div className="col-span-4 flex items-center gap-1 cursor-pointer hover:text-gray-900" onClick={() => toggleSort('ic')}>
              IC Number <ArrowUpDown className="h-3 w-3" />
            </div>
            <div className="col-span-5 flex items-center gap-1 cursor-pointer hover:text-gray-900" onClick={() => toggleSort('hospitals')}>
              Hospital Locations <ArrowUpDown className="h-3 w-3" />
            </div>
            <div className="col-span-3 flex items-center gap-1 cursor-pointer hover:text-gray-900" onClick={() => toggleSort('updated')}>
              Last Updated <ArrowUpDown className="h-3 w-3" />
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                  <div className="col-span-4"><Skeleton className="h-5 w-36" /></div>
                  <div className="col-span-5 flex gap-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <div className="col-span-3"><Skeleton className="h-4 w-24" /></div>
                </div>
              ))
            ) : filteredIndexes.length === 0 ? (
              <div className="py-12 text-center">
                <Database className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No patient indexes found</p>
              </div>
            ) : (
              <AnimatePresence>
                {filteredIndexes.map((idx, index) => (
                  <motion.div
                    key={idx.icNumber}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.02, 0.25) }}
                    onClick={() => void openIndexDetail(idx.icNumber)}
                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-blue-50/50 transition-colors cursor-pointer"
                  >
                    <div className="col-span-4 flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      </div>
                      <span className="font-mono font-medium text-gray-900">{idx.icNumber}</span>
                    </div>

                    <div className="col-span-5 flex flex-wrap gap-1.5">
                      {idx.hospitals.map((hospitalId) => {
                        const color = getHospitalColor(hospitalId)
                        return (
                          <Badge
                            key={hospitalId}
                            variant="outline"
                            className="font-medium text-xs"
                            style={{
                              borderColor: color,
                              backgroundColor: `${color}15`,
                              color,
                            }}
                          >
                            <Building2 className="h-3 w-3 mr-1" />
                            {getHospitalName(hospitalId)}
                          </Badge>
                        )
                      })}
                    </div>

                    <div className="col-span-3 flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {formatDate(idx.lastUpdated)}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </CardContent>
      </Card>

      {(detailLoading || detailError || selectedDetail) && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => {
            setSelectedDetail(null)
            setDetailError(null)
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Hospital Pointer Distribution</h2>
                <p className="text-sm text-blue-100 font-mono">
                  {selectedDetail?.icNumber || 'Loading index node...'}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedDetail(null)
                  setDetailError(null)
                }}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {detailLoading && (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              )}

              {detailError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {detailError}
                </div>
              )}

              {selectedDetail && (
                <>
                  {selectedDetail.patient && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-xs text-slate-500 block">Patient Name</span>
                        <span className="font-semibold text-slate-900">{selectedDetail.patient.fullName}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block">Blood Type & Gender</span>
                        <span className="font-semibold text-slate-900 capitalize">
                          {selectedDetail.patient.bloodType} • {selectedDetail.patient.gender}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block">Total Participating Sites</span>
                        <span className="font-semibold text-blue-700">{selectedDetail.totalHospitals} hospitals</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block">Total Federated Encounters</span>
                        <span className="font-semibold text-emerald-700">{selectedDetail.totalRecords} records</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Hospital Nodes Holding Clinical History
                    </p>
                    {selectedDetail.hospitals.map((h) => {
                      const color = getHospitalColor(h.hospitalId)
                      return (
                        <div
                          key={h.hospitalId}
                          className="p-3.5 rounded-xl border border-gray-200 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            <div>
                              <p className="font-semibold text-gray-900">{h.hospitalName}</p>
                              <p className="text-xs text-gray-500">{h.city} • {h.shortName}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="gap-1">
                              <FileText className="h-3 w-3" />
                              {h.recordCount} {h.recordCount === 1 ? 'record' : 'records'}
                            </Badge>
                            <Badge className={h.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                              {h.isActive ? 'Online' : 'Offline'}
                            </Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
