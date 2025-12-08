import { useAuthStore } from '@/store/auth'
import KLGeneralDashboard from './KLGeneralDashboard'
import PenangDashboard from './PenangDashboard'
import JohorDashboard from './JohorDashboard'
import SarawakDashboard from './SarawakDashboard'
import QueenElizabethDashboard from './QueenElizabethDashboard'

const hospitalDashboardMap: Record<string, React.ComponentType> = {
  'hospital-kl': KLGeneralDashboard,
  'hospital-penang': PenangDashboard,
  'hospital-jb': JohorDashboard,
  'hospital-kuching': SarawakDashboard,
  'hospital-kk': QueenElizabethDashboard,
}

export default function DashboardSelector() {
  const { user } = useAuthStore()
  
  const hospitalId = user?.hospitalId || 'hospital-kl'
  const DashboardComponent = hospitalDashboardMap[hospitalId] || KLGeneralDashboard
  
  return <DashboardComponent />
}
