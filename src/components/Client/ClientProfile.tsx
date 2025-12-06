import React, { useState, useEffect } from 'react';
import { Save, User, Mail, Phone, MapPin, Calendar, Edit, Camera } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authAPI, appointmentAPI, favoriteAPI } from '../../services/api';
import { ConfirmModal } from './ConfirmModal';
import { formatDateEuropean } from '../../utils/dateUtils';

export function ClientProfile() {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    phone: string;
    city: string;
    dateOfBirth: string;
    gender: 'male' | 'female' | 'other' | '';
    preferences: {
      notifications: boolean;
      emailUpdates: boolean;
      smsReminders: boolean;
    };
  }>({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    city: user?.city || '',
    dateOfBirth: user?.date_of_birth || '',
    gender: user?.gender || '',
    preferences: {
      notifications: true,
      emailUpdates: true,
      smsReminders: true
    }
  });

  const [stats, setStats] = useState({
    totalAppointments: 0,
    totalSpent: 0,
    favoriteSalons: 0,
    memberSince: ''
  });

  // Sync form data when user changes
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        city: user.city || '',
        dateOfBirth: user.date_of_birth || '',
        gender: user.gender || '',
      }));
    }
  }, [user]);

  useEffect(() => {
    loadUserStats();
  }, [user]);

  const loadUserStats = async () => {
    if (!user) return;

    try {
      // Load appointments
      const appointments = await appointmentAPI.getAppointments();
      const completedAppointments = appointments.filter((app: any) => app.status === 'completed');
      const totalSpent = completedAppointments.reduce((sum: number, app: any) => sum + app.total_price, 0);
      
      // Load favorites
      const favorites = await favoriteAPI.getFavorites();

      setStats({
        totalAppointments: appointments.length,
        totalSpent,
        favoriteSalons: favorites.length,
        memberSince: user.created_at ? formatDateEuropean(user.created_at) : ''
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const dataToSend: Partial<{
        name: string;
        email: string;
        phone: string;
        city: string;
        date_of_birth: string;
        gender: 'male' | 'female' | 'other';
      }> = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        city: formData.city,
        date_of_birth: formData.dateOfBirth,
      };
      
      // Only include gender if it's a valid value
      if (formData.gender) {
        dataToSend.gender = formData.gender as 'male' | 'female' | 'other';
      }
      
      const success = await updateUser(dataToSend);

      if (success) {
        setIsEditing(false);
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePreferenceChange = (preference: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [preference]: value
      }
    }));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Moj profil</h1>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-2 rounded-lg hover:from-orange-600 hover:to-red-600 transition-all flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Uredi profil
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Otkaži
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-2 rounded-lg hover:from-orange-600 hover:to-red-600 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Čuvanje...' : 'Sačuvaj'}
            </button>
          </div>
        )}
      </div>

      {/* Profile Header */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-white font-bold text-2xl">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {isEditing && (
              <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
                <Camera className="w-4 h-4 text-gray-600" />
              </button>
            )}
          </div>
          
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl font-bold text-gray-900">{user?.name}</h2>
            <p className="text-gray-600">{user?.email}</p>
            <p className="text-sm text-gray-500 mt-1">Član od {stats.memberSince}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalAppointments}</p>
          <p className="text-sm text-gray-600">Ukupno termina</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-green-600 font-bold">KM</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalSpent}</p>
          <p className="text-sm text-gray-600">Ukupno potrošeno</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
          <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-pink-600 text-xl">♥</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.favoriteSalons}</p>
          <p className="text-sm text-gray-600">Omiljeni saloni</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <User className="w-6 h-6 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">VIP</p>
          <p className="text-sm text-gray-600">Status</p>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Lični podaci</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ime i prezime
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              disabled={!isEditing}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email adresa
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={!isEditing}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Broj telefona
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              disabled={!isEditing}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
              placeholder="+387 60 123 456"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Grad
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
              disabled={!isEditing}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
              placeholder="Sarajevo"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Datum rođenja
            </label>
            <input
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
              disabled={!isEditing}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pol
            </label>
            <select
              value={formData.gender}
              onChange={(e) => handleInputChange('gender', e.target.value)}
              disabled={!isEditing}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50"
            >
              <option value="">Izaberite</option>
              <option value="male">Muški</option>
              <option value="female">Ženski</option>
              <option value="other">Ostalo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Podešavanja obavještenja</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Push obavještenja</h4>
              <p className="text-sm text-gray-600">Primajte obavještenja o terminima i promocijama</p>
            </div>
            <input
              type="checkbox"
              checked={formData.preferences.notifications}
              onChange={(e) => handlePreferenceChange('notifications', e.target.checked)}
              disabled={!isEditing}
              className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500 disabled:opacity-50"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Email ažuriranja</h4>
              <p className="text-sm text-gray-600">Primajte email-ove o novim salonima i ponudama</p>
            </div>
            <input
              type="checkbox"
              checked={formData.preferences.emailUpdates}
              onChange={(e) => handlePreferenceChange('emailUpdates', e.target.checked)}
              disabled={!isEditing}
              className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500 disabled:opacity-50"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">SMS podsetnici</h4>
              <p className="text-sm text-gray-600">Primajte SMS podsetnik dan prije termina</p>
            </div>
            <input
              type="checkbox"
              checked={formData.preferences.smsReminders}
              onChange={(e) => handlePreferenceChange('smsReminders', e.target.checked)}
              disabled={!isEditing}
              className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <ConfirmModal
        isOpen={showSuccessModal}
        title="Profil ažuriran"
        message="Vaš profil je uspješno ažuriran!"
        confirmText="U redu"
        cancelText=""
        type="info"
        onConfirm={() => setShowSuccessModal(false)}
        onCancel={() => setShowSuccessModal(false)}
      />
    </div>
  );
}