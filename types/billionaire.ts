// Frontend display types (derived from database types)

export interface BillionaireCardData {
  id: number;
  name: string;
  slug: string;
  imageUrl: string | null;
  netWorth: number; // in millions
  rank: number | null;
  dailyChange: number | null; // in millions
  sampleComparison?: {
    quantity: number;
    unit: string;
    displayName: string;
  };
}

export interface BillionaireDetailData {
  id: number;
  name: string;
  slug: string;
  imageUrl: string | null;
  netWorth: number;
  rank: number | null;
  country: string | null;
  industries: string[];
  bio: string | null;
  forbesUrl: string | null;
  history: Array<{
    date: string;
    netWorth: number;
  }>;
  comparisons: Array<{
    category: string;
    items: Array<{
      displayName: string;
      quantity: number;
      unit: string;
      description: string;
      source: string;
      sourceUrl: string;
    }>;
  }>;
  luxuryPurchases?: Array<{
    itemName: string;
    cost: number;
    description: string | null;
    comparisons: Array<{
      quantity: number;
      unit: string;
      displayName: string;
    }>;
  }>;
}

export interface AggregateStatsData {
  totalWealth: number; // in millions
  billionaireCount: number;
  topComparisons: Array<{
    displayName: string;
    quantity: number;
    unit: string;
    description: string;
  }>;
  lastUpdated: Date;
}
