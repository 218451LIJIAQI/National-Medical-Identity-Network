import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Shield, Zap, Globe, Users, Building2, ArrowRight, MapPin } from 'lucide-react'
import { useTranslation, type Language } from '@/lib/i18n'
import { hospitalThemes } from '@/lib/hospital-themes'
import { cn } from '@/lib/utils'

const HOSPITALS = Object.values(hospitalThemes)

export default function AboutPage() {
  const { t, language, setLanguage } = useTranslation()

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-6">
      <div className="container mx-auto max-w-5xl space-y-8">
        <div className="flex items-center justify-between">
          <Link to="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t.backToHome}
            </Button>
          </Link>

          <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-slate-200">
            {(['en', 'ms', 'zh'] as Language[]).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={cn(
                  'px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors',
                  language === lang ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                )}
              >
                {lang === 'en' ? 'EN' : lang === 'ms' ? 'BM' : '中文'}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-sm">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">{t.appName}</h1>
                  <p className="text-xs font-semibold text-blue-700">{t.pdpaComplianceBadge}</p>
                </div>
              </div>
              <p className="text-base text-slate-700 leading-relaxed">{t.heroSubtitle}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="success">Federated Multi-DB</Badge>
              <Badge variant="info">{t.readOnly}</Badge>
              <Badge variant="warning">{t.auditTrail}</Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {[
            { icon: Shield, title: t.dataSovereigntyTitle, desc: t.dataSovereigntyDesc },
            { icon: Zap, title: t.instantAccessTitle, desc: t.instantAccessDesc },
            { icon: Users, title: t.privacyFirstTitle, desc: t.privacyFirstDesc },
            { icon: Globe, title: t.nationwideTitle, desc: t.nationwideDesc },
          ].map((feature) => (
            <Card key={feature.title} className="border border-slate-200 shadow-sm">
              <CardContent className="p-6 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
                  <feature.icon className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">{feature.title}</h2>
                <p className="text-sm text-slate-600 leading-relaxed">{feature.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-xl font-bold text-slate-900">{t.connectedHospitals}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {HOSPITALS.map((h) => (
                <div
                  key={h.id}
                  className={cn('p-3.5 rounded-xl border', h.bgLight, h.borderColor)}
                >
                  <p className="text-xs font-bold text-slate-900">{h.name}</p>
                  <p className="text-[11px] text-slate-600 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span>{h.city}</span>
                  </p>
                  <p className="text-[11px] font-mono font-semibold text-slate-700 mt-2">
                    {h.code} • {h.departments} depts
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="text-center pt-2">
          <Link to="/login">
            <Button size="lg" className="px-8">
              {t.loginNow}
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
