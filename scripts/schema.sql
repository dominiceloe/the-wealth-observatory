-- The Wealth Observatory Database Schema
-- PostgreSQL 14+

-- ============================================
-- TABLE 1: data_sources
-- Track where data comes from
-- ============================================
CREATE TABLE data_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    url TEXT,
    description TEXT,
    api_endpoint TEXT,
    last_accessed TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_status CHECK (status IN ('active', 'deprecated', 'failed'))
);

CREATE INDEX idx_data_sources_status ON data_sources(status);

-- ============================================
-- TABLE 2: billionaires
-- Core profile data for each billionaire
-- ============================================
CREATE TABLE billionaires (
    id SERIAL PRIMARY KEY,
    person_name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    gender VARCHAR(50),
    country_of_citizenship VARCHAR(255),
    industries TEXT[],
    birth_date DATE,
    image_url TEXT,
    bio TEXT,
    forbes_uri VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_billionaires_slug ON billionaires(slug);
CREATE INDEX idx_billionaires_name ON billionaires(person_name);

-- ============================================
-- TABLE 3: daily_snapshots
-- Historical wealth tracking
-- ============================================
CREATE TABLE daily_snapshots (
    id SERIAL PRIMARY KEY,
    billionaire_id INTEGER NOT NULL REFERENCES billionaires(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    net_worth BIGINT NOT NULL, -- in USD millions
    rank INTEGER,
    daily_change BIGINT, -- in USD millions, can be negative
    data_source_id INTEGER REFERENCES data_sources(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_billionaire_date UNIQUE (billionaire_id, snapshot_date)
);

CREATE INDEX idx_snapshots_date_desc ON daily_snapshots(snapshot_date DESC);
CREATE INDEX idx_snapshots_billionaire_date ON daily_snapshots(billionaire_id, snapshot_date DESC);
CREATE INDEX idx_snapshots_rank ON daily_snapshots(rank) WHERE rank IS NOT NULL;

-- ============================================
-- TABLE 4: comparison_costs
-- Cost data for "what wealth could fund"
-- ============================================
CREATE TABLE comparison_costs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    cost DECIMAL(15, 2) NOT NULL, -- actual cost in USD
    unit VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    source VARCHAR(500) NOT NULL,
    source_url TEXT NOT NULL,
    region VARCHAR(255),
    category VARCHAR(100) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    last_verified DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_cost_positive CHECK (cost > 0)
);

CREATE INDEX idx_comparison_costs_category ON comparison_costs(category);
CREATE INDEX idx_comparison_costs_active ON comparison_costs(active);
CREATE INDEX idx_comparison_costs_display_order ON comparison_costs(display_order);
CREATE INDEX idx_comparison_costs_region ON comparison_costs(region);
-- Composite index for common query pattern (active + region + display_order)
CREATE INDEX idx_comparison_costs_active_region_order ON comparison_costs(active, region, display_order);

-- ============================================
-- TABLE 5: calculated_comparisons
-- Pre-computed daily comparisons
-- ============================================
CREATE TABLE calculated_comparisons (
    id SERIAL PRIMARY KEY,
    billionaire_id INTEGER NOT NULL REFERENCES billionaires(id) ON DELETE CASCADE,
    comparison_cost_id INTEGER NOT NULL REFERENCES comparison_costs(id) ON DELETE CASCADE,
    calculation_date DATE NOT NULL,
    net_worth_used BIGINT NOT NULL, -- wealth minus $10M threshold, in millions
    quantity BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_comparison_calculation UNIQUE (billionaire_id, comparison_cost_id, calculation_date)
);

CREATE INDEX idx_calculated_billionaire_date ON calculated_comparisons(billionaire_id, calculation_date DESC);

-- ============================================
-- TABLE 6: luxury_purchases
-- Verified luxury spending by billionaires
-- ============================================
CREATE TABLE luxury_purchases (
    id SERIAL PRIMARY KEY,
    billionaire_id INTEGER NOT NULL REFERENCES billionaires(id) ON DELETE CASCADE,
    item_name VARCHAR(500) NOT NULL,
    category VARCHAR(100) NOT NULL,
    cost BIGINT NOT NULL, -- in USD
    purchase_date DATE,
    description TEXT,
    source VARCHAR(500) NOT NULL,
    source_url TEXT NOT NULL,
    image_url TEXT,
    verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_luxury_cost_positive CHECK (cost > 0)
);

CREATE INDEX idx_luxury_billionaire ON luxury_purchases(billionaire_id);
CREATE INDEX idx_luxury_cost_desc ON luxury_purchases(cost DESC);

-- ============================================
-- TABLE 7: luxury_comparisons
-- Pre-computed: what luxury purchases could fund
-- ============================================
CREATE TABLE luxury_comparisons (
    id SERIAL PRIMARY KEY,
    luxury_purchase_id INTEGER NOT NULL REFERENCES luxury_purchases(id) ON DELETE CASCADE,
    comparison_cost_id INTEGER NOT NULL REFERENCES comparison_costs(id) ON DELETE CASCADE,
    quantity BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_luxury_comparison UNIQUE (luxury_purchase_id, comparison_cost_id)
);

CREATE INDEX idx_luxury_comp_purchase ON luxury_comparisons(luxury_purchase_id);

-- ============================================
-- TABLE 8: update_metadata
-- Log every data update attempt
-- ============================================
CREATE TABLE update_metadata (
    id SERIAL PRIMARY KEY,
    update_type VARCHAR(100) NOT NULL,
    data_source_id INTEGER REFERENCES data_sources(id),
    records_updated INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    execution_time_ms INTEGER,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_update_status CHECK (status IN ('success', 'partial', 'failed'))
);

CREATE INDEX idx_update_metadata_started ON update_metadata(started_at DESC);
CREATE INDEX idx_update_metadata_status ON update_metadata(status);

-- ============================================
-- TABLE 9: disclaimers
-- Editable legal/methodology text
-- ============================================
CREATE TABLE disclaimers (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_disclaimers_display_order ON disclaimers(display_order);

-- ============================================
-- TABLE 10: site_config
-- Dynamic site settings
-- ============================================
CREATE TABLE site_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TRIGGERS: Auto-update updated_at timestamps
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_billionaires_updated_at BEFORE UPDATE ON billionaires
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comparison_costs_updated_at BEFORE UPDATE ON comparison_costs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_luxury_purchases_updated_at BEFORE UPDATE ON luxury_purchases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_disclaimers_updated_at BEFORE UPDATE ON disclaimers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_site_config_updated_at BEFORE UPDATE ON site_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
