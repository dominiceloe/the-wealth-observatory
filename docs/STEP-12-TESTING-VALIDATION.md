# Step 12: Testing & Validation

## Objective
Comprehensive testing of all features, data integrity validation, and performance verification.

## Testing Checklist

### 1. Database Testing

#### Data Integrity Tests

Create `scripts/test-data-integrity.ts`:

```typescript
import { query, closePool } from '../lib/db';

async function testDataIntegrity() {
  console.log('🔍 Testing data integrity...\n');

  try {
    // Test 1: Verify all billionaires have snapshots
    const orphanedBillionaires = await query(`
      SELECT b.id, b.person_name
      FROM billionaires b
      LEFT JOIN daily_snapshots ds ON b.id = ds.billionaire_id
      WHERE ds.id IS NULL
    `);

    if (orphanedBillionaires.rows.length > 0) {
      console.log('⚠️  Billionaires without snapshots:', orphanedBillionaires.rows);
    } else {
      console.log('✅ All billionaires have snapshots');
    }

    // Test 2: Verify all snapshots have valid billionaire references
    const orphanedSnapshots = await query(`
      SELECT ds.id, ds.billionaire_id
      FROM daily_snapshots ds
      LEFT JOIN billionaires b ON ds.billionaire_id = b.id
      WHERE b.id IS NULL
    `);

    if (orphanedSnapshots.rows.length > 0) {
      console.log('⚠️  Snapshots with invalid billionaire_id:', orphanedSnapshots.rows.length);
    } else {
      console.log('✅ All snapshots have valid billionaire references');
    }

    // Test 3: Check for duplicate snapshots (same billionaire, same date)
    const duplicateSnapshots = await query(`
      SELECT billionaire_id, snapshot_date, COUNT(*)
      FROM daily_snapshots
      GROUP BY billionaire_id, snapshot_date
      HAVING COUNT(*) > 1
    `);

    if (duplicateSnapshots.rows.length > 0) {
      console.log('⚠️  Duplicate snapshots found:', duplicateSnapshots.rows);
    } else {
      console.log('✅ No duplicate snapshots');
    }

    // Test 4: Verify calculated comparisons exist for latest snapshots
    const missingComparisons = await query(`
      SELECT b.person_name, ds.snapshot_date
      FROM billionaires b
      JOIN daily_snapshots ds ON b.id = ds.billionaire_id
      WHERE ds.snapshot_date = (
        SELECT MAX(snapshot_date) FROM daily_snapshots WHERE billionaire_id = b.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM calculated_comparisons cc
        WHERE cc.billionaire_id = b.id
        AND cc.calculation_date = ds.snapshot_date
      )
      LIMIT 10
    `);

    if (missingComparisons.rows.length > 0) {
      console.log('⚠️  Billionaires missing comparisons:', missingComparisons.rows);
    } else {
      console.log('✅ All billionaires have calculated comparisons');
    }

    // Test 5: Check for negative net worth
    const negativeNetWorth = await query(`
      SELECT b.person_name, ds.net_worth, ds.snapshot_date
      FROM billionaires b
      JOIN daily_snapshots ds ON b.id = ds.billionaire_id
      WHERE ds.net_worth < 0
    `);

    if (negativeNetWorth.rows.length > 0) {
      console.log('⚠️  Negative net worth found:', negativeNetWorth.rows);
    } else {
      console.log('✅ All net worth values are positive');
    }

    // Test 6: Verify comparison cost sources
    const missingCostSources = await query(`
      SELECT name, display_name
      FROM comparison_costs
      WHERE source IS NULL OR source = '' OR source_url IS NULL OR source_url = ''
    `);

    if (missingCostSources.rows.length > 0) {
      console.log('⚠️  Comparison costs missing sources:', missingCostSources.rows);
    } else {
      console.log('✅ All comparison costs have valid sources');
    }

    console.log('\n✅ Data integrity tests completed');

  } catch (error) {
    console.error('❌ Data integrity test failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

testDataIntegrity();
```

Run test:
```bash
npm run test:integrity
```

Add to `package.json`:
```json
{
  "scripts": {
    "test:integrity": "tsx scripts/test-data-integrity.ts"
  }
}
```

### 2. API Endpoint Testing

Create `scripts/test-api-endpoints.ts`:

