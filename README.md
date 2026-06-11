# Wearwise

AI-powered wardrobe stylist — scan your clothes, get daily outfit suggestions.

## Stack

| Layer | Tech |
|-------|------|
| Mobile | React Native + Expo SDK 54 (expo-router v4) |
| Backend | Node.js + Express + TypeScript |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| Storage | Cloudflare R2 (S3-compatible) |
| AI tagging | GPT-4o-mini Vision |
| Outfit engine | Claude (claude-sonnet-4-20250514) |

## Project structure

```
wearwise/
├── app/          React Native app (Expo)
├── backend/      Express API server
└── shared/       Shared TypeScript types
```

## Local development

### Prerequisites
- Node.js 20+
- Expo Go (SDK 54) on your phone
- Supabase project + Cloudflare R2 bucket
- OpenAI API key + Anthropic API key

### Setup

```bash
# Install all workspace dependencies
npm install

# Configure backend environment
cp backend/.env.example backend/.env
# Fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY,
# ANTHROPIC_API_KEY, R2_*, JWT_SECRET

# Configure app environment
cp app/.env.example app/.env
# Fill in EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY,
# EXPO_PUBLIC_API_URL
```

### Run

```bash
# Start backend
npm run backend     # from repo root, or: cd backend && npm run dev

# Start Expo dev server
npm run app         # from repo root, or: cd app && npx expo start
```

Scan the QR code with Expo Go to open the app on your phone.

## Backend API

All routes under `/api/*` require a Supabase JWT in the `Authorization: Bearer <token>` header, except:

- `GET /health` — health check
- `POST /api/jobs/daily-suggestions` — cron job, protected by `x-cron-secret` header

### Key endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/scan` | Upload garment photo → AI tagging + R2 storage |
| GET | `/api/garments` | List wardrobe items |
| GET | `/api/suggestions/today` | Today's outfit suggestion |
| POST | `/api/outfit-engine/generate` | Generate outfit on demand |
| GET | `/api/users/me` | Profile + style preferences |
| POST | `/api/users/push-token` | Register Expo push token |

## Daily suggestions cron

Call `POST /api/jobs/daily-suggestions` with header `x-cron-secret: <CRON_SECRET>` once per day (e.g. via GitHub Actions scheduled workflow or Render cron job).

## Environment variables

### Backend (`backend/.env`)

```
PORT=3000
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
R2_ENDPOINT=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_URL=
JWT_SECRET=
CRON_SECRET=
ALLOWED_ORIGINS=http://localhost:8081
```

### App (`app/.env`)

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_URL=http://localhost:3000
```
