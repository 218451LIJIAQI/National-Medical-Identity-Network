import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { centralApi } from '@/lib/api'
import { downloadCsvFile, getHospitalColor } from '@/lib/utils'
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
  X,
  MapPin,
  AlertTriangle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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
  const [patientIndexes, setPatientIndexes] = useState<PatientIndex[]>([])
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [inspectingIc, setInspectingIc] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [indexDetail, setIndexDetail] = useState<Awaited<ReturnType<typeof centralApi.searchPatientIndex>>['data'] | null>(null)

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
    loadData()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  const handleInspectPatient = async (icNumber: string) => {
    setInspectingIc(icNumber)
    setDetailLoading(true)
    setIndexDetail(null)
    try {
      const res = await centralApi.searchPatientIndex(icNumber)
      if (res.success && res.data) {
        setIndexDetail(res.data)
      }
    } finally {
      setDetailLoading(false)
    }
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
        <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
      </div>
    )
  }

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg">
            <Database className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Patient Master Index</h1>
            <p className="text-gray-500 text-sm">National pointer directory mapping MyKad ICs to federated hospital nodes</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" className="gap-2 h-11 px-4 rounded-xl" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleExportCsv}
            className="gap-2 h-11 px-5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white"
          >
            <Download className="w-4 h-4" />
            Export Index CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Indexed Patients', value: patientIndexes.length, icon: Users, bgClass: 'bg-violet-100', iconClass: 'text-violet-600' },
          { label: 'Connected Hospitals', value: hospitals.length, icon: Building2, bgClass: 'bg-blue-100', iconClass: 'text-blue-600' },
          { label: 'Multi-Hospital Patients', value: multiHospitalPatients, icon: TrendingUp, bgClass: 'bg-emerald-100', iconClass: 'text-emerald-600' },
          { label: 'Avg Hospitals / Patient', value: avgHospitalsPerPatient, icon: FileText, bgClass: 'bg-amber-100', iconClass: 'text-amber-600' },
        ].map((stat) => (
          <Card key={stat.label} className="border-0 shadow-md">
            <CardContent className="pt-5 flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
              </div>
              <div className={`p-3 ${stat.bgClass} rounded-xl`}>
                <stat.icon className={`w-6 h-6 ${stat.iconClass}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-md">
        <div className="p-5 border-b bg-gradient-to-r from-blue-50 to-cyan-50">
          <h2 className="text-base font-bold text-gray-900">Patient Distribution by Hospital Node</h2>
        </div>
        <CardContent className="p-5 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hospitalCounts.map((hospital) => {
            const color = getHospitalColor(hospital.id)
            const percentage =
              patientIndexes.length > 0 ? Math.round((hospital.count / patientIndexes.length) * 100) : 0
            return (
              <div key={hospital.id} className="p-4 rounded-xl border-2" style={{ borderColor: `${color}40` }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
                    <Building2 className="w-5 h-5" style={{ color }} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{hospital.name}</h3>
                    <p className="text-xs text-gray-500">{hospital.city}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold" style={{ color }}>
                    {hospital.count}
                  </span>
                  <Badge variant="outline" style={{ borderColor: color, color }}>
                    {percentage}%
                  </Badge>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md">
        <div className="p-5 border-b bg-violet-50/70 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Master Patient Pointer Table</h2>
            <p className="text-xs text-gray-500">Click any row to inspect federated hospital distribution & record counts</p>
          </div>
          <Badge variant="secondary">{filteredIndexes.length} patients</Badge>
        </div>
        <CardContent className="p-5 space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Filter by MyKad IC number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 rounded-xl font-mono"
            />
          </div>

          <div className="border rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b grid grid-cols-12 gap-4 text-xs font-semibold uppercase text-gray-500">
              <div className="col-span-4">MyKad IC Number</div>
              <div className="col-span-5">Indexed Hospitals</div>
              <div className="col-span-3 text-right">Last Synced</div>
            </div>
            <div className="max-h-[480px] overflow-y-auto divide-y">
              {filteredIndexes.length === 0 ? (
                <div className="p-10 text-center text-gray-500 text-sm">No matching IC numbers found.</div>
              ) : (
                filteredIndexes.slice(0, 100).map((idx) => (
                  <button
                    key={idx.icNumber}
                    type="button"
                    onClick={() => handleInspectPatient(idx.icNumber)}
                    className="w-full text-left px-4 py-3 grid grid-cols-12 gap-4 items-center text-sm hover:bg-violet-50/80 transition-colors"
                  >
                    <div className="col-span-4 font-mono font-semibold text-gray-900">{idx.icNumber}</div>
                    <div className="col-span-5 flex flex-wrap gap-1.5">
                      {idx.hospitals.map((hId) => {
                        const h = hospitals.find((hosp) => hosp.id === hId)
                        const color = getHospitalColor(hId)
                        return (
                          <Badge key={hId} variant="outline" className="text-xs" style={{ borderColor: color, color }}>
                            {h?.shortName || hId}
                          </Badge>
                        )
                      })}
                    </div>
                    <div className="col-span-3 text-right text-xs text-gray-500">
                      {new Date(idx.lastUpdated).toLocaleDateString('en-MY')}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patient Index Distribution Modal */}
      <AnimatePresence>
        {inspectingIc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setInspectingIc(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">Federated Index Inspection</h3>
                  <p className="text-xs font-mono text-violet-100">{inspectingIc}</p>
                </div>
                <button type="button" onClick={() => setInspectingIc(null)} className="p-1 hover:bg-white/20 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {detailLoading ? (
                  <div className="py-8 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
                  </div>
                ) : indexDetail ? (
                  <>
                    {indexDetail.patient && (
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                        <p className="font-bold text-gray-900 text-base">{indexDetail.patient.fullName}</p>
                        <p className="text-xs text-gray-600 capitalize">
                          {indexDetail.patient.gender} • Blood Type: <strong>{indexDetail.patient.bloodType || 'Unknown'}</strong> • DOB: {indexDetail.patient.dateOfBirth}
                        </p>
                        {indexDetail.patient.allergies?.length > 0 && (
                          <p className="text-xs text-red-700 flex items-center gap-1 font-medium pt-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Allergies: {indexDetail.patient.allergies.join(', ')}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase text-gray-500">
                        Indexed Hospital Nodes ({indexDetail.totalHospitals}) • Total Records: {indexDetail.totalRecords}
                      </p>
                      {indexDetail.hospitals.map((h) => (
                        <div key={h.hospitalId} className="p-3 rounded-xl border border-gray-200 flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{h.hospitalName}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {h.city}
                            </p>
                          </div>
                          <Badge variant="secondary">{h.recordCount} record(s)</Badge>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Unable to load index details.</p>
                )}

                <div className="flex justify-end pt-2">
                  <Button variant="outline" onClick={() => setInspectingIc(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
