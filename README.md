# CleanSL Backend API 🗑️

Node.js + Express backend for the CleanSL waste management platform.

## Project Structure

```
cleansl-backend/
├── src/
│   ├── index.js                  ← Entry point (Express app)
│   ├── config/
│   │   └── supabaseClient.js     ← Supabase service-role client
│   ├── middleware/
│   │   └── authMiddleware.js     ← Verifies Supabase JWT on every request
│   └── routes/
│       ├── schedules.js          ← GET /api/schedule/:userId
│       ├── notifications.js      ← POST /api/notify/pickup
│       └── complaints.js        ← POST /api/complaints, GET /api/complaints
├── tests/
│   └── complaints.test.js        ← Jest tests
├── .env.example
└── package.json
```

## Setup

```bash
# 1. Clone and install
cd CleanSL-Backend
npm install

# 2. Configure environment
cp .env.example .env
# Fill in your values in .env:
#   SUPABASE_URL      → Your Supabase project URL
#   SUPABASE_SERVICE_KEY → Your Supabase SERVICE ROLE key (not anon key!)
#   FCM_SERVER_KEY    → Your Firebase Cloud Messaging server key
#   PORT              → 3000 (default)

# 3. Run in development (with auto-reload)
npm run dev

# 4. Run tests
npm test
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | None | Health check |
| GET | `/api/schedule/:userId` | JWT | Get next pickup window for resident |
| POST | `/api/notify/pickup` | JWT | Send ETA push notification to a zone |
| POST | `/api/complaints` | JWT | Submit a missed-collection complaint |
| GET | `/api/complaints` | JWT | Get all complaints for logged-in resident |

## Authentication

Every protected endpoint requires a Supabase JWT in the header:

```
Authorization: Bearer <supabase_access_token>
```

**In Flutter**, get the token like this:
```dart
final token = Supabase.instance.client.auth.currentSession?.accessToken;
// Use in http.post headers: {'Authorization': 'Bearer $token'}
```

## Triage Logic

The `POST /api/complaints` endpoint auto-assigns priority based on `aiSortedPercentage`:

| Score | Priority | Effect |
|-------|----------|--------|
| ≥ 70% | `high` | Pushed to top of CMC dashboard |
| 40–69% | `medium` | Standard queue |
| < 40% | `low` | Lower priority |

## Supabase Tables Required

| Table | Key Columns |
|-------|-------------|
| `users` | `id`, `full_name`, `role`, `phone_number`, `email` |
| `resident_profiles` | `user_id`, `zone_id`, `fcm_token`, `total_points` |
| `pickup_schedules` | `zone_id`, `pickup_date`, `eta_start`, `eta_end`, `waste_types` |
| `complaints` | `user_id`, `photo_url`, `gps_lat`, `gps_lng`, `ai_sorted_percentage`, `priority`, `status` |
| `notification_logs` | `zone_id`, `type`, `eta_start`, `eta_end`, `recipients_count`, `sent_at` |

**Clean SL Backend**

Backend infrastructure for Clean SL, a smart waste management platform that connects residents with waste collection drivers to improve garbage collection efficiency.

This backend uses Supabase as the main backend service for authentication, database management, and API access.

**Project Overview**

Clean SL aims to digitize and streamline the waste collection process by enabling:

Residents to request waste pickup
Drivers to manage collection routes
Real-time data storage and access

The backend is powered by Supabase, which provides a fully managed PostgreSQL database, authentication system, and RESTful APIs.

**Tech Stack**

Supabase – Backend as a Service

PostgreSQL – Database

Supabase Auth – User authentication

REST API – Communication between frontend and backend
