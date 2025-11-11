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
