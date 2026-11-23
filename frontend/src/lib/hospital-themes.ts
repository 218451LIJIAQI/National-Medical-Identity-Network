export type HospitalId =
  | 'hospital-kl'
  | 'hospital-penang'
  | 'hospital-jb'
  | 'hospital-kuching'
  | 'hospital-kk'

export interface HospitalTheme {
  id: HospitalId
  name: string
  shortName: string
  displayShortName: string
  adminDisplayName: string
  city: string
  state: string
  tagline: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  headerGradient: string
  buttonGradient: string
  cardAccentGradient: string
  textColor: string
  bgLight: string
  hoverBgLight: string
  bgMedium: string
  borderColor: string
  activeBorderLeft: string
  shadowColor: string
  badgeClass: string
  iconBg: string
  iconColor: string
  ringColor: string
  specialties: string[]
  bedCount: number
  departments: number
}

export const HOSPITAL_THEMES: Record<HospitalId, HospitalTheme> = {
  'hospital-kl': {
    id: 'hospital-kl',
    name: 'Kuala Lumpur General Hospital',
    shortName: 'KLGH',
    displayShortName: 'KL General',
    adminDisplayName: 'KL General Admin',
    city: 'Kuala Lumpur',
    state: 'Federal Territory',
    tagline: 'Excellence in Healthcare Since 1870',
    primaryColor: '#3B82F6',
    secondaryColor: '#6366F1',
    accentColor: '#0EA5E9',
    headerGradient: 'from-blue-600 via-indigo-600 to-blue-700',
    buttonGradient: 'from-blue-600 via-blue-500 to-indigo-600',
    cardAccentGradient: 'from-blue-500 to-indigo-500',
    textColor: 'text-blue-600',
    bgLight: 'bg-blue-50',
    hoverBgLight: 'hover:bg-blue-50',
    bgMedium: 'bg-blue-100',
    borderColor: 'border-blue-200',
    activeBorderLeft: 'border-l-4 border-l-blue-600',
    shadowColor: 'shadow-blue-500/25',
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',
    iconBg: 'bg-blue-500',
    iconColor: 'text-blue-500',
    ringColor: 'focus:ring-blue-500/30',
    specialties: ['Cardiology', 'Neurology', 'Oncology', 'Pediatrics'],
    bedCount: 1200,
    departments: 45,
  },
  'hospital-penang': {
    id: 'hospital-penang',
    name: 'Penang Medical Centre',
    shortName: 'PMC',
    displayShortName: 'Penang MC',
    adminDisplayName: 'Penang MC Admin',
    city: 'George Town',
    state: 'Penang',
    tagline: 'Caring for the Pearl of the Orient',
    primaryColor: '#10B981',
    secondaryColor: '#14B8A6',
    accentColor: '#34D399',
    headerGradient: 'from-emerald-600 via-teal-600 to-green-700',
    buttonGradient: 'from-emerald-600 via-emerald-500 to-teal-600',
    cardAccentGradient: 'from-emerald-500 to-teal-500',
    textColor: 'text-emerald-600',
    bgLight: 'bg-emerald-50',
    hoverBgLight: 'hover:bg-emerald-50',
    bgMedium: 'bg-emerald-100',
    borderColor: 'border-emerald-200',
    activeBorderLeft: 'border-l-4 border-l-emerald-600',
    shadowColor: 'shadow-emerald-500/25',
    badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    iconBg: 'bg-emerald-500',
    iconColor: 'text-emerald-500',
    ringColor: 'focus:ring-emerald-500/30',
    specialties: ['Orthopedics', 'Dermatology', 'Gastroenterology', 'Psychiatry'],
    bedCount: 850,
    departments: 38,
  },
  'hospital-jb': {
    id: 'hospital-jb',
    name: 'Johor Specialist Hospital',
    shortName: 'JSH',
    displayShortName: 'Johor Specialist',
    adminDisplayName: 'Johor Specialist Admin',
    city: 'Johor Bahru',
    state: 'Johor',
    tagline: 'Southern Gateway to Specialist Care',
    primaryColor: '#F59E0B',
    secondaryColor: '#F97316',
    accentColor: '#FBBF24',
    headerGradient: 'from-amber-500 via-orange-500 to-amber-600',
    buttonGradient: 'from-amber-500 via-amber-400 to-orange-500',
    cardAccentGradient: 'from-amber-500 to-orange-500',
    textColor: 'text-amber-600',
    bgLight: 'bg-amber-50',
    hoverBgLight: 'hover:bg-amber-50',
    bgMedium: 'bg-amber-100',
    borderColor: 'border-amber-200',
    activeBorderLeft: 'border-l-4 border-l-amber-500',
    shadowColor: 'shadow-amber-500/25',
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
    iconBg: 'bg-amber-500',
    iconColor: 'text-amber-500',
    ringColor: 'focus:ring-amber-500/30',
    specialties: ['Surgery', 'ENT', 'Urology', 'Ophthalmology'],
    bedCount: 720,
    departments: 32,
  },
  'hospital-kuching': {
    id: 'hospital-kuching',
    name: 'Sarawak General Hospital',
    shortName: 'SGH',
    displayShortName: 'Sarawak General',
    adminDisplayName: 'Sarawak General Admin',
    city: 'Kuching',
    state: 'Sarawak',
    tagline: "Borneo's Premier Medical Excellence",
    primaryColor: '#8B5CF6',
    secondaryColor: '#A855F7',
    accentColor: '#C084FC',
    headerGradient: 'from-violet-600 via-purple-600 to-indigo-700',
    buttonGradient: 'from-violet-600 via-violet-500 to-purple-600',
    cardAccentGradient: 'from-violet-500 to-purple-500',
    textColor: 'text-violet-600',
    bgLight: 'bg-violet-50',
    hoverBgLight: 'hover:bg-violet-50',
    bgMedium: 'bg-violet-100',
    borderColor: 'border-violet-200',
    activeBorderLeft: 'border-l-4 border-l-violet-600',
    shadowColor: 'shadow-violet-500/25',
    badgeClass: 'bg-violet-100 text-violet-700 border-violet-200',
    iconBg: 'bg-violet-500',
    iconColor: 'text-violet-500',
    ringColor: 'focus:ring-violet-500/30',
    specialties: ['Tropical Medicine', 'Rehabilitation', 'Nephrology', 'Pulmonology'],
    bedCount: 950,
    departments: 40,
  },
  'hospital-kk': {
    id: 'hospital-kk',
    name: 'Queen Elizabeth Hospital',
    shortName: 'QEH',
    displayShortName: 'Queen Elizabeth',
    adminDisplayName: 'Queen Elizabeth Admin',
    city: 'Kota Kinabalu',
    state: 'Sabah',
    tagline: "Sabah's Leading Healthcare Institution",
    primaryColor: '#EF4444',
    secondaryColor: '#F43F5E',
    accentColor: '#FB7185',
    headerGradient: 'from-red-600 via-rose-600 to-red-700',
    buttonGradient: 'from-red-600 via-red-500 to-rose-600',
    cardAccentGradient: 'from-red-500 to-rose-500',
    textColor: 'text-red-600',
    bgLight: 'bg-red-50',
    hoverBgLight: 'hover:bg-red-50',
    bgMedium: 'bg-red-100',
    borderColor: 'border-red-200',
    activeBorderLeft: 'border-l-4 border-l-red-600',
    shadowColor: 'shadow-red-500/25',
    badgeClass: 'bg-red-100 text-red-700 border-red-200',
    iconBg: 'bg-red-500',
    iconColor: 'text-red-500',
    ringColor: 'focus:ring-red-500/30',
    specialties: ['Emergency Medicine', 'Trauma Surgery', 'Obstetrics', 'Geriatrics'],
    bedCount: 1100,
    departments: 42,
  },
}

export const HOSPITAL_LIST: HospitalTheme[] = Object.values(HOSPITAL_THEMES)

export function getHospitalTheme(hospitalId?: string | null): HospitalTheme {
  if (!hospitalId) return HOSPITAL_THEMES['hospital-kl']
  return HOSPITAL_THEMES[hospitalId as HospitalId] || HOSPITAL_THEMES['hospital-kl']
}

export function resolveHospitalTheme(hospitalIdOrName?: string | null): HospitalTheme {
  if (!hospitalIdOrName) return HOSPITAL_THEMES['hospital-kl']
  if (hospitalIdOrName in HOSPITAL_THEMES) {
    return HOSPITAL_THEMES[hospitalIdOrName as HospitalId]
  }
  const normalized = hospitalIdOrName.toLowerCase()
  return (
    HOSPITAL_LIST.find(
      (item) =>
        item.name.toLowerCase() === normalized ||
        item.displayShortName.toLowerCase() === normalized ||
        item.shortName.toLowerCase() === normalized ||
        normalized.includes(item.city.toLowerCase())
    ) || HOSPITAL_THEMES['hospital-kl']
  )
}
