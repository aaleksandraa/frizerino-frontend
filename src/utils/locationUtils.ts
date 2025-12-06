import { LocationSearchResult } from '../types';

// Google Places API utilities
export class LocationService {
  private static instance: LocationService;
  private autocompleteService: google.maps.places.AutocompleteService | null = null;
  private placesService: google.maps.places.PlacesService | null = null;
  private geocoder: google.maps.Geocoder | null = null;

  private constructor() {
    this.initializeServices();
  }

  public static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  private initializeServices() {
    if (typeof google !== 'undefined' && google.maps) {
      this.autocompleteService = new google.maps.places.AutocompleteService();
      this.geocoder = new google.maps.Geocoder();
      
      // Create a dummy div for PlacesService
      const dummyDiv = document.createElement('div');
      this.placesService = new google.maps.places.PlacesService(dummyDiv);
    }
  }

  public async searchLocations(query: string, countryCode: string = 'BA'): Promise<LocationSearchResult[]> {
    return new Promise((resolve, reject) => {
      if (!this.autocompleteService) {
        reject(new Error('Google Places service not available'));
        return;
      }

      this.autocompleteService.getPlacePredictions(
        {
          input: query,
          componentRestrictions: { country: countryCode },
          types: ['establishment', 'geocode']
        },
        (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            const results: LocationSearchResult[] = predictions.map(prediction => ({
              placeId: prediction.place_id,
              name: prediction.structured_formatting.main_text,
              address: prediction.description,
              city: this.extractCity(prediction.terms),
              country: this.extractCountry(prediction.terms),
              lat: 0, // Will be filled by getPlaceDetails
              lng: 0  // Will be filled by getPlaceDetails
            }));
            resolve(results);
          } else {
            resolve([]);
          }
        }
      );
    });
  }

  public async getPlaceDetails(placeId: string): Promise<LocationSearchResult | null> {
    return new Promise((resolve, reject) => {
      if (!this.placesService) {
        reject(new Error('Google Places service not available'));
        return;
      }

      this.placesService.getDetails(
        {
          placeId: placeId,
          fields: ['name', 'formatted_address', 'geometry', 'address_components']
        },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place) {
            const result: LocationSearchResult = {
              placeId: placeId,
              name: place.name || '',
              address: place.formatted_address || '',
              city: this.extractCityFromComponents(place.address_components),
              country: this.extractCountryFromComponents(place.address_components),
              lat: place.geometry?.location?.lat() || 0,
              lng: place.geometry?.location?.lng() || 0
            };
            resolve(result);
          } else {
            resolve(null);
          }
        }
      );
    });
  }

  public async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    return new Promise((resolve, reject) => {
      if (!this.geocoder) {
        reject(new Error('Google Geocoder service not available'));
        return;
      }

      this.geocoder.geocode({ address }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
          const location = results[0].geometry.location;
          resolve({
            lat: location.lat(),
            lng: location.lng()
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  public async getCurrentLocation(): Promise<{ lat: number; lng: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    });
  }

  public calculateDistance(
    lat1: number, 
    lng1: number, 
    lat2: number, 
    lng2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private extractCity(terms: google.maps.places.PredictionTerm[]): string {
    // Usually the second-to-last term is the city
    return terms.length >= 2 ? terms[terms.length - 2].value : '';
  }

  private extractCountry(terms: google.maps.places.PredictionTerm[]): string {
    // Usually the last term is the country
    return terms.length >= 1 ? terms[terms.length - 1].value : '';
  }

  private extractCityFromComponents(components?: google.maps.GeocoderAddressComponent[]): string {
    if (!components) return '';
    
    const cityComponent = components.find(component => 
      component.types.includes('locality') || 
      component.types.includes('administrative_area_level_1')
    );
    
    return cityComponent?.long_name || '';
  }

  private extractCountryFromComponents(components?: google.maps.GeocoderAddressComponent[]): string {
    if (!components) return '';
    
    const countryComponent = components.find(component => 
      component.types.includes('country')
    );
    
    return countryComponent?.long_name || '';
  }
}

// Utility functions for location formatting
export const formatAddress = (address: string, city: string, country: string): string => {
  const parts = [address, city, country].filter(Boolean);
  return parts.join(', ');
};

export const normalizeCity = (city: string): string => {
  return city.trim().toLowerCase().replace(/\s+/g, ' ');
};

export const normalizeCityForDisplay = (city: string): string => {
  return city.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export const getCountryCode = (country: string): string => {
  const countryMap: { [key: string]: string } = {
    'bosnia and herzegovina': 'BA',
    'bosna i hercegovina': 'BA',
    'serbia': 'RS',
    'srbija': 'RS',
    'croatia': 'HR',
    'hrvatska': 'HR',
    'montenegro': 'ME',
    'crna gora': 'ME',
    'slovenia': 'SI',
    'slovenija': 'SI',
    'north macedonia': 'MK',
    'makedonija': 'MK'
  };
  
  return countryMap[country.toLowerCase()] || 'BA';
};