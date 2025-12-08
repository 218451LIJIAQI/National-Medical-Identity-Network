import { useAuthStore } from '@/store/auth'
import KLGeneralLayout from './KLGeneralLayout'
import PenangMCLayout from './PenangMCLayout'
import JohorSpecialistLayout from './JohorSpecialistLayout'
import SarawakGeneralLayout from './SarawakGeneralLayout'
import QueenElizabethLayout from './QueenElizabethLayout'

const hospitalLayoutMap: Record<string, React.ComponentType> = {
  'hospital-kl': KLGeneralLayout,
  'hospital-penang': PenangMCLayout,
  'hospital-jb': JohorSpecialistLayout,
  'hospital-kuching': SarawakGeneralLayout,
  'hospital-kk': QueenElizabethLayout,
}

export default function HospitalLayout() {
  const { user } = useAuthStore()
  const hospitalId = user?.hospitalId || 'hospital-kl'
  const LayoutComponent = hospitalLayoutMap[hospitalId] || KLGeneralLayout
  
  return <LayoutComponent />
}
