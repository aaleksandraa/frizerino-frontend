import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

axios.defaults.withCredentials = true; // 🔐 Za session cookies
axios.defaults.baseURL = API_BASE_URL;

// Dedicated axios instance for Sanctum CSRF cookie
const sanctumApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Accept': 'application/json',
  },
});

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // Important for cookies/session
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized errors (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // List of endpoints that should NOT trigger redirect on 401
      const publicEndpoints = [
        '/user',
        '/v1/public/',
        '/public/',
        '/sanctum/',
        '/login',
        '/register'
      ];
      
      const isPublicEndpoint = publicEndpoints.some(endpoint => 
        originalRequest.url?.includes(endpoint)
      );
      
      // Don't redirect for public endpoints or initial checks
      if (!isPublicEndpoint) {
        // Clear auth data and redirect to login only for protected routes
        localStorage.removeItem('auth_token');
        localStorage.removeItem('currentUser');
        window.location.href = '/';
      }
      
      return Promise.reject(error);
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  getCSRF: async () => {
    await sanctumApi.get('/sanctum/csrf-cookie');
  },
  login: async (email: string, password: string) => {
    const response = await api.post('/login', { email, password });
    return response.data;
  },
  
  register: async (userData: any, password: string) => {
    const data = {
      ...userData,
      password,
      password_confirmation: password
    };
    const response = await api.post('/register', data);
    return response.data;
  },
  
  logout: async () => {
    const response = await api.post('/logout');
    return response.data;
  },
  
  getUser: async () => {
    const response = await api.get('/user');
    return response.data;
  },
  
  updateProfile: async (data: any) => {
    const response = await api.put('/user/profile', data);
    return response.data;
  },
  
  changePassword: async (currentPassword: string, password: string) => {
    const response = await api.put('/user/password', {
      current_password: currentPassword,
      password,
      password_confirmation: password
    });
    return response.data;
  },

  resendVerificationEmail: async (email: string) => {
    const response = await api.post('/v1/email/resend', { email });
    return response.data;
  }
};

