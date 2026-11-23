import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/auth'
import { centralApi, hospitalApi } from '@/lib/api'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { formatTimeAgo, maskIC } from '@/lib/utils'

export interface DoctorRecentActivity {
  patient: string
  ic: string
  rawIc?: string
  action: string
  time: string
  type: 'view' | 'create'
}

export interface DoctorDashboardStats {
  totalPatients: number
  activeHospitals: number
  todayQueries: number
  avgResponseTime: number
  localPatients: number
  localRecords: number
  localDoctors: number
  todayVisits: number
}

export function useDoctorDashboard(activityLimit = 6) {
  const { user } = useAuthStore()
  const theme = getHospitalTheme(user?.hospitalId)
  const [stats, setStats] = useState<DoctorDashboardStats>({
    totalPatients: 0,
    activeHospitals: 0,
    todayQueries: 0,
    avgResponseTime: 0,
    localPatients: 0,
    localRecords: 0,
    localDoctors: 0,
    todayVisits: 0,
  })
  const [recentActivity, setRecentActivity] = useState<DoctorRecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      try {
        const hospitalId = user?.hospitalId || 'hospital-kl'
        const [statsRes, logsRes, hospStatsRes] = await Promise.all([
          centralApi.getStats(),
          centralApi.getMyActivityLogs(activityLimit),
          hospitalApi.getStats(hospitalId),
        ])

        if (cancelled) return

        setStats((prev) => ({
          ...prev,
          ...(statsRes.success && statsRes.data ? statsRes.data : {}),
          ...(hospStatsRes.success && hospStatsRes.data
            ? {
                localPatients: hospStatsRes.data.totalPatients,
                localRecords: hospStatsRes.data.totalRecords,
                localDoctors: hospStatsRes.data.totalDoctors,
                todayVisits: hospStatsRes.data.todayVisits || 0,
              }
            : {}),
        }))

        if (logsRes.success && logsRes.data) {
          setRecentActivity(
            logsRes.data.map((log) => ({
              patient: log.patientName || 'Patient',
              ic: log.targetIcNumber ? maskIC(log.targetIcNumber) : 'N/A',
              rawIc: log.targetIcNumber,
              action: log.details || log.action || 'Query',
              time: formatTimeAgo(log.timestamp),
              type: log.action === 'create' || log.action === 'update' ? 'create' : 'view',
            }))
          )
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [activityLimit, user?.hospitalId])

  return { user, theme, stats, recentActivity, loading }
}
