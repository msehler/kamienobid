# Kamieno App

Kamieno is a jurisdiction-aware legal bidding platform built from the March 2026 PRD. Clients can create and pay for a matter draft, lawyers can bid only in the jurisdictions where they are licensed, and admins can manage country rollout and verification.

## What is included

- Dynamic client matter posting for 24 legal practice areas across AU, NZ, UK, US, CA, and IE.
- Jurisdiction-aware pricing, disclaimers, legal terminology, and template prompts.
- SQLite-backed persistence for users, sessions, jurisdictions, matters, bids, and shortlists.
- Cookie-based auth with role-aware access control for clients, lawyers, and admins.
- Lawyer onboarding with jurisdiction selection and a structured four-part bid composer.
- Compliance screening for prohibited language plus the 200-word minimum strategy rule.
- Client shortlist and accept flow with engagement letter draft output.
- Payment-gated publishing flow with a Stripe-ready checkout adapter and demo fallback when keys are absent.
- Admin controls for country enablement, verification queue, and segmented analytics.
- Vercel-compatible API routes and a local no-dependency Node server.

## Run locally

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

## Notes

- Runtime data is stored in `data/kamienobid.sqlite` locally and is ignored by Git.
- On Vercel, the SQLite file falls back to `/tmp`, so this is a stronger application foundation but still not true durable cloud persistence. A managed database is the next production step.
- If `STRIPE_SECRET_KEY` is absent, publishing falls back to a demo checkout path so the flow still works locally.
- An admin account is auto-seeded only in non-Vercel environments unless `KAMIENO_ADMIN_PASSWORD` is set. Configure `KAMIENO_ADMIN_EMAIL` and `KAMIENO_ADMIN_PASSWORD` explicitly for controlled admin access.
- Uploaded files are still represented as document metadata for now; real document storage would be the next integration step.
