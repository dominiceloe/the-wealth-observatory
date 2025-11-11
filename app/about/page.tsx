import { Container, Box, Typography, Divider, Paper } from '@mui/material';
import { marked } from 'marked';
import { getActiveDisclaimers } from '@/lib/queries/config';

export const metadata = {
  title: 'About - The Wealth Observatory',
  description: 'Learn about our methodology, data sources, and the purpose behind The Wealth Observatory.',
};

export const revalidate = 86400; // Revalidate once per day

// Configure marked
marked.setOptions({
  gfm: true, // GitHub Flavored Markdown
  breaks: true,
});

export default async function AboutPage() {
  const disclaimers = await getActiveDisclaimers();

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'About The Wealth Observatory',
    description: 'Methodology, data sources, and information about The Wealth Observatory project.',
    publisher: {
      '@type': 'Organization',
      name: 'The Wealth Observatory',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <Container maxWidth="md">
        <Box sx={{ py: 4 }}>
          {/* Page Header */}
          <Typography variant="h3" component="h1" gutterBottom>
            About The Wealth Observatory
          </Typography>

          <Typography variant="body1" color="text.secondary" paragraph>
            Everything you need to know about how we track billionaire wealth,
            where our data comes from, and why this project exists.
          </Typography>

          <Divider sx={{ my: 4 }} />

          {/* Render all disclaimers */}
          {disclaimers.map((disclaimer, index) => (
            <Box key={disclaimer.id} sx={{ mb: 6 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  backgroundColor: 'background.paper',
                  borderLeft: '4px solid',
                  borderColor: 'primary.main',
                }}
              >
                <Typography variant="h4" component="h2" gutterBottom>
                  {disclaimer.title}
                </Typography>

                <Box
                  sx={{
                    '& h2': {
                      fontSize: '1.5rem',
                      fontWeight: 600,
                      mt: 3,
                      mb: 2,
                    },
                    '& h3': {
                      fontSize: '1.25rem',
                      fontWeight: 600,
                      mt: 2,
                      mb: 1,
                    },
                    '& p': {
                      mb: 2,
                      lineHeight: 1.7,
                    },
                    '& ul, & ol': {
                      mb: 2,
                      pl: 3,
                    },
                    '& li': {
                      mb: 1,
                    },
                    '& a': {
                      color: 'primary.main',
                      textDecoration: 'none',
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                    },
                    '& strong': {
                      fontWeight: 600,
                      color: 'text.primary',
                    },
                  }}
                  dangerouslySetInnerHTML={{
                    __html: marked(disclaimer.content),
                  }}
                />
              </Paper>

              {index < disclaimers.length - 1 && <Divider sx={{ my: 4 }} />}
            </Box>
          ))}

          {/* Contact/Feedback Section */}
          <Box
            sx={{
              mt: 6,
              p: 3,
              backgroundColor: 'rgba(25, 118, 210, 0.08)',
              borderRadius: 2,
              textAlign: 'center',
            }}
          >
            <Typography variant="h6" gutterBottom>
              Questions or Corrections?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              If you have questions about our methodology, spot an error in our data,
              or have suggestions for improvement, we'd love to hear from you.
              This project is committed to transparency and accuracy.
            </Typography>
          </Box>
        </Box>
      </Container>
    </>
  );
}
