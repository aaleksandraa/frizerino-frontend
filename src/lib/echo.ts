import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Make Pusher available globally
declare global {
  interface Window {
    Pusher: typeof Pusher;
    Echo: Echo;
  }
}

window.Pusher = Pusher;

// Initialize Laravel Echo
export const initializeEcho = (token: string) => {
  window.Echo = new Echo({
    broadcaster: 'pusher',
    key: import.meta.env.VITE_PUSHER_APP_KEY,
    cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER || 'eu',
    forceTLS: true,
    authEndpoint: `${import.meta.env.VITE_API_URL}/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    },
  });

  return window.Echo;
};

export const disconnectEcho = () => {
  if (window.Echo) {
    window.Echo.disconnect();
  }
};
