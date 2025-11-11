'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ToggleButton, ToggleButtonGroup, Box, Typography } from '@mui/material';
import { Public, LocationCity } from '@mui/icons-material';

export default function RegionToggle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentRegion = searchParams.get('region') || 'Global';

  const handleRegionChange = (_event: React.MouseEvent<HTMLElement>, newRegion: string | null) => {
    if (newRegion !== null) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('region', newRegion);
      router.push(`?${params.toString()}`);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, mb: 4 }}>
      <Typography variant="caption" color="text.secondary">
        View impact in:
      </Typography>
      <ToggleButtonGroup
        value={currentRegion}
        exclusive
        onChange={handleRegionChange}
        aria-label="region selection"
        sx={{
          '& .MuiToggleButton-root': {
            px: 3,
            py: 1,
            textTransform: 'none',
            fontSize: '0.95rem',
          },
        }}
      >
        <ToggleButton value="Global" aria-label="global region">
          <Public sx={{ mr: 1, fontSize: '1.2rem' }} />
          Developing World
          <Typography variant="caption" sx={{ ml: 1, opacity: 0.7 }}>
            (maximum impact)
          </Typography>
        </ToggleButton>
        <ToggleButton value="United States" aria-label="us region">
          <LocationCity sx={{ mr: 1, fontSize: '1.2rem' }} />
          United States
          <Typography variant="caption" sx={{ ml: 1, opacity: 0.7 }}>
            (domestic costs)
          </Typography>
        </ToggleButton>
      </ToggleButtonGroup>

      {currentRegion === 'Global' && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, maxWidth: 600, textAlign: 'center' }}>
          Showing costs in developing countries where humanitarian aid is most effective per dollar
        </Typography>
      )}
      {currentRegion === 'United States' && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, maxWidth: 600, textAlign: 'center' }}>
          Showing costs in the United States based on USDA and Census Bureau data
        </Typography>
      )}
    </Box>
  );
}
