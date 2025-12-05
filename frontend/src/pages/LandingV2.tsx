import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Building2, Shield, Users, ArrowRight, CheckCircle, Lock, Globe,
  CreditCard, Scan, Type, Moon, Sun, Wifi, Database, Network, Activity
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSettingsStore } from '@/store/settings'
import { translations, type Language } from '@/lib/i18n'

const hospitals = [
  { id: 'hospital-kl', name: 'KL General Hospital', city: 'Kuala Lumpur', color: '#3B82F6' },
  { id: 'hospital-penang', name: 'Penang General Hospital', city: 'George Town', color: '#10B981' },
  { id: 'hospital-jb', name: 'Sultanah Aminah Hospital', city: 'Johor Bahru', color: '#F59E0B' },
  { id: 'hospital-sarawak', name: 'Sarawak General Hospital', city: 'Kuching', color: '#8B5CF6' },
  { id: 'hospital-sabah', name: 'Queen Elizabeth Hospital', city: 'Kota Kinabalu', color: '#EF4444' },
]

// IC Card Animation Component
function ICCardDemo() {
  const [scanning, setScanning] = useState(false)
  const [scanned, setScanned] = useState(false)
  const [queryStep, setQueryStep] = useState(0)
  
  const startScan = () => {
    setScanning(true)
    setScanned(false)
    setQueryStep(0)
    
    setTimeout(() => {
      setScanning(false)
      setScanned(true)
      // Start query animation
      let step = 1
      const interval = setInterval(() => {
        setQueryStep(step)
        step++
        if (step > 5) {
          clearInterval(interval)
          setTimeout(() => {
            setScanned(false)
            setQueryStep(0)
          }, 3000)
        }
      }, 800)
    }, 1500)
  }

  return (
    <div className="relative">
      {/* IC Card */}
      <motion.div
        className="relative w-80 h-48 rounded-xl overflow-hidden shadow-2xl cursor-pointer mx-auto"
        style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 100%)',
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={startScan}
      >
        {/* Card Content */}
        <div className="absolute inset-0 p-4">
          {/* Malaysia Flag Colors */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-white to-blue-900" />
          
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-400 tracking-wider">MALAYSIA</p>
              <p className="text-white font-bold">MyKad</p>
            </div>
            <div className="w-10 h-10 bg-yellow-500 rounded flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-yellow-900" />
            </div>
          </div>
          
          <div className="mt-6">
            <div className="flex items-center gap-3">
              <div className="w-16 h-20 bg-gray-700 rounded flex items-center justify-center">
                <Users className="w-8 h-8 text-gray-500" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">IC NUMBER</p>
                <p className="text-white font-mono text-lg tracking-wider">880101-14-5678</p>
                <p className="text-gray-400 text-xs mt-1">AHMAD BIN ABDULLAH</p>
              </div>
            </div>
          </div>
          
          {/* Chip */}
          <div className="absolute bottom-4 left-4 w-10 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-sm" />
          
          {/* Scan prompt */}
          <div className="absolute bottom-4 right-4 text-xs text-cyan-400 flex items-center gap-1">
            <Scan className="w-4 h-4" />
            Click to scan
          </div>
        </div>
        
        {/* Scanning animation */}
        <AnimatePresence>
          {scanning && (
            <motion.div
              className="absolute inset-0 bg-cyan-500/20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="absolute left-0 right-0 h-1 bg-cyan-400"
                initial={{ top: 0 }}
                animate={{ top: '100%' }}
                transition={{ duration: 1.5, ease: 'linear' }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* Query Flow Animation */}
      <AnimatePresence>
        {scanned && (
          <motion.div
            className="mt-8 space-y-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {[
              { step: 1, text: '✓ IC Number Verified', icon: CheckCircle },
              { step: 2, text: '→ Querying Central Index...', icon: Database },
              { step: 3, text: '← Found records in 3 hospitals', icon: Building2 },
              { step: 4, text: '→ Fetching medical records...', icon: Network },
              { step: 5, text: '✓ Complete medical timeline ready', icon: Activity },
            ].map((item, i) => (
              <motion.div
                key={i}
                className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                  queryStep >= item.step 
                    ? 'bg-green-50 text-green-700' 
                    : 'bg-gray-50 text-gray-400'
                }`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: queryStep >= item.step ? 1 : 0.3, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <item.icon className={`w-5 h-5 ${queryStep >= item.step ? 'text-green-500' : ''}`} />
                <span className="text-sm font-medium">{item.text}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Network Visualization Component  
function NetworkVisualization() {
  const [activeHospital, setActiveHospital] = useState<string | null>(null)
  
  // Fixed size container
  const size = 280
  const center = size / 2
  const radius = 100
  
  // Calculate positions for 5 hospitals in a circle
  const hospitalPositions = hospitals.map((hospital, i) => {
    const angle = (i * 72 - 90) * (Math.PI / 180)
    return {
      ...hospital,
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
    }
  })
  
  return (
    <div className="relative h-80 w-full max-w-md bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 rounded-2xl overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
      
      {/* Centered SVG with fixed viewBox */}
      <svg 
        className="absolute top-1/2 left-1/2"
        style={{ transform: 'translate(-50%, -50%)' }}
        width={size} 
        height={size} 
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Connection lines */}
        {hospitalPositions.map((hospital, i) => (
          <motion.line
            key={`line-${hospital.id}`}
            x1={center}
            y1={center}
            x2={hospital.x}
            y2={hospital.y}
            stroke={hospital.color}
            strokeWidth="2"
            strokeOpacity="0.4"
            strokeDasharray="4 4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: i * 0.15 }}
          />
        ))}
        
        {/* Central Hub glow */}
        <circle cx={center} cy={center} r="45" fill="url(#centerGlow)" />
        
        {/* Gradient definitions */}
        <defs>
          <radialGradient id="centerGlow">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
      
      {/* Central Hub with label */}
      <div className="absolute top-1/2 left-1/2 z-20" style={{ transform: 'translate(-50%, -50%)' }}>
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex flex-col items-center"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full flex items-center justify-center shadow-2xl border-2 border-cyan-300/50">
            <Database className="w-9 h-9 text-white" />
          </div>
          <p className="text-cyan-300 text-xs font-semibold mt-2 whitespace-nowrap">Central Index</p>
        </motion.div>
      </div>
      
      {/* Hospital Nodes - positioned relative to center */}
      {hospitalPositions.map((hospital, i) => (
        <motion.div
          key={hospital.id}
          className="absolute z-10"
          style={{ 
            top: `calc(50% + ${hospital.y - center}px)`,
            left: `calc(50% + ${hospital.x - center}px)`,
            transform: 'translate(-50%, -50%)'
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 + i * 0.1 }}
          whileHover={{ scale: 1.15 }}
          onMouseEnter={() => setActiveHospital(hospital.id)}
          onMouseLeave={() => setActiveHospital(null)}
        >
          <div 
            className="w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer transition-all border-2"
            style={{ 
              backgroundColor: hospital.color + '25',
              borderColor: hospital.color + '60',
              boxShadow: activeHospital === hospital.id ? `0 0 20px ${hospital.color}` : 'none'
            }}
          >
            <Building2 className="w-5 h-5" style={{ color: hospital.color }} />
          </div>
          {activeHospital === hospital.id && (
            <motion.div
              className="absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap bg-gray-800/95 px-3 py-1.5 rounded-lg z-30"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p className="text-white text-xs font-medium">{hospital.name}</p>
              <p className="text-gray-400 text-[10px]">{hospital.city}</p>
            </motion.div>
          )}
        </motion.div>
      ))}
      
      {/* Animated Data Packets */}
      {hospitalPositions.map((hospital, i) => (
        <motion.div
          key={`packet-${i}`}
          className="absolute w-2 h-2 rounded-full z-10 top-1/2 left-1/2"
          style={{ 
            backgroundColor: hospital.color,
            boxShadow: `0 0 6px ${hospital.color}`
          }}
          animate={{
            x: [0, (hospital.x - center) * 0.8, 0],
            y: [0, (hospital.y - center) * 0.8, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.4,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

export default function LandingPageV2() {
  const { language, setLanguage, fontSize, setFontSize, highContrast, toggleHighContrast } = useSettingsStore()
  const t = translations[language]
  
  const fontSizeClass = {
    normal: 'text-base',
    large: 'text-lg',
    xlarge: 'text-xl',
  }[fontSize]

  return (
    <div className={`min-h-screen ${highContrast ? 'bg-black text-white' : 'bg-gradient-to-b from-gray-50 to-white'} ${fontSizeClass}`}>
      {/* Accessibility Toolbar */}
      <div className={`fixed top-0 left-0 right-0 z-50 ${highContrast ? 'bg-gray-900' : 'bg-white/95'} backdrop-blur-lg border-b`}>
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl">{t.appName}</span>
            </div>
            
            {/* Accessibility Controls */}
            <div className="flex items-center gap-2">
              {/* Language Selector */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                {(['en', 'ms', 'zh'] as Language[]).map((lang) => (
                  <button
                    key={lang}
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      language === lang ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'
                    }`}
                    onClick={() => setLanguage(lang)}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
              
              {/* Font Size */}
              <button
                className="p-2 hover:bg-gray-100 rounded-lg"
                onClick={() => setFontSize(fontSize === 'normal' ? 'large' : fontSize === 'large' ? 'xlarge' : 'normal')}
                title="Change font size"
              >
                <Type className="w-5 h-5" />
              </button>
              
              {/* High Contrast */}
              <button
                className="p-2 hover:bg-gray-100 rounded-lg"
                onClick={toggleHighContrast}
                title="Toggle high contrast"
              >
                {highContrast ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              
              {/* Login */}
              <Link to="/login">
                <Button size="sm">{t.login}</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="pt-28 pb-16 px-4">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge className="mb-4 bg-green-100 text-green-700 hover:bg-green-100">
                🏥 National Healthcare Network
              </Badge>
              <h1 className={`font-bold mb-6 leading-tight ${fontSize === 'xlarge' ? 'text-4xl' : fontSize === 'large' ? 'text-5xl' : 'text-5xl md:text-6xl'}`}>
                {t.heroTitle1}<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
                  {t.heroTitle2}
                </span>
              </h1>
              <p className={`text-gray-600 mb-8 ${fontSize === 'xlarge' ? 'text-xl' : 'text-lg'}`}>
                {t.heroSubtitle}
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/login">
                  <Button size="lg" className="gap-2">
                    {t.getStarted} <ArrowRight size={20} />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="gap-2">
                  <Wifi className="w-5 h-5" />
                  {t.emergencyAccess}
                </Button>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <ICCardDemo />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Network Architecture Visualization */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">{t.howItWorks}</h2>
          <p className={`text-center ${highContrast ? 'text-gray-300' : 'text-gray-600'} mb-12`}>
            {t.howItWorksSubtitle}
          </p>
          
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="flex justify-center">
              <NetworkVisualization />
            </div>
            
            <div className="space-y-6">
              {[
                { 
                  step: 1, 
                  title: t.step1Title, 
                  desc: t.step1Desc,
                  icon: CreditCard,
                  color: 'blue'
                },
                { 
                  step: 2, 
                  title: t.step2Title, 
                  desc: t.step2Desc,
                  icon: Database,
                  color: 'cyan'
                },
                { 
                  step: 3, 
                  title: t.step3Title, 
                  desc: t.step3Desc,
                  icon: Network,
                  color: 'green'
                },
              ].map((item) => (
                <motion.div
                  key={item.step}
                  className={`flex gap-4 p-4 rounded-xl ${highContrast ? 'bg-gray-800' : 'bg-gray-50'}`}
                  whileHover={{ x: 10 }}
                >
                  <div className={`w-12 h-12 bg-${item.color}-100 rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <item.icon className={`w-6 h-6 text-${item.color}-600`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold text-${item.color}-600`}>STEP {item.step}</span>
                    </div>
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className={`text-sm ${highContrast ? 'text-gray-400' : 'text-gray-600'}`}>{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className={`py-20 px-4 ${highContrast ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">{t.features}</h2>
          <p className={`text-center ${highContrast ? 'text-gray-400' : 'text-gray-600'} mb-12`}>
            {t.featuresSubtitle}
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Shield, title: t.dataSovereigntyTitle, desc: t.dataSovereigntyDesc, color: 'blue' },
              { icon: Activity, title: t.instantAccessTitle, desc: t.instantAccessDesc, color: 'yellow' },
              { icon: Lock, title: t.privacyFirstTitle, desc: t.privacyFirstDesc, color: 'green' },
              { icon: Globe, title: t.nationwideTitle, desc: t.nationwideDesc, color: 'purple' },
            ].map((feature, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -5 }}
              >
                <Card className={`h-full ${highContrast ? 'bg-gray-800 border-gray-700' : ''}`}>
                  <CardContent className="pt-6">
                    <feature.icon className={`w-10 h-10 text-${feature.color}-600 mb-4`} />
                    <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                    <p className={`text-sm ${highContrast ? 'text-gray-400' : 'text-gray-600'}`}>{feature.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Connected Hospitals */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">{t.connectedHospitals}</h2>
          <p className={`text-center ${highContrast ? 'text-gray-400' : 'text-gray-600'} mb-12`}>
            5 {t.connectedHospitals.toLowerCase()} across Malaysia
          </p>
          
          <div className="grid md:grid-cols-5 gap-4">
            {hospitals.map((hospital, index) => (
              <motion.div
                key={hospital.id}
                whileHover={{ scale: 1.05 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`text-center hover:shadow-lg transition-shadow ${highContrast ? 'bg-gray-800 border-gray-700' : ''}`}>
                  <CardContent className="pt-6">
                    <div 
                      className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center"
                      style={{ backgroundColor: hospital.color + '20' }}
                    >
                      <Building2 className="w-7 h-7" style={{ color: hospital.color }} />
                    </div>
                    <h3 className="font-medium text-sm mb-1">{hospital.name}</h3>
                    <p className={`text-xs ${highContrast ? 'text-gray-500' : 'text-gray-500'}`}>{hospital.city}</p>
                    <div className="flex items-center justify-center gap-1 mt-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-xs text-green-600">Online</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className={`py-20 px-4 ${highContrast ? 'bg-black' : 'bg-gray-900'} text-white`}>
        <div className="container mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <Shield className="w-16 h-16 text-cyan-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">{t.securityByDesign}</h2>
            <p className="text-gray-400 mb-8">{t.securityByDesignDesc}</p>
            <div className="flex flex-wrap justify-center gap-4">
              {[t.readOnly, t.auditTrail, t.patientConsent, t.dataEncryption].map((item) => (
                <div key={item} className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                  <CheckCircle className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">{t.ctaTitle}</h2>
          <p className={`${highContrast ? 'text-gray-400' : 'text-gray-600'} max-w-xl mx-auto mb-8`}>
            {t.ctaSubtitle}
          </p>
          <Link to="/login">
            <Button size="lg" className="gap-2">
              {t.loginNow} <ArrowRight size={20} />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-8 px-4 border-t ${highContrast ? 'bg-gray-900 border-gray-800' : 'bg-gray-50'}`}>
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <span className="font-semibold">{t.appName}</span>
          </div>
          <p className={`text-sm ${highContrast ? 'text-gray-500' : 'text-gray-500'}`}>
            {t.builtFor}
          </p>
          <div className={`flex items-center gap-4 text-sm ${highContrast ? 'text-gray-500' : 'text-gray-500'}`}>
            <Link to="/about" className="hover:text-gray-900">{t.about}</Link>
            <span>|</span>
            <span>© 2024</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
