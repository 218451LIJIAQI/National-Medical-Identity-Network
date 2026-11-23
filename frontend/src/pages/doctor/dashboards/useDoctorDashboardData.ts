import { useEffect, useState } from 'react'
import { centralApi, hospitalApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { getHospitalTheme, type HospitalId, type HospitalTheme } from '@/lib/hospital-themes'
import { formatDoctorName, formatRelativeTime, maskIcNumber } from '@/lib/utils'

export interface DoctorActivityItem {
  id: string
  patient: string
  ic: string
  action: string
  time: string
  type: 'view' | 'create'
}

export interface DoctorDashboardData {
  doctorName: string
  specialization: string
  theme: HospitalTheme
  loading: boolean
  networkStats: {
    totalPatients: number
    activeHospitals: number
    todayQueries: number
    avgResponseTime: number
  }
  localStats: {
    totalPatients: number
    totalRecords: number
    activeDoctors: number
    todayVisits: number
  }
  recentActivity: DoctorActivityItem[]
}

export function useDoctorDashboardData(defaultHospitalId: HospitalId): DoctorDashboardData {
  const { user } = useAuthStore()
  const hospitalId = (user?.hospitalId as HospitalId) || defaultHospitalId
  const theme = getHospitalTheme(hospitalId)

  const [loading, setLoading] = useState(true)
  const [networkStats, setNetworkStats] = useState({
    totalPatients: 0,
    activeHospitals: 5,
    todayQueries: 0,
    avgResponseTime: 0,
  })
  const [localStats, setLocalStats] = useState({
    totalPatients: 0,
    totalRecords: 0,
    activeDoctors: 0,
    todayVisits: 0,
  })
  const [recentActivity, setRecentActivity] = useState<DoctorActivityItem[]>([])

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [netRes, hospRes, logsRes] = await Promise.all([
          centralApi.getStats(),
          hospitalApi.getStats(hospitalId),
          centralApi.getMyActivityLogs(6),
        ])
        if (!active) return

        if (netRes.success && netRes.data) {
          setNetworkStats({
            totalPatients: netRes.data.totalPatients,
            activeHospitals: netRes.data.activeHospitals,
            todayQueries: netRes.data.todayQueries,
            avgResponseTime: netRes.data.avgResponseTime,
          })
        }

        if (hospRes.success && hospRes.data) {
          setLocalStats({
            totalPatients: hospRes.data.totalPatients,
            totalRecords: hospRes.data.totalRecords,
            activeDoctors: hospRes.data.activeDoctors,
            todayVisits: hospRes.data.todayVisits,
          })
        }

        if (logsRes.success && logsRes.data) {
          setRecentActivity(
            logsRes.data.map((log) => ({
              id: log.id,
              patient: log.patientName || 'Patient',
              ic: maskIcNumber(log.targetIcNumber),
              action: log.details || log.action,
              time: formatRelativeTime(log.timestamp),
              type: log.action === 'create' ? 'create' : 'view',
            }))
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [hospitalId])

  return {
    doctorName: formatDoctorName(user?.fullName),
    specialization: user?.specialization || 'Attending Specialist',
    theme,
    loading,
    networkStats,
    localStats,
    recentActivity,
  }
}
