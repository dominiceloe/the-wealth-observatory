# The Wealth Observatory - Build Guide

This directory contains a complete, step-by-step guide to building The Wealth Observatory from scratch.

## Overview

The Wealth Observatory is an anonymous billionaire wealth transparency platform that tracks real-time billionaire wealth and shows what their money could fund instead using realistic cost comparisons.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Material-UI v7, Recharts
- **Backend**: Next.js API Routes, PostgreSQL (AWS RDS), node-postgres
- **Hosting**: Vercel (frontend + cron), AWS RDS (database)
- **Data Sources**: Forbes Real-Time Billionaires (via komed3/rtb-api)

## Build Steps

Follow these steps in order to build the complete application:

### Phase 1: Foundation (Steps 1-4)
1. **[STEP-01-PROJECT-SETUP.md](STEP-01-PROJECT-SETUP.md)**
   - Initialize Next.js project
   - Install dependencies
   - Configure TypeScript and ports
   - Set up directory structure

2. **[STEP-02-DATABASE-SCHEMA.md](STEP-02-DATABASE-SCHEMA.md)**
   - Create PostgreSQL database
   - Run schema migration (10 tables)
   - Set up indexes and constraints

3. **[STEP-03-DATABASE-CONNECTION.md](STEP-03-DATABASE-CONNECTION.md)**
   - Create connection pool
   - Define TypeScript types
   - Build helper utilities
   - Test database connection

4. **[STEP-04-INITIAL-SEED.md](STEP-04-INITIAL-SEED.md)**
   - Populate data sources
   - Fetch billionaire data from komed3
   - Seed comparison costs (20+ entries)
   - Add disclaimers and site config
   - Calculate initial comparisons

### Phase 2: Backend (Steps 5-6)
5. **[STEP-05-QUERY-FUNCTIONS.md](STEP-05-QUERY-FUNCTIONS.md)**
   - Create all database query functions
   - Billionaire queries
   - Comparison queries
   - Config and metadata queries
   - Aggregate stats calculations

6. **[STEP-06-CRON-API-ROUTE.md](STEP-06-CRON-API-ROUTE.md)**
   - Create daily update API route
   - Configure Vercel Cron
   - Implement Forbes API fetching
   - Calculate daily changes
   - Add monthly refresh logic

### Phase 3: Frontend (Steps 7-10)
7. **[STEP-07-FRONTEND-COMPONENTS.md](STEP-07-FRONTEND-COMPONENTS.md)**
   - Configure MUI dark theme
   - Create reusable components:
     - BillionaireCard
     - WealthChart
     - ComparisonTable
     - AggregateStats
     - Header/Footer
     - LuxuryPurchaseCard

8. **[STEP-08-HOMEPAGE.md](STEP-08-HOMEPAGE.md)**
   - Build homepage layout
   - Aggregate stats section
   - Billionaire grid (top 50)
   - Loading and error states
   - Responsive design

9. **[STEP-09-INDIVIDUAL-PAGE.md](STEP-09-INDIVIDUAL-PAGE.md)**
   - Dynamic billionaire routes
   - Profile header
   - 30-day wealth chart
   - Full comparison tables
   - Luxury purchases section
   - Data sources footer

10. **[STEP-10-ABOUT-PAGE.md](STEP-10-ABOUT-PAGE.md)**
    - Display all disclaimers
    - Render markdown content
    - FAQ section (optional)
    - Table of contents (optional)

### Phase 4: Deployment & Testing (Steps 11-12)
11. **[STEP-11-DEPLOYMENT.md](STEP-11-DEPLOYMENT.md)**
    - Prepare for production
    - Configure AWS RDS
    - Deploy to Vercel
    - Set up custom domain
    - Configure monitoring
    - Create health check endpoint

12. **[STEP-12-TESTING-VALIDATION.md](STEP-12-TESTING-VALIDATION.md)**
    - Database integrity tests
    - API endpoint testing
    - Frontend E2E testing
    - Performance testing (Lighthouse)
    - Accessibility testing
    - Security testing
    - Cross-browser testing
    - Load testing

## Quick Start

If you want to get started quickly:

```bash
# 1. Clone/create project
npx create-next-app@latest the-wealth-observatory --typescript

# 2. Install dependencies
cd the-wealth-observatory
npm install @mui/material @emotion/react @emotion/styled recharts pg date-fns
npm install --save-dev @types/pg tsx

# 3. Follow STEP-01 through STEP-12 in order
```

