-- Create inventory_transactions table
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity_change REAL NOT NULL, -- Positive for addition, negative for deduction
    type TEXT NOT NULL CHECK (type IN ('manual_adjustment', 'sale', 'purchase', 'production_deduction', 'return')), 
    reference_id TEXT, -- Can be Quote ID, Purchase ID, or null
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID -- Optional: Link to auth.users if available, or just store metadata
);

-- Index for faster history lookups
CREATE INDEX idx_inventory_transactions_product_id ON inventory_transactions(product_id);
CREATE INDEX idx_inventory_transactions_created_at ON inventory_transactions(created_at DESC);
