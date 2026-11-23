import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth'
import { centralApi } from '@/lib/api'
import { formatDate, formatTimeAgo, formatActorDisplayName } from '@/lib/utils'
import {
  User, Heart, FileText, Building2,
  Activity, AlertTriangle, Shield, ArrowRight,
  CreditCard, Pill, Calendar
} from 'lucide-react'
import { motion } from 'framer-motion'

interface PatientData {
  hospitalsCount: number
  recordsCount: number
  activeMedicationsCount: number
  lastVisit: string
  allergies: string[]
  bloodType: string
  fullName: string
}

interface AccessLog {
  id: string
  timestamp: string
  action: string
  actorId: string
  actorName: string
  actorType: string
  actorHospitalId?: string
  hospitalName: string
  details: string
  success: boolean
}

export default function PatientDashboard() {
  const { user } = useAuthStore()
  const [patientData, setPatientData] = useState<PatientData>({
    hospitalsCount: 0,
    recordsCount: 0,
    activeMedicationsCount: 0,
    lastVisit: '-',
    allergies: [],
    bloodType: '',
    fullName: '',
  })
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([])
  const [loading, setLoading] = useState(true)
  const [accessLogsLoading, setAccessLogsLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function loadPatientData() {
      if (!user?.icNumber) return
      try {
        const [queryRes, patientRes] = await Promise.all([
          centralApi.queryPatient(user.icNumber),
          centralApi.getPatient(user.icNumber),
        ])
        if (!active) return

        let hospitalsCount = 0
        let recordsCount = 0
        let activeMedicationsCount = 0
        let latestVisitIso = ''

        if (queryRes.success && queryRes.data) {
          const hospitalsWithRecords = queryRes.data.hospitals.filter((h) => h.recordCount > 0)
          hospitalsCount = hospitalsWithRecords.length
          recordsCount = queryRes.data.totalRecords

          const medKeys = new Set<string>()
          queryRes.data.hospitals.forEach((h) => {
            h.records?.forEach((rec) => {
              if (rec.visitDate && (!latestVisitIso || rec.visitDate > latestVisitIso)) {
                latestVisitIso = rec.visitDate
              }
              rec.prescriptions?.forEach((rx) => {
                if (rx.isActive) {
                  medKeys.add(`${rx.medicationName.toLowerCase()}|${rx.dosage.toLowerCase()}`)
                }
              })
            })
          })
          activeMedicationsCount = medKeys.size
        }

        const p = patientRes.success ? patientRes.data?.patient : null
        setPatientData({
          hospitalsCount,
          recordsCount,
          activeMedicationsCount,
          lastVisit: latestVisitIso ? formatDate(latestVisitIso) : '-',
          allergies: p?.allergies || [],
          bloodType: p?.bloodType || '',
          fullName: p?.fullName || '',
        })
      } catch (error) {
        console.error('Failed to load patient data:', error)
      } finally {
        if (active) setLoading(false)
      }
    }
    loadPatientData()
    return () => {
      active = false
    }
  }, [user?.icNumber])

  useEffect(() => {
    let active = true
    async function loadAccessLogs() {
      try {
        const response = await centralApi.getMyAccessLogs(10)
        if (active && response.success && response.data) {
          setAccessLogs(response.data)
        }
      } catch (error) {
        console.error('Failed to load access logs:', error)
      } finally {
        if (active) setAccessLogsLoading(false)
      }
    }
    loadAccessLogs()
    return () => {
      active = false
    }
  }, [])

  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 p-8 text-white shadow-2xl shadow-emerald-500/25">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
          <div className="relative w-24 h-24 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-xl">
            <User className="w-12 h-12 drop-shadow-lg" />
          </div>

          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2 drop-shadow-lg">
              {patientData.fullName || user?.fullName || 'Patient'}
            </h1>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/20">
                <CreditCard className="w-4 h-4" />
                <span className="font-mono text-sm">{user?.icNumber || 'XXXXXX-XX-XXXX'}</span>
              </div>
              {patientData.bloodType && (
                <Badge className="bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 border border-white/30 px-4 py-2 text-sm">
                  <Heart className="w-4 h-4 mr-2 text-red-300" />
                  Blood Type: {patientData.bloodType}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <Link to="/patient/records">
              <Button variant="outline" className="bg-white text-emerald-600 hover:bg-emerald-50 border-emerald-200 gap-2 shadow-xl shadow-black/10 h-12 px-6 rounded-xl font-semibold">
                <FileText className="w-5 h-5" />
                My Records
              </Button>
            </Link>
            <Link to="/patient/privacy">
              <Button variant="ghost" className="border border-white/30 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 gap-2 h-12 px-6 rounded-xl font-semibold">
                <Shield className="w-5 h-5" />
                Privacy
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {patientData.allergies.length > 0 && (
        <Card className="border-0 shadow-lg bg-gradient-to-r from-red-50 to-orange-50 overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-stretch">
              <div className="w-2 bg-gradient-to-b from-red-500 to-orange-500" />
              <div className="flex-1 p-5">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-100 rounded-xl">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-red-900">Allergies on File</p>
                      <p className="text-red-700 text-sm mt-1">
                        Shared automatically with authorized clinicians during consultations
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {patientData.allergies.map((allergy) => (
                      <Badge key={allergy} variant="destructive" className="px-3 py-1">
                        {allergy}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Hospitals Visited',
            value: loading ? '—' : patientData.hospitalsCount,
            icon: Building2,
            gradient: 'from-blue-500 to-blue-600',
            bgLight: 'bg-blue-50',
          },
          {
            label: 'Medical Records',
            value: loading ? '—' : patientData.recordsCount,
            icon: FileText,
            gradient: 'from-emerald-500 to-emerald-600',
            bgLight: 'bg-emerald-50',
          },
          {
            label: 'Active Medications',
            value: loading ? '—' : patientData.activeMedicationsCount,
            icon: Pill,
            gradient: 'from-violet-500 to-violet-600',
            bgLight: 'bg-violet-50',
          },
          {
            label: 'Last Visit',
            value: loading ? '—' : patientData.lastVisit,
            icon: Calendar,
            gradient: 'from-amber-500 to-amber-600',
            bgLight: 'bg-amber-50',
          },
        ].map((stat) => (
          <Card key={stat.label} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className={`h-1 bg-gradient-to-r ${stat.gradient}`} />
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`p-3 ${stat.bgLight} rounded-xl`}>
                  <stat.icon className="w-6 h-6 text-gray-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Link to="/patient/records">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg">
                    <FileText className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">
                      View My Medical Records
                    </h3>
                    <p className="text-gray-500 text-sm mt-1">
                      Inspect diagnoses, prescriptions, vital signs, and lab reports across hospitals
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/patient/privacy">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl shadow-lg">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 group-hover:text-emerald-600 transition-colors">
                      Privacy & Security Settings
                    </h3>
                    <p className="text-gray-500 text-sm mt-1">
                      Grant or revoke hospital access and export your medical summary
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      <Card className="border-0 shadow-lg">
        <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white">
          <h2 className="text-lg font-semibold text-gray-900">Recent Access to Your Records</h2>
          <p className="text-sm text-gray-500">Real-time audit log of clinicians and emergency responders querying your IC</p>
        </div>
        <CardContent className="p-0">
          <div className="divide-y">
            {accessLogsLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                <p className="text-gray-500 mt-2">Loading access logs...</p>
              </div>
            ) : accessLogs.length === 0 ? (
              <div className="p-8 text-center">
                <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No recent access to your records</p>
                <p className="text-sm text-gray-400 mt-1">When healthcare providers view your records, it will appear here</p>
              </div>
            ) : (
              accessLogs.map((log) => {
                const avatar = log.actorType === 'doctor' ? '👨‍⚕️' : log.actorType === 'patient' ? '👤' : '🏥'
                const displayName = formatActorDisplayName(log.actorName, log.actorId, log.actorType)

                return (
                  <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center text-2xl">
                        {avatar}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-gray-900">{displayName}</p>
                          <Badge variant="outline" className="text-xs">{log.hospitalName}</Badge>
                        </div>
                        <p className="text-sm text-gray-500">{log.details || 'Viewed medical records'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">{formatTimeAgo(log.timestamp)}</p>
                        <div className="flex items-center gap-1 justify-end mt-1">
                          <Activity className={`w-3 h-3 ${log.success ? 'text-emerald-500' : 'text-red-500'}`} />
                          <span className={`text-xs font-medium ${log.success ? 'text-emerald-600' : 'text-red-600'}`}>
                            {log.success ? 'Authorized' : 'Blocked'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
