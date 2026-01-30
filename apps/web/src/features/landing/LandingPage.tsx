import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useState } from 'react';

// Feature Card Component
function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}

// FAQ Item Component
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-gray-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-4 flex justify-between items-center text-left"
      >
        <span className="font-medium text-gray-900">{question}</span>
        <span className="text-gray-500 text-xl">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && (
        <div className="pb-4 text-gray-600 text-sm">
          {answer}
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'es' ? 'en' : 'es');
  };

  const features = [
    { icon: '📱', titleKey: 'landing.features.qr.title', descKey: 'landing.features.qr.desc' },
    { icon: '📍', titleKey: 'landing.features.geo.title', descKey: 'landing.features.geo.desc' },
    { icon: '📶', titleKey: 'landing.features.offline.title', descKey: 'landing.features.offline.desc' },
    { icon: '✅', titleKey: 'landing.features.approvals.title', descKey: 'landing.features.approvals.desc' },
    { icon: '📄', titleKey: 'landing.features.reports.title', descKey: 'landing.features.reports.desc' },
    { icon: '🌍', titleKey: 'landing.features.languages.title', descKey: 'landing.features.languages.desc' },
  ];

  const faqs = [
    { qKey: 'landing.faq.legal.q', aKey: 'landing.faq.legal.a' },
    { qKey: 'landing.faq.offline.q', aKey: 'landing.faq.offline.a' },
    { qKey: 'landing.faq.data.q', aKey: 'landing.faq.data.a' },
    { qKey: 'landing.faq.plan.q', aKey: 'landing.faq.plan.a' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">TT</span>
              </div>
              <span className="font-bold text-xl text-gray-900">Torre Tempo</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                {t('landing.nav.features')}
              </a>
              <a href="#faq" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                {t('landing.nav.faq')}
              </a>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={toggleLanguage}
                className="text-sm text-gray-600 hover:text-gray-900 font-medium"
              >
                {i18n.language === 'es' ? 'EN' : 'ES'}
              </button>
              <Link
                to="/login"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                {t('landing.nav.login')}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-block bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            {t('landing.internal.badge')}
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            {t('landing.hero.title')}
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            {t('landing.hero.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/login"
              className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30"
            >
              {t('landing.internal.staffLogin')}
            </Link>
            <a
              href="#features"
              className="bg-white text-gray-900 px-8 py-4 rounded-lg text-lg font-medium hover:bg-gray-50 transition-colors border border-gray-200"
            >
              {t('landing.hero.demo')}
            </a>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-8 border-y border-gray-100 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-6 sm:gap-12 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>RD-Ley 8/2019</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>RGPD</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>{t('landing.trust.retention')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>{t('landing.trust.noBiometrics')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t('landing.features.title')}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t('landing.features.subtitle')}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <FeatureCard
                key={i}
                icon={f.icon}
                title={t(f.titleKey)}
                description={t(f.descKey)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t('landing.howItWorks.title')}
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{t('landing.howItWorks.step1.title')}</h3>
              <p className="text-gray-600 text-sm">{t('landing.howItWorks.step1.desc')}</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">2</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{t('landing.howItWorks.step2.title')}</h3>
              <p className="text-gray-600 text-sm">{t('landing.howItWorks.step2.desc')}</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">3</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{t('landing.howItWorks.step3.title')}</h3>
              <p className="text-gray-600 text-sm">{t('landing.howItWorks.step3.desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t('landing.faq.title')}
            </h2>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            {faqs.map((faq, i) => (
              <FAQItem
                key={i}
                question={t(faq.qKey)}
                answer={t(faq.aKey)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            {t('landing.cta.title')}
          </h2>
          <p className="text-blue-100 text-lg mb-8">
            {t('landing.cta.subtitle')}
          </p>
          <Link
            to="/login"
            className="inline-block bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-medium hover:bg-blue-50 transition-colors"
          >
            {t('landing.nav.login')}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">TT</span>
                </div>
                <span className="font-bold text-xl text-white">Torre Tempo</span>
              </div>
              <p className="text-gray-400 text-sm">
                {t('landing.footer.tagline')}
              </p>
              <p className="text-blue-400 text-sm mt-2 font-medium">
                {t('landing.internal.badge')}
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">{t('landing.footer.product')}</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#features" className="hover:text-white">{t('landing.nav.features')}</a></li>
                <li><a href="#faq" className="hover:text-white">{t('landing.nav.faq')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">{t('landing.footer.legal')}</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white">{t('landing.footer.privacy')}</a></li>
                <li><a href="#" className="hover:text-white">{t('landing.footer.terms')}</a></li>
                <li><a href="#" className="hover:text-white">{t('landing.footer.cookies')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">{t('landing.footer.contact')}</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>info@lsltgroup.es</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-gray-400 text-sm text-center sm:text-left">
              <p>© 2026 LSLT Group | Developed by John McBride</p>
            </div>
            <button 
              onClick={toggleLanguage}
              className="text-gray-400 hover:text-white text-sm"
            >
              {i18n.language === 'es' ? '🇬🇧 English' : '🇪🇸 Español'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
