import { MedicalCertificate } from './modules'
import { useAuthStore } from '@/store/auth'
import { getHospitalTheme } from '@/lib/hospital-themes'

export default function MCPage() {
  const { user } = useAuthStore()
  const theme = getHospitalTheme(user?.hospitalId)
  
  return (
    <MedicalCertificate 
      doctorName={user?.fullName}
      hospitalName={theme.name}
    />
  )
}
