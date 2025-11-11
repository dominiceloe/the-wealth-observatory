import Link from 'next/link';
import { Card, CardContent, Typography, Box, Chip, Avatar } from '@mui/material';
import type { BillionaireCardData } from '@/types/billionaire';

interface BillionaireCardProps {
  data: BillionaireCardData;
}

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
  let formatted: string;

  if (quantity >= 1_000_000_000) {
    formatted = (quantity / 1_000_000_000).toFixed(1);
    formatted = formatted.replace(/\.0$/, '');
    return `${formatted} billion`;
  }
  if (quantity >= 1_000_000) {
    formatted = (quantity / 1_000_000).toFixed(1);
    formatted = formatted.replace(/\.0$/, '');
    return `${formatted} million`;
  }
  if (quantity >= 1_000) {
    formatted = (quantity / 1_000).toFixed(1);
    formatted = formatted.replace(/\.0$/, '');
    return `${formatted} thousand`;
  }
  return quantity.toLocaleString();
}

function formatUnit(unit: string): string {
  // Remove hyphens and split into words
  const words = unit.split('-').join(' ').split(' ');

  // Capitalize each word
  const capitalized = words.map(word =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  );

  return capitalized.join(' ');
}

function pluralizeUnit(unit: string, quantity: number): string {
  // Don't pluralize if quantity is 1 or less
  if (quantity <= 1) return unit;

  // Already plural
  if (unit.endsWith('s') || unit.endsWith('ies')) return unit;

  // Handle special cases
  if (unit.endsWith('y')) {
    return unit.slice(0, -1) + 'ies';
  }

  // Default: add 's'
  return unit + 's';
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
        <CardContent sx={{ flexGrow: 1 }}>
          {/* Header with Avatar and Rank */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Avatar
              src={data.imageUrl || undefined}
              alt={data.name}
              sx={{ width: 64, height: 64 }}
            />
            <Box sx={{ flexGrow: 1 }}>
              {/* Rank Badge */}
              {data.rank && (
                <Chip
                  label={`#${data.rank}`}
                  size="small"
                  color="primary"
                  sx={{ mb: 0.5 }}
                />
              )}
              {/* Name */}
              <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
                {data.name}
              </Typography>
            </Box>
          </Box>

          {/* Net Worth */}
          <Typography variant="h5" color="primary" gutterBottom>
            {formattedNetWorth}
          </Typography>

          {/* Daily Change - only show if not zero */}
          {data.dailyChange !== null && data.dailyChange !== 0 && (
            <Typography
              variant="body2"
              color={isPositiveChange ? 'success.main' : 'error.main'}
              sx={{ mb: 2 }}
            >
              {formattedChange}
            </Typography>
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
                {formatUnit(pluralizeUnit(data.sampleComparison.unit, data.sampleComparison.quantity))}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
