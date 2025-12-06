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

// Network Visualization Component - Clean Modern Design
function NetworkVisualization() {
  return (
    <div className="w-full max-w-md mx-auto">
      {/* Clean card container */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        {/* Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-2xl mb-4">
            <Network className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Connected Network</h3>
          <p className="text-gray-500 text-sm mt-1">5 hospitals linked in real-time</p>
        </div>
        
        {/* Hospital List */}
        <div className="space-y-3">
          {hospitals.map((hospital, i) => (
            <motion.div
              key={hospital.id}
              className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ x: 4 }}
            >
              {/* Hospital Icon */}
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                style={{ backgroundColor: hospital.color + '15' }}
              >
                <Building2 className="w-6 h-6" style={{ color: hospital.color }} />
              </div>
              
              {/* Hospital Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{hospital.name}</p>
                <p className="text-sm text-gray-500">{hospital.city}</p>
              </div>
              
              {/* Status */}
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-emerald-600">Online</span>
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* Central Hub Badge */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="flex items-center justify-center gap-3 text-gray-600">
            <Database className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium">Secured by Central Index</span>
            <Shield className="w-5 h-5 text-emerald-600" />
          </div>
        </div>
      </div>
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

      {/* Hero Section - Premium Design */}
      <section className="relative pt-28 pb-20 px-4 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl"
            animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 0] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/15 to-pink-400/15 rounded-full blur-3xl"
            animate={{ scale: [1.2, 1, 1.2] }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-20"
            style={{
              background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 60%)',
            }}
            animate={{ scale: [0.9, 1.1, 0.9] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        
        <div className="container mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Badge className="mb-6 bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 hover:from-emerald-200 hover:to-teal-200 border border-emerald-200 px-4 py-2 text-sm shadow-lg shadow-emerald-500/10">
                  <motion.span
                    className="inline-block mr-2"
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    🏥
                  </motion.span>
                  National Healthcare Network
                </Badge>
              </motion.div>
              
              <h1 className={`font-bold mb-6 leading-tight ${fontSize === 'xlarge' ? 'text-4xl' : fontSize === 'large' ? 'text-5xl' : 'text-5xl md:text-7xl'}`}>
                <motion.span
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="block"
                >
                  {t.heroTitle1}
                </motion.span>
                <motion.span 
                  className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  {t.heroTitle2}
                </motion.span>
              </h1>
              
              <motion.p 
                className={`text-gray-600 mb-10 max-w-lg leading-relaxed ${fontSize === 'xlarge' ? 'text-xl' : 'text-lg'}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                {t.heroSubtitle}
              </motion.p>
              
              <motion.div 
                className="flex flex-wrap gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Link to="/login">
                  <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
                    <Button size="lg" className="gap-2 h-14 px-8 text-base font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-xl shadow-blue-500/25 rounded-xl">
                      {t.getStarted}
                      <motion.div animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                        <ArrowRight size={20} />
                      </motion.div>
                    </Button>
                  </motion.div>
                </Link>
                <Link to="/emergency">
                  <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
                    <Button size="lg" variant="outline" className="gap-2 h-14 px-8 text-base font-semibold border-2 rounded-xl hover:bg-red-50 hover:border-red-300 hover:text-red-600">
                      <Wifi className="w-5 h-5" />
                      {t.emergencyAccess}
                    </Button>
                  </motion.div>
                </Link>
              </motion.div>
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

      {/* Security Section - Clean Design */}
      <section className={`py-20 px-4 ${highContrast ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-2xl mb-4">
                <Shield className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className={`text-3xl font-bold mb-4 ${highContrast ? 'text-white' : 'text-gray-900'}`}>{t.securityByDesign}</h2>
              <p className={`text-lg max-w-2xl mx-auto ${highContrast ? 'text-gray-400' : 'text-gray-600'}`}>
                {t.securityByDesignDesc}
              </p>
            </div>
            
            {/* Security Features - Clean Cards */}
            <div className="grid md:grid-cols-2 gap-6">
              {[
                { icon: Lock, label: t.readOnly, desc: 'Other hospitals can only view, never modify your records', color: 'blue' },
                { icon: Activity, label: t.auditTrail, desc: 'Every access is logged with timestamp and purpose', color: 'emerald' },
                { icon: Users, label: t.patientConsent, desc: 'You control which hospitals can see your data', color: 'violet' },
                { icon: Shield, label: t.dataEncryption, desc: 'Military-grade encryption protects all transfers', color: 'amber' },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -4 }}
                >
                  <Card className={`h-full ${highContrast ? 'bg-gray-800 border-gray-700' : 'hover:shadow-lg'} transition-all`}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 bg-${item.color}-100 rounded-xl flex items-center justify-center flex-shrink-0`}>
                          <item.icon className={`w-6 h-6 text-${item.color}-600`} />
                        </div>
                        <div>
                          <h3 className={`font-bold text-lg mb-2 ${highContrast ? 'text-white' : 'text-gray-900'}`}>{item.label}</h3>
                          <p className={`text-sm ${highContrast ? 'text-gray-400' : 'text-gray-600'}`}>{item.desc}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
            
            {/* Trust Indicators */}
            <div className="mt-10 flex flex-wrap justify-center gap-6">
              {[
                { icon: CheckCircle, text: 'HIPAA Compliant' },
                { icon: Shield, text: 'ISO 27001 Certified' },
                { icon: Lock, text: 'End-to-End Encrypted' },
              ].map((item, i) => (
                <div key={i} className={`flex items-center gap-2 ${highContrast ? 'text-gray-400' : 'text-gray-600'}`}>
                  <item.icon className="w-5 h-5 text-emerald-500" />
                  <span className="text-sm font-medium">{item.text}</span>
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
