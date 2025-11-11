# Step 04: Initial Data Seed

## Objective
Populate the database with initial data from komed3/rtb-api, comparison costs, disclaimers, and site configuration.

## Prerequisites
- Database schema created (Step 02)
- Database connection working (Step 03)
- Internet connection (to fetch from APIs)

## Tasks

### 1. Create Seed Script Structure

Create `scripts/seed-initial-data.ts`:

```typescript
import { query, transaction, closePool } from '../lib/db';
import { format } from 'date-fns';

interface SeedProgress {
  dataSources: number;
  billionaires: number;
  snapshots: number;
  comparisonCosts: number;
  disclaimers: number;
  siteConfig: number;
}

const progress: SeedProgress = {
  dataSources: 0,
  billionaires: 0,
  snapshots: 0,
  comparisonCosts: 0,
  disclaimers: 0,
  siteConfig: 0,
};

async function seedDataSources() {
  console.log('\n📊 Seeding data sources...');

  const sources = [
    {
      name: 'Forbes Real-Time Billionaires',
      url: 'https://www.forbes.com/real-time-billionaires/',
      description: 'Forbes official real-time billionaire rankings',
      api_endpoint: 'https://www.forbes.com/forbesapi/person/rtb/0/position/true.json',
      status: 'active',
    },
    {
      name: 'komed3/rtb-api',
      url: 'https://github.com/komed3/rtb-api',
      description: 'Historical Forbes data archive (GitHub)',
      api_endpoint: 'https://raw.githubusercontent.com/komed3/rtb-api/main/data/rtb.json',
      status: 'active',
    },
    {
      name: 'Bloomberg Billionaires Index',
      url: 'https://www.bloomberg.com/billionaires/',
      description: 'Bloomberg daily billionaire rankings',
      api_endpoint: null,
      status: 'deprecated',
    },
  ];

  for (const source of sources) {
    await query(
      `INSERT INTO data_sources (name, url, description, api_endpoint, status, last_accessed)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (name) DO NOTHING`,
      [source.name, source.url, source.description, source.api_endpoint, source.status, new Date()]
    );
    progress.dataSources++;
  }

  console.log(`✅ Seeded ${progress.dataSources} data sources`);
}

async function fetchKomed3Data() {
  console.log('\n📥 Fetching billionaire data from komed3...');

  try {
    const response = await fetch(
      'https://raw.githubusercontent.com/komed3/rtb-api/main/data/rtb.json'
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ Fetched data for ${data.rtb?.length || 0} billionaires`);

    return data.rtb || [];
  } catch (error) {
    console.error('❌ Failed to fetch komed3 data:', error);
    throw error;
  }
}

async function seedBillionaires(billionairesData: any[]) {
  console.log('\n👤 Seeding billionaires...');

  const dataSourceResult = await query(
    `SELECT id FROM data_sources WHERE name = 'komed3/rtb-api' LIMIT 1`
  );
  const dataSourceId = dataSourceResult.rows[0]?.id;

  for (const person of billionairesData.slice(0, 50)) { // Top 50 only
    try {
      // Create slug from name
      const slug = person.person?.name
        ?.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || `person-${person.rank}`;

      // Insert billionaire
      const billionaireResult = await query(
        `INSERT INTO billionaires
         (person_name, slug, gender, country_of_citizenship, industries, birth_date, image_url, bio, forbes_uri)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (slug) DO UPDATE
         SET person_name = EXCLUDED.person_name,
             gender = EXCLUDED.gender,
             country_of_citizenship = EXCLUDED.country_of_citizenship,
             industries = EXCLUDED.industries,
             updated_at = CURRENT_TIMESTAMP
         RETURNING id`,
        [
          person.person?.name || 'Unknown',
          slug,
          person.person?.gender || null,
          person.person?.countryOfCitizenship || null,
          person.person?.industries || [],
          person.person?.birthDate || null,
          person.person?.squareImage || null,
          person.person?.bio?.[0] || null,
          person.uri || null,
        ]
      );

      const billionaireId = billionaireResult.rows[0].id;

      // Insert current snapshot
      await query(
        `INSERT INTO daily_snapshots
         (billionaire_id, snapshot_date, net_worth, rank, daily_change, data_source_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (billionaire_id, snapshot_date)
         DO UPDATE SET net_worth = EXCLUDED.net_worth, rank = EXCLUDED.rank`,
        [
          billionaireId,
          new Date(), // Today
          person.finalWorth || 0,
          person.rank || null,
          0, // Initial seed has no daily change
          dataSourceId,
        ]
      );

      progress.billionaires++;
      progress.snapshots++;

      if (progress.billionaires % 10 === 0) {
        console.log(`  Processed ${progress.billionaires} billionaires...`);
      }
    } catch (error) {
      console.error(`Failed to seed billionaire ${person.person?.name}:`, error);
    }
  }

  console.log(`✅ Seeded ${progress.billionaires} billionaires with ${progress.snapshots} snapshots`);
}

