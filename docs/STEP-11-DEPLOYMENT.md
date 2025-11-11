# Step 11: Deployment to Vercel

## Objective
Deploy the application to Vercel with proper environment variables, cron configuration, and monitoring.

## Prerequisites
- Vercel account created
- GitHub repository created and pushed
- AWS RDS PostgreSQL database running
- Domain name (optional, can use vercel.app subdomain)

## Tasks

### 1. Prepare for Production

#### Update Environment Variables

Create `.env.production` template (don't commit with real values):

```env
DATABASE_URL=postgresql://user:password@host:5432/wealthobservatory
CRON_SECRET=your_production_secret_here
NODE_ENV=production
NEXT_PUBLIC_URL=https://your-domain.com
```

#### Optimize Next.js Config

Update `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Image optimization
  images: {
    domains: [
      'specials-images.forbesimg.com',
      'imageio.forbes.com',
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // Experimental features
  experimental: {
    optimizeCss: true,
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

#### Verify Vercel Configuration

Ensure `vercel.json` is correct:

```json
{
  "crons": [
    {
      "path": "/api/cron/update-billionaires",
      "schedule": "0 14 * * *"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### 2. Set Up AWS RDS Database for Production

#### Create Production Database

```bash
# Connect to RDS instance
psql -h your-rds-endpoint.amazonaws.com -U your-user -d postgres

# Create database
CREATE DATABASE wealthobservatory_prod;

# Grant permissions
GRANT ALL PRIVILEGES ON DATABASE wealthobservatory_prod TO your_user;
```

#### Run Schema Migration

```bash
psql -h your-rds-endpoint.amazonaws.com -U your-user -d wealthobservatory_prod -f scripts/schema.sql
```

#### Run Initial Seed

Update `.env.local` temporarily with production DATABASE_URL, then:

```bash
npm run seed
```

Or run seed script directly on production after deployment.

#### Configure RDS Security

1. **Security Group**: Allow inbound PostgreSQL (5432) from:
   - Vercel IPs (see Vercel documentation for IP ranges)
   - Your local IP (for management)

2. **Enable SSL**: Require SSL connections
   ```sql
   ALTER SYSTEM SET ssl = on;
   ```

3. **Backup Configuration**:
   - Enable automated backups (7-30 days retention)
   - Set backup window during low-traffic hours

### 3. Deploy to Vercel

#### Connect Repository

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Select the project

#### Configure Build Settings

- **Framework Preset**: Next.js
- **Root Directory**: `./` (or your project root)
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)

#### Add Environment Variables

In Vercel dashboard, add:

| Name | Value | Environment |
|------|-------|-------------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` | Production |
| `CRON_SECRET` | Generate strong random string | Production |
| `NODE_ENV` | `production` | Production |
| `NEXT_PUBLIC_URL` | `https://your-domain.vercel.app` | Production |

Generate secure CRON_SECRET:
```bash
openssl rand -base64 32
```

#### Deploy

Click "Deploy"

Vercel will:
1. Clone repository
2. Install dependencies
3. Run build
4. Deploy to production
5. Register cron job

### 4. Post-Deployment Setup

#### Verify Deployment

Visit: `https://your-project.vercel.app`

Check:
- [ ] Homepage loads
- [ ] Billionaire cards display
- [ ] Individual pages work
- [ ] About page loads
- [ ] Images load
- [ ] No console errors

#### Test Cron Job

Manually trigger cron:

```bash
curl -X GET https://your-project.vercel.app/api/cron/update-billionaires \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Check response:
```json
{
  "success": true,
  "recordsCreated": 0,
  "recordsUpdated": 50,
  "recordsFailed": 0,
  "comparisonsCreated": 700,
  "executionTimeMs": 12543
}
```

#### Verify Cron Schedule

In Vercel dashboard:
1. Go to project → Settings → Cron Jobs
2. Verify cron is registered
3. Check execution logs after first scheduled run

### 5. Domain Configuration (Optional)

#### Add Custom Domain

1. Vercel dashboard → Domains
2. Add your domain (e.g., `wealthobservatory.com`)
3. Follow DNS instructions

**DNS Records:**
- A record: Point to Vercel IP
- CNAME record: Point `www` to `cname.vercel-dns.com`

#### Enable SSL

Vercel automatically provisions SSL certificates via Let's Encrypt.

#### Redirect www to apex (or vice versa)

In Vercel settings, configure:
- `www.wealthobservatory.com` → `wealthobservatory.com`

### 6. Monitoring and Analytics

#### Set Up Vercel Analytics (Optional)

```bash
npm install @vercel/analytics
```

Add to `app/layout.tsx`:

```typescript
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

#### Set Up Error Monitoring (Optional)

Consider integrating:
- **Sentry**: Error tracking
- **LogRocket**: Session replay
- **Vercel Logs**: Built-in logging

#### Database Monitoring

- Enable RDS Performance Insights
- Set up CloudWatch alarms for:
  - High CPU usage
  - Low storage space
  - Connection count
  - Failed queries

### 7. Create Health Check Endpoint

Create `app/api/health/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { healthCheck } from '@/lib/db-helpers';
import { getConfigValue } from '@/lib/queries/config';

export async function GET() {
  try {
    // Check database connection
    const dbHealthy = await healthCheck();

    if (!dbHealthy) {
      return NextResponse.json(
        { status: 'unhealthy', message: 'Database connection failed' },
        { status: 503 }
      );
    }

    // Check last update time
    const lastUpdate = await getConfigValue('last_manual_update');
    const lastUpdateDate = lastUpdate ? new Date(lastUpdate) : null;
    const hoursSinceUpdate = lastUpdateDate
      ? (Date.now() - lastUpdateDate.getTime()) / (1000 * 60 * 60)
      : null;

    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      lastUpdate: lastUpdateDate?.toISOString(),
      hoursSinceUpdate: hoursSinceUpdate?.toFixed(1),
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', message: 'Health check failed' },
      { status: 503 }
    );
  }
}
```

Test: `https://your-project.vercel.app/api/health`

### 8. Set Up Uptime Monitoring

Use external service to monitor uptime:

**Options:**
- **UptimeRobot** (free): https://uptimerobot.com
- **Pingdom**: https://pingdom.com
- **Better Uptime**: https://betteruptime.com

Monitor:
- Homepage: `https://your-domain.com`
- API Health: `https://your-domain.com/api/health`
- Cron endpoint (daily check)

### 9. Create Deployment Checklist

Create `DEPLOYMENT_CHECKLIST.md`:

```markdown
# Deployment Checklist

## Pre-Deployment
- [ ] All tests passing locally
- [ ] Database migrations run on production DB
- [ ] Initial seed completed on production DB
- [ ] Environment variables configured in Vercel
- [ ] vercel.json cron configuration verified
- [ ] Build succeeds locally (`npm run build`)

## Deployment
- [ ] Push to main branch
- [ ] Vercel deployment succeeds
- [ ] No build errors in Vercel logs

## Post-Deployment Verification
- [ ] Homepage loads without errors
- [ ] All billionaire pages accessible
- [ ] About page loads
- [ ] Images display correctly
- [ ] Database queries work
- [ ] Health check endpoint responds
- [ ] Manual cron trigger works
- [ ] First scheduled cron runs successfully

## Monitoring Setup
- [ ] Uptime monitoring configured
- [ ] Error alerts set up
- [ ] Database monitoring enabled
- [ ] Cron job logs monitored

## Optional
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Analytics enabled
- [ ] SEO verified (sitemap, robots.txt)
```

## Troubleshooting

### Build Failures

**Error: Module not found**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Error: TypeScript compilation errors**
```bash
# Run type check locally
npm run build
# Fix all TypeScript errors before pushing
```

### Database Connection Issues

**Error: Connection timeout**
- Check RDS security group allows Vercel IPs
- Verify DATABASE_URL is correct
- Test connection from local machine

**Error: Too many connections**
- Reduce connection pool size in `lib/db.ts`
- Check for connection leaks (unclosed connections)

### Cron Job Not Running

1. Verify cron is registered in Vercel dashboard
2. Check execution logs in Vercel
3. Test manual trigger with correct Authorization header
4. Verify CRON_SECRET matches in code and Vercel env vars

### Performance Issues

**Slow page loads**
- Enable Vercel Analytics to identify bottlenecks
- Check database query performance
- Add more indexes if needed
- Consider caching strategies

**Database slow queries**
- Enable RDS Performance Insights
- Review and optimize slow queries
- Add missing indexes

## Verification Checklist

- [ ] Application deployed to Vercel
- [ ] Homepage accessible at production URL
- [ ] All pages load correctly
- [ ] Database connection works
- [ ] Cron job registered
- [ ] Manual cron trigger works
- [ ] Environment variables set
- [ ] SSL enabled
- [ ] Health check endpoint works
- [ ] Uptime monitoring configured
- [ ] No console errors in production
- [ ] Images load correctly
- [ ] Mobile responsive
- [ ] Performance acceptable (Lighthouse >90)

## Next Step
Proceed to `STEP-12-TESTING-VALIDATION.md` for comprehensive testing and validation procedures.
