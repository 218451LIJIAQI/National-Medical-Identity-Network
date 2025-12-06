import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface User {
  id: string
  icNumber: string
  role: 'patient' | 'doctor' | 'hospital_admin' | 'central_admin'
  hospitalId?: string
  doctorId?: string  // Doctor ID for creating records (different from user id)
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
  updateUser: (user: Partial<User>) => void
  setHasHydrated: (state: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      _hasHydrated: false,

      login: (token: string, user: User) => {
        // Also save to localStorage directly for immediate availability
        localStorage.setItem('medlink-token', token)
        localStorage.setItem('medlink-user', JSON.stringify(user))
        set({
          token,
          user,
          isAuthenticated: true,
        })
      },

      logout: () => {
        localStorage.removeItem('medlink-token')
        localStorage.removeItem('medlink-user')
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        })
      },

      updateUser: (userData: Partial<User>) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        }))
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
