import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { centralApi } from '@/lib/api'
import {
  Database, Search, Loader2, Users, Building2,
  TrendingUp, RefreshCw, FileText
} from 'lucide-react'
import { motion } from 'framer-motion'

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

const hospitalColors: Record<string, string> = {
  'hospital-kl': '#3B82F6',
  'hospital-penang': '#10B981',
  'hospital-jb': '#F59E0B',
  'hospital-sarawak': '#8B5CF6',
  'hospital-sabah': '#EF4444',
}

export default function PatientIndexPage() {
  const [patientIndexes, setPatientIndexes] = useState<PatientIndex[]>([])
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const loadData = async () => {
    try {
      const [indexesRes, hospitalsRes] = await Promise.all([
        centralApi.getAllPatientIndexes(),
        centralApi.getHospitals()
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
  const filteredIndexes = patientIndexes.filter(idx =>
    idx.icNumber.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const multiHospitalPatients = patientIndexes.filter(idx => idx.hospitals.length > 1).length
  const avgHospitalsPerPatient = patientIndexes.length > 0
    ? Math.round(patientIndexes.reduce((sum, idx) => sum + idx.hospitals.length, 0) / patientIndexes.length * 10) / 10
    : 0
  const hospitalCounts = hospitals.map(h => ({
    ...h,
    count: patientIndexes.filter(idx => idx.hospitals.includes(h.id)).length
  })).sort((a, b) => b.count - a.count)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-violet-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading patient indexes...</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
            <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <motion.div
            className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg shadow-violet-500/30"
            whileHover={{ scale: 1.05, rotate: 5 }}
          >
            <Database className="w-8 h-8 text-white" />
          </motion.div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Patient Index</h1>
            <p className="text-gray-500">Browse all patients registered across the network</p>
          </div>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            variant="outline"
            className="gap-2 h-11 px-5 rounded-xl"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </motion.div>
      </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Patients', value: patientIndexes.length, icon: Users, color: 'violet' },
          { label: 'Connected Hospitals', value: hospitals.length, icon: Building2, color: 'blue' },
          { label: 'Multi-Hospital Patients', value: multiHospitalPatients, icon: TrendingUp, color: 'emerald' },
          { label: 'Avg Hospitals/Patient', value: avgHospitalsPerPatient, icon: FileText, color: 'amber' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="border-0 shadow-lg">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                  </div>
                  <div className={`p-3 bg-${stat.color}-100 rounded-xl`}>
                    <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

            <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-0 shadow-lg">
          <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-cyan-50">
            <h2 className="text-lg font-semibold text-gray-900">Patient Distribution by Hospital</h2>
            <p className="text-sm text-gray-500">Number of patients indexed at each hospital</p>
          </div>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hospitalCounts.map((hospital) => {
                const color = hospitalColors[hospital.id] || '#6B7280'
                const percentage = patientIndexes.length > 0
                  ? Math.round(hospital.count / patientIndexes.length * 100)
                  : 0
                return (
                  <div
                    key={hospital.id}
                    className="p-4 rounded-xl border-2"
                    style={{ borderColor: color + '40' }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: color + '20' }}
                      >
                        <Building2 className="w-5 h-5" style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{hospital.name}</h3>
                        <p className="text-xs text-gray-500">{hospital.city}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold" style={{ color }}>{hospital.count}</span>
                      <Badge variant="outline" style={{ borderColor: color, color }}>
                        {percentage}%
                      </Badge>
                    </div>
                    <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

            <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-0 shadow-lg">
          <div className="p-6 border-b bg-gradient-to-r from-violet-50 to-purple-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">All Patient Indexes</h2>
                <p className="text-sm text-gray-500">Click on a patient to view their hospital distribution</p>
              </div>
              <Badge variant="secondary" className="rounded-full">
                {filteredIndexes.length} patients
              </Badge>
            </div>
          </div>
          <CardContent className="p-6">
                        <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search by IC number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 rounded-xl"
                />
              </div>
            </div>

                        <div className="border rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b grid grid-cols-12 gap-4 text-sm font-medium text-gray-600">
                <div className="col-span-4">IC Number</div>
                <div className="col-span-5">Hospitals</div>
                <div className="col-span-3">Last Updated</div>
              </div>
              <div className="max-h-[500px] overflow-y-auto">
                {filteredIndexes.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    <Database className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No patients found</p>
                  </div>
                ) : filteredIndexes.slice(0, 100).map((idx, i) => (
                  <motion.div
                    key={idx.icNumber}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className={`px-4 py-3 grid grid-cols-12 gap-4 items-center text-sm ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-violet-50 transition-colors`}
                  >
                    <div className="col-span-4 font-mono font-medium text-gray-900">
                      {idx.icNumber}
                    </div>
                    <div className="col-span-5 flex flex-wrap gap-1">
                      {idx.hospitals.map(hId => {
                        const h = hospitals.find(hosp => hosp.id === hId)
                        const color = hospitalColors[hId] || '#6B7280'
                        return (
                          <Badge
                            key={hId}
                            variant="outline"
                            className="text-xs"
                            style={{ borderColor: color, color }}
                          >
                            {h?.shortName || hId}
                          </Badge>
                        )
                      })}
                    </div>
                    <div className="col-span-3 text-gray-500">
                      {new Date(idx.lastUpdated).toLocaleDateString()}
                    </div>
                  </motion.div>
                ))}
              </div>
              {filteredIndexes.length > 100 && (
                <div className="px-4 py-3 bg-gray-50 border-t text-center text-sm text-gray-500">
                  Showing 100 of {filteredIndexes.length} patients. Use search to filter.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
