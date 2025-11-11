# Step 09: Individual Billionaire Page

## Objective
Create dynamic billionaire detail pages with 30-day wealth charts, full comparisons, and luxury purchases.

## Tasks

### 1. Create Dynamic Route

Create `app/[slug]/page.tsx`:

```typescript
import { notFound } from 'next/navigation';
import { Container, Box, Typography, Grid, Avatar, Chip, Link as MuiLink } from '@mui/material';
import { OpenInNew, Public, Business } from '@mui/icons-material';
import {
  getBillionaireBySlug,
  getBillionaireHistory,
  getLatestSnapshot,
} from '@/lib/queries/billionaires';
import { getCalculatedComparisons } from '@/lib/queries/comparisons';
import { getLuxuryPurchases, getLuxuryComparisons } from '@/lib/queries/luxury';
import WealthChart from '@/components/WealthChart';
import ComparisonTable from '@/components/ComparisonTable';
import LuxuryPurchaseCard from '@/components/LuxuryPurchaseCard';

export const revalidate = 3600; // Revalidate every hour

interface PageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: PageProps) {
  const billionaire = await getBillionaireBySlug(params.slug);

  if (!billionaire) {
    return {
      title: 'Billionaire Not Found',
    };
  }

  return {
    title: `${billionaire.person_name} - The Wealth Observatory`,
    description: `Track ${billionaire.person_name}'s wealth over time and see what their fortune could fund instead.`,
  };
}

