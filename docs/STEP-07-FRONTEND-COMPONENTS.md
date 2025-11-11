# Step 07: Frontend Components

## Objective
Create all reusable UI components for billionaire cards, charts, comparison tables, and layout.

## Prerequisites
- MUI v7 installed
- Recharts installed
- TypeScript types created

## Tasks

### 1. Create MUI Theme Configuration

Create `lib/theme.ts`:

```typescript
'use client';

import { createTheme } from '@mui/material/styles';

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1976d2', // Deep blue
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#90caf9',
    },
    background: {
      default: '#0a0a0a', // Very dark
      paper: '#1a1a1a', // Slightly lighter for cards
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0b0b0',
    },
    success: {
      main: '#66bb6a', // Green for positive changes
    },
    error: {
      main: '#f44336', // Red for negative changes
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: {
      fontSize: '3rem',
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h2: {
      fontSize: '2.25rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 24px rgba(0,0,0,0.5)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
  },
});
```

### 2. Create Theme Provider Component

Create `components/ThemeRegistry.tsx`:

```typescript
'use client';

import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { darkTheme } from '@/lib/theme';

export default function ThemeRegistry({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
```

### 3. Create Billionaire Card Component

Create `components/BillionaireCard.tsx`:

```typescript
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import type { BillionaireCardData } from '@/types/billionaire';

interface BillionaireCardProps {
  data: BillionaireCardData;
}

export default function BillionaireCard({ data }: BillionaireCardProps) {
  const formattedNetWorth = formatNetWorth(data.netWorth);
  const formattedChange = formatChange(data.dailyChange);
  const isPositiveChange = (data.dailyChange || 0) >= 0;

  return (
    <Link href={`/${data.slug}`} style={{ textDecoration: 'none' }}>
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          cursor: 'pointer',
        }}
      >
        {/* Image */}
        <CardMedia
          component="img"
          height="200"
          image={data.imageUrl || '/placeholder-person.png'}
          alt={data.name}
          sx={{
            objectFit: 'cover',
            backgroundColor: '#333',
          }}
        />

        <CardContent sx={{ flexGrow: 1 }}>
          {/* Rank Badge */}
          {data.rank && (
            <Chip
              label={`#${data.rank}`}
              size="small"
              color="primary"
              sx={{ mb: 1 }}
            />
          )}

          {/* Name */}
          <Typography variant="h6" gutterBottom>
            {data.name}
          </Typography>

          {/* Net Worth */}
          <Typography variant="h5" color="primary" gutterBottom>
            {formattedNetWorth}
          </Typography>

          {/* Daily Change */}
          {data.dailyChange !== null && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                mb: 2,
              }}
            >
              {isPositiveChange ? (
                <TrendingUp color="success" fontSize="small" />
              ) : (
                <TrendingDown color="error" fontSize="small" />
              )}
              <Typography
                variant="body2"
                color={isPositiveChange ? 'success.main' : 'error.main'}
              >
                {formattedChange}
              </Typography>
            </Box>
          )}

          {/* Sample Comparison */}
          {data.sampleComparison && (
            <Box
              sx={{
                p: 1.5,
                backgroundColor: 'rgba(25, 118, 210, 0.08)',
                borderRadius: 1,
                borderLeft: '3px solid',
                borderColor: 'primary.main',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Could fund:
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {formatQuantity(data.sampleComparison.quantity)}{' '}
                {data.sampleComparison.unit}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Link>
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

function formatQuantity(quantity: number): string {
  if (quantity >= 1_000_000_000) {
    return `${(quantity / 1_000_000_000).toFixed(2)} billion`;
  }
  if (quantity >= 1_000_000) {
    return `${(quantity / 1_000_000).toFixed(2)} million`;
  }
  if (quantity >= 1_000) {
    return `${(quantity / 1_000).toFixed(1)} thousand`;
  }
  return quantity.toLocaleString();
}
```

### 4. Create Wealth Chart Component

Create `components/WealthChart.tsx`:

```typescript
'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Box, Typography, useTheme } from '@mui/material';
import { format, parseISO } from 'date-fns';

interface WealthChartProps {
  data: Array<{
    date: string;
    netWorth: number;
  }>;
  title?: string;
}

export default function WealthChart({ data, title = 'Wealth Over Time' }: WealthChartProps) {
  const theme = useTheme();

  // Transform data for Recharts
  const chartData = data.map(d => ({
    date: d.date,
    netWorth: d.netWorth,
    displayDate: format(parseISO(d.date), 'MMM d'),
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null;

    const data = payload[0].payload;

    return (
      <Box
        sx={{
          backgroundColor: 'background.paper',
          p: 1.5,
          border: '1px solid',
          borderColor: 'primary.main',
          borderRadius: 1,
        }}
      >
        <Typography variant="body2" gutterBottom>
          {format(parseISO(data.date), 'MMMM d, yyyy')}
        </Typography>
        <Typography variant="h6" color="primary">
          ${(data.netWorth / 1000).toFixed(2)}B
        </Typography>
      </Box>
    );
  };

  return (
    <Box sx={{ width: '100%', height: 400 }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>

      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
          <XAxis
            dataKey="displayDate"
            stroke={theme.palette.text.secondary}
            style={{ fontSize: '0.875rem' }}
          />
          <YAxis
            stroke={theme.palette.text.secondary}
            style={{ fontSize: '0.875rem' }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}B`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="netWorth"
            stroke={theme.palette.primary.main}
            strokeWidth={3}
            dot={{ fill: theme.palette.primary.main, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
```

### 5. Create Comparison Table Component

Create `components/ComparisonTable.tsx`:

```typescript
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Link,
  Box,
  Chip,
} from '@mui/material';
import { OpenInNew } from '@mui/icons-material';

interface Comparison {
  displayName: string;
  quantity: number;
  unit: string;
  description: string;
  source: string;
  sourceUrl: string;
  category: string;
}

interface ComparisonTableProps {
  comparisons: Comparison[];
  groupedByCategory?: boolean;
}

export default function ComparisonTable({
  comparisons,
  groupedByCategory = true,
}: ComparisonTableProps) {
  if (groupedByCategory) {
    // Group by category
    const grouped = comparisons.reduce((acc, comp) => {
      if (!acc[comp.category]) {
        acc[comp.category] = [];
      }
      acc[comp.category].push(comp);
      return acc;
    }, {} as Record<string, Comparison[]>);

    return (
      <Box>
        {Object.entries(grouped).map(([category, items]) => (
          <Box key={category} sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ textTransform: 'capitalize' }}>
              {category}
            </Typography>
            <ComparisonTableInner comparisons={items} />
          </Box>
        ))}
      </Box>
    );
  }

  return <ComparisonTableInner comparisons={comparisons} />;
}

function ComparisonTableInner({ comparisons }: { comparisons: Comparison[] }) {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>What It Could Fund</TableCell>
            <TableCell align="right">Quantity</TableCell>
            <TableCell>Description</TableCell>
            <TableCell>Source</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {comparisons.map((comp, index) => (
            <TableRow key={index} hover>
              <TableCell>
                <Typography variant="body1" fontWeight={600}>
                  {comp.displayName}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="h6" color="primary">
                  {formatQuantity(comp.quantity)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {comp.unit}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {comp.description}
                </Typography>
              </TableCell>
              <TableCell>
                <Link
                  href={comp.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    textDecoration: 'none',
                  }}
                >
                  <Typography variant="caption">{comp.source}</Typography>
                  <OpenInNew fontSize="small" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function formatQuantity(quantity: number): string {
  if (quantity >= 1_000_000_000) {
    return `${(quantity / 1_000_000_000).toFixed(2)} billion`;
  }
  if (quantity >= 1_000_000) {
    return `${(quantity / 1_000_000).toFixed(2)} million`;
  }
  if (quantity >= 1_000) {
    return `${(quantity / 1_000).toFixed(1)} thousand`;
  }
  return quantity.toLocaleString();
}
```

### 6. Create Aggregate Stats Component

Create `components/AggregateStats.tsx`:

```typescript
import { Box, Typography, Grid, Card, CardContent } from '@mui/material';
import type { AggregateStatsData } from '@/types/billionaire';

interface AggregateStatsProps {
  data: AggregateStatsData;
}

export default function AggregateStats({ data }: AggregateStatsProps) {
  const totalWealthFormatted = `$${(data.totalWealth / 1000).toFixed(1)} Trillion`;

  return (
    <Box sx={{ mb: 6 }}>
      {/* Total Wealth */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" gutterBottom>
          Combined Wealth of Top {data.billionaireCount}
        </Typography>
        <Typography variant="h2" color="primary" gutterBottom>
          {totalWealthFormatted}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Last updated: {new Date(data.lastUpdated).toLocaleString()}
        </Typography>
      </Box>

      {/* What It Could Fund */}
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        What This Could Fund Instead
      </Typography>

      <Grid container spacing={3}>
        {data.topComparisons.map((comp, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card
              sx={{
                height: '100%',
                background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
                borderLeft: '4px solid',
                borderColor: 'primary.main',
              }}
            >
              <CardContent>
                <Typography variant="overline" color="text.secondary" display="block">
                  {comp.displayName}
                </Typography>
                <Typography variant="h4" color="primary" gutterBottom>
                  {formatQuantity(comp.quantity)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {comp.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

function formatQuantity(quantity: number): string {
  if (quantity >= 1_000_000_000) {
    return `${(quantity / 1_000_000_000).toFixed(2)}B`;
  }
  if (quantity >= 1_000_000) {
    return `${(quantity / 1_000_000).toFixed(1)}M`;
  }
  if (quantity >= 1_000) {
    return `${(quantity / 1_000).toFixed(1)}K`;
  }
  return quantity.toLocaleString();
}
```

### 7. Create Header Component

Create `components/Header.tsx`:

```typescript
import Link from 'next/link';
import { AppBar, Toolbar, Typography, Container, Button, Box } from '@mui/material';
import { Visibility } from '@mui/icons-material';

export default function Header() {
  return (
    <AppBar position="static" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
          {/* Logo/Title */}
          <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Visibility fontSize="large" color="primary" />
              <Box>
                <Typography variant="h6" component="div" fontWeight={700}>
                  The Wealth Observatory
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Tracking wealth and its opportunity cost
                </Typography>
              </Box>
            </Box>
          </Link>

          {/* Navigation */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Link href="/" passHref legacyBehavior>
              <Button color="inherit">Home</Button>
            </Link>
            <Link href="/about" passHref legacyBehavior>
              <Button color="inherit">About</Button>
            </Link>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
```

### 8. Create Footer Component

Create `components/Footer.tsx`:

```typescript
import { Box, Container, Typography, Link } from '@mui/material';

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        py: 4,
        px: 2,
        mt: 'auto',
        borderTop: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
      }}
    >
      <Container maxWidth="lg">
        <Typography variant="body2" color="text.secondary" align="center" gutterBottom>
          Data from{' '}
          <Link
            href="https://www.forbes.com/real-time-billionaires/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Forbes Real-Time Billionaires
          </Link>{' '}
          via{' '}
          <Link
            href="https://github.com/komed3/rtb-api"
            target="_blank"
            rel="noopener noreferrer"
          >
            komed3/rtb-api
          </Link>
          .
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center">
          See{' '}
          <Link href="/about">About page</Link>
          {' '}for full methodology and data sources.
        </Typography>
        <Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ mt: 1 }}>
          © {new Date().getFullYear()} The Wealth Observatory. For educational purposes only.
        </Typography>
      </Container>
    </Box>
  );
}
```

### 9. Create Luxury Purchase Card Component

Create `components/LuxuryPurchaseCard.tsx`:

```typescript
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';

interface LuxuryPurchaseCardProps {
  itemName: string;
  cost: number;
  category: string;
  description?: string;
  imageUrl?: string;
  comparisons: Array<{
    quantity: number;
    unit: string;
    displayName: string;
  }>;
}

export default function LuxuryPurchaseCard({
  itemName,
  cost,
  category,
  description,
  imageUrl,
  comparisons,
}: LuxuryPurchaseCardProps) {
  const formattedCost = `$${(cost / 1_000_000).toFixed(1)}M`;

  return (
    <Card>
      {imageUrl && (
        <CardMedia
          component="img"
          height="200"
          image={imageUrl}
          alt={itemName}
          sx={{ objectFit: 'cover' }}
        />
      )}

      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Chip label={category} size="small" />
          <Typography variant="h5" color="error">
            {formattedCost}
          </Typography>
        </Box>

        <Typography variant="h6" gutterBottom>
          {itemName}
        </Typography>

        {description && (
          <Typography variant="body2" color="text.secondary" paragraph>
            {description}
          </Typography>
        )}

        <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
          This could have funded:
        </Typography>

        <List dense>
          {comparisons.slice(0, 5).map((comp, index) => (
            <ListItem key={index}>
              <ListItemText
                primary={`${formatQuantity(comp.quantity)} ${comp.unit}`}
                secondary={comp.displayName}
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
}

function formatQuantity(quantity: number): string {
  if (quantity >= 1_000_000) {
    return `${(quantity / 1_000_000).toFixed(1)}M`;
  }
  if (quantity >= 1_000) {
    return `${(quantity / 1_000).toFixed(1)}K`;
  }
  return quantity.toLocaleString();
}
```

## Verification Checklist

- [ ] All components created
- [ ] TypeScript types imported correctly
- [ ] MUI theme configured
- [ ] Dark theme applied
- [ ] Components are client components where needed ('use client')
- [ ] Responsive design (MUI Grid/Box)
- [ ] No compilation errors
- [ ] Components export correctly

## Testing Components

Create `app/test-components/page.tsx` for visual testing:

```typescript
import { Container, Box, Grid } from '@mui/material';
import BillionaireCard from '@/components/BillionaireCard';
import AggregateStats from '@/components/AggregateStats';
import ComparisonTable from '@/components/ComparisonTable';

export default function TestComponentsPage() {
  // Mock data for testing
  const mockBillionaire = {
    id: 1,
    name: 'Elon Musk',
    slug: 'elon-musk',
    imageUrl: null,
    netWorth: 234000,
    rank: 1,
    dailyChange: 2500,
    sampleComparison: {
      quantity: 15600000,
      unit: 'water wells',
      displayName: 'Community Water Wells',
    },
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <h2>Test: Billionaire Card</h2>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={4}>
            <BillionaireCard data={mockBillionaire} />
          </Grid>
        </Grid>
      </Box>

      {/* Add more component tests */}
    </Container>
  );
}
```

Visit `http://localhost:3003/test-components` to view.

## Next Step
Proceed to `STEP-08-HOMEPAGE.md` to build the homepage using these components.
