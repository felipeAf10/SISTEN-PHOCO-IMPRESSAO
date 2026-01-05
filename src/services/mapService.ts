
interface GeoResult {
    lat: string;
    lon: string;
    display_name: string;
}

interface RouteResult {
    distance: number; // in meters
    duration: number; // in seconds
}

// PHOCO Address Coordinates (Hardcoded for stability, but can be dynamic)
// Av. João Gomes Cardoso, 435 - Jardim Laguna, Contagem - MG
const ORIGIN_LAT = '-19.9248';
const ORIGIN_LON = '-44.1485';

export const mapService = {
    // Search address using Nominatim (OSM)
    async searchAddress(query: string): Promise<GeoResult[]> {
        try {
            // 1. Clean query (Remove CEP/ZipCode which often confuses Nominatim)
            let cleanQuery = query.replace(/cep:?\s*\d{5}-?\d{3}/gi, '').trim();
            cleanQuery = cleanQuery.replace(/\d{5}-?\d{3}/g, '').trim(); // Remove standalone CEPs

            // 2. First attempt: Full cleaned query
            let response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&countrycodes=br&limit=5`);
            if (!response.ok) throw new Error('Erro ao buscar endereço');
            let data = await response.json();

            if (data && data.length > 0) return data;

            // 3. Fallback: Try removing the house number (often the cause of failure in OSM)
            // Heuristic: remove number after a comma, or standalone numbers at end
            const queryWithoutNumber = cleanQuery.replace(/,?\s*\d+\s*$/, '').replace(/,?\s*\d+\s*,/, ',');

            if (queryWithoutNumber !== cleanQuery && queryWithoutNumber.length > 5) {
                response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryWithoutNumber)}&countrycodes=br&limit=5`);
                data = await response.json();
                if (data && data.length > 0) return data;
            }

            return [];
        } catch (error) {
            console.error('MapService Search Error:', error);
            return [];
        }
    },

    // Calculate distance using OSRM
    async getDistance(destLat: string, destLon: string): Promise<number | null> {
        try {
            // OSRM expects: /route/v1/driving/{lon},{lat};{lon},{lat}?overview=false
            const url = `https://router.project-osrm.org/route/v1/driving/${ORIGIN_LON},${ORIGIN_LAT};${destLon},${destLat}?overview=false`;

            const response = await fetch(url);
            if (!response.ok) throw new Error('Erro ao calcular rota');

            const data = await response.json();
            if (data.routes && data.routes.length > 0) {
                // Return distance in Kilometers (OSRM returns meters)
                return data.routes[0].distance / 1000;
            }
            return null;
        } catch (error) {
            console.error('MapService Distance Error:', error);
            return null;
        }
    }
};
