import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth'
import { centralApi } from '@/lib/api'
import { useTranslation } from '@/lib/i18n'
import { formatDate, formatTimeAgo, formatActorDisplayName } from '@/lib/utils'
import {
  User, Heart, FileText, Building2,
  Activity, AlertTriangle, Shield, ArrowRight,
  CreditCard, Pill, Calendar, ShieldAlert
} from 'lucide-react'
import { motion } from 'framer-motion'

interface PatientData {
  hospitalsCount: number
  recordsCount: number
  activeMedicationsCount: number
  lastVisit: string
  allergies: string[]
  chronicConditions: string[]
  bloodType: string
  fullName: string
  partialFailure: boolean
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
  const { t } = useTranslation()
  const [patientData, setPatientData] = useState<PatientData>({
    hospitalsCount: 0,
    recordsCount: 0,
    activeMedicationsCount: 0,
    lastVisit: '-',
    allergies: [],
    chronicConditions: [],
    bloodType: '',
    fullName: '',
    partialFailure: false,
  })
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([])
  const [loading, setLoading] = useState(true)
  const [accessLogsLoading, setAccessLogsLoading] = useState(true)

  useEffect(() => {
    async function loadPatientData() {
      if (!user?.icNumber) {
        setLoading(false)
        return
      }
      try {
        const [queryRes, patientRes] = await Promise.all([
          centralApi.queryPatient(user.icNumber),
          centralApi.getPatient(user.icNumber),
        ])

        let hospitalsCount = 0
        let recordsCount = 0
        let activeMedicationsCount = 0
        let lastVisit = '-'
        let partialFailure = false

        if (queryRes.success && queryRes.data) {
          const hospitalsWithRecords = queryRes.data.hospitals.filter((h) => h.recordCount > 0)
          hospitalsCount = hospitalsWithRecords.length
          recordsCount = queryRes.data.totalRecords
          partialFailure = Boolean(queryRes.data.partialFailure)

          const allVisitDates: string[] = []
          const activeMedicationKeys = new Set<string>()

          for (const hospital of queryRes.data.hospitals) {
            for (const rec of hospital.records || []) {
              if (rec.visitDate) {
                allVisitDates.push(rec.visitDate)
              }
              for (const rx of rec.prescriptions || []) {
                if (rx.isActive !== false && rx.medicationName) {
                  activeMedicationKeys.add(
                    `${rx.medicationName.trim().toLowerCase()}|${(rx.dosage || '').trim().toLowerCase()}`
                  )
                }
              }
            }
          }

          activeMedicationsCount = activeMedicationKeys.size
          if (allVisitDates.length > 0) {
            allVisitDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
            lastVisit = formatDate(allVisitDates[0])
          }
        }

        const p = patientRes.success
          ? (patientRes.data?.patient as Record<string, unknown> | undefined)
          : undefined

        setPatientData({
          hospitalsCount,
          recordsCount,
          activeMedicationsCount,
          lastVisit,
          allergies: Array.isArray(p?.allergies) ? (p?.allergies as string[]) : [],
          chronicConditions: Array.isArray(p?.chronicConditions) ? (p?.chronicConditions as string[]) : [],
          bloodType: (p?.bloodType as string) || '',
          fullName: (p?.fullName as string) || '',
          partialFailure,
        })
      } catch (error) {
        console.error('Failed to load patient data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadPatientData()
  }, [user?.icNumber])

  useEffect(() => {
    async function loadAccessLogs() {
      try {
        const response = await centralApi.getMyAccessLogs(10)
        if (response.success && response.data) {
          setAccessLogs(response.data)
        }
      } catch (error) {
        console.error('Failed to load access logs:', error)
      } finally {
        setAccessLogsLoading(false)
      }
    }
    loadAccessLogs()
  }, [])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <motion.div
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 p-8 text-white shadow-2xl shadow-emerald-500/25"
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
          <div className="relative w-24 h-24 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-xl">
            <User className="w-12 h-12 drop-shadow-lg" />
          </div>

          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2 drop-shadow-lg">
              {patientData.fullName || user?.fullName || 'Patient'}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/20">
                <CreditCard className="w-4 h-4" />
                <span className="font-mono text-sm">{user?.icNumber || 'XXXXXX-XX-XXXX'}</span>
              </div>
              {patientData.bloodType && (
                <Badge className="bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 border border-white/30 px-4 py-2 text-sm">
                  <Heart className="w-4 h-4 mr-2 text-red-200" />
                  Blood Type: {patientData.bloodType}
                </Badge>
              )}
              {patientData.chronicConditions.map((condition) => (
                <Badge
                  key={condition}
                  className="bg-teal-900/30 text-teal-50 border border-white/20 px-3 py-1.5 text-xs"
                >
                  {condition}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/patient/records">
              <Button variant="outline" className="bg-white text-emerald-600 hover:bg-emerald-50 border-emerald-200 gap-2 shadow-xl shadow-black/10 h-12 px-6 rounded-xl font-semibold">
                <FileText className="w-5 h-5" />
                {t.myRecords}
              </Button>
            </Link>
            <Link to="/patient/privacy">
              <Button variant="ghost" className="border border-white/30 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 gap-2 h-12 px-6 rounded-xl font-semibold">
                <Shield className="w-5 h-5" />
                {t.privacySettings}
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

      {patientData.partialFailure && (
        <motion.div variants={itemVariants}>
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3.5 text-sm text-amber-900 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>{t.partialHospitalFailureWarning}</span>
          </div>
        </motion.div>
      )}

      {patientData.allergies.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-lg bg-gradient-to-r from-red-50 to-orange-50 overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-stretch">
                <div className="w-2 bg-gradient-to-b from-red-500 to-orange-500" />
                <div className="flex-1 p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-red-100 rounded-xl">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-red-900">{t.allergiesOnFile}</p>
                        <p className="text-red-700 text-sm mt-0.5">
                          Inform attending clinicians about these documented drug or clinical allergies
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
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
        </motion.div>
      )}

      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: t.hospitalsVisited,
            value: loading ? '-' : patientData.hospitalsCount,
            icon: Building2,
            gradient: 'from-blue-500 to-blue-600',
            bgLight: 'bg-blue-50',
          },
          {
            label: t.medicalRecordsCount,
            value: loading ? '-' : patientData.recordsCount,
            icon: FileText,
            gradient: 'from-emerald-500 to-emerald-600',
            bgLight: 'bg-emerald-50',
          },
          {
            label: t.activeMedications,
            value: loading ? '-' : patientData.activeMedicationsCount,
            icon: Pill,
            gradient: 'from-violet-500 to-violet-600',
            bgLight: 'bg-violet-50',
          },
          {
            label: t.lastVisit,
            value: loading ? '-' : patientData.lastVisit,
            icon: Calendar,
            gradient: 'from-amber-500 to-amber-600',
            bgLight: 'bg-amber-50',
          },
        ].map((stat) => (
          <Card key={stat.label} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className={`h-1 bg-gradient-to-r ${stat.gradient}`} />
            <CardContent className="pt-5">
              <div className="flex items-center justify-between gap-3">
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
      </motion.div>

      <motion.div variants={itemVariants}>
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
                      {t.myRecords}
                    </h3>
                    <p className="text-gray-500 text-sm mt-1">
                      Inspect diagnoses, prescriptions, lab reports, and export your nationwide medical timeline
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
                      {t.privacySettings}
                    </h3>
                    <p className="text-gray-500 text-sm mt-1">
                      Configure hospital-level sharing consent, inspect audit history, and download your archive
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-lg">
          <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white">
            <h2 className="text-lg font-semibold text-gray-900">{t.recentAccessTitle}</h2>
            <p className="text-sm text-gray-500">Every clinical lookup and blocked access attempt is recorded</p>
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
                </div>
              ) : (
                accessLogs.map((log) => {
                  const avatar = log.actorType === 'doctor' ? '👨‍⚕️' : log.actorType === 'patient' ? '👤' : '🏥'
                  const displayName = formatActorDisplayName(log.actorName, log.actorId, log.actorType)

                  return (
                    <div
                      key={log.id}
                      className={`p-4 transition-colors ${log.success ? 'hover:bg-gray-50' : 'bg-red-50/40 hover:bg-red-50/70'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center text-2xl">
                          {avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-gray-900">{displayName}</p>
                            <Badge variant="outline" className="text-xs">{log.hospitalName}</Badge>
                          </div>
                          <p className="text-sm text-gray-500 truncate">{log.details || 'Viewed medical records'}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm text-gray-400">{formatTimeAgo(log.timestamp)}</p>
                          <div className="flex items-center gap-1 justify-end mt-1">
                            {log.success ? (
                              <>
                                <Activity className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-xs font-medium text-emerald-600">Authorized</span>
                              </>
                            ) : (
                              <>
                                <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                                <span className="text-xs font-medium text-red-600">Blocked</span>
                              </>
                            )}
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
    </motion.div>
  )
}
