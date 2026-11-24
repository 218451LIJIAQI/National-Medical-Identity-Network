export type HospitalShellVariant =
  | 'sidebar'
  | 'hover-rail'
  | 'bottom-dock'
  | 'glass-sidebar'
  | 'royal-top'

export type HospitalHeroIconName = 'Building2' | 'Leaf' | 'Zap' | 'Hexagon' | 'Crown'

export interface HospitalTheme {
  id: string
  code: string
  name: string
  shortName: string
  city: string
  state: string
  tagline: string
  badgeLabel: string
  shellVariant: HospitalShellVariant
  heroIconName: HospitalHeroIconName
  primaryColor: string
  headerGradient: string
  heroSoftGradient: string
  cardHeaderGradient: string
  buttonGradient: string
  cardAccentGradient: string
  textColor: string
  bgLight: string
  bgMedium: string
  borderColor: string
  badgeClass: string
  iconBg: string
  iconColor: string
  activeNavClass: string
  fontClass: string
  specialties: string[]
  bedCount: number
  departments: number
}

export const hospitalThemes: Record<string, HospitalTheme> = {
  'hospital-kl': {
    id: 'hospital-kl',
    code: 'HKL',
    name: 'Kuala Lumpur General Hospital',
    shortName: 'KL General',
    city: 'Kuala Lumpur',
    state: 'WP Kuala Lumpur',
    tagline: 'National Tertiary Referral Centre Since 1870',
    badgeLabel: 'Central Klang Valley Hub',
    shellVariant: 'sidebar',
    heroIconName: 'Building2',
    primaryColor: '#2563EB',
    headerGradient: 'from-blue-700 via-indigo-700 to-blue-800',
    heroSoftGradient: 'from-blue-50 via-sky-50/70 to-indigo-50/60',
    cardHeaderGradient: 'from-blue-50/90 to-white',
    buttonGradient: 'from-blue-600 via-blue-600 to-indigo-700',
    cardAccentGradient: 'from-blue-600 to-indigo-600',
    textColor: 'text-blue-700',
    bgLight: 'bg-blue-50',
    bgMedium: 'bg-blue-100',
    borderColor: 'border-blue-200',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    iconBg: 'bg-blue-600',
    iconColor: 'text-blue-600',
    activeNavClass: 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-800 border-l-4 border-blue-600 shadow-sm',
    fontClass: 'font-inter',
    specialties: ['Cardiology', 'Neurology', 'Oncology', 'Pediatrics'],
    bedCount: 1200,
    departments: 45,
  },

  'hospital-penang': {
    id: 'hospital-penang',
    code: 'HPP',
    name: 'Penang General Hospital',
    shortName: 'Penang General',
    city: 'George Town',
    state: 'Penang',
    tagline: 'Northern Corridor Regional Referral Hospital',
    badgeLabel: 'Northern Corridor Node',
    shellVariant: 'hover-rail',
    heroIconName: 'Leaf',
    primaryColor: '#059669',
    headerGradient: 'from-emerald-700 via-teal-700 to-emerald-800',
    heroSoftGradient: 'from-emerald-50 via-teal-50/70 to-cyan-50/60',
    cardHeaderGradient: 'from-emerald-50/90 to-white',
    buttonGradient: 'from-emerald-600 via-emerald-600 to-teal-700',
    cardAccentGradient: 'from-emerald-600 to-teal-600',
    textColor: 'text-emerald-700',
    bgLight: 'bg-emerald-50',
    bgMedium: 'bg-emerald-100',
    borderColor: 'border-emerald-200',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    iconBg: 'bg-emerald-600',
    iconColor: 'text-emerald-600',
    activeNavClass: 'bg-emerald-50 text-emerald-800 border-l-4 border-emerald-600 shadow-sm',
    fontClass: 'font-nunito',
    specialties: ['Orthopedics', 'Dermatology', 'Gastroenterology', 'Psychiatry'],
    bedCount: 850,
    departments: 38,
  },

  'hospital-jb': {
    id: 'hospital-jb',
    code: 'HSA',
    name: 'Sultanah Aminah Hospital',
    shortName: 'JB Sultanah Aminah',
    city: 'Johor Bahru',
    state: 'Johor',
    tagline: 'Southern Gateway Tertiary Medical Hub',
    badgeLabel: 'Southern Specialist Gateway',
    shellVariant: 'bottom-dock',
    heroIconName: 'Zap',
    primaryColor: '#D97706',
    headerGradient: 'from-amber-700 via-orange-700 to-amber-800',
    heroSoftGradient: 'from-amber-50 via-orange-50/70 to-yellow-50/60',
    cardHeaderGradient: 'from-amber-50/90 to-white',
    buttonGradient: 'from-amber-600 via-orange-600 to-amber-700',
    cardAccentGradient: 'from-amber-600 to-orange-600',
    textColor: 'text-amber-800',
    bgLight: 'bg-amber-50',
    bgMedium: 'bg-amber-100',
    borderColor: 'border-amber-200',
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-300',
    iconBg: 'bg-amber-600',
    iconColor: 'text-amber-700',
    activeNavClass: 'bg-amber-50 text-amber-900 border-l-4 border-amber-600 shadow-sm',
    fontClass: 'font-poppins',
    specialties: ['Surgery', 'ENT', 'Urology', 'Ophthalmology'],
    bedCount: 720,
    departments: 32,
  },

  'hospital-kuching': {
    id: 'hospital-kuching',
    code: 'SGH',
    name: 'Sarawak General Hospital',
    shortName: 'Kuching General',
    city: 'Kuching',
    state: 'Sarawak',
    tagline: 'Sarawak Tertiary & Specialist Referral Complex',
    badgeLabel: 'Sarawak Regional Hub',
    shellVariant: 'glass-sidebar',
    heroIconName: 'Hexagon',
    primaryColor: '#7C3AED',
    headerGradient: 'from-violet-700 via-purple-700 to-indigo-800',
    heroSoftGradient: 'from-violet-50 via-purple-50/70 to-fuchsia-50/60',
    cardHeaderGradient: 'from-violet-50/90 to-white',
    buttonGradient: 'from-violet-600 via-violet-600 to-purple-700',
    cardAccentGradient: 'from-violet-600 to-purple-600',
    textColor: 'text-violet-700',
    bgLight: 'bg-violet-50',
    bgMedium: 'bg-violet-100',
    borderColor: 'border-violet-200',
    badgeClass: 'bg-violet-50 text-violet-800 border-violet-200',
    iconBg: 'bg-violet-600',
    iconColor: 'text-violet-600',
    activeNavClass: 'bg-gradient-to-r from-violet-100 to-purple-100 text-violet-900 border-l-4 border-violet-600 shadow-sm',
    fontClass: 'font-space',
    specialties: ['Tropical Medicine', 'Rehabilitation', 'Nephrology', 'Pulmonology'],
    bedCount: 950,
    departments: 40,
  },

  'hospital-kk': {
    id: 'hospital-kk',
    code: 'QEH',
    name: 'Queen Elizabeth Hospital',
    shortName: 'KK Queen Elizabeth',
    city: 'Kota Kinabalu',
    state: 'Sabah',
    tagline: 'Sabah State Tertiary Referral Institution',
    badgeLabel: 'Sabah Tertiary Referral Center',
    shellVariant: 'royal-top',
    heroIconName: 'Crown',
    primaryColor: '#DC2626',
    headerGradient: 'from-red-700 via-rose-700 to-red-800',
    heroSoftGradient: 'from-rose-50 via-amber-50/50 to-red-50/60',
    cardHeaderGradient: 'from-rose-50/90 to-white',
    buttonGradient: 'from-red-600 via-red-600 to-rose-700',
    cardAccentGradient: 'from-red-600 to-rose-600',
    textColor: 'text-red-700',
    bgLight: 'bg-red-50',
    bgMedium: 'bg-red-100',
    borderColor: 'border-red-200',
    badgeClass: 'bg-red-50 text-red-800 border-red-200',
    iconBg: 'bg-red-600',
    iconColor: 'text-red-600',
    activeNavClass: 'bg-rose-50 text-red-800 border-l-4 border-red-600 shadow-sm',
    fontClass: 'font-inter',
    specialties: ['Emergency Medicine', 'Trauma Surgery', 'Obstetrics', 'Geriatrics'],
    bedCount: 1100,
    departments: 42,
  },
}

export function getHospitalTheme(hospitalId: string | undefined): HospitalTheme {
  if (!hospitalId) return hospitalThemes['hospital-kl']
  return hospitalThemes[hospitalId] || hospitalThemes['hospital-kl']
}