```typescript
async function testAPIEndpoints() {
  console.log('🔍 Testing API endpoints...\n');

  const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3003';

  // Test health endpoint
  console.log('Testing /api/health...');
  const healthResponse = await fetch(`${baseUrl}/api/health`);
  const healthData = await healthResponse.json();
  console.log(healthResponse.ok ? '✅ Health check passed' : '❌ Health check failed');
  console.log('Response:', healthData);

  // Test cron endpoint (without auth - should fail)
  console.log('\nTesting /api/cron/update-billionaires (no auth)...');
  const cronNoAuth = await fetch(`${baseUrl}/api/cron/update-billionaires`);
  console.log(cronNoAuth.status === 401 ? '✅ Correctly requires auth' : '❌ Auth check failed');

  // Test cron endpoint (with auth)
  if (process.env.CRON_SECRET) {
    console.log('\nTesting /api/cron/update-billionaires (with auth)...');
    const cronWithAuth = await fetch(`${baseUrl}/api/cron/update-billionaires`, {
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
    });
    const cronData = await cronWithAuth.json();
    console.log(cronWithAuth.ok ? '✅ Cron endpoint works' : '❌ Cron endpoint failed');
    console.log('Response:', cronData);
  }

  console.log('\n✅ API endpoint tests completed');
}

testAPIEndpoints();
```

### 3. Frontend E2E Testing

Create `scripts/test-frontend.ts`:

```typescript
async function testFrontend() {
  console.log('🔍 Testing frontend pages...\n');

  const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3003';

  // Test homepage
  console.log('Testing homepage...');
  const homepageResponse = await fetch(baseUrl);
  console.log(homepageResponse.ok ? '✅ Homepage loads' : '❌ Homepage failed');

  // Test about page
  console.log('Testing /about...');
  const aboutResponse = await fetch(`${baseUrl}/about`);
  console.log(aboutResponse.ok ? '✅ About page loads' : '❌ About page failed');

  // Test individual billionaire page
  console.log('Testing /elon-musk...');
  const billionaireResponse = await fetch(`${baseUrl}/elon-musk`);
  console.log(billionaireResponse.ok ? '✅ Billionaire page loads' : '❌ Billionaire page failed');

  // Test 404
  console.log('Testing /non-existent-page...');
  const notFoundResponse = await fetch(`${baseUrl}/non-existent-page`);
  console.log(notFoundResponse.status === 404 ? '✅ 404 page works' : '❌ 404 handling failed');

  console.log('\n✅ Frontend tests completed');
}

testFrontend();
```

### 4. Performance Testing

#### Lighthouse Audit

```bash
# Install Lighthouse CI
npm install --save-dev @lhci/cli

# Run audit
npx lhci autorun --url=https://your-domain.com
```

Create `.lighthouserc.js`:

```javascript
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3003',
        'http://localhost:3003/about',
        'http://localhost:3003/elon-musk',
      ],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
      },
    },
  },
};
```

#### Database Query Performance

Create `scripts/test-query-performance.ts`:

```typescript
import { query, closePool } from '../lib/db';

async function testQueryPerformance() {
  console.log('🔍 Testing query performance...\n');

  const queries = [
    {
      name: 'Get top 50 billionaires',
      query: `
        SELECT b.*, ds.net_worth, ds.rank, ds.daily_change
        FROM billionaires b
        JOIN daily_snapshots ds ON b.id = ds.billionaire_id
        WHERE ds.snapshot_date = (SELECT MAX(snapshot_date) FROM daily_snapshots WHERE billionaire_id = b.id)
        ORDER BY ds.rank ASC
        LIMIT 50
      `,
    },
    {
      name: 'Get billionaire history (30 days)',
      query: `
        SELECT snapshot_date, net_worth
        FROM daily_snapshots
        WHERE billionaire_id = 1
        AND snapshot_date >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY snapshot_date ASC
      `,
    },
    {
      name: 'Get calculated comparisons',
      query: `
        SELECT cc.*, cost.*
        FROM calculated_comparisons cc
        JOIN comparison_costs cost ON cc.comparison_cost_id = cost.id
        WHERE cc.billionaire_id = 1
        AND cc.calculation_date = (SELECT MAX(calculation_date) FROM calculated_comparisons WHERE billionaire_id = 1)
      `,
    },
  ];

  for (const testQuery of queries) {
    const start = Date.now();
    await query(testQuery.query);
    const duration = Date.now() - start;

    const status = duration < 100 ? '✅' : duration < 500 ? '⚠️' : '❌';
    console.log(`${status} ${testQuery.name}: ${duration}ms`);
  }

  await closePool();
  console.log('\n✅ Query performance tests completed');
}

testQueryPerformance();
```

### 5. Manual Testing Checklist

