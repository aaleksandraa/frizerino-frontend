import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Phone, Mail, MapPin, Plus, Trash2 } from 'lucide-react';
import { appointmentAPI, serviceAPI, staffAPI, salonAPI } from '../../services/api';

interface MultiServiceManualBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  salonId: number;
  staffId?: number;
  preselectedDate?: string;
}

interface ClientData {
  client_name: string;
  client_email: string;
  client_phone: string;
  client_address: string;
}

interface SelectedService {
  id: string;
  name: string;
  duration: number;
  price: number;
}

export function MultiServiceManualBookingModal({
  isOpen,
  onClose,
  onSuccess,
  salonId,
  staffId,
  preselectedDate
}: MultiServiceManualBookingModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [services, setServices] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>(staffId ? String(staffId) : '');
  const [selectedDate, setSelectedDate] = useState<string>(preselectedDate || '');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  const [clientData, setClientData] = useState<ClientData>({
    client_name: '',
    client_email: '',
    client_phone: '',
    client_address: ''
  });

  useEffect(() => {
    if (isOpen && salonId) {
      loadData();
    }
  }, [isOpen, salonId]);

  useEffect(() => {
    if (selectedServices.length > 0 && selectedStaff && selectedDate) {
      loadAvailableSlots();
    }
  }, [selectedServices, selectedStaff, selectedDate]);

  useEffect(() => {
    if (staffId) {
      setSelectedStaff(String(staffId));
    }
  }, [staffId]);

  const loadData = async () => {
    try {
      const [servicesData, staffData] = await Promise.all([
        serviceAPI.getServices(String(salonId)),
        staffAPI.getStaff(String(salonId))
      ]);
      
      setServices(Array.isArray(servicesData) ? servicesData : (servicesData?.data || []));
      setStaff(Array.isArray(staffData) ? staffData : (staffData?.data || []));
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadAvailableSlots = async () => {
    if (!selectedStaff || selectedServices.length === 0 || !selectedDate) return;
    
    setLoadingSlots(true);
    try {
      // Use first service for slot calculation (backend will calculate total duration)
      const response = await salonAPI.getAvailableSlots(
        String(salonId),
        selectedStaff,
        selectedDate,
        selectedServices[0].id
      );
      setAvailableSlots(response.slots || response || []);
    } catch (error) {
      console.error('Error loading slots:', error);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const formatDateForAPI = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}.${month}.${year}`;
  };

  const convertEuropeanToISO = (europeanDate: string) => {
    if (!europeanDate) return '';
    const parts = europeanDate.split('.');
    if (parts.length !== 3) return '';
    const [day, month, year] = parts;
    return `${year}-${month}-${day}`;
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const handleAddService = (serviceId: string) => {
    const service = services.find(s => String(s.id) === serviceId);
    if (!service) return;
    
    // Check if already added
    if (selectedServices.some(s => s.id === serviceId)) {
      setError('Ova usluga je već dodana');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    setSelectedServices([...selectedServices, {
      id: String(service.id),
      name: service.name,
      duration: service.duration,
      price: service.price
    }]);
    setSelectedTime(''); // Reset time when services change
  };

  const handleRemoveService = (serviceId: string) => {
    setSelectedServices(selectedServices.filter(s => s.id !== serviceId));
    setSelectedTime(''); // Reset time when services change
  };

  const getTotalDuration = () => {
    return selectedServices.reduce((sum, s) => sum + s.duration, 0);
  };

  const getTotalPrice = () => {
    return selectedServices.reduce((sum, s) => sum + s.price, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedServices.length === 0 || !selectedStaff || !selectedDate || !selectedTime) {
      setError('Molimo popunite sve podatke o terminu');
      return;
    }
    
    if (!clientData.client_name || !clientData.client_phone) {
      setError('Ime i telefon klijenta su obavezni');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Create appointment with first service
      const mainServiceId = selectedServices[0].id;
      
      // Add additional services to notes
      const additionalServices = selectedServices.slice(1);
      const additionalServicesText = additionalServices.length > 0
        ? `Dodatne usluge: ${additionalServices.map(s => s.name).join(', ')}`
        : '';
      
      const finalNotes = [notes, additionalServicesText].filter(Boolean).join('\n');
      
      await appointmentAPI.createAppointment({
        salon_id: salonId,
        staff_id: Number(selectedStaff),
        service_id: Number(mainServiceId),
        date: selectedDate,
        time: selectedTime,
        notes: finalNotes,
        total_price: getTotalPrice(),
        ...clientData,
        is_manual: true
      });
      
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Greška pri kreiranju termina');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedServices([]);
    setSelectedStaff(staffId ? String(staffId) : '');
    setSelectedDate(preselectedDate || '');
    setSelectedTime('');
    setNotes('');
    setClientData({
      client_name: '',
      client_email: '',
      client_phone: '',
      client_address: ''
    });
    setError(null);
    setSuccess(false);
    setAvailableSlots([]);
    onClose();
  };

  // Filter staff based on selected services
  const availableStaff = selectedServices.length > 0
    ? staff.filter(s => 
        selectedServices.every(service => 
          s.services?.some((svc: any) => String(svc.id) === service.id) || 
          s.service_ids?.includes(Number(service.id))
        )
      )
    : staff;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={handleClose}
        />

        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-auto z-10 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
            <h2 className="text-xl font-semibold text-gray-900">
              Ručno dodavanje termina
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {success && (
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Termin uspješno kreiran!</h3>
              <p className="text-gray-600">Termin je dodan u raspored.</p>
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {error}
                </div>
              )}

              {/* Service Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Usluge * (možete odabrati više)
                </label>
                <div className="flex gap-2">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddService(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Odaberite uslugu</option>
                    {services.map(service => (
                      <option key={service.id} value={service.id}>
                        {service.name} - {service.price} KM ({service.duration} min)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected Services */}
                {selectedServices.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {selectedServices.map((service, index) => (
                      <div
                        key={service.id}
                        className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-blue-900">
                            {index + 1}. {service.name}
                          </div>
                          <div className="text-sm text-blue-700">
                            {service.duration} min • {service.price} KM
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveService(service.id)}
                          className="text-red-600 hover:text-red-800 p-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex justify-between text-sm font-medium text-green-900">
                        <span>Ukupno trajanje:</span>
                        <span>{getTotalDuration()} min</span>
                      </div>
                      <div className="flex justify-between text-sm font-medium text-green-900 mt-1">
                        <span>Ukupna cijena:</span>
                        <span>{getTotalPrice()} KM</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Staff Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zaposleni *
                </label>
                <select
                  value={selectedStaff}
                  onChange={(e) => {
                    setSelectedStaff(e.target.value);
                    setSelectedTime('');
                  }}
                  disabled={!!staffId}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  required
                >
                  <option value="">Odaberite zaposlenog</option>
                  {availableStaff.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {selectedServices.length > 0 && availableStaff.length === 0 && (
                  <p className="text-sm text-amber-600 mt-1">
                    Nema zaposlenih koji nude sve odabrane usluge
                  </p>
                )}
              </div>

              {/* Date Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Datum *
                </label>
                <div className="flex gap-3 items-center">
                  <input
                    type="date"
                    min={getMinDate()}
                    value={convertEuropeanToISO(selectedDate)}
                    onChange={(e) => {
                      setSelectedDate(formatDateForAPI(e.target.value));
                      setSelectedTime('');
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  {selectedDate && (
                    <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 font-medium">
                      <Calendar className="w-4 h-4 inline mr-2" />
                      {selectedDate}
                    </div>
                  )}
                </div>
              </div>

              {/* Time Slots */}
              {selectedDate && selectedStaff && selectedServices.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vrijeme *
                  </label>
                  {loadingSlots ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="ml-2 text-gray-600">Učitavanje slobodnih termina...</span>
                    </div>
                  ) : availableSlots.length > 0 ? (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {availableSlots.map(slot => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedTime(slot)}
                          className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                            selectedTime === slot
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      Nema slobodnih termina za izabrani datum
                    </p>
                  )}
                </div>
              )}

              {/* Client Information */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Podaci o klijentu</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <User className="w-4 h-4 inline mr-1" />
                      Ime i prezime *
                    </label>
                    <input
                      type="text"
                      value={clientData.client_name}
                      onChange={(e) => setClientData({...clientData, client_name: e.target.value})}
                      placeholder="Unesite ime klijenta"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone className="w-4 h-4 inline mr-1" />
                      Telefon *
                    </label>
                    <input
                      type="tel"
                      value={clientData.client_phone}
                      onChange={(e) => setClientData({...clientData, client_phone: e.target.value})}
                      placeholder="+387 6X XXX XXX"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="w-4 h-4 inline mr-1" />
                      Email (opciono)
                    </label>
                    <input
                      type="email"
                      value={clientData.client_email}
                      onChange={(e) => setClientData({...clientData, client_email: e.target.value})}
                      placeholder="email@primjer.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Adresa (opciono)
                    </label>
                    <input
                      type="text"
                      value={clientData.client_address}
                      onChange={(e) => setClientData({...clientData, client_address: e.target.value})}
                      placeholder="Adresa klijenta"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Napomene (opciono)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Dodatne napomene za termin..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              {/* Summary */}
              {selectedServices.length > 0 && selectedStaff && selectedDate && selectedTime && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Pregled termina</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p><strong>Usluge:</strong> {selectedServices.map(s => s.name).join(', ')}</p>
                    <p><strong>Zaposleni:</strong> {staff.find(s => String(s.id) === selectedStaff)?.name}</p>
                    <p><strong>Datum:</strong> {selectedDate}</p>
                    <p><strong>Vrijeme:</strong> {selectedTime}</p>
                    <p><strong>Trajanje:</strong> {getTotalDuration()} min</p>
                    <p><strong>Cijena:</strong> {getTotalPrice()} KM</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Odustani
                </button>
                <button
                  type="submit"
                  disabled={loading || selectedServices.length === 0 || !selectedStaff || !selectedDate || !selectedTime || !clientData.client_name || !clientData.client_phone}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Kreiranje...' : 'Kreiraj termin'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
