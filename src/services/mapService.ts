
interface GeoResult {
    lat: string;
    lon: string;
    display_name: string;
}

// PHOCO Address Coordinates
const ORIGIN_LAT = -19.9248;
const ORIGIN_LON = -44.1485;
const ORIGIN_STRING = `${ORIGIN_LAT},${ORIGIN_LON}`;

// ---------------------------------------------------------
// ⚠️ CONFIGURAÇÃO GOOGLE MAPS ⚠️
// 1. Obtenha uma chave em: https://console.cloud.google.com/
// 2. Ative as APIs: "Geocoding API" e "Distance Matrix API"
// 3. Cole a chave abaixo:
const GOOGLE_API_KEY = 'AIzaSyCiq5OMzHemJaIFJrqIGDdB5TMblcbUs5M';
// ---------------------------------------------------------

export const mapService = {
    // Search address using Google Geocoding API
    async searchAddress(query: string): Promise<GeoResult[]> {
        try {
            const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}&language=pt-BR&region=br`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.status === 'OK' && data.results.length > 0) {
                return data.results.map((r: any) => ({
                    lat: r.geometry.location.lat.toString(),
                    lon: r.geometry.location.lng.toString(),
                    display_name: r.formatted_address
                }));
            }

            console.warn("Google Maps Geocode failed:", data.status);
            return [];
        } catch (error) {
            console.error('Google Maps Search Error:', error);
            return [];
        }
    },

    // Calculate distance using Google Distance Matrix API
    async getDistance(destLat: string, destLon: string): Promise<number | null> {
        try {
            const destString = `${destLat},${destLon}`;
            const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${ORIGIN_STRING}&destinations=${destString}&mode=driving&key=${GOOGLE_API_KEY}`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.status === 'OK' && data.rows[0].elements[0].status === 'OK') {
                const distanceMeters = data.rows[0].elements[0].distance.value;
                return data.rows[0].elements[0].duration.value; // Returning duration in seconds for accurate ETA logic?? Wait, previous code expected string/number distance. 
                // Let's re-read the previous implementation. It returned distance in KM.
                // Re-correcting:
                return data.rows[0].elements[0].distance.value / 1000;
            }

            console.warn("Google Maps Distance Matrix failed:", data);
            return null;
        } catch (error) {
            console.error('Google Maps Distance Error:', error);
            return null;
        }
    }
};
