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
}

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  _hasHydrated: boolean
  login: (token: string, user: User) => void
  logout: () => void
  setHasHydrated: (state: boolean) => void
}

function clearLegacyAuthKeys() {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem('medlink-token')
  localStorage.removeItem('medlink-user')
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      _hasHydrated: false,

      login: (token: string, user: User) => {
        clearLegacyAuthKeys()
        set({
          token,
          user,
          isAuthenticated: Boolean(token && user),
        })
      },

      logout: () => {
        clearLegacyAuthKeys()
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        })
      },

      setHasHydrated: (hydrated: boolean) => {
        set((state) => ({
          _hasHydrated: hydrated,
          isAuthenticated: Boolean(state.token && state.user),
        }))
      },
    }),
    {
      name: 'medlink-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: Boolean(state.token && state.user),
      }),
      onRehydrateStorage: () => (state) => {
        clearLegacyAuthKeys()
        state?.setHasHydrated(true)
      },
    }
  )
)
