# Step 10: About Page

## Objective
Create the About page displaying all disclaimers, methodology, data sources, and project information.

## Tasks

### 1. Create About Page

Create `app/about/page.tsx`:

```typescript
import { Container, Box, Typography, Divider, Paper } from '@mui/material';
import { getActiveDisclaimers } from '@/lib/queries/config';

export const metadata = {
  title: 'About - The Wealth Observatory',
  description: 'Learn about our methodology, data sources, and the purpose behind The Wealth Observatory.',
};

export const revalidate = 86400; // Revalidate once per day

export default async function AboutPage() {
  const disclaimers = await getActiveDisclaimers();

  return (
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
                  __html: renderMarkdown(disclaimer.content),
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
  );
}

/**
 * Simple markdown-to-HTML renderer
 * For production, consider using a library like 'marked' or 'remark'
 */
function renderMarkdown(markdown: string): string {
  let html = markdown;

  // Headers
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^### (.+)$/gm, '<h3>$3</h3>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Links
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Line breaks
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/^(.+)$/gm, '<p>$1</p>');

  // Lists
  html = html.replace(/<p>- (.+?)<\/p>/g, '<ul><li>$1</li></ul>');
  html = html.replace(/<\/ul>\s*<ul>/g, ''); // Merge consecutive lists

  return html;
}
```

### 2. Install Markdown Parser (Better Solution)

For better markdown rendering, install a proper library:

```bash
npm install marked
npm install --save-dev @types/marked
```

Update the page to use `marked`:

```typescript
import { marked } from 'marked';

// Configure marked
marked.setOptions({
  gfm: true, // GitHub Flavored Markdown
  breaks: true,
});

// In the component:
<Box
  sx={{ /* styles */ }}
  dangerouslySetInnerHTML={{
    __html: marked(disclaimer.content),
  }}
/>
```

### 3. Create FAQ Section (Optional Enhancement)

Create `components/FAQ.tsx`:

```typescript
'use client';

import { useState } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'How often is the data updated?',
    answer: 'Billionaire wealth data is updated daily at 6:00 AM PST using Forbes Real-Time Billionaires data. Comparison costs are reviewed and verified monthly.',
  },
  {
    question: 'Why $10 million as the threshold?',
    answer: '$10 million represents far more than enough for an extraordinarily comfortable life. By this standard, everything beyond this amount could be considered excess wealth that could address significant global problems.',
  },
  {
    question: 'How accurate is billionaire net worth data?',
    answer: 'Net worth figures are estimates based on publicly available information from Forbes. Actual net worth may differ due to private holdings, market fluctuations, and valuation methodologies. We display data as reported by Forbes with appropriate disclaimers.',
  },
  {
    question: 'Where do comparison costs come from?',
    answer: 'All comparison costs are sourced from reputable charitable organizations, NGOs, and international aid agencies. Each comparison includes its source and a link for verification. Costs are region-specific where applicable and regularly verified.',
  },
  {
    question: 'Is this site affiliated with Forbes or any billionaire?',
    answer: 'No. This is an independent project for educational purposes. We are not affiliated with Forbes, any billionaire featured, or any charitable organization mentioned.',
  },
  {
    question: 'Do you track my visit?',
    answer: 'No. This website does not use cookies, analytics, or any tracking technologies. We do not collect any personal information about visitors. You can browse completely anonymously.',
  },
];

export default function FAQ() {
  const [expanded, setExpanded] = useState<string | false>(false);

  const handleChange = (panel: string) => (
    event: React.SyntheticEvent,
    isExpanded: boolean
  ) => {
    setExpanded(isExpanded ? panel : false);
  };

  return (
    <div>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        Frequently Asked Questions
      </Typography>

      {faqs.map((faq, index) => (
        <Accordion
          key={index}
          expanded={expanded === `panel${index}`}
          onChange={handleChange(`panel${index}`)}
          sx={{
            mb: 1,
            '&:before': { display: 'none' },
            backgroundColor: 'background.paper',
          }}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography fontWeight={600}>{faq.question}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography color="text.secondary">{faq.answer}</Typography>
          </AccordionDetails>
        </Accordion>
      ))}
    </div>
  );
}
```

Add FAQ to About page:

```typescript
import FAQ from '@/components/FAQ';

// In AboutPage component, after disclaimers:
<Box sx={{ my: 6 }}>
  <FAQ />
</Box>
```

### 4. Create Table of Contents (Enhancement)

Create `components/TableOfContents.tsx`:

```typescript
'use client';

import { Box, List, ListItem, ListItemButton, ListItemText, Paper } from '@mui/material';

interface TOCItem {
  id: string;
  title: string;
}

interface TableOfContentsProps {
  items: TOCItem[];
}

export default function TableOfContents({ items }: TableOfContentsProps) {
  const handleClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        position: 'sticky',
        top: 80,
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box sx={{ mb: 1 }}>
        <strong>Contents</strong>
      </Box>
      <List dense>
        {items.map((item) => (
          <ListItem key={item.id} disablePadding>
            <ListItemButton onClick={() => handleClick(item.id)}>
              <ListItemText
                primary={item.title}
                primaryTypographyProps={{
                  variant: 'body2',
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}
```

### 5. Add Structured Data (SEO)

Add JSON-LD structured data to About page:

```typescript
// Add to AboutPage component
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
      url: 'https://wealthobservatory.com',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <Container maxWidth="md">
        {/* Rest of page */}
      </Container>
    </>
  );
}
```

## Testing

### 1. Test About Page

Visit: `http://localhost:3003/about`

Verify:
- [ ] All disclaimers render correctly
- [ ] Markdown formatting works (headers, bold, links)
- [ ] Links open in new tabs
- [ ] Content is readable and well-formatted
- [ ] Sections are properly spaced
- [ ] FAQ accordion works (if added)
- [ ] Table of contents works (if added)
- [ ] No console errors

### 2. Test Content Editing

Update a disclaimer in the database:

```sql
UPDATE disclaimers
SET content = 'Updated content...'
WHERE key = 'methodology';
```

Refresh page → Should show updated content (after revalidation)

### 3. Test Responsiveness

Check on:
- Desktop: Full width, easy to read
- Tablet: Comfortable reading width
- Mobile: Text wraps properly, links tappable

### 4. Accessibility Check

- [ ] All headings in proper hierarchy (h1 → h2 → h3)
- [ ] Links have descriptive text
- [ ] Color contrast meets WCAG AA standards
- [ ] Content is keyboard navigable

## Verification Checklist

- [ ] About page loads successfully
- [ ] All disclaimers from database displayed
- [ ] Display order respected
- [ ] Markdown rendered correctly
- [ ] Headers formatted properly
- [ ] Bold text shows correctly
- [ ] Links work and open in new tabs
- [ ] Content is well-spaced and readable
- [ ] Mobile responsive
- [ ] No console errors
- [ ] Page revalidates daily
- [ ] FAQ works (if added)
- [ ] TOC works (if added)

## Content Guidelines

When editing disclaimer content in database:

1. **Use Markdown**: Headers (##), bold (**text**), lists (-)
2. **Keep it concise**: Break into sections with clear headers
3. **Cite sources**: Include links to all data sources
4. **Be transparent**: Explain limitations and assumptions
5. **Update dates**: Keep verification dates current

## Next Step
Proceed to `STEP-11-DEPLOYMENT.md` to prepare for production deployment on Vercel.
