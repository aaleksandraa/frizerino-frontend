import { useState, useEffect } from 'react';
import { Save, User, Lock, Bell, Shield, Eye, EyeOff, BarChart3, Globe, CheckCircle, XCircle, Palette } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authAPI, adminAPI } from '../../services/api';

interface GradientPreset {
  id: string;
  name: string;
  from: string;
  via?: string;
  to: string;
  direction: string;
}

interface GradientSettings {
  preset?: string;
  from: string;
  via?: string;
  to: string;
  direction: string;
  custom?: boolean;
}

export function AdminSettings() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Profile form
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  
  // Password form
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  
  // Analytics settings
  const [analyticsData, setAnalyticsData] = useState({
    google_analytics_id: '',
    google_analytics_enabled: false,
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  
  // Gradient/Appearance settings
  const [gradientPresets, setGradientPresets] = useState<GradientPreset[]>([]);
  const [currentGradient, setCurrentGradient] = useState<GradientSettings>({
    preset: 'beauty-rose',
    from: '#f43f5e',
    via: '#ec4899',
    to: '#a855f7',
    direction: 'br',
    custom: false
  });
  const [gradientLoading, setGradientLoading] = useState(false);
  const [useCustomGradient, setUseCustomGradient] = useState(false);
  
  // Load analytics settings on mount
  useEffect(() => {
    const loadAnalyticsSettings = async () => {
      try {
        const response = await adminAPI.getSettings('analytics');
        if (response.data) {
          setAnalyticsData({
            google_analytics_id: response.data.google_analytics_id?.value || '',
            google_analytics_enabled: response.data.google_analytics_enabled?.value || false,
          });
        }
      } catch (error) {
        console.error('Failed to load analytics settings:', error);
      }
    };
    
    loadAnalyticsSettings();
  }, []);

  // Load gradient settings on mount
  useEffect(() => {
    const loadGradientSettings = async () => {
      try {
        const response = await adminAPI.getGradientPresets();
        if (response.presets) {
          setGradientPresets(response.presets);
        }
        if (response.current) {
          setCurrentGradient(response.current);
          setUseCustomGradient(response.current.custom || false);
        }
      } catch (error) {
        console.error('Failed to load gradient settings:', error);
      }
    };
    
    loadGradientSettings();
  }, []);

  const handleGradientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGradientLoading(true);
    setMessage(null);
    
    try {
      await adminAPI.updateGradient({
        ...currentGradient,
        custom: useCustomGradient,
      });
      setMessage({ type: 'success', text: 'Gradient postavke su uspješno sačuvane! Osvježite stranicu da vidite promjene.' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Greška prilikom čuvanja gradient postavki.' });
    } finally {
      setGradientLoading(false);
    }
  };

  const selectPreset = (preset: GradientPreset) => {
    setCurrentGradient({
      preset: preset.id,
      from: preset.from,
      via: preset.via,
      to: preset.to,
      direction: preset.direction,
      custom: false
    });
    setUseCustomGradient(false);
  };

  const getGradientStyle = (gradient: { from: string; via?: string; to: string; direction: string }) => {
    const directionMap: Record<string, string> = {
      'r': 'to right',
      'l': 'to left',
      't': 'to top',
      'b': 'to bottom',
      'tr': 'to top right',
      'tl': 'to top left',
      'br': 'to bottom right',
      'bl': 'to bottom left',
    };
    const dir = directionMap[gradient.direction] || 'to right';
    if (gradient.via) {
      return { background: `linear-gradient(${dir}, ${gradient.from}, ${gradient.via}, ${gradient.to})` };
    }
    return { background: `linear-gradient(${dir}, ${gradient.from}, ${gradient.to})` };
  };

  const handleAnalyticsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnalyticsLoading(true);
    setMessage(null);
    
    try {
      await adminAPI.updateSettings([
        { key: 'google_analytics_id', value: analyticsData.google_analytics_id },
        { key: 'google_analytics_enabled', value: analyticsData.google_analytics_enabled },
      ]);
      setMessage({ type: 'success', text: 'Google Analytics podešavanja su uspješno sačuvana!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Greška prilikom čuvanja podešavanja.' });
    } finally {
      setAnalyticsLoading(false);
    }
  };
  
  const testAnalyticsConnection = async () => {
    if (!analyticsData.google_analytics_id) {
      setMessage({ type: 'error', text: 'Unesite Google Analytics Measurement ID.' });
      return;
    }
    
    setTestingConnection(true);
    // Validate GA4 Measurement ID format (G-XXXXXXXXXX)
    const ga4Pattern = /^G-[A-Z0-9]+$/;
    const uaPattern = /^UA-\d+-\d+$/;
    
    if (ga4Pattern.test(analyticsData.google_analytics_id)) {
      setMessage({ type: 'success', text: 'Validan GA4 Measurement ID format. Unesite ID i omogućite praćenje.' });
    } else if (uaPattern.test(analyticsData.google_analytics_id)) {
      setMessage({ type: 'success', text: 'Validan Universal Analytics ID format (UA). Preporučujemo prelazak na GA4.' });
    } else {
      setMessage({ type: 'error', text: 'Nevažeći format ID-a. GA4 format: G-XXXXXXXXXX' });
    }
    setTestingConnection(false);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    
    try {
      const success = await updateUser(profileData);
      if (success) {
        setMessage({ type: 'success', text: 'Profil je uspješno ažuriran!' });
      } else {
        setMessage({ type: 'error', text: 'Greška prilikom ažuriranja profila.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Došlo je do greške.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.password !== passwordData.password_confirmation) {
      setMessage({ type: 'error', text: 'Lozinke se ne podudaraju.' });
      return;
    }
    
    if (passwordData.password.length < 8) {
      setMessage({ type: 'error', text: 'Lozinka mora imati najmanje 8 karaktera.' });
      return;
    }
    
    setLoading(true);
    setMessage(null);
    
    try {
      await authAPI.changePassword(passwordData.current_password, passwordData.password);
      setMessage({ type: 'success', text: 'Lozinka je uspješno promijenjena!' });
      setPasswordData({ current_password: '', password: '', password_confirmation: '' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.response?.data?.message || 'Greška prilikom promjene lozinke.' });
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'security', label: 'Sigurnost', icon: Lock },
    { id: 'appearance', label: 'Izgled', icon: Palette },
    { id: 'notifications', label: 'Obavještenja', icon: Bell },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Podešavanja</h1>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div className="flex items-center gap-6 mb-8">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                  <Shield className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{user?.name}</h3>
                  <p className="text-gray-600">Administrator</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ime i prezime</label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+387 61 123 456"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Čuvanje...' : 'Sačuvaj promjene'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'security' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-6 max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Promjena lozinke</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Trenutna lozinka</label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nova lozinka</label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordData.password}
                    onChange={(e) => setPasswordData({ ...passwordData, password: e.target.value })}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Potvrdi novu lozinku</label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordData.password_confirmation}
                    onChange={(e) => setPasswordData({ ...passwordData, password_confirmation: e.target.value })}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  {loading ? 'Čuvanje...' : 'Promijeni lozinku'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Podešavanja obavještenja</h3>
              
              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <div>
                    <span className="font-medium text-gray-900 block">Email obavještenja</span>
                    <span className="text-sm text-gray-600">Primaj obavještenja putem emaila</span>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
                
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <div>
                    <span className="font-medium text-gray-900 block">Novi saloni</span>
                    <span className="text-sm text-gray-600">Obavijesti me kada se registruje novi salon</span>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
                
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <div>
                    <span className="font-medium text-gray-900 block">Novi korisnici</span>
                    <span className="text-sm text-gray-600">Obavijesti me kada se registruje novi korisnik</span>
                  </div>
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
                
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <div>
                    <span className="font-medium text-gray-900 block">Sistemska upozorenja</span>
                    <span className="text-sm text-gray-600">Primaj kritična sistemska upozorenja</span>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <form onSubmit={handleAnalyticsSubmit} className="space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Google Analytics</h3>
                  <p className="text-sm text-gray-600">Pratite posjete i ponašanje korisnika na stranici</p>
                </div>
              </div>
              
              {/* Status indicator */}
              <div className={`flex items-center gap-2 p-4 rounded-lg ${
                analyticsData.google_analytics_enabled && analyticsData.google_analytics_id 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-gray-50 border border-gray-200'
              }`}>
                {analyticsData.google_analytics_enabled && analyticsData.google_analytics_id ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-green-700 font-medium">Google Analytics je aktivan</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-600">Google Analytics nije konfigurisan</span>
                  </>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Measurement ID (Tracking ID)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={analyticsData.google_analytics_id}
                      onChange={(e) => setAnalyticsData({ ...analyticsData, google_analytics_id: e.target.value.toUpperCase() })}
                      placeholder="G-XXXXXXXXXX"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                    />
                    <button
                      type="button"
                      onClick={testAnalyticsConnection}
                      disabled={testingConnection}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      {testingConnection ? 'Provjera...' : 'Provjeri'}
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Pronađite Measurement ID u Google Analytics → Admin → Data Streams → Web stream
                  </p>
                </div>

                <div className="border-t pt-4">
                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <div>
                      <span className="font-medium text-gray-900 block">Omogući praćenje</span>
                      <span className="text-sm text-gray-600">Aktiviraj Google Analytics na svim stranicama</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={analyticsData.google_analytics_enabled}
                      onChange={(e) => setAnalyticsData({ ...analyticsData, google_analytics_enabled: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                </div>

                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-blue-900 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Kako postaviti Google Analytics
                  </h4>
                  <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                    <li>Idite na <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">analytics.google.com</a></li>
                    <li>Kreirajte novi "Property" za vašu stranicu</li>
                    <li>Odaberite "Web" kao platformu</li>
                    <li>Kopirajte Measurement ID (počinje sa G-)</li>
                    <li>Zalijepite ID gore i omogućite praćenje</li>
                  </ol>
                </div>

                {/* What we track */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Šta se prati:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Broj posjeta i jedinstvenih posjetilaca</li>
                    <li>• Koje stranice posjetitelji gledaju</li>
                    <li>• Koliko vremena provode na stranici</li>
                    <li>• Odakle dolaze posjetitelji (pretraživači, društvene mreže)</li>
                    <li>• Koji uređaji i preglednici se koriste</li>
                    <li>• Konverzije (rezervacije termina)</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <button
                  type="submit"
                  disabled={analyticsLoading}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {analyticsLoading ? 'Čuvanje...' : 'Sačuvaj podešavanja'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'appearance' && (
            <form onSubmit={handleGradientSubmit} className="space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={getGradientStyle(currentGradient)}
                >
                  <Palette className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Izgled stranice</h3>
                  <p className="text-sm text-gray-600">Prilagodite boje i gradient na početnoj stranici</p>
                </div>
              </div>

              {/* Current gradient preview */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Trenutni gradient (pregled)</label>
                <div 
                  className="h-32 rounded-xl shadow-inner flex items-center justify-center"
                  style={getGradientStyle(currentGradient)}
                >
                  <span className="text-white font-bold text-xl drop-shadow-lg">Frizerino</span>
                </div>
              </div>

              {/* Presets */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Predefinisane teme</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {gradientPresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => selectPreset(preset)}
                      className={`relative h-20 rounded-xl overflow-hidden transition-all ${
                        currentGradient.preset === preset.id && !useCustomGradient
                          ? 'ring-4 ring-blue-500 ring-offset-2'
                          : 'hover:scale-105'
                      }`}
                      style={getGradientStyle(preset)}
                    >
                      <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-medium drop-shadow-lg">
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom gradient toggle */}
              <div className="border-t pt-4">
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <div>
                    <span className="font-medium text-gray-900 block">Prilagođeni gradient</span>
                    <span className="text-sm text-gray-600">Kreirajte vlastitu kombinaciju boja</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={useCustomGradient}
                    onChange={(e) => setUseCustomGradient(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              </div>

              {/* Custom gradient options */}
              {useCustomGradient && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Početna boja</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={currentGradient.from}
                          onChange={(e) => setCurrentGradient({ ...currentGradient, from: e.target.value, custom: true })}
                          className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={currentGradient.from}
                          onChange={(e) => setCurrentGradient({ ...currentGradient, from: e.target.value, custom: true })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                          placeholder="#f43f5e"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Srednja boja (opcionalno)</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={currentGradient.via || '#ec4899'}
                          onChange={(e) => setCurrentGradient({ ...currentGradient, via: e.target.value, custom: true })}
                          className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={currentGradient.via || ''}
                          onChange={(e) => setCurrentGradient({ ...currentGradient, via: e.target.value || undefined, custom: true })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                          placeholder="#ec4899"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Završna boja</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={currentGradient.to}
                          onChange={(e) => setCurrentGradient({ ...currentGradient, to: e.target.value, custom: true })}
                          className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={currentGradient.to}
                          onChange={(e) => setCurrentGradient({ ...currentGradient, to: e.target.value, custom: true })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                          placeholder="#a855f7"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Smjer gradienta</label>
                    <select
                      value={currentGradient.direction}
                      onChange={(e) => setCurrentGradient({ ...currentGradient, direction: e.target.value, custom: true })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="r">Desno →</option>
                      <option value="l">Lijevo ←</option>
                      <option value="t">Gore ↑</option>
                      <option value="b">Dolje ↓</option>
                      <option value="br">Dolje desno ↘</option>
                      <option value="bl">Dolje lijevo ↙</option>
                      <option value="tr">Gore desno ↗</option>
                      <option value="tl">Gore lijevo ↖</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t">
                <button
                  type="submit"
                  disabled={gradientLoading}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {gradientLoading ? 'Čuvanje...' : 'Sačuvaj izgled'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
