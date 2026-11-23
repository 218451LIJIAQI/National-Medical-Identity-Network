import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { centralApi, type AuditLogDto } from '@/lib/api'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { formatIC, formatRelativeTime, maskIcNumber } from '@/lib/utils'
import {
  Building2, Users, Activity, Loader2, Shield, MapPin,
  Search, Database, AlertTriangle, Phone, Mail, X, Zap,
} from 'lucide-react'

interface HospitalItem {
  id: string
  name: string
  shortName: string
  city: string
  state: string
  address: string
  phone: string
  email: string
  isActive: boolean
}

export default function CentralAdminDashboard() {
  const [stats, setStats] = useState({
    totalPatients: 0,
    activeHospitals: 0,
    todayQueries: 0,
    queryChangePercent: 0,
    avgResponseTime: 0,
  })
  const [hospitals, setHospitals] = useState<HospitalItem[]>([])
  const [recentLogs, setRecentLogs] = useState<AuditLogDto[]>([])
  const [loading, setLoading] = useState(true)

  const [searchIC, setSearchIC] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [searchResult, setSearchResult] = useState<Awaited<ReturnType<typeof centralApi.searchPatientIndex>>['data'] | null>(null)
  const [selectedHospital, setSelectedHospital] = useState<HospitalItem | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, hospitalsRes, logsRes] = await Promise.all([
          centralApi.getStats(),
          centralApi.getHospitals(),
          centralApi.getAuditLogs({ limit: 15 }),
        ])
        if (statsRes.success && statsRes.data) {
          setStats(statsRes.data)
        }
        if (hospitalsRes.success && hospitalsRes.data) {
          setHospitals(hospitalsRes.data)
        }
        if (logsRes.success && logsRes.data) {
          setRecentLogs(logsRes.data)
        }
      } finally {
        setLoading(false)
      }
    }
    void loadData()
  }, [])

  const handleIndexSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const formatted = formatIC(searchIC)
    if (!formatted) return

    setSearching(true)
    setSearchError('')
    setSearchResult(null)
    try {
      const res = await centralApi.searchPatientIndex(formatted)
      if (!res.success || !res.data) {
        setSearchError(res.error || 'No patient index found for that IC number.')
        return
      }
      setSearchResult(res.data)
    } finally {
      setSearching(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-7 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <Badge className="bg-blue-500/20 text-blue-200 border-blue-400/30 mb-3">
            <Shield className="w-3.5 h-3.5 mr-1.5" />
            Ministry of Health National Hub
          </Badge>
          <h1 className="text-3xl font-bold">Central Identity &amp; Federation Command</h1>
          <p className="text-blue-200 text-sm mt-1">
            Zero clinical payload storage &middot; Federated index routing &amp; national audit oversight
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link to="/admin/patient-index">
            <Button variant="secondary" className="rounded-xl gap-2">
              <Database className="w-4 h-4" />
              Patient Index
            </Button>
          </Link>
          <Link to="/central/audit">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-2">
              <Activity className="w-4 h-4" />
              National Audit Logs
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Indexed Citizens', value: stats.totalPatients, sub: 'Unique MyKad identities', icon: Users, wrap: 'bg-blue-100 text-blue-600' },
          { label: 'Connected Hospitals', value: stats.activeHospitals, sub: 'Active regional nodes', icon: Building2, wrap: 'bg-emerald-100 text-emerald-600' },
          { label: "Today's Queries", value: stats.todayQueries, sub: `${stats.queryChangePercent >= 0 ? '+' : ''}${stats.queryChangePercent}% vs yesterday`, icon: Activity, wrap: 'bg-violet-100 text-violet-600' },
          { label: 'Hub Query Latency', value: `${stats.avgResponseTime}ms`, sub: 'Deterministic DB probe', icon: Zap, wrap: 'bg-amber-100 text-amber-600' },
        ].map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.label} className="border-slate-200/80">
              <CardContent className="p-5">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${item.wrap}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                <p className="text-sm font-medium text-gray-700">{item.label}</p>
                <p className="text-xs text-gray-400">{item.sub}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border-slate-200/80">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            National Patient Index Lookup
          </h2>
          <form onSubmit={handleIndexSearch} className="flex flex-col sm:flex-row gap-3">
            <Input
              value={searchIC}
              onChange={(e) => setSearchIC(e.target.value)}
              placeholder="Enter MyKad IC Number (e.g. 880101-14-5678)"
              className="font-mono flex-1"
            />
            <Button type="submit" disabled={searching || !searchIC.trim()} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search Index'}
            </Button>
          </form>

          {searchError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{searchError}</span>
            </div>
          )}

          {searchResult && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-gray-900">
                    {searchResult.patient?.fullName || 'Indexed Citizen'}
                  </p>
                  <p className="text-xs font-mono text-gray-500">IC: {searchResult.icNumber}</p>
                </div>
                <Badge variant="info">
                  {searchResult.totalRecords} record(s) across {searchResult.totalHospitals} hospital(s)
                </Badge>
              </div>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                {searchResult.hospitals.map((h) => {
                  const theme = getHospitalTheme(h.hospitalId)
                  return (
                    <div key={h.hospitalId} className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-gray-900">{h.hospitalName}</p>
                        <p className="text-[11px] text-gray-500">{h.city}</p>
                      </div>
                      <Badge className={theme.badgeClass}>{h.recordCount} recs</Badge>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-5 gap-6">
        <Card className="border-slate-200/80 lg:col-span-3">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Connected Hospital Nodes</h2>
            <div className="space-y-2.5">
              {hospitals.map((hospital) => {
                const theme = getHospitalTheme(hospital.id)
                return (
                  <button
                    key={hospital.id}
                    type="button"
                    onClick={() => setSelectedHospital(hospital)}
                    className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 hover:border-blue-300 hover:bg-slate-50/70 text-left transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0"
                        style={{ backgroundColor: theme.primaryColor }}
                      >
                        {theme.shortName}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{hospital.name}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {hospital.city}, {hospital.state}
                        </p>
                      </div>
                    </div>
                    <Badge variant={hospital.isActive ? 'success' : 'secondary'}>
                      {hospital.isActive ? 'Online' : 'Offline'}
                    </Badge>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 lg:col-span-2">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Live Federation Stream</h2>
              <Link to="/central/audit" className="text-xs font-semibold text-blue-600 hover:underline">
                Full Log
              </Link>
            </div>
            <div className="space-y-2.5">
              {recentLogs.slice(0, 6).map((log) => (
                <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900 uppercase">{log.action.replace('_', ' ')}</span>
                    <span className="text-gray-400">{formatRelativeTime(log.timestamp)}</span>
                  </div>
                  <p className="text-gray-600 truncate">
                    {log.hospitalName || 'Central Hub'} &middot; {maskIcNumber(log.targetIcNumber)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedHospital && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedHospital.name}</h3>
                <p className="text-xs text-gray-500">{selectedHospital.city}, {selectedHospital.state}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHospital(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p>{selectedHospital.address}</p>
              <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /> {selectedHospital.phone}</p>
              <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" /> {selectedHospital.email}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
