# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vercount is a website counter service that serves as a replacement for Busuanzi (不蒜子). It tracks page views and unique visitors across websites through a JavaScript client that sends requests to a Next.js API backend.

**Key Architecture:**
- **Frontend**: Next.js 15 with React 19, TypeScript, and Tailwind CSS
- **Backend**: Next.js API routes with middleware for rate limiting and security
- **Database**: PostgreSQL via Drizzle ORM for user/domain management
- **Cache/Counter Storage**: Redis (Upstash) for high-performance counter storage
- **Authentication**: Better Auth with GitHub OAuth
- **Deployment**: Vercel with serverless functions

## Development Commands

```bash
# Development (includes client.js minification and database generation)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint code
pnpm lint

# Database operations
pnpx drizzle-kit generate     # Generate migrations
pnpx drizzle-kit push         # Push schema changes to database
pnpx drizzle-kit studio       # Open Drizzle Studio
```

## Key Components and Architecture

### API Structure
- **`/api/v1/log`**: Legacy API endpoint for counter updates
- **`/api/v2/log`**: New API endpoint with enhanced response format
- **`/api/domains/*`**: Domain verification and management endpoints
- **`/api/auth/[...all]`**: Authentication endpoints

### Client Integration
- **`/src/lib/client.js`**: Main client JavaScript that gets minified and served at `/js`
- **Build process**: Terser minification happens before each dev/build/start command
- **API calls**: Client uses POST requests with browser tokens for security

### Security & Rate Limiting
- **Rate limiting**: Endpoint-level rate limiting (80 requests/minute) implemented in `/src/lib/rate-limit.ts`
- **IP blocking**: Temporary IP blocking system (currently commented out)
- **Browser tokens**: Generated fingerprints to identify legitimate requests
- **Suspicious user agent detection**: Warns about bot/script requests in logs

### Data Storage
- **Redis (KV)**: Used for counter storage via `/src/lib/kv.ts`
- **PostgreSQL**: User accounts, domains, and verification data via Drizzle
- **Counter logic**: `/src/utils/counter.ts` handles increment operations

### Domain Management
- **Domain verification**: Users can claim domains and edit their counter data
- **Verification process**: DNS-based domain verification system
- **User dashboard**: React components in `/src/components/dashboard/`

## Configuration Files

### Environment Variables Required
```bash
# Database
DATABASE_URL="postgresql://..."

# Redis/KV (Upstash)
KV_REST_API_URL="https://..."
KV_REST_API_TOKEN="..."

# OAuth
GITHUB_ID="..."
GITHUB_SECRET="..."
BETTER_AUTH_SECRET="..."
BETTER_AUTH_URL="..."
```

### Important Config Files
- **`next.config.js`**: URL rewrites (/js → /js/client.min.js, /log → /api/v1/log) and CORS headers
- **`drizzle/schema.ts`**: Database schema with User, Domain, Account, Session models
- **`src/lib/rate-limit.ts`**: Rate limiting utility used by API endpoints

## Data Flow

1. **Client Script**: Loaded from `/js` (rewritten to `/js/client.min.js`)
2. **Counter Request**: POST to `/api/v2/log` with URL and browser token
3. **Rate Limiting**: Endpoint checks rate limits and validates requests
4. **API Handler**: Validates URL, updates Redis counters, returns counts
5. **Response**: Client updates DOM elements with counter values

## UI Components

### Design System
- **Tailwind CSS**: Primary styling framework
- **Radix UI**: Accessible component primitives
- **Framer Motion**: Animation library
- **Geist Font**: Typography (mono variant)

### Component Structure
- **`/src/components/ui/`**: Reusable UI components (buttons, dialogs, tables, etc.)
- **`/src/components/dashboard/`**: Dashboard-specific components
- **`/src/components/magicui/`**: Animated components
- **`/src/components/data-table/`**: Table components for analytics

## Development Notes

### Counter ID Support
The client supports both Busuanzi and Vercount element IDs:
- Busuanzi: `busuanzi_value_site_pv`, `busuanzi_value_site_uv`, `busuanzi_value_page_pv`
- Vercount: `vercount_value_site_pv`, `vercount_value_site_uv`, `vercount_value_page_pv`

### API Versioning
- **v1**: Basic counter API (legacy)
- **v2**: Enhanced API with structured responses and better error handling

### Security Considerations
- Endpoint-level rate limiting prevents abuse (80 requests/minute per IP)
- Browser token validation helps identify legitimate traffic
- URL validation prevents invalid protocols (only HTTP/HTTPS allowed)
- Suspicious user agent detection (Python requests, curl, etc.) with logging

### Performance Optimizations
- Client script minification with Terser
- Redis for high-performance counter storage
- Vercel CDN caching for static assets
- Upstash Redis with auto-pipelining enabled