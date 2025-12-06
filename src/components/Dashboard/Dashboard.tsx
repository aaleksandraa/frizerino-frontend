import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MainNavbar } from '../Layout/MainNavbar';
import { Sidebar } from '../Layout/Sidebar';
import { useAuth } from '../../context/AuthContext';

// Dashboard components for different user types
import { AdminDashboard } from './AdminDashboard';
import { SalonDashboard } from './SalonDashboard';
import { FrizerDashboard } from './FrizerDashboard';
import { ClientDashboard } from './ClientDashboard';

// Client components
import { SalonSearchWithMap } from '../Client/SalonSearchWithMap';
import { ClientAppointments } from '../Client/ClientAppointments';
import { ClientProfile } from '../Client/ClientProfile';
import { FavoriteSalons } from '../Client/FavoriteSalons';

// Salon components
import { SalonProfile } from '../Salon/SalonProfile';
import { SalonAppointments } from '../Salon/SalonAppointments';
import { SalonStaff } from '../Salon/SalonStaff';
import { SalonServices } from '../Salon/SalonServices';
import { SalonAnalytics } from '../Salon/SalonAnalytics';
import { SalonReviews } from '../Salon/SalonReviews';
import { SalonSchedule } from '../Salon/SalonSchedule';
import { SalonCalendar } from '../Salon/SalonCalendar';

// Admin components
import { AdminSalons } from '../Admin/AdminSalons';
import { AdminUsers } from '../Admin/AdminUsers';
import { AdminAnalytics } from '../Admin/AdminAnalytics';
import { AdminSettings } from '../Admin/AdminSettings';
import { AdminConsents } from '../Admin/AdminConsents';

// Frizer components
import { FrizerCalendar } from '../Frizer/FrizerCalendar';
import { FrizerSchedule } from '../Frizer/FrizerSchedule';
import { FrizerSettings } from '../Frizer/FrizerSettings';
import { FrizerReviews } from '../Frizer/FrizerReviews';

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState('dashboard');

  // Check if user is a client (no sidebar for clients)
  const isClient = user?.role === 'klijent';

  // Parse section from URL query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const section = params.get('section');
    if (section) {
      setActiveSection(section);
    }
  }, [location.search]);

  // Listen for section changes from header
  useEffect(() => {
    const handleSectionChange = (event: CustomEvent) => {
      setActiveSection(event.detail);
    };

    window.addEventListener('switchSection', handleSectionChange as EventListener);
    return () => window.removeEventListener('switchSection', handleSectionChange as EventListener);
  }, []);

  const handleBookingComplete = () => {
    if (user?.role === 'klijent') {
      setActiveSection('appointments');
      navigate('?booking=success');
    }
  };

  const renderContent = () => {
    switch (user?.role) {
      case 'admin':
        switch (activeSection) {
          case 'dashboard': return <AdminDashboard />;
          case 'salons': return <AdminSalons />;
          case 'users': return <AdminUsers />;
          case 'consents': return <AdminConsents />;
          case 'analytics': return <AdminAnalytics />;
          case 'settings': return <AdminSettings />;
          case 'profile': return <ClientProfile />;
          default: return <AdminDashboard />;
        }
      
      case 'salon':
        switch (activeSection) {
          case 'dashboard': return <SalonDashboard onSectionChange={setActiveSection} />;
          case 'profile': return <SalonProfile />;
          case 'appointments': return <SalonAppointments />;
          case 'staff': return <SalonStaff />;
          case 'services': return <SalonServices />;
          case 'schedule': return <SalonSchedule />;
          case 'calendar': return <SalonCalendar />;
          case 'analytics': return <SalonAnalytics />;
          case 'reviews': return <SalonReviews />;
          case 'settings': return <SalonProfile />;
          default: return <SalonDashboard onSectionChange={setActiveSection} />;
        }
      
      case 'frizer':
        switch (activeSection) {
          case 'dashboard': return <FrizerDashboard />;
          case 'calendar': return <FrizerCalendar />;
          case 'schedule': return <FrizerSchedule />;
          case 'reviews': return <FrizerReviews />;
          case 'analytics': return <SalonAnalytics />;
          case 'settings': return <FrizerSettings />;
          default: return <FrizerDashboard />;
        }
      
      case 'klijent':
        switch (activeSection) {
          case 'dashboard': return <ClientDashboard onBookingComplete={handleBookingComplete} />;
          case 'search': return <SalonSearchWithMap />;
          case 'appointments': return <ClientAppointments />;
          case 'history': return <ClientAppointments />;
          case 'favorites': return <FavoriteSalons />;
          case 'profile': return <ClientProfile />;
          case 'settings': return <ClientProfile />;
          default: return <ClientDashboard onBookingComplete={handleBookingComplete} />;
        }
      
      default:
        return <div>Unauthorized</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <MainNavbar />
      
      <div className="flex">
        {/* Show sidebar only for non-clients (desktop only) */}
        {!isClient && (
          <Sidebar 
            activeSection={activeSection} 
            onSectionChange={setActiveSection}
          />
        )}
        
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}