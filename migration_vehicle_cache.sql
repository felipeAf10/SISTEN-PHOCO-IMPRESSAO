CREATE TABLE IF NOT EXISTS vehicle_measurements_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year TEXT NOT NULL,
    dimensions JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_cache_unique ON vehicle_measurements_cache (make, model, year);
