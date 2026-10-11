# Real Estate Listing API

REST API for listing and managing real estate properties, built with **TypeScript**, **Node.js (Express 5)**, **Prisma** and **PostgreSQL**, secured with **JWT**, and documented with **Swagger (OpenAPI 3)**.

## Project structure

```
realestate-api/
├── prisma/
│   └── schema.prisma            # User & Property models (PostgreSQL)
│   └── migrations/              # SQL migrations
├── swagger-docs/                # All Swagger/OpenAPI docs, one file per module
│   ├── components.yaml          # Shared schemas, responses, JWT security scheme
│   ├── auth.yaml                # Auth module endpoints
│   ├── properties.yaml          # Properties module endpoints
│   └── email.yaml               # Email notifications (what triggers which email)
├── src/
│   ├── config/                  # env validation, Prisma client, Swagger setup
│   ├── middlewares/             # JWT auth, request validation, error handling
│   ├── modules/
│   │   ├── auth/                # routes, controller, service, validation
│   │   ├── properties/          # routes, controller, service, validation
│   │   └── email/               # email service + HTML templates
│   ├── types/                   # Express type extensions (req.user)
│   ├── utils/                   # ApiError, JWT helpers, response helpers
│   ├── routes.ts                # Mounts module routers under /api/v1
│   ├── app.ts                   # Express app
│   └── server.ts                # Entry point
└── .env.example
```

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Then edit `.env` and set at least `DATABASE_URL`, `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`. Generate secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Start PostgreSQL

Install PostgreSQL locally (https://www.postgresql.org/download/) and create a database called `realestate`, or use a hosted PostgreSQL (Neon, Supabase, RDS…). Put the connection string in `DATABASE_URL`.

### 4. Run the migrations (creates the tables)

```bash
npm run prisma:migrate   # development: applies migrations, creates new ones after schema changes
npm run prisma:deploy    # production: applies existing migrations only
```

### 5. Run

```bash
npm run dev          # development with auto-reload
npm run build        # compile to dist/
npm start            # run the compiled build
```

- API base URL: `http://localhost:5000/api/v1`
- Swagger UI: **http://localhost:5000/api-docs**
- Raw OpenAPI JSON: `http://localhost:5000/api-docs.json`
- Health check: `http://localhost:5000/health`

## Authentication

1. `POST /api/v1/auth/register` or `POST /api/v1/auth/login` returns an `accessToken` (15 min by default) and a `refreshToken` (7 days by default).
2. Send the access token on protected requests: `Authorization: Bearer <accessToken>`.
3. When the access token expires, call `POST /api/v1/auth/refresh-token` with the refresh token to get a new pair. Refresh tokens are rotated: each one can be used only once.

In Swagger UI, click **Authorize** and paste the access token.

## Endpoints

### Auth: `/api/v1/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | – | Create an account (sends a welcome and verification email) |
| POST | `/login` | – | Log in and receive tokens |
| POST | `/refresh-token` | – | Exchange a refresh token for a new token pair |
| POST | `/verify-email` | – | Verify an email address with the token from the email |
| POST | `/forgot-password` | – | Send a password reset email |
| POST | `/reset-password` | – | Reset the password with the token from the email |
| POST | `/logout` | ✅ | Revoke the refresh token |
| GET | `/me` | ✅ | Get the current user's profile |
| PATCH | `/me` | ✅ | Update the profile |
| POST | `/resend-verification` | ✅ | Resend the verification email |
| POST | `/change-password` | ✅ | Change the password |

### Properties: `/api/v1/properties` (all require auth)

| Method | Path | Description |
|---|---|---|
| POST | `/` | List a new property |
| GET | `/` | Get all properties (pagination, filters, search, sorting) |
| GET | `/me` | Get the properties owned by the current user |
| GET | `/:id` | Get property details |
| PATCH | `/:id` | Update a property (owner or admin only) |
| DELETE | `/:id` | Delete a property (owner or admin only) |

**Query parameters for `GET /properties`:** `page`, `limit`, `search`, `city`, `state`, `country`, `propertyType`, `listingType`, `status`, `minPrice`, `maxPrice`, `minBedrooms`, `minBathrooms`, `isFeatured`, `sortBy` (`createdAt|price|bedrooms|areaSqft`), `sortOrder` (`asc|desc`).

### Email module

The email module (`src/modules/email`) sends notifications through SMTP (nodemailer) when these actions happen: registration, resend verification, forgot password, password reset or change, property listed, and property deleted. Set `EMAIL_ENABLED=false` to print emails to the console instead of sending them, which is useful for local development. For testing real delivery, [Ethereal](https://ethereal.email) or [Mailtrap](https://mailtrap.io) work well.

## Roles

- `USER` / `AGENT`: chosen at registration. Both can create listings and manage their own.
- `ADMIN`: can update or delete any listing and set `isFeatured`. It can't be self-assigned; to promote a user, set `role: "ADMIN"` directly in the database (e.g. with `npm run prisma:studio`).

## Response format

```json
// Success
{ "success": true, "message": "...", "data": { }, "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 } }

// Error
{ "success": false, "message": "Validation failed", "errors": [{ "field": "email", "message": "Invalid email address" }] }
```
