import { Appointments } from './modules'
import { useAuthStore } from '@/store/auth'

export default function AppointmentsPage() {
  const { user } = useAuthStore()
  
  return (
    <Appointments 
      doctorName={user?.fullName}
    />
  )
}
