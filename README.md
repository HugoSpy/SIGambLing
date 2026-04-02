# SIGambling

Plateforme de paris virtuels et casino pour la promo EPITA, construite en monorepo avec `frontend/` et `backend/`.

## Docs

- [Product Brief](./docs/PRODUCT_BRIEF.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Roadmap](./docs/ROADMAP.md)

## Stack

- Frontend: React, TypeScript, Vite, Tailwind, Framer Motion, Zustand, React Query
- Backend: Node.js, Express, TypeScript, Prisma, Passport Microsoft, Zod, Winston
- Database: PostgreSQL via Supabase
- Deploy: Vercel

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment templates:

```bash
Copy-Item .env.example .env
Copy-Item frontend/.env.example frontend/.env
Copy-Item backend/.env.example backend/.env
```

3. Fill in your Supabase and Azure AD values:

- `DATABASE_URL` and `DIRECT_URL`
- `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID`
- `MICROSOFT_CALLBACK_URL`
- `JWT_SECRET` and `JWT_REFRESH_SECRET`
- `FRONTEND_URL` and `VITE_API_URL`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_AVATARS_BUCKET` for avatar uploads

4. Generate Prisma client, push the schema, and seed the database:

```bash
npm run prisma:generate
npm run prisma:push
npm run seed
```

5. Validate the local environment before launching the stack:

```bash
npm run qa:validate-env
```

6. Start both apps:

```bash
npm run dev
```

## Useful Commands

```bash
npm run dev:frontend
npm run dev:backend
npm run build
npm run test:integration
```

## Local URLs

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Health check: `http://localhost:3000/health`

## Microsoft OAuth

Use these redirect URLs in Azure App Registration:

- Development: `http://localhost:3000/auth/microsoft/callback`
- Production: `https://api.sigambling.vercel.app/auth/microsoft/callback`

The frontend login button calls `POST /auth/microsoft`, then redirects the browser to the Microsoft consent flow. On success, the backend sets the refresh token as an `httpOnly` cookie and redirects the browser to the frontend callback page with a short-lived access token.
