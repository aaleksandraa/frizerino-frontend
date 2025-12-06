import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Phone, Mail, Plus, Filter } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { appointmentAPI, serviceAPI, staffAPI } from '../../services/api';
import { formatDateEuropean, getCurrentDateEuropean, europeanToIsoDate } from '../../utils/dateUtils';
import { ManualBookingModal } from '../Common/ManualBookingModal';

export function SalonAppointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(getCurrentDateEuropean());
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [user, selectedDate, selectedStatus, selectedStaff]);

  const loadData = async () => {
    if (!user?.salon) return;

    try {
      setLoading(true);
      
      // Load appointments with filters
      const params: any = {};
      if (selectedDate) {
        // Convert European date to ISO format for API
        params.date = europeanToIsoDate(selectedDate);
      }
      if (selectedStatus !== 'all') {
        params.status = selectedStatus;
      }
      
      const appointmentsData = await appointmentAPI.getAppointments(params);
      
      // Ensure we have an array
      const appointmentsArray = Array.isArray(appointmentsData) ? appointmentsData : (appointmentsData?.data || []);
      
      // Filter by salon and staff if needed
      let filteredAppointments = appointmentsArray.filter((app: any) => 
        String(app.salon_id) === String(user.salon?.id) || String(app.salon?.id) === String(user.salon?.id)
      );
      
      if (selectedStaff !== 'all') {
        filteredAppointments = filteredAppointments.filter((app: any) => String(app.staff_id) === String(selectedStaff));
      }
      
      setAppointments(filteredAppointments);
      
      // Load services and staff
      const servicesData = await serviceAPI.getServices(user.salon.id);
      const staffData = await staffAPI.getStaff(user.salon.id);
      
      // Handle paginated or array response
      setServices(Array.isArray(servicesData) ? servicesData : (servicesData?.data || []));
      setStaff(Array.isArray(staffData) ? staffData : (staffData?.data || []));
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Potvrđen';
      case 'pending': return 'Na čekanju';
      case 'completed': return 'Završen';
      case 'cancelled': return 'Otkazan';
      default: return status;
    }
  };

  const handleAppointmentAction = async (appointmentId: string, action: 'confirm' | 'cancel' | 'complete') => {
    try {
      const newStatus = action === 'confirm' ? 'confirmed' : action === 'cancel' ? 'cancelled' : 'completed';
      await appointmentAPI.updateAppointment(appointmentId, { status: newStatus });
      
      // Refresh appointments
      loadData();
    } catch (error) {
      console.error('Error updating appointment:', error);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Učitavanje...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Upravljanje terminima</h1>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Dodaj termin
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Datum</label>
            <input
              type="date"
              value={selectedDate.split('.').reverse().join('-')}
              onChange={(e) => setSelectedDate(formatDateEuropean(new Date(e.target.value)))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Svi statusi</option>
              <option value="pending">Na čekanju</option>
              <option value="confirmed">Potvrđeni</option>
              <option value="completed">Završeni</option>
              <option value="cancelled">Otkazani</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Zaposleni</label>
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Svi zaposleni</option>
              {staff.map(staffMember => (
                <option key={staffMember.id} value={staffMember.id}>{staffMember.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <button 
              onClick={() => {
                setSelectedDate(getCurrentDateEuropean());
                setSelectedStatus('all');
                setSelectedStaff('all');
              }}
              className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Resetuj filtere
            </button>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Termini za {selectedDate}
          </h3>
          <p className="text-sm text-gray-600">{appointments.length} termina</p>
        </div>
        
        <div className="divide-y divide-gray-200">
          {appointments.length > 0 ? (
            appointments.map(appointment => (
              <div key={appointment.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="text-center min-w-[80px]">
                        <div className="text-lg font-bold text-gray-900">{appointment.time}</div>
                        <div className="text-xs text-gray-500">{appointment.service?.duration}min</div>
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900">{appointment.client_name}</h4>
                        <p className="text-sm text-gray-600">{getServiceName(appointment.service_id)}</p>
                        <p className="text-sm text-gray-500">sa {getStaffName(appointment.staff_id)}</p>
                      </div>
                      
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(appointment.status)}`}>
                          {getStatusText(appointment.status)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>{appointment.client_phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <span>{appointment.client_email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Cijena: {appointment.total_price} KM</span>
                      </div>
                    </div>
                    
                    {appointment.notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600"><strong>Napomene:</strong> {appointment.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-4">
                  {appointment.status === 'pending' && (
                    <>
                      <button 
                        onClick={() => handleAppointmentAction(appointment.id, 'confirm')}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        Potvrdi
                      </button>
                      <button 
                        onClick={() => handleAppointmentAction(appointment.id, 'cancel')}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
                      >
                        Odbaci
                      </button>
                    </>
                  )}
                  
                  {appointment.status === 'confirmed' && (
                    <>
                      <button 
                        onClick={() => handleAppointmentAction(appointment.id, 'complete')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Označi kao završen
                      </button>
                      <button className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm">
                        Promeni vreme
                      </button>
                    </>
                  )}
                  
                  <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                    Kontaktiraj klijenta
                  </button>
                  <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                    Uredi
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nema termina</h3>
              <p className="text-gray-600 mb-6">Za izabrani datum nema zakazanih termina</p>
              <button 
                onClick={() => setShowAddModal(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
              >
                Dodaj termin
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Manual Booking Modal */}
      {user?.salon && (
        <ManualBookingModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={loadData}
          salonId={user.salon.id}
          preselectedDate={selectedDate}
        />
      )}
    </div>
  );
}