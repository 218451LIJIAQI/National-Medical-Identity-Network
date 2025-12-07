// ============================================================================
// Doctor Dashboard Selector
// Dynamically selects the appropriate dashboard based on user's hospital
// Each hospital has a completely different UI/UX design
// ============================================================================

import { useAuthStore } from '@/store/auth'
import KLGeneralDashboard from './KLGeneralDashboard'
import PenangDashboard from './PenangDashboard'
import JohorDashboard from './JohorDashboard'
import SarawakDashboard from './SarawakDashboard'
import QueenElizabethDashboard from './QueenElizabethDashboard'

// Hospital ID to Dashboard Component mapping
const hospitalDashboardMap: Record<string, React.ComponentType> = {
  'hospital-kl': KLGeneralDashboard,          // Sky Blue Corporate Style
  'hospital-penang': PenangDashboard,          // Warm & Organic Style
  'hospital-jb': JohorDashboard,               // Modern Card-Based Style
  'hospital-kuching': SarawakDashboard,        // Dark Professional Style
  'hospital-kk': QueenElizabethDashboard,      // Timeline Classic Style
}

export default function DashboardSelector() {
  const { user } = useAuthStore()
  
  // Get the appropriate dashboard based on hospital ID
  const hospitalId = user?.hospitalId || 'hospital-kl'
  const DashboardComponent = hospitalDashboardMap[hospitalId] || KLGeneralDashboard
  
  return <DashboardComponent />
}

// Export individual dashboards for direct use if needed
export {
  KLGeneralDashboard,
  PenangDashboard,
  JohorDashboard,
  SarawakDashboard,
  QueenElizabethDashboard,
}