export default async function BillionairePage({ params }: PageProps) {
  // Fetch billionaire data
  const billionaire = await getBillionaireBySlug(params.slug);

  if (!billionaire) {
    notFound();
  }

  // Fetch all related data in parallel
  const [latestSnapshot, history, comparisons, luxuryPurchases] = await Promise.all([
    getLatestSnapshot(billionaire.id),
    getBillionaireHistory(billionaire.id, 30),
    getCalculatedComparisons(billionaire.id),
    getLuxuryPurchases(billionaire.id),
  ]);

  if (!latestSnapshot) {
    notFound();
  }

  // Fetch luxury comparisons for each purchase
  const luxuryPurchasesWithComparisons = await Promise.all(
    luxuryPurchases.map(async (purchase) => {
      const comparisons = await getLuxuryComparisons(purchase.id);
      return { ...purchase, comparisons };
    })
  );

  // Format comparisons for table
  const formattedComparisons = comparisons.map((c) => ({
    displayName: c.cost_display_name,
    quantity: Number(c.quantity),
    unit: c.cost_unit,
    description: c.cost_description,
    source: c.cost_source,
    sourceUrl: c.cost_source_url,
    category: c.cost_category,
  }));

  const netWorthFormatted = formatNetWorth(latestSnapshot.net_worth);
  const dailyChangeFormatted = formatChange(latestSnapshot.daily_change);
  const isPositiveChange = (latestSnapshot.daily_change || 0) >= 0;

  return (
    <Container maxWidth="lg">
      {/* Profile Header */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={4} alignItems="center">
          {/* Photo */}
          <Grid item>
            <Avatar
              src={billionaire.image_url || undefined}
              alt={billionaire.person_name}
              sx={{ width: 160, height: 160 }}
            />
          </Grid>

          {/* Info */}
          <Grid item xs>
            <Typography variant="h3" gutterBottom>
              {billionaire.person_name}
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              {latestSnapshot.rank && (
                <Chip label={`Rank #${latestSnapshot.rank}`} color="primary" />
              )}
              {billionaire.country_of_citizenship && (
                <Chip
                  icon={<Public />}
                  label={billionaire.country_of_citizenship}
                  variant="outlined"
                />
              )}
            </Box>

            {/* Industries */}
            {billionaire.industries && billionaire.industries.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                {billionaire.industries.map((industry) => (
                  <Chip
                    key={industry}
                    icon={<Business />}
                    label={industry}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            )}

            {/* Bio */}
            {billionaire.bio && (
              <Typography variant="body2" color="text.secondary" paragraph>
                {billionaire.bio}
              </Typography>
            )}

            {/* Forbes Link */}
            {billionaire.forbes_uri && (
              <MuiLink
                href={`https://www.forbes.com${billionaire.forbes_uri}`}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                View Forbes Profile
                <OpenInNew fontSize="small" />
              </MuiLink>
            )}
          </Grid>

          {/* Net Worth Card */}
          <Grid item>
            <Box
              sx={{
                p: 3,
                backgroundColor: 'background.paper',
                borderRadius: 2,
                textAlign: 'center',
                minWidth: 200,
              }}
            >
              <Typography variant="overline" color="text.secondary">
                Current Net Worth
              </Typography>
              <Typography variant="h3" color="primary" gutterBottom>
                {netWorthFormatted}
              </Typography>
              <Typography
                variant="body1"
                color={isPositiveChange ? 'success.main' : 'error.main'}
              >
                {dailyChangeFormatted}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Last 24 hours
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Wealth Chart */}
      <Box sx={{ mb: 6 }}>
        <WealthChart data={history} title="Wealth Over Last 30 Days" />
      </Box>

      {/* What Wealth Could Fund */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" gutterBottom>
          What Wealth Above $10M Could Fund
        </Typography>

        <Typography variant="body2" color="text.secondary" paragraph>
          After setting aside $10 million for comfortable living (far more than needed),
          the remaining {formatNetWorth(Math.max(0, latestSnapshot.net_worth - 10))} could fund:
        </Typography>

        {formattedComparisons.length > 0 ? (
          <ComparisonTable comparisons={formattedComparisons} groupedByCategory={true} />
        ) : (
          <Typography variant="body2" color="text.secondary">
            No comparison data available.
          </Typography>
        )}
      </Box>

      {/* Luxury Purchases */}
      {luxuryPurchasesWithComparisons.length > 0 && (
        <Box sx={{ mb: 6 }}>
          <Typography variant="h4" gutterBottom>
            Notable Luxury Purchases
          </Typography>

          <Typography variant="body2" color="text.secondary" paragraph>
            Verified luxury spending and what it could have funded instead:
          </Typography>

          <Grid container spacing={3}>
            {luxuryPurchasesWithComparisons.map((purchase) => (
              <Grid item xs={12} md={6} key={purchase.id}>
                <LuxuryPurchaseCard
                  itemName={purchase.item_name}
                  cost={Number(purchase.cost)}
                  category={purchase.category}
                  description={purchase.description || undefined}
                  imageUrl={purchase.image_url || undefined}
                  comparisons={purchase.comparisons.map((c) => ({
                    quantity: Number(c.quantity),
                    unit: c.unit,
                    displayName: c.display_name,
                  }))}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Data Sources */}
      <Box
        sx={{
          p: 3,
          backgroundColor: 'background.paper',
          borderRadius: 2,
          borderLeft: '4px solid',
          borderColor: 'primary.main',
        }}
      >
        <Typography variant="h6" gutterBottom>
          Data Sources
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Net worth data from{' '}
          <MuiLink
            href="https://www.forbes.com/real-time-billionaires/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Forbes Real-Time Billionaires
          </MuiLink>
          . Comparison costs from verified charitable organizations (see individual sources in table above).
          Last updated: {new Date(latestSnapshot.snapshot_date).toLocaleDateString()}.
        </Typography>
      </Box>
    </Container>
  );
}

// Utility functions
function formatNetWorth(millions: number): string {
  if (millions >= 1000) {
    return `$${(millions / 1000).toFixed(1)}B`;
  }
  return `$${millions.toFixed(1)}M`;
}

function formatChange(millions: number | null): string {
  if (millions === null) return 'No change';

  const sign = millions >= 0 ? '+' : '';
  const formatted = formatNetWorth(Math.abs(millions));

  return `${sign}${formatted}`;
}
```

### 2. Create Loading State

Create `app/[slug]/loading.tsx`:

```typescript
import { Container, Box, Skeleton, Grid } from '@mui/material';

export default function Loading() {
  return (
    <Container maxWidth="lg">
      {/* Header skeleton */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={4} alignItems="center">
          <Grid item>
            <Skeleton variant="circular" width={160} height={160} />
          </Grid>
          <Grid item xs>
            <Skeleton variant="text" width={300} height={60} />
            <Skeleton variant="text" width={200} height={40} />
            <Skeleton variant="text" width="80%" />
          </Grid>
          <Grid item>
            <Skeleton variant="rectangular" width={200} height={150} />
          </Grid>
        </Grid>
      </Box>

      {/* Chart skeleton */}
      <Box sx={{ mb: 6 }}>
        <Skeleton variant="text" width={250} height={40} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={400} />
      </Box>

      {/* Table skeleton */}
      <Box sx={{ mb: 6 }}>
        <Skeleton variant="text" width={350} height={40} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={600} />
      </Box>
    </Container>
  );
}
```

### 3. Generate Static Paths (Optional, for better performance)

Add static generation for top billionaires:

```typescript
// Add to app/[slug]/page.tsx

export async function generateStaticParams() {
  const billionaires = await getCurrentTopBillionaires(50);

  return billionaires.map((b) => ({
    slug: b.slug,
  }));
}
```

### 4. Create Breadcrumb Navigation (Enhancement)

Create `components/Breadcrumbs.tsx`:

```typescript
import Link from 'next/link';
import { Breadcrumbs as MuiBreadcrumbs, Typography } from '@mui/material';
import { NavigateNext, Home } from '@mui/icons-material';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <MuiBreadcrumbs
      separator={<NavigateNext fontSize="small" />}
      sx={{ mb: 3 }}
    >
      <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
        <Home sx={{ mr: 0.5 }} fontSize="small" />
        Home
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        if (isLast || !item.href) {
          return (
            <Typography key={index} color="text.primary">
              {item.label}
            </Typography>
          );
        }

        return (
          <Link key={index} href={item.href} style={{ textDecoration: 'none', color: 'inherit' }}>
            {item.label}
          </Link>
        );
      })}
    </MuiBreadcrumbs>
  );
}
```

Add breadcrumbs to page:

```typescript
// Add to top of BillionairePage component
<Breadcrumbs
  items={[
    { label: billionaire.person_name },
  ]}
/>
```

### 5. Add Share Functionality (Enhancement)

Create `components/ShareButton.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { IconButton, Snackbar } from '@mui/material';
import { Share } from '@mui/icons-material';

interface ShareButtonProps {
  title: string;
  url: string;
}

export default function ShareButton({ title, url }: ShareButtonProps) {
  const [showCopied, setShowCopied] = useState(false);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch (error) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url);
      setShowCopied(true);
    }
  };

  return (
    <>
      <IconButton onClick={handleShare} color="primary">
        <Share />
      </IconButton>

      <Snackbar
        open={showCopied}
        autoHideDuration={2000}
        onClose={() => setShowCopied(false)}
        message="Link copied to clipboard"
      />
    </>
  );
}
```

## Testing

### 1. Test Individual Pages

Visit several billionaire pages:
```
http://localhost:3003/elon-musk
http://localhost:3003/jeff-bezos
http://localhost:3003/bernard-arnault
```

### 2. Verify Data Display

Check that page shows:
- [ ] Profile photo (or placeholder)
- [ ] Name and rank
- [ ] Country and industries
- [ ] Bio (if available)
- [ ] Forbes profile link
- [ ] Current net worth
- [ ] Daily change with color
- [ ] 30-day wealth chart
- [ ] Full comparison table (grouped by category)
- [ ] All categories displayed
- [ ] Source links work
- [ ] Luxury purchases (if any exist)
- [ ] Data sources note

### 3. Test Edge Cases

- Non-existent slug: `http://localhost:3003/fake-person` → Should show 404
- Billionaire with no history → Chart should handle gracefully
- Billionaire with no comparisons → Should show message

### 4. Test Responsiveness

Check layout on:
- Desktop (1920px)
- Tablet (768px)
- Mobile (375px)

### 5. Performance Check

Run Lighthouse audit:
```bash
npm run build
npm start
# Open Chrome DevTools → Lighthouse → Run audit
```

Target scores:
- Performance: >90
- Accessibility: >95
- Best Practices: >95
- SEO: >95

## Verification Checklist

- [ ] Dynamic routing works
- [ ] All data fetches correctly
- [ ] Chart renders with 30 days of data
- [ ] Comparison table shows all categories
- [ ] Source links open in new tab
- [ ] Forbes profile link works
- [ ] Loading state shows
- [ ] 404 page for invalid slugs
- [ ] Breadcrumbs work
- [ ] Responsive on all screen sizes
- [ ] No console errors
- [ ] Images load or show placeholder
- [ ] Typography hierarchy clear
- [ ] Color coding works (positive/negative changes)

## Next Step
Proceed to `STEP-10-ABOUT-PAGE.md` to create the About page with disclaimers and methodology.
