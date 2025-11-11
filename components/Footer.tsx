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
          Data sourced from Forbes Real-Time Billionaires. Comparison costs from verified charitable organizations.
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
