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
  Filter,
  Users
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { appointmentAPI, staffAPI, serviceAPI } from '../../services/api';
import { formatDateEuropean, getCurrentDateEuropean } from '../../utils/dateUtils';

export function SalonCalendar() {
  const { user } = useAuth();
  const location = useLocation();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedStaff, setSelectedStaff] = useState<string>('all');
  const [loading, setLoading] = useState(true);
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
  }, [selectedDate, selectedStaff]);

  const loadData = async (keepSelectedDate = false) => {
    if (!user?.salon) return;

    const currentSelectedDate = selectedDate; // Save current selected date

    try {
      setLoading(true);
      
      // Load appointments, staff, and services
      const [appointmentsData, staffData, servicesData] = await Promise.all([
        appointmentAPI.getAppointments(),
        staffAPI.getStaff(user.salon.id),
        serviceAPI.getServices(user.salon.id)
      ]);
      
      // Handle paginated or array responses
      const appointmentsArray = Array.isArray(appointmentsData) ? appointmentsData : (appointmentsData?.data || []);
      const staffArray = Array.isArray(staffData) ? staffData : (staffData?.data || []);
      const servicesArray = Array.isArray(servicesData) ? servicesData : (servicesData?.data || []);
      
      // Filter appointments for this salon
      const salonAppointments = appointmentsArray.filter((app: any) => app.salon_id === user.salon.id);
      
      setAppointments(salonAppointments);
      setStaff(staffArray);
      setServices(servicesArray);

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
    if (!user?.salon) return;
    
    try {
      const appointmentsData = await appointmentAPI.getAppointments();
      const appointmentsArray = Array.isArray(appointmentsData) ? appointmentsData : (appointmentsData?.data || []);
      const salonAppointments = appointmentsArray.filter((app: any) => app.salon_id === user.salon.id);
      setAppointments(salonAppointments);
    } catch (error) {
      console.error('Error refreshing appointments:', error);
    }
  };

  const loadAppointmentsForDate = (date: string) => {
    // Filter appointments for selected date and staff
    let dayAppointments = appointments.filter(app => app.date === date);
    
    if (selectedStaff !== 'all') {
      dayAppointments = dayAppointments.filter(app => app.staff_id === selectedStaff);
    }
    
    dayAppointments.sort((a, b) => a.time.localeCompare(b.time));
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
    let dayAppointments = appointments.filter(app => app.date === dateStr);
    
    if (selectedStaff !== 'all') {
      dayAppointments = dayAppointments.filter(app => app.staff_id === selectedStaff);
    }
    
    return dayAppointments;
  };

  const handleDateClick = (day: number) => {
    if (!day) return;
    
    const dateStr = formatDateEuropean(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
    setSelectedDate(dateStr);
  };

  const handleAppointmentAction = async (appointmentId: string, action: 'confirm' | 'cancel') => {
    // Confirm before cancelling
    if (action === 'cancel') {
      const confirmed = window.confirm('Da li ste sigurni da želite otkazati ovaj termin?');
      if (!confirmed) return;
    }

    try {
      const newStatus = action === 'confirm' ? 'confirmed' : 'cancelled';
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
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Završeno';
      case 'in_progress': return 'U toku';
      case 'confirmed': return 'Potvrđen';
      case 'pending': return 'Na čekanju';
      case 'cancelled': return 'Otkazan';
      default: return status;
    }
  };

  const getServiceName = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    return service?.name || 'Nepoznata usluga';
  };

  const getStaffName = (staffId: string) => {
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember?.name || 'Nepoznat zaposleni';
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
    .filter(app => {
      const matchesDate = app.date === selectedDate;
      const matchesStaff = selectedStaff === 'all' || app.staff_id === selectedStaff;
      return matchesDate && matchesStaff;
    })
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Kalendar salona</h1>
        
        {/* Staff Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={selectedStaff}
            onChange={(e) => setSelectedStaff(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Svi zaposleni</option>
            {staff.map(staffMember => (
              <option key={staffMember.id} value={staffMember.id}>
                {staffMember.name}
              </option>
            ))}
          </select>
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
            <div className="space-y-4">
              {selectedDateAppointments.length > 0 ? (
                selectedDateAppointments.map(appointment => (
                  <div 
                    key={appointment.id} 
                    className={`border rounded-lg p-4 transition-all duration-300 ${
                      highlightedAppointment === appointment.id 
                        ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-500 ring-opacity-50 animate-pulse' 
                        : 'border-gray-200'
                    }`}
                    id={`appointment-${appointment.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-lg font-semibold text-gray-900">
                        {appointment.time}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                        {getStatusText(appointment.status)}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{appointment.client_name}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{appointment.client_phone}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span>{getStaffName(appointment.staff_id)}</span>
                      </div>
                      
                      <div className="text-gray-600">
                        <strong>Usluga:</strong> {getServiceName(appointment.service_id)}
                      </div>
                      
                      <div className="text-gray-600">
                        <strong>Cijena:</strong> {appointment.total_price} KM
                      </div>
                      
                      {appointment.notes && (
                        <div className="text-gray-600">
                          <strong>Napomene:</strong> {appointment.notes}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    {appointment.status === 'pending' && (
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => handleAppointmentAction(appointment.id, 'confirm')}
                          className="flex-1 bg-green-600 text-white py-2 px-3 rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center justify-center gap-1"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Potvrdi
                        </button>
                        <button
                          onClick={() => handleAppointmentAction(appointment.id, 'cancel')}
                          className="flex-1 bg-red-600 text-white py-2 px-3 rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center justify-center gap-1"
                        >
                          <XCircle className="w-3 h-3" />
                          Odbaci
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p>Nema termina za ovaj datum</p>
                  {selectedStaff !== 'all' && (
                    <p className="text-sm">za izabranog zaposlenog</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}