async function seedComparisonCosts() {
  console.log('\n💰 Seeding comparison costs...');

  const costs = [
    // Water category
    {
      name: 'communityWaterWell',
      display_name: 'Community Water Well',
      cost: 15000,
      unit: 'well',
      description: 'Complete community water well serving 500-1000 people in Sub-Saharan Africa, including drilling, pump installation, and maintenance training.',
      source: 'charity: water (2024)',
      source_url: 'https://www.charitywater.org/our-approach/how-we-work',
      region: 'Sub-Saharan Africa',
      category: 'water',
      display_order: 1,
      last_verified: new Date(),
    },
    {
      name: 'waterFilterSystem',
      display_name: 'Household Water Filter System',
      cost: 50,
      unit: 'filter',
      description: 'Ceramic water filter providing clean drinking water for one household (5-7 people) for 3-5 years.',
      source: 'Water.org (2024)',
      source_url: 'https://water.org/',
      region: 'Global',
      category: 'water',
      display_order: 2,
      last_verified: new Date(),
    },
    // Education category
    {
      name: 'primarySchool',
      display_name: 'Primary School Building',
      cost: 150000,
      unit: 'school',
      description: 'Complete 3-classroom primary school building in rural areas, including desks, blackboards, and basic supplies for 150 students.',
      source: 'Room to Read (2024)',
      source_url: 'https://www.roomtoread.org/',
      region: 'South Asia',
      category: 'education',
      display_order: 3,
      last_verified: new Date(),
    },
    {
      name: 'yearOfSchool',
      display_name: 'Year of Primary Education',
      cost: 120,
      unit: 'student-year',
      description: 'One full year of primary education for one child, including tuition, books, uniform, and supplies.',
      source: 'UNESCO (2024)',
      source_url: 'https://www.unesco.org/',
      region: 'Sub-Saharan Africa',
      category: 'education',
      display_order: 4,
      last_verified: new Date(),
    },
    {
      name: 'scholarshipProgram',
      display_name: 'Secondary School Scholarship',
      cost: 500,
      unit: 'scholarship',
      description: 'Full year secondary school scholarship covering tuition, books, meals, and transportation for one student.',
      source: 'Educate! (2024)',
      source_url: 'https://www.experienceeducate.org/',
      region: 'East Africa',
      category: 'education',
      display_order: 5,
      last_verified: new Date(),
    },
    // Food category
    {
      name: 'schoolMealsYear',
      display_name: 'Year of School Meals',
      cost: 50,
      unit: 'child-year',
      description: 'One full year of daily nutritious school meals for one child (approximately 180 meals).',
      source: 'World Food Programme (2024)',
      source_url: 'https://www.wfp.org/',
      region: 'Global',
      category: 'food',
      display_order: 6,
      last_verified: new Date(),
    },
    {
      name: 'foodPackageFamily',
      display_name: 'Monthly Food Package',
      cost: 75,
      unit: 'family-month',
      description: 'One month of nutritious food for a family of 5, including grains, proteins, oils, and essential nutrients.',
      source: 'Feeding America (2024)',
      source_url: 'https://www.feedingamerica.org/',
      region: 'United States',
      category: 'food',
      display_order: 7,
      last_verified: new Date(),
    },
    // Healthcare category
    {
      name: 'malariaNets',
      display_name: 'Insecticide-Treated Bed Net',
      cost: 5,
      unit: 'net',
      description: 'Long-lasting insecticide-treated mosquito net protecting 2 people from malaria for 3-5 years.',
      source: 'Against Malaria Foundation (2024)',
      source_url: 'https://www.againstmalaria.com/',
      region: 'Sub-Saharan Africa',
      category: 'healthcare',
      display_order: 8,
      last_verified: new Date(),
    },
    {
      name: 'cataractSurgery',
      display_name: 'Cataract Surgery',
      cost: 50,
      unit: 'surgery',
      description: 'Complete cataract surgery restoring sight for one person, including pre/post-op care.',
      source: 'Seva Foundation (2024)',
      source_url: 'https://www.seva.org/',
      region: 'South Asia',
      category: 'healthcare',
      display_order: 9,
      last_verified: new Date(),
    },
    {
      name: 'vaccineChild',
      display_name: 'Full Childhood Immunization',
      cost: 30,
      unit: 'child',
      description: 'Complete set of life-saving vaccines for one child (measles, polio, DTP, etc.).',
      source: 'UNICEF (2024)',
      source_url: 'https://www.unicef.org/',
      region: 'Global',
      category: 'healthcare',
      display_order: 10,
      last_verified: new Date(),
    },
    // Housing category
    {
      name: 'basicHouse',
      display_name: 'Basic Family Home',
      cost: 5000,
      unit: 'home',
      description: 'Simple but sturdy 2-room family home with roof, walls, floor, door, and windows in rural area.',
      source: 'Habitat for Humanity (2024)',
      source_url: 'https://www.habitat.org/',
      region: 'Southeast Asia',
      category: 'housing',
      display_order: 11,
      last_verified: new Date(),
    },
    {
      name: 'homelessShelter',
      display_name: 'Month of Shelter Services',
      cost: 300,
      unit: 'person-month',
      description: 'One month of shelter, meals, and support services for one homeless individual.',
      source: 'National Alliance to End Homelessness (2024)',
      source_url: 'https://endhomelessness.org/',
      region: 'United States',
      category: 'housing',
      display_order: 12,
      last_verified: new Date(),
    },
    // Energy category
    {
      name: 'solarPanel',
      display_name: 'Home Solar Panel System',
      cost: 300,
      unit: 'system',
      description: 'Basic solar panel system providing electricity for lights, phone charging, and small appliances for one household.',
      source: 'SolarAid (2024)',
      source_url: 'https://solar-aid.org/',
      region: 'East Africa',
      category: 'energy',
      display_order: 13,
      last_verified: new Date(),
    },
    // Emergency Relief category
    {
      name: 'emergencyKit',
      display_name: 'Emergency Relief Kit',
      cost: 50,
      unit: 'kit',
      description: 'Essential emergency supplies for one family after disaster: water purification, blankets, cooking supplies, hygiene items.',
      source: 'Red Cross (2024)',
      source_url: 'https://www.redcross.org/',
      region: 'Global',
      category: 'emergency',
      display_order: 14,
      last_verified: new Date(),
    },
  ];

  for (const cost of costs) {
    await query(
      `INSERT INTO comparison_costs
       (name, display_name, cost, unit, description, source, source_url, region, category, display_order, last_verified, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (name) DO UPDATE
       SET cost = EXCLUDED.cost,
           display_name = EXCLUDED.display_name,
           updated_at = CURRENT_TIMESTAMP`,
      [
        cost.name,
        cost.display_name,
        cost.cost,
        cost.unit,
        cost.description,
        cost.source,
        cost.source_url,
        cost.region,
        cost.category,
        cost.display_order,
        cost.last_verified,
        true,
      ]
    );
    progress.comparisonCosts++;
  }

  console.log(`✅ Seeded ${progress.comparisonCosts} comparison costs`);
}

