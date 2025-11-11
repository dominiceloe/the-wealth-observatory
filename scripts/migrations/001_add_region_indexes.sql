-- Migration: Add indexes on region column for comparison_costs table
-- Date: 2025-11-10
-- Description: Improves query performance when filtering by region

-- Check if indexes already exist before creating
DO $$
BEGIN
    -- Add single-column index on region
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = 'comparison_costs'
        AND indexname = 'idx_comparison_costs_region'
    ) THEN
        CREATE INDEX idx_comparison_costs_region ON comparison_costs(region);
        RAISE NOTICE 'Created index: idx_comparison_costs_region';
    ELSE
        RAISE NOTICE 'Index idx_comparison_costs_region already exists';
    END IF;

    -- Add composite index for common query pattern
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = 'comparison_costs'
        AND indexname = 'idx_comparison_costs_active_region_order'
    ) THEN
        CREATE INDEX idx_comparison_costs_active_region_order
        ON comparison_costs(active, region, display_order);
        RAISE NOTICE 'Created index: idx_comparison_costs_active_region_order';
    ELSE
        RAISE NOTICE 'Index idx_comparison_costs_active_region_order already exists';
    END IF;
END $$;

-- Verify indexes were created
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'comparison_costs'
AND indexname IN ('idx_comparison_costs_region', 'idx_comparison_costs_active_region_order')
ORDER BY indexname;
