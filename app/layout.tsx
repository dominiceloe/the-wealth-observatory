import type { Metadata } from 'next';
import { Box } from '@mui/material';
import ThemeRegistry from '@/components/ThemeRegistry';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'The Wealth Observatory - Tracking Billionaire Wealth',
  description: 'Track real-time billionaire wealth and see what their money could fund instead through realistic cost comparisons.',
  keywords: 'billionaire, wealth, inequality, forbes, philanthropy, social good',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <ThemeRegistry>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              minHeight: '100vh',
            }}
          >
            <Header />
            <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
              {children}
            </Box>
            <Footer />
          </Box>
        </ThemeRegistry>
      </body>
    </html>
  );
}
