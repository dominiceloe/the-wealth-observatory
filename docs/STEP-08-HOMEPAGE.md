# Step 08: Homepage

## Objective
Build the homepage with aggregate stats, top comparisons, and billionaire grid.

## Tasks

### 1. Create Root Layout

Create or update `app/layout.tsx`:

```typescript
import type { Metadata } from 'next';
import { Container, Box } from '@mui/material';
import ThemeRegistry from '@/components/ThemeRegistry';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'The Wealth Observatory - Tracking Billionaire Wealth',
  description: 'Track real-time billionaire wealth and see what their money could fund instead through realistic cost comparisons.',
  keywords: 'billionaire, wealth, inequality, forbes, philanthropy, social good',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <ThemeRegistry>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              minHeight: '100vh',
            }}
          >
            <Header />
            <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
              {children}
            </Box>
            <Footer />
          </Box>
        </ThemeRegistry>
      </body>
    </html>
  );
}
```

### 2. Create Homepage

Create or update `app/page.tsx`:

```typescript
import { Container, Grid, Box, Typography, FormControl, Select, MenuItem } from '@mui/material';
import { getCurrentTopBillionaires } from '@/lib/queries/billionaires';
import { getAggregateStats } from '@/lib/queries/stats';
import { getActiveComparisonCosts } from '@/lib/queries/comparisons';
import BillionaireCard from '@/components/BillionaireCard';
import AggregateStats from '@/components/AggregateStats';

export const revalidate = 3600; // Revalidate every hour

export default async function HomePage() {
  // Fetch all data in parallel
  const [billionaires, aggregateStats, comparisonCosts] = await Promise.all([
    getCurrentTopBillionaires(50),
    getAggregateStats(),
    getActiveComparisonCosts(),
  ]);

  // Add sample comparisons to billionaire cards
  const billionairesWithComparisons = billionaires.map((b, index) => {
    // Pick a rotating comparison for each card
    const comparisonIndex = index % comparisonCosts.length;
    const comparison = comparisonCosts[comparisonIndex];

    // Calculate quantity for this billionaire
    const wealthThresholdMillions = 10; // $10M
    const usableWealthMillions = Math.max(0, b.netWorth - wealthThresholdMillions);
    const usableWealthUSD = usableWealthMillions * 1_000_000;
    const quantity = Math.floor(usableWealthUSD / Number(comparison.cost));

    return {
      ...b,
      sampleComparison: {
        quantity,
        unit: comparison.unit,
        displayName: comparison.display_name,
      },
    };
  });

  return (
    <Container maxWidth="lg">
      {/* Aggregate Stats Section */}
      <AggregateStats data={aggregateStats} />

      {/* Billionaire Grid Section */}
      <Box sx={{ mb: 4 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
          }}
        >
          <Typography variant="h4">
            Top {billionaires.length} Billionaires
          </Typography>

          {/* Sort controls (future enhancement) */}
          {/* <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select defaultValue="rank">
              <MenuItem value="rank">By Rank</MenuItem>
              <MenuItem value="change">By Daily Change</MenuItem>
              <MenuItem value="name">By Name</MenuItem>
            </Select>
          </FormControl> */}
        </Box>

        <Grid container spacing={3}>
          {billionairesWithComparisons.map((billionaire) => (
            <Grid item xs={12} sm={6} md={4} key={billionaire.id}>
              <BillionaireCard data={billionaire} />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Methodology Note */}
      <Box
        sx={{
          p: 3,
          backgroundColor: 'background.paper',
          borderRadius: 2,
          borderLeft: '4px solid',
          borderColor: 'primary.main',
          mt: 4,
        }}
      >
        <Typography variant="h6" gutterBottom>
          About These Comparisons
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          All comparisons calculate what billionaires could fund after setting aside $10 million
          for comfortable living. This threshold represents far more than needed for an
          extraordinarily comfortable life, while highlighting the scale of wealth beyond
          any reasonable personal need.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          All comparison costs are sourced from reputable charities and organizations,
          verified, and dated. See our{' '}
          <a href="/about" style={{ color: 'inherit' }}>
            About page
          </a>
          {' '}for complete methodology and sources.
        </Typography>
      </Box>
    </Container>
  );
}
```

### 3. Create Loading State

