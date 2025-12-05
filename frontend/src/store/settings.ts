import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Language } from '@/lib/i18n'

interface SettingsState {
  language: Language
  fontSize: 'normal' | 'large' | 'xlarge'
  highContrast: boolean
  reduceMotion: boolean
  setLanguage: (lang: Language) => void
  setFontSize: (size: 'normal' | 'large' | 'xlarge') => void
  toggleHighContrast: () => void
  toggleReduceMotion: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'en',
      fontSize: 'normal',
      highContrast: false,
      reduceMotion: false,
      setLanguage: (language) => set({ language }),
      setFontSize: (fontSize) => set({ fontSize }),
      toggleHighContrast: () => set((state) => ({ highContrast: !state.highContrast })),
      toggleReduceMotion: () => set((state) => ({ reduceMotion: !state.reduceMotion })),
    }),
    {
      name: 'medlink-settings',
    }
  )
)
