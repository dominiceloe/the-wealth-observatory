import { config } from 'dotenv';
import { query, closePool } from '../lib/db';

// Load environment variables
config({ path: '.env.local' });

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

async function fetchAvailableDays(): Promise<string[]> {
  console.log('\n📅 Fetching available dates from komed3/rtb-api...');

  const url = 'https://raw.githubusercontent.com/komed3/rtb-api/main/api/availableDays';

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WealthObservatory/1.0)',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();
    const dates = text.trim().split('\n').map(d => d.trim()).filter(d => d);
    console.log(`✅ Found ${dates.length} available days of data`);
    return dates;
  } catch (error) {
    console.error('❌ Failed to fetch available days:', error);
    throw error;
  }
}

async function fetchBillionaireDataForDate(date: string): Promise<any[]> {
  const url = `https://raw.githubusercontent.com/komed3/rtb-api/main/api/list/rtb/${date}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WealthObservatory/1.0)',
      },
    });
    if (!response.ok) {
      console.warn(`⚠️  No data for ${date} (status: ${response.status})`);
      return [];
    }
    const jsonData = await response.json();
    // The data format is { list: [...], date, count, etc }
    return jsonData.list || [];
  } catch (error) {
    console.error(`❌ Failed to fetch data for ${date}:`, error);
    return [];
  }
}

async function fetchForbesRealTimeData(): Promise<any[]> {
  console.log('\n📡 Fetching live data from Forbes Real-Time API...');

  const url = 'https://www.forbes.com/forbesapi/person/rtb/0/position/true.json';

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WealthObservatory/1.0)',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const jsonData = await response.json();
    const billionaires = jsonData.personList?.personsLists || [];
    console.log(`✅ Fetched ${billionaires.length} billionaires from Forbes Real-Time API`);
    return billionaires;
  } catch (error) {
    console.error('❌ Failed to fetch Forbes Real-Time data:', error);
    return [];
  }
}

async function fetchKomed3HistoricalData(daysToFetch: number = 30): Promise<Map<string, any[]>> {
  console.log(`\n📥 Fetching historical data for past ${daysToFetch} days from komed3...`);

  // Get all available dates
  const availableDates = await fetchAvailableDays();

  // Get the last N days of available data (most recent archived data)
  const recentDates = availableDates.slice(-daysToFetch);

  console.log(`📊 Will fetch data for ${recentDates.length} dates`);
  console.log(`   From: ${recentDates[0]}`);
  console.log(`   To:   ${recentDates[recentDates.length - 1]}`);

  const historicalData = new Map<string, any[]>();

  // Fetch data for each date (with progress updates)
  for (let i = 0; i < recentDates.length; i++) {
    const date = recentDates[i];

    if ((i + 1) % 10 === 0 || i === 0 || i === recentDates.length - 1) {
      console.log(`  Fetching ${i + 1}/${recentDates.length}: ${date}...`);
    }

    const data = await fetchBillionaireDataForDate(date);
    if (data.length > 0) {
      historicalData.set(date, data);
    }

    // Rate limiting - small delay to be respectful to the CDN
    if (i < recentDates.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`✅ Fetched data for ${historicalData.size} dates`);
  return historicalData;
}

function normalizeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  // Prepend https: to protocol-relative URLs
  if (url.startsWith('//')) return `https:${url}`;
  return url;
}

async function seedForbesCurrentData(forbesData: any[]) {
  console.log('\n📡 Seeding current Forbes Real-Time data...');

  const dataSourceResult = await query(
    `SELECT id FROM data_sources WHERE name = 'Forbes Real-Time Billionaires' LIMIT 1`
  );
  const dataSourceId = dataSourceResult.rows[0]?.id;

  // Today's date for snapshot
  const today = new Date().toISOString().split('T')[0];

  let billionairesProcessed = 0;
  let snapshotsCreated = 0;

  for (const person of forbesData) {
    try {
      // Create slug from personName or uri
      const slug = (person.uri || person.personName)
        ?.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || `person-${person.rank}`;

      // Insert/update billionaire profile
      await query(
        `INSERT INTO billionaires
         (person_name, slug, gender, country_of_citizenship, industries, forbes_uri, image_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (slug) DO UPDATE
         SET person_name = EXCLUDED.person_name,
             gender = EXCLUDED.gender,
             country_of_citizenship = EXCLUDED.country_of_citizenship,
             industries = EXCLUDED.industries,
             forbes_uri = EXCLUDED.forbes_uri,
             image_url = EXCLUDED.image_url,
             updated_at = CURRENT_TIMESTAMP`,
        [
          person.personName || 'Unknown',
          slug,
          person.gender?.toUpperCase() || null,
          person.countryOfCitizenship?.toUpperCase() || null,
          person.industries || [],
          person.uri ? `/profile/${person.uri}` : null,
          normalizeImageUrl(person.squareImage),
        ]
      );
      billionairesProcessed++;

      // Get billionaire ID
      const billionaireResult = await query(
        `SELECT id FROM billionaires WHERE slug = $1 LIMIT 1`,
        [slug]
      );
      const billionaireId = billionaireResult.rows[0]?.id;

      if (!billionaireId) {
        console.warn(`⚠️  Could not find billionaire ID for ${slug}`);
        continue;
      }

      // Forbes API returns finalWorth in millions already, no conversion needed
      const currentWorthMillions = Math.round(person.finalWorth || 0);

      // Calculate daily change from yesterday's snapshot in our database
      const yesterdaySnapshot = await query(
        `SELECT net_worth FROM daily_snapshots
         WHERE billionaire_id = $1
         AND snapshot_date = CURRENT_DATE - INTERVAL '1 day'
         LIMIT 1`,
        [billionaireId]
      );
      const yesterdayWorth = yesterdaySnapshot.rows[0]?.net_worth || currentWorthMillions;
      const dailyChangeMillions = Math.round(currentWorthMillions - yesterdayWorth);

      // Insert snapshot for today
      await query(
        `INSERT INTO daily_snapshots
         (billionaire_id, snapshot_date, net_worth, rank, daily_change, data_source_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (billionaire_id, snapshot_date)
         DO UPDATE SET net_worth = EXCLUDED.net_worth, rank = EXCLUDED.rank, daily_change = EXCLUDED.daily_change`,
        [
          billionaireId,
          today,
          currentWorthMillions,
          person.rank || null,
          dailyChangeMillions,
          dataSourceId,
        ]
      );

      snapshotsCreated++;
      progress.snapshots++;
    } catch (error) {
      console.error(`Failed to seed Forbes data for ${person.personName}:`, error);
    }
  }

  console.log(`✅ Processed ${billionairesProcessed} billionaires with ${snapshotsCreated} current snapshots`);
}

async function seedHistoricalBillionaires(historicalData: Map<string, any[]>) {
  console.log('\n👤 Seeding billionaires with historical snapshots...');

  const dataSourceResult = await query(
    `SELECT id FROM data_sources WHERE name = 'komed3/rtb-api' LIMIT 1`
  );
  const dataSourceId = dataSourceResult.rows[0]?.id;

  // Track billionaires we've already inserted
  const processedBillionaires = new Set<string>();

  // Sort dates chronologically
  const sortedDates = Array.from(historicalData.keys()).sort();

  console.log(`\n📊 Processing ${sortedDates.length} days of data...`);

  for (const date of sortedDates) {
    const billionairesData = historicalData.get(date) || [];

    // Track daily changes for this date
    const previousDayWorth = new Map<string, number>();

    // Get previous day's data if it exists
    const dateObj = new Date(date);
    dateObj.setDate(dateObj.getDate() - 1);
    const previousDate = dateObj.toISOString().split('T')[0];
    const previousData = historicalData.get(previousDate) || [];

    for (const prevPerson of previousData) {
      const prevSlug = (prevPerson.uri || prevPerson.name)
        ?.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      if (prevSlug) {
        previousDayWorth.set(prevSlug, Math.round(prevPerson.networth || 0));
      }
    }

    for (const person of billionairesData) {
      try {
        // Create slug from name or uri
        const slug = (person.uri || person.name)
          ?.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') || `person-${person.rank}`;

        // Insert billionaire profile (only once per unique person)
        if (!processedBillionaires.has(slug)) {
          await query(
            `INSERT INTO billionaires
             (person_name, slug, gender, country_of_citizenship, industries, forbes_uri, image_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (slug) DO UPDATE
             SET person_name = EXCLUDED.person_name,
                 gender = EXCLUDED.gender,
                 country_of_citizenship = EXCLUDED.country_of_citizenship,
                 industries = EXCLUDED.industries,
                 forbes_uri = EXCLUDED.forbes_uri,
                 image_url = EXCLUDED.image_url,
                 updated_at = CURRENT_TIMESTAMP`,
            [
              person.name || 'Unknown',
              slug,
              person.gender?.toUpperCase() || null,
              person.citizenship?.toUpperCase() || null,
              person.industry || [],
              person.uri ? `/profile/${person.uri}` : null,
              null, // komed3 data doesn't include images
            ]
          );
          processedBillionaires.add(slug);
          progress.billionaires++;
        }

        // Get billionaire ID
        const billionaireResult = await query(
          `SELECT id FROM billionaires WHERE slug = $1 LIMIT 1`,
          [slug]
        );
        const billionaireId = billionaireResult.rows[0]?.id;

        if (!billionaireId) {
          console.warn(`⚠️  Could not find billionaire ID for ${slug}`);
          continue;
        }

        // Calculate daily change (round to integers for bigint columns)
        const currentWorth = Math.round(person.networth || 0);
        const previousWorth = previousDayWorth.get(slug) || 0;
        const dailyChange = Math.round(person.change?.value || (previousWorth > 0 ? currentWorth - previousWorth : 0));

        // Insert snapshot for this date
        await query(
          `INSERT INTO daily_snapshots
           (billionaire_id, snapshot_date, net_worth, rank, daily_change, data_source_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (billionaire_id, snapshot_date)
           DO UPDATE SET net_worth = EXCLUDED.net_worth, rank = EXCLUDED.rank, daily_change = EXCLUDED.daily_change`,
          [
            billionaireId,
            date,
            currentWorth,
            person.rank || null,
            dailyChange,
            dataSourceId,
          ]
        );

        progress.snapshots++;
      } catch (error) {
        console.error(`Failed to seed billionaire ${person.name} for ${date}:`, error);
      }
    }

    console.log(`  ✓ Processed ${date}: ${billionairesData.length} billionaires`);
  }

  console.log(`\n✅ Seeded ${progress.billionaires} unique billionaires with ${progress.snapshots} total snapshots`);
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
      source: 'charity: water (2025)',
      source_url: 'https://www.charitywater.org/stories/micro-price-points',
      region: 'Sub-Saharan Africa',
      category: 'water',
      display_order: 1,
    },
    {
      name: 'waterFilterSystem',
      display_name: 'Household Water Filter System',
      cost: 50,
      unit: 'filter',
      description: 'Ceramic water filter providing clean drinking water for one household (5-7 people) for 3-5 years.',
      source: 'Water.org (2025)',
      source_url: 'https://water.org/solutions/',
      region: 'Global',
      category: 'water',
      display_order: 2,
    },
    // Education category
    {
      name: 'primarySchool',
      display_name: 'Primary School Building',
      cost: 75000,
      unit: 'school',
      description: 'Complete 3-classroom primary school building in rural developing areas, including desks, blackboards, and basic supplies for 150 students. Cost varies by location ($50K-$100K).',
      source: 'buildOn (2025)',
      source_url: 'https://www.buildon.org/what-we-do/schools/',
      region: 'Global',
      category: 'education',
      display_order: 3,
    },
    {
      name: 'yearOfSchool',
      display_name: 'Year of Primary Education',
      cost: 120,
      unit: 'student-year',
      description: 'One full year of primary education for one child, including tuition, books, uniform, and supplies.',
      source: 'UNESCO (2024)',
      source_url: 'https://www.unesco.org/en/education/financing',
      region: 'Sub-Saharan Africa',
      category: 'education',
      display_order: 4,
    },
    // Food category
    {
      name: 'schoolMealsYear',
      display_name: 'Year of School Meals',
      cost: 180,
      unit: 'child-year',
      description: 'One full year of daily nutritious school meals for one child in low-income countries (approximately 180 meals).',
      source: 'World Food Programme (2025)',
      source_url: 'https://www.wfp.org/publications/state-school-feeding-worldwide',
      region: 'Global',
      category: 'food',
      display_order: 5,
    },
    {
      name: 'foodPackageFamily',
      display_name: 'Monthly Food Package',
      cost: 75,
      unit: 'family-month',
      description: 'One month of nutritious food for a family of 5, including grains, proteins, oils, and essential nutrients.',
      source: 'World Food Programme / FAO (2024)',
      source_url: 'https://www.fao.org/publications/sofi/2024/en',
      region: 'Global',
      category: 'food',
      display_order: 6,
    },
    // US-specific costs
    {
      name: 'us-student-year',
      display_name: 'Year of Public Education (US)',
      cost: 15633,
      unit: 'student-year',
      description: 'One year of public K-12 education per student in the United States, including teacher salaries, facilities, and materials. FY 2023 national average.',
      source: 'U.S. Census Bureau (2025)',
      source_url: 'https://www.census.gov/newsroom/press-releases/2025/2023-annual-survey-of-school-system-finances.html',
      region: 'United States',
      category: 'education',
      display_order: 7,
    },
    {
      name: 'us-school-meals',
      display_name: 'Year of School Meals (US)',
      cost: 650,
      unit: 'child-year',
      description: 'One year of school breakfast and lunch for one child in the United States.',
      source: 'USDA / Feeding America (2024)',
      source_url: 'https://www.feedingamerica.org/hunger-in-america/child-hunger-facts',
      region: 'United States',
      category: 'food',
      display_order: 8,
    },
    {
      name: 'us-family-food-month',
      display_name: 'Monthly Food Package (US)',
      cost: 1000,
      unit: 'family-month',
      description: 'One month of food for a family of 4 using USDA moderate-cost food plan.',
      source: 'USDA Food Plans (2024)',
      source_url: 'https://www.fns.usda.gov/research/cnpp/usda-food-plans',
      region: 'United States',
      category: 'food',
      display_order: 9,
    },
    {
      name: 'us-family-home',
      display_name: 'Family Home (US)',
      cost: 427000,
      unit: 'home',
      description: 'Median price for a single-family existing home in the United States (Q3 2025).',
      source: 'National Association of Realtors (2025)',
      source_url: 'https://www.nar.realtor/research-and-statistics/housing-statistics',
      region: 'United States',
      category: 'housing',
      display_order: 10,
    },
    {
      name: 'us-college-year',
      display_name: 'Year of College (US)',
      cost: 28000,
      unit: 'student-year',
      description: 'Average annual cost for tuition, fees, room and board at a 4-year public university.',
      source: 'College Board (2024)',
      source_url: 'https://research.collegeboard.org/trends/college-pricing',
      region: 'United States',
      category: 'education',
      display_order: 11,
    },
    {
      name: 'us-healthcare-year',
      display_name: 'Year of Health Insurance (US)',
      cost: 9325,
      unit: 'person-year',
      description: 'Average annual premium for employer-sponsored individual health insurance coverage in the United States.',
      source: 'KFF (2025)',
      source_url: 'https://www.kff.org/health-costs/2025-employer-health-benefits-survey/',
      region: 'United States',
      category: 'healthcare',
      display_order: 12,
    },
    // Healthcare category
    {
      name: 'malariaNets',
      display_name: 'Insecticide-Treated Bed Net',
      cost: 5,
      unit: 'net',
      description: 'Long-lasting insecticide-treated mosquito net protecting 2 people from malaria for 3-5 years.',
      source: 'Against Malaria Foundation (2025)',
      source_url: 'https://www.againstmalaria.com/DollarsPerNet.aspx',
      region: 'Sub-Saharan Africa',
      category: 'healthcare',
      display_order: 7,
    },
    {
      name: 'cataractSurgery',
      display_name: 'Cataract Surgery',
      cost: 50,
      unit: 'surgery',
      description: 'Complete cataract surgery restoring sight for one person, including pre/post-op care.',
      source: 'Seva Foundation (2025)',
      source_url: 'https://www.thelifeyoucansave.org/best-charities/seva/',
      region: 'South Asia',
      category: 'healthcare',
      display_order: 8,
    },
    {
      name: 'vaccineChild',
      display_name: 'Full Childhood Immunization',
      cost: 30,
      unit: 'child',
      description: 'Complete set of life-saving vaccines for one child (measles, polio, DTP, etc.).',
      source: 'UNICEF (2025)',
      source_url: 'https://www.unicef.org/supply/vaccines-pricing-data',
      region: 'Global',
      category: 'healthcare',
      display_order: 9,
    },
    // Housing category
    {
      name: 'basicHouse',
      display_name: 'Basic Family Home',
      cost: 5000,
      unit: 'home',
      description: 'Simple but sturdy 2-room family home with roof, walls, floor, door, and windows in rural area.',
      source: 'Habitat for Humanity (2025)',
      source_url: 'https://www.habitat.org/our-work/home-construction',
      region: 'Southeast Asia',
      category: 'housing',
      display_order: 10,
    },
    // Energy category
    {
      name: 'solarPanel',
      display_name: 'Home Solar Panel System',
      cost: 300,
      unit: 'system',
      description: 'Basic solar panel system providing electricity for lights, phone charging, and small appliances for one household.',
      source: 'SolarAid (2025)',
      source_url: 'https://solar-aid.org/bright-solutions/our-programmes/',
      region: 'East Africa',
      category: 'energy',
      display_order: 11,
    },
    // Emergency Relief category
    {
      name: 'emergencyKit',
      display_name: 'Emergency Relief Kit',
      cost: 50,
      unit: 'kit',
      description: 'Essential emergency supplies for one family after disaster: water purification, blankets, cooking supplies, hygiene items.',
      source: 'Red Cross (2025)',
      source_url: 'https://www.redcross.org/about-us/our-work/international-services.html',
      region: 'Global',
      category: 'emergency',
      display_order: 12,
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
           description = EXCLUDED.description,
           source = EXCLUDED.source,
           source_url = EXCLUDED.source_url,
           last_verified = EXCLUDED.last_verified,
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
        new Date(),
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
- buildOn (schools)
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
    const netWorthMillions = Number(billionaire.net_worth); // Convert bigint string to number
    const usableWealthMillions = Math.max(0, netWorthMillions - thresholdMillions);
    const usableWealthUSD = usableWealthMillions * 1_000_000;

    for (const cost of costs.rows) {
      const quantity = Math.floor(usableWealthUSD / Number(cost.cost));

      if (quantity > 0) {
        await query(
          `INSERT INTO calculated_comparisons
           (billionaire_id, comparison_cost_id, calculation_date, net_worth_used, quantity)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (billionaire_id, comparison_cost_id, calculation_date)
           DO UPDATE SET
             net_worth_used = EXCLUDED.net_worth_used,
             quantity = EXCLUDED.quantity`,
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
  console.log('🌱 Starting initial data seed with historical + live data...\n');
  const startTime = Date.now();

  try {
    await seedDataSources();

    // Fetch 30 days of recent historical data from komed3/rtb-api (Oct 2-31)
    const historicalData = await fetchKomed3HistoricalData(30);

    // Seed billionaires with all historical snapshots
    await seedHistoricalBillionaires(historicalData);

    // Fetch today's live data from Forbes Real-Time API (Nov 9)
    const forbesData = await fetchForbesRealTimeData();

    // Seed current Forbes data as today's snapshot
    if (forbesData.length > 0) {
      await seedForbesCurrentData(forbesData);
    } else {
      console.warn('⚠️  No Forbes data available, skipping current data seed');
    }

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
