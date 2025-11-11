import { config } from 'dotenv';
import { query, closePool } from '../lib/db';

config({ path: '.env.local' });

interface ComparisonCost {
  id: number;
  name: string;
  display_name: string;
  cost: string;
  unit: string;
  description: string;
  source: string;
  source_url: string | null;
  region: string;
  category: string;
  last_verified: Date;
  active: boolean;
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return `$${amount.toLocaleString()}`;
}

function getDaysOld(date: Date): number {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - new Date(date).getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

async function validateCosts() {
  console.log('🔍 Validating Comparison Costs\n');
  console.log('═'.repeat(80));

  try {
    const result = await query<ComparisonCost>(`
      SELECT *
      FROM comparison_costs
      WHERE active = true
      ORDER BY category ASC, display_order ASC
    `);

    const costs = result.rows;
    const warnings: string[] = [];
    const oldCosts: ComparisonCost[] = [];

    console.log(`\nFound ${costs.length} active comparison costs\n`);

    // Group by category
    const categories = costs.reduce((acc, cost) => {
      if (!acc[cost.category]) {
        acc[cost.category] = [];
      }
      acc[cost.category].push(cost);
      return acc;
    }, {} as Record<string, ComparisonCost[]>);

    // Analyze each category
    for (const [category, items] of Object.entries(categories)) {
      console.log(`\n📊 ${category.toUpperCase()}`);
      console.log('─'.repeat(80));

      for (const cost of items) {
        const costNum = Number(cost.cost);
        const daysOld = getDaysOld(cost.last_verified);

        console.log(`\n✓ ${cost.display_name}`);
        console.log(`  Cost: ${formatCurrency(costNum)} per ${cost.unit}`);
        console.log(`  Region: ${cost.region}`);
        console.log(`  Source: ${cost.source}`);
        if (cost.source_url) {
          console.log(`  URL: ${cost.source_url}`);
        }
        console.log(`  Last Verified: ${new Date(cost.last_verified).toLocaleDateString()} (${daysOld} days ago)`);

        // Flag suspicious costs
        const suspiciousLowThresholds: Record<string, number> = {
          'cataractSurgery': 100, // Surgery under $100 seems too low
          'primarySchool': 50000, // School building under $50k seems low
          'basicHouse': 2000, // House under $2k seems unrealistic
          'yearOfSchool': 50, // Education under $50/year seems too low for US
        };

        if (cost.name in suspiciousLowThresholds && costNum < suspiciousLowThresholds[cost.name]) {
          console.log(`  ⚠️  WARNING: Cost seems suspiciously LOW for ${cost.region}`);
          warnings.push(`${cost.display_name}: ${formatCurrency(costNum)} seems too low`);
        }

        // Flag old verification dates (over 180 days)
        if (daysOld > 180) {
          console.log(`  ⚠️  WARNING: Cost hasn't been verified in ${daysOld} days`);
          oldCosts.push(cost);
        }

        // Region-specific warnings
        if (cost.region.toLowerCase().includes('united states')) {
          if (cost.name === 'cataractSurgery' && costNum < 1000) {
            console.log(`  ⚠️  WARNING: Cataract surgery in US typically costs $3,000-$5,000 per eye`);
            warnings.push(`${cost.display_name}: US cost should be $3,000-$5,000, currently ${formatCurrency(costNum)}`);
          }
          if (cost.name === 'yearOfSchool' && costNum < 10000) {
            console.log(`  ⚠️  WARNING: US public education costs ~$15,000-$16,000 per student/year`);
            warnings.push(`${cost.display_name}: US cost should be ~$15,000, currently ${formatCurrency(costNum)}`);
          }
        }
      }
    }

    // Summary Report
    console.log('\n\n📋 VALIDATION SUMMARY');
    console.log('═'.repeat(80));
    console.log(`Total Costs Checked: ${costs.length}`);
    console.log(`Warnings Found: ${warnings.length}`);
    console.log(`Costs Needing Reverification (>180 days): ${oldCosts.length}`);

    if (warnings.length > 0) {
      console.log('\n\n⚠️  WARNINGS:');
      console.log('─'.repeat(80));
      warnings.forEach((warning, i) => {
        console.log(`${i + 1}. ${warning}`);
      });
    }

    if (oldCosts.length > 0) {
      console.log('\n\n🕐 COSTS NEEDING REVERIFICATION:');
      console.log('─'.repeat(80));
      oldCosts.forEach((cost, i) => {
        console.log(`${i + 1}. ${cost.display_name} - Last verified ${getDaysOld(cost.last_verified)} days ago`);
        if (cost.source_url) {
          console.log(`   Check: ${cost.source_url}`);
        }
      });
    }

    console.log('\n\n💡 RECOMMENDATIONS:');
    console.log('─'.repeat(80));
    console.log('1. Review all costs with warnings above');
    console.log('2. Visit source URLs to verify current pricing');
    console.log('3. Update costs in database if needed');
    console.log('4. Run: UPDATE comparison_costs SET last_verified = NOW() WHERE id = <id>');
    console.log('5. Consider region-specific costs (US vs developing world)');

    if (warnings.length > 0 || oldCosts.length > 0) {
      console.log('\n❌ Validation found issues that need attention\n');
      process.exit(1);
    } else {
      console.log('\n✅ All costs look reasonable and up-to-date\n');
    }

  } catch (error) {
    console.error('\n❌ Validation failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

validateCosts();
