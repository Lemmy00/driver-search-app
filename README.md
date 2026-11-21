# RoadCred

RoadCred is a prototype for a European professional network focused on truck drivers and transport companies — a two-sided trust layer where companies find reliable drivers and drivers build a portable, verified reputation.

## Features

- **Marketing landing page** that flows into the live workspace
- **Mock demo login** with a company / driver role chooser and one-click demo accounts
- **Two role experiences**
  - _Company workspace_ — discover & vet drivers, ranked match board, two-way reputation, company profile
  - _Driver dashboard_ — public profile, find work, browse & review companies
- **Rich driver profiles** — licenses, languages, route types, and categorized skills (vehicle & equipment, mechanical, compliance, logistics, soft skills) with proficiency levels
- **Availability periods** — drivers publish free / hired / tentative windows; companies search by date range
- **Two-way reviews & ratings** — companies review drivers and drivers review companies, posted in-app
- **Mock verification** — per-check verification state (identity, licence, certificates, etc.) with an instant approval flow for the prototype
- **Profile media & customization fields** — driver photo, company logo, cover image, gallery URLs, accent color, and tagline are modeled now; seeded image URLs are intentionally empty

## Stack

- React + Vite + TypeScript frontend
- Express + TypeScript backend
- SQLite seed database through Node's built-in `node:sqlite`
- npm workspaces: `apps/web`, `apps/api`, `packages/shared`

## Run Locally

```bash
npm install
npm run dev
```

The API runs on `http://localhost:4000` and the web app runs on `http://localhost:5173`.

## Demo Logins

All seeded demo accounts use password `demo1234`.

| Flow | Email | Opens |
| --- | --- | --- |
| Company admin | `admin@nordtrail.eu` | NordTrail Logistics GmbH |
| Company admin | `admin@adriatrans.eu` | AdriaTrans Group |
| Company admin | `admin@iberiafreight.eu` | Iberia Freight Network |
| Company admin | `admin@alpinefreight.eu` | Alpine Freight Labs AG |
| Company admin | `admin@balticroute.eu` | BalticRoute Carriers |
| Driver login | `driver-07@roadcred.demo` | New profile with verification flow |
| Driver login | `driver-01@roadcred.demo` | Verified refrigerated freight profile |
| Driver login | `driver-02@roadcred.demo` | ADR profile |
| Driver login | `driver-08@roadcred.demo` | High-value freight profile |
| Driver login | `driver-09@roadcred.demo` | Baltic-Nordic profile |

## Useful Commands

```bash
npm run typecheck
npm run build
npm run build:pages
npm test
```

## Cloudflare Pages Demo

[Open the hosted RoadCred demo](https://roadcred-partner-demo.pages.dev).

Build and redeploy it with:

```bash
npm run build:pages
npx wrangler pages deploy apps/web/dist --branch master --commit-dirty=true
```

`npm run build:pages` exports the seeded Express/SQLite demo data into `functions/api/demo-fixture.json`, then Cloudflare Pages serves the Vite frontend plus a lightweight `/api/*` Pages Function for presentation use. The Pages Function data is demo-only and may reset between runtime instances.

## Prototype Scope

This version uses seeded company and driver personas. Login is prototype-grade but password-backed for the demo accounts above, and verification approves instantly for demonstration. Production-grade authentication, real identity/document verification, moderation, GDPR workflows, and dispute handling are intentionally out of scope, but the domain model leaves room for them.
