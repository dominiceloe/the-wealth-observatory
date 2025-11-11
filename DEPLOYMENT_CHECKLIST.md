# Deployment Checklist

## Pre-Deployment

- [ ] All tests passing locally
- [ ] Database migrations run on production DB
- [ ] Initial seed completed on production DB
- [ ] Environment variables configured in Vercel
- [ ] vercel.json cron configuration verified
- [ ] Build succeeds locally (`npm run build`)
- [ ] No TypeScript errors
- [ ] All dependencies installed
- [ ] .env.production.template reviewed

## Deployment

- [ ] Push to main branch
- [ ] Vercel deployment succeeds
- [ ] No build errors in Vercel logs
- [ ] Deployment preview tested

## Post-Deployment Verification

- [ ] Homepage loads without errors
- [ ] All billionaire pages accessible
- [ ] About page loads
- [ ] Images display correctly
- [ ] Database queries work
- [ ] Health check endpoint responds (`/api/health`)
- [ ] Manual cron trigger works
- [ ] First scheduled cron runs successfully
- [ ] No console errors in production
- [ ] Mobile responsive
- [ ] Performance acceptable (Lighthouse >90)

## Monitoring Setup

- [ ] Uptime monitoring configured (UptimeRobot/Pingdom)
- [ ] Error alerts set up
- [ ] Database monitoring enabled (RDS Performance Insights)
- [ ] Cron job logs monitored
- [ ] CloudWatch alarms configured

## Optional Enhancements

- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Analytics enabled (Vercel Analytics)
- [ ] SEO verified (sitemap, robots.txt)
- [ ] Error tracking (Sentry)

## Environment Variables to Set in Vercel

| Name | Description | Example |
|------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `CRON_SECRET` | Cron authentication secret | Generate with `openssl rand -base64 32` |
| `NODE_ENV` | Node environment | `production` |
| `NEXT_PUBLIC_URL` | Public site URL | `https://your-domain.vercel.app` |

## Troubleshooting

### Build Failures

If build fails:
1. Clear node_modules: `rm -rf node_modules package-lock.json`
2. Reinstall: `npm install`
3. Test build locally: `npm run build`
4. Check TypeScript errors: `npx tsc --noEmit`

### Database Connection Issues

If database connection fails:
1. Verify DATABASE_URL is correct
2. Check RDS security group allows Vercel IPs
3. Test connection from local machine
4. Verify SSL requirements

### Cron Job Not Running

If cron doesn't trigger:
1. Verify cron is registered in Vercel dashboard
2. Check execution logs in Vercel
3. Test manual trigger with Authorization header
4. Verify CRON_SECRET matches

## Manual Cron Trigger

To manually trigger the cron job for testing:

```bash
curl -X GET https://your-domain.vercel.app/api/cron/update-billionaires \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Expected response:
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

## Vercel Dashboard Links

- Project Settings: https://vercel.com/[your-team]/[project]/settings
- Environment Variables: https://vercel.com/[your-team]/[project]/settings/environment-variables
- Cron Jobs: https://vercel.com/[your-team]/[project]/settings/crons
- Deployments: https://vercel.com/[your-team]/[project]
- Logs: https://vercel.com/[your-team]/[project]/logs

## Next Steps After Deployment

1. Monitor first cron job execution
2. Verify data updates daily
3. Set up backup monitoring
4. Configure domain (if applicable)
5. Enable analytics (if desired)
6. Set up error tracking
7. Document any issues and solutions
