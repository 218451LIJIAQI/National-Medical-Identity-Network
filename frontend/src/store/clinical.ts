import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

const CLINICAL_PATIENT_STORAGE_KEY = 'medlink-active-clinical-patient'

export interface ActiveClinicalPatient {
  icNumber: string
  fullName: string
  dateOfBirth?: string
  gender?: string
  bloodType?: string
  allergies: string[]
  allergiesUnverified?: boolean
  chronicConditions: string[]
  phone?: string
  scopedHospitalId?: string
  scopedDoctorId?: string
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
      name: CLINICAL_PATIENT_STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
    }
  )
)

export function resetClinicalSessionContext(): void {
  useClinicalStore.setState({ activePatient: null })
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(CLINICAL_PATIENT_STORAGE_KEY)
    }
  } catch {
    // Ignore storage errors in non-browser test contexts
  }
}
