import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface ActiveClinicalPatient {
  icNumber: string
  fullName: string
  dateOfBirth?: string
  gender?: string
  bloodType?: string
  allergies: string[]
  chronicConditions: string[]
  phone?: string
}

interface ClinicalState {
  activePatient: ActiveClinicalPatient | null
  setActivePatient: (patient: ActiveClinicalPatient | null) => void
  clearActivePatient: () => void
}

export const useClinicalStore = create<ClinicalState>()(
  persist(
    (set) => ({
      activePatient: null,
      setActivePatient: (patient) => set({ activePatient: patient }),
      clearActivePatient: () => set({ activePatient: null }),
    }),
    {
      name: 'medlink-active-clinical-patient',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
)
