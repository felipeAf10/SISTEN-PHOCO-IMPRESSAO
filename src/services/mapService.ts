
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
import { refineAddress } from './geminiService';

export const loadGoogleMaps = () => Promise.resolve(); // No-op for compatibility

export const mapService = {
    // Search using Nominatim (OpenStreetMap)
    async searchAddress(query: string, attempt = 1): Promise<GeoResult[]> {
        if (!query || query.length < 3) return [];

        try {
            // Clean query
            const cleanQuery = query.replace(/[^\w\s,-]/g, ' ').trim();

            // Broad Viewbox for MG region preference
            // -47.0,-16.0 (Top Left) to -41.0,-23.0 (Bottom Right)
            const viewbox = '-47.0,-16.0,-41.0,-23.0';

            // Standard Nominatim Search
            // If attempt > 1 (AI Refined), we REMOVE restrictions to ensure we find the specific address provided by AI
            let url = '';

            if (attempt === 1) {
                // First try: Prefer local results
                url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&countrycodes=br&limit=5&addressdetails=1&viewbox=${viewbox}&bounded=0`;
            } else {
                // Second try (AI corrected): Trust the text completely, no geographic bias needed
                url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&countrycodes=br&limit=5&addressdetails=1`;
            }

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'PriceFlow/1.0',
                    'Accept-Language': 'pt-BR'
                }
            });

            if (!response.ok) throw new Error('Nominatim Error');

            const data = await response.json();
            let results = data.map((item: any) => ({
                lat: item.lat,
                lon: item.lon,
                display_name: item.display_name
            }));

            // --- AI FALLBACK (SMART SEARCH) ---
            // If no results and it's the first attempt, try to refine with AI
            if (results.length === 0 && attempt === 1) {
                console.log(`[SmartSearch] No results for "${query}". Asking AI...`);
                // Add explicit instructions to AI to be robust
                const refined = await refineAddress(query);

                if (refined && refined !== query) {
                    console.log(`[SmartSearch] AI suggested: "${refined}". Retrying...`);
                    // Retry recursively with the refined term (attempt 2)
                    return this.searchAddress(refined, 2);
                }
            }

            return results;

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
