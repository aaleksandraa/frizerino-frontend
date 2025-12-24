import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  User,
  Filter,
  LayoutGrid,
  Columns,
  CalendarDays
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { appointmentAPI, staffAPI, serviceAPI } from '../../services/api';
import { formatDateEuropean, getCurrentDateEuropean } from '../../utils/dateUtils';
import { ClientDetailsModal } from '../Common/ClientDetailsModal';

interface SalonCalendarWeekViewProps {
  onViewChange?: (view: 'month' | 'week' | 'day') => void;
}

export function SalonCalendarWeekView({ onViewChange }: SalonCalendarWeekViewProps) {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getMonday(new Date()));
  const [selectedStaff, setSelectedStaff] = useState<string>('all');
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [capacityData, setCapacityData] = useState<Map<string, any>>(new Map());

  // Load data when component mounts or week changes
  useEffect(() => {
    loadData();
    loadCapacityData();
  }, [user, currentWeekStart]);

  const loadData = async () => {
    if (!user?.salon) return;

    try {
      setLoading(true);
      
      // Calculate date range for current week
      const weekDays = getWeekDays();
      const startDate = formatDateEuropean(weekDays[0]);
      const endDate = formatDateEuropean(weekDays[6]);
      
      // Load appointments, staff, and services
      const [appointmentsData, staffData, servicesData] = await Promise.all([
        appointmentAPI.getAppointments({ 
          per_page: 500,
          start_date: startDate,
          end_date: endDate
        }),
        staffAPI.getStaff(user.salon.id),
        serviceAPI.getServices(user.salon.id)
      ]);
      
      const appointmentsArray = Array.isArray(appointmentsData) ? appointmentsData : (appointmentsData?.data || []);
      const staffArray = Array.isArray(staffData) ? staffData : (staffData?.data || []);
      const servicesArray = Array.isArray(servicesData) ? servicesData : (servicesData?.data || []);
      
      const salonAppointments = appointmentsArray.filter((app: any) => app.salon_id === user.salon.id);
      
      setAppointments(salonAppointments);
      setStaff(staffArray);
      setServices(servicesArray);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCapacityData = async () => {
    if (!user?.salon) return;

    try {
      const weekDays = getWeekDays();
      const year = weekDays[0].getFullYear();
      const month = weekDays[0].getMonth() + 1;
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      
      const response = await appointmentAPI.getMonthCapacity(monthStr);
      
      const capacityMap = new Map();
      response.capacity.forEach((item: any) => {
        capacityMap.set(item.date, item);
      });
      
      setCapacityData(capacityMap);
    } catch (error) {
      console.error('Error loading capacity data:', error);
    }
  };

  // Get Monday of the week for a given date
  function getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  }

  // Get working hours from salon or selected staff
  const getWorkingHours = () => {
    // If specific staff is selected, use their working hours
    if (selectedStaff !== 'all') {
      const staffMember = staff.find(s => String(s.id) === String(selectedStaff));
      if (staffMember?.working_hours) {
        // Extract earliest start and latest end from working hours
        const hours = staffMember.working_hours;
        let earliestStart = 24;
        let latestEnd = 0;
        
        Object.values(hours).forEach((day: any) => {
          if (day.is_working && day.start && day.end) {
            const startHour = parseInt(day.start.split(':')[0]);
            const endHour = parseInt(day.end.split(':')[0]);
            if (startHour < earliestStart) earliestStart = startHour;
            if (endHour > latestEnd) latestEnd = endHour;
          }
        });
        
        if (earliestStart < 24 && latestEnd > 0) {
          return { start: earliestStart, end: latestEnd };
        }
      }
    }
    
    // Otherwise use salon working hours
    if (user?.salon?.working_hours) {
      const hours = user.salon.working_hours;
      let earliestStart = 24;
      let latestEnd = 0;
      
      Object.values(hours).forEach((day: any) => {
        if (day.is_open && day.open && day.close) {
          const startHour = parseInt(day.open.split(':')[0]);
          const endHour = parseInt(day.close.split(':')[0]);
          if (startHour < earliestStart) earliestStart = startHour;
          if (endHour > latestEnd) latestEnd = endHour;
        }
      });
      
      if (earliestStart < 24 && latestEnd > 0) {
        return { start: earliestStart, end: latestEnd };
      }
    }
    
    return { start: 8, end: 20 }; // Default
  };

  const workingHours = getWorkingHours();
  const workingHoursStart = workingHours.start;
  const workingHoursEnd = workingHours.end;

  // Get 7 days starting from Monday
  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      days.push(date);
    }
    return days;
  };

  // Navigate week
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(currentWeekStart.getDate() + (direction === 'prev' ? -7 : 7));
    setCurrentWeekStart(newDate);
  };

  // Go to current week
  const goToToday = () => {
    setCurrentWeekStart(getMonday(new Date()));
  };

  // Get appointments for a specific date and hour
  const getAppointmentsForSlot = (date: Date, hour: number) => {
    const dateStr = formatDateEuropean(date);
    
    let dayAppointments = appointments.filter(app => {
      if (app.date !== dateStr) return false;
      
      // Check if appointment overlaps with this hour slot
      const appHour = parseInt(app.time.split(':')[0]);
      const appMinute = parseInt(app.time.split(':')[1]);
      const appStartMinutes = appHour * 60 + appMinute;
      
      const endTimeParts = app.end_time.split(':');
      const appEndHour = parseInt(endTimeParts[0]);
      const appEndMinute = parseInt(endTimeParts[1]);
      const appEndMinutes = appEndHour * 60 + appEndMinute;
      
      const slotStartMinutes = hour * 60;
      const slotEndMinutes = (hour + 1) * 60;
      
      // Check if appointment overlaps with this hour slot
      return appStartMinutes < slotEndMinutes && appEndMinutes > slotStartMinutes;
    });

    if (selectedStaff !== 'all') {
      dayAppointments = dayAppointments.filter(app => String(app.staff_id) === String(selectedStaff));
    }

    return dayAppointments;
  };

  // Calculate position and height of appointment in the slot
  const getAppointmentStyle = (appointment: any, hour: number) => {
    const appHour = parseInt(appointment.time.split(':')[0]);
    const appMinute = parseInt(appointment.time.split(':')[1]);
    
    const endTimeParts = appointment.end_time.split(':');
    const appEndHour = parseInt(endTimeParts[0]);
    const appEndMinute = parseInt(endTimeParts[1]);
    
    // Calculate duration in minutes
    const startMinutes = appHour * 60 + appMinute;
    const endMinutes = appEndHour * 60 + appEndMinute;
    const durationMinutes = endMinutes - startMinutes;
    
    // Calculate offset from hour start
    const offsetMinutes = startMinutes - (hour * 60);
    const offsetPercent = (offsetMinutes / 60) * 100;
    
    // Calculate height based on duration
    const heightPercent = (durationMinutes / 60) * 100;
    
    return {
      top: `${offsetPercent}%`,
      height: `${Math.min(heightPercent, 100 - offsetPercent)}%`,
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 border-green-300 text-green-800';
      case 'in_progress': return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'confirmed': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'pending': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'cancelled': return 'bg-red-100 border-red-300 text-red-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
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

  const handleAppointmentClick = (appointment: any) => {
    setSelectedAppointment(appointment);
    setShowAppointmentModal(true);
  };

  const dayNames = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'];
  const monthNames = [
    'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun',
    'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'
  ];

  const weekDays = getWeekDays();
  const hours = Array.from({ length: workingHoursEnd - workingHoursStart }, (_, i) => workingHoursStart + i);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Učitavanje sedmičnog rasporeda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-full mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Sedmični raspored</h1>
          <div className="text-sm text-gray-600">
            {weekDays[0].getDate()} {monthNames[weekDays[0].getMonth()]} - {weekDays[6].getDate()} {monthNames[weekDays[6].getMonth()]} {weekDays[6].getFullYear()}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          {onViewChange && (
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => onViewChange('month')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                <LayoutGrid className="w-4 h-4" />
                Mjesec
              </button>
              <button
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-white text-blue-600 shadow-sm"
              >
                <Columns className="w-4 h-4" />
                Sedmica
              </button>
              <button
                onClick={() => onViewChange('day')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                <CalendarDays className="w-4 h-4" />
                Dan
              </button>
            </div>
          )}

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
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => navigateWeek('prev')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <button
          onClick={goToToday}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Danas
        </button>
        <button
          onClick={() => navigateWeek('next')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Header with days */}
            <div className="grid grid-cols-8 border-b bg-gray-50">
              <div className="p-3 text-sm font-medium text-gray-500 border-r">Vrijeme</div>
              {weekDays.map((day, index) => {
                const isToday = formatDateEuropean(day) === getCurrentDateEuropean();
                const isoDateStr = day.toISOString().split('T')[0];
                const capacity = capacityData.get(isoDateStr);
                
                return (
                  <div
                    key={index}
                    className={`p-3 text-center border-r last:border-r-0 ${
                      isToday ? 'bg-blue-50' : ''
                    } ${
                      capacity?.color === 'red' ? 'bg-red-50' :
                      capacity?.color === 'yellow' ? 'bg-yellow-50' :
                      capacity?.color === 'green' ? 'bg-green-50' : ''
                    }`}
                  >
                    <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                      {dayNames[index]}
                    </div>
                    <div className={`text-xs ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                      {day.getDate()}.{day.getMonth() + 1}.
                    </div>
                    {/* Capacity badge */}
                    {capacity && capacity.percentage > 0 && (
                      <div className="mt-1">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          capacity.color === 'red' ? 'bg-red-500 text-white' :
                          capacity.color === 'yellow' ? 'bg-yellow-500 text-white' :
                          'bg-green-500 text-white'
                        }`}>
                          {capacity.percentage}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Time slots */}
            <div className="relative">
              {hours.map((hour) => (
                <div key={hour} className="grid grid-cols-8 border-b" style={{ minHeight: '80px' }}>
                  {/* Time label */}
                  <div className="p-2 text-sm text-gray-500 border-r flex items-start">
                    {hour}:00
                  </div>

                  {/* Day columns */}
                  {weekDays.map((day, dayIndex) => {
                    const slotAppointments = getAppointmentsForSlot(day, hour);
                    const isToday = formatDateEuropean(day) === getCurrentDateEuropean();

                    return (
                      <div
                        key={dayIndex}
                        className={`relative border-r last:border-r-0 ${
                          isToday ? 'bg-blue-50/30' : ''
                        }`}
                      >
                        {slotAppointments.map((appointment) => {
                          const style = getAppointmentStyle(appointment, hour);
                          const appHour = parseInt(appointment.time.split(':')[0]);
                          
                          // Only render if this is the starting hour
                          if (appHour !== hour) return null;

                          return (
                            <div
                              key={appointment.id}
                              className={`absolute left-1 right-1 rounded border-l-4 p-1.5 cursor-pointer hover:shadow-md transition-shadow overflow-hidden ${getStatusColor(appointment.status)}`}
                              style={style}
                              onClick={() => handleAppointmentClick(appointment)}
                            >
                              <div className="text-xs font-semibold truncate">
                                {appointment.time} - {appointment.end_time}
                              </div>
                              <div className="text-xs font-medium truncate">
                                {appointment.client_name}
                              </div>
                              <div className="text-xs truncate opacity-90">
                                {getServiceName(appointment.service_id)}
                              </div>
                              {selectedStaff === 'all' && (
                                <div className="text-xs truncate opacity-75">
                                  {getStaffName(appointment.staff_id)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Appointment Details Modal */}
      {selectedAppointment && showAppointmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Detalji termina</h3>
              <button
                onClick={() => setShowAppointmentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-500">Datum i vrijeme</div>
                <div className="font-medium">
                  {selectedAppointment.date} • {selectedAppointment.time} - {selectedAppointment.end_time}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Klijent</div>
                <div
                  onClick={() => {
                    setSelectedClient({
                      id: selectedAppointment.client_id ? String(selectedAppointment.client_id) : undefined,
                      name: selectedAppointment.client_name,
                      phone: selectedAppointment.client_phone,
                      email: selectedAppointment.client_email
                    });
                    setShowClientModal(true);
                  }}
                  className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                >
                  {selectedAppointment.client_name}
                </div>
                <div className="text-sm text-gray-600">{selectedAppointment.client_phone}</div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Zaposleni</div>
                <div className="font-medium">{getStaffName(selectedAppointment.staff_id)}</div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Usluga</div>
                <div className="font-medium">{getServiceName(selectedAppointment.service_id)}</div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Cijena</div>
                <div className="font-medium">{selectedAppointment.total_price} KM</div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Status</div>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedAppointment.status)}`}>
                  {selectedAppointment.status}
                </span>
              </div>

              {selectedAppointment.notes && (
                <div>
                  <div className="text-sm text-gray-500">Napomene</div>
                  <div className="text-sm">{selectedAppointment.notes}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Client Details Modal */}
      {selectedClient && (
        <ClientDetailsModal
          isOpen={showClientModal}
          onClose={() => {
            setShowClientModal(false);
            setSelectedClient(null);
          }}
          clientId={selectedClient.id}
          clientName={selectedClient.name}
          clientPhone={selectedClient.phone}
          clientEmail={selectedClient.email}
        />
      )}
    </div>
  );
}
