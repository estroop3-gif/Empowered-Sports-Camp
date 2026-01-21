# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Empowered Sports Camp is a multi-tenant sports camp management platform built with Next.js 16 (App Router), TypeScript, Prisma, and AWS services. It supports camp registration, payment processing, staff management, and curriculum tracking across multiple franchise locations (tenants).

## Commands

```bash
# Development
npm run dev                    # Start dev server at http://localhost:3000

# Build & Production
npm run build                  # Build (runs prisma generate && next build)
npm start                      # Start production server

# Database
npx prisma migrate dev --name <name>  # Create migration
npx prisma generate                    # Regenerate Prisma client
npx prisma studio                      # Open database GUI
npm run seed:admin                     # Seed admin data

# Linting
npm run lint                   # Run ESLint
```

## Architecture

### Multi-Tenant Design
- Each organization is a `Tenant` with isolated data (camps, athletes, staff)
- Users can have different roles across tenants via `UserRoleAssignment`
- HQ Admin has visibility across all tenants

### Role-Based Access Control
Six roles with hierarchical permissions: `parent` < `cit_volunteer` < `coach` < `director` < `licensee_owner` < `hq_admin`

Configuration in `src/lib/roles/config.ts` defines:
- Dashboard routes per role
- Navigation items
- Permission checks

### Authentication Flow
1. AWS Cognito handles user authentication (JWT tokens)
2. Tokens stored in HTTP-only cookies
3. Server-side verification via `src/lib/auth/cognito-server.ts`
4. Auth context (`src/lib/auth/context.tsx`) provides user/role/tenant state

### Route Structure
```
app/
├── (auth)/          # Login, register, forgot password
├── (public)/        # Public pages
├── admin/           # HQ Admin dashboard
├── portal/          # Licensee owner portal
├── director/        # Camp director tools
├── coach/           # Coach dashboard
├── dashboard/       # Parent dashboard
├── register/        # Camp registration flow
├── camps/           # Public camp listings
└── api/             # API routes & webhooks
```

### Key Services (src/lib/services/)
- `camps.ts` - Camp CRUD and queries
- `athletes.ts` - Athlete management
- `registrations.ts` - Registration processing
- `payments.ts` - Stripe integration
- `admin-dashboard.ts` - HQ metrics and reporting

### Database
- PostgreSQL via Prisma ORM
- Schema: `frontend/prisma/schema.prisma` (~150 tables)
- Key tables: `Tenant`, `Profile`, `Athlete`, `Camp`, `Registration`, `Payment`
- Generated types: `src/generated/prisma/`

## Key Patterns

### API Routes
```typescript
// app/api/example/route.ts
import { getAuthenticatedUserFromRequest } from '@/lib/auth/cognito-server'

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // ... handle request
}
```

### Protected Pages
```typescript
// Check auth in server component or use middleware
const user = await getAuthenticatedUserFromRequest(request)
if (!user || user.role !== 'hq_admin') redirect('/login')
```

### Database Queries
```typescript
import { prisma } from '@/lib/db/client'

const camps = await prisma.camp.findMany({
  where: { tenantId },
  include: { sessions: true }
})
```

## External Integrations

- **Stripe**: Payment processing with webhook at `/api/payments/stripe-webhook`
- **AWS Cognito**: User authentication
- **AWS S3**: File storage (images, documents)
- **AWS SES**: Email delivery

## Environment Variables

Required in `.env`:
```
DATABASE_URL
AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID
NEXT_PUBLIC_COGNITO_USER_POOL_ID, NEXT_PUBLIC_COGNITO_CLIENT_ID
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
S3_BUCKET_NAME
```

## Design References

- Brand guidelines and UI patterns: `/DESIGN_DOCUMENT.md`
- Testing checklist: `/frontend/TESTING_CHECKLIST.md`
