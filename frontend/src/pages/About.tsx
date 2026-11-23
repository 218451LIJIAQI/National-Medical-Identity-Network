import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Shield, Zap, Globe, Users, Building2, Sparkles, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { useTranslation } from '@/lib/i18n'

export default function AboutPage() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-cyan-50/30 py-12 px-4 relative overflow-hidden">
      <motion.div
        className="container mx-auto max-w-4xl relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Link to="/">
          <Button variant="ghost" className="mb-8 rounded-xl hover:bg-white/60">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t.backToHome}
          </Button>
        </Link>

        <div className="space-y-10">
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 mb-5">
              <div className="relative w-16 h-16 bg-gradient-to-br from-blue-500 via-cyan-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-xl">
                <Building2 className="w-9 h-9 text-white" />
                <Sparkles className="w-4 h-4 text-amber-300 absolute -top-1 -right-1" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-cyan-700 bg-clip-text text-transparent">
                {t.appName}
              </h1>
            </div>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              {t.heroSubtitle}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
              <Badge variant="success" className="px-4 py-1.5">Federated Architecture</Badge>
              <Badge variant="info" className="px-4 py-1.5">{t.privacyFirstTitle}</Badge>
              <Badge className="border-purple-200 bg-purple-50 text-purple-700 px-4 py-1.5">{t.instantAccessTitle}</Badge>
            </div>
          </div>

          <Card className="border-0 shadow-lg overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500" />
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-3 text-gray-900">Why National Medical Identity Matters</h2>
              <p className="text-gray-600 mb-4">
                Citizens frequently visit multiple hospitals across states. Siloed hospital databases cause:
              </p>
              <ul className="space-y-2.5 text-gray-600 text-sm">
                {[
                  'Incomplete medical & allergy history during acute consultations',
                  'Redundant pathology & diagnostic imaging procedures',
                  'Preventable adverse drug-drug and drug-allergy reactions',
                  'Critical delays during incapacitated emergency care',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-red-500 rounded-full shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: Shield, title: t.dataSovereigntyTitle, desc: t.dataSovereigntyDesc },
              { icon: Zap, title: t.instantAccessTitle, desc: t.instantAccessDesc },
              { icon: Users, title: t.privacyFirstTitle, desc: t.privacyFirstDesc },
              { icon: Globe, title: t.nationwideTitle, desc: t.nationwideDesc },
            ].map((feature) => (
              <Card key={feature.title} className="border-0 shadow-md">
                <CardContent className="p-6 space-y-2">
                  <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center pt-4">
            <Link to="/login">
              <Button size="lg" className="rounded-xl px-8 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold">
                {t.loginNow}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
