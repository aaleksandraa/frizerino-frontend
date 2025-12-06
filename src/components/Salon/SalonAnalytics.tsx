import { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  DollarSign, 
  Users,
  Star,
  Clock,
  Download,
  FileText,
  X,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { appointmentAPI, reviewAPI, staffAPI, serviceAPI } from '../../services/api';

type DateRange = {
  start: Date;
  end: Date;
  label: string;
};

type PeriodOption = 'this_month' | 'last_month' | 'this_year' | 'last_year' | 'custom';

export function SalonAnalytics() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [previousStats, setPreviousStats] = useState<any>(null);
  const [topServices, setTopServices] = useState<any[]>([]);
  const [topStaff, setTopStaff] = useState<any[]>([]);
  const [timeSlots, setTimeSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [allAppointments, setAllAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  
  // Period selection
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('this_month');
  const [customDateStart, setCustomDateStart] = useState<string>('');
  const [customDateEnd, setCustomDateEnd] = useState<string>('');
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf');
  const [exporting, setExporting] = useState(false);

  const formatDateShort = (date: Date): string => {
    return date.toLocaleDateString('bs-BA', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Get date range based on selected period
  const getDateRange = useCallback((): DateRange => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (selectedPeriod) {
      case 'this_month':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
          label: 'Ovaj mjesec'
        };
      case 'last_month':
        return {
          start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          end: new Date(now.getFullYear(), now.getMonth(), 0),
          label: 'Prošli mjesec'
        };
      case 'this_year':
        return {
          start: new Date(now.getFullYear(), 0, 1),
          end: new Date(now.getFullYear(), 11, 31),
          label: 'Ova godina'
        };
      case 'last_year':
        return {
          start: new Date(now.getFullYear() - 1, 0, 1),
          end: new Date(now.getFullYear() - 1, 11, 31),
          label: 'Prošla godina'
        };
      case 'custom':
        if (customDateStart && customDateEnd) {
          return {
            start: new Date(customDateStart),
            end: new Date(customDateEnd),
            label: `${formatDateShort(new Date(customDateStart))} - ${formatDateShort(new Date(customDateEnd))}`
          };
        }
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: today,
          label: 'Ovaj mjesec'
        };
      default:
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: today,
          label: 'Ovaj mjesec'
        };
    }
  }, [selectedPeriod, customDateStart, customDateEnd]);

  // Get previous period for comparison
  const getPreviousDateRange = useCallback((): DateRange => {
    const current = getDateRange();
    const duration = current.end.getTime() - current.start.getTime();
    
    return {
      start: new Date(current.start.getTime() - duration - 86400000),
      end: new Date(current.start.getTime() - 86400000),
      label: 'Prethodni period'
    };
  }, [getDateRange]);

  // Parse date string (dd.mm.yyyy) to Date object
  const parseAppointmentDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const parts = dateStr.split('.');
    if (parts.length !== 3) return null;
    const [day, month, year] = parts.map(p => parseInt(p, 10));
    return new Date(year, month - 1, day);
  };

  // Filter appointments by date range
  const filterAppointmentsByDateRange = useCallback((appointments: any[], range: DateRange) => {
    return appointments.filter((app: any) => {
      const appDate = parseAppointmentDate(app.date);
      if (!appDate) return false;
      return appDate >= range.start && appDate <= range.end;
    });
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [user]);

  // Separate effect that runs after data is loaded
  useEffect(() => {
    // Only calculate if we have loaded services and staff (even if empty)
    // This ensures we calculate on initial load
    if (!loading) {
      calculateAnalytics();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod, customDateStart, customDateEnd, allAppointments, services, staff, reviews, loading]);

  const loadInitialData = async () => {
    if (!user?.salon) return;

    try {
      setLoading(true);
      
      const appointmentsResponse = await appointmentAPI.getAppointments();
      const appointments = Array.isArray(appointmentsResponse) ? appointmentsResponse : (appointmentsResponse?.data || []);
      const salonAppointments = appointments.filter((app: any) => app.salon_id === user?.salon?.id);
      setAllAppointments(salonAppointments);
      
      const [servicesResponse, staffResponse, reviewsResponse] = await Promise.all([
        serviceAPI.getServices(user.salon.id),
        staffAPI.getStaff(user.salon.id),
        reviewAPI.getSalonReviews(user.salon.id)
      ]);

      const servicesData = Array.isArray(servicesResponse) ? servicesResponse : (servicesResponse?.data || []);
      const staffData = Array.isArray(staffResponse) ? staffResponse : (staffResponse?.data || []);
      const reviewsData = Array.isArray(reviewsResponse) ? reviewsResponse : (reviewsResponse?.data || []);

      setServices(servicesData);
      setStaff(staffData);
      setReviews(reviewsData);
      
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = useCallback(() => {
    const currentRange = getDateRange();
    const previousRange = getPreviousDateRange();
    
    const currentAppointments = filterAppointmentsByDateRange(allAppointments, currentRange);
    const previousAppointments = filterAppointmentsByDateRange(allAppointments, previousRange);
    
    const completedCurrent = currentAppointments.filter((app: any) => app.status === 'completed');
    const totalRevenueCurrent = completedCurrent.reduce((sum: number, app: any) => sum + (app.total_price || 0), 0);
    const newClientsCurrent = new Set(currentAppointments.map((app: any) => app.client_id)).size;
    
    const completedPrevious = previousAppointments.filter((app: any) => app.status === 'completed');
    const totalRevenuePrevious = completedPrevious.reduce((sum: number, app: any) => sum + (app.total_price || 0), 0);
    const newClientsPrevious = new Set(previousAppointments.map((app: any) => app.client_id)).size;

    setStats({
      totalRevenue: totalRevenueCurrent.toFixed(2),
      appointmentCount: currentAppointments.length,
      completedCount: completedCurrent.length,
      newClients: newClientsCurrent,
      averageRating: reviews.length > 0 ? (reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length).toFixed(1) : '0.0',
      dateRange: currentRange
    });

    setPreviousStats({
      totalRevenue: totalRevenuePrevious,
      appointmentCount: previousAppointments.length,
      newClients: newClientsPrevious
    });

    const serviceStats = services.map((service: any) => {
      const serviceAppointments = currentAppointments.filter((app: any) => {
        // Check multiple possible service id fields
        return app.service_id === service.id || 
               app.service?.id === service.id ||
               app.services?.some((s: any) => s.id === service.id);
      });
      const revenue = serviceAppointments.reduce((sum: number, app: any) => sum + (app.total_price || 0), 0);
      return {
        name: service.name,
        bookings: serviceAppointments.length,
        revenue: revenue.toFixed(2),
        percentage: currentAppointments.length > 0 ? Math.round((serviceAppointments.length / currentAppointments.length) * 100) : 0
      };
    }).filter(s => s.bookings > 0).sort((a, b) => b.bookings - a.bookings).slice(0, 4);
    
    setTopServices(serviceStats);

    const staffStats = staff.map((staffMember: any) => {
      const staffAppointments = currentAppointments.filter((app: any) => {
        // Check multiple possible staff id fields
        return app.staff_id === staffMember.id || 
               app.staff?.id === staffMember.id;
      });
      const revenue = staffAppointments.reduce((sum: number, app: any) => sum + (app.total_price || 0), 0);
      return {
        name: staffMember.name,
        bookings: staffAppointments.length,
        revenue: revenue.toFixed(2),
        rating: staffMember.rating || 0
      };
    }).filter(s => s.bookings > 0).sort((a, b) => b.bookings - a.bookings).slice(0, 3);
    
    setTopStaff(staffStats);

    const timeSlotStats = [];
    for (let hour = 9; hour <= 18; hour++) {
      const timeSlot = `${hour.toString().padStart(2, '0')}:00-${(hour + 1).toString().padStart(2, '0')}:00`;
      const slotAppointments = currentAppointments.filter((app: any) => {
        if (!app.time) return false;
        const appHour = parseInt(app.time.split(':')[0]);
        return appHour === hour;
      });
      
      timeSlotStats.push({
        time: timeSlot,
        bookings: slotAppointments.length,
        percentage: currentAppointments.length > 0 ? Math.round((slotAppointments.length / currentAppointments.length) * 100) : 0
      });
    }
    
    setTimeSlots(timeSlotStats);
  }, [allAppointments, services, staff, reviews, getDateRange, getPreviousDateRange, filterAppointmentsByDateRange]);

  const getPercentageChange = (current: number, previous: number): { value: string; type: 'positive' | 'negative' | 'neutral' } => {
    if (previous === 0) {
      if (current > 0) return { value: '+100%', type: 'positive' };
      return { value: '0%', type: 'neutral' };
    }
    const change = ((current - previous) / previous) * 100;
    const sign = change >= 0 ? '+' : '';
    return {
      value: `${sign}${change.toFixed(0)}%`,
      type: change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral'
    };
  };

  const exportReport = async () => {
    if (!stats) return;
    
    setExporting(true);
    
    try {
      // Debug logging
      console.log('Export - topServices:', topServices);
      console.log('Export - topStaff:', topStaff);
      console.log('Export - timeSlots:', timeSlots);
      console.log('Export - stats:', stats);
      
      const reportData = {
        period: stats.dateRange.label,
        generatedAt: new Date().toLocaleString('bs-BA'),
        salonName: user?.salon?.name || 'Salon',
        stats: {
          totalRevenue: stats.totalRevenue,
          appointmentCount: stats.appointmentCount,
          completedCount: stats.completedCount,
          newClients: stats.newClients,
          averageRating: stats.averageRating
        },
        topServices: [...topServices], // Make a copy to ensure data is captured
        topStaff: [...topStaff],
        timeSlots: [...timeSlots]
      };
      
      console.log('Export - reportData:', reportData);

      if (exportFormat === 'csv') {
        let csv = 'Izvještaj analitike salona\n\n';
        csv += `Period,${reportData.period}\n`;
        csv += `Generisano,${reportData.generatedAt}\n`;
        csv += `Salon,${reportData.salonName}\n\n`;
        
        csv += 'STATISTIKA\n';
        csv += `Ukupan prihod,${reportData.stats.totalRevenue} KM\n`;
        csv += `Broj termina,${reportData.stats.appointmentCount}\n`;
        csv += `Završeno,${reportData.stats.completedCount}\n`;
        csv += `Novi klijenti,${reportData.stats.newClients}\n`;
        csv += `Prosječna ocjena,${reportData.stats.averageRating}\n\n`;
        
        csv += 'NAJPOPULARNIJE USLUGE\n';
        csv += 'Usluga,Rezervacije,Prihod\n';
        topServices.forEach(s => {
          csv += `${s.name},${s.bookings},${s.revenue} KM\n`;
        });
        csv += '\n';
        
        csv += 'PERFORMANSE ZAPOSLENIH\n';
        csv += 'Ime,Termini,Prihod,Ocjena\n';
        topStaff.forEach(s => {
          csv += `${s.name},${s.bookings},${s.revenue} KM,${s.rating}\n`;
        });
        csv += '\n';
        
        csv += 'ANALIZA PO SATIMA\n';
        csv += 'Vrijeme,Termini,Postotak\n';
        timeSlots.forEach(s => {
          csv += `${s.time},${s.bookings},${s.percentage}%\n`;
        });

        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `analitika-${reportData.period.replace(/\s/g, '-')}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Izvještaj analitike - ${reportData.salonName}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
                h1 { color: #1f2937; border-bottom: 2px solid #f97316; padding-bottom: 10px; }
                h2 { color: #374151; margin-top: 30px; }
                .info { margin-bottom: 20px; color: #6b7280; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
                th { background: #f9fafb; font-weight: 600; }
                .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
                .stat-card { background: #f9fafb; padding: 20px; border-radius: 8px; text-align: center; }
                .stat-value { font-size: 24px; font-weight: bold; color: #1f2937; }
                .stat-label { color: #6b7280; margin-top: 5px; }
                @media print { body { padding: 20px; } }
              </style>
            </head>
            <body>
              <h1>📊 Izvještaj analitike salona</h1>
              <div class="info">
                <p><strong>Salon:</strong> ${reportData.salonName}</p>
                <p><strong>Period:</strong> ${reportData.period}</p>
                <p><strong>Generisano:</strong> ${reportData.generatedAt}</p>
              </div>
              
              <h2>Statistika</h2>
              <div class="stat-grid">
                <div class="stat-card">
                  <div class="stat-value">${reportData.stats.totalRevenue} KM</div>
                  <div class="stat-label">Ukupan prihod</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${reportData.stats.appointmentCount}</div>
                  <div class="stat-label">Broj termina</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${reportData.stats.newClients}</div>
                  <div class="stat-label">Novi klijenti</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${reportData.stats.averageRating}</div>
                  <div class="stat-label">Prosječna ocjena</div>
                </div>
              </div>
              
              <h2>Najpopularnije usluge</h2>
              ${reportData.topServices.length > 0 ? `
              <table>
                <thead>
                  <tr><th>Usluga</th><th>Rezervacije</th><th>Prihod</th><th>%</th></tr>
                </thead>
                <tbody>
                  ${reportData.topServices.map(s => `<tr><td>${s.name}</td><td>${s.bookings}</td><td>${s.revenue} KM</td><td>${s.percentage}%</td></tr>`).join('')}
                </tbody>
              </table>
              ` : '<p style="color: #6b7280; padding: 20px 0;">Nema podataka o uslugama za odabrani period</p>'}
              
              <h2>Performanse zaposlenih</h2>
              ${reportData.topStaff.length > 0 ? `
              <table>
                <thead>
                  <tr><th>Ime</th><th>Termini</th><th>Prihod</th><th>Ocjena</th></tr>
                </thead>
                <tbody>
                  ${reportData.topStaff.map(s => `<tr><td>${s.name}</td><td>${s.bookings}</td><td>${s.revenue} KM</td><td>⭐ ${s.rating}</td></tr>`).join('')}
                </tbody>
              </table>
              ` : '<p style="color: #6b7280; padding: 20px 0;">Nema podataka o zaposlenima za odabrani period</p>'}
              
              <h2>Analiza termina po satima</h2>
              <table>
                <thead>
                  <tr><th>Vrijeme</th><th>Broj termina</th><th>Zauzetost</th></tr>
                </thead>
                <tbody>
                  ${reportData.timeSlots.map(s => `<tr><td>${s.time}</td><td>${s.bookings}</td><td>${s.percentage}%</td></tr>`).join('')}
                </tbody>
              </table>
              
              <script>
                window.onload = function() { window.print(); }
              </script>
            </body>
            </html>
          `);
          printWindow.document.close();
        }
      }
      
      setShowExportModal(false);
    } catch (error) {
      console.error('Error exporting report:', error);
    } finally {
      setExporting(false);
    }
  };

  const handlePeriodChange = (period: PeriodOption) => {
    setSelectedPeriod(period);
    if (period !== 'custom') {
      setShowCustomPicker(false);
    }
  };

  const applyCustomDates = () => {
    if (customDateStart && customDateEnd) {
      setSelectedPeriod('custom');
      setShowCustomPicker(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Učitavanje...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Greška pri učitavanju analitike</p>
      </div>
    );
  }

  const revenueChange = getPercentageChange(parseFloat(stats.totalRevenue), previousStats?.totalRevenue || 0);
  const appointmentChange = getPercentageChange(stats.appointmentCount, previousStats?.appointmentCount || 0);
  const clientsChange = getPercentageChange(stats.newClients, previousStats?.newClients || 0);

  const analyticsStats = [
    {
      label: 'Ukupan prihod',
      value: `${stats.totalRevenue} KM`,
      change: revenueChange.value,
      changeType: revenueChange.type,
      icon: DollarSign,
      color: 'green'
    },
    {
      label: 'Broj termina',
      value: stats.appointmentCount.toString(),
      change: appointmentChange.value,
      changeType: appointmentChange.type,
      icon: Calendar,
      color: 'blue'
    },
    {
      label: 'Novi klijenti',
      value: stats.newClients.toString(),
      change: clientsChange.value,
      changeType: clientsChange.type,
      icon: Users,
      color: 'purple'
    },
    {
      label: 'Prosječna ocjena',
      value: stats.averageRating,
      change: '',
      changeType: 'neutral' as const,
      icon: Star,
      color: 'yellow'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analitika salona</h1>
          <p className="text-sm text-gray-600 mt-1">
            Period: {stats.dateRange.label}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <select 
              value={selectedPeriod === 'custom' ? 'custom' : selectedPeriod}
              onChange={(e) => {
                const value = e.target.value as PeriodOption;
                if (value === 'custom') {
                  setShowCustomPicker(true);
                } else {
                  handlePeriodChange(value);
                }
              }}
              className="appearance-none bg-white px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent cursor-pointer"
            >
              <option value="this_month">Ovaj mjesec</option>
              <option value="last_month">Prošli mjesec</option>
              <option value="this_year">Ova godina</option>
              <option value="last_year">Prošla godina</option>
              <option value="custom">Prilagođeno...</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          
          <button 
            onClick={() => setShowExportModal(true)}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Izvezi izvještaj
          </button>
        </div>
      </div>

      {/* Custom Date Picker Modal */}
      {showCustomPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Odaberite period</h3>
              <button onClick={() => setShowCustomPicker(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Od datuma</label>
                <input
                  type="date"
                  value={customDateStart}
                  onChange={(e) => setCustomDateStart(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Do datuma</label>
                <input
                  type="date"
                  value={customDateEnd}
                  onChange={(e) => setCustomDateEnd(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    const now = new Date();
                    setCustomDateStart(new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split('T')[0]);
                    setCustomDateEnd(now.toISOString().split('T')[0]);
                  }}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  Zadnja 3 mjeseca
                </button>
                <button
                  onClick={() => {
                    const now = new Date();
                    setCustomDateStart(new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString().split('T')[0]);
                    setCustomDateEnd(now.toISOString().split('T')[0]);
                  }}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  Zadnjih 6 mjeseci
                </button>
              </div>
              
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setShowCustomPicker(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Otkaži
                </button>
                <button
                  onClick={applyCustomDates}
                  disabled={!customDateStart || !customDateEnd}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Primijeni
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Izvezi izvještaj</h3>
              <button onClick={() => setShowExportModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-gray-600 mb-4">
              Izvještaj za period: <strong>{stats.dateRange.label}</strong>
            </p>
            
            <div className="space-y-3 mb-6">
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="exportFormat"
                  checked={exportFormat === 'pdf'}
                  onChange={() => setExportFormat('pdf')}
                  className="text-orange-600 focus:ring-orange-500"
                />
                <FileText className="w-5 h-5 text-red-500" />
                <div>
                  <p className="font-medium">PDF / Print</p>
                  <p className="text-sm text-gray-500">Za štampanje ili dijeljenje</p>
                </div>
              </label>
              
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="exportFormat"
                  checked={exportFormat === 'csv'}
                  onChange={() => setExportFormat('csv')}
                  className="text-orange-600 focus:ring-orange-500"
                />
                <FileText className="w-5 h-5 text-green-500" />
                <div>
                  <p className="font-medium">CSV</p>
                  <p className="text-sm text-gray-500">Za Excel, Google Sheets</p>
                </div>
              </label>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Otkaži
              </button>
              <button
                onClick={exportReport}
                disabled={exporting}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {exporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Izvoz...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Izvezi
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {analyticsStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  {stat.change && (
                    <div className="flex items-center mt-2">
                      <span className={`text-sm font-medium ${
                        stat.changeType === 'positive' ? 'text-green-600' : 
                        stat.changeType === 'negative' ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {stat.change}
                      </span>
                      <span className="text-sm text-gray-500 ml-2">vs prethodni period</span>
                    </div>
                  )}
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  stat.color === 'green' ? 'bg-green-100' :
                  stat.color === 'blue' ? 'bg-blue-100' :
                  stat.color === 'purple' ? 'bg-purple-100' :
                  'bg-yellow-100'
                }`}>
                  <Icon className={`w-6 h-6 ${
                    stat.color === 'green' ? 'text-green-600' :
                    stat.color === 'blue' ? 'text-blue-600' :
                    stat.color === 'purple' ? 'text-purple-600' :
                    'text-yellow-600'
                  }`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Services */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Najpopularnije usluge</h3>
            <p className="text-sm text-gray-600">Po broju rezervacija</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {topServices.length > 0 ? (
                topServices.map((service, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{service.name}</h4>
                      <p className="text-sm text-gray-600">{service.bookings} rezervacija</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{service.revenue} KM</p>
                      <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-orange-600 h-2 rounded-full"
                          style={{ width: `${service.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">Nema podataka za odabrani period</p>
              )}
            </div>
          </div>
        </div>

        {/* Top Staff Performance */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Performanse zaposlenih</h3>
            <p className="text-sm text-gray-600">Za odabrani period</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {topStaff.length > 0 ? (
                topStaff.map((staffMember, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-orange-600 to-amber-600 rounded-full flex items-center justify-center text-white font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{staffMember.name}</h4>
                        <p className="text-sm text-gray-600">{staffMember.bookings} termina</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{staffMember.revenue} KM</p>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-sm">{staffMember.rating}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">Nema podataka za odabrani period</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Time Slot Analysis */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Analiza termina po satima</h3>
          <p className="text-sm text-gray-600">Zauzetost po satima dana</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {timeSlots.map((slot, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{slot.time}</p>
                    <p className="text-xs text-gray-600">{slot.bookings} termina</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{slot.percentage}%</p>
                  <div className="w-12 bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className={`h-2 rounded-full ${
                        slot.percentage >= 80 ? 'bg-red-500' :
                        slot.percentage >= 50 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(slot.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
