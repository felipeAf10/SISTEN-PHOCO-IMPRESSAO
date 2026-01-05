
// OpenStreetMap / OSRM Service
interface GeoResult {
    lat: string;
    lon: string;
    display_name: string;
}

// PHOCO Origin
// Av. João Gomes Cardoso, 435 - Jardim Laguna, Contagem - MG
const ORIGIN_LAT = -19.9248;
const ORIGIN_LON = -44.1485;

export const loadGoogleMaps = () => Promise.resolve(); // No-op for compatibility

export const mapService = {
    // Search using Nominatim (OpenStreetMap)
    async searchAddress(query: string): Promise<GeoResult[]> {
        if (!query || query.length < 3) return [];

        try {
            // Clean query
            // Clean query
            const cleanQuery = query.replace(/[^\w\s,-]/g, ' ').trim();
            // Viewbox for Minas Gerais/Sudeste preference
            // x1 (lon left), y1 (lat top), x2 (lon right), y2 (lat bottom)
            const viewbox = '-51.5,-13.5,-39.5,-23.5'; // Approx box covering MG
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&countrycodes=br&limit=5&addressdetails=1&viewbox=${viewbox}&bounded=0`;

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'PriceFlow/1.0',
                    'Accept-Language': 'pt-BR'
                }
            });

            if (!response.ok) throw new Error('Nominatim Error');

            const data = await response.json();
            return data.map((item: any) => ({
                lat: item.lat,
                lon: item.lon,
                display_name: item.display_name
            }));
        } catch (error) {
            console.error('Nominatim Search Error:', error);
            return [];
        }
    },

    // Alias for autocomplete behavior, using the same Nominatim endpoint
    async searchAddressAutocomplete(query: string): Promise<GeoResult[]> {
        return this.searchAddress(query);
    },

    // Calculate distance using OSRM (Open Source Routing Machine)
    async getDistance(destLat: string, destLon: string): Promise<number | null> {
        try {
            // OSRM Public API (Demo server - respectful usage required)
            // Route: origin -> destination
            const url = `https://router.project-osrm.org/route/v1/driving/${ORIGIN_LON},${ORIGIN_LAT};${destLon},${destLat}?overview=false`;

            const response = await fetch(url);
            if (!response.ok) throw new Error('OSRM Error');

            const data = await response.json();

            if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                const distanceMeters = data.routes[0].distance;
                return distanceMeters / 1000; // Returns in KM
            }

            return null;
        } catch (error) {
            console.error('OSRM Distance Error:', error);
            return null;
        }
    }
};