## Key Configuration Files

After completing all steps, your project will have:

```
the-wealth-observatory/
├── app/
│   ├── [slug]/page.tsx          # Individual billionaire pages
│   ├── about/page.tsx            # About page
│   ├── api/
│   │   ├── cron/update-billionaires/route.ts
│   │   └── health/route.ts
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Homepage
├── components/                   # All UI components
├── lib/
│   ├── db.ts                    # Database connection
│   ├── theme.ts                 # MUI theme
│   └── queries/                 # All query functions
├── scripts/
│   ├── schema.sql               # Database schema
│   ├── seed-initial-data.ts     # Initial seed
│   └── test-*.ts                # Test scripts
├── types/                       # TypeScript types
├── .env.local                   # Local environment (not committed)
├── .env.example                 # Environment template
├── vercel.json                  # Vercel cron config
└── package.json
```

## Port Configuration

- **Frontend**: Port 3003 (not default 3000)
- **Database**: Port 5433 (not default 5432)

These non-standard ports avoid conflicts with other local projects.

## Environment Variables Required

```env
DATABASE_URL=postgresql://user:pass@localhost:5433/wealthobservatory
CRON_SECRET=your_secure_random_string
NODE_ENV=development
NEXT_PUBLIC_URL=http://localhost:3003
```

## Data Flow

1. **Initial Seed** (one-time): Populate database from komed3/rtb-api
2. **Daily Updates** (automated): Vercel Cron → API Route → Fetch Forbes data → Update database → Recalculate comparisons
3. **Frontend** (on-demand): User visits page → Server Component fetches from database → Renders with MUI components → Caches for 1 hour

## Database Schema (10 Tables)

1. **billionaires** - Core profile data
2. **daily_snapshots** - Historical wealth tracking
3. **comparison_costs** - Cost data for comparisons
4. **calculated_comparisons** - Pre-computed comparisons
5. **luxury_purchases** - Verified luxury spending
6. **luxury_comparisons** - What luxury purchases could fund
7. **data_sources** - Track data sources
8. **update_metadata** - Log all updates
9. **disclaimers** - Editable legal/methodology text
10. **site_config** - Dynamic settings

## Development Timeline

Estimated time to complete all steps:

- **Phase 1** (Foundation): 2-3 hours
- **Phase 2** (Backend): 2-3 hours
- **Phase 3** (Frontend): 4-6 hours
- **Phase 4** (Deployment & Testing): 2-3 hours

**Total**: 10-15 hours for full implementation

## Testing Strategy

Each step includes verification checklists. Run tests frequently:

```bash
npm run test:db          # Test database connection
npm run test:queries     # Test query functions
npm run update:manual    # Manually trigger cron
npm run test:integrity   # Data integrity tests
npm run test:all         # All tests
```

## Deployment Checklist

Before deploying to production:

- [ ] All steps completed
- [ ] Database schema created on production DB
- [ ] Initial seed run on production DB
- [ ] Environment variables set in Vercel
- [ ] Cron job configured
- [ ] Build succeeds locally
- [ ] All tests passing

## Support & Troubleshooting

Each step file includes:
- Detailed instructions
- Code examples
- Verification checklists
- Troubleshooting sections

Common issues:
- **Database connection**: Check `.env.local` and RDS security groups
- **Build errors**: Run `npm run build` locally first
- **Cron not running**: Verify `vercel.json` and CRON_SECRET
- **Slow queries**: Add missing indexes from STEP-02

## Next Steps After Completion

Once deployed:

1. Monitor cron job logs daily (first week)
2. Verify data accuracy
3. Check performance metrics
4. Set up uptime monitoring
5. Add luxury purchase data manually
6. Consider enhancements:
   - Historical trends (winners/losers)
   - Industry breakdowns
   - Search functionality
   - More billionaires (top 100+)

## License & Attribution

When deploying, ensure:
- Data attributed to Forbes
- Comparison sources cited
- Disclaimers visible
- Privacy policy clear (no tracking)

## Additional Resources

- **Next.js Docs**: https://nextjs.org/docs
- **MUI Docs**: https://mui.com/material-ui/
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Vercel Docs**: https://vercel.com/docs

---

**Ready to build?** Start with [STEP-01-PROJECT-SETUP.md](STEP-01-PROJECT-SETUP.md)!
