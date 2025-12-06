import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  User, 
  Phone,
  CheckCircle,
  XCircle,
  Play,
  Edit,
  Plus,
  MessageSquare,
  Scissors
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { appointmentAPI, staffAPI, serviceAPI } from '../../services/api';
import { formatDateEuropean, getCurrentDateEuropean } from '../../utils/dateUtils';
import { StaffRole, StaffRoleLabels } from '../../types';
import { ManualBookingModal } from '../Common/ManualBookingModal';

export function FrizerCalendar() {
  const { user } = useAuth();
  const location = useLocation();
  const [staff, setStaff] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [highlightedAppointment, setHighlightedAppointment] = useState<number | null>(null);

  // Read date and appointment from URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlDate = params.get('date');
    const urlAppointment = params.get('appointment');
    
    if (urlDate) {
      setSelectedDate(urlDate);
      // Set currentDate to show the right month
      const [year, month] = urlDate.split('-').map(Number);
      setCurrentDate(new Date(year, month - 1, 1));
    }
    
    if (urlAppointment) {
      setHighlightedAppointment(parseInt(urlAppointment));
      // Scroll to highlighted appointment after a short delay
      setTimeout(() => {
        const element = document.getElementById(`appointment-${urlAppointment}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
      // Clear highlight after 5 seconds
      setTimeout(() => setHighlightedAppointment(null), 5000);
    }
  }, [location.search]);

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    if (selectedDate) {
      loadAppointmentsForDate(selectedDate);
    }
  }, [selectedDate]);

  const loadData = async (keepSelectedDate = false) => {
    if (!user?.staff_profile) return;

    const currentSelectedDate = selectedDate; // Save current selected date

    try {
      setLoading(true);
      
      // Load staff data
      const staffData = await staffAPI.getStaffMember(user.staff_profile.salon_id, user.staff_profile.id);
      setStaff(staffData);

      // Load appointments
      const appointmentsData = await staffAPI.getAppointments(user.staff_profile.salon_id, user.staff_profile.id);
      setAppointments(appointmentsData.appointments || []);

      // Load services - API returns { data: [...] } format
      const servicesResponse = await serviceAPI.getServices(user.staff_profile.salon_id);
      const servicesArray = Array.isArray(servicesResponse) ? servicesResponse : (servicesResponse.data || []);
      setServices(servicesArray.filter((s: any) => s.staff_ids?.includes(user.staff_profile.id)));

      // Set today as selected date only if not keeping current date
      if (!keepSelectedDate || !currentSelectedDate) {
        const today = getCurrentDateEuropean();
        setSelectedDate(today);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh appointments without changing selected date
  const refreshAppointments = async () => {
    if (!user?.staff_profile) return;
    
    try {
      const appointmentsData = await staffAPI.getAppointments(user.staff_profile.salon_id, user.staff_profile.id);
      setAppointments(appointmentsData.appointments || []);
    } catch (error) {
      console.error('Error refreshing appointments:', error);
    }
  };

  const loadAppointmentsForDate = (date: string) => {
    // Filter appointments for selected date
    const dayAppointments = appointments
      .filter(app => app.date === date)
      .sort((a, b) => a.time.localeCompare(b.time));
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const getAppointmentsForDay = (day: number) => {
    if (!day) return [];
    
    const dateStr = formatDateEuropean(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
    return appointments.filter(app => app.date === dateStr);
  };

  const handleDateClick = (day: number) => {
    if (!day) return;
    
    const dateStr = formatDateEuropean(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
    setSelectedDate(dateStr);
  };

  const handleAppointmentAction = async (appointmentId: string, action: 'start' | 'complete' | 'cancel') => {
    // Confirm before cancelling
    if (action === 'cancel') {
      const confirmed = window.confirm('Da li ste sigurni da želite otkazati ovaj termin?');
      if (!confirmed) return;
    }

    try {
      let newStatus: string;
      switch (action) {
        case 'start':
          newStatus = 'in_progress';
          break;
        case 'complete':
          newStatus = 'completed';
          break;
        case 'cancel':
          newStatus = 'cancelled';
          break;
        default:
          return;
      }

      await appointmentAPI.updateAppointment(appointmentId, { status: newStatus });
      
      // Refresh appointments without changing selected date
      refreshAppointments();
    } catch (error) {
      console.error('Error updating appointment:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-orange-100 text-orange-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Završeno';
      case 'in_progress': return 'U toku';
      case 'confirmed': return 'Potvrđen';
      case 'cancelled': return 'Otkazan';
      default: return status;
    }
  };

  const getServiceName = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    return service?.name || 'Nepoznata usluga';
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const monthNames = [
    'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun',
    'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'
  ];

  const dayNames = ['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub'];

  const selectedDateAppointments = appointments
    .filter(app => app.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Učitavanje kalendara...</p>
        </div>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="text-center py-12">
        <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Profil nije pronađen</h3>
        <p className="text-gray-600">Kontaktirajte administratora salona da vam kreira profil.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Kalendar termina</h1>
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Dodaj termin</span>
            <span className="sm:hidden">Dodaj</span>
          </button>
          <div className="hidden sm:block text-sm text-gray-600">
            {staff.name} - {StaffRoleLabels[staff.role as StaffRole] || staff.role}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border p-3 sm:p-6">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-base sm:text-xl font-semibold text-gray-900">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Danas
              </button>
              <button
                onClick={() => navigateMonth('next')}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {/* Day headers */}
            {dayNames.map(day => (
              <div key={day} className="p-1 sm:p-2 text-center text-xs sm:text-sm font-medium text-gray-500">
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{day.charAt(0)}</span>
              </div>
            ))}
            
            {/* Calendar days */}
            {getDaysInMonth(currentDate).map((day, index) => {
              if (!day) {
                return <div key={index} className="p-1 sm:p-2 h-10 sm:h-20"></div>;
              }
              
              const dayAppointments = getAppointmentsForDay(day);
              const dateStr = formatDateEuropean(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
              const isSelected = selectedDate === dateStr;
              const isToday = dateStr === getCurrentDateEuropean();
              
              return (
                <div
                  key={day}
                  onClick={() => handleDateClick(day)}
                  className={`p-1 sm:p-2 h-10 sm:h-20 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors rounded-sm sm:rounded ${
                    isSelected ? 'bg-blue-50 border-blue-300' : ''
                  } ${isToday ? 'bg-orange-50 border-orange-300' : ''}`}
                >
                  <div className={`text-xs sm:text-sm font-medium ${
                    isToday ? 'text-orange-600' : isSelected ? 'text-blue-600' : 'text-gray-900'
                  }`}>
                    {day}
                  </div>
                  {/* Desktop: show appointment times */}
                  <div className="hidden sm:block space-y-1 mt-1">
                    {dayAppointments.slice(0, 2).map(appointment => (
                      <div
                        key={appointment.id}
                        className={`text-xs px-1 py-0.5 rounded truncate ${getStatusColor(appointment.status)}`}
                      >
                        {appointment.time}
                      </div>
                    ))}
                    {dayAppointments.length > 2 && (
                      <div className="text-xs text-gray-500">
                        +{dayAppointments.length - 2} više
                      </div>
                    )}
                  </div>
                  {/* Mobile: compact dot indicator */}
                  {dayAppointments.length > 0 && (
                    <div className="sm:hidden flex items-center justify-center mt-0.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        dayAppointments.some(a => a.status === 'pending') ? 'bg-yellow-500' :
                        dayAppointments.some(a => a.status === 'confirmed') ? 'bg-orange-500' :
                        'bg-green-500'
                      }`}></div>
                      {dayAppointments.length > 1 && (
                        <span className="text-[10px] text-gray-500 ml-0.5">{dayAppointments.length}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Details */}
        <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-6">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
              {selectedDate ? selectedDate : 'Izaberite datum'}
            </h3>
          </div>

          {selectedDate && (
            <div className="space-y-3 sm:space-y-4">
              {selectedDateAppointments.length > 0 ? (
                selectedDateAppointments.map(appointment => (
                  <div 
                    key={appointment.id} 
                    className={`border rounded-lg p-4 transition-all duration-300 ${
                      highlightedAppointment === appointment.id 
                        ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-500 ring-opacity-50 animate-pulse' 
                        : 'border-gray-200 hover:shadow-md'
                    }`}
                    id={`appointment-${appointment.id}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-600" />
                        <span className="text-lg font-semibold text-gray-900">
                          {appointment.time} - {appointment.end_time}
                        </span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                        {getStatusText(appointment.status)}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      {/* Client Name */}
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{appointment.client_name}</span>
                        {appointment.is_guest && (
                          <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">Ručno dodano</span>
                        )}
                      </div>
                      
                      {/* Phone - Clickable */}
                      {appointment.client_phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-green-500" />
                          <a 
                            href={`tel:${appointment.client_phone}`}
                            className="text-green-600 hover:text-green-800 font-medium hover:underline"
                          >
                            {appointment.client_phone}
                          </a>
                        </div>
                      )}
                      
                      {/* Service */}
                      <div className="flex items-center gap-2">
                        <Scissors className="w-4 h-4 text-purple-500" />
                        <span className="text-gray-700">{getServiceName(appointment.service_id)}</span>
                        <span className="text-gray-500">•</span>
                        <span className="font-semibold text-gray-900">{appointment.total_price} KM</span>
                      </div>
                      
                      {/* Notes - Highlighted */}
                      {appointment.notes && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <MessageSquare className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="text-xs font-medium text-yellow-700 uppercase">Napomena:</span>
                              <p className="text-sm text-yellow-800 mt-1">{appointment.notes}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 mt-4 pt-3 border-t">
                      {appointment.status === 'confirmed' && (
                        <button
                          onClick={() => handleAppointmentAction(appointment.id, 'start')}
                          className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center justify-center gap-1"
                        >
                          <Play className="w-3 h-3" />
                          Počni
                        </button>
                      )}
                      
                      {appointment.status === 'in_progress' && (
                        <button
                          onClick={() => handleAppointmentAction(appointment.id, 'complete')}
                          className="flex-1 bg-green-600 text-white py-2 px-3 rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center justify-center gap-1"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Završi
                        </button>
                      )}
                      
                      {(appointment.status === 'confirmed' || appointment.status === 'in_progress') && (
                        <button
                          onClick={() => handleAppointmentAction(appointment.id, 'cancel')}
                          className="flex-1 bg-red-600 text-white py-2 px-3 rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center justify-center gap-1"
                        >
                          <XCircle className="w-3 h-3" />
                          Otkaži
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p>Nema termina za ovaj datum</p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center justify-center gap-1 mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                    Dodaj termin
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Manual Booking Modal */}
      {user?.staff_profile && (
        <ManualBookingModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={loadData}
          salonId={user.staff_profile.salon_id}
          staffId={user.staff_profile.id}
          preselectedDate={selectedDate}
        />
      )}
    </div>
  );
}