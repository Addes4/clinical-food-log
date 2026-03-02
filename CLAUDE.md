# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

MVP is fully implemented. See README.md for detailed architecture documentation.

## Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm test             # Run Jest tests (64 tests across 3 suites)
npx prisma db push   # Sync schema changes to SQLite
npm run db:seed      # Re-seed with demo data (DATABASE_URL env required)
npm run db:studio    # Open Prisma Studio
```

## Key File Paths

```
prisma/schema.prisma               # Data model (String fields for SQLite enums)
prisma/seed.ts                     # Demo seed (3 users, 21 days of logs)
src/lib/db.ts                      # Prisma singleton
src/lib/auth.ts                    # NextAuth authOptions
src/lib/api-helpers.ts             # requireSession() shared helper
src/lib/food-normalization/        # Normalization pipeline + synonym dict
src/lib/analytics/                 # triggers.ts, averages.ts, adherence.ts
src/types/index.ts                 # Shared TypeScript types
src/types/next-auth.d.ts           # Session/JWT type augmentation
src/middleware.ts                  # withAuth middleware (edge route guards)
src/app/(auth)/signin/page.tsx     # Login page
src/app/(patient)/                 # Patient dashboard, timeline, log forms
src/app/(clinician)/               # Clinician patient list + analytics view
src/app/api/                       # All API routes (REST)
tests/                             # Jest unit tests
```

## Architecture Notes

- SQLite does not support Prisma enums → all enums are stored as String with app-level validation
- Food normalization runs server-side on POST/PUT meal logs; canonical foods are upserted
- DATABASE_URL must be set in .env.local (file:./dev.db) or as env var for seed/prisma commands
- Session carries: id (userId), role, profileId — profileId is PatientProfile.id or ClinicianProfile.id
- Route groups: (auth), (patient), (clinician) — layouts enforce role guards server-side

## Project rules
- Build only the requested MVP scope.
- Do not add extra features.
- Prefer simple deterministic implementations.
- Keep code readable and maintainable.
- Use TypeScript everywhere possible.
- Add tests for business logic and access control.
- Keep UI minimal and clean.
- Document assumptions in README.

## Product philosophy
This app is a privacy-aware IBS/IBD food and symptom logging MVP for patients and clinicians.
Analytics must be framed as possible associations, never causation.
The product should optimize for clarity, low friction, and structured data capture.

## Technical preferences
- Next.js
- TypeScript
- Prisma
- Tailwind
- Simple local database for MVP if practical
- Seed realistic demo data

## Non-goals
- No AI diagnosis
- No advanced ML
- No barcode/image integrations
- No mobile app
- No EHR integration