Create `app/loading.tsx`:

```typescript
import { Container, Box, Skeleton, Grid } from '@mui/material';

export default function Loading() {
  return (
    <Container maxWidth="lg">
      {/* Aggregate stats skeleton */}
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Skeleton variant="text" width={400} height={60} sx={{ mx: 'auto', mb: 2 }} />
        <Skeleton variant="text" width={300} height={80} sx={{ mx: 'auto', mb: 4 }} />

        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rectangular" height={150} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Billionaire grid skeleton */}
      <Box sx={{ mb: 4 }}>
        <Skeleton variant="text" width={300} height={50} sx={{ mb: 3 }} />

        <Grid container spacing={3}>
          {Array.from({ length: 12 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
}
```

### 4. Create Error Boundary

Create `app/error.tsx`:

```typescript
'use client';

import { useEffect } from 'react';
import { Container, Box, Typography, Button } from '@mui/material';
import { ErrorOutline } from '@mui/icons-material';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Homepage error:', error);
  }, [error]);

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          textAlign: 'center',
        }}
      >
        <ErrorOutline sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />

        <Typography variant="h4" gutterBottom>
          Something went wrong
        </Typography>

        <Typography variant="body1" color="text.secondary" paragraph>
          We encountered an error loading the page. This might be a temporary issue.
        </Typography>

        <Button variant="contained" onClick={reset} size="large">
          Try Again
        </Button>
      </Box>
    </Container>
  );
}
```

### 5. Create Not Found Page

Create `app/not-found.tsx`:

```typescript
import { Container, Box, Typography, Button } from '@mui/material';
import Link from 'next/link';
import { SearchOff } from '@mui/icons-material';

export default function NotFound() {
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          textAlign: 'center',
        }}
      >
        <SearchOff sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />

        <Typography variant="h4" gutterBottom>
          Page Not Found
        </Typography>

        <Typography variant="body1" color="text.secondary" paragraph>
          The page you're looking for doesn't exist or has been moved.
        </Typography>

        <Link href="/" passHref legacyBehavior>
          <Button variant="contained" size="large">
            Return Home
          </Button>
        </Link>
      </Box>
    </Container>
  );
}
```

### 6. Add Metadata Enhancement

Create `app/opengraph-image.tsx` (optional, for social media previews):

```typescript
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'The Wealth Observatory';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0a0a0a',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 700, color: '#1976d2' }}>
          The Wealth Observatory
        </div>
        <div style={{ fontSize: 32, color: '#b0b0b0', marginTop: 20 }}>
          Tracking billionaire wealth and its opportunity cost
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
```

### 7. Test Homepage

Start dev server:
```bash
npm run dev
```

Visit `http://localhost:3003`

Expected to see:
- Header with site title and navigation
- Aggregate stats showing total wealth
- 6 comparison cards showing what combined wealth could fund
- Grid of 50 billionaire cards
- Each card with photo, name, net worth, rank, daily change, sample comparison
- Footer with data sources
- Responsive layout (test on mobile)

### 8. Performance Optimization

Add to `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'specials-images.forbesimg.com',
      'imageio.forbes.com',
    ],
  },
  experimental: {
    optimizeCss: true,
  },
};

module.exports = nextConfig;
```

## Verification Checklist

- [ ] Homepage loads without errors
- [ ] Aggregate stats display correctly
- [ ] All 50 billionaire cards render
- [ ] Images load (or placeholders show)
- [ ] Daily changes show with correct colors (green/red)
- [ ] Sample comparisons display on cards
- [ ] Cards are clickable (links work)
- [ ] Loading state shows during data fetch
- [ ] Error boundary catches errors
- [ ] Responsive on mobile, tablet, desktop
- [ ] Header and footer render correctly
- [ ] Methodology note visible at bottom
- [ ] No console errors
- [ ] Page revalidates hourly

## Troubleshooting

### Images not loading
Add placeholder image to `public/placeholder-person.png` or handle missing images in BillionaireCard component.

### Database connection errors
Check `.env.local` has correct `DATABASE_URL`.

### Slow page load
Verify database indexes exist and queries are optimized.

## Next Step
Proceed to `STEP-09-INDIVIDUAL-PAGE.md` to build individual billionaire pages.
