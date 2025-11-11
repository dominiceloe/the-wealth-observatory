import Link from 'next/link';
import { AppBar, Toolbar, Typography, Container, Button, Box } from '@mui/material';

export default function Header() {
  return (
    <AppBar position="static" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
          {/* Logo/Title */}
          <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box>
                <Typography variant="h6" component="div" fontWeight={700}>
                  The Wealth Observatory
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Tracking wealth and its opportunity cost
                </Typography>
              </Box>
            </Box>
          </Link>

          {/* Navigation */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Link href="/" passHref legacyBehavior>
              <Button color="inherit">Home</Button>
            </Link>
            <Link href="/about" passHref legacyBehavior>
              <Button color="inherit">About</Button>
            </Link>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
