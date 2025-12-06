import React, { useState, useEffect } from 'react';
import { Clock, Calendar } from 'lucide-react';
import { salonAPI } from '../../services/api';
import { isDateToday } from '../../utils/dateUtils';

interface TimeSlotPickerProps {
  salonId: string;
  staffId: string;
  serviceId: string;
  serviceDuration: number;
  selectedDate: string;
  onTimeSelect: (time: string) => void;
  selectedTime?: string;
}

export function TimeSlotPicker({ 
  salonId, 
  staffId,
  serviceId,
  serviceDuration, 
  selectedDate, 
  onTimeSelect,
  selectedTime 
}: TimeSlotPickerProps) {
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (salonId && staffId && serviceId && selectedDate) {
      loadAvailableSlots();
    }
  }, [salonId, staffId, serviceId, selectedDate, serviceDuration]);

  const loadAvailableSlots = async () => {
    setLoading(true);
    try {
      // Get available slots from API
      const response = await salonAPI.getAvailableSlots(
        salonId, 
        staffId, 
        selectedDate, 
        serviceId
      );
      
      let slots = response.slots || [];
      
      // If it's today, filter out past time slots
      if (isDateToday(selectedDate)) {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        slots = slots.filter(slot => {
          const [slotHour, slotMinute] = slot.split(':').map(Number);
          const [currentHour, currentMinute] = currentTime.split(':').map(Number);
          
          const slotMinutes = slotHour * 60 + slotMinute;
          const currentMinutes = currentHour * 60 + currentMinute;
          
          return slotMinutes > currentMinutes;
        });
      }
      
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error loading available slots:', error);
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Učitavanje dostupnih termina...</p>
        </div>
      </div>
    );
  }

  if (availableSlots.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Nema dostupnih termina</h3>
        <p className="text-gray-600">Za izabrani datum nema slobodnih termina. Pokušajte sa drugim datumom.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
            <Clock className="w-4 h-4 text-orange-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Dostupni termini</h3>
        </div>
        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {availableSlots.length} dostupnih termina
        </span>
      </div>

      {/* Subtitle */}
      <div className="mb-6">
        <h4 className="text-base font-medium text-gray-700 mb-1">Izaberite vrijeme</h4>
        <p className="text-sm text-gray-500">
          Termini su prikazani u slotovima od 30 minuta. Vaša usluga traje {serviceDuration} minuta.
        </p>
      </div>
      
      {/* Time Slots Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {availableSlots.map((slot) => (
          <button
            key={slot}
            onClick={() => onTimeSelect(slot)}
            className={`
              relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 min-h-[80px]
              ${selectedTime === slot
                ? 'border-blue-500 bg-blue-50 shadow-md transform scale-105'
                : 'border-green-200 bg-green-50 hover:border-green-300 hover:bg-green-100 hover:shadow-sm'
              }
            `}
          >
            {/* Clock Icon */}
            <div className={`w-6 h-6 mb-2 ${
              selectedTime === slot ? 'text-blue-600' : 'text-green-600'
            }`}>
              <Clock className="w-full h-full" />
            </div>
            
            {/* Time */}
            <span className={`text-base font-semibold ${
              selectedTime === slot ? 'text-blue-700' : 'text-green-700'
            }`}>
              {slot}
            </span>
            
            {/* Selected indicator */}
            {selectedTime === slot && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            )}
          </button>
        ))}
      </div>
      
      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 text-blue-600 mt-0.5">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-blue-800 mb-1">Napomena o rezervaciji</p>
            <p className="text-sm text-blue-700">
              Termini su automatski filtrirani na osnovu trajanja vaše usluge ({serviceDuration} min). 
              Prikazani su samo slotovi gdje imate dovoljno vremena za kompletnu uslugu.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}