// Salon API
export const salonAPI = {
  getSalons: async (params: any = {}) => {
    const response = await api.get('/salons', { params });
    const payload = response.data;                           // :contentReference[oaicite:0]{index=0}
    // Laravel ResourceCollection: { data: [ … ], meta: { … }, links: { … } }
    return payload.data ?? payload;
  },

  getSalon: async (id: string) => {
    const response = await api.get(`/salons/${id}`);
    return response.data.data || response.data;
  },
  
  createSalon: async (data: any) => {
    const response = await api.post('/salons', data);
    return response.data;
  },
  
  updateSalon: async (id: string, data: any) => {
    const response = await api.put(`/salons/${id}`, data);
    return response.data;
  },
  
  deleteSalon: async (id: string) => {
    const response = await api.delete(`/salons/${id}`);
    return response.data;
  },
  
  uploadImages: async (id: string, formData: FormData) => {
    const response = await api.post(`/salons/${id}/images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },
  
  deleteImage: async (salonId: string, imageId: string) => {
    const response = await api.delete(`/salons/${salonId}/images/${imageId}`);
    return response.data;
  },
  
  setPrimaryImage: async (salonId: string, imageId: string) => {
    const response = await api.put(`/salons/${salonId}/images/${imageId}/primary`);
    return response.data;
  },
  
  getAvailableSlots: async (salonId: string, staffId: string, date: string, serviceId: string) => {
    const response = await api.get(`/salons/${salonId}/available-slots`, {
      params: { staff_id: staffId, date, service_id: serviceId }
    });
    return response.data;
  },
  
  getNearestSalons: async (latitude: number, longitude: number, radius?: number) => {
    const response = await api.get('/salons/nearest', {
      params: { latitude, longitude, radius }
    });
    const payload = response.data;                           // :contentReference[oaicite:1]{index=1}
    return payload.data ?? payload;
  },
};

// Staff API
export const staffAPI = {
  getStaff: async (salonId: string) => {
    const response = await api.get(`/salons/${salonId}/staff`);
    return response.data;
  },
  
  getStaffMember: async (salonId: string, staffId: string) => {
    const response = await api.get(`/salons/${salonId}/staff/${staffId}`);
    return response.data;
  },
  
  createStaff: async (salonId: string, data: any) => {
    const response = await api.post(`/salons/${salonId}/staff`, data);
    return response.data;
  },
  
  updateStaff: async (salonId: string, staffId: string, data: any) => {
    const response = await api.put(`/salons/${salonId}/staff/${staffId}`, data);
    return response.data;
  },
  
  deleteStaff: async (salonId: string, staffId: string) => {
    const response = await api.delete(`/salons/${salonId}/staff/${staffId}`);
    return response.data;
  },
  
  uploadAvatar: async (salonId: string, staffId: string, formData: FormData) => {
    const response = await api.post(`/salons/${salonId}/staff/${staffId}/avatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },
  
  getSchedule: async (salonId: string, staffId: string) => {
    const response = await api.get(`/salons/${salonId}/staff/${staffId}/schedule`);
    return response.data;
  },
  
  getAppointments: async (salonId: string, staffId: string, params = {}) => {
    const response = await api.get(`/salons/${salonId}/staff/${staffId}/appointments`, { params });
    return response.data;
  },

  // Update own settings (for frizeri)
  updateOwnSettings: async (data: { auto_confirm?: boolean }) => {
    const response = await api.put('/staff/me/settings', data);
    return response.data;
  },

  // Get current staff profile (for frizeri)
  getMyProfile: async () => {
    const response = await api.get('/user');
    return response.data;
  }
};

// Service API
export const serviceAPI = {
  getServices: async (salonId: string) => {
    const response = await api.get(`/salons/${salonId}/services`);
    return response.data;
  },
  
  getServicesByCategory: async (salonId: string) => {
    const response = await api.get(`/salons/${salonId}/services/by-category`);
    return response.data;
  },
  
  getService: async (salonId: string, serviceId: string) => {
    const response = await api.get(`/salons/${salonId}/services/${serviceId}`);
    return response.data;
  },
  
  createService: async (salonId: string, data: any) => {
    const response = await api.post(`/salons/${salonId}/services`, data);
    return response.data;
  },
  
  updateService: async (salonId: string, serviceId: string, data: any) => {
    const response = await api.put(`/salons/${salonId}/services/${serviceId}`, data);
    return response.data;
  },
  
  deleteService: async (salonId: string, serviceId: string) => {
    const response = await api.delete(`/salons/${salonId}/services/${serviceId}`);
    return response.data;
  }
};

// Appointment API
export const appointmentAPI = {
  getAppointments: async (params: any = {}) => {
    const response = await api.get('/appointments', { params });
    // Laravel ResourceCollections vraćaju objekat { data: [...], meta: {...}, links: {...} }
    const payload = response.data;
    // Vratimo samo niz termina:
    return payload.data ?? payload;
  },
   

   getAppointment: async (id: string) => {
    const response = await api.get(`/appointments/${id}`);
    return response.data.data ?? response.data;
  },
  
  createAppointment: async (data: any) => {
    const response = await api.post('/appointments', data);
    return response.data;
  },
  
  updateAppointment: async (id: string, data: any) => {
    const response = await api.put(`/appointments/${id}`, data);
    return response.data;
  },
  
  deleteAppointment: async (id: string) => {
    const response = await api.delete(`/appointments/${id}`);
    return response.data;
  },
  
  cancelAppointment: async (id: string) => {
    const response = await api.put(`/appointments/${id}/cancel`);
    return response.data;
  }
};

// Review API
export const reviewAPI = {
  getSalonReviews: async (salonId: string, params = {}) => {
    const response = await api.get(`/salons/${salonId}/reviews`, { params });
    return response.data;
  },
  
  getReview: async (id: string) => {
    const response = await api.get(`/reviews/${id}`);
    return response.data;
  },
  
  createReview: async (data: any) => {
    const response = await api.post('/reviews', data);
    return response.data;
  },
  
  updateReview: async (id: string, data: any) => {
    const response = await api.put(`/reviews/${id}`, data);
    return response.data;
  },
  
  deleteReview: async (id: string) => {
    const response = await api.delete(`/reviews/${id}`);
    return response.data;
  },
  
  addResponse: async (id: string, response: string) => {
    const res = await api.post(`/reviews/${id}/response`, { response });
    return res.data;
}
};

// Schedule API
export const scheduleAPI = {
  // Salon breaks
  getSalonBreaks: async (salonId: string) => {
    const response = await api.get(`/salons/${salonId}/breaks`);
    return response.data;
  },
  
  createSalonBreak: async (salonId: string, data: any) => {
    const response = await api.post(`/salons/${salonId}/breaks`, data);
    return response.data;
  },
  
  updateSalonBreak: async (salonId: string, breakId: string, data: any) => {
    const response = await api.put(`/salons/${salonId}/breaks/${breakId}`, data);
    return response.data;
  },
  
  deleteSalonBreak: async (salonId: string, breakId: string) => {
    const response = await api.delete(`/salons/${salonId}/breaks/${breakId}`);
    return response.data;
  },
  
  // Salon vacations
  getSalonVacations: async (salonId: string) => {
    const response = await api.get(`/salons/${salonId}/vacations`);
    return response.data;
  },
  
  createSalonVacation: async (salonId: string, data: any) => {
    const response = await api.post(`/salons/${salonId}/vacations`, data);
    return response.data;
  },
  
  updateSalonVacation: async (salonId: string, vacationId: string, data: any) => {
    const response = await api.put(`/salons/${salonId}/vacations/${vacationId}`, data);
    return response.data;
  },
  
  deleteSalonVacation: async (salonId: string, vacationId: string) => {
    const response = await api.delete(`/salons/${salonId}/vacations/${vacationId}`);
    return response.data;
  },
  
  // Staff breaks
  getStaffBreaks: async (staffId: string) => {
    const response = await api.get(`/staff/${staffId}/breaks`);
    return response.data;
  },
  
  createStaffBreak: async (staffId: string, data: any) => {
    const response = await api.post(`/staff/${staffId}/breaks`, data);
    return response.data;
  },
  
  updateStaffBreak: async (staffId: string, breakId: string, data: any) => {
    const response = await api.put(`/staff/${staffId}/breaks/${breakId}`, data);
    return response.data;
  },
  
  deleteStaffBreak: async (staffId: string, breakId: string) => {
    const response = await api.delete(`/staff/${staffId}/breaks/${breakId}`);
    return response.data;
  },
  
  // Staff vacations
  getStaffVacations: async (staffId: string) => {
    const response = await api.get(`/staff/${staffId}/vacations`);
    return response.data;
  },
  
  createStaffVacation: async (staffId: string, data: any) => {
    const response = await api.post(`/staff/${staffId}/vacations`, data);
    return response.data;
  },
  
  updateStaffVacation: async (staffId: string, vacationId: string, data: any) => {
    const response = await api.put(`/staff/${staffId}/vacations/${vacationId}`, data);
    return response.data;
  },
  
  deleteStaffVacation: async (staffId: string, vacationId: string) => {
    const response = await api.delete(`/staff/${staffId}/vacations/${vacationId}`);
    return response.data;
  }
};

// Favorite API
export const favoriteAPI = {
  getFavorites: async () => {
    const response = await api.get('/favorites');
    const payload = response.data;
    return payload.data ?? payload;
  },
  
  addFavorite: async (salonId: string) => {
    const response = await api.post(`/favorites/${salonId}`);
    return response.data;
  },
  
  removeFavorite: async (salonId: string) => {
    const response = await api.delete(`/favorites/${salonId}`);
    return response.data;
  },
  
  checkFavorite: async (salonId: string) => {
    const response = await api.get(`/favorites/${salonId}/check`);
    return response.data;
  }
};

// =============================================
// PUBLIC API - No authentication required
// =============================================
export const publicAPI = {
  // Get all cities with salon counts
  getCities: async () => {
    const response = await api.get('/v1/public/cities');
    return response.data;
  },

  // Get salons for a specific city
  getSalonsByCity: async (citySlug: string) => {
    const response = await api.get(`/v1/public/cities/${citySlug}`);
    return response.data;
  },

  // Get salon by slug (SEO-friendly)
  getSalonBySlug: async (slug: string) => {
    const response = await api.get(`/v1/public/salon/${slug}`);
    return response.data;
  },

  // Public search
  search: async (params: {
    q?: string;
    city?: string;
    service?: string;
    min_rating?: number;
    audience?: string[];
    sort?: string;
    direction?: 'asc' | 'desc';
    per_page?: number;
    date?: string;
    time?: string;
    duration?: number;
  }) => {
    const response = await api.get('/v1/public/search', { params });
    return response.data;
  },

  // Alias for search
  searchSalons: async (params: {
    q?: string;
    city?: string;
    service?: string;
    min_rating?: number;
    audience?: string[];
    sort?: string;
    direction?: 'asc' | 'desc';
    per_page?: number;
    date?: string;
    time?: string;
    duration?: number;
  }) => {
    const response = await api.get('/v1/public/search', { params });
    return response.data;
  },

  // Get popular services for search suggestions
  getPopularServices: async () => {
    const response = await api.get('/v1/public/services');
    return response.data;
  },

  // Get available time slots (public)
  getAvailableSlots: async (staffId: string, serviceId: string, date: string) => {
    const response = await api.get('/v1/public/available-slots', {
      params: { staff_id: staffId, service_id: serviceId, date }
    });
    return response.data;
  },

  // Book as guest
  bookAsGuest: async (data: {
    salon_id: number;
    staff_id: number;
    service_id: number;
    date: string;
    time: string;
    notes?: string;
    guest_name: string;
    guest_email?: string;
    guest_phone: string;
    guest_address: string;
  }) => {
    const response = await api.post('/v1/public/book', data);
    return response.data;
  },

  // Get sitemap data
  getSitemap: async () => {
    const response = await api.get('/v1/public/sitemap');
    return response.data;
  }
};

// Notification API
export const notificationAPI = {
  getNotifications: async (params = {}) => {
    const response = await api.get('/notifications', { params });
    return response.data;
  },
  
  markAsRead: async (id: string) => {
    const response = await api.put(`/notifications/${id}/read`);
    return response.data;
  },
  
  markAllAsRead: async () => {
    const response = await api.put('/notifications/read-all');
    return response.data;
  },
  
  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },
  
  deleteNotification: async (id: string) => {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  }
};