async function seedDisclaimers() {
  console.log('\n📜 Seeding disclaimers...');

  const disclaimers = [
    {
      key: 'methodology',
      title: 'Methodology',
      content: `## How We Calculate

**Wealth Data:** Net worth figures are sourced from Forbes Real-Time Billionaires list, updated daily. Forbes estimates net worth by valuing individuals' assets, including stakes in public and private companies, real estate, art, and other investments.

**The $10 Million Threshold:** When calculating "what wealth could fund," we subtract $10 million from each billionaire's net worth. This represents more than enough for an extremely comfortable life, while highlighting the scale of wealth beyond any reasonable personal need.

**Comparison Calculations:** All comparison costs are:
- Sourced from reputable charities, NGOs, and international organizations
- Verified and dated (last updated 2024)
- Based on real program costs, not theoretical estimates
- Region-specific where applicable
- Calculated as: (Net Worth - $10M) ÷ Unit Cost = Quantity

**Update Frequency:** Wealth data updates daily at 6:00 AM PST. Comparison costs are reviewed monthly.`,
      display_order: 1,
      active: true,
    },
    {
      key: 'data_sources',
      title: 'Data Sources',
      content: `## Where Our Data Comes From

**Billionaire Wealth:**
- Forbes Real-Time Billionaires (https://www.forbes.com/real-time-billionaires/)
- Historical data from komed3/rtb-api (https://github.com/komed3/rtb-api)

**Comparison Costs:**
Each comparison on this site includes its specific source and citation. Major sources include:
- charity: water (community water wells)
- World Food Programme (school meals)
- UNICEF (vaccines, education)
- Against Malaria Foundation (bed nets)
- Habitat for Humanity (housing)
- Room to Read (schools)
- And many other verified charitable organizations

All sources are linked directly from each comparison for transparency and verification.`,
      display_order: 2,
      active: true,
    },
    {
      key: 'legal',
      title: 'Legal Disclaimer',
      content: `## Important Legal Information

**Not Financial Advice:** This website is for informational and educational purposes only. It is not financial advice, investment advice, or a recommendation to buy or sell any securities.

**Estimates Only:** Net worth figures are estimates based on publicly available information. Actual net worth may differ significantly due to:
- Private holdings not publicly disclosed
- Market fluctuations
- Currency exchange rates
- Valuation methodologies

**No Affiliation:** This site is not affiliated with, endorsed by, or connected to Forbes, Bloomberg, any billionaire featured, or any charitable organization mentioned.

**Accuracy:** While we strive for accuracy, we make no guarantees about the completeness or reliability of information presented. All data is provided "as is."

**Fair Use:** Any images or content used fall under fair use for educational and commentary purposes.`,
      display_order: 3,
      active: true,
    },
    {
      key: 'privacy',
      title: 'Privacy',
      content: `## Your Privacy Matters

**No Tracking:** This website does not use cookies, analytics, or any tracking technologies. We do not collect any personal information about visitors.

**No Accounts:** There are no user accounts or login systems. You can browse completely anonymously.

**Public Data Only:** All billionaire information displayed is already publicly available through Forbes and other public sources.

**Anonymous by Design:** We built this site to respect your privacy completely. No data about your visit is stored or shared with anyone.`,
      display_order: 4,
      active: true,
    },
    {
      key: 'about',
      title: 'About This Project',
      content: `## Why This Exists

The Wealth Observatory was created to provide perspective on the scale of billionaire wealth by showing what it could fund instead.

**Our Mission:** To make extreme wealth disparities visible and understandable through concrete, real-world comparisons.

**Why $10 Million?** This threshold represents far more than needed for an extraordinarily comfortable life, while highlighting that everything beyond this is wealth accumulation at a scale that could address global problems.

**Not Personal Attacks:** This site is not about individual billionaires as people. It's about the systemic reality of wealth concentration and its opportunity cost.

**Open Questions:** What could society achieve if this wealth were deployed differently? What problems could be solved? These are questions worth asking.

**Contact:** For corrections, suggestions, or questions about methodology, please open an issue on our GitHub repository.`,
      display_order: 5,
      active: true,
    },
  ];

  for (const disclaimer of disclaimers) {
    await query(
      `INSERT INTO disclaimers (key, title, content, display_order, active)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (key) DO UPDATE
       SET content = EXCLUDED.content, title = EXCLUDED.title, updated_at = CURRENT_TIMESTAMP`,
      [disclaimer.key, disclaimer.title, disclaimer.content, disclaimer.display_order, disclaimer.active]
    );
    progress.disclaimers++;
  }

  console.log(`✅ Seeded ${progress.disclaimers} disclaimers`);
}

