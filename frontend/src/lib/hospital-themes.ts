export interface HospitalTheme {
  id: string
  name: string
  shortName: string
  city: string
  tagline: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  headerGradient: string
  buttonGradient: string
  cardAccentGradient: string
  textColor: string
  bgLight: string
  bgMedium: string
  borderColor: string
  shadowColor: string
  badgeClass: string
  iconBg: string
  iconColor: string
  specialties: string[]
  bedCount: number
  departments: number
}

const hospitalThemes: Record<string, HospitalTheme> = {
  'hospital-kl': {
    id: 'hospital-kl',
    name: 'KL General Hospital',
    shortName: 'KLGH',
    city: 'Kuala Lumpur',
    tagline: 'Excellence in Healthcare Since 1985',
    primaryColor: '#3B82F6',
    secondaryColor: '#6366F1',
    accentColor: '#0EA5E9',

    headerGradient: 'from-blue-600 via-indigo-600 to-blue-700',
    buttonGradient: 'from-blue-600 via-blue-500 to-indigo-600',
    cardAccentGradient: 'from-blue-500 to-indigo-500',
    textColor: 'text-blue-600',
    bgLight: 'bg-blue-50',
    bgMedium: 'bg-blue-100',
    borderColor: 'border-blue-200',
    shadowColor: 'shadow-blue-500/25',
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',
    iconBg: 'bg-blue-500',
    iconColor: 'text-blue-500',
    specialties: ['Cardiology', 'Neurology', 'Oncology', 'Pediatrics'],
    bedCount: 1200,
    departments: 45,
  },

  'hospital-penang': {
    id: 'hospital-penang',
    name: 'Penang Medical Centre',
    shortName: 'PMC',
    city: 'Georgetown, Penang',
    tagline: 'Caring for the Pearl of the Orient',
    primaryColor: '#10B981',
    secondaryColor: '#14B8A6',
    accentColor: '#34D399',

    headerGradient: 'from-emerald-600 via-teal-600 to-green-700',
    buttonGradient: 'from-emerald-600 via-emerald-500 to-teal-600',
    cardAccentGradient: 'from-emerald-500 to-teal-500',
    textColor: 'text-emerald-600',
    bgLight: 'bg-emerald-50',
    bgMedium: 'bg-emerald-100',
    borderColor: 'border-emerald-200',
    shadowColor: 'shadow-emerald-500/25',
    badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    iconBg: 'bg-emerald-500',
    iconColor: 'text-emerald-500',
    specialties: ['Orthopedics', 'Dermatology', 'Gastroenterology', 'Psychiatry'],
    bedCount: 850,
    departments: 38,
  },

  'hospital-jb': {
    id: 'hospital-jb',
    name: 'Johor Specialist Hospital',
    shortName: 'JSH',
    city: 'Johor Bahru',
    tagline: 'Southern Gateway to Premium Healthcare',
    primaryColor: '#F59E0B',
    secondaryColor: '#F97316',
    accentColor: '#FBBF24',

    headerGradient: 'from-amber-500 via-orange-500 to-amber-600',
    buttonGradient: 'from-amber-500 via-amber-400 to-orange-500',
    cardAccentGradient: 'from-amber-500 to-orange-500',
    textColor: 'text-amber-600',
    bgLight: 'bg-amber-50',
    bgMedium: 'bg-amber-100',
    borderColor: 'border-amber-200',
    shadowColor: 'shadow-amber-500/25',
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
    iconBg: 'bg-amber-500',
    iconColor: 'text-amber-500',
    specialties: ['Surgery', 'ENT', 'Urology', 'Ophthalmology'],
    bedCount: 720,
    departments: 32,
  },

  'hospital-kuching': {
    id: 'hospital-kuching',
    name: 'Sarawak General Hospital',
    shortName: 'SGH',
    city: 'Kuching, Sarawak',
    tagline: "Borneo's Premier Medical Excellence",
    primaryColor: '#8B5CF6',
    secondaryColor: '#A855F7',
    accentColor: '#C084FC',

    headerGradient: 'from-violet-600 via-purple-600 to-indigo-700',
    buttonGradient: 'from-violet-600 via-violet-500 to-purple-600',
    cardAccentGradient: 'from-violet-500 to-purple-500',
    textColor: 'text-violet-600',
    bgLight: 'bg-violet-50',
    bgMedium: 'bg-violet-100',
    borderColor: 'border-violet-200',
    shadowColor: 'shadow-violet-500/25',
    badgeClass: 'bg-violet-100 text-violet-700 border-violet-200',
    iconBg: 'bg-violet-500',
    iconColor: 'text-violet-500',
    specialties: ['Tropical Medicine', 'Rehabilitation', 'Nephrology', 'Pulmonology'],
    bedCount: 950,
    departments: 40,
  },

  'hospital-kk': {
    id: 'hospital-kk',
    name: 'Queen Elizabeth Hospital',
    shortName: 'QEH',
    city: 'Kota Kinabalu, Sabah',
    tagline: "Sabah's Leading Healthcare Institution",
    primaryColor: '#EF4444',
    secondaryColor: '#F43F5E',
    accentColor: '#FB7185',

    headerGradient: 'from-red-600 via-rose-600 to-red-700',
    buttonGradient: 'from-red-600 via-red-500 to-rose-600',
    cardAccentGradient: 'from-red-500 to-rose-500',
    textColor: 'text-red-600',
    bgLight: 'bg-red-50',
    bgMedium: 'bg-red-100',
    borderColor: 'border-red-200',
    shadowColor: 'shadow-red-500/25',
    badgeClass: 'bg-red-100 text-red-700 border-red-200',
    iconBg: 'bg-red-500',
    iconColor: 'text-red-500',
    specialties: ['Emergency Medicine', 'Trauma Surgery', 'Obstetrics', 'Geriatrics'],
    bedCount: 1100,
    departments: 42,
  },
}

export function getHospitalTheme(hospitalId: string | undefined): HospitalTheme {
  if (!hospitalId) return hospitalThemes['hospital-kl']
  return hospitalThemes[hospitalId] || hospitalThemes['hospital-kl']
}