// Admin API
export const adminAPI = {
  getDashboardStats: async () => {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },
  
  getUsers: async (params = {}) => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  createUser: async (data: any) => {
    const response = await api.post('/admin/users', data);
    return response.data;
  },

  updateUser: async (id: string, data: any) => {
    const response = await api.put(`/admin/users/${id}`, data);
    return response.data;
  },

  deleteUser: async (id: string) => {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },

  resetUserPassword: async (id: string) => {
    const response = await api.post(`/admin/users/${id}/reset-password`);
    return response.data;
  },

  sendMessageToUser: async (id: string, message: string) => {
    const response = await api.post(`/admin/users/${id}/message`, { message });
    return response.data;
  },
  
  getSalons: async (params = {}) => {
    const response = await api.get('/admin/salons', { params });
    return response.data;
  },

  updateSalon: async (id: string, data: any) => {
    const response = await api.put(`/admin/salons/${id}`, data);
    return response.data;
  },
  
  approveSalon: async (id: string) => {
    const response = await api.put(`/admin/salons/${id}/approve`);
    return response.data;
  },
  
  suspendSalon: async (id: string) => {
    const response = await api.put(`/admin/salons/${id}/suspend`);
    return response.data;
  },
  
  getAnalytics: async (params = {}) => {
    const response = await api.get('/admin/analytics', { params });
    return response.data;
  },
  
  // System settings
  getSettings: async (group?: string) => {
    const url = group ? `/admin/settings/${group}` : '/admin/settings';
    const response = await api.get(url);
    return response;
  },
  
  updateSettings: async (settings: Array<{ key: string; value: any }>) => {
    const response = await api.put('/admin/settings', { settings });
    return response;
  },
  
  // Gradient/Appearance settings
  getGradientPresets: async () => {
    const response = await api.get('/admin/gradient-presets');
    return response.data;
  },
  
  updateGradient: async (gradient: {
    preset?: string;
    from: string;
    via?: string;
    to: string;
    direction: string;
    custom?: boolean;
  }) => {
    const response = await api.put('/admin/gradient', gradient);
    return response.data;
  },

  updateNavbarGradient: async (gradient: {
    preset?: string;
    from: string;
    via?: string;
    to: string;
    direction: string;
    custom?: boolean;
  }) => {
    const response = await api.put('/admin/navbar-gradient', gradient);
    return response.data;
  },

  getAppearanceSettings: async () => {
    const response = await api.get('/public/appearance-settings');
    return response.data;
  },

  updateStickyNavbar: async (sticky: boolean) => {
    const response = await api.put('/admin/sticky-navbar', { sticky });
    return response.data;
  },

  // Salon Profile Layout settings
  getSalonProfileLayout: async () => {
    const response = await api.get('/admin/salon-profile-layout');
    return response.data;
  },

  updateSalonProfileLayout: async (layout: string) => {
    const response = await api.put('/admin/salon-profile-layout', { layout });
    return response.data;
  },

  // Featured Salon settings
  getFeaturedSalon: async () => {
    const response = await api.get('/admin/featured-salon');
    return response.data;
  },

  updateFeaturedSalon: async (data: { salon_id?: number | null; text?: string; visibility?: 'all' | 'location_only'; show_top_rated?: boolean; show_newest?: boolean }) => {
    const response = await api.put('/admin/featured-salon', data);
    return response.data;
  }
};

