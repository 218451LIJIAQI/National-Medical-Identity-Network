import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Language } from '@/lib/i18n'

interface SettingsState {
  language: Language
  fontSize: 'normal' | 'large' | 'xlarge'
  highContrast: boolean
  setLanguage: (lang: Language) => void
  setFontSize: (size: 'normal' | 'large' | 'xlarge') => void
  toggleHighContrast: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'en',
      fontSize: 'normal',
      highContrast: false,
      setLanguage: (language) => set({ language }),
      setFontSize: (fontSize) => set({ fontSize }),
      toggleHighContrast: () => set((state) => ({ highContrast: !state.highContrast })),
    }),
    {
      name: 'medlink-settings',
    }
  )
)
