import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Clock, Star, User, Save, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { staffAPI, serviceAPI } from '../../services/api';
import { StaffRole, StaffRoleLabels } from '../../types';

export function SalonStaff() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    role: '',
    bio: '',
    email: '',
    phone: '',
    password: '',
    specialties: [] as string[],
    working_hours: {
      monday: { start: '09:00', end: '17:00', is_working: true },
      tuesday: { start: '09:00', end: '17:00', is_working: true },
      wednesday: { start: '09:00', end: '17:00', is_working: true },
      thursday: { start: '09:00', end: '17:00', is_working: true },
      friday: { start: '09:00', end: '17:00', is_working: true },
      saturday: { start: '09:00', end: '15:00', is_working: true },
      sunday: { start: '10:00', end: '14:00', is_working: false }
    },
    service_ids: [] as string[]
  });

  const [newSpecialty, setNewSpecialty] = useState('');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user?.salon) return;
    
    try {
      setLoading(true);
      const [staffData, servicesData] = await Promise.all([
        staffAPI.getStaff(user.salon.id),
        serviceAPI.getServices(user.salon.id)
      ]);
      
      // Handle paginated or array response
      setStaff(Array.isArray(staffData) ? staffData : (staffData?.data || []));
      setServices(Array.isArray(servicesData) ? servicesData : (servicesData?.data || []));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      role: '',
      bio: '',
      email: '',
      phone: '',
      password: '',
      specialties: [],
      working_hours: {
        monday: { start: '09:00', end: '17:00', is_working: true },
        tuesday: { start: '09:00', end: '17:00', is_working: true },
        wednesday: { start: '09:00', end: '17:00', is_working: true },
        thursday: { start: '09:00', end: '17:00', is_working: true },
        friday: { start: '09:00', end: '17:00', is_working: true },
        saturday: { start: '09:00', end: '15:00', is_working: true },
        sunday: { start: '10:00', end: '14:00', is_working: false }
      },
      service_ids: []
    });
    setNewSpecialty('');
  };

  const handleEdit = (staffMember: any) => {
    setEditingStaff(staffMember);
    setFormData({
      name: staffMember.name,
      role: staffMember.role,
      bio: staffMember.bio || '',
      email: '',
      phone: '',
      password: '',
      specialties: [...(staffMember.specialties || [])],
      working_hours: { ...staffMember.working_hours },
      service_ids: staffMember.services?.map((s: any) => s.id) || []
    });
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!user?.salon) return;

    try {
      if (editingStaff) {
        // Update existing staff
        const response = await staffAPI.updateStaff(user.salon.id, editingStaff.id, formData);
        setStaff(prev => prev.map(s => s.id === editingStaff.id ? response.staff : s));
      } else {
        // Create new staff
        const response = await staffAPI.createStaff(user.salon.id, formData);
        setStaff(prev => [...prev, response.staff]);
      }
      
      setShowAddModal(false);
      setEditingStaff(null);
      resetForm();
    } catch (error) {
      console.error('Error saving staff:', error);
    }
  };

  const handleDelete = async (staffId: string) => {
    if (!window.confirm('Da li ste sigurni da želite da uklonite ovog zaposlenog?')) return;
    if (!user?.salon) return;
    
    try {
      await staffAPI.deleteStaff(user.salon.id, staffId);
      setStaff(prev => prev.filter(s => s.id !== staffId));
    } catch (error) {
      console.error('Error deleting staff:', error);
    }
  };

  const addSpecialty = () => {
    if (newSpecialty.trim() && !formData.specialties.includes(newSpecialty.trim())) {
      setFormData(prev => ({
        ...prev,
        specialties: [...prev.specialties, newSpecialty.trim()]
      }));
      setNewSpecialty('');
    }
  };

  const removeSpecialty = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.filter(s => s !== specialty)
    }));
  };

  const handleWorkingHoursChange = (day: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      working_hours: {
        ...prev.working_hours,
        [day]: {
          ...prev.working_hours[day],
          [field]: value
        }
      }
    }));
  };

  const WorkingHoursDisplay = ({ workingHours }: { workingHours: any }) => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayNames = ['Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub', 'Ned'];
    
    return (
      <div className="text-sm text-gray-600">
        {days.map((day, index) => {
          const schedule = workingHours[day];
          return (
            <div key={day} className="flex justify-between">
              <span>{dayNames[index]}:</span>
              <span>
                {schedule?.is_working ? `${schedule.start}-${schedule.end}` : 'Ne radi'}
              </span>
            </div>
          );
        })}
      </div>
    );
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Upravljanje zaposlenima</h1>
        <button 
          onClick={() => {
            resetForm();
            setEditingStaff(null);
            setShowAddModal(true);
          }}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Dodaj zaposlenog
        </button>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staff.map(staffMember => (
          <div key={staffMember.id} className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-all duration-200">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                  {staffMember.avatar ? (
                    <img 
                      src={staffMember.avatar} 
                      alt={staffMember.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{staffMember.name}</h3>
                  <p className="text-sm text-gray-600">{StaffRoleLabels[staffMember.role as StaffRole] || staffMember.role}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm font-medium">{staffMember.rating}</span>
                    <span className="text-xs text-gray-500">({staffMember.review_count})</span>
                  </div>
                </div>
              </div>

              {staffMember.bio && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 line-clamp-3">{staffMember.bio}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Specijalnosti</h4>
                  <div className="flex flex-wrap gap-1">
                    {staffMember.specialties?.map((specialty: string, index: number) => (
                      <span 
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Radno vreme</h4>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <WorkingHoursDisplay workingHours={staffMember.working_hours} />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button 
                  onClick={() => handleEdit(staffMember)}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Uredi
                </button>
                <button 
                  onClick={() => handleDelete(staffMember.id)}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Ukloni
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {staff.length === 0 && (
        <div className="text-center py-12">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nema zaposlenih</h3>
          <p className="text-gray-600 mb-6">Dodajte zaposlene u vaš salon</p>
          <button 
            onClick={() => {
              resetForm();
              setEditingStaff(null);
              setShowAddModal(true);
            }}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
          >
            Dodaj prvog zaposlenog
          </button>
        </div>
      )}

      {/* Add/Edit Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingStaff ? 'Uredi zaposlenog' : 'Dodaj novog zaposlenog'}
                </h2>
                <button 
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingStaff(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ime i prezime *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Marko Petrović"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tip zaposlenog *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Izaberite tip</option>
                    {Object.entries(StaffRoleLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {!editingStaff && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email (opcionalno)
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="marko@salon.ba"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Lozinka (ako kreirate nalog)
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="••••••••"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+387 60 123 456"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Opis/Biografija
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Kratka biografija, iskustvo, obrazovanje..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specijalnosti
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newSpecialty}
                    onChange={(e) => setNewSpecialty(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addSpecialty()}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Dodaj specijalnost..."
                  />
                  <button
                    onClick={addSpecialty}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.specialties.map((specialty, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                    >
                      {specialty}
                      <button
                        onClick={() => removeSpecialty(specialty)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Usluge koje može da pruža
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {services.map(service => (
                    <label key={service.id} className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={formData.service_ids.includes(service.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData(prev => ({ 
                              ...prev, 
                              service_ids: [...prev.service_ids, service.id] 
                            }));
                          } else {
                            setFormData(prev => ({ 
                              ...prev, 
                              service_ids: prev.service_ids.filter(id => id !== service.id) 
                            }));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                      />
                      <span className="text-sm">{service.name} - {service.category}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Radno vreme</h3>
                <div className="space-y-4">
                  {['Ponedeljak', 'Utorak', 'Sreda', 'Četvrtak', 'Petak', 'Subota', 'Nedelja'].map((dayName, index) => {
                    const dayKey = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][index];
                    return (
                      <div key={dayKey} className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="w-24">
                          <label className="text-sm font-medium text-gray-700">{dayName}</label>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={formData.working_hours[dayKey].is_working}
                            onChange={(e) => handleWorkingHoursChange(dayKey, 'is_working', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-600">Radi</span>
                          {formData.working_hours[dayKey].is_working && (
                            <>
                              <input
                                type="time"
                                value={formData.working_hours[dayKey].start}
                                onChange={(e) => handleWorkingHoursChange(dayKey, 'start', e.target.value)}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <span className="text-gray-400">-</span>
                              <input
                                type="time"
                                value={formData.working_hours[dayKey].end}
                                onChange={(e) => handleWorkingHoursChange(dayKey, 'end', e.target.value)}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingStaff(null);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Otkaži
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingStaff ? 'Sačuvaj izmene' : 'Dodaj zaposlenog'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}