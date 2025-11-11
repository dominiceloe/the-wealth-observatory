'use client';

import { Box, Typography, useTheme } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { formatNetWorth } from '@/lib/formatters';

interface HistoryDataPoint {
  snapshot_date: Date | string;
  net_worth: number;
  rank: number | null;
}

interface WealthChartProps {
  data: HistoryDataPoint[];
  title?: string;
}

function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <Box
        sx={{
          backgroundColor: 'background.paper',
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
        }}
      >
        <Typography variant="body2" gutterBottom>
          {format(new Date(data.snapshot_date), 'MMM d, yyyy')}
        </Typography>
        <Typography variant="h6" color="primary">
          {formatNetWorth(data.net_worth)}
        </Typography>
        {data.rank && (
          <Typography variant="caption" color="text.secondary">
            Rank #{data.rank}
          </Typography>
        )}
      </Box>
    );
  }
  return null;
}

export default function WealthChart({ data, title = 'Wealth Over Time' }: WealthChartProps) {
  const theme = useTheme();

  // Sort data by date and format for chart
  const chartData = [...data]
    .sort((a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime())
    .map((point) => ({
      snapshot_date: point.snapshot_date,
      net_worth: point.net_worth,
      rank: point.rank,
      formattedDate: format(new Date(point.snapshot_date), 'MMM d'),
    }));

  if (chartData.length === 0) {
    return (
      <Box
        sx={{
          p: 4,
          textAlign: 'center',
          backgroundColor: 'background.paper',
          borderRadius: 2,
        }}
      >
        <Typography variant="body1" color="text.secondary">
          No historical data available yet
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: 3,
        backgroundColor: 'background.paper',
        borderRadius: 2,
      }}
    >
      <Typography variant="h5" gutterBottom>
        {title}
      </Typography>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
          <XAxis
            dataKey="formattedDate"
            stroke={theme.palette.text.secondary}
            style={{ fontSize: '0.875rem' }}
          />
          <YAxis
            stroke={theme.palette.text.secondary}
            style={{ fontSize: '0.875rem' }}
            tickFormatter={(value) => formatNetWorth(value)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="net_worth"
            stroke={theme.palette.primary.main}
            strokeWidth={2}
            dot={{ fill: theme.palette.primary.main, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
