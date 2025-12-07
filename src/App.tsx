import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppearanceProvider } from './context/AppearanceContext';
import { AuthPage } from './components/auth/AuthPage';
import { RegistrationSuccessPage } from './components/Auth/RegistrationSuccessPage';
import ForgotPasswordPage from './components/Auth/ForgotPasswordPage';
import ResetPasswordPage from './components/Auth/ResetPasswordPage';
import { Dashboard } from './components/Dashboard/Dashboard';
import { 
  PublicSearch, 
  CityPage, 
  PublicSalonPage, 
  ContactPage,
  AboutPage,
  HowToRegisterSalonPage,
  HowToBookPage,
  HowToCancelPage,
  PrivacyPolicyPage,
  TermsOfServicePage,
  VerifyEmailPage,
  JobAdsPage
} from './components/Public';
import { GoogleAnalytics } from './components/Analytics';

// Login page wrapper
function LoginPage() {
  return <AuthPage mode="login" />;
}

// Register page wrapper
function RegisterPage() {
  return <AuthPage mode="register" />;
}

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function AuthWrapper() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Učitavanje...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes - Available to everyone */}
      <Route path="/" element={<PublicSearch />} />
      <Route path="/pretraga" element={<PublicSearch />} />
      <Route path="/o-nama" element={<AboutPage />} />
      <Route path="/kontakt" element={<ContactPage />} />
      <Route path="/saloni/:citySlug" element={<CityPage />} />
      <Route path="/saloni/:citySlug/:categorySlug" element={<CityPage />} />
      <Route path="/salon/:slug" element={<PublicSalonPage />} />
      
      {/* Help Pages */}
      <Route path="/pomoc/kako-registrovati-salon" element={<HowToRegisterSalonPage />} />
      <Route path="/pomoc/kako-zakazati-termin" element={<HowToBookPage />} />
      <Route path="/pomoc/kako-otkazati-rezervaciju" element={<HowToCancelPage />} />
      
      {/* Job Ads */}
      <Route path="/oglasi-za-posao" element={<JobAdsPage />} />
      <Route path="/politika-privatnosti" element={<PrivacyPolicyPage />} />
      <Route path="/uslovi-koristenja" element={<TermsOfServicePage />} />
      
      {/* Auth Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/prijava" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/registracija" element={<RegisterPage />} />
      <Route path="/registration-success" element={<RegistrationSuccessPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/zaboravljena-lozinka" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      
      {/* Dashboard Route - For logged in users */}
      <Route path="/dashboard/*" element={
        !user ? <AuthPage mode="login" /> : <Dashboard />
      } />
      
      {/* Catch-all - Shows dashboard if logged in, otherwise public search */}
      <Route path="/*" element={
        !user ? <PublicSearch /> : <Dashboard />
      } />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppearanceProvider>
        <GoogleAnalytics />
        <ScrollToTop />
        <AuthWrapper />
      </AppearanceProvider>
    </AuthProvider>
  );
}

export default App;