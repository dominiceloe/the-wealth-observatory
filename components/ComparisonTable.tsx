'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Link as MuiLink,
  Box,
} from '@mui/material';
import { OpenInNew } from '@mui/icons-material';
import {
  formatQuantity,
  formatCurrency,
  formatUnit,
  pluralizeUnit,
  formatCategoryName,
} from '@/lib/formatters';

interface Comparison {
  displayName: string;
  quantity: number;
  unit: string;
  description: string;
  source: string;
  sourceUrl: string | null;
  category: string;
  costPerUnit?: number;
}

interface ComparisonTableProps {
  comparisons: Comparison[];
  groupedByCategory?: boolean;
}

export default function ComparisonTable({
  comparisons,
  groupedByCategory = false,
}: ComparisonTableProps) {
  if (comparisons.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No comparisons available
        </Typography>
      </Box>
    );
  }

  // Group comparisons by category if requested
  const groupedComparisons = groupedByCategory
    ? comparisons.reduce((acc, comp) => {
        if (!acc[comp.category]) {
          acc[comp.category] = [];
        }
        acc[comp.category].push(comp);
        return acc;
      }, {} as Record<string, Comparison[]>)
    : { 'All Comparisons': comparisons };

  return (
    <Box>
      {Object.entries(groupedComparisons).map(([category, items]) => (
        <Box key={category} sx={{ mb: 4 }}>
          {groupedByCategory && (
            <Typography
              variant="h5"
              sx={{
                mb: 2,
                fontWeight: 600,
                textTransform: 'capitalize',
                borderBottom: '2px solid',
                borderColor: 'primary.main',
                pb: 1
              }}
            >
              {formatCategoryName(category)}
            </Typography>
          )}

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight={700}>
                      What Could Be Funded
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle2" fontWeight={700}>
                      Quantity
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight={700}>
                      Description
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight={700}>
                      Source
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((comparison, index) => (
                  <TableRow
                    key={`${comparison.displayName}-${index}`}
                    sx={{
                      '&:last-child td, &:last-child th': { border: 0 },
                      '&:hover': { backgroundColor: 'action.hover' },
                    }}
                  >
                    <TableCell>
                      <Typography variant="body1" fontWeight={600}>
                        {comparison.displayName}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box>
                        <Typography variant="h6" color="primary">
                          {formatQuantity(comparison.quantity)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatUnit(pluralizeUnit(comparison.unit, comparison.quantity))}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {comparison.description}
                      </Typography>
                      {comparison.costPerUnit !== undefined && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          Cost per {formatUnit(comparison.unit).toLowerCase()}: {formatCurrency(comparison.costPerUnit)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {comparison.source}
                        </Typography>
                        {comparison.sourceUrl && (
                          <MuiLink
                            href={comparison.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                              mt: 0.5,
                              fontSize: '0.75rem',
                            }}
                          >
                            Verify
                            <OpenInNew sx={{ fontSize: '0.75rem' }} />
                          </MuiLink>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ))}
    </Box>
  );
}
