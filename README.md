# Kamieno MVP

Kamieno is a jurisdiction-aware legal bidding platform MVP built from the March 2026 PRD. Clients can post a matter once, lawyers can bid only in the jurisdictions where they are licensed, and admins can manage country rollout and verification.

## What is included

- Dynamic client matter posting for 24 legal practice areas across AU, NZ, UK, US, CA, and IE.
- Jurisdiction-aware pricing, disclaimers, legal terminology, and template prompts.
- Lawyer onboarding with jurisdiction selection and a structured four-part bid composer.
- Compliance screening for prohibited language plus the 200-word minimum strategy rule.
- Client shortlist and accept flow with engagement letter draft output.
- Admin controls for country enablement, verification queue, and segmented analytics.
- Vercel-compatible API routes and a local no-dependency Node server.

## Run locally

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

## Notes

- Runtime data is stored in `data/store.json` locally and is ignored by Git.
- On Vercel, storage falls back to `/tmp`, so this build behaves like a functional MVP/demo rather than durable production infrastructure.
- Uploaded files are represented as document metadata for now; real document storage would be the next integration step.
