import Link from 'next/link';
import { Container, Box, Typography, Button } from '@mui/material';
import { Home } from '@mui/icons-material';

export default function NotFound() {
  return (
    <Container maxWidth="lg">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          textAlign: 'center',
        }}
      >
        <Typography variant="h1" color="primary" gutterBottom>
          404
        </Typography>
        <Typography variant="h4" gutterBottom>
          Billionaire Not Found
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          The billionaire you're looking for doesn't exist in our database.
        </Typography>
        <Link href="/" passHref legacyBehavior>
          <Button
            variant="contained"
            startIcon={<Home />}
            sx={{ mt: 2 }}
          >
            Back to Home
          </Button>
        </Link>
      </Box>
    </Container>
  );
}
