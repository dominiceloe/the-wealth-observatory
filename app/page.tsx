import { Container, Grid, Box, Typography, Paper } from '@mui/material';
import { getCurrentTopBillionaires } from '@/lib/queries/billionaires';
import { getActiveComparisonCosts, getAggregateComparisons, VALID_REGIONS, type ValidRegion } from '@/lib/queries/comparisons';
import { getAggregateStats } from '@/lib/queries/stats';
import BillionaireCard from '@/components/BillionaireCard';
import RegionToggle from '@/components/RegionToggle';
import {
  WEALTH_THRESHOLD_MILLIONS,
  TOP_BILLIONAIRES_COUNT,
  HOMEPAGE_REVALIDATE_SECONDS
} from '@/lib/constants';
import {
  formatQuantity,
  formatCurrency,
  formatUnit,
  pluralizeUnit,
} from '@/lib/formatters';

export const revalidate = HOMEPAGE_REVALIDATE_SECONDS;

type PageProps = {
  searchParams: { region?: string };
};

export default async function HomePage({ searchParams }: PageProps) {
  // Validate region parameter
  const requestedRegion = searchParams.region || 'Global';
  const region = VALID_REGIONS.includes(requestedRegion as ValidRegion)
    ? requestedRegion
    : 'Global';

  // Fetch all data in parallel
  const [billionaires, comparisonCosts, aggregateStats] = await Promise.all([
    getCurrentTopBillionaires(TOP_BILLIONAIRES_COUNT),
    getActiveComparisonCosts(),
    getAggregateStats(),
  ]);

  // Calculate aggregate comparisons based on selected region
  const aggregateComparisons = await getAggregateComparisons(aggregateStats.totalWealth, region);

  // Add sample comparisons to billionaire cards
  const billionairesWithComparisons = billionaires.map((b, index) => {
    // Pick a rotating comparison for each card
    const comparisonIndex = index % comparisonCosts.length;
    const comparison = comparisonCosts[comparisonIndex];

    // Calculate quantity for this billionaire
    // Note: b.netWorth is in millions, WEALTH_THRESHOLD_MILLIONS is also in millions
    const usableWealthMillions = Math.max(0, b.netWorth - WEALTH_THRESHOLD_MILLIONS);
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

  const totalWealthFormatted = `$${(aggregateStats.totalWealth / 1_000_000).toFixed(1)} Trillion`;

  return (
    <Container maxWidth="lg">
      {/* Aggregate Stats Section */}
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h3" gutterBottom>
          Combined Wealth of Top {aggregateStats.billionaireCount}
        </Typography>
        <Typography variant="h2" color="primary" gutterBottom>
          {totalWealthFormatted}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Last updated: {new Date(aggregateStats.lastUpdated).toLocaleString()}
        </Typography>
      </Box>

      {/* Region Toggle */}
      <RegionToggle />

      {/* Aggregate Comparisons Section */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" sx={{ mb: 3, textAlign: 'center' }}>
          Combined Wealth Could Fund
        </Typography>

        <Grid container spacing={3}>
          {aggregateComparisons.map((comparison, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Paper
                elevation={2}
                sx={{
                  p: 3,
                  height: '100%',
                  backgroundColor: 'background.paper',
                  borderLeft: '4px solid',
                  borderColor: 'primary.main',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6,
                  },
                }}
              >
                <Typography variant="h4" color="primary" gutterBottom>
                  {formatQuantity(comparison.quantity)}
                </Typography>
                <Typography variant="h6" gutterBottom>
                  {formatUnit(pluralizeUnit(comparison.unit, comparison.quantity))}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {comparison.description}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  Cost per {formatUnit(comparison.unit).toLowerCase()}: {formatCurrency(comparison.costPerUnit)}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Billionaire Grid Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 3 }}>
          Top {billionaires.length} Billionaires
        </Typography>

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
        <Typography variant="body2" color="text.secondary" paragraph>
          <strong>Developing World Costs:</strong> Based on verified data from organizations like
          charity: water, World Food Programme, Room to Read, and buildOn. These show maximum
          impact per dollar where aid is most effective.
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          <strong>United States Costs:</strong> Based on USDA Food Plans, U.S. Census Bureau
          education spending data, and other domestic sources. These show potential domestic
          impact using U.S. cost levels.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Billionaire wealth data is updated live from Forbes Real-Time Billionaires.
          Comparison costs are sourced from reputable organizations and verified as of 2024.
          See our{' '}
          <a href="/about" style={{ color: 'inherit' }}>
            About page
          </a>
          {' '}for complete methodology and sources.
        </Typography>
      </Box>
    </Container>
  );
}
