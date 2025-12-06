import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicAPI, appointmentAPI } from '../../services/api';
import { Service, Staff, User, Break, Vacation } from '../../types';
import { 
  XMarkIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  UserPlusIcon,
  ArrowRightOnRectangleIcon,
  ScissorsIcon,
  UserGroupIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

interface WorkingHours {
  [key: string]: { open: string; close: string; is_open: boolean };
}

interface GuestBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  salon: {
    id: number;
    name: string;
    slug?: string;
    working_hours?: WorkingHours;
    salon_breaks?: Break[];
    salon_vacations?: Vacation[];
  };
  services: Service[];
  staff: Staff[];
  preselectedService?: Service;
  preselectedStaff?: Staff;
  user?: User | null;
}

interface GuestData {
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  guest_address: string;
}

interface SelectedServiceItem {
  id: string;
  service: Service | null;
  staffId: string;
}

export const GuestBookingModal: React.FC<GuestBookingModalProps> = ({
  isOpen,
  onClose,
  salon,
  services,
  staff,
  preselectedService,
  preselectedStaff,
  user
}) => {
  const navigate = useNavigate();
  
  // Step management: 0=choice (guest only), 1=services, 2=staff, 3=date, 4=time, 5=guest-info (guest only), 6=confirmation
  const [step, setStep] = useState(user ? 1 : 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Multi-service selection
  const [selectedServices, setSelectedServices] = useState<SelectedServiceItem[]>([]);
  
  // Booking data
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Guest data
  const [guestData, setGuestData] = useState<GuestData>({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    guest_address: ''
  });

  // Success state
  const [showSuccess, setShowSuccess] = useState(false);

  // Initialize with preselected service
  useEffect(() => {
    if (isOpen) {
      setStep(user ? 1 : 0);
      setError(null);
      setShowSuccess(false);
      setSelectedDate('');
      setSelectedTime('');
      setNotes('');
      setAvailableSlots([]);
      
      // Initialize services
      if (preselectedService) {
        setSelectedServices([{
          id: String(preselectedService.id),
          service: preselectedService,
          staffId: preselectedStaff?.id ? String(preselectedStaff.id) : ''
        }]);
      } else {
        // No preselected service, but might have preselected staff
        setSelectedServices([{ 
          id: '', 
          service: null, 
          staffId: preselectedStaff?.id ? String(preselectedStaff.id) : '' 
        }]);
      }
      
      // Pre-fill guest data
      if (user) {
        setGuestData({
          guest_name: user.name || '',
          guest_email: user.email || '',
          guest_phone: user.phone || '',
          guest_address: user.city || ''
        });
      } else {
        setGuestData({ guest_name: '', guest_email: '', guest_phone: '', guest_address: '' });
      }
    }
  }, [isOpen, user, preselectedService, preselectedStaff]);

  // Load available slots when staff, service, and date are selected
  useEffect(() => {
    if (selectedServices[0]?.staffId && selectedServices[0]?.id && selectedDate) {
      loadAvailableSlots();
    }
  }, [selectedServices, selectedDate]);

  const loadAvailableSlots = async () => {
    const firstService = selectedServices[0];
    if (!firstService?.staffId || !firstService?.id || !selectedDate) return;
    
    setLoadingSlots(true);
    try {
      const data = await publicAPI.getAvailableSlots(
        firstService.staffId,
        firstService.id,
        selectedDate
      );
      
      let slots = data.slots || [];
      
      // Filter past slots if today
      const today = new Date();
      const [day, month, year] = selectedDate.split('.').map(Number);
      const selectedDateObj = new Date(year, month - 1, day);
      
      if (selectedDateObj.toDateString() === today.toDateString()) {
        const currentTime = `${today.getHours().toString().padStart(2, '0')}:${today.getMinutes().toString().padStart(2, '0')}`;
        slots = slots.filter((slot: string) => slot > currentTime);
      }
      
      setAvailableSlots(slots);
    } catch (err) {
      console.error('Error loading slots:', err);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Service management functions
  const addService = () => {
    setSelectedServices(prev => [...prev, { id: '', service: null, staffId: '' }]);
  };

  const removeService = (index: number) => {
    setSelectedServices(prev => prev.filter((_, i) => i !== index));
  };

  const updateService = (index: number, serviceId: string) => {
    const service = services.find(s => String(s.id) === String(serviceId));
    setSelectedServices(prev => prev.map((item, i) => 
      i === index ? { ...item, id: serviceId, service: service || null, staffId: '' } : item
    ));
  };

  const updateStaff = (index: number, staffId: string) => {
    setSelectedServices(prev => prev.map((item, i) => 
      i === index ? { ...item, staffId } : item
    ));
  };

  const getAvailableStaff = (serviceId: string) => {
    const service = services.find(s => String(s.id) === String(serviceId));
    if (!service) return [];
    // Handle both string and number IDs
    const staffIds = service.staff_ids?.map(id => String(id)) || [];
    return staff.filter(s => staffIds.includes(String(s.id)));
  };

  const getTotalDuration = () => {
    return selectedServices.reduce((total, item) => total + (item.service?.duration || 0), 0);
  };

  const getTotalPrice = () => {
    return selectedServices.reduce((total, item) => {
      const price = item.service?.discount_price || item.service?.price || 0;
      return total + price;
    }, 0);
  };

  // Check if a date is available (not on vacation, not a closed day)
  const isDateAvailable = (date: Date): { available: boolean; reason?: string } => {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[date.getDay()];
    
    // Check salon working hours
    if (salon.working_hours) {
      const dayHours = salon.working_hours[dayName];
      if (!dayHours || !dayHours.is_open) {
        return { available: false, reason: 'Neradni dan' };
      }
    }
    
    // Format date for comparison
    
    // Check salon vacations
    if (salon.salon_vacations && salon.salon_vacations.length > 0) {
      for (const vacation of salon.salon_vacations) {
        if (!vacation.is_active) continue;
        const startDate = parseDate(vacation.start_date);
        const endDate = parseDate(vacation.end_date);
        if (startDate && endDate && date >= startDate && date <= endDate) {
          return { available: false, reason: vacation.title || 'Godišnji odmor' };
        }
      }
    }
    
    // Check salon breaks (for specific date or date range)
    if (salon.salon_breaks && salon.salon_breaks.length > 0) {
      for (const breakItem of salon.salon_breaks) {
        if (!breakItem.is_active) continue;
        
        // Specific date break
        if (breakItem.type === 'specific_date' && breakItem.date) {
          const breakDate = parseDate(breakItem.date);
          if (breakDate && date.toDateString() === breakDate.toDateString()) {
            return { available: false, reason: breakItem.title || 'Pauza' };
          }
        }
        
        // Date range break
        if (breakItem.type === 'date_range' && breakItem.start_date && breakItem.end_date) {
          const startDate = parseDate(breakItem.start_date);
          const endDate = parseDate(breakItem.end_date);
          if (startDate && endDate && date >= startDate && date <= endDate) {
            return { available: false, reason: breakItem.title || 'Pauza' };
          }
        }
      }
    }
    
    // Check selected staff vacations/breaks if staff is selected
    const selectedStaffId = selectedServices[0]?.staffId;
    if (selectedStaffId) {
      const selectedStaffMember = staff.find(s => String(s.id) === String(selectedStaffId));
      if (selectedStaffMember) {
        // Check staff working hours
        if (selectedStaffMember.working_hours) {
          const staffDayHours = selectedStaffMember.working_hours[dayName];
          if (!staffDayHours || !staffDayHours.is_working) {
            return { available: false, reason: 'Frizer ne radi' };
          }
        }
      }
    }
    
    return { available: true };
  };
  
  // Helper to parse date from dd.mm.yyyy or yyyy-mm-dd format
  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    
    // Try dd.mm.yyyy format
    if (dateStr.includes('.')) {
      const [day, month, year] = dateStr.split('.').map(Number);
      if (day && month && year) {
        return new Date(year, month - 1, day);
      }
    }
    
    // Try yyyy-mm-dd format
    if (dateStr.includes('-')) {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    
    return null;
  };

  // Step validation
  const canProceed = () => {
    switch (step) {
      case 1: return selectedServices.length > 0 && selectedServices.every(item => item.id);
      case 2: return selectedServices.every(item => item.staffId);
      case 3: return !!selectedDate;
      case 4: return !!selectedTime;
      case 5: return guestData.guest_name && guestData.guest_phone && guestData.guest_address;
      default: return false;
    }
  };

  const handleNext = () => {
    if (!canProceed()) {
      setError('Molimo popunite sva obavezna polja');
      return;
    }
    setError(null);
    
    if (step === 4) {
      // After time selection
      if (user) {
        handleSubmit();
      } else {
        setStep(5); // Go to guest info
      }
    } else if (step === 5) {
      handleSubmit();
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step === 1 && !user) {
      setStep(0);
    } else if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const appointments = [];
      
      for (const selectedService of selectedServices) {
        const appointmentData = {
          salon_id: salon.id,
          staff_id: Number(selectedService.staffId),
          service_id: Number(selectedService.id),
          date: selectedDate,
          time: selectedTime,
          notes,
          ...(user ? {} : {
            guest_name: guestData.guest_name,
            guest_email: guestData.guest_email || undefined,
            guest_phone: guestData.guest_phone,
            guest_address: guestData.guest_address
          })
        };
        
        let response;
        if (user) {
          response = await appointmentAPI.createAppointment(appointmentData);
        } else {
          response = await publicAPI.bookAsGuest({
            salon_id: salon.id,
            staff_id: Number(selectedService.staffId),
            service_id: Number(selectedService.id),
            date: selectedDate,
            time: selectedTime,
            notes,
            guest_name: guestData.guest_name,
            guest_email: guestData.guest_email || undefined,
            guest_phone: guestData.guest_phone,
            guest_address: guestData.guest_address
          });
        }
        appointments.push(response.appointment || response);
      }

      setShowSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Greška pri rezervaciji. Pokušajte ponovo.');
    } finally {
      setLoading(false);
    }
  };

  const stepTitles = ['', 'Izaberite usluge', 'Izaberite frizera / kozmetičara', 'Izaberite datum', 'Izaberite vrijeme', 'Vaši podaci'];

  if (!isOpen) return null;

  // Success Screen
  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[95vh] overflow-y-auto">
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircleSolid className="w-8 h-8 text-green-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Uspješno rezervisano!</h2>
            <p className="text-gray-600 mb-6">Vaš termin je uspješno zakazan u salonu {salon.name}</p>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
              <h3 className="font-semibold text-gray-900 mb-3">Detalji rezervacije:</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CalendarDaysIcon className="w-4 h-4 text-orange-500" />
                  <span>{selectedDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ClockIcon className="w-4 h-4 text-orange-500" />
                  <span>{selectedTime}</span>
                </div>
                {selectedServices.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <ScissorsIcon className="w-4 h-4 text-orange-500" />
                    <span>{item.service?.name}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between">
                <span className="font-medium">Ukupno:</span>
                <span className="font-bold text-orange-600">{getTotalPrice()} KM</span>
              </div>
            </div>
            
            <div className="space-y-3">
              {user && (
                <button
                  onClick={() => { onClose(); navigate('/dashboard?section=appointments'); }}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-4 rounded-xl hover:from-orange-600 hover:to-red-600 transition-all font-medium"
                >
                  Pogledaj moje termine
                </button>
              )}
              <button
                onClick={onClose}
                className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                Zatvori
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 rounded-t-2xl z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Rezervacija termina</h2>
              {user && (
                <p className="text-sm text-gray-500">Prijavljeni ste kao {user.name}</p>
              )}
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
              <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
            </button>
          </div>
          
          {/* Progress Steps - only show for steps 1-4/5 */}
          {step >= 1 && step <= (user ? 4 : 5) && (
            <>
              <div className="flex items-center">
                {[1, 2, 3, 4, ...(user ? [] : [5])].map((stepNum) => (
                  <React.Fragment key={stepNum}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step >= stepNum ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {step > stepNum ? <CheckCircleIcon className="w-5 h-5" /> : stepNum}
                    </div>
                    {stepNum < (user ? 4 : 5) && (
                      <div className={`flex-1 h-1 mx-1 sm:mx-2 ${step > stepNum ? 'bg-orange-500' : 'bg-gray-200'}`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
              <p className="text-sm text-gray-600 mt-2">{stepTitles[step]}</p>
            </>
          )}
        </div>

        <div className="p-4 sm:p-6">
          {/* Step 0: Choice (Guest Only) */}
          {step === 0 && (
            <div className="py-4">
              <p className="text-gray-600 text-center mb-6">Kako želite nastaviti s rezervacijom?</p>
              
              <div className="space-y-4">
                <button
                  onClick={() => { onClose(); navigate('/login', { state: { returnTo: `/salon/${salon.slug || salon.id}` } }); }}
                  className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all group"
                >
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center group-hover:bg-orange-200">
                    <ArrowRightOnRectangleIcon className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-semibold text-gray-900">Prijavite se</h3>
                    <p className="text-sm text-gray-500">Imate račun? Prijavite se za pristup svim terminima</p>
                  </div>
                </button>

                <button
                  onClick={() => { onClose(); navigate('/register', { state: { returnTo: `/salon/${salon.slug || salon.id}` } }); }}
                  className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200">
                    <UserPlusIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-semibold text-gray-900">Registrujte se</h3>
                    <p className="text-sm text-gray-500">Kreirajte račun i pratite sve svoje termine</p>
                  </div>
                </button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-4 text-sm text-gray-500">ili</span>
                  </div>
                </div>

                <button
                  onClick={() => setStep(1)}
                  className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-all group"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-gray-200">
                    <UserIcon className="w-6 h-6 text-gray-600" />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-semibold text-gray-900">Nastavi kao gost</h3>
                    <p className="text-sm text-gray-500">Brza rezervacija bez registracije</p>
                  </div>
                </button>
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 text-center">
                  <strong>Zašto se registrovati?</strong><br />
                  Pregled svih termina • Podsjetnici putem emaila • Brža rezervacija
                </p>
              </div>
            </div>
          )}

          {/* Step 1: Service Selection */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <ScissorsIcon className="w-6 h-6 text-orange-500" />
                <h3 className="text-lg font-semibold">Odaberite usluge</h3>
              </div>
              
              <div className="space-y-4">
                {selectedServices.map((selectedService, index) => (
                  <div key={index} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">Usluga {index + 1}</span>
                      {selectedServices.length > 1 && (
                        <button
                          onClick={() => removeService(index)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <select
                      value={selectedService.id}
                      onChange={(e) => updateService(index, e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
                    >
                      <option value="">Izaberite uslugu</option>
                      {services.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name} - {service.discount_price || service.price} KM ({service.duration} min)
                        </option>
                      ))}
                    </select>
                    {selectedService.service?.description && (
                      <p className="mt-2 text-sm text-gray-500">{selectedService.service.description}</p>
                    )}
                  </div>
                ))}
                
                <button
                  onClick={addService}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-orange-500 hover:text-orange-500 transition-colors"
                >
                  <PlusIcon className="w-5 h-5" />
                  Dodaj još jednu uslugu
                </button>
                
                {selectedServices.some(item => item.id) && (
                  <div className="bg-orange-50 rounded-xl p-4 flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">Ukupno trajanje: <strong>{getTotalDuration()} min</strong></p>
                      <p className="text-sm text-gray-600">Ukupna cijena: <strong className="text-orange-600">{getTotalPrice()} KM</strong></p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Staff Selection */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <UserGroupIcon className="w-6 h-6 text-orange-500" />
                <h3 className="text-lg font-semibold">Odaberite frizera / kozmetičara</h3>
              </div>
              
              <div className="space-y-4">
                {selectedServices.map((selectedService, index) => {
                  const availableStaffForService = getAvailableStaff(selectedService.id);
                  return (
                    <div key={index} className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm font-medium text-gray-700 mb-3">
                        Osoblje za: <span className="text-orange-600">{selectedService.service?.name}</span>
                      </p>
                      
                      {availableStaffForService.length === 0 ? (
                        <p className="text-sm text-red-500">Nema dostupnog osoblja za ovu uslugu</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {availableStaffForService.map((staffMember) => (
                            <button
                              key={staffMember.id}
                              onClick={() => updateStaff(index, staffMember.id)}
                              className={`p-4 rounded-xl border-2 transition-all text-left ${
                                selectedService.staffId === staffMember.id
                                  ? 'border-orange-500 bg-orange-50'
                                  : 'border-gray-200 hover:border-orange-300'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center">
                                  {staffMember.avatar ? (
                                    <img src={staffMember.avatar} alt={staffMember.name} className="w-full h-full rounded-full object-cover" />
                                  ) : (
                                    <UserIcon className="w-6 h-6 text-orange-400" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{staffMember.name}</p>
                                  <p className="text-sm text-gray-500">{staffMember.role}</p>
                                </div>
                                {selectedService.staffId === staffMember.id && (
                                  <CheckCircleSolid className="w-6 h-6 text-orange-500 ml-auto" />
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Date Selection */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <CalendarDaysIcon className="w-6 h-6 text-orange-500" />
                <h3 className="text-lg font-semibold">Odaberite datum</h3>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-3 sm:p-5">
                {/* Custom date picker with European format - Monday first */}
                {(() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  
                  // Day names starting from Monday
                  const dayNames = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'];
                  const monthNames = ['Januar', 'Februar', 'Mart', 'April', 'Maj', 'Juni', 'Juli', 'August', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'];
                  
                  // Get the first day to display (today)
                  const firstDate = new Date(today);
                  
                  // Find the Monday of this week (or previous Monday if today is before Monday)
                  const startOfWeek = new Date(firstDate);
                  const dayOfWeek = startOfWeek.getDay(); // 0=Sunday, 1=Monday, ...
                  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0, Sunday = 6
                  startOfWeek.setDate(startOfWeek.getDate() - daysFromMonday);
                  
                  // Generate calendar grid (5 weeks = 35 days max to cover 30 days + alignment)
                  const calendarDays: (Date | null)[] = [];
                  const endDate = new Date(today);
                  endDate.setDate(endDate.getDate() + 30);
                  
                  for (let i = 0; i < 42; i++) { // 6 weeks max
                    const date = new Date(startOfWeek);
                    date.setDate(startOfWeek.getDate() + i);
                    
                    // Only include if within valid range (today to today+30)
                    if (date >= today && date <= endDate) {
                      calendarDays.push(date);
                    } else if (date < today && date >= startOfWeek) {
                      // Past days in the first week - show as disabled placeholder
                      calendarDays.push(null);
                    } else if (date > endDate) {
                      // Stop if we've gone past the end date
                      break;
                    }
                  }
                  
                  const formatDateValue = (date: Date) => {
                    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
                  };
                  
                  // Convert day index (0=Sunday) to Monday-first index (0=Monday)
                  const getMondayFirstIndex = (date: Date) => {
                    const day = date.getDay();
                    return day === 0 ? 6 : day - 1;
                  };
                  
                  // Group into weeks
                  const weeks: (Date | null)[][] = [];
                  let currentWeek: (Date | null)[] = [];
                  
                  // Add empty cells for first week alignment
                  if (calendarDays[0] === null || calendarDays[0]) {
                    const firstValidDate = calendarDays.find(d => d !== null);
                    if (firstValidDate) {
                      const firstDayIndex = getMondayFirstIndex(firstValidDate);
                      for (let i = 0; i < firstDayIndex; i++) {
                        currentWeek.push(null);
                      }
                    }
                  }
                  
                  calendarDays.filter(d => d !== null).forEach((date) => {
                    currentWeek.push(date);
                    if (currentWeek.length === 7) {
                      weeks.push(currentWeek);
                      currentWeek = [];
                    }
                  });
                  
                  // Add remaining days
                  if (currentWeek.length > 0) {
                    weeks.push(currentWeek);
                  }
                  
                  return (
                    <div className="space-y-4">
                      {/* Month/Year header */}
                      <div className="text-center font-semibold text-gray-800 text-lg">
                        {monthNames[today.getMonth()]} {today.getFullYear()}
                      </div>
                      
                      {/* Day names header - Monday first */}
                      <div className="grid grid-cols-7 gap-1 sm:gap-2">
                        {dayNames.map((d, idx) => (
                          <div 
                            key={d} 
                            className={`py-2 text-center text-xs sm:text-sm font-semibold ${
                              idx === 6 ? 'text-red-400' : 'text-gray-600'
                            }`}
                          >
                            {d}
                          </div>
                        ))}
                      </div>
                      
                      {/* Calendar grid */}
                      {weeks.map((week, weekIdx) => (
                        <div key={weekIdx} className="grid grid-cols-7 gap-1 sm:gap-2">
                          {week.map((date, dayIdx) => {
                            if (!date) {
                              return <div key={`empty-${weekIdx}-${dayIdx}`} className="aspect-square" />;
                            }
                            
                            const dateStr = formatDateValue(date);
                            const isSelected = selectedDate === dateStr;
                            const isToday = date.getTime() === today.getTime();
                            const isSunday = date.getDay() === 0;
                            const availability = isDateAvailable(date);
                            const isDisabled = !availability.available;
                            
                            return (
                              <button
                                key={dateStr}
                                type="button"
                                disabled={isDisabled}
                                onClick={() => {
                                  if (!isDisabled) {
                                    setSelectedDate(dateStr);
                                    setSelectedTime('');
                                  }
                                }}
                                title={isDisabled ? availability.reason : undefined}
                                className={`
                                  aspect-square flex flex-col items-center justify-center rounded-xl 
                                  text-sm sm:text-base font-medium transition-all duration-200
                                  ${isDisabled
                                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed border border-gray-200'
                                    : isSelected 
                                      ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg scale-105' 
                                      : isSunday
                                        ? 'bg-red-50 text-red-400 hover:bg-red-100 border border-red-100'
                                        : 'bg-white text-gray-700 hover:bg-orange-50 hover:border-orange-300 border border-gray-200'
                                  }
                                  ${isToday && !isSelected && !isDisabled ? 'ring-2 ring-orange-400 ring-offset-1' : ''}
                                `}
                              >
                                <span className="text-base sm:text-xl font-bold">{date.getDate()}</span>
                                {isDisabled && (
                                  <span className="text-[8px] sm:text-[10px] leading-tight">Zatvoreno</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ))}
                      
                      {/* Selected date display */}
                      {selectedDate && (
                        <div className="mt-4 p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl text-center border border-orange-200">
                          <span className="text-orange-700 font-medium text-base">
                            Odabrani datum: <strong className="text-orange-800">{selectedDate}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
              
              <p className="text-sm text-gray-500 text-center">
                Možete rezervisati termin do 30 dana unaprijed
              </p>
            </div>
          )}

          {/* Step 4: Time Selection */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <ClockIcon className="w-6 h-6 text-orange-500" />
                <h3 className="text-lg font-semibold">Odaberite vrijeme</h3>
              </div>
              
              {loadingSlots ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                  <span className="text-gray-600">Učitavanje dostupnih termina...</span>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-8">
                  <ClockIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nema dostupnih termina</h3>
                  <p className="text-gray-600">Za izabrani datum nema slobodnih termina. Pokušajte sa drugim datumom.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-500">Datum: <strong>{selectedDate}</strong></span>
                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      {availableSlots.length} dostupnih
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => setSelectedTime(slot)}
                        className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                          selectedTime === slot
                            ? 'border-orange-500 bg-orange-50 shadow-md'
                            : 'border-green-200 bg-green-50 hover:border-green-300'
                        }`}
                      >
                        <ClockIcon className={`w-5 h-5 mb-1 ${selectedTime === slot ? 'text-orange-600' : 'text-green-600'}`} />
                        <span className={`text-sm font-semibold ${selectedTime === slot ? 'text-orange-700' : 'text-green-700'}`}>
                          {slot}
                        </span>
                        {selectedTime === slot && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Notes */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Napomena (opciono)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Dodatne napomene za frizera..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          )}

          {/* Step 5: Guest Info (Guest Only) */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <UserIcon className="w-6 h-6 text-orange-500" />
                <h3 className="text-lg font-semibold">Vaši podaci</h3>
              </div>
              
              <p className="text-gray-600 mb-4">
                Unesite vaše podatke kako bi vas salon mogao kontaktirati.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ime i prezime *</label>
                <input
                  type="text"
                  value={guestData.guest_name}
                  onChange={(e) => setGuestData({ ...guestData, guest_name: e.target.value })}
                  placeholder="Vaše ime i prezime"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Broj telefona *</label>
                <input
                  type="tel"
                  value={guestData.guest_phone}
                  onChange={(e) => setGuestData({ ...guestData, guest_phone: e.target.value })}
                  placeholder="+387 6X XXX XXX"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Adresa *</label>
                <input
                  type="text"
                  value={guestData.guest_address}
                  onChange={(e) => setGuestData({ ...guestData, guest_address: e.target.value })}
                  placeholder="Vaša adresa stanovanja"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email (opciono)</label>
                <input
                  type="email"
                  value={guestData.guest_email}
                  onChange={(e) => setGuestData({ ...guestData, guest_email: e.target.value })}
                  placeholder="vas@email.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Booking Summary */}
              <div className="bg-orange-50 rounded-xl p-4 mt-4">
                <h4 className="font-semibold text-gray-900 mb-3">Pregled rezervacije:</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Salon:</strong> {salon.name}</p>
                  {selectedServices.map((item, idx) => (
                    <p key={idx}><strong>Usluga:</strong> {item.service?.name}</p>
                  ))}
                  <p><strong>Datum:</strong> {selectedDate}</p>
                  <p><strong>Vrijeme:</strong> {selectedTime}</p>
                  <p><strong>Cijena:</strong> <span className="text-orange-600 font-semibold">{getTotalPrice()} KM</span></p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-lg mt-4">
              <ExclamationCircleIcon className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        {step >= 1 && step <= (user ? 4 : 5) && (
          <div className="sticky bottom-0 flex items-center justify-between px-4 sm:px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
            <button
              onClick={handleBack}
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              ← Nazad
            </button>
            
            <button
              onClick={handleNext}
              disabled={loading || !canProceed()}
              className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-colors"
            >
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              {step === 4 && user ? 'Potvrdi rezervaciju' : step === (user ? 4 : 5) ? 'Potvrdi rezervaciju' : 'Nastavi'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GuestBookingModal;
