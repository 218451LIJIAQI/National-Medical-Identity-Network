import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/ui/modal-dialog'
import {
  Building2,
  Shield,
  Users,
  ArrowRight,
  CheckCircle2,
  Lock,
  CreditCard,
  Scan,
  Type,
  Eye,
  Database,
  Network,
  Activity,
  Siren,
  MapPin,
} from 'lucide-react'
import { useSettingsStore } from '@/store/settings'
import { useTranslation, type Language } from '@/lib/i18n'
import { hospitalThemes } from '@/lib/hospital-themes'
import { cn } from '@/lib/utils'

const HOSPITALS = Object.values(hospitalThemes)

function ICCardInteractiveDemo() {
  const [scanning, setScanning] = useState(false)
  const [queryStep, setQueryStep] = useState(0)
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([])

  const clearTimers = () => {
    timersRef.current.forEach((id) => clearTimeout(id))
    timersRef.current = []
  }

  useEffect(() => clearTimers, [])

  const startScan = () => {
    clearTimers()
    setScanning(true)
    setQueryStep(0)

    timersRef.current.push(
      setTimeout(() => {
        setScanning(false)
        for (let s = 1; s <= 4; s++) {
          timersRef.current.push(
            setTimeout(() => {
              setQueryStep(s)
            }, (s - 1) * 550)
          )
        }
      }, 900)
    )
  }

  const traceSteps = [
    { step: 1, text: 'MyKad 12-Digit Identity Verified (880101-14-5678)', icon: CheckCircle2 },
    { step: 2, text: 'Central Index Resolved: 3 Participating Hospitals', icon: Database },
    { step: 3, text: 'Parallel Federated Query Dispatched (Read-Only)', icon: Network },
    { step: 4, text: 'Unified Longitudinal Clinical Timeline Ready (0.4s)', icon: Activity },
  ]

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
            Interactive Federated Simulation
          </p>
          <h3 className="text-base font-bold text-slate-900">Tap MyKad Smart Card</h3>
        </div>
        <StatusBadge tone="success" label="5 Nodes Online" />
      </div>

      <button
        type="button"
        onClick={startScan}
        className="relative w-full h-48 rounded-2xl overflow-hidden text-left shadow-md border border-slate-800 transition-transform hover:scale-[1.01] focus-visible:ring-2 focus-visible:ring-blue-600"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)' }}
      >
        <div className="h-1.5 bg-gradient-to-r from-red-600 via-white to-blue-800" />
        <div className="p-5 flex flex-col justify-between h-[calc(100%-6px)]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] text-slate-300 font-semibold tracking-widest">
                MALAYSIA IDENTITY CARD
              </p>
              <p className="text-white font-bold text-lg">MyKad • MedLink MY</p>
            </div>
            <div className="w-11 h-9 bg-gradient-to-br from-amber-300 to-amber-500 rounded-md flex items-center justify-center shadow">
              <CreditCard className="w-5 h-5 text-amber-950" />
            </div>
          </div>

          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] text-slate-300">IDENTITY NUMBER</p>
              <p className="text-white font-mono text-xl font-bold tracking-wider tabular-nums">
                880101-14-5678
              </p>
              <p className="text-slate-200 text-xs font-semibold mt-0.5">AHMAD BIN ABDULLAH</p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-400/20 border border-cyan-300/30 text-xs font-semibold text-cyan-200">
              <Scan className="w-3.5 h-3.5" />
              {scanning ? 'Reading Chip…' : 'Simulate Scan'}
            </span>
          </div>
        </div>
      </button>

      <div className="mt-5 space-y-2">
        {traceSteps.map((item) => {
          const active = queryStep >= item.step
          const Icon = item.icon
          return (
            <div
              key={item.step}
              className={cn(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-colors',
                active
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-slate-50 border-slate-200/80 text-slate-500'
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-emerald-700' : 'text-slate-400')} />
              <span>{item.text}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function LandingPageV2() {
  const { fontSize, setFontSize, highContrast, toggleHighContrast } = useSettingsStore()
  const { t, language, setLanguage } = useTranslation()

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Sticky Desktop Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-slate-900 block leading-tight">
                {t.appName}
              </span>
              <span className="text-xs text-slate-600 font-medium block leading-tight">
                {t.builtFor}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/about"
              className="px-3 py-1.5 text-sm font-semibold text-slate-700 hover:text-blue-700 rounded-lg hover:bg-slate-100 transition-colors"
            >
              {t.about}
            </Link>

            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 border border-slate-200">
              {(['en', 'ms', 'zh'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className={cn(
                    'px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors',
                    language === lang
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-700 hover:bg-white'
                  )}
                >
                  {lang === 'en' ? 'EN' : lang === 'ms' ? 'BM' : '中文'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                setFontSize(fontSize === 'normal' ? 'large' : fontSize === 'large' ? 'xlarge' : 'normal')
              }
              title={t.fontScaleLabel}
              aria-label={t.fontScaleLabel}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700"
            >
              <Type className="w-4 h-4" />
              <span>{fontSize === 'normal' ? 'A' : fontSize === 'large' ? 'A+' : 'A++'}</span>
            </button>

            <button
              type="button"
              onClick={toggleHighContrast}
              aria-pressed={highContrast}
              title={t.highContrastLabel}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors',
                highContrast
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              )}
            >
              <Eye className="w-4 h-4" />
              <span>{t.highContrastLabel}</span>
            </button>

            <Link to="/emergency">
              <Button
                variant="outline"
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-50 gap-1.5"
              >
                <Siren className="w-4 h-4" />
                <span>{t.emergencyAccess}</span>
              </Button>
            </Link>

            <Link to="/login">
              <Button size="sm" className="px-5">
                <span>{t.login}</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-6 bg-gradient-to-b from-white via-blue-50/40 to-slate-50 border-b border-slate-200/80">
        <div className="container mx-auto grid grid-cols-12 gap-12 items-center">
          <div className="col-span-7 space-y-6">
            <Badge variant="success" className="px-3.5 py-1 text-xs">
              <Shield className="w-3.5 h-3.5 mr-1.5" />
              {t.pdpaComplianceBadge}
            </Badge>

            <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.12]">
              {t.heroTitle1}{' '}
              <span className="block text-blue-700 mt-1">{t.heroTitle2}</span>
            </h1>

            <p className="text-base xl:text-lg text-slate-700 max-w-2xl leading-relaxed">
              {t.heroSubtitle}
            </p>

            <div className="flex items-center gap-4 pt-2">
              <Link to="/login">
                <Button size="lg" className="gap-2 px-7">
                  <span>{t.getStarted}</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/emergency">
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 border-red-300 text-red-700 hover:bg-red-50"
                >
                  <Siren className="w-4 h-4" />
                  <span>{t.emergencyAccess}</span>
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200 max-w-xl">
              <div>
                <p className="text-2xl font-extrabold text-slate-900 tabular-nums">5</p>
                <p className="text-xs font-semibold text-slate-600">{t.connectedHospitals}</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900 tabular-nums">&lt; 1.0s</p>
                <p className="text-xs font-semibold text-slate-600">{t.instantAccessTitle}</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900 tabular-nums">100%</p>
                <p className="text-xs font-semibold text-slate-600">{t.dataSovereigntyTitle}</p>
              </div>
            </div>
          </div>

          <div className="col-span-5">
            <ICCardInteractiveDemo />
          </div>
        </div>
      </section>

      {/* Connected 5 Tertiary Hospitals */}
      <section className="py-16 px-6">
        <div className="container mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <Badge variant="info" className="mb-3">
              <Network className="w-3.5 h-3.5 mr-1" />
              Federated Regional Nodes
            </Badge>
            <h2 className="text-3xl font-bold text-slate-900">{t.connectedHospitals}</h2>
            <p className="text-sm text-slate-600 mt-2">{t.nationwideDesc}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {HOSPITALS.map((hospital) => (
              <Card
                key={hospital.id}
                className="relative overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white"
              >
                <div className={cn('h-1.5 bg-gradient-to-r', hospital.buttonGradient)} />
                <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-sm',
                          hospital.buttonGradient
                        )}
                      >
                        <Building2 className="w-5 h-5" />
                      </div>
                      <Badge variant="outline" className={hospital.badgeClass}>
                        {hospital.code}
                      </Badge>
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 leading-snug">
                      {hospital.name}
                    </h3>
                    <p className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span>{hospital.city}</span>
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium tabular-nums">
                      {hospital.bedCount.toLocaleString()} beds
                    </span>
                    <StatusBadge tone="success" label="Online" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How Federated Architecture Works & Security Pillars */}
      <section className="py-16 px-6 bg-white border-y border-slate-200">
        <div className="container mx-auto grid grid-cols-12 gap-10 items-start">
          <div className="col-span-5 space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">{t.howItWorks}</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{t.howItWorksSubtitle}</p>
            <div className="space-y-3 pt-2">
              {[
                { step: 1, title: t.step1Title, desc: t.step1Desc, icon: CreditCard },
                { step: 2, title: t.step2Title, desc: t.step2Desc, icon: Database },
                { step: 3, title: t.step3Title, desc: t.step3Desc, icon: Network },
              ].map((s) => (
                <div
                  key={s.step}
                  className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-50 border border-slate-200"
                >
                  <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    0{s.step}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{s.title}</h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-7 space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">{t.securityByDesign}</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{t.securityByDesignDesc}</p>
            <div className="grid grid-cols-2 gap-4 pt-2">
              {[
                { icon: Shield, title: t.dataSovereigntyTitle, desc: t.dataSovereigntyDesc },
                { icon: Activity, title: t.instantAccessTitle, desc: t.instantAccessDesc },
                { icon: Lock, title: t.privacyFirstTitle, desc: t.privacyFirstDesc },
                { icon: Users, title: t.auditTrail, desc: 'Every clinical query, consent update, and emergency break-glass event is recorded.' },
              ].map((item) => (
                <Card key={item.title} className="border border-slate-200 shadow-sm">
                  <CardContent className="p-5 space-y-2">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
                      <item.icon className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-900">{item.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 bg-slate-900 text-slate-300">
        <div className="container mx-auto flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-white">{t.appName}</p>
              <p className="text-xs text-slate-400">{t.pdpaComplianceBadge}</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs font-semibold">
            <Link to="/about" className="hover:text-white transition-colors">
              {t.about}
            </Link>
            <Link to="/emergency" className="text-red-300 hover:text-red-200 transition-colors">
              {t.emergencyAccess}
            </Link>
            <Link to="/login" className="hover:text-white transition-colors">
              {t.login}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
