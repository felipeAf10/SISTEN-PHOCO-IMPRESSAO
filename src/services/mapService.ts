
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
        const headers = {
            'User-Agent': 'PriceFlow-App/1.0 (internal-tool)',
            'Referer': 'https://priceflow.app',
            'Accept-Language': 'pt-BR' // Prefer Portuguese results
        };

        try {
            // 1. Clean query (Remove CEP/ZipCode which often confuses Nominatim)
            let cleanQuery = query.replace(/cep:?\s*\d{5}-?\d{3}/gi, '').trim();
            cleanQuery = cleanQuery.replace(/\d{5}-?\d{3}/g, '').trim(); // Remove standalone CEPs

            // 2. First attempt: Full cleaned query (Free-form)
            // Using addressdetails=1 to verify granularity if needed
            let response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&countrycodes=br&limit=5&addressdetails=1`, { headers });

            if (!response.ok) throw new Error('Erro na API de Mapas');
            let data = await response.json();

            if (data && data.length > 0) return data;

            // 3. Fallback A: Try removing the house number (often the cause of failure in OSM)
            const queryWithoutNumber = cleanQuery.replace(/,?\s*\d+\s*$/, '').replace(/,?\s*\d+\s*,/, ',');
            if (queryWithoutNumber !== cleanQuery && queryWithoutNumber.length > 5) {
                response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryWithoutNumber)}&countrycodes=br&limit=5`, { headers });
                data = await response.json();
                if (data && data.length > 0) return data;
            }

            // 4. Fallback B: Structured Search (splitting by comma)
            // Assumes format: "Street, Number - Neighborhood, City - State" or similar
            const parts = cleanQuery.split(',').map(p => p.trim());
            if (parts.length >= 2) {
                // heuristic: first part is street, last meaningful part might be city
                // This is a naive guess but often works for fixed formats
                const street = parts[0];
                const possibleCity = parts.length > 2 ? parts[parts.length - 2] : parts[parts.length - 1];

                // Clean up city string (remove state codes like - MG)
                const cityClean = possibleCity.split('-')[0].trim();

                const structUrl = `https://nominatim.openstreetmap.org/search?format=json&street=${encodeURIComponent(street)}&city=${encodeURIComponent(cityClean)}&country=Brazil&limit=5`;
                console.log("Trying structured search:", structUrl);

                response = await fetch(structUrl, { headers });
                data = await response.json();
                if (data && data.length > 0) return data;
            }

            return [];
        } catch (error) {
            console.error('MapService Search Error:', error);
            // Return empty array instead of crashing, allows UI to handle "Found nothing"
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