// Public settings API (for GA injection, appearance, etc.)
export const publicSettingsAPI = {
  getAnalyticsSettings: async () => {
    const response = await api.get('/public/analytics-settings');
    return response.data;
  },
  
  getAppearanceSettings: async () => {
    const response = await api.get('/public/appearance-settings');
    return response.data;
  },
  
  getFeaturedSalon: async () => {
    const response = await api.get('/public/featured-salon');
    return response.data;
  }
};

// Locations API
export const locationsAPI = {
  // Get all active locations (for dropdowns)
  getAll: async (params?: { search?: string; entity?: string; canton?: string }) => {
    const response = await api.get('/v1/public/locations', { params });
    return response.data;
  },
  
  // Get locations grouped by entity/canton (for organized dropdown)
  getGrouped: async () => {
    const response = await api.get('/v1/public/locations/grouped');
    return response.data;
  },
  
  // Get all cantons (FBiH) and regions (RS)
  getCantons: async () => {
    const response = await api.get('/v1/public/locations/cantons');
    return response.data;
  },
  
  // Admin: Get all locations with pagination
  adminGetAll: async (params?: { page?: number; per_page?: number; search?: string }) => {
    const response = await api.get('/v1/admin/locations', { params });
    return response.data;
  },
  
  // Admin: Create new location
  create: async (data: {
    name: string;
    postal_code?: string;
    entity: 'FBiH' | 'RS' | 'BD';
    canton?: string;
    region?: string;
    latitude?: number;
    longitude?: number;
    population?: number;
  }) => {
    const response = await api.post('/v1/admin/locations', data);
    return response.data;
  },
  
  // Admin: Get single location
  get: async (id: number) => {
    const response = await api.get(`/v1/admin/locations/${id}`);
    return response.data;
  },
  
  // Admin: Update location
  update: async (id: number, data: {
    name?: string;
    postal_code?: string;
    entity?: 'FBiH' | 'RS' | 'BD';
    canton?: string;
    region?: string;
    latitude?: number;
    longitude?: number;
    population?: number;
    is_active?: boolean;
  }) => {
    const response = await api.put(`/v1/admin/locations/${id}`, data);
    return response.data;
  },
  
  // Admin: Delete location
  delete: async (id: number) => {
    const response = await api.delete(`/v1/admin/locations/${id}`);
    return response.data;
  }
};

