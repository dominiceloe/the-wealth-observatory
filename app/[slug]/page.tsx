import { notFound } from 'next/navigation';
import { Container, Box, Typography, Grid, Avatar, Chip, Link as MuiLink } from '@mui/material';
import { Public, Business } from '@mui/icons-material';
import {
  getBillionaireBySlug,
  getBillionaireHistory,
  getLatestSnapshot,
} from '@/lib/queries/billionaires';
import { getCalculatedComparisons } from '@/lib/queries/comparisons';
import { getLuxuryPurchasesWithComparisons } from '@/lib/queries/luxury';
import WealthChart from '@/components/WealthChart';
import ComparisonTable from '@/components/ComparisonTable';
import LuxuryPurchaseCard from '@/components/LuxuryPurchaseCard';
import { INDIVIDUAL_PAGE_REVALIDATE_SECONDS } from '@/lib/constants';
import { formatNetWorth, formatChange } from '@/lib/formatters';

export const revalidate = INDIVIDUAL_PAGE_REVALIDATE_SECONDS;

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
  const [latestSnapshot, history, comparisons, luxuryPurchasesWithComparisons] = await Promise.all([
    getLatestSnapshot(billionaire.id),
    getBillionaireHistory(billionaire.id, 30),
    getCalculatedComparisons(billionaire.id),
    getLuxuryPurchasesWithComparisons(billionaire.id), // Single query, no N+1 problem
  ]);

  if (!latestSnapshot) {
    notFound();
  }

  // Format comparisons for table
  const formattedComparisons = comparisons.map((c) => ({
    displayName: c.cost_display_name,
    quantity: Number(c.quantity),
    unit: c.cost_unit,
    description: c.cost_description,
    source: c.cost_source,
    sourceUrl: c.cost_source_url,
    category: c.cost_category,
    costPerUnit: Number(c.cost_per_unit),
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
                href={`https://www.forbes.com${
                  billionaire.forbes_uri.startsWith('/')
                    ? billionaire.forbes_uri
                    : `/profile/${billionaire.forbes_uri}`
                }`}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
              >
                View Forbes Profile
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
