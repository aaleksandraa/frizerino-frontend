import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, CreditCard, CheckCircle, Plus, Trash2, Check } from 'lucide-react';
import { Salon, Service, Staff, StaffRole, StaffRoleLabels } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { TimeSlotPicker } from './TimeSlotPicker';
import { formatDateEuropean, getCurrentDateEuropean } from '../../utils/dateUtils';
import { ReviewModal } from './ReviewModal';
import { EuropeanDatePicker } from './EuropeanDatePicker';
import { serviceAPI, staffAPI, appointmentAPI } from '../../services/api';

interface BookingModalProps {
  salon: Salon;
  selectedService?: Service | null;
  onClose: () => void;
  onBookingComplete?: () => void;
}

interface SelectedService {
  id: string;
  service: Service;
  staffId: string;
}

export function BookingModal({ salon, selectedService, onClose, onBookingComplete }: BookingModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [bookingData, setBookingData] = useState({
    date: '',
    time: '',
    notes: ''
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    loadSalonData();
  }, [salon.id]);

  useEffect(() => {
    // Ako je usluga već izabrana, dodaj je u listu
    if (selectedService && selectedServices.length === 0) {
      setSelectedServices([{
        id: selectedService.id,
        service: selectedService,
        staffId: ''
      }]);
    }
  }, [selectedService]);

  const loadSalonData = async () => {
    try {
      setLoading(true);
      // Get salon services
      const servicesData = await serviceAPI.getServices(salon.id);
      setServices(Array.isArray(servicesData) ? servicesData : (servicesData?.data || []));
      
      // Get salon staff
      const staffData = await staffAPI.getStaff(salon.id);
      setStaff(Array.isArray(staffData) ? staffData : (staffData?.data || []));
    } catch (error) {
      console.error('Error loading salon data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addService = () => {
    setSelectedServices(prev => [...prev, {
      id: '',
      service: {} as Service,
      staffId: ''
    }]);
  };

  const removeService = (index: number) => {
    setSelectedServices(prev => prev.filter((_, i) => i !== index));
  };

  const updateService = (index: number, serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    setSelectedServices(prev => prev.map((item, i) => 
      i === index ? { ...item, id: serviceId, service, staffId: '' } : item
    ));
  };

  const updateStaff = (index: number, staffId: string) => {
    setSelectedServices(prev => prev.map((item, i) => 
      i === index ? { ...item, staffId } : item
    ));
  };

  const getAvailableStaff = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return [];
    
    return staff.filter(staffMember => service.staff_ids.includes(staffMember.id));
  };

  const getTotalDuration = () => {
    return selectedServices.reduce((total, item) => total + (item.service.duration || 0), 0);
  };

  const getTotalPrice = () => {
    return selectedServices.reduce((total, item) => total + (item.service.discount_price || item.service.price || 0), 0);
  };

  const canProceedToNextStep = () => {
    switch (step) {
      case 1:
        return selectedServices.length > 0 && selectedServices.every(item => item.id);
      case 2:
        return selectedServices.every(item => item.staffId);
      case 3:
        return bookingData.date;
      case 4:
        return bookingData.time;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    if (!user || !canProceedToNextStep()) {
      return;
    }

    try {
      setLoading(true);
      const appointments = [];
      
      // Create appointment for each service
      for (const selectedService of selectedServices) {
        const appointmentData = {
          salon_id: salon.id,
          staff_id: selectedService.staffId,
          service_id: selectedService.id,
          date: bookingData.date,
          time: bookingData.time,
          notes: bookingData.notes
        };
        
        const response = await appointmentAPI.createAppointment(appointmentData);
        appointments.push(response.appointment);
      }

      setBookingDetails(appointments);
      setShowSuccess(true);
    } catch (error) {
      console.error('Error booking appointment:', error);
      alert('Došlo je do greške pri rezervaciji termina. Molimo pokušajte ponovo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    onClose();
    if (onBookingComplete) {
      onBookingComplete();
    }
  };

  const calculateServiceStartTime = (serviceIndex: number): string => {
    if (serviceIndex === 0) return bookingData.time;
    
    let totalMinutes = 0;
    for (let i = 0; i < serviceIndex; i++) {
      totalMinutes += selectedServices[i].service.duration;
    }
    
    const [hours, minutes] = bookingData.time.split(':').map(Number);
    const startMinutes = hours * 60 + minutes + totalMinutes;
    const startHours = Math.floor(startMinutes / 60);
    const startMins = startMinutes % 60;
    
    return `${startHours.toString().padStart(2, '0')}:${startMins.toString().padStart(2, '0')}`;
  };

  const calculateEndTime = (startTime: string, duration: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + duration;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  };

  const getMinDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    return maxDate.toISOString().split('T')[0];
  };

  const stepTitles = [
    'Izaberite usluge',
    'Izaberite frizere',
    'Izaberite datum',
    'Izaberite vrijeme'
  ];

  // Success Modal
  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[95vh] overflow-y-auto">
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Uspješno rezervisano!</h2>
            <p className="text-gray-600 mb-6">Vaš termin je uspješno zakazan u salonu {salon.name}</p>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
              <h3 className="font-semibold text-gray-900 mb-3">Detalji rezervacije:</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Datum:</span>
                  <span className="font-medium">{bookingDetails.length > 0 && bookingDetails[0].date ? bookingDetails[0].date : bookingData.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ukupno vrijeme:</span>
                  <span className="font-medium">{getTotalDuration()} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ukupna cijena:</span>
                  <span className="font-medium text-green-600">{getTotalPrice()} KM</span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-2">Usluge:</h4>
                <div className="space-y-2">
                  {bookingDetails.map((appointment, index) => (
                    <div key={index} className="text-sm">
                      <div className="flex justify-between">
                        <span>{appointment.service.name}</span>
                        <span>{appointment.time} - {appointment.end_time}</span>
                      </div>
                      <div className="text-gray-500">sa {appointment.staff.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowSuccess(false);
                  onClose();
                  // Navigate to appointments section
                  window.dispatchEvent(new CustomEvent('switchSection', { detail: 'appointments' }));
                }}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-4 rounded-xl hover:from-orange-600 hover:to-red-600 transition-all font-medium"
              >
                Pogledaj moje termine
              </button>
              <button
                onClick={() => {
                  setShowSuccess(false);
                  setShowReviewModal(true);
                }}
                className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                Ostavi recenziju
              </button>
            </div>
          </div>
        </div>
        
        {/* Review Modal */}
        {showReviewModal && bookingDetails.length > 0 && (
          <ReviewModal
            salon={salon}
            appointmentId={bookingDetails[0].id}
            staffId={bookingDetails[0].staff_id}
            serviceId={bookingDetails[0].service_id}
            onClose={() => setShowReviewModal(false)}
            onReviewSubmitted={() => {
              setShowReviewModal(false);
              setShowSuccess(false);
              onClose();
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Rezervacija termina</h2>
            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
            </button>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center">
            {[1, 2, 3, 4].map((stepNum) => (
              <React.Fragment key={stepNum}>
                <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${
                  step >= stepNum ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {step > stepNum ? <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" /> : stepNum}
                </div>
                {stepNum < 4 && (
                  <div className={`flex-1 h-1 mx-1 sm:mx-2 ${
                    step > stepNum ? 'bg-orange-500' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
          
          <p className="text-sm text-gray-600 mt-2">{stepTitles[step - 1]}</p>
        </div>

        <div className="p-4 sm:p-6">
          {/* Step 1: Service Selection */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Izaberite usluge</h3>
              </div>
              
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedServices.map((selectedService, index) => (
                    <div key={index} className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">Usluga {index + 1}</h4>
                        {selectedServices.length > 1 && (
                          <button
                            onClick={() => removeService(index)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      <select
                        value={selectedService.id}
                        onChange={(e) => updateService(index, e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value="">Izaberite uslugu</option>
                        {services.map(service => (
                          <option key={service.id} value={service.id}>
                            {service.name} - {service.discount_price || service.price} KM ({service.duration}min){service.discount_price ? ' (AKCIJA)' : ''}
                          </option>
                        ))}
                      </select>
                      
                      {selectedService.service.description && (
                        <p className="text-sm text-gray-600 mt-2">{selectedService.service.description}</p>
                      )}
                    </div>
                  ))}
                  
                  <button
                    onClick={addService}
                    className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-orange-300 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-colors"
                  >
                    <Plus className="w-5 h-5 text-orange-500" />
                    <span className="text-orange-500 font-medium">Dodaj još jednu uslugu</span>
                  </button>
                  
                  {selectedServices.length > 0 && selectedServices.every(item => item.id) && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                      <h4 className="font-medium text-orange-800 mb-2">Sažetak usluga:</h4>
                      <div className="space-y-1 text-sm text-orange-700">
                        <p>Ukupno usluga: {selectedServices.length}</p>
                        <p>Ukupno vrijeme: {getTotalDuration()} minuta</p>
                        <p>Ukupna cijena: {getTotalPrice()} KM</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <button
                onClick={() => setStep(2)}
                disabled={!canProceedToNextStep() || loading}
                className="w-full bg-orange-500 text-white py-3 px-4 rounded-xl hover:bg-orange-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Nastavi
              </button>
            </div>
          )}

          {/* Step 2: Staff Selection */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Izaberite frizere</h3>
              </div>
              
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedServices.map((selectedService, index) => {
                    const availableStaff = getAvailableStaff(selectedService.id);
                    
                    return (
                      <div key={index} className="bg-gray-50 rounded-xl p-4">
                        <h4 className="font-medium text-gray-900 mb-3">
                          {selectedService.service.name}
                        </h4>
                        
                        {availableStaff.length > 0 ? (
                          <div className="space-y-3">
                            {availableStaff.map(member => (
                              <div
                                key={member.id}
                                onClick={() => updateStaff(index, member.id)}
                                className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                                  selectedService.staffId === member.id
                                    ? 'border-orange-500 bg-orange-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0">
                                    {member.avatar ? (
                                      <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <User className="w-6 h-6 text-white" />
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-medium text-gray-900">{member.name}</h4>
                                    <p className="text-sm text-gray-600">{StaffRoleLabels[member.role as StaffRole] || member.role}</p>
                                    <div className="flex items-center gap-1 mt-1">
                                      <span className="text-xs text-yellow-600">★ {member.rating}</span>
                                      <span className="text-xs text-gray-500">({member.review_count} recenzija)</span>
                                    </div>
                                  </div>
                                  {selectedService.staffId === member.id && (
                                    <Check className="w-5 h-5 text-orange-500" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <User className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500 text-sm">Nema dostupnih frizera za ovu uslugu</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                >
                  Nazad
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!canProceedToNextStep() || loading}
                  className="flex-1 bg-orange-500 text-white py-3 px-4 rounded-xl hover:bg-orange-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Nastavi
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Date Selection */}
          {step === 3 && (
            <div className="space-y-4 min-h-[350px]">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Izaberite datum</h3>
              </div>
              
              <div className="pb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Datum</label>
                <EuropeanDatePicker
                  value={bookingData.date}
                  onChange={(date) => setBookingData(prev => ({ ...prev, date, time: '' }))}
                  minDate={new Date()}
                  maxDate={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)}
                  placeholder="Izaberite datum"
                />
              </div>
              
              {/* Spacer for calendar dropdown */}
              <div className="h-48"></div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                >
                  Nazad
                </button>
                <button
                  onClick={() => setStep(4)}
                  disabled={!canProceedToNextStep()}
                  className="flex-1 bg-orange-500 text-white py-3 px-4 rounded-xl hover:bg-orange-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Nastavi
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Time Selection */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <Clock className="w-4 h-4 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Izaberite vrijeme</h3>
              </div>
              
              {bookingData.date && selectedServices.length > 0 && (
                <TimeSlotPicker
                  salonId={salon.id}
                  staffId={selectedServices[0].staffId}
                  serviceId={selectedServices[0].id}
                  serviceDuration={getTotalDuration()}
                  selectedDate={bookingData.date}
                  onTimeSelect={(time) => setBookingData(prev => ({ ...prev, time }))}
                  selectedTime={bookingData.time}
                />
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Napomene (opcionalno)</label>
                <textarea
                  value={bookingData.notes}
                  onChange={(e) => setBookingData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Dodatne napomene za frizera..."
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                >
                  Nazad
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canProceedToNextStep() || loading}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-4 rounded-xl hover:from-orange-600 hover:to-red-600 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Obrađuje se...
                    </div>
                  ) : (
                    'Potvrdi rezervaciju'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}