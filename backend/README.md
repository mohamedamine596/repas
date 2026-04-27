# Backend API (Production-Style Auth + RBAC)

This backend provides:
- Access token + refresh token authentication
- Secure refresh token storage (httpOnly cookie + hashed session in DB)
- Role-based access control (`DONOR`, `RECEIVER`, `ADMIN`)
- Donor verification workflow with document upload and admin review
- Protected meal, messaging, and reporting APIs

## 1) Start the backend

```bash
cd backend
npm install
npm run dev
```

Server URL: `http://localhost:4000`

## 2) Environment variables

```env
PORT=4000
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/repas?retryWrites=true&w=majority
MONGODB_DB_NAME=repas
CORS_ORIGIN=https://your-frontend.vercel.app,https://*.vercel.app

# Token secrets
ACCESS_TOKEN_SECRET=replace_with_long_random_secret
REFRESH_TOKEN_SECRET=replace_with_long_random_secret

# Cookie settings for cross-site frontend/backend deployments
REFRESH_COOKIE_SAME_SITE=none
REFRESH_COOKIE_SECURE=true
REFRESH_COOKIE_DOMAIN=

# Optional TTL overrides
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=30d

# Frontend URL used in password reset links
FRONTEND_APP_URL=https://your-frontend.vercel.app
APP_URL=https://your-frontend.vercel.app

# Google OAuth login
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://your-backend-domain/api/auth/google/callback

# Base admin account (auto-created if missing)
BASE_ADMIN_EMAIL=admin@coeurtablepartage.com
BASE_ADMIN_PASSWORD=Admin123456!
BASE_ADMIN_NAME=Base Admin

# Optional SMTP for donor decision emails
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
APP_NAME=Coeur Table Partage
```

Test MongoDB connectivity:

```bash
cd backend
npm run mongo:ping
```

Render note:

- If you deploy from a Docker image, configure all environment variables in Render dashboard.
- Do not rely on a baked `.env` file inside the image.

## 3) Roles and verification rules

- `RECEIVER`: can browse and reserve meals immediately
- `DONOR`: can browse, but cannot publish meals until verified
- `ADMIN`: can review and approve/reject donor verification requests

Admin account rules:
- Users can only register as `DONOR` or `RECEIVER`
- A single base admin is created automatically from `BASE_ADMIN_*` environment variables
- Any extra admin users are demoted to `RECEIVER` during DB normalization

When a user registers as `DONOR`:
- `isVerified = false`
- `verificationStatus = PENDING`
- a pending verification record is created
- donor uploads identity file via `/api/verification/upload`

## 4) Main endpoints

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PATCH /api/auth/me`

### Verification (donor)
- `POST /api/verification/upload` (multipart file field: `document`)
- `GET /api/verification/status`

### Admin
- `GET /api/admin/verifications?status=PENDING|APPROVED|REJECTED|ALL`
- `PUT /api/admin/verifications/:id` with body:

```json
{
  "status": "APPROVED"
}
```

or

```json
{
  "status": "REJECTED",
  "reason": "Document is unreadable"
}
```

### Meals
- `POST /api/meals` requires `requireAuth + requireVerifiedDonor`
- `PATCH /api/meals/:id` allows:
  - donor owner updates
  - receiver reservation flow

## 5) Security controls in place

- Password hashing with `bcrypt`
- Input validation with `Joi`
- Auth route rate limiting
- Duplicate email protection
- File upload restrictions (PDF/JPG/PNG/WEBP, 5MB)
- Helmet and credentialed CORS

## 6) Postman

Import `backend/postman/Coeur-Table-Partage-Backend.postman_collection.json` and update requests for new auth/verification/admin endpoints as needed.

