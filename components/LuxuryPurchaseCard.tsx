import { Card, CardContent, CardMedia, Typography, Box, Chip } from '@mui/material';

interface LuxuryComparison {
  quantity: number;
  unit: string;
  displayName: string;
}

interface LuxuryPurchaseCardProps {
  itemName: string;
  cost: number;
  category: string;
  description?: string;
  imageUrl?: string;
  comparisons: LuxuryComparison[];
}

function formatCost(cost: number): string {
  if (cost >= 1_000_000_000) {
    return `$${(cost / 1_000_000_000).toFixed(2)}B`;
  }
  if (cost >= 1_000_000) {
    return `$${(cost / 1_000_000).toFixed(1)}M`;
  }
  if (cost >= 1_000) {
    return `$${(cost / 1_000).toFixed(0)}K`;
  }
  return `$${cost.toLocaleString()}`;
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
  if (quantity <= 1) return unit;
  if (unit.endsWith('s') || unit.endsWith('ies')) return unit;
  if (unit.endsWith('y')) return unit.slice(0, -1) + 'ies';
  return unit + 's';
}

export default function LuxuryPurchaseCard({
  itemName,
  cost,
  category,
  description,
  imageUrl,
  comparisons,
}: LuxuryPurchaseCardProps) {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {imageUrl && (
        <CardMedia
          component="img"
          height="200"
          image={imageUrl}
          alt={itemName}
          sx={{ objectFit: 'cover' }}
        />
      )}

      <CardContent sx={{ flexGrow: 1 }}>
        {/* Category */}
        <Chip label={category} size="small" color="primary" sx={{ mb: 1 }} />

        {/* Item Name */}
        <Typography variant="h6" gutterBottom>
          {itemName}
        </Typography>

        {/* Cost */}
        <Typography variant="h5" color="primary" gutterBottom>
          {formatCost(cost)}
        </Typography>

        {/* Description */}
        {description && (
          <Typography variant="body2" color="text.secondary" paragraph>
            {description}
          </Typography>
        )}

        {/* Comparisons */}
        {comparisons.length > 0 && (
          <Box
            sx={{
              mt: 2,
              p: 2,
              backgroundColor: 'rgba(25, 118, 210, 0.08)',
              borderRadius: 1,
              borderLeft: '3px solid',
              borderColor: 'primary.main',
            }}
          >
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Could have instead funded:
            </Typography>
            {comparisons.map((comparison, index) => (
              <Box key={index} sx={{ mt: 1 }}>
                <Typography variant="body2" fontWeight={600}>
                  {formatQuantity(comparison.quantity)} {formatUnit(pluralizeUnit(comparison.unit, comparison.quantity))}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ({comparison.displayName})
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
