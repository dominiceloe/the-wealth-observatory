// Core database table types

export interface Billionaire {
  id: number;
  person_name: string;
  slug: string;
  gender: string | null;
  country_of_citizenship: string | null;
  industries: string[];
  birth_date: Date | null;
  image_url: string | null;
  bio: string | null;
  forbes_uri: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface DailySnapshot {
  id: number;
  billionaire_id: number;
  snapshot_date: Date;
  net_worth: number; // in millions USD
  rank: number | null;
  daily_change: number | null; // in millions USD
  data_source_id: number | null;
  created_at: Date;
}

export interface ComparisonCost {
  id: number;
  name: string;
  display_name: string;
  cost: number; // in USD
  unit: string;
  description: string;
  source: string;
  source_url: string;
  region: string | null;
  category: string;
  active: boolean;
  display_order: number;
  last_verified: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CalculatedComparison {
  id: number;
  billionaire_id: number;
  comparison_cost_id: number;
  calculation_date: Date;
  net_worth_used: number; // in millions USD
  quantity: number;
  created_at: Date;
}

export interface LuxuryPurchase {
  id: number;
  billionaire_id: number;
  item_name: string;
  category: string;
  cost: number; // in USD
  purchase_date: Date | null;
  description: string | null;
  source: string;
  source_url: string;
  image_url: string | null;
  verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface LuxuryComparison {
  id: number;
  luxury_purchase_id: number;
  comparison_cost_id: number;
  quantity: number;
  created_at: Date;
}

export interface DataSource {
  id: number;
  name: string;
  url: string | null;
  description: string | null;
  api_endpoint: string | null;
  last_accessed: Date | null;
  status: 'active' | 'deprecated' | 'failed';
  created_at: Date;
}

export interface UpdateMetadata {
  id: number;
  update_type: string;
  data_source_id: number | null;
  records_updated: number;
  records_created: number;
  records_failed: number;
  status: 'success' | 'partial' | 'failed';
  error_message: string | null;
  execution_time_ms: number | null;
  started_at: Date;
  completed_at: Date | null;
  created_at: Date;
}

export interface Disclaimer {
  id: number;
  key: string;
  title: string;
  content: string;
  display_order: number;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SiteConfig {
  id: number;
  key: string;
  value: string;
  description: string | null;
  updated_at: Date;
}

// Joined/composite types for frontend use

export interface BillionaireWithSnapshot extends Billionaire {
  latest_net_worth: number;
  latest_rank: number | null;
  latest_daily_change: number | null;
  latest_snapshot_date: Date;
}

export interface ComparisonWithCost extends CalculatedComparison {
  cost_display_name: string;
  cost_unit: string;
  cost_description: string;
  cost_source: string;
  cost_source_url: string;
  cost_category: string;
}

export interface LuxuryWithComparisons extends LuxuryPurchase {
  comparisons: Array<LuxuryComparison & ComparisonCost>;
}