#### Homepage
- [ ] Page loads without errors
- [ ] Aggregate stats display correctly
- [ ] All 50 billionaire cards render
- [ ] Images load (or placeholders show)
- [ ] Net worth formatted correctly ($XXX.XB)
- [ ] Ranks display (#1, #2, etc.)
- [ ] Daily changes show with colors (green/red)
- [ ] Sample comparisons display
- [ ] Cards are clickable
- [ ] Methodology note visible
- [ ] Footer shows data sources
- [ ] Responsive on mobile
- [ ] No console errors

#### Individual Billionaire Page
- [ ] Page loads for valid slug
- [ ] 404 for invalid slug
- [ ] Profile photo displays
- [ ] Name and rank correct
- [ ] Country and industries show
- [ ] Bio displays (if available)
- [ ] Forbes link works
- [ ] Net worth card displays correctly
- [ ] Daily change shows with color
- [ ] 30-day chart renders
- [ ] Chart has correct data
- [ ] Comparison table shows all categories
- [ ] All comparisons have sources
- [ ] Source links work (open new tab)
- [ ] Luxury purchases show (if any)
- [ ] Responsive on mobile
- [ ] No console errors

#### About Page
- [ ] Page loads
- [ ] All disclaimers display
- [ ] Markdown formatting works
- [ ] Headers formatted correctly
- [ ] Bold text works
- [ ] Links work (new tab)
- [ ] Sections well-spaced
- [ ] Responsive on mobile
- [ ] No console errors

#### Cron Job
- [ ] Manual trigger works
- [ ] Returns JSON response
- [ ] Updates database
- [ ] Recalculates comparisons
- [ ] Logs to update_metadata
- [ ] Handles API failures gracefully
- [ ] Completes within timeout
- [ ] Scheduled run works

### 6. Accessibility Testing

```bash
# Install axe-core for automated a11y testing
npm install --save-dev @axe-core/cli

# Run accessibility audit
npx axe http://localhost:3003
npx axe http://localhost:3003/about
```

Manual checks:
- [ ] All images have alt text
- [ ] Heading hierarchy correct (h1 → h2 → h3)
- [ ] Color contrast meets WCAG AA
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] Links have descriptive text
- [ ] Forms have labels (if any)
- [ ] ARIA attributes used correctly

### 7. Security Testing

#### Check Environment Variables
- [ ] No secrets in code
- [ ] `.env.local` not committed
- [ ] `.env.example` has placeholders only
- [ ] Vercel env vars set correctly

#### Check Headers
```bash
curl -I https://your-domain.com
```

Verify headers:
- [ ] `X-Frame-Options: SAMEORIGIN`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `Referrer-Policy` set
- [ ] HTTPS enforced

#### SQL Injection Protection
- [ ] All queries use parameterized queries
- [ ] No string concatenation in SQL
- [ ] Input validation where needed

### 8. Cross-Browser Testing

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

### 9. Load Testing

Use Apache Bench or similar:

```bash
# Test homepage load
ab -n 100 -c 10 https://your-domain.com/

# Test API endpoint
ab -n 50 -c 5 -H "Authorization: Bearer YOUR_SECRET" \
  https://your-domain.com/api/cron/update-billionaires
```

Verify:
- [ ] No 500 errors
- [ ] Response times acceptable
- [ ] Database handles concurrent requests

## Automated Testing Setup

Create `package.json` test scripts:

```json
{
  "scripts": {
    "test": "npm run test:types && npm run test:integrity",
    "test:types": "tsc --noEmit",
    "test:integrity": "tsx scripts/test-data-integrity.ts",
    "test:api": "tsx scripts/test-api-endpoints.ts",
    "test:frontend": "tsx scripts/test-frontend.ts",
    "test:performance": "tsx scripts/test-query-performance.ts",
    "test:all": "npm run test && npm run test:api && npm run test:frontend && npm run test:performance"
  }
}
```

## Continuous Integration (Optional)

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run type check
        run: npm run test:types

      - name: Run build
        run: npm run build

      - name: Run tests
        run: npm run test:all
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          CRON_SECRET: ${{ secrets.CRON_SECRET }}
```

## Verification Checklist

- [ ] All database integrity tests pass
- [ ] API endpoints work correctly
- [ ] Frontend pages load without errors
- [ ] Performance meets targets (>90 Lighthouse)
- [ ] Query performance acceptable (<500ms)
- [ ] Accessibility audit passes
- [ ] Security headers configured
- [ ] Cross-browser compatible
- [ ] Mobile responsive
- [ ] Load testing successful
- [ ] No console errors
- [ ] No TypeScript errors

## Post-Launch Monitoring

Set up monitoring for:
- [ ] Uptime (UptimeRobot, Pingdom)
- [ ] Error tracking (Sentry)
- [ ] Performance (Vercel Analytics)
- [ ] Database health (CloudWatch)
- [ ] Cron job success rate
- [ ] API response times

## Next Step
Project complete! See `MAINTENANCE.md` (to be created) for ongoing maintenance tasks and update procedures.
