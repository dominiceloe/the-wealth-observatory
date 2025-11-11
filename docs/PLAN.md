The Wealth Observatory - Complete Build Plan
PROJECT OVERVIEW
Build "The Wealth Observatory" (TWO) - an anonymous billionaire wealth transparency platform. The site tracks real-time billionaire wealth and shows what their money could fund instead using realistic cost comparisons.
Key Goals:

Display top 50 billionaires with current net worth
Show aggregate stats (total wealth of top 50)
Individual pages with 30-day wealth charts
"What this could fund" comparisons (both total wealth minus $10M threshold AND specific luxury purchases)
All data sourced and cited properly
Backend pre-computes everything, frontend just displays


TECH STACK
Frontend:

Next.js 14+ (App Router, TypeScript strict mode)
Material-UI v7 (dark theme by default)
Recharts for wealth over time line charts
Server Components for data fetching

Backend:

Next.js API Routes
PostgreSQL database (new AWS RDS instance)
node-postgres (pg) for database connections
Vercel Cron for daily updates

Hosting:

Vercel (new project)
AWS RDS PostgreSQL (new database)
AWS S3 (if needed for assets)

Data Sources:

komed3/rtb-api: Historical Forbes data
Forbes Unofficial API: Daily updates
All comparison costs: Stored in database with sources


DATABASE SCHEMA
Create these tables in PostgreSQL:
1. billionaires
Stores core profile data for each billionaire.

id (serial primary key)
person_name (varchar, not null)
slug (varchar, unique, for URLs)
gender (varchar, nullable)
country_of_citizenship (varchar, nullable)
industries (text array)
birth_date (date, nullable)
image_url (text, nullable)
bio (text, nullable)
forbes_uri (varchar, link to Forbes profile)
created_at, updated_at (timestamps)

Indexes on: slug, person_name
2. daily_snapshots
Historical wealth tracking, one row per billionaire per day.

id (serial primary key)
billionaire_id (foreign key to billionaires)
snapshot_date (date, not null)
net_worth (bigint, in USD millions)
rank (integer, nullable)
daily_change (bigint, in USD millions, can be negative)
data_source_id (foreign key to data_sources)
created_at (timestamp)
UNIQUE constraint on (billionaire_id, snapshot_date)

Indexes on: snapshot_date DESC, billionaire_id + snapshot_date DESC, rank
3. comparison_costs
All cost data for "what wealth could fund" comparisons.

id (serial primary key)
name (varchar, unique, e.g. "waterWell")
display_name (varchar, e.g. "Community Water Well")
cost (decimal, actual cost in USD)
unit (varchar, e.g. "community well")
description (text, detailed explanation)
source (varchar, e.g. "charity: water (2024)")
source_url (text, link to source)
region (varchar, e.g. "Sub-Saharan Africa")
category (varchar, e.g. "water", "education", "food")
active (boolean, can disable without deleting)
display_order (integer, for frontend sorting)
last_verified (date, when cost was last checked)
created_at, updated_at (timestamps)

Indexes on: category, active
Initial costs to populate: 20+ entries covering water, education, food, healthcare, housing, energy, emergency relief, basic needs. Each with realistic 2024 pricing and proper citations.
4. calculated_comparisons
Pre-computed daily: "Billionaire X's wealth above $10M could fund Y water wells"

id (serial primary key)
billionaire_id (foreign key)
comparison_cost_id (foreign key)
calculation_date (date)
net_worth_used (bigint, wealth minus $10M threshold in millions)
quantity (bigint, how many units they could fund)
created_at (timestamp)
UNIQUE constraint on (billionaire_id, comparison_cost_id, calculation_date)

Index on: billionaire_id + calculation_date DESC
5. luxury_purchases
Track verified luxury spending by billionaires.

id (serial primary key)
billionaire_id (foreign key)
item_name (varchar, e.g. "Superyacht Koru")
category (varchar, e.g. "yacht", "jet", "mansion")
cost (bigint, in USD)
purchase_date (date, nullable)
description (text)
source (varchar, where reported)
source_url (text)
image_url (text, nullable)
verified (boolean, manually verified)
created_at, updated_at (timestamps)

Indexes on: billionaire_id, cost DESC
6. luxury_comparisons
Pre-computed: "This $500M yacht could have funded X water wells"

id (serial primary key)
luxury_purchase_id (foreign key)
comparison_cost_id (foreign key)
quantity (bigint, how many units)
created_at (timestamp)
UNIQUE constraint on (luxury_purchase_id, comparison_cost_id)

