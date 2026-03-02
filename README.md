# Clinical Food Log

A privacy-aware IBS/IBD food and symptom logging MVP for patients and clinicians.

## Assumptions

- Analytics are framed as **possible associations**, never causation. No AI diagnosis.
- Two roles only: Patient and Clinician.
- Clinicians are pre-assigned to patients via seed data (no admin UI in MVP).
- Local SQLite database — no external infrastructure required.
- Swedish and English food names are normalized to canonical forms.

## Setup

```bash
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Open http://localhost:3000

## Demo Accounts

| Role      | Email                  | Password |
|-----------|------------------------|----------|
| Patient   | anna@example.com       | password |
| Patient   | bjorn@example.com      | password |
| Clinician | doctor@example.com     | password |

## Commands

```bash
npm run dev        # Start development server
npm run build      # Production build
npm test           # Run tests
npm run db:push    # Sync Prisma schema to DB
npm run db:seed    # Re-seed database with demo data
npm run db:studio  # Open Prisma Studio
```

## Architecture

### Stack
- **Next.js 14** (App Router) + TypeScript
- **NextAuth v4** with credentials provider and JWT sessions
- **Prisma + SQLite** — file-based DB at `prisma/dev.db`
- **Tailwind CSS** — custom components, no UI framework
- **bcryptjs** — password hashing
- **tsx** — TypeScript seed script runner
- **Jest + ts-jest** — unit tests

### Route Groups
```
/signin                    → (auth) group
/dashboard                 → (patient) group [PATIENT only]
/timeline                  → (patient) group [PATIENT only]
/logs/meal/new             → (patient) group
/logs/meal/[id]/edit       → (patient) group
/logs/symptom/new          → (patient) group
/logs/symptom/[id]/edit    → (patient) group
/logs/context/new          → (patient) group
/logs/context/[id]/edit    → (patient) group
/patients                  → (clinician) group [CLINICIAN only]
/patients/[id]             → (clinician) group [CLINICIAN only]
```

Middleware (`src/middleware.ts`) enforces role-based access at the edge.

### Data Flow
1. Patient logs a meal via form → POST `/api/logs/meal`
2. Server runs food normalization pipeline on each food item
3. Canonical foods are upserted into `FoodCanonical` table
4. Analytics queries join meal food items with symptom logs by time window

### Food Normalization Pipeline
Located in `src/lib/food-normalization/`:
1. Lowercase + trim + collapse whitespace
2. Exact synonym dictionary lookup (Swedish + English)
3. Brand detection (Scan, Arla, Felix, Oatly, ICA…) → strip brand, retry lookup
4. Modifier stripping (laktosfri, ekologisk, light…) → retry lookup
5. Levenshtein fuzzy match (similarity ≥ 0.8)
6. Fallback: use normalized input as canonical

Confidence levels: 0.95 exact → 0.85 brand+exact → 0.80 modifier-stripped → 0.65 fuzzy → 0.50 unknown

### Analytics
Located in `src/lib/analytics/`:

- **triggers.ts** — For each high-symptom event (avg score ≥5), find foods eaten in the preceding 24h. Count associations vs total occurrences per food. Min 2 occurrences required.
- **averages.ts** — Daily symptom averages; symptom averages by meal type (±4h window).
- **adherence.ts** — Count distinct days with ≥1 log in the last 21 days.

### Session / Auth
- `getServerSession(authOptions)` in server components and API routes
- `useSession()` in client components
- JWT token carries: `id` (userId), `role`, `profileId`
- Type augmentation in `src/types/next-auth.d.ts`

## Seed Data

**Anna** (anna@example.com): Frequent pasta + coffee eater, clear IBS pattern — high pain/bloating scores on pasta days (alt days), lower on falukorv/potatis days.

**Björn** (bjorn@example.com): More varied diet (lax, kyckling, havregrynsgröt), lower and stable symptom scores.

**Dr. Maria Holm** (doctor@example.com): Assigned to both patients. Can view timelines and analytics for both.

## Tests

```bash
npm test
```

- `tests/food-normalization.test.ts` — exact matches, brand detection, modifier stripping, fuzzy matching, unknown foods, confidence ordering
- `tests/analytics.test.ts` — trigger calculation, daily averages, adherence logic
- `tests/api-access.test.ts` — role-based access control, data isolation
