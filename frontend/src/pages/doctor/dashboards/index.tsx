import { Building2, Crown, Hexagon, Leaf, Zap, type LucideIcon } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { getHospitalTheme, type HospitalHeroIconName } from '@/lib/hospital-themes'
import { DoctorHospitalDashboard } from './DoctorHospitalDashboard'

const HERO_ICON_MAP: Record<HospitalHeroIconName, LucideIcon> = {
  Building2,
  Leaf,
  Zap,
  Hexagon,
  Crown,
}

export default function DashboardSelector() {
  const { user } = useAuthStore()
  const theme = getHospitalTheme(user?.hospitalId)
  const HeroIcon = HERO_ICON_MAP[theme.heroIconName] || Building2

  return <DoctorHospitalDashboard heroIcon={HeroIcon} badgeLabel={theme.badgeLabel} />
}
