import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/auth'
import { centralApi } from '@/lib/api'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { formatTimeAgo, maskIC } from '@/lib/utils'

export interface DoctorRecentActivity {
  patient: string
  ic: string
  action: string
  time: string
  type: 'view' | 'create'
}

export interface DoctorDashboardStats {
  totalPatients: number
  activeHospitals: number
  todayQueries: number
  avgResponseTime: number
}

export function useDoctorDashboard(activityLimit = 5) {
  const { user } = useAuthStore()
  const theme = getHospitalTheme(user?.hospitalId)
  const [stats, setStats] = useState<DoctorDashboardStats>({
    totalPatients: 0,
    activeHospitals: 0,
    todayQueries: 0,
    avgResponseTime: 0,
  })
  const [recentActivity, setRecentActivity] = useState<DoctorRecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      try {
        const [statsRes, logsRes] = await Promise.all([
          centralApi.getStats(),
          centralApi.getMyActivityLogs(activityLimit),
        ])

        if (cancelled) return

        if (statsRes.success && statsRes.data) {
          setStats(statsRes.data)
        }

        if (logsRes.success && logsRes.data) {
          setRecentActivity(
            logsRes.data.map(log => ({
              patient: log.patientName || 'Patient',
              ic: log.targetIcNumber ? maskIC(log.targetIcNumber) : 'N/A',
              action: log.details || log.action || 'Query',
              time: formatTimeAgo(log.timestamp),
              type: log.action === 'query' ? 'view' : 'create',
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
  }, [activityLimit])

  return { user, theme, stats, recentActivity, loading }
}
