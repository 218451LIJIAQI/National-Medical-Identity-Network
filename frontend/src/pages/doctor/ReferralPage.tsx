// Referral Page Wrapper
import { Referral } from './modules'
import { useAuthStore } from '@/store/auth'
import { getHospitalTheme } from '@/lib/hospital-themes'

export default function ReferralPage() {
  const { user } = useAuthStore()
  const theme = getHospitalTheme(user?.hospitalId)
  
  return (
    <Referral 
      fromHospital={theme.name}
    />
  )
}
