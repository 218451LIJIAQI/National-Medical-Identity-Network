import { Outlet, Navigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useTranslation, type Language } from '@/lib/i18n'
import { getRoleHomePath, cn } from '@/lib/utils'
import { Building2, Shield, Zap, Globe, Lock, Siren, Loader2 } from 'lucide-react'

export default function AuthLayout() {
  const { isAuthenticated, user, isHospitalVerified, _hasHydrated } = useAuthStore()
  const { t, language, setLanguage } = useTranslation()

  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-sm font-semibold text-slate-700">Loading MedLink MY…</span>
        </div>
      </div>
    )
  }

  if (isAuthenticated && user) {
    return <Navigate to={getRoleHomePath(user.role, isHospitalVerified)} replace />
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Institutional Panel — Optimized for 1280×720 up to 1920×1080 */}
      <div className="w-[45%] min-w-[420px] max-w-[640px] bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 px-10 py-8 flex flex-col justify-between relative overflow-hidden text-white border-r border-slate-800">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 bg-blue-600/30 rounded-xl flex items-center justify-center border border-blue-400/30 shadow-md group-hover:bg-blue-600/40 transition-colors">
              <Building2 className="w-6 h-6 text-cyan-300" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">{t.appName}</h1>
              <p className="text-slate-300 text-xs">{t.builtFor}</p>
            </div>
          </Link>

          <div className="flex items-center gap-1 rounded-xl bg-white/10 p-1 border border-white/15">
            {(['en', 'ms', 'zh'] as Language[]).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={cn(
                  'px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors',
                  language === lang
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-200 hover:bg-white/10'
                )}
              >
                {lang === 'en' ? 'EN' : lang === 'ms' ? 'BM' : '中文'}
              </button>
            ))}
          </div>
        </div>

        <div className="relative z-10 my-auto py-6 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-cyan-200 text-xs font-semibold">
            <Shield className="w-3.5 h-3.5" />
            <span>{t.pdpaComplianceBadge}</span>
          </div>

          <div>
            <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight">
              {t.heroTitle1}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-emerald-300 block mt-1">
                {t.heroTitle2}
              </span>
            </h2>
            <p className="mt-3 text-slate-300 text-sm xl:text-base leading-relaxed max-w-md">
              {t.heroSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            {[
              { value: '5 Nodes', label: t.connectedHospitals, icon: Globe },
              { value: '< 1.0s', label: t.instantAccessTitle, icon: Zap },
              { value: '100%', label: t.dataSovereigntyTitle, icon: Shield },
              { value: 'Zero-Trust', label: t.readOnly, icon: Lock },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white/[0.07] backdrop-blur-sm rounded-xl p-4 border border-white/10"
              >
                <div className="flex items-center gap-2 mb-1">
                  <stat.icon className="w-4 h-4 text-cyan-300 shrink-0" />
                  <span className="text-lg font-bold text-white tabular-nums">{stat.value}</span>
                </div>
                <div className="text-slate-300 text-xs font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between gap-4 text-xs text-slate-300">
          <span>KL • Penang • Johor Bahru • Kuching • Kota Kinabalu</span>
          <Link
            to="/emergency"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-400/30 text-red-200 hover:bg-red-500/30 font-semibold transition-colors shrink-0"
          >
            <Siren className="w-3.5 h-3.5" />
            <span>{t.emergencyAccess}</span>
          </Link>
        </div>
      </div>

      {/* Right Authentication Workspace */}
      <div className="flex-1 flex items-center justify-center p-6 xl:p-10 overflow-y-auto">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