7. data_sources
Track where each piece of data came from.

id (serial primary key)
name (varchar, unique, e.g. "Forbes", "komed3")
url (text)
description (text)
api_endpoint (text, nullable)
last_accessed (timestamp)
status (varchar, "active", "deprecated", "failed")
created_at (timestamp)

Initial sources: komed3/rtb-api, Forbes Real-Time, Bloomberg Billionaires
8. update_metadata
Log every data update attempt.

id (serial primary key)
update_type (varchar, "initial_seed", "daily_update", "monthly_refresh")
data_source_id (foreign key, nullable)
records_updated (integer)
records_created (integer)
records_failed (integer)
status (varchar, "success", "partial", "failed")
error_message (text, nullable)
execution_time_ms (integer)
started_at (timestamp)
completed_at (timestamp)
created_at (timestamp)

Indexes on: started_at DESC, status
9. disclaimers
Editable legal/methodology text.

id (serial primary key)
key (varchar, unique, e.g. "methodology")
title (varchar)
content (text)
display_order (integer)
active (boolean)
created_at, updated_at (timestamps)

Initial disclaimers needed:

Methodology (how we calculate, $10M threshold explanation)
Data Sources (where data comes from)
Legal Disclaimer (not financial advice, estimates only)
Privacy (why anonymous, no tracking)
About (project mission)

10. site_config
Dynamic settings.

id (serial primary key)
key (varchar, unique)
value (text)
description (text)
updated_at (timestamp)

Initial config:

wealth_threshold: "10000000" (USD)
homepage_billionaire_limit: "50"
chart_days_default: "30"
last_manual_update: timestamp


DATA FLOW ARCHITECTURE
Phase 1: Initial Seed (One-Time)
Create migration or standalone script that:

Populates data_sources table with komed3, Forbes, Bloomberg
Fetches complete historical data from komed3/rtb-api
Inserts all billionaires into billionaires table
Inserts current snapshots into daily_snapshots
Populates comparison_costs with 20+ realistic costs (all properly sourced)
Inserts default disclaimers
Sets initial site_config values
Logs completion to update_metadata

Phase 2: Daily Updates (Automated via Vercel Cron)
API Route: /api/cron/update-billionaires
Runs: Daily at 6:00 AM PST (after markets close previous day)
Authentication: Protected by secret token in Authorization header
Process:

Fetch Forbes real-time data from unofficial API
For each billionaire in response:

Check if exists in database (by slug)
If exists: update profile info
If new: insert new billionaire
Insert new daily snapshot (or update if exists for today)


Run comparison calculations:

Get wealth threshold from site_config
For each billionaire's latest snapshot:

Calculate net worth minus $10M threshold
For each active comparison cost:

Calculate quantity (wealth / cost)
Insert into calculated_comparisons






Update site_config last_manual_update timestamp
Log everything to update_metadata (success/failure, timing, counts)

Vercel Cron Config: Use vercel.json to schedule this route
Phase 3: Monthly Refresh (Same Cron, Checks Date)
On 1st of each month, the daily cron also:

Fetches fresh komed3 data (updated monthly)
Merges with existing billionaire records
Updates any changed profile info
Logs as "monthly_refresh" in update_metadata


FRONTEND PAGES & COMPONENTS
Page 1: Homepage (/)
Layout:

Header Section (Top):

Site title: "The Wealth Observatory"
Tagline: "Tracking billionaire wealth and its opportunity cost"
Last updated timestamp (from site_config)


Aggregate Stats Section:

Large number: Total combined wealth of top 50
4-6 comparison cards showing what combined wealth could fund:

"Could provide clean water to X billion people"
"Could feed Y million people for a year"
"Could build Z thousand schools"
etc.


Use MUI Cards with typography, display sources


Billionaire Grid:

MUI Grid layout, responsive (3 cols desktop, 1-2 mobile)
Each card shows:

