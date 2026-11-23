import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Building2, Shield, Users, ArrowRight, CheckCircle, Lock, Globe,
  CreditCard, Scan, Type, Moon, Sun, Database, Network, Activity,
  Zap, Siren,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSettingsStore } from '@/store/settings'
import { translations, type Language } from '@/lib/i18n'
import { HOSPITAL_LIST } from '@/lib/hospital-themes'

function ICCardDemo() {
  const [scanning, setScanning] = useState(false)
  const [scanned, setScanned] = useState(false)
  const [queryStep, setQueryStep] = useState(0)
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([])

  const clearAllTimers = () => {
    timersRef.current.forEach((timer) => clearTimeout(timer))
    timersRef.current = []
  }

  useEffect(() => () => clearAllTimers(), [])

  const startScan = () => {
    if (scanning) return
    clearAllTimers()
    setScanning(true)
    setScanned(false)
    setQueryStep(0)

    const scanDone = setTimeout(() => {
      setScanning(false)
      setScanned(true)
      for (let step = 1; step <= 5; step++) {
        const stepTimer = setTimeout(() => {
          setQueryStep(step)
        }, step * 550)
        timersRef.current.push(stepTimer)
      }
      const resetTimer = setTimeout(() => {
        setScanned(false)
        setQueryStep(0)
      }, 6000)
      timersRef.current.push(resetTimer)
    }, 1200)

    timersRef.current.push(scanDone)
  }

  const steps = [
    { step: 1, text: 'MyKad smart chip authenticated', icon: CheckCircle },
    { step: 2, text: 'Querying MOH Central Patient Index...', icon: Database },
    { step: 3, text: 'Located records across 5 connected hospitals', icon: Building2 },
    { step: 4, text: 'Retrieving consent-authorized clinical records...', icon: Network },
    { step: 5, text: 'Unified longitudinal timeline ready', icon: Activity },
  ]

  return (
    <div className="relative">
      <motion.div
        className="relative w-80 h-48 rounded-2xl overflow-hidden shadow-2xl cursor-pointer mx-auto border border-slate-700"
        style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 100%)' }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={startScan}
      >
        <div className="absolute inset-0 p-4">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-white to-blue-900" />
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-slate-400 tracking-wider">MALAYSIA</p>
              <p className="text-white font-bold">MyKad</p>
            </div>
            <div className="w-10 h-10 bg-amber-400 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-amber-950" />
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <div className="w-14 h-16 bg-slate-700/80 rounded-lg flex items-center justify-center">
              <Users className="w-7 h-7 text-slate-400" />
            </div>
            <div>
              <p className="text-slate-400 text-[11px]">IC NUMBER</p>
              <p className="text-white font-mono text-base tracking-wider">880101-14-5678</p>
              <p className="text-slate-300 text-xs mt-0.5">AHMAD BIN ABDULLAH</p>
            </div>
          </div>

          <div className="absolute bottom-3.5 left-4 w-9 h-7 bg-gradient-to-br from-yellow-300 to-amber-500 rounded-sm" />
          <div className="absolute bottom-3.5 right-4 text-xs text-cyan-300 flex items-center gap-1">
            <Scan className="w-3.5 h-3.5" />
            Click to simulate scan
          </div>
        </div>

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
                transition={{ duration: 1.2, ease: 'linear' }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {scanned && (
          <motion.div
            className="mt-6 space-y-2 max-w-sm mx-auto"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            {steps.map((item) => {
              const Icon = item.icon
              const completed = queryStep >= item.step
              return (
                <div
                  key={item.step}
                  className={`flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm transition-colors ${
                    completed ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${completed ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span className="font-medium">{item.text}</span>
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function LandingPage() {
  const { language, fontSize, highContrast, setLanguage, setFontSize, toggleHighContrast } = useSettingsStore()
  const t = translations[language]

  const fontScaleClass =
    fontSize === 'xlarge' ? 'text-lg' : fontSize === 'large' ? 'text-base' : 'text-sm'

  const featureCards = [
    {
      icon: Shield,
      title: t.dataSovereigntyTitle,
      desc: t.dataSovereigntyDesc,
      iconBg: 'bg-blue-100 text-blue-600',
    },
    {
      icon: Zap,
      title: t.instantAccessTitle,
      desc: t.instantAccessDesc,
      iconBg: 'bg-emerald-100 text-emerald-600',
    },
    {
      icon: Lock,
      title: t.privacyFirstTitle,
      desc: t.privacyFirstDesc,
      iconBg: 'bg-violet-100 text-violet-600',
    },
    {
      icon: Globe,
      title: t.nationwideTitle,
      desc: t.nationwideDesc,
      iconBg: 'bg-amber-100 text-amber-600',
    },
  ]

  return (
    <div
      className={`min-h-screen transition-colors ${fontScaleClass} ${
        highContrast ? 'bg-slate-950 text-white' : 'bg-gradient-to-b from-slate-50 via-white to-blue-50/40 text-slate-900'
      }`}
    >
      <header
        className={`sticky top-0 z-40 backdrop-blur-xl border-b ${
          highContrast ? 'bg-slate-900/95 border-slate-800' : 'bg-white/85 border-slate-200/70'
        }`}
      >
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-cyan-500 to-emerald-500 flex items-center justify-center shadow-md">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight">{t.appName}</span>
              <span className="hidden sm:inline-block ml-2 text-xs text-slate-500">
                National Medical Identity Network
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-100/70 text-slate-700">
              {(['en', 'ms', 'zh'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase transition-colors ${
                    language === lang ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang === 'zh' ? '中文' : lang.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                setFontSize(fontSize === 'normal' ? 'large' : fontSize === 'large' ? 'xlarge' : 'normal')
              }
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
              title="Cycle text size"
              aria-label="Cycle text size"
            >
              <Type className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={toggleHighContrast}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
              title="Toggle high contrast"
              aria-label="Toggle high contrast"
            >
              {highContrast ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            <Link to="/emergency">
              <Button variant="destructive" size="sm" className="gap-1.5 rounded-xl">
                <Siren className="w-4 h-4" />
                <span className="hidden sm:inline">{t.emergencyAccess}</span>
              </Button>
            </Link>

            <Link to="/about" className="hidden sm:inline-block">
              <Button variant="ghost" size="sm">{t.about}</Button>
            </Link>

            <Link to="/login">
              <Button size="sm" className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
                {t.login}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <Badge className="bg-blue-100 text-blue-700 border-blue-200 px-3.5 py-1 text-xs">
              Federated Healthcare Identity Infrastructure
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
              {t.heroTitle1}{' '}
              <span className="bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500 bg-clip-text text-transparent block mt-1">
                {t.heroTitle2}
              </span>
            </h1>
            <p className={`text-lg leading-relaxed max-w-xl ${highContrast ? 'text-slate-300' : 'text-slate-600'}`}>
              {t.heroSubtitle}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link to="/login">
                <Button size="lg" className="rounded-xl gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg shadow-blue-500/25">
                  {t.getStarted}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/emergency">
                <Button size="lg" variant="outline" className="rounded-xl gap-2 border-red-200 text-red-600 hover:bg-red-50">
                  <Siren className="w-4 h-4" />
                  {t.emergencyAccess}
                </Button>
              </Link>
            </div>
          </div>

          <div>
            <ICCardDemo />
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold">{t.connectedHospitals}</h2>
          <p className={`mt-2 ${highContrast ? 'text-slate-400' : 'text-slate-600'}`}>
            5 Regional Referral Centres Across Peninsular & East Malaysia
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {HOSPITAL_LIST.map((hospital) => (
            <Card
              key={hospital.id}
              className={`border transition-transform hover:-translate-y-1 ${
                highContrast ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200/80'
              }`}
            >
              <div className={`h-1.5 bg-gradient-to-r ${hospital.cardAccentGradient}`} />
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${hospital.badgeClass}`}>
                    {hospital.shortName}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Active
                  </span>
                </div>
                <h3 className="font-bold text-base leading-snug">{hospital.name}</h3>
                <p className={`text-xs mt-1 ${highContrast ? 'text-slate-400' : 'text-slate-500'}`}>
                  {hospital.city}, {hospital.state}
                </p>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>{hospital.bedCount} beds</span>
                  <span>{hospital.departments} depts</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-14">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold">{t.howItWorks}</h2>
          <p className={`mt-2 ${highContrast ? 'text-slate-400' : 'text-slate-600'}`}>{t.howItWorksSubtitle}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { num: '01', title: t.step1Title, desc: t.step1Desc, icon: CreditCard },
            { num: '02', title: t.step2Title, desc: t.step2Desc, icon: Database },
            { num: '03', title: t.step3Title, desc: t.step3Desc, icon: Network },
          ].map((step) => {
            const Icon = step.icon
            return (
              <Card
                key={step.num}
                className={highContrast ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200/80'}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-3xl font-black text-slate-200">{step.num}</span>
                  </div>
                  <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                  <p className={`text-sm leading-relaxed ${highContrast ? 'text-slate-400' : 'text-slate-600'}`}>
                    {step.desc}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      <section className="container mx-auto px-4 py-14">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold">{t.features}</h2>
          <p className={`mt-2 ${highContrast ? 'text-slate-400' : 'text-slate-600'}`}>{t.featuresSubtitle}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {featureCards.map((feat) => {
            const Icon = feat.icon
            return (
              <Card
                key={feat.title}
                className={highContrast ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200/80'}
              >
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${feat.iconBg}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-base mb-2">{feat.title}</h3>
                  <p className={`text-sm leading-relaxed ${highContrast ? 'text-slate-400' : 'text-slate-600'}`}>
                    {feat.desc}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      <section className="container mx-auto px-4 py-14">
        <div className="rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 p-8 sm:p-12 text-white text-center shadow-xl">
          <h2 className="text-3xl font-bold mb-3">{t.ctaTitle}</h2>
          <p className="text-blue-100 max-w-xl mx-auto mb-6">{t.ctaSubtitle}</p>
          <div className="flex flex-wrap justify-center gap-3 mb-8 text-xs font-medium">
            {[t.readOnly, t.auditTrail, t.patientConsent, t.dataEncryption].map((pill) => (
              <span key={pill} className="px-3 py-1.5 rounded-full bg-white/15 border border-white/20">
                {pill}
              </span>
            ))}
          </div>
          <Link to="/login">
            <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50 rounded-xl gap-2">
              {t.loginNow}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200/70 py-8 text-center text-xs text-slate-500">
        <p>{t.appName} &middot; {t.builtFor}</p>
      </footer>
    </div>
  )
}
