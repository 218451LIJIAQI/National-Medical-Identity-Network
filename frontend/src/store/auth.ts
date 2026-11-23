import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface User {
  id: string
  icNumber: string
  role: 'patient' | 'doctor' | 'hospital_admin' | 'central_admin'
  hospitalId?: string
  doctorId?: string
  fullName?: string
  specialization?: string
  department?: string
}

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  isHospitalVerified: boolean
  _hasHydrated: boolean
  login: (token: string, user: User) => void
  completeHospitalVerification: () => void
  logout: () => void
  setHasHydrated: (state: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isHospitalVerified: false,
      _hasHydrated: false,

      login: (token: string, user: User) => {
        const requiresHospitalStep = user.role === 'doctor' || user.role === 'hospital_admin'
        set({
          token,
          user,
          isAuthenticated: true,
          isHospitalVerified: !requiresHospitalStep,
        })
      },

      completeHospitalVerification: () => {
        set({ isHospitalVerified: true })
      },

      logout: () => {
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          isHospitalVerified: false,
        })
      },

      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state })
      },
    }),
    {
      name: 'medlink-auth',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
