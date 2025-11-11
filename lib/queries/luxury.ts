import { query } from '@/lib/db';
import type {
  LuxuryPurchase,
} from '@/types/database';

/**
 * Get all luxury purchases for a billionaire
 */
export async function getLuxuryPurchases(billionaireId: number): Promise<LuxuryPurchase[]> {
  const result = await query<LuxuryPurchase>(
    `
    SELECT *
    FROM luxury_purchases
    WHERE billionaire_id = $1
    ORDER BY purchase_date DESC
    `,
    [billionaireId]
  );

  return result.rows;
}

/**
 * Get luxury comparisons for a specific purchase
 */
export async function getLuxuryComparisons(purchaseId: number): Promise<Array<{
  quantity: number;
  unit: string;
  display_name: string;
}>> {
  const result = await query<{
    quantity: number;
    unit: string;
    display_name: string;
  }>(
    `
    SELECT
      lc.quantity,
      cc.unit,
      cc.display_name
    FROM luxury_comparisons lc
    JOIN comparison_costs cc ON lc.comparison_cost_id = cc.id
    WHERE lc.luxury_purchase_id = $1
    ORDER BY lc.quantity DESC
    `,
    [purchaseId]
  );

  return result.rows;
}

/**
 * Get all luxury purchases with their comparisons in a single query (avoids N+1 problem)
 * Returns purchases grouped with their associated comparisons
 */
export async function getLuxuryPurchasesWithComparisons(billionaireId: number): Promise<Array<LuxuryPurchase & {
  comparisons: Array<{
    quantity: number;
    unit: string;
    display_name: string;
  }>;
}>> {
  const result = await query<{
    // Luxury purchase fields
    id: number;
    billionaire_id: number;
    item_name: string;
    category: string;
    cost: string; // BIGINT comes as string
    purchase_date: Date | null;
    description: string | null;
    source: string;
    source_url: string;
    image_url: string | null;
    verified: boolean;
    created_at: Date;
    updated_at: Date;
    // Comparison fields (can be null if no comparisons exist)
    comparison_quantity: string | null; // BIGINT comes as string
    comparison_unit: string | null;
    comparison_display_name: string | null;
  }>(
    `
    SELECT
      lp.*,
      lc.quantity as comparison_quantity,
      cc.unit as comparison_unit,
      cc.display_name as comparison_display_name
    FROM luxury_purchases lp
    LEFT JOIN luxury_comparisons lc ON lp.id = lc.luxury_purchase_id
    LEFT JOIN comparison_costs cc ON lc.comparison_cost_id = cc.id
    WHERE lp.billionaire_id = $1
    ORDER BY lp.cost DESC, cc.display_order ASC
    `,
    [billionaireId]
  );

  // Group results by purchase ID
  const purchasesMap = new Map<number, LuxuryPurchase & {
    comparisons: Array<{
      quantity: number;
      unit: string;
      display_name: string;
    }>;
  }>();

  for (const row of result.rows) {
    if (!purchasesMap.has(row.id)) {
      // Create new purchase entry
      purchasesMap.set(row.id, {
        id: row.id,
        billionaire_id: row.billionaire_id,
        item_name: row.item_name,
        category: row.category,
        cost: Number(row.cost),
        purchase_date: row.purchase_date,
        description: row.description,
        source: row.source,
        source_url: row.source_url,
        image_url: row.image_url,
        verified: row.verified,
        created_at: row.created_at,
        updated_at: row.updated_at,
        comparisons: [],
      });
    }

    // Add comparison if it exists
    if (row.comparison_quantity && row.comparison_unit && row.comparison_display_name) {
      purchasesMap.get(row.id)!.comparisons.push({
        quantity: Number(row.comparison_quantity),
        unit: row.comparison_unit,
        display_name: row.comparison_display_name,
      });
    }
  }

  return Array.from(purchasesMap.values());
}

/**
 * Insert a luxury purchase
 */
export async function insertLuxuryPurchase(
  billionaireId: number,
  itemName: string,
  cost: number,
  category: string,
  description?: string,
  imageUrl?: string,
  sourceUrl?: string,
  purchaseDate?: Date
): Promise<number> {
  const result = await query<{ id: number }>(
    `
    INSERT INTO luxury_purchases (
      billionaire_id,
      item_name,
      cost,
      category,
      description,
      image_url,
      source_url,
      purchase_date
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id
    `,
    [
      billionaireId,
      itemName,
      cost,
      category,
      description,
      imageUrl,
      sourceUrl,
      purchaseDate || new Date(),
    ]
  );

  return result.rows[0].id;
}

/**
 * Insert a luxury comparison
 */
export async function insertLuxuryComparison(
  purchaseId: number,
  comparisonId: number,
  quantity: number
): Promise<void> {
  await query(
    `
    INSERT INTO luxury_comparisons (purchase_id, comparison_id, quantity)
    VALUES ($1, $2, $3)
    `,
    [purchaseId, comparisonId, quantity]
  );
}
