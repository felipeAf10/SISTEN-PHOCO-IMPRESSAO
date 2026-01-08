-- Create Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    category TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for suppliers
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users" ON suppliers
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Update Products Table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id),
ADD COLUMN IF NOT EXISTS min_stock_level INTEGER DEFAULT 5; -- Default low stock threshold

-- Helper index
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);
