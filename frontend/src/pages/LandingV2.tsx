import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Building2, Shield, Users, ArrowRight, CheckCircle, Lock, Globe,
  CreditCard, Scan, Type, Moon, Sun, Database, Network, Activity,
  Sparkles, Heart, Zap, Star, ChevronRight, Award
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSettingsStore } from '@/store/settings'
import { translations, type Language } from '@/lib/i18n'

const hospitals = [
  { id: 'hospital-kl', name: 'KL General Hospital', city: 'Kuala Lumpur', color: '#3B82F6', gradient: 'from-blue-500 to-indigo-600' },
  { id: 'hospital-penang', name: 'Penang Medical Centre', city: 'George Town', color: '#10B981', gradient: 'from-emerald-500 to-teal-600' },
  { id: 'hospital-jb', name: 'Johor Specialist Hospital', city: 'Johor Bahru', color: '#F59E0B', gradient: 'from-amber-500 to-orange-600' },
  { id: 'hospital-sarawak', name: 'Sarawak General Hospital', city: 'Kuching', color: '#8B5CF6', gradient: 'from-violet-500 to-purple-600' },
  { id: 'hospital-sabah', name: 'Queen Elizabeth Hospital', city: 'Kota Kinabalu', color: '#EF4444', gradient: 'from-red-500 to-rose-600' },
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
  const [scrolled, setScrolled] = useState(false)
  
  // Track scroll for header effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  
  const fontSizeClass = {
    normal: 'text-base',
    large: 'text-lg',
    xlarge: 'text-xl',
  }[fontSize]

  return (
    <div className={`min-h-screen ${highContrast ? 'bg-black text-white' : 'bg-gradient-to-b from-slate-50 via-white to-blue-50/30'} ${fontSizeClass}`}>
      {/* Premium Navigation Header */}
      <motion.header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled 
            ? highContrast ? 'bg-gray-900/95' : 'bg-white/80 shadow-lg shadow-gray-200/50' 
            : highContrast ? 'bg-transparent' : 'bg-transparent'
        } backdrop-blur-xl`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Premium Logo */}
            <motion.div 
              className="flex items-center gap-3"
              whileHover={{ scale: 1.02 }}
            >
              <motion.div 
                className="relative w-12 h-12 bg-gradient-to-br from-blue-600 via-cyan-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30"
                whileHover={{ rotate: 5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Building2 className="w-6 h-6 text-white drop-shadow-md" />
                <motion.div
                  className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent"
                  animate={{ opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>
              <div>
                <h1 className="font-bold text-xl tracking-tight">{t.appName}</h1>
                <p className="text-xs text-gray-500 -mt-0.5">Healthcare Network</p>
              </div>
            </motion.div>
            
            {/* Premium Nav Controls */}
            <div className="flex items-center gap-3">
              {/* Language Selector - Premium */}
              <div className="hidden sm:flex items-center gap-1 bg-gray-100/80 backdrop-blur-sm rounded-xl p-1 border border-gray-200/50">
                {(['en', 'ms', 'zh'] as Language[]).map((lang) => (
                  <motion.button
                    key={lang}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-300 ${
                      language === lang 
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/25' 
                        : 'hover:bg-white/80 text-gray-600'
                    }`}
                    onClick={() => setLanguage(lang)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {lang.toUpperCase()}
                  </motion.button>
                ))}
              </div>
              
              {/* Accessibility Buttons */}
              <motion.button
                className="p-2.5 hover:bg-gray-100/80 rounded-xl transition-colors border border-transparent hover:border-gray-200"
                onClick={() => setFontSize(fontSize === 'normal' ? 'large' : fontSize === 'large' ? 'xlarge' : 'normal')}
                title="Change font size"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Type className="w-5 h-5 text-gray-600" />
              </motion.button>
              
              <motion.button
                className="p-2.5 hover:bg-gray-100/80 rounded-xl transition-colors border border-transparent hover:border-gray-200"
                onClick={toggleHighContrast}
                title="Toggle high contrast"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {highContrast ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-600" />}
              </motion.button>
              
              {/* Premium Login Button */}
              <Link to="/login">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg shadow-blue-500/25 px-6 h-11 rounded-xl font-semibold">
                    <Sparkles className="w-4 h-4 mr-2" />
                    {t.login}
                  </Button>
                </motion.div>
              </Link>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Hero Section - Ultra Premium Design */}
      <section className="relative pt-32 pb-24 px-4 overflow-hidden">
        {/* Premium Background with Mesh Gradient */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Main gradient orbs */}
          <motion.div
            className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-blue-400/30 via-cyan-400/20 to-transparent rounded-full blur-3xl"
            animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -20, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-60 -left-40 w-[500px] h-[500px] bg-gradient-to-br from-violet-400/20 via-purple-400/15 to-transparent rounded-full blur-3xl"
            animate={{ scale: [1.2, 1, 1.2], x: [0, -20, 0] }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-gradient-to-br from-emerald-400/15 to-transparent rounded-full blur-3xl"
            animate={{ scale: [1, 1.2, 1], y: [0, 30, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
          
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
          
          {/* Floating particles */}
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-blue-400/40 rounded-full"
              style={{ left: `${8 + i * 8}%`, top: `${15 + (i % 5) * 15}%` }}
              animate={{
                y: [-20, 20, -20],
                x: [-10, 10, -10],
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.2, 1],
              }}
              transition={{ duration: 5 + i * 0.5, repeat: Infinity, delay: i * 0.3 }}
            />
          ))}
          
          {/* Radial glow center */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px]"
            style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 50%)' }}
            animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        
        <div className="container mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* Premium Badge */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Badge className="mb-8 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 text-emerald-700 border border-emerald-200/60 px-5 py-2.5 text-sm shadow-lg shadow-emerald-500/10 backdrop-blur-sm">
                  <motion.div
                    className="w-2 h-2 bg-emerald-500 rounded-full mr-3"
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <Star className="w-4 h-4 mr-2 text-emerald-600" />
                  National Healthcare Network
                  <ChevronRight className="w-4 h-4 ml-2 text-emerald-500" />
                </Badge>
              </motion.div>
              
              {/* Ultra Premium Heading */}
              <h1 className={`font-extrabold mb-8 leading-[1.1] tracking-tight ${fontSize === 'xlarge' ? 'text-4xl' : fontSize === 'large' ? 'text-5xl' : 'text-5xl md:text-7xl'}`}>
                <motion.span
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="block text-gray-900"
                >
                  {t.heroTitle1}
                </motion.span>
                <motion.span 
                  className="block bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500 bg-clip-text text-transparent"
                  style={{ backgroundSize: '200% auto' }}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0, backgroundPosition: ['0%', '100%', '0%'] }}
                  transition={{ 
                    opacity: { delay: 0.4, duration: 0.6 },
                    y: { delay: 0.4, duration: 0.6 },
                    backgroundPosition: { duration: 5, repeat: Infinity, ease: 'linear' }
                  }}
                >
                  {t.heroTitle2}
                </motion.span>
              </h1>
              
              {/* Premium Subtitle */}
              <motion.p 
                className={`text-gray-600 mb-10 max-w-xl leading-relaxed ${fontSize === 'xlarge' ? 'text-xl' : 'text-lg'}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
              >
                {t.heroSubtitle}
              </motion.p>
              
              {/* Premium CTA Buttons */}
              <motion.div 
                className="flex flex-wrap gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Link to="/login">
                  <motion.div 
                    whileHover={{ scale: 1.03, y: -3 }} 
                    whileTap={{ scale: 0.97 }}
                    className="relative group"
                  >
                    {/* Glow effect */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500 rounded-2xl blur-lg opacity-40 group-hover:opacity-60 transition-opacity" />
                    <Button size="lg" className="relative gap-3 h-14 px-8 text-base font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 hover:from-blue-700 hover:via-cyan-700 hover:to-blue-700 shadow-2xl shadow-blue-500/30 rounded-xl border border-white/20">
                      <Zap className="w-5 h-5" />
                      {t.getStarted}
                      <motion.div animate={{ x: [0, 5, 0] }} transition={{ duration: 1.2, repeat: Infinity }}>
                        <ArrowRight size={20} />
                      </motion.div>
                    </Button>
                  </motion.div>
                </Link>
                <Link to="/emergency">
                  <motion.div whileHover={{ scale: 1.03, y: -3 }} whileTap={{ scale: 0.97 }}>
                    <Button size="lg" variant="outline" className="gap-3 h-14 px-8 text-base font-semibold border-2 border-gray-200 rounded-xl hover:bg-red-50 hover:border-red-300 hover:text-red-600 hover:shadow-lg hover:shadow-red-500/10 transition-all">
                      <Heart className="w-5 h-5" />
                      {t.emergencyAccess}
                    </Button>
                  </motion.div>
                </Link>
              </motion.div>
              
              {/* Trust Indicators */}
              <motion.div
                className="flex items-center gap-6 mt-10 pt-10 border-t border-gray-200/60"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                {[
                  { icon: Shield, text: 'HIPAA Compliant', color: 'text-emerald-600' },
                  { icon: Lock, text: 'End-to-End Encrypted', color: 'text-blue-600' },
                  { icon: CheckCircle, text: '99.9% Uptime', color: 'text-cyan-600' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-gray-600">
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                    <span className="text-sm font-medium">{item.text}</span>
                  </div>
                ))}
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

      {/* Connected Hospitals - Premium Design */}
      <section className="py-24 px-4 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-blue-50/30 to-white pointer-events-none" />
        
        <div className="container mx-auto relative z-10">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="info" className="mb-4 px-4 py-1.5">
              <Network className="w-4 h-4 mr-2" />
              Connected Network
            </Badge>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">{t.connectedHospitals}</h2>
            <p className={`text-lg max-w-2xl mx-auto ${highContrast ? 'text-gray-400' : 'text-gray-600'}`}>
              Seamlessly connected healthcare facilities across Malaysia
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-5 gap-5">
            {hospitals.map((hospital, index) => (
              <motion.div
                key={hospital.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                className="group"
              >
                <Card className={`relative text-center overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 ${highContrast ? 'bg-gray-800' : 'bg-white'}`}>
                  {/* Top gradient bar */}
                  <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${hospital.gradient}`} />
                  
                  <CardContent className="pt-8 pb-6">
                    {/* Hospital icon with glow */}
                    <motion.div 
                      className="relative w-16 h-16 mx-auto mb-4"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                    >
                      <div 
                        className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${hospital.gradient} opacity-20 blur-lg group-hover:opacity-40 transition-opacity`}
                      />
                      <div 
                        className={`relative w-full h-full rounded-2xl bg-gradient-to-br ${hospital.gradient} flex items-center justify-center shadow-lg`}
                      >
                        <Building2 className="w-8 h-8 text-white" />
                      </div>
                    </motion.div>
                    
                    <h3 className="font-bold text-sm mb-1 text-gray-900 group-hover:text-blue-600 transition-colors">{hospital.name}</h3>
                    <p className="text-xs text-gray-500 mb-3">{hospital.city}</p>
                    
                    {/* Status indicator */}
                    <div className="flex items-center justify-center gap-2 py-2 px-3 bg-emerald-50 rounded-full mx-auto w-fit">
                      <motion.div 
                        className="w-2 h-2 bg-emerald-500 rounded-full"
                        animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                      <span className="text-xs font-semibold text-emerald-700">Online</span>
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

      {/* CTA - Premium Light Design */}
      <section className="py-24 px-4 relative overflow-hidden bg-gradient-to-b from-white via-gray-50 to-white">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
        
        {/* Soft Gradient Orbs */}
        <motion.div
          className="absolute top-10 left-10 w-64 h-64 bg-gradient-to-br from-blue-100/50 to-cyan-100/50 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], x: [0, 20, 0] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-10 right-10 w-80 h-80 bg-gradient-to-br from-emerald-100/40 to-teal-100/40 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], y: [0, -20, 0] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        
        <div className="container mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="mb-6 bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border-blue-200/50 px-4 py-1.5">
              <Award className="w-4 h-4 mr-2" />
              Get Started Today
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-gray-900 via-blue-800 to-gray-900 bg-clip-text text-transparent">{t.ctaTitle}</h2>
            <p className="text-gray-600 max-w-2xl mx-auto mb-10 text-lg">
              {t.ctaSubtitle}
            </p>
            <Link to="/login">
              <motion.div 
                whileHover={{ scale: 1.05, y: -3 }} 
                whileTap={{ scale: 0.95 }}
                className="inline-block"
              >
                <Button size="lg" className="gap-3 h-16 px-10 text-lg font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-emerald-600 text-white hover:from-blue-700 hover:via-cyan-700 hover:to-emerald-700 shadow-2xl shadow-blue-500/25 rounded-2xl border-0">
                  <Sparkles className="w-5 h-5" />
                  {t.loginNow}
                  <motion.div animate={{ x: [0, 5, 0] }} transition={{ duration: 1.2, repeat: Infinity }}>
                    <ArrowRight size={24} />
                  </motion.div>
                </Button>
              </motion.div>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer - Premium Design */}
      <footer className={`py-12 px-4 ${highContrast ? 'bg-gray-900 border-gray-800' : 'bg-gradient-to-b from-gray-50 to-white'}`}>
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 pb-8 border-b border-gray-200">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-cyan-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{t.appName}</h3>
                <p className="text-xs text-gray-500">Healthcare Network</p>
              </div>
            </div>
            
            {/* Navigation */}
            <div className="flex items-center gap-8">
              <Link to="/about" className="text-gray-600 hover:text-blue-600 transition-colors font-medium text-sm">{t.about}</Link>
              <Link to="/emergency" className="text-gray-600 hover:text-red-600 transition-colors font-medium text-sm">Emergency Access</Link>
              <Link to="/login" className="text-gray-600 hover:text-blue-600 transition-colors font-medium text-sm">Sign In</Link>
            </div>
          </div>
          
          {/* Bottom bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              {t.builtFor}
            </p>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <span>© 2024 MedLink MY</span>
              <span>•</span>
              <span>All rights reserved</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