// Job Ads API
export const jobAdsAPI = {
  // Public: Get all active job ads
  getAll: async (params?: { 
    page?: number; 
    per_page?: number; 
    q?: string; 
    city?: string; 
    gender?: string 
  }) => {
    const response = await api.get('/public/job-ads', { params });
    return response.data;
  },
  
  // Public: Get single job ad
  get: async (id: number) => {
    const response = await api.get(`/public/job-ads/${id}`);
    return response.data;
  },
  
  // Admin: Get all job ads
  adminGetAll: async (params?: { 
    page?: number; 
    per_page?: number; 
    status?: string 
  }) => {
    const response = await api.get('/v1/admin/job-ads', { params });
    return response.data;
  },
  
  // Admin: Create job ad
  create: async (data: {
    company_name: string;
    position_title: string;
    description: string;
    gender_requirement: 'male' | 'female' | 'any';
    contact_email: string;
    contact_phone?: string;
    city?: string;
    deadline?: string;
    salon_id?: number;
    is_active?: boolean;
  }) => {
    const response = await api.post('/v1/admin/job-ads', data);
    return response.data;
  },
  
  // Admin: Update job ad
  update: async (id: number, data: Partial<{
    company_name: string;
    position_title: string;
    description: string;
    gender_requirement: 'male' | 'female' | 'any';
    contact_email: string;
    contact_phone?: string;
    city?: string;
    deadline?: string;
    salon_id?: number;
    is_active?: boolean;
  }>) => {
    const response = await api.put(`/v1/admin/job-ads/${id}`, data);
    return response.data;
  },
  
  // Admin: Delete job ad
  delete: async (id: number) => {
    const response = await api.delete(`/v1/admin/job-ads/${id}`);
    return response.data;
  },
  
  // Admin: Toggle active status
  toggleActive: async (id: number) => {
    const response = await api.put(`/v1/admin/job-ads/${id}/toggle-active`);
    return response.data;
  },
  
  // Admin: Update owner posting setting
  updateOwnerPostingSetting: async (allow: boolean) => {
    const response = await api.put('/v1/admin/job-ads/owner-posting-setting', {
      allow_owner_posting: allow
    });
    return response.data;
  },
  
  // Owner: Get my job ads
  ownerGetAll: async () => {
    const response = await api.get('/v1/owner/job-ads');
    return response.data;
  },
  
  // Owner: Create job ad
  ownerCreate: async (data: {
    position_title: string;
    description: string;
    gender_requirement: 'male' | 'female' | 'any';
    contact_email?: string;
    contact_phone?: string;
    deadline?: string;
  }) => {
    const response = await api.post('/v1/owner/job-ads', data);
    return response.data;
  },
  
  // Owner: Update job ad
  ownerUpdate: async (id: number, data: Partial<{
    position_title: string;
    description: string;
    gender_requirement: 'male' | 'female' | 'any';
    contact_email?: string;
    contact_phone?: string;
    deadline?: string;
    is_active?: boolean;
  }>) => {
    const response = await api.put(`/v1/owner/job-ads/${id}`, data);
    return response.data;
  },
  
  // Owner: Delete job ad
  ownerDelete: async (id: number) => {
    const response = await api.delete(`/v1/owner/job-ads/${id}`);
    return response.data;
  }
};

export default api;