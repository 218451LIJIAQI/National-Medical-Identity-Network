import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { resetClinicalSessionContext } from './clinical'

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
  licenseNumber?: string
  availableRoles?: UserRole[]
  hospitalVerified?: boolean
}

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  isHospitalVerified: boolean
  _hasHydrated: boolean
  login: (token: string, user: User) => void
  completeHospitalVerification: (token: string, user: User) => void
  setSession: (token: string, user: User) => void
  syncUserFromServer: (user: User) => void
  markHospitalUnverified: () => void
  logout: () => void
  setHasHydrated: (state: boolean) => void
}

function resolveHospitalVerified(user: User): boolean {
  const requiresHospitalStep = user.role === 'doctor' || user.role === 'hospital_admin'
  if (!requiresHospitalStep) return true
  return Boolean(user.hospitalVerified)
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      const applyAuthenticatedSession = (token: string, user: User) => {
        resetClinicalSessionContext()
        set({
          token,
          user,
          isAuthenticated: true,
          isHospitalVerified: resolveHospitalVerified(user),
        })
      }

      return {
        token: null,
        user: null,
        isAuthenticated: false,
        isHospitalVerified: false,
        _hasHydrated: false,

        login: applyAuthenticatedSession,

        completeHospitalVerification: (token: string, user: User) => {
          const prev = get().user
          if (
            !prev ||
            prev.icNumber !== user.icNumber ||
            prev.role !== user.role ||
            prev.hospitalId !== user.hospitalId
          ) {
            resetClinicalSessionContext()
          }
          set({
            token,
            user: { ...user, hospitalVerified: true },
            isAuthenticated: true,
            isHospitalVerified: true,
          })
        },

        setSession: applyAuthenticatedSession,

        syncUserFromServer: (user: User) => {
          const prev = get().user
          const nextVerified = resolveHospitalVerified(user)
          const sameVerifiedDoctorScope =
            Boolean(prev) &&
            prev!.id === user.id &&
            prev!.icNumber === user.icNumber &&
            prev!.role === 'doctor' &&
            user.role === 'doctor' &&
            prev!.hospitalId === user.hospitalId &&
            nextVerified

          if (!sameVerifiedDoctorScope) {
            resetClinicalSessionContext()
          }

          set({
            user,
            isAuthenticated: true,
            isHospitalVerified: nextVerified,
          })
        },

        markHospitalUnverified: () => {
          resetClinicalSessionContext()
          set((state) => ({
            isHospitalVerified: false,
            user: state.user ? { ...state.user, hospitalVerified: false } : null,
          }))
        },

        logout: () => {
          resetClinicalSessionContext()
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
      }
    },
    {
      name: 'medlink-auth',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state && state.user?.role !== 'doctor') {
          resetClinicalSessionContext()
        }
        state?.setHasHydrated(true)
      },
    }
  )
)
