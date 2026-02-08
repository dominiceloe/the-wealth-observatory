# The Wealth Observatory

**Real-time billionaire wealth tracking with charitable cost comparisons.**

Visualizing what concentrated wealth could fund—water wells, schools, meals, and more—using verified data from Forbes and leading humanitarian organizations.

---

## 🎯 Quick Start

```bash
# Clone and install
git clone https://github.com/yourusername/the-wealth-observatory.git
cd the-wealth-observatory
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL

# Set up database and start
npm run seed
npm run dev

# Visit http://localhost:3003
```

---

## 🏗️ Architecture

**Next.js 14 App Router** with server-side rendering, PostgreSQL database, and automated daily updates.

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict mode) |
| UI | Material-UI v6 |
| Charts | Recharts |
| Database | PostgreSQL 14 (Neon serverless / AWS RDS) |
| Hosting | Vercel |
| Automation | Vercel Cron Jobs (daily at 14:00 UTC) |

---

## ✨ Features

### 📊 Real-Time Wealth Tracking
- **Top 50 billionaires** with live net worth from Forbes
- **Daily snapshots** stored for historical analysis
- **30-day wealth charts** on individual profile pages
- **Daily change indicators** (color-coded gains/losses)

### 🌍 Charitable Cost Comparisons
- **Region toggle:** Developing World vs. United States costs
- **Pre-computed comparisons** updated daily via cron
- **Verified sources:** charity: water, World Food Programme, Room to Read, buildOn, USDA
- **$10M threshold:** Calculations show what wealth *above* a comfortable lifetime reserve could fund

### 👤 Individual Billionaire Profiles
- Profile photo, rank, country, industries
- 30-day wealth history line chart
- Comprehensive comparison table grouped by category
- Luxury purchases section (when available)
- Full data source citations

### 🔄 Automated Updates
- **Daily cron job** fetches latest Forbes data
- **Upsert logic** updates profiles and creates snapshots
- **Pre-computed comparisons** for fast page loads
- **Rate limiting** and error handling built in

---

## 📊 Data Model

### Wealth Calculation

```
Usable Wealth = Net Worth - $10,000,000
Quantity = Usable Wealth / Comparison Cost
```

The **$10 million threshold** represents sufficient wealth for a comfortable lifetime. All comparisons show what could be funded from wealth above this amount.

### Database Schema (10 Tables)

| Table | Purpose |
|-------|---------|
| `billionaires` | Profiles (name, slug, country, industries, bio) |
| `daily_snapshots` | Historical wealth tracking per day |
| `comparison_costs` | Verified charitable/humanitarian costs |
| `calculated_comparisons` | Pre-computed daily comparisons |
| `luxury_purchases` | Verified luxury purchases |
| `luxury_comparisons` | What luxury items could have funded |
| `data_sources` | Track data provenance |
| `update_metadata` | Audit trail for all updates |
| `disclaimers` | Editable content (methodology, legal) |
| `site_config` | Dynamic configuration |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### Installation

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
```

### Environment Variables

```bash
# .env.local
DATABASE_URL=postgresql://user:pass@localhost:5433/wealthobservatory
CRON_SECRET=your_secret_here_min_32_chars
NODE_ENV=development
```

### Database Setup

```bash
# Create schema and seed initial data
npm run seed

# Verify connection
npm run test:db
```

### Development

```bash
npm run dev
# Opens at http://localhost:3003
```

---

## 🛠️ Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on port 3003 |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run seed` | Create schema and seed data |
| `npm run test:db` | Test database connection |
| `npm run validate:costs` | Validate comparison costs |

### Project Structure

```
the-wealth-observatory/
├── app/                      # Next.js App Router
│   ├── page.tsx             # Homepage with aggregate stats
│   ├── [slug]/              # Individual billionaire pages
│   │   ├── page.tsx
│   │   ├── loading.tsx      # Loading skeleton
│   │   └── not-found.tsx    # 404 page
│   ├── about/               # Methodology & disclaimers
│   └── api/
│       ├── cron/            # Daily update endpoint
│       └── health/          # Health check
├── components/              # React components
│   ├── BillionaireCard.tsx
│   ├── WealthChart.tsx
│   ├── ComparisonTable.tsx
│   └── RegionToggle.tsx
├── lib/                     # Database & utilities
│   ├── db.ts               # PostgreSQL connection pool
│   ├── formatters.ts       # Number/currency formatting
│   └── queries/            # Modular query functions
├── scripts/                 # Setup & maintenance
│   ├── schema.sql          # PostgreSQL schema
│   └── seed-initial-data.ts
├── types/                   # TypeScript definitions
└── docs/                    # Implementation guides
```

---

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Homepage with aggregate stats |
| `/[slug]` | GET | Individual billionaire page |
| `/about` | GET | Methodology & disclaimers |
| `/api/cron/update-billionaires` | GET | Daily update (Bearer auth) |
| `/api/health` | GET | Health check |

---

## 🚢 Deployment

### Vercel

1. Push to GitHub
2. Import project in Vercel dashboard
3. Set environment variables:
   - `DATABASE_URL` - PostgreSQL connection string
   - `CRON_SECRET` - Secure random string (32+ chars)
4. Deploy

### Cron Configuration

Defined in `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/update-billionaires",
    "schedule": "0 14 * * *"
  }]
}
```

---

## 🔐 Security

- **Bearer token authentication** for cron endpoint
- **Timing-safe comparison** for secret validation
- **Rate limiting** (1 minute minimum between cron runs)
- **Connection pooling** with timeouts
- **Security headers** configured (X-Frame-Options, X-Content-Type-Options)

---

## 📚 Data Sources

| Source | Data |
|--------|------|
| Forbes Real-Time Billionaires | Net worth, rank, daily changes |
| charity: water | Water well costs |
| World Food Programme | Meal costs (developing world) |
| Room to Read | Education program costs |
| buildOn | School construction costs |
| USDA Food Plans | U.S. food costs |
| U.S. Census Bureau | U.S. education spending |

---

## 📄 License

MIT

---

**Built with** Next.js • TypeScript • PostgreSQL • Material-UI • Recharts • Vercel
