import { useAuthStore } from '@/store/auth'
import { getHospitalTheme } from '@/lib/hospital-themes'
import { HospitalPortalShell } from './shared'

export default function HospitalLayout() {
  const { user } = useAuthStore()
  const hospitalId = user?.hospitalId || 'hospital-kl'
  const theme = getHospitalTheme(hospitalId)

  return <HospitalPortalShell hospitalId={theme.id} variant={theme.shellVariant} />
}