async function seedSiteConfig() {
  console.log('\n⚙️  Seeding site configuration...');

  const configs = [
    {
      key: 'wealth_threshold',
      value: '10000000',
      description: 'Wealth threshold in USD for comparison calculations ($10 million)',
    },
    {
      key: 'homepage_billionaire_limit',
      value: '50',
      description: 'Number of billionaires to display on homepage',
    },
    {
      key: 'chart_days_default',
      value: '30',
      description: 'Default number of days to show in wealth charts',
    },
    {
      key: 'last_manual_update',
      value: new Date().toISOString(),
      description: 'Timestamp of last manual data update',
    },
  ];

  for (const config of configs) {
    await query(
      `INSERT INTO site_config (key, value, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
      [config.key, config.value, config.description]
    );
    progress.siteConfig++;
  }

  console.log(`✅ Seeded ${progress.siteConfig} site config entries`);
}

async function calculateInitialComparisons() {
  console.log('\n🧮 Calculating initial comparisons...');

  // Get wealth threshold
  const thresholdResult = await query(
    `SELECT value FROM site_config WHERE key = 'wealth_threshold'`
  );
  const thresholdUSD = parseInt(thresholdResult.rows[0].value);
  const thresholdMillions = thresholdUSD / 1_000_000;

  // Get all billionaires with their latest snapshots
  const billionaires = await query(`
    SELECT
      b.id,
      b.person_name,
      ds.net_worth,
      ds.snapshot_date
    FROM billionaires b
    JOIN daily_snapshots ds ON b.id = ds.billionaire_id
    WHERE ds.snapshot_date = (
      SELECT MAX(snapshot_date)
      FROM daily_snapshots
      WHERE billionaire_id = b.id
    )
  `);

  // Get all active comparison costs
  const costs = await query(`
    SELECT id, cost
    FROM comparison_costs
    WHERE active = true
  `);

  let comparisonsCreated = 0;

  for (const billionaire of billionaires.rows) {
    const netWorthMillions = billionaire.net_worth;
    const usableWealthMillions = Math.max(0, netWorthMillions - thresholdMillions);
    const usableWealthUSD = usableWealthMillions * 1_000_000;

    for (const cost of costs.rows) {
      const quantity = Math.floor(usableWealthUSD / cost.cost);

      if (quantity > 0) {
        await query(
          `INSERT INTO calculated_comparisons
           (billionaire_id, comparison_cost_id, calculation_date, net_worth_used, quantity)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (billionaire_id, comparison_cost_id, calculation_date)
           DO UPDATE SET quantity = EXCLUDED.quantity`,
          [
            billionaire.id,
            cost.id,
            billionaire.snapshot_date,
            usableWealthMillions,
            quantity,
          ]
        );
        comparisonsCreated++;
      }
    }
  }

  console.log(`✅ Created ${comparisonsCreated} calculated comparisons`);
}

async function logSeedMetadata() {
  console.log('\n📝 Logging seed metadata...');

  const dataSourceResult = await query(
    `SELECT id FROM data_sources WHERE name = 'komed3/rtb-api' LIMIT 1`
  );
  const dataSourceId = dataSourceResult.rows[0]?.id;

  await query(
    `INSERT INTO update_metadata
     (update_type, data_source_id, records_created, status, started_at, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      'initial_seed',
      dataSourceId,
      progress.billionaires + progress.snapshots + progress.comparisonCosts + progress.disclaimers + progress.siteConfig,
      'success',
      new Date(),
      new Date(),
    ]
  );

  console.log('✅ Seed metadata logged');
}

async function runSeed() {
  console.log('🌱 Starting initial data seed...\n');
  const startTime = Date.now();

  try {
    await seedDataSources();
    const billionairesData = await fetchKomed3Data();
    await seedBillionaires(billionairesData);
    await seedComparisonCosts();
    await seedDisclaimers();
    await seedSiteConfig();
    await calculateInitialComparisons();
    await logSeedMetadata();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n🎉 Seed completed successfully!\n');
    console.log('Summary:');
    console.log(`  Data Sources:     ${progress.dataSources}`);
    console.log(`  Billionaires:     ${progress.billionaires}`);
    console.log(`  Snapshots:        ${progress.snapshots}`);
    console.log(`  Comparison Costs: ${progress.comparisonCosts}`);
    console.log(`  Disclaimers:      ${progress.disclaimers}`);
    console.log(`  Site Config:      ${progress.siteConfig}`);
    console.log(`\n⏱️  Total time: ${duration}s`);

  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

runSeed();
```

### 2. Add Seed Script to package.json

```json
{
  "scripts": {
    "seed": "tsx scripts/seed-initial-data.ts"
  }
}
```

### 3. Run Initial Seed

```bash
npm run seed
```

Expected output:
```
🌱 Starting initial data seed...

📊 Seeding data sources...
✅ Seeded 3 data sources

📥 Fetching billionaire data from komed3...
✅ Fetched data for 50+ billionaires

👤 Seeding billionaires...
  Processed 10 billionaires...
  Processed 20 billionaires...
  ...
✅ Seeded 50 billionaires with 50 snapshots

💰 Seeding comparison costs...
✅ Seeded 14 comparison costs

📜 Seeding disclaimers...
✅ Seeded 5 disclaimers

⚙️  Seeding site configuration...
✅ Seeded 4 site config entries

🧮 Calculating initial comparisons...
✅ Created 700 calculated comparisons

📝 Logging seed metadata...
✅ Seed metadata logged

🎉 Seed completed successfully!
```

## Verification Checklist

- [ ] Data sources table populated (3 entries)
- [ ] Billionaires table populated (50 entries)
- [ ] Daily snapshots table populated (50 entries)
- [ ] Comparison costs table populated (14+ entries)
- [ ] Disclaimers table populated (5 entries)
- [ ] Site config table populated (4 entries)
- [ ] Calculated comparisons populated (700+ entries)
- [ ] Update metadata logged
- [ ] No seed errors

### Verify Data:
```sql
SELECT
  (SELECT COUNT(*) FROM billionaires) as billionaires,
  (SELECT COUNT(*) FROM daily_snapshots) as snapshots,
  (SELECT COUNT(*) FROM comparison_costs) as costs,
  (SELECT COUNT(*) FROM disclaimers) as disclaimers,
  (SELECT COUNT(*) FROM site_config) as config,
  (SELECT COUNT(*) FROM calculated_comparisons) as comparisons;
```

## Next Step
Proceed to `STEP-05-QUERY-FUNCTIONS.md` to create all database query functions for the application.
