import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getCurrentDateEuropean } from '../../utils/dateUtils';
import { 
  Calendar, 
  Users, 
  TrendingUp, 
  Clock,
  DollarSign,
  Star,
  Bell
} from 'lucide-react';
import { appointmentAPI, salonAPI } from '../../services/api';

interface SalonDashboardProps {
  onSectionChange: (section: string) => void;
}

export function SalonDashboard({ onSectionChange }: SalonDashboardProps) {
  const { user } = useAuth();
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [salon, setSalon] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayCount: 0,
    monthlyCount: 0,
    weeklyRevenue: 0,
    averageRating: 0
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Load salon data
      if (user.salon) {
        const salonData = await salonAPI.getSalon(user.salon.id);
        setSalon(salonData);
      }
      
      // Load today's appointments
      const today = getCurrentDateEuropean();
      const appointmentsResponse = await appointmentAPI.getAppointments({
        date: today,
        per_page: 50
      });
      
      const todaysAppointments = appointmentsResponse
        .filter((app: any) => app.date === today)
        .sort((a: any, b: any) => a.time.localeCompare(b.time));
      
      setTodayAppointments(todaysAppointments);
      
      // Calculate stats
      const allAppointments = await appointmentAPI.getAppointments();
      const thisMonth = new Date().getMonth() + 1;
      const thisYear = new Date().getFullYear();
      
      const monthlyAppointments = allAppointments.filter((app: any) => {
        const [day, month, year] = app.date.split('.');
        return parseInt(month) === thisMonth && parseInt(year) === thisYear;
      });
      
      const completedThisWeek = allAppointments.filter((app: any) => {
        const appointmentDate = new Date(app.date.split('.').reverse().join('-'));
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return appointmentDate >= weekAgo && app.status === 'completed';
      });
      
      const weeklyRevenue = completedThisWeek.reduce((sum: number, app: any) => sum + app.total_price, 0);
      
      setStats({
        todayCount: todaysAppointments.length,
        monthlyCount: monthlyAppointments.length,
        weeklyRevenue,
        averageRating: salon?.rating || 0
      });
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const todayStats = [
    {
      label: 'Danas termini',
      value: stats.todayCount.toString(),
      subtitle: `${todayAppointments.filter(a => a.status === 'pending').length} pending`,
      icon: Calendar,
      color: 'blue'
    },
    {
      label: 'Ovaj mesec',
      value: stats.monthlyCount.toString(),
      subtitle: 'ukupno termina',
      icon: TrendingUp,
      color: 'green'
    },
    {
      label: 'Prihod ove sedmice',
      value: `${stats.weeklyRevenue.toFixed(2)} KM`,
      subtitle: 'završeni termini',
      icon: DollarSign,
      color: 'purple'
    },
    {
      label: 'Prosečna ocena',
      value: stats.averageRating.toFixed(1),
      subtitle: `${salon?.review_count || 0} recenzija`,
      icon: Star,
      color: 'yellow'
    }
  ];

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
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {todayStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{stat.subtitle}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-${stat.color}-100`}>
                  <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Današnji raspored</h3>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Pogledaj sve
              </button>
            </div>
            <p className="text-sm text-gray-600">
              {getCurrentDateEuropean()} - {new Date().toLocaleDateString('bs-BA', { weekday: 'long' })}
            </p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {todayAppointments.length > 0 ? (
                todayAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900">{appointment.time}</div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{appointment.client_name}</h4>
                        <p className="text-sm text-gray-600">{appointment.service?.name}</p>
                        <p className="text-xs text-gray-500">sa {appointment.staff?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        appointment.status === 'confirmed' 
                          ? 'bg-green-100 text-green-800' 
                          : appointment.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : appointment.status === 'completed'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {appointment.status === 'confirmed' ? 'Potvrđen' : 
                         appointment.status === 'pending' ? 'Na čekanju' :
                         appointment.status === 'completed' ? 'Završen' : 'Otkazan'}
                      </span>
                      <button className="text-blue-600 hover:text-blue-700">
                        <Clock className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Nema termina za danas</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Salon Info */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Informacije o salonu</h3>
          </div>
          <div className="p-6">
            {salon ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">{salon.name}</h4>
                  <p className="text-sm text-gray-600">{salon.address}, {salon.city}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="font-medium">{salon.rating}</span>
                  <span className="text-sm text-gray-500">({salon.review_count} recenzija)</span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      salon.status === 'approved' ? 'bg-green-100 text-green-800' :
                      salon.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {salon.status === 'approved' ? 'Odobren' :
                       salon.status === 'pending' ? 'Na čekanju' : 'Suspendovan'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Telefon:</span>
                    <span className="text-gray-900">{salon.phone}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="text-gray-900">{salon.email}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Nema podataka o salonu</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Brze akcije</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button 
            onClick={() => onSectionChange('appointments')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <Calendar className="w-8 h-8 text-blue-600 mb-2" />
            <h4 className="font-medium text-gray-900">Dodaj termin</h4>
            <p className="text-sm text-gray-600">Ručno zakaži termin</p>
          </button>
          
          <button 
            onClick={() => onSectionChange('staff')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <Users className="w-8 h-8 text-green-600 mb-2" />
            <h4 className="font-medium text-gray-900">Upravljaj zaposlenima</h4>
            <p className="text-sm text-gray-600">Dodaj ili uredi zaposlene</p>
          </button>
          
          <button 
            onClick={() => onSectionChange('settings')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <Clock className="w-8 h-8 text-purple-600 mb-2" />
            <h4 className="font-medium text-gray-900">Radno vrijeme</h4>
            <p className="text-sm text-gray-600">Podesi raspored rada</p>
          </button>
          
          <button 
            onClick={() => onSectionChange('analytics')}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <TrendingUp className="w-8 h-8 text-orange-600 mb-2" />
            <h4 className="font-medium text-gray-900">Analitika</h4>
            <p className="text-sm text-gray-600">Pogledaj performanse</p>
          </button>
        </div>
      </div>
    </div>
  );
}