import { useState, useEffect, useRef } from 'react';
import { Save, User, Lock, Bell, Calendar, Eye, EyeOff, CheckCircle, Camera } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authAPI, staffAPI } from '../../services/api';

export function FrizerSettings() {
  const { user, updateUser, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.staff_profile?.avatar_url || null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Profile form
  const [profileData, setProfileData] = useState<{
    name: string;
    email: string;
    phone: string;
    city: string;
    date_of_birth: string;
    gender: 'male' | 'female' | 'other' | '';
  }>({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    city: user?.city || '',
    date_of_birth: user?.date_of_birth || '',
    gender: user?.gender || '',
  });
  
  // Settings form
  const [autoConfirm, setAutoConfirm] = useState(user?.staff_profile?.auto_confirm || false);
  
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

  useEffect(() => {
    if (user) {
      // Sync profile data
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        city: user.city || '',
        date_of_birth: user.date_of_birth || '',
        gender: user.gender || '',
      });
    }
    if (user?.staff_profile) {
      setAutoConfirm(user.staff_profile.auto_confirm || false);
      // Sync avatar URL when user data changes - only update if there's a new value
      // Don't reset to null if avatar_url is missing (could be a temporary state)
      const newAvatarUrl = user.staff_profile.avatar_url;
      if (newAvatarUrl) {
        setAvatarUrl(newAvatarUrl);
      }
    }
  }, [user]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      setMessage({ type: 'error', text: 'Dozvoljeni su samo JPEG i PNG formati.' });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Slika ne smije biti veća od 2MB.' });
      return;
    }

    if (!user?.staff_profile?.salon_id || !user?.staff_profile?.id) {
      setMessage({ type: 'error', text: 'Greška: Nedostaju podaci o profilu.' });
      return;
    }

    setUploadingAvatar(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const result = await staffAPI.uploadAvatar(
        user.staff_profile.salon_id,
        user.staff_profile.id,
        formData
      );
      
      // Set the avatar URL immediately from the response
      const newAvatarUrl = result.avatar_url;
      if (newAvatarUrl) {
        setAvatarUrl(newAvatarUrl);
      }
      
      // Refresh user data to update context
      await refreshUser();
      
      setMessage({ type: 'success', text: 'Profilna slika je uspješno ažurirana!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.response?.data?.message || 'Greška prilikom uploada slike.' });
    } finally {
      setUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    
    try {
      const dataToSend: Partial<{
        name: string;
        email: string;
        phone: string;
        city: string;
        date_of_birth: string;
        gender: 'male' | 'female' | 'other';
      }> = {
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
        city: profileData.city,
        date_of_birth: profileData.date_of_birth,
      };
      
      // Only include gender if it's a valid value
      if (profileData.gender) {
        dataToSend.gender = profileData.gender as 'male' | 'female' | 'other';
      }
      
      const success = await updateUser(dataToSend);
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

  const handleAutoConfirmChange = async (value: boolean) => {
    setLoading(true);
    setMessage(null);
    
    try {
      await staffAPI.updateOwnSettings({ auto_confirm: value });
      setAutoConfirm(value);
      // Refresh user data to get updated staff_profile
      await refreshUser();
      setMessage({ type: 'success', text: value 
        ? 'Auto-potvrda je uključena! Novi termini će biti automatski potvrđeni.' 
        : 'Auto-potvrda je isključena. Morat ćete ručno potvrditi termine.' 
      });
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.response?.data?.message || 'Greška prilikom ažuriranja postavki.' });
      // Revert the UI state
      setAutoConfirm(!value);
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
    { id: 'appointments', label: 'Termini', icon: Calendar },
    { id: 'security', label: 'Sigurnost', icon: Lock },
    { id: 'notifications', label: 'Obavještenja', icon: Bell },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Podešavanja</h1>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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
                {/* Avatar with upload */}
                <div className="relative">
                  <div 
                    onClick={handleAvatarClick}
                    className={`w-20 h-20 rounded-full flex items-center justify-center cursor-pointer overflow-hidden border-2 border-transparent hover:border-purple-400 transition-all ${
                      uploadingAvatar ? 'opacity-50' : ''
                    }`}
                  >
                    {avatarUrl ? (
                      <img 
                        src={avatarUrl} 
                        alt={user?.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                        <User className="w-10 h-10 text-white" />
                      </div>
                    )}
                  </div>
                  
                  {/* Camera icon overlay */}
                  <button
                    type="button"
                    onClick={handleAvatarClick}
                    disabled={uploadingAvatar}
                    className="absolute bottom-0 right-0 w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center text-white hover:bg-purple-700 transition-colors shadow-lg disabled:opacity-50"
                  >
                    {uploadingAvatar ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </button>
                  
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{user?.name}</h3>
                  <p className="text-gray-600">{user?.staff_profile?.role || 'Frizer'}</p>
                  <p className="text-xs text-gray-400 mt-1">Klikni na sliku za promjenu</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ime i prezime</label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="+387 61 123 456"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Grad</label>
                  <input
                    type="text"
                    value={profileData.city}
                    onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Sarajevo"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Datum rođenja</label>
                  <input
                    type="date"
                    value={profileData.date_of_birth}
                    onChange={(e) => setProfileData({ ...profileData, date_of_birth: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pol</label>
                  <select
                    value={profileData.gender}
                    onChange={(e) => setProfileData({ ...profileData, gender: e.target.value as 'male' | 'female' | 'other' | '' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Izaberite</option>
                    <option value="male">Muški</option>
                    <option value="female">Ženski</option>
                    <option value="other">Ostalo</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Čuvanje...' : 'Sačuvaj promjene'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'appointments' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Podešavanja termina</h3>
              
              <div className="space-y-4">
                <div className={`p-6 rounded-xl border-2 transition-all ${
                  autoConfirm 
                    ? 'bg-green-50 border-green-300' 
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CheckCircle className={`w-6 h-6 ${autoConfirm ? 'text-green-600' : 'text-gray-400'}`} />
                        <span className="font-semibold text-gray-900 text-lg">Automatska potvrda termina</span>
                      </div>
                      <p className="text-gray-600 ml-9">
                        Kada je uključeno, svi termini koje klijenti zakazuju kod vas bit će automatski potvrđeni 
                        bez potrebe za ručnim odobravanjem.
                      </p>
                      <div className="mt-4 ml-9">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span className={`w-2 h-2 rounded-full ${autoConfirm ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                          {autoConfirm 
                            ? 'Termini se automatski potvrđuju' 
                            : 'Termini zahtijevaju ručnu potvrdu'
                          }
                        </div>
                      </div>
                    </div>
                    <div className="ml-4">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoConfirm}
                          onChange={(e) => handleAutoConfirmChange(e.target.checked)}
                          disabled={loading}
                          className="sr-only peer"
                        />
                        <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-pink-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 text-sm font-bold">i</span>
                    </div>
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Napomena:</p>
                      <p>
                        Ako je automatska potvrda uključena na nivou salona, svi termini će biti automatski potvrđeni 
                        bez obzira na vaša individualna podešavanja.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all flex items-center gap-2 disabled:opacity-50"
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
                    className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                </label>
                
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <div>
                    <span className="font-medium text-gray-900 block">Novi termini</span>
                    <span className="text-sm text-gray-600">Obavijesti me kada klijent zakaže termin</span>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                </label>
                
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <div>
                    <span className="font-medium text-gray-900 block">Otkazivanja</span>
                    <span className="text-sm text-gray-600">Obavijesti me kada klijent otkaže termin</span>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                </label>
                
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <div>
                    <span className="font-medium text-gray-900 block">Podsjetnici</span>
                    <span className="text-sm text-gray-600">Primaj podsjetnike za sutrašnje termine</span>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
