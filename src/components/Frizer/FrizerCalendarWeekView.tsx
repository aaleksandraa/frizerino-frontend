import { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight,
  LayoutGrid,
  Columns,
  CalendarDays,
  Plus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { serviceAPI, appointmentAPI } from '../../services/api';
import { formatDateEuropean, getCurrentDateEuropean } from '../../utils/dateUtils';
import { ClientDetailsModal } from '../Common/ClientDetailsModal';
import { ManualBookingModal } from '../Common/ManualBookingModal';

interface FrizerCalendarWeekViewProps {
  onViewChange?: (view: 'month' | 'week' | 'day') => void;
}

export function FrizerCalendarWeekView({ onViewChange }: FrizerCalendarWeekViewProps) {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getMonday(new Date()));
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [capacityData, setCapacityData] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    loadData();
    loadCapacityData();
  }, [user, currentWeekStart]);

  const loadData = async () => {
    if (!user?.staff_profile) return;

    try {
      setLoading(true);
      
      const weekDays = getWeekDays();
      const startDate = formatDateEuropean(weekDays[0]);
      const endDate = formatDateEuropean(weekDays[6]);
      
      const [appointmentsData, servicesResponse] = await Promise.all([
        appointmentAPI.getAppointments({ 
          per_page: 500,
          start_date: startDate,
          end_date: endDate,
          staff_id: user.staff_profile.id
        }),
        serviceAPI.getServices(user.staff_profile.salon_id)
      ]);
      
      const servicesArray = Array.isArray(servicesResponse) ? servicesResponse : (servicesResponse.data || []);
      const appointmentsArray = Array.isArray(appointmentsData) ? appointmentsData : (appointmentsData?.data || []);
      
      setAppointments(appointmentsArray);
      setServices(servicesArray.filter((s: any) => s.staff_ids?.includes(user.staff_profile?.id)));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCapacityData = async () => {
    if (!user?.staff_profile) return;

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

  function getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  const getWorkingHours = () => {
    if (user?.staff_profile && 'working_hours' in user.staff_profile && user.staff_profile.working_hours) {
      const hours = user.staff_profile.working_hours as any;
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
    
    return { start: 8, end: 20 };
  };

  const workingHours = getWorkingHours();
  const workingHoursStart = workingHours.start;
  const workingHoursEnd = workingHours.end;

  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(currentWeekStart.getDate() + (direction === 'prev' ? -7 : 7));
    setCurrentWeekStart(newDate);
  };

  const goToToday = () => {
    setCurrentWeekStart(getMonday(new Date()));
  };

  const getAppointmentsForSlot = (date: Date, hour: number) => {
    const dateStr = formatDateEuropean(date);
    
    return appointments.filter(app => {
      if (app.date !== dateStr) return false;
      
      const appHour = parseInt(app.time.split(':')[0]);
      const appMinute = parseInt(app.time.split(':')[1]);
      const appStartMinutes = appHour * 60 + appMinute;
      
      const endTimeParts = app.end_time.split(':');
      const appEndHour = parseInt(endTimeParts[0]);
      const appEndMinute = parseInt(endTimeParts[1]);
      const appEndMinutes = appEndHour * 60 + appEndMinute;
      
      const slotStartMinutes = hour * 60;
      const slotEndMinutes = (hour + 1) * 60;
      
      return appStartMinutes < slotEndMinutes && appEndMinutes > slotStartMinutes;
    });
  };

  const getAppointmentStyle = (appointment: any, hour: number) => {
    const appHour = parseInt(appointment.time.split(':')[0]);
    const appMinute = parseInt(appointment.time.split(':')[1]);
    
    const endTimeParts = appointment.end_time.split(':');
    const appEndHour = parseInt(endTimeParts[0]);
    const appEndMinute = parseInt(endTimeParts[1]);
    
    const startMinutes = appHour * 60 + appMinute;
    const endMinutes = appEndHour * 60 + appEndMinute;
    const durationMinutes = endMinutes - startMinutes;
    
    const offsetMinutes = startMinutes - (hour * 60);
    const offsetPercent = (offsetMinutes / 60) * 100;
    
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Sedmični raspored</h1>
          <div className="text-sm text-gray-600">
            {weekDays[0].getDate()} {monthNames[weekDays[0].getMonth()]} - {weekDays[6].getDate()} {monthNames[weekDays[6].getMonth()]} {weekDays[6].getFullYear()}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
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

          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Dodaj
          </button>
        </div>
      </div>

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

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
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

            <div className="relative">
              {hours.map((hour) => (
                <div key={hour} className="grid grid-cols-8 border-b" style={{ minHeight: '80px' }}>
                  <div className="p-2 text-sm text-gray-500 border-r flex items-start">
                    {hour}:00
                  </div>

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

      {selectedClient && (
        <ClientDetailsModal
          isOpen={showClientModal}
          onClose={() => {
            setShowClientModal(false);
            setSelectedClient(null);
          }}
          clientId={selectedClient?.id}
          clientName={selectedClient.name}
          clientPhone={selectedClient.phone}
          clientEmail={selectedClient.email}
        />
      )}

      {user?.staff_profile && (
        <ManualBookingModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={loadData}
          salonId={Number(user.staff_profile.salon_id)}
          staffId={Number(user.staff_profile.id)}
        />
      )}
    </div>
  );
}
