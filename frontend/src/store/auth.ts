import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type UserRole = 'patient' | 'doctor' | 'hospital_admin' | 'central_admin'

export interface User {
  id: string
  icNumber: string
  role: UserRole
  hospitalId?: string
  doctorId?: string
  fullName?: string
  specialization?: string
  department?: string
  availableRoles?: UserRole[]
}

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  isHospitalVerified: boolean
  _hasHydrated: boolean
  login: (token: string, user: User) => void
  updateUser: (user: User) => void
  completeHospitalVerification: () => void
  logout: () => void
  setHasHydrated: (state: boolean) => void
}

function clearSessionCaches() {
  try {
    if (typeof sessionStorage !== 'undefined') {
      const keysToRemove: string[] = []
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && key.startsWith('medlink:')) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(k => sessionStorage.removeItem(k))
    }
  } catch {}
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

      updateUser: (user: User) => {
        set({ user })
      },

      completeHospitalVerification: () => {
        set({ isHospitalVerified: true })
      },

      logout: () => {
        clearSessionCaches()
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
