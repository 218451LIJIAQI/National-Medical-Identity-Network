// ============================================================================
// Hospital UI System - Complete Differentiated Design System
// Each hospital has a fundamentally different layout, components, and interactions
// ============================================================================

export type LayoutType = 
  | 'enterprise-dual-nav'    // KL General: Top nav + left secondary sidebar
  | 'minimal-icon-sidebar'   // Penang MC: Minimal icon-only sidebar
  | 'card-dashboard'         // Johor: Card-based with bottom navigation  
  | 'dark-glass-sidebar'     // Sarawak: Dark theme with glassmorphism
  | 'timeline-vertical'      // Queen Elizabeth: Timeline-focused vertical layout

export type ComponentStyle = 
  | 'sharp-corporate'        // Sharp corners, thin borders, precise shadows
  | 'soft-organic'           // Large radius, soft shadows, gradients
  | 'floating-cards'         // Elevated cards, layered shadows
  | 'glass-glow'             // Glass effect, glowing borders, dark bg
  | 'bordered-classic'       // Clear borders, badge elements, lines

export type AnimationStyle = 
  | 'smooth-slide'           // Precise, professional slide animations
  | 'breathing-slow'         // Slow, organic, calming animations
  | 'spring-bounce'          // Bouncy, playful spring physics
  | 'glow-pulse'             // Glowing, pulsing, futuristic
  | 'timeline-flow'          // Sequential, connected, flowing

export type IconStyle = 
  | 'linear-geometric'       // Thin lines, geometric shapes
  | 'rounded-friendly'       // Rounded, approachable icons
  | 'bold-modern'            // Thick strokes, modern feel
  | 'filled-glow'            // Solid fill with glow effects
  | 'medical-detailed'       // Medical-specific, detailed icons

export interface HospitalUISystem {
  // Layout Configuration
  layoutType: LayoutType
  sidebarPosition: 'left' | 'right' | 'none' | 'bottom'
  sidebarWidth: 'narrow' | 'standard' | 'wide' | 'icon-only'
  headerStyle: 'fixed-top' | 'integrated' | 'minimal' | 'hero'
  contentLayout: 'grid' | 'timeline' | 'cards' | 'dashboard' | 'split'
  
  // Component Styling
  componentStyle: ComponentStyle
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  shadowStyle: 'none' | 'subtle' | 'medium' | 'strong' | 'glow'
  borderStyle: 'none' | 'thin' | 'medium' | 'thick' | 'gradient'
  
  // Animation & Interaction
  animationStyle: AnimationStyle
  animationSpeed: 'slow' | 'normal' | 'fast'
  hoverEffect: 'none' | 'lift' | 'glow' | 'scale' | 'slide' | 'border'
  transitionEasing: string
  
  // Typography
  fontFamily: string
  headingWeight: 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold'
  bodySize: 'sm' | 'base' | 'lg'
  
  // Icon System
  iconStyle: IconStyle
  iconSize: 'sm' | 'md' | 'lg'
  iconStroke: number
  
  // Visual Effects
  useGlassmorphism: boolean
  useGradients: boolean
  usePatterns: boolean
  backgroundStyle: 'solid' | 'gradient' | 'pattern' | 'mesh'
  
  // Spacing & Density
  density: 'compact' | 'comfortable' | 'spacious'
  cardPadding: 'tight' | 'normal' | 'relaxed'
  
  // Dark Mode
  prefersDarkMode: boolean
  
  // Custom CSS Classes
  customClasses: {
    container: string
    card: string
    button: string
    buttonSecondary: string
    input: string
    badge: string
    header: string
    sidebar: string
    navItem: string
    navItemActive: string
  }
}

// ============================================================================
// Hospital-Specific UI Configurations
// ============================================================================

