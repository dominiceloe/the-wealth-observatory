# Step 01: Project Setup

## Objective
Initialize the Next.js 14 project with TypeScript, install all dependencies, and configure the development environment.

## Prerequisites
- Node.js 18+ installed
- Git installed
- PostgreSQL 14+ available (will configure connection later)

## Tasks

### 1. Initialize Next.js Project
```bash
npx create-next-app@latest the-wealth-observatory --typescript --tailwind --app --src-dir=false --import-alias="@/*"
cd the-wealth-observatory
```

Configuration choices:
- ✅ TypeScript
- ✅ ESLint
- ❌ Tailwind CSS (we're using MUI instead)
- ✅ App Router
- ❌ src/ directory
- ✅ Import alias (@/*)

### 2. Install Core Dependencies

```bash
# UI Framework
npm install @mui/material@^7 @emotion/react @emotion/styled

# Charts
npm install recharts

# Database
npm install pg
npm install --save-dev @types/pg

# Date utilities
npm install date-fns
```

### 3. Configure Port Settings

Update `package.json`:
```json
{
  "scripts": {
    "dev": "next dev -p 3003",
    "build": "next build",
    "start": "next start -p 3003",
    "lint": "next lint"
  }
}
```

### 4. Set Up Environment Variables

Create `.env.local` (NOT committed):
```
DATABASE_URL=postgresql://user:pass@localhost:5433/wealthobservatory
CRON_SECRET=generate_random_secure_string_here
NODE_ENV=development
```

Create `.env.example` (committed to git):
```
DATABASE_URL=postgresql://user:pass@localhost:5433/dbname
CRON_SECRET=your_secret_here
NODE_ENV=production
```

### 5. Update `.gitignore`

Ensure these are present:
```
# Environment
.env.local
.env*.local

# Dependencies
node_modules/

# Next.js
.next/
out/

# Debug
npm-debug.log*
```

### 6. Configure TypeScript

Update `tsconfig.json` to enable strict mode:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    // ... rest of default config
  }
}
```

### 7. Create Directory Structure

```bash
mkdir -p app/api/cron/update-billionaires
mkdir -p components
mkdir -p lib/queries
mkdir -p scripts
mkdir -p types
mkdir -p public
```

### 8. Create Basic Type Definitions

Create `types/database.ts` with placeholder:
```typescript
// Database types will be defined in Step 2
export {};
```

### 9. Test Development Server

```bash
npm run dev
```

Visit `http://localhost:3003` - should see default Next.js page.

## Verification Checklist

- [ ] Project runs on port 3003
- [ ] TypeScript strict mode enabled
- [ ] All dependencies installed without errors
- [ ] Environment files created
- [ ] Directory structure created
- [ ] `.gitignore` configured
- [ ] Development server starts successfully

## Next Step
Proceed to `STEP-02-DATABASE-SCHEMA.md` to create PostgreSQL database tables.
