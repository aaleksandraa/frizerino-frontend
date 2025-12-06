import { useEffect, useState } from 'react';
import { publicSettingsAPI } from '../../services/api';

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

export function GoogleAnalytics() {
  const [gaId, setGaId] = useState<string | null>(null);

  useEffect(() => {
    const loadAnalyticsSettings = async () => {
      try {
        const settings = await publicSettingsAPI.getAnalyticsSettings();
        if (settings.google_analytics_enabled && settings.google_analytics_id) {
          setGaId(settings.google_analytics_id);
        }
      } catch (error) {
        // Silently fail - analytics is not critical
        console.debug('Failed to load analytics settings');
      }
    };

    loadAnalyticsSettings();
  }, []);

  useEffect(() => {
    if (!gaId) return;

    // Check if GA script is already loaded
    if (document.querySelector(`script[src*="googletagmanager.com/gtag"]`)) {
      return;
    }

    // Create and load the GA script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(script);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag(...args: any[]) {
      window.dataLayer.push(args);
    };
    window.gtag('js', new Date());
    window.gtag('config', gaId, {
      page_title: document.title,
      page_location: window.location.href,
    });

    // Track page views on route changes
    const handleRouteChange = () => {
      if (window.gtag) {
        window.gtag('config', gaId, {
          page_title: document.title,
          page_location: window.location.href,
        });
      }
    };

    // Listen for popstate (back/forward navigation)
    window.addEventListener('popstate', handleRouteChange);

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [gaId]);

  // This component doesn't render anything visible
  return null;
}

// Helper function to track events
export function trackEvent(
  eventName: string, 
  eventParams?: Record<string, any>
) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, eventParams);
  }
}

// Pre-defined event helpers
export const analyticsEvents = {
  // Booking events
  bookingStarted: (salonId: string, salonName: string) => 
    trackEvent('booking_started', { salon_id: salonId, salon_name: salonName }),
  
  bookingCompleted: (salonId: string, salonName: string, serviceId: string, serviceName: string) =>
    trackEvent('booking_completed', { 
      salon_id: salonId, 
      salon_name: salonName,
      service_id: serviceId,
      service_name: serviceName 
    }),
  
  bookingCancelled: (appointmentId: string) =>
    trackEvent('booking_cancelled', { appointment_id: appointmentId }),

  // Search events
  searchPerformed: (query: string, city?: string, resultsCount?: number) =>
    trackEvent('search', { 
      search_term: query, 
      city: city,
      results_count: resultsCount 
    }),

  // Salon events
  salonViewed: (salonId: string, salonName: string, city: string) =>
    trackEvent('salon_viewed', { 
      salon_id: salonId, 
      salon_name: salonName,
      city: city 
    }),

  // User events
  userRegistered: (userType: string) =>
    trackEvent('user_registered', { user_type: userType }),

  userLoggedIn: (userType: string) =>
    trackEvent('user_logged_in', { user_type: userType }),

  // Contact events
  contactFormSubmitted: () =>
    trackEvent('contact_form_submitted'),
};