Photo (or placeholder)
Name
Current net worth (formatted: $245.2B)
Rank (#1, #2, etc.)
Daily change (+$2.1B or -$500M with color coding: green/red)
One rotating comparison stat


Clickable, links to individual page
Sort options: by rank, by daily change, alphabetical



Data Fetching:

Server Component fetches from database:

Latest snapshots for top 50 (by rank)
Aggregate calculations (SUM of net worth)
Sample comparisons for aggregate stats


Revalidate every hour (Next.js caching)

Page 2: Individual Billionaire (/[slug])
Layout:

Header:

Large photo
Name
Current net worth
Country, industries
Link to Forbes profile


Wealth Chart:

Recharts line chart
X-axis: Last 30 days
Y-axis: Net worth in billions
Show daily changes
Tooltip with exact values


"What Wealth Above $10M Could Fund" Section:

Explanation: "After setting aside $10M for comfortable living..."
MUI Table or Grid of comparisons:

Display name, quantity, description, source
Example: "32.6 million community water wells"
Categorized (Water, Education, Food, etc.)
Each with citation link




Luxury Purchases Section (if any exist):

List verified luxury purchases
For each: "This $500M yacht could have funded..."
Show comparisons with sources


Data Sources Footer:

List all sources used for this page
Links to original data



Data Fetching:

Server Component fetches:

Billionaire profile (from slug)
30 days of snapshots for chart
Calculated comparisons (latest date)
Luxury purchases (if any)
Related comparison costs (for display)


Revalidate every hour

Page 3: About (/about)
Layout:

Display all disclaimers from database:

Methodology
Data Sources
Legal Disclaimer
Privacy
About the project


MUI Typography, proper formatting
Links to source documentation

Data Fetching:

Fetch active disclaimers, ordered by display_order

Page 4: Admin (Future/Optional)
Not part of MVP, but structure database so you could add:

Edit comparison costs
Add/edit luxury purchases
Edit disclaimers
View update logs
Manual trigger updates


COMPONENT STRUCTURE
Shared Components:
1. BillionaireCard

Props: billionaire data, snapshot data, one comparison
Displays: photo, name, net worth, rank, daily change, comparison
MUI Card with hover effects
Clickable, links to individual page

2. WealthChart

Props: array of snapshots (date, net_worth)
Recharts LineChart
Responsive, dark theme
Tooltip, axis formatting

3. ComparisonTable/Grid

Props: array of calculated comparisons with cost details
Grouped by category
MUI Table or Grid
Shows: quantity, unit, description, source (linked)

4. AggregateStats

Props: total wealth, array of sample comparisons
Large numbers with MUI Typography
Grid of comparison cards

5. Header/Footer

Site navigation
Footer: attribution, disclaimers link, last updated

6. LuxuryPurchaseCard

Props: luxury purchase, array of comparisons
Shows: item, cost, what it could have funded
Sources cited


STYLING & DESIGN (MUI v7)
Theme Configuration:

Dark mode by default
Primary color: Deep blue (#1976d2) or similar
Background: Very dark (#0a0a0a)
Paper/Cards: Slightly lighter (#1a1a1a)
Text: High contrast whites/grays
Accent colors:

Green for positive daily changes
Red for negative daily changes



Typography:

Clean, professional sans-serif
Large numbers for wealth (emphasis)
Smaller text for sources/descriptions
Proper hierarchy (h1, h2, body, caption)

Layout:

Mobile-first responsive
Use MUI breakpoints (xs, sm, md, lg, xl)
Container with max-width
Proper spacing/padding
Professional dashboard aesthetic, not "ranty" or "angry"

Data Visualization:

Clean charts (Recharts with custom styling)
Clear labels, tooltips
Accessible color choices


BACKEND LOGIC
Database Connection:

Create singleton connection pool
Use environment variable for DATABASE_URL
Proper error handling
Helper functions for common queries

Query Functions Needed:
For Homepage:

getCurrentTopBillionaires(limit) - Get latest snapshots for top N ranked
getAggregateStats() - Calculate total wealth, get sample comparisons
getComparisonCostsForAggregate() - Select 4-6 good comparisons for display

For Individual Page:

getBillionaireBySlug(slug) - Get profile
getBillionaireHistory(id, days) - Get N days of snapshots
getCalculatedComparisons(id, date) - Get all comparisons for latest date
getLuxuryPurchases(id) - Get verified purchases
getLuxuryComparisons(purchaseId) - Get what purchase could have funded

For About:

getActiveDisclaimers() - Get all disclaimers, ordered

For Cron:

upsertBillionaire(data) - Insert or update billionaire
insertDailySnapshot(data) - Insert snapshot
calculateAndStoreComparisons() - Run all comparison calculations
logUpdateMetadata(data) - Log update attempt

Calculation Logic:
Comparison Calculation:
For each billionaire:
  net_worth_millions = latest snapshot net_worth
  threshold_millions = site_config.wealth_threshold / 1,000,000
  usable_wealth_millions = max(0, net_worth_millions - threshold_millions)
  usable_wealth_dollars = usable_wealth_millions * 1,000,000
  
  For each active comparison_cost:
    quantity = floor(usable_wealth_dollars / cost.cost)
    
    Insert into calculated_comparisons:
      (billionaire_id, comparison_cost_id, calculation_date, 
       net_worth_used, quantity)
Luxury Comparison Calculation:
For each luxury_purchase:
  purchase_cost_dollars = luxury_purchase.cost
  
  For each active comparison_cost:
    quantity = floor(purchase_cost_dollars / cost.cost)
    
    Insert into luxury_comparisons:
      (luxury_purchase_id, comparison_cost_id, quantity)

DATA ACCURACY & CITATIONS
Every data point must be traceable:

Billionaire wealth: Links to Forbes profile, timestamp
Comparison costs: Source name, URL, last verified date, region
All numbers: Include source in UI (small text below)

Homepage footer should say:
"Data from Forbes Real-Time Billionaires (via komed3/rtb-api). Comparison costs from [list sources]. Last updated: [timestamp]. See About page for full methodology."
Individual pages:
Each comparison shows:

Source name (e.g., "charity: water (2024)")
Clickable link to source
Region applicability

About page:
Full methodology explaining:

How net worth is calculated (Forbes methodology)
Why $10M threshold (comfortable living for life)
How comparison costs are verified
Update frequency
Data limitations


SECURITY

For Cron Endpoint:

Protected by secret token (CRON_SECRET in env vars)
Check Authorization header before executing
Log all access attempts
Rate limiting if possible

For Database:

Connection string in environment variables only
Restrict database access by IP if possible
Regular backups
No PII stored anywhere


ERROR HANDLING
Database Queries:

Wrap in try/catch
Log errors to console/monitoring
Return graceful fallbacks to frontend
Update metadata logs with failures

API Fetching (Forbes/komed3):

Handle network failures
Handle API changes/downtime
Log to update_metadata with status "failed"
Don't crash entire update if one billionaire fails

Frontend:

Loading states (MUI Skeleton or CircularProgress)
Error boundaries for React errors
Graceful fallbacks if data missing
User-friendly error messages


PERFORMANCE OPTIMIZATION
Database:

Proper indexes on all foreign keys and query columns
Connection pooling
Avoid N+1 queries (use JOINs)

Next.js:

Server Components for data fetching (no client-side API calls)
Revalidation strategy (hourly for most pages)
Static generation where possible
Image optimization (if using photos)

Caching:

Database query results cached by Next.js
Consider Redis if traffic grows
CDN caching via Vercel


DEPLOYMENT STEPS
1. Database Setup:

Create new AWS RDS PostgreSQL instance
Run schema creation (all CREATE TABLE statements)
Set up connection (get DATABASE_URL)
Test connection locally

2. Initial Seed:

Run seed script to populate database
Verify all tables have data
Check that calculations work

3. Next.js App:

Build all pages and components
Test locally with real database
Verify all queries work
Check responsive design

4. Vercel Deployment:

Create new Vercel project
Connect GitHub repo (new repo, private)
Add environment variables:

DATABASE_URL
CRON_SECRET


Configure vercel.json for cron
Deploy

5. Domain Setup:

Point domain to Vercel
Enable SSL
Test live site

6. Monitoring:

Check cron runs successfully (view logs)
Verify daily updates work
Monitor database size
Set up alerts for failures


FILE STRUCTURE
/
├── app/
│   ├── layout.tsx (MUI theme provider, global layout)
│   ├── page.tsx (homepage)
│   ├── [slug]/
│   │   └── page.tsx (individual billionaire)
│   ├── about/
│   │   └── page.tsx (about/disclaimers)
│   └── api/
│       └── cron/
│           └── update-billionaires/
│               └── route.ts (daily update endpoint)
│
├── components/
│   ├── BillionaireCard.tsx
│   ├── WealthChart.tsx
│   ├── ComparisonTable.tsx
│   ├── AggregateStats.tsx
│   ├── Header.tsx
│   ├── Footer.tsx
│   └── LuxuryPurchaseCard.tsx
│
├── lib/
│   ├── db.ts (database connection pool, helpers)
│   ├── theme.ts (MUI dark theme config)
│   └── queries/
│       ├── billionaires.ts (all billionaire queries)
│       ├── comparisons.ts (comparison queries)
│       └── config.ts (site config queries)
│
├── scripts/
│   └── seed-initial-data.ts (one-time seed script)
│
├── types/
│   ├── billionaire.ts (TypeScript interfaces)
│   ├── comparison.ts
│   └── database.ts
│
├── public/
│   └── (static assets if needed)
│
├── .env.local (local env vars, not committed)
├── .env.example (template for env vars)
├── vercel.json (cron configuration)
├── package.json
├── tsconfig.json
└── next.config.js

ENVIRONMENT VARIABLES
Create .env.local (not committed to git):
DATABASE_URL=postgresql://user:pass@host:5432/wealthobservatory
CRON_SECRET=random_secure_string_here
NODE_ENV=development
Create .env.example (committed to git):
DATABASE_URL=postgresql://user:pass@host:5432/dbname
CRON_SECRET=your_secret_here
NODE_ENV=production

PORT CONFIGURATION
Frontend (Next.js):

Must run on port 3003 (not default 3000)
Configure in package.json scripts or Next.js config

Database (PostgreSQL):

Must NOT use port 5432 (conflicts with other projects)
Use port 5433 (or any non-5432 port)
Configure in DATABASE_URL connection string


Implementation Notes for Claude Code:
1. Next.js Development Server:
Update package.json scripts:
json"scripts": {
  "dev": "next dev -p 3003",
  "start": "next start -p 3003"
}
```

**2. Database Connection:**
Ensure DATABASE_URL uses custom port:
```
DATABASE_URL=postgresql://user:pass@localhost:5433/wealthobservatory
```

**3. Environment Variables:**
Update `.env.example` to show correct port:
```
DATABASE_URL=postgresql://user:pass@localhost:5433/dbname
4. Documentation:
Add note in README that this project runs on port 3003 to avoid conflicts with other local projects.

TESTING CHECKLIST
Before launch, verify:
Database:

 All tables created
 Indexes exist
 Seed script runs successfully
 Relationships/foreign keys work
 Queries return correct data

Data Updates:

 Cron endpoint works (test manually first)
 Forbes data fetches correctly
 Billionaires upsert properly
 Snapshots insert without duplicates
 Comparisons calculate correctly
 Metadata logs properly
 Handles API failures gracefully

Frontend:

 Homepage loads with real data
 Individual pages work for all billionaires
 Charts render correctly (30 days)
 All comparisons show with sources
 About page displays disclaimers
 Mobile responsive on all pages
 Dark theme looks good
 Links work (Forbes profiles, sources)
 Loading states work
 Error states work (if data missing)

Performance:

 Pages load in <2 seconds
 No N+1 queries
 Caching works (revalidation)
 Database queries optimized

Security:

 Cron endpoint requires auth
 Database credentials not exposed
 WHOIS privacy enabled
 No PII stored


POST-LAUNCH TASKS
Week 1:

Monitor cron job runs daily
Check for any data issues
Verify accuracy of comparisons
Watch for API failures

Week 2:

Add luxury purchases (manual research)
Refine comparison selection (A/B test which ones resonate)
Consider adding more billionaires (top 100?)

Month 1:

Analytics (basic, privacy-respecting)
User feedback collection
Performance optimization
Consider adding features:

Historical trends (winners/losers this month)
Industry breakdowns
Country comparisons




SUMMARY FOR CLAUDE CODE
Claude Code should:

Set up Next.js 14 project with TypeScript, MUI v7, Recharts
Create all database tables per schema above
Build database utilities (connection pool, query helpers)
Create query functions for all data needs (homepage, individual, about, cron)
Build initial seed script to populate database from komed3
Build cron API route for daily updates with comparison calculations
Create all frontend pages:

Homepage with aggregate stats + top 50 grid
Individual billionaire pages with charts + comparisons
About page with disclaimers


Create all components (cards, charts, tables, etc.)
Configure MUI dark theme
Set up vercel.json for cron scheduling
Make everything mobile responsive
Include proper TypeScript types for all data structures
Add loading and error states
Format all numbers properly (billions, millions, with commas)
Cite all sources visibly on frontend
Make it look professional, like a data dashboard, not a rant site

The end result should be:

A working Next.js app that connects to PostgreSQL
All pages render with real data
Daily cron job updates data automatically
Clean, professional, dark-themed UI
All data sourced and cited
Mobile responsive
Ready to deploy to Vercel