
interface GeoResult {
    lat: string;
    lon: string;
    display_name: string;
}

// PHOCO Origin
// Av. João Gomes Cardoso, 435 - Jardim Laguna, Contagem - MG
const ORIGIN_LAT = -19.9248;
const ORIGIN_LON = -44.1485;
const ORIGIN_COORDS = { lat: ORIGIN_LAT, lng: ORIGIN_LON };

const GOOGLE_API_KEY = 'AIzaSyCiq5OMzHemJaIFJrqIGDdB5TMblcbUs5M';

// Helper to load Google Maps Script dynamically
let googleMapsPromise: Promise<void> | null = null;
const loadGoogleMaps = () => {
    if (googleMapsPromise) return googleMapsPromise;

    googleMapsPromise = new Promise((resolve, reject) => {
        if (typeof window.google === 'object' && typeof window.google.maps === 'object') {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=geometry`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = (err) => reject(err);
        document.head.appendChild(script);
    });
    return googleMapsPromise;
};

export const mapService = {
    // Search using Google Maps Geocoder (Client Side)
    async searchAddress(query: string): Promise<GeoResult[]> {
        try {
            await loadGoogleMaps();
            const geocoder = new google.maps.Geocoder();

            const response = await geocoder.geocode({
                address: query,
                region: 'br',
                componentRestrictions: { country: 'BR' }
            });

            if (response.results && response.results.length > 0) {
                return response.results.map(r => ({
                    lat: r.geometry.location.lat().toString(),
                    lon: r.geometry.location.lng().toString(),
                    display_name: r.formatted_address
                }));
            }
            return [];
        } catch (error) {
            console.error('Google Maps Geocoder Error:', error);
            return [];
        }
    },

    // Calculate distance using Distance Matrix Service
    async getDistance(destLat: string, destLon: string): Promise<number | null> {
        try {
            await loadGoogleMaps();
            const service = new google.maps.DistanceMatrixService();
            const destCoords = { lat: parseFloat(destLat), lng: parseFloat(destLon) };

            const response = await service.getDistanceMatrix({
                origins: [ORIGIN_COORDS],
                destinations: [destCoords],
                travelMode: google.maps.TravelMode.DRIVING,
                unitSystem: google.maps.UnitSystem.METRIC
            });

            if (response.rows[0].elements[0].status === 'OK') {
                // Returns distance in KM
                return response.rows[0].elements[0].distance.value / 1000;
            }

            return null;
        } catch (error) {
            console.error('Google Maps Distance Matrix Error:', error);
            return null;
        }
    }
};