export const hospitalUIConfigs: Record<string, HospitalUISystem> = {
  // ─────────────────────────────────────────────────────────────────────────
  // KL GENERAL HOSPITAL - Enterprise Corporate Style
  // Clean, professional, data-driven healthcare management
  // ─────────────────────────────────────────────────────────────────────────
  'hospital-kl': {
    layoutType: 'enterprise-dual-nav',
    sidebarPosition: 'left',
    sidebarWidth: 'standard',
    headerStyle: 'fixed-top',
    contentLayout: 'dashboard',
    
    componentStyle: 'sharp-corporate',
    borderRadius: 'md',
    shadowStyle: 'subtle',
    borderStyle: 'thin',
    
    animationStyle: 'smooth-slide',
    animationSpeed: 'normal',
    hoverEffect: 'lift',
    transitionEasing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    
    fontFamily: '"Inter", system-ui, sans-serif',
    headingWeight: 'semibold',
    bodySize: 'base',
    
    iconStyle: 'linear-geometric',
    iconSize: 'md',
    iconStroke: 1.5,
    
    useGlassmorphism: false,
    useGradients: true,
    usePatterns: false,
    backgroundStyle: 'gradient',
    
    density: 'comfortable',
    cardPadding: 'normal',
    prefersDarkMode: false,
    
    customClasses: {
      container: 'bg-slate-50 min-h-screen',
      card: 'bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow',
      button: 'bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 py-2 font-medium transition-colors shadow-sm',
      buttonSecondary: 'bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md px-4 py-2 font-medium',
      input: 'border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
      badge: 'bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded',
      header: 'bg-white border-b border-slate-200 shadow-sm',
      sidebar: 'bg-white border-r border-slate-200',
      navItem: 'flex items-center gap-3 px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-md transition-colors',
      navItemActive: 'flex items-center gap-3 px-4 py-2.5 bg-blue-50 text-blue-700 font-medium rounded-md border-l-3 border-blue-600',
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PENANG MEDICAL CENTRE - Warm & Organic Style
  // Friendly, approachable, patient-centered design
  // ─────────────────────────────────────────────────────────────────────────
  'hospital-penang': {
    layoutType: 'minimal-icon-sidebar',
    sidebarPosition: 'left',
    sidebarWidth: 'icon-only',
    headerStyle: 'integrated',
    contentLayout: 'cards',
    
    componentStyle: 'soft-organic',
    borderRadius: '2xl',
    shadowStyle: 'medium',
    borderStyle: 'none',
    
    animationStyle: 'breathing-slow',
    animationSpeed: 'slow',
    hoverEffect: 'scale',
    transitionEasing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    
    fontFamily: '"Nunito", system-ui, sans-serif',
    headingWeight: 'bold',
    bodySize: 'base',
    
    iconStyle: 'rounded-friendly',
    iconSize: 'lg',
    iconStroke: 2,
    
    useGlassmorphism: true,
    useGradients: true,
    usePatterns: false,
    backgroundStyle: 'gradient',
    
    density: 'spacious',
    cardPadding: 'relaxed',
    prefersDarkMode: false,
    
    customClasses: {
      container: 'bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 min-h-screen',
      card: 'bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg shadow-emerald-100/50 border border-white/50 hover:shadow-xl transition-all duration-500',
      button: 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-2xl px-6 py-3 font-semibold shadow-lg shadow-emerald-200/50 transition-all',
      buttonSecondary: 'bg-white/60 backdrop-blur-sm border border-emerald-200 hover:bg-white text-emerald-700 rounded-2xl px-6 py-3 font-medium',
      input: 'border-0 bg-white/60 backdrop-blur-sm rounded-2xl px-4 py-3 focus:ring-2 focus:ring-emerald-400 shadow-inner',
      badge: 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full',
      header: 'bg-white/70 backdrop-blur-xl border-b border-emerald-100/50',
      sidebar: 'bg-gradient-to-b from-emerald-600 via-teal-600 to-emerald-700 shadow-2xl',
      navItem: 'flex items-center justify-center p-3 text-white/70 hover:bg-white/10 rounded-2xl transition-all duration-300',
      navItemActive: 'flex items-center justify-center p-3 bg-white/20 text-white rounded-2xl shadow-lg backdrop-blur-sm',
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // JOHOR SPECIALIST HOSPITAL - Modern Card-Based Style
  // Touch-friendly, modular, contemporary mobile-first design
  // ─────────────────────────────────────────────────────────────────────────
  'hospital-jb': {
    layoutType: 'card-dashboard',
    sidebarPosition: 'bottom',
    sidebarWidth: 'narrow',
    headerStyle: 'minimal',
    contentLayout: 'cards',
    
    componentStyle: 'floating-cards',
    borderRadius: 'xl',
    shadowStyle: 'strong',
    borderStyle: 'none',
    
    animationStyle: 'spring-bounce',
    animationSpeed: 'fast',
    hoverEffect: 'lift',
    transitionEasing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    
    fontFamily: '"Poppins", system-ui, sans-serif',
    headingWeight: 'bold',
    bodySize: 'base',
    
    iconStyle: 'bold-modern',
    iconSize: 'md',
    iconStroke: 2.5,
    
    useGlassmorphism: false,
    useGradients: true,
    usePatterns: true,
    backgroundStyle: 'mesh',
    
    density: 'comfortable',
    cardPadding: 'normal',
    prefersDarkMode: false,
    
    customClasses: {
      container: 'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 min-h-screen pb-24',
      card: 'bg-white rounded-2xl shadow-xl shadow-amber-100/30 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300',
      button: 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:via-orange-600 hover:to-amber-700 text-white rounded-xl px-5 py-2.5 font-bold shadow-lg shadow-amber-300/30 transition-all active:scale-95',
      buttonSecondary: 'bg-white border-2 border-amber-200 hover:border-amber-400 text-amber-700 rounded-xl px-5 py-2.5 font-semibold hover:shadow-md',
      input: 'border-2 border-amber-200 bg-white rounded-xl px-4 py-2.5 focus:ring-0 focus:border-amber-500 transition-colors',
      badge: 'bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-lg uppercase tracking-wide',
      header: 'bg-white/90 backdrop-blur-md shadow-lg rounded-b-3xl mx-4 mt-0',
      sidebar: 'fixed bottom-0 left-0 right-0 bg-white border-t border-amber-100 shadow-2xl rounded-t-3xl px-6 py-3 z-50',
      navItem: 'flex flex-col items-center gap-1 p-2 text-amber-400 hover:text-amber-600 transition-colors',
      navItemActive: 'flex flex-col items-center gap-1 p-2 text-amber-600 font-bold relative after:absolute after:-bottom-1 after:w-1 after:h-1 after:bg-amber-500 after:rounded-full',
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SARAWAK GENERAL HOSPITAL - Dark Professional Style
  // Premium, futuristic, high-tech medical interface
  // ─────────────────────────────────────────────────────────────────────────
  'hospital-kuching': {
    layoutType: 'dark-glass-sidebar',
    sidebarPosition: 'left',
    sidebarWidth: 'wide',
    headerStyle: 'integrated',
    contentLayout: 'dashboard',
    
    componentStyle: 'glass-glow',
    borderRadius: 'lg',
    shadowStyle: 'glow',
    borderStyle: 'gradient',
    
    animationStyle: 'glow-pulse',
    animationSpeed: 'slow',
    hoverEffect: 'glow',
    transitionEasing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    
    fontFamily: '"Space Grotesk", system-ui, sans-serif',
    headingWeight: 'medium',
    bodySize: 'base',
    
    iconStyle: 'filled-glow',
    iconSize: 'md',
    iconStroke: 1.5,
    
    useGlassmorphism: true,
    useGradients: true,
    usePatterns: true,
    backgroundStyle: 'mesh',
    
    density: 'comfortable',
    cardPadding: 'normal',
    prefersDarkMode: true,
    
    customClasses: {
      container: 'bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 min-h-screen',
      card: 'bg-white/5 backdrop-blur-xl rounded-xl border border-purple-500/20 shadow-xl shadow-purple-500/10 hover:border-purple-400/40 hover:shadow-purple-500/20 transition-all duration-500',
      button: 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-lg px-5 py-2.5 font-medium shadow-lg shadow-purple-500/30 transition-all border border-purple-400/30',
      buttonSecondary: 'bg-white/5 backdrop-blur-sm border border-purple-400/30 hover:bg-white/10 text-purple-200 rounded-lg px-5 py-2.5 font-medium',
      input: 'bg-white/5 backdrop-blur-sm border border-purple-500/30 rounded-lg px-4 py-2.5 text-white placeholder:text-purple-300/50 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400',
      badge: 'bg-purple-500/20 text-purple-200 text-xs font-medium px-2.5 py-1 rounded-md border border-purple-400/30',
      header: 'bg-white/5 backdrop-blur-xl border-b border-purple-500/20',
      sidebar: 'bg-gradient-to-b from-slate-900/95 via-purple-900/50 to-slate-900/95 backdrop-blur-2xl border-r border-purple-500/20',
      navItem: 'flex items-center gap-3 px-4 py-3 text-purple-300/70 hover:bg-white/5 hover:text-purple-200 rounded-lg transition-all duration-300',
      navItemActive: 'flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-600/30 to-violet-600/20 text-white rounded-lg border-l-2 border-purple-400 shadow-lg shadow-purple-500/10',
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // QUEEN ELIZABETH HOSPITAL - Timeline Classic Style  
  // Document-focused, archival, medical records emphasis
  // ─────────────────────────────────────────────────────────────────────────
  'hospital-kk': {
    layoutType: 'timeline-vertical',
    sidebarPosition: 'none',
    sidebarWidth: 'narrow',
    headerStyle: 'hero',
    contentLayout: 'timeline',
    
    componentStyle: 'bordered-classic',
    borderRadius: 'sm',
    shadowStyle: 'subtle',
    borderStyle: 'medium',
    
    animationStyle: 'timeline-flow',
    animationSpeed: 'normal',
    hoverEffect: 'border',
    transitionEasing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    
    fontFamily: '"DM Sans", system-ui, sans-serif',
    headingWeight: 'bold',
    bodySize: 'base',
    
    iconStyle: 'medical-detailed',
    iconSize: 'md',
    iconStroke: 1.75,
    
    useGlassmorphism: false,
    useGradients: false,
    usePatterns: true,
    backgroundStyle: 'pattern',
    
    density: 'comfortable',
    cardPadding: 'normal',
    prefersDarkMode: false,
    
    customClasses: {
      container: 'bg-gradient-to-b from-red-50 via-white to-rose-50 min-h-screen',
      card: 'bg-white rounded-lg border-2 border-red-100 shadow-md hover:border-red-300 hover:shadow-lg transition-all relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-gradient-to-b before:from-red-500 before:to-rose-500 before:rounded-l-lg',
      button: 'bg-red-600 hover:bg-red-700 text-white rounded-md px-5 py-2.5 font-semibold shadow-md transition-all border-b-2 border-red-800 active:border-b-0 active:translate-y-0.5',
      buttonSecondary: 'bg-white border-2 border-red-200 hover:border-red-400 text-red-700 rounded-md px-5 py-2.5 font-medium hover:shadow-sm',
      input: 'border-2 border-red-200 bg-white rounded-md px-4 py-2.5 focus:ring-0 focus:border-red-500 transition-colors',
      badge: 'bg-red-100 text-red-700 text-xs font-semibold px-2.5 py-1 rounded border border-red-200',
      header: 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-xl',
      sidebar: 'hidden',
      navItem: 'flex items-center gap-2 px-4 py-2 text-red-100 hover:bg-white/10 rounded transition-colors',
      navItemActive: 'flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded font-medium',
    }
  },
}

// ============================================================================
// Utility Functions
// ============================================================================

export function getHospitalUI(hospitalId: string | undefined): HospitalUISystem {
  if (!hospitalId) return hospitalUIConfigs['hospital-kl']
  return hospitalUIConfigs[hospitalId] || hospitalUIConfigs['hospital-kl']
}

export function getLayoutType(hospitalId: string | undefined): LayoutType {
  return getHospitalUI(hospitalId).layoutType
}

export function getAnimationConfig(hospitalId: string | undefined) {
  const ui = getHospitalUI(hospitalId)
  const speedMap = { slow: 0.6, normal: 0.4, fast: 0.25 }
  
  return {
    duration: speedMap[ui.animationSpeed],
    ease: ui.transitionEasing,
    staggerChildren: ui.animationSpeed === 'slow' ? 0.15 : ui.animationSpeed === 'fast' ? 0.05 : 0.1,
  }
}

export function getHoverAnimation(hospitalId: string | undefined) {
  const ui = getHospitalUI(hospitalId)
  
  switch (ui.hoverEffect) {
    case 'lift':
      return { y: -4, transition: { duration: 0.2 } }
    case 'scale':
      return { scale: 1.02, transition: { duration: 0.3 } }
    case 'glow':
      return { boxShadow: '0 0 30px rgba(139, 92, 246, 0.3)', transition: { duration: 0.4 } }
    case 'border':
      return { borderColor: 'currentColor', transition: { duration: 0.2 } }
    case 'slide':
      return { x: 4, transition: { duration: 0.2 } }
    default:
      return {}
  }
}
