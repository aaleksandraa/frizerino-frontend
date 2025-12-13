import React, { useState, useEffect } from 'react';
import { 
  Save, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Camera,
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Building,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { salonAPI } from '../../services/api';
import { LocationPicker } from './LocationPicker';

type WorkingHoursDay = {
  open: string;
  close: string;
  is_open: boolean;
};

type WorkingHours = {
  monday: WorkingHoursDay;
  tuesday: WorkingHoursDay;
  wednesday: WorkingHoursDay;
  thursday: WorkingHoursDay;
  friday: WorkingHoursDay;
  saturday: WorkingHoursDay;
  sunday: WorkingHoursDay;
};

type TargetAudience = {
  women: boolean;
  men: boolean;
  children: boolean;
};

interface SalonSetupWizardProps {
  onComplete: () => void;
}

export function SalonSetupWizard({ onComplete }: SalonSetupWizardProps) {
  const { user, refreshUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [salon, setSalon] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    city_slug: '',
    postal_code: '',
    country: 'Bosna i Hercegovina',
    phone: '',
    email: user?.email || '',
    website: '',
    latitude: null as number | null,
    longitude: null as number | null,
    target_audience: {
      women: true,
      men: true,
      children: true
    } as TargetAudience,
    working_hours: {
      monday: { open: '09:00', close: '17:00', is_open: true },
      tuesday: { open: '09:00', close: '17:00', is_open: true },
      wednesday: { open: '09:00', close: '17:00', is_open: true },
      thursday: { open: '09:00', close: '17:00', is_open: true },
      friday: { open: '09:00', close: '17:00', is_open: true },
      saturday: { open: '09:00', close: '15:00', is_open: true },
      sunday: { open: '10:00', close: '14:00', is_open: false }
    } as WorkingHours,
    auto_confirm: false
  });

  // Load existing salon data if available
  useEffect(() => {
    const loadSalonData = async () => {
      if (user?.salon?.id) {
        try {
          const salonData = await salonAPI.getSalon(user.salon.id);
          setSalon(salonData);
          setImages(salonData.images || []);
          
          // Pre-fill form with existing data
          setFormData(prev => ({
            ...prev,
            name: salonData.name || '',
            description: salonData.description || '',
            address: salonData.address || '',
            city: salonData.city || '',
            city_slug: salonData.city_slug || '',
            postal_code: salonData.postal_code || '',
            country: salonData.country || 'Bosna i Hercegovina',
            phone: salonData.phone || '',
            email: salonData.email || user?.email || '',
            website: salonData.website || '',
            latitude: salonData.latitude || null,
            longitude: salonData.longitude || null,
            target_audience: salonData.target_audience || prev.target_audience,
            working_hours: salonData.working_hours || prev.working_hours,
            auto_confirm: salonData.auto_confirm || false
          }));
        } catch (err) {
          console.error('Error loading salon:', err);
        }
      }
    };
    
    loadSalonData();
  }, [user]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleWorkingHoursChange = (day: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      working_hours: {
        ...prev.working_hours,
        [day]: {
          ...prev.working_hours[day as keyof WorkingHours],
          [field]: value
        }
      }
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.name.trim()) {
          setError('Naziv salona je obavezan');
          return false;
        }
        if (!formData.email.trim()) {
          setError('Email je obavezan');
          return false;
        }
        if (!formData.phone.trim()) {
          setError('Telefon je obavezan');
          return false;
        }
        if (!formData.description.trim()) {
          setError('Opis salona je obavezan');
          return false;
        }
        return true;
      case 2:
        if (!formData.address.trim()) {
          setError('Adresa je obavezna');
          return false;
        }
        if (!formData.city.trim()) {
          setError('Grad/Mjesto je obavezno');
          return false;
        }
        return true;
      case 3:
        return true; // Working hours are optional
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
      setError(null);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setError(null);
  };

  const handleSave = async () => {
    if (!validateStep(currentStep)) return;
    
    setSaving(true);
    setError(null);
    
    try {
      let response;
      if (salon?.id) {
        response = await salonAPI.updateSalon(salon.id, formData);
      } else {
        response = await salonAPI.createSalon(formData);
      }
      
      setSalon(response.salon || response);
      setSuccess('Podaci su uspješno sačuvani!');
      
      // Refresh user data to get updated salon info
      if (refreshUser) {
        await refreshUser();
      }
      
      // Move to next step or complete
      if (currentStep < 4) {
        setTimeout(() => {
          setCurrentStep(prev => prev + 1);
          setSuccess(null);
        }, 1000);
      }
    } catch (err: any) {
      console.error('Error saving salon:', err);
      setError(err.response?.data?.message || 'Greška prilikom čuvanja podataka');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !salon?.id) {
      setError('Morate prvo sačuvati osnovne podatke prije uploada fotografija');
      return;
    }

    setUploadingImages(true);
    setError(null);

    try {
      const formDataUpload = new FormData();
      Array.from(files).forEach(file => {
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`Datoteka ${file.name} je prevelika. Maksimalna veličina je 5MB.`);
        }
        formDataUpload.append('images[]', file);
      });

      await salonAPI.uploadImages(salon.id, formDataUpload);
      
      // Refresh salon data to get updated images
      const updatedSalon = await salonAPI.getSalon(salon.id);
      setImages(updatedSalon.images || []);
      setSuccess('Fotografije su uspješno uploadovane!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error uploading images:', err);
      setError(err.message || err.response?.data?.message || 'Greška prilikom uploada fotografija');
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = async (imageId: string) => {
    if (!salon?.id) return;

    try {
      await salonAPI.deleteImage(salon.id, imageId);
      setImages(prev => prev.filter(img => img.id !== imageId));
    } catch (err: any) {
      console.error('Error removing image:', err);
      setError('Greška prilikom brisanja fotografije');
    }
  };

  const handleComplete = () => {
    onComplete();
  };

  const dayNames: Record<string, string> = {
    monday: 'Ponedjeljak',
    tuesday: 'Utorak',
    wednesday: 'Srijeda',
    thursday: 'Četvrtak',
    friday: 'Petak',
    saturday: 'Subota',
    sunday: 'Nedjelja'
  };

  const steps = [
    { number: 1, title: 'Osnovni podaci', icon: Building },
    { number: 2, title: 'Lokacija', icon: MapPin },
    { number: 3, title: 'Radno vrijeme', icon: Clock },
    { number: 4, title: 'Fotografije', icon: ImageIcon }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Dobrodošli u Frizerino! 🎉
          </h1>
          <p className="text-gray-600">
            Popunite podatke o vašem salonu kako bi klijenti mogli pronaći i rezervisati termine.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              
              return (
                <React.Fragment key={step.number}>
                  <div className="flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      isCompleted 
                        ? 'bg-green-500 text-white' 
                        : isActive 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-200 text-gray-500'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                    </div>
                    <span className={`text-xs mt-2 ${isActive ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-1 ${currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* Form Content */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">

          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600" />
                Osnovni podaci o salonu
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Naziv salona <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="npr. Beauty Studio Marija"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="info@salon.ba"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefon <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+387 33 123 456"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website (opciono)
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://www.mojsalon.ba"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Opis salona <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Opišite vaš salon, usluge koje nudite, atmosferu, iskustvo..."
                />
                <p className="text-sm text-gray-500 mt-1">
                  Dobar opis pomaže klijentima da vas pronađu i odaberu.
                </p>
              </div>

              {/* Target Audience */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kome je salon namijenjen
                </label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.target_audience.women}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        target_audience: { ...prev.target_audience, women: e.target.checked }
                      }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Žene</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.target_audience.men}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        target_audience: { ...prev.target_audience, men: e.target.checked }
                      }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Muškarci</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.target_audience.children}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        target_audience: { ...prev.target_audience, children: e.target.checked }
                      }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Djeca</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Location */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                Lokacija salona
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adresa <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="npr. Ferhadija 15"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grad / Mjesto <span className="text-red-500">*</span>
                  </label>
                  <LocationPicker
                    value={formData.city}
                    onChange={(location) => {
                      setFormData(prev => ({
                        ...prev,
                        city: location.city,
                        city_slug: location.city_slug,
                        postal_code: location.postal_code || prev.postal_code,
                        latitude: location.latitude ?? prev.latitude,
                        longitude: location.longitude ?? prev.longitude,
                      }));
                    }}
                    disabled={false}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Poštanski broj
                  </label>
                  <input
                    type="text"
                    value={formData.postal_code}
                    onChange={(e) => handleInputChange('postal_code', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="71000"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Zemlja
                  </label>
                  <select
                    value={formData.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Bosna i Hercegovina">Bosna i Hercegovina</option>
                    <option value="Srbija">Srbija</option>
                    <option value="Hrvatska">Hrvatska</option>
                    <option value="Crna Gora">Crna Gora</option>
                  </select>
                </div>
              </div>

              {/* Coordinates */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Koordinate (opciono - za prikaz na mapi)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.latitude || ''}
                      onChange={(e) => handleInputChange('latitude', e.target.value ? parseFloat(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="43.8563"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.longitude || ''}
                      onChange={(e) => handleInputChange('longitude', e.target.value ? parseFloat(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="18.4131"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  💡 Koordinate možete pronaći na Google Maps - desni klik na lokaciju.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Working Hours */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Radno vrijeme
              </h2>
              
              <div className="space-y-4">
                {Object.entries(dayNames).map(([day, dayName]) => {
                  const dayHours = formData.working_hours[day as keyof WorkingHours];
                  return (
                    <div key={day} className="flex flex-col sm:flex-row sm:items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className="w-28">
                        <span className="font-medium text-gray-700">{dayName}</span>
                      </div>
                      
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={dayHours.is_open}
                          onChange={(e) => handleWorkingHoursChange(day, 'is_open', e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600">Radi</span>
                      </label>
                      
                      {dayHours.is_open && (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={dayHours.open}
                            onChange={(e) => handleWorkingHoursChange(day, 'open', e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded text-sm"
                          />
                          <span className="text-gray-400">-</span>
                          <input
                            type="time"
                            value={dayHours.close}
                            onChange={(e) => handleWorkingHoursChange(day, 'close', e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Auto-confirm setting */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={formData.auto_confirm}
                    onChange={(e) => handleInputChange('auto_confirm', e.target.checked)}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900">Automatska potvrda termina</span>
                    <p className="text-sm text-gray-600 mt-1">
                      Ako je uključeno, termini će biti automatski potvrđeni. Inače ćete morati ručno potvrditi svaki termin.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Step 4: Photos */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-600" />
                Fotografije salona
              </h2>
              
              {!salon?.id ? (
                <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                  <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                  <p className="text-yellow-800 font-medium">
                    Morate prvo sačuvati osnovne podatke
                  </p>
                  <p className="text-yellow-700 text-sm mt-1">
                    Kliknite "Sačuvaj i nastavi" na prethodnim koracima.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {uploadingImages ? (
                          <>
                            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                            <p className="text-sm text-gray-500">Uploadovanje...</p>
                          </>
                        ) : (
                          <>
                            <Upload className="w-10 h-10 mb-3 text-gray-400" />
                            <p className="mb-2 text-sm text-gray-500">
                              <span className="font-semibold">Kliknite za upload</span> ili prevucite fotografije
                            </p>
                            <p className="text-xs text-gray-500">PNG, JPG ili JPEG (MAX. 5MB po fotografiji)</p>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        multiple
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={handleImageUpload}
                        disabled={uploadingImages}
                        className="hidden"
                      />
                    </label>
                  </div>
                  
                  {images.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-3">
                        Uploadovane fotografije ({images.length}/20)
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {images.map((image) => (
                          <div key={image.id} className="relative group">
                            <img
                              src={image.url}
                              alt="Salon"
                              className="w-full h-24 object-cover rounded-lg"
                            />
                            <button
                              onClick={() => removeImage(image.id)}
                              className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {images.length === 0 && (
                    <p className="text-center text-gray-500 py-4">
                      Još niste uploadovali fotografije. Fotografije pomažu klijentima da vide vaš salon.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Nazad
          </button>
          
          <div className="flex gap-3">
            {currentStep < 4 && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Čuvanje...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Sačuvaj i nastavi
                  </>
                )}
              </button>
            )}
            
            {currentStep === 4 && (
              <button
                onClick={handleComplete}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Završi podešavanje
              </button>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-blue-800 font-medium">Šta se dešava nakon podešavanja?</p>
              <p className="text-blue-700 text-sm mt-1">
                Nakon što popunite podatke, vaš salon će biti poslan na pregled administratoru. 
                Kada bude odobren, dobićete email obavijest i moći ćete dodavati usluge, zaposlene i primati rezervacije.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
