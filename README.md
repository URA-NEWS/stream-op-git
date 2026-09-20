# Ikoeru AI Online Studio

Online-only control and OBS scene workspace for イコエルAI.

Local runtime is no longer the target. New work should move toward hosted admin/customer dashboards, hosted API, hosted database, and network OBS URLs.

## Online files

- `online/index.html` - online admin portal prototype.
- `online/scene.html` - OBS browser scene prototype. Left 50% is reserved for an external comment viewer; イコエルAI appears on the right with speech bubble, blinking, and lip-sync hooks.
- `online/env.example` - cloud environment variable template. Do not commit real secrets.
- `online/supabase-schema.sql` - Supabase schema draft.
- `online/api-contract.md` - API contract for the online backend.
- `online/deployment-checklist.md` - completion checklist for the online deployment.
- `ONLINE_MIGRATION.md` - migration plan from local MVP to online-only operation.

## Static preview URLs

If GitHub Pages is enabled for this repository from the `main` branch root, these paths should become available:

```text
https://ura-news.github.io/stream-op-git/online/index.html
https://ura-news.github.io/stream-op-git/online/scene.html?demo=1
```

If Pages is not enabled, enable GitHub Pages in repository settings or deploy the `online/` folder to any static host.

## Backend still required

The static files are only the online UI/OBS shell. Full completion requires an online API and database:

- Supabase project with `online/supabase-schema.sql`.
- Hosted API server on Render, Railway, Fly, VPS, or another provider.
- Cloud environment variables from `online/env.example`.
- TwitCasting credentials stored only in the hosting provider.
- LLM and TTS providers for online reply/audio generation.

## Security rules

- Never commit Client Secret, access tokens, API keys, or stream keys.
- Tenant/customer data must be isolated in backend policies.
- Emergency stop must be available online.
- Training/data-sale exports require explicit permission records.
