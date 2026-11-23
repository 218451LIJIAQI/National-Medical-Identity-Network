import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { centralApi } from '@/lib/api'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { formatDate } from '@/lib/utils'
import {
  Database, Search, Loader2, Users, Building2, TrendingUp, RefreshCw,
} from 'lucide-react'

interface PatientIndexItem {
  icNumber: string
  hospitals: string[]
  lastUpdated: string
}

interface HospitalSummary {
  id: string
  name: string
  shortName: string
  city: string
}

export default function PatientIndexPage() {
  const [patientIndexes, setPatientIndexes] = useState<PatientIndexItem[]>([])
  const [hospitals, setHospitals] = useState<HospitalSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

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
        setHospitals(hospitalsRes.data)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
      </div>
    )
  }

  const filteredIndexes = patientIndexes.filter((idx) =>
    idx.icNumber.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const multiHospitalPatients = patientIndexes.filter((idx) => idx.hospitals.length > 1).length
  const avgHospitalsPerPatient =
    patientIndexes.length > 0
      ? Math.round((patientIndexes.reduce((sum, idx) => sum + idx.hospitals.length, 0) / patientIndexes.length) * 10) / 10
      : 0

  const statCards = [
    { label: 'Total Indexed ICs', value: patientIndexes.length, icon: Users, wrap: 'bg-violet-100 text-violet-600' },
    { label: 'Multi-Hospital Patients', value: multiHospitalPatients, icon: Building2, wrap: 'bg-blue-100 text-blue-600' },
    { label: 'Avg Hospitals / Citizen', value: avgHospitalsPerPatient, icon: TrendingUp, wrap: 'bg-emerald-100 text-emerald-600' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-gradient-to-br from-violet-600 to-purple-600 rounded-2xl shadow-lg">
            <Database className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">National Patient Index</h1>
            <p className="text-gray-500 text-sm">Pointer registry mapping MyKad ICs to participating hospital nodes</p>
          </div>
        </div>
        <Button
          variant="outline"
          className="gap-2 rounded-xl"
          disabled={refreshing}
          onClick={() => {
            setRefreshing(true)
            void loadData()
          }}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="border-slate-200/80">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.wrap}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border-slate-200/80">
        <CardContent className="p-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by MyKad IC number..."
              className="pl-10 font-mono"
            />
          </div>

          <div className="space-y-2.5">
            {filteredIndexes.map((entry) => (
              <div
                key={entry.icNumber}
                className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/70"
              >
                <div>
                  <p className="font-mono font-bold text-gray-900">{entry.icNumber}</p>
                  <p className="text-xs text-gray-500">Updated {formatDate(entry.lastUpdated)}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {entry.hospitals.map((hospId) => {
                    const theme = getHospitalTheme(hospId)
                    const hospName = hospitals.find((h) => h.id === hospId)?.shortName || theme.displayShortName
                    return (
                      <Badge key={hospId} className={theme.badgeClass}>
                        {hospName}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
