# Clinical Food Log

Privacy-aware IBS/IBD food and symptom logging app for patients, clinicians, and admins.

## Current Scope

- Multi-role app: **Patient**, **Clinician**, **Admin**
- Food/symptom/context logging with data-isolation and role guards
- Food normalization (Swedish + English) with canonical mapping
- Clinician analytics (possible associations only, never causation)
- Symptom reminders (custom time, snooze, quiet hours)
- Favorite/frequent food shortcuts in meal logging
- Medication schedule + taken/missed dose tracking
- Hydration tracking (water logs)
- Stool pattern (Bristol) trend charts
- Shared clinician/patient care plan
- Patient goal tracking + smart nudges
- Duplicate-entry detection for key log flows
- Admin onboarding for clinician account creation + assignment
- Admin research export with optional de-identification mode

## Setup

```bash
npm install
cp .env.example .env.local
npm run db:push
npm run db:seed
npm run dev
```

Open http://localhost:3000

## Demo Accounts

| Role      | Email             | Password |
|-----------|-------------------|----------|
| Patient   | anna@example.com  | password |
| Patient   | bjorn@example.com | password |
| Clinician | doctor@example.com| password |
| Admin     | admin@example.com | password |

## Commands

```bash
npm run dev        # Start development server
npm run build      # Production build
npm run lint       # Typecheck fallback when ESLint unavailable
npm test           # Run tests
npm run db:push    # Sync Prisma schema to DB
npm run db:seed    # Re-seed database with demo data
npm run db:studio  # Open Prisma Studio
```

## Architecture

### Stack

- **Next.js 14** (App Router) + TypeScript
- **NextAuth v4** credentials auth + JWT sessions
- **Prisma + SQLite** (`prisma/dev.db`)
- **Tailwind CSS**
- **Jest + ts-jest** for unit tests

### Roles and Access

- **Patient**: dashboard, timeline, meal/symptom/context logs, reminders, hydration, medication, goals, care plan
- **Clinician**: assigned patient list + patient detail analytics + shared care plan editing
- **Admin**: clinician onboarding and research export tools

Middleware (`src/middleware.ts`) enforces route-level role restrictions.

### Route Groups

```text
/signin                      -> (auth)
/dashboard                   -> (patient)
/timeline                    -> (patient)
/logs/*                      -> (patient)
/hydration                   -> (patient)
/medication                  -> (patient)
/care-plan                   -> (patient)
/goals                       -> (patient)
/settings/reminders          -> (patient)
/patients                    -> (clinician)
/patients/[id]               -> (clinician)
/admin/onboarding            -> (admin)
/admin/research              -> (admin)
```

## Key Features

### Logging + Normalization

- Meal logging normalizes raw foods into canonical foods with confidence scores.
- Favorite/frequent suggestions appear in meal form shortcuts.
- Duplicate detection blocks probable accidental duplicate submissions (`409`).

### Analytics + Trends

- Food trigger analysis from high-symptom windows (`triggers.ts`)
- Daily symptom averages (`averages.ts`)
- Adherence rate over rolling windows (`adherence.ts`)
- Goal progress calculations (`goals.ts`)
- Smart nudges (missing symptom logs, stress trend, missed meds, hydration) (`nudges.ts`)

### Medication and Hydration

- Medication schedules (time-of-day) with taken/missed logs
- Missed-dose summary indicators
- Water intake logging + daily total trend

### Shared Care Plan

- Single shared patient-clinician care plan per assignment
- Editable by both parties
- Tracks last updater role

### Admin Tools

- Create clinician accounts and assign patient panels
- Generate research export payloads
- Optional de-identification mode masks patient identifiers

## Data Model Additions

Beyond core logging models, schema includes:

- `SymptomReminder`
- `FavoriteFood`
- `MedicationSchedule`
- `MedicationLog`
- `WaterLog`
- `CarePlan`
- `PatientGoal`
- `AdminProfile`

See [prisma/schema.prisma](./prisma/schema.prisma).

## API Overview

New API groups:

- `/api/reminders`
- `/api/foods/suggestions`
- `/api/foods/favorites`
- `/api/logs/water`
- `/api/medication/schedules`
- `/api/medication/logs`
- `/api/goals`
- `/api/goals/progress`
- `/api/care-plan/[patientId]`
- `/api/admin/onboarding`
- `/api/admin/research-export`

## Seed Data

Seed now creates:

- 4 users (2 patients, 1 clinician, 1 admin)
- 21-day meal/symptom/context history for both patients
- hydration logs, medication schedules/logs, reminders
- patient goals and clinician-shared care plans

## Testing

```bash
npm test
```

- `tests/food-normalization.test.ts`
- `tests/analytics.test.ts`
- `tests/api-access.test.ts`
