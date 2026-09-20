# Online Deployment Checklist

## Current status

- Supabase existing project used: `Tool`
- Supabase project ref: `lcnuxfvjownsmqvuagkd`
- Supabase region: `ap-northeast-1`
- Ikoeru tenant created: `ikoeru-ai`
- First stream target: `twitcasting / l_xxx999`
- Secrets are not stored in GitHub.
- Owner dashboard, customer console, kit builder, and OBS scene are online on GitHub Pages.
- Secure Supabase Edge Function is deployed with JWT verification enabled.
- Tenant-scoped access token table exists for admin/job/scene authorization.
- Public OBS/job API still needs deployment after implementing scoped-token lookup in the Edge Function.

## Online URLs

- Owner dashboard: https://ura-news.github.io/stream-op-git/online/index.html?v=4
- Customer console: https://ura-news.github.io/stream-op-git/online/customer.html
- Kit builder: https://ura-news.github.io/stream-op-git/online/kits.html
- OBS scene: https://ura-news.github.io/stream-op-git/online/scene.html?demo=1&v=4
- Secure Supabase Edge API: https://lcnuxfvjownsmqvuagkd.functions.supabase.co/ikoeru-secure

## Provider decision

1. Supabase Edge Function
   - Secure function exists.
   - Tenant-scoped token DB exists.
   - Public OBS/job version must use hashed token lookup and stream scoping.

2. Render Free + Supabase Free
   - Lowest cost.
   - May sleep or throttle.
   - Good for prototype and owner testing.

3. Railway
   - Requires login.
   - Existing workspace may be paid Hobby plan.

## Secrets to configure in hosting provider

- `ADMIN_API_TOKEN`
- `JOB_TOKEN`
- `SCENE_READ_TOKEN`
- `AUTH_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TWITCASTING_CLIENT_ID`
- `TWITCASTING_CLIENT_SECRET`
- `LLM_API_KEY`
- `TTS_API_KEY`
- `TTS_BASE_URL`
- `PUBLIC_BASIC_AUTH_PASSWORD`
- `BACKUP_ENCRYPTION_KEY`

## Supabase setup

- [x] Use existing project `Tool`.
- [x] Run `online/supabase-schema.sql` as migration.
- [x] Insert first tenant, character, and TwitCasting stream.
- [x] Tables for feedback, training permissions, and audit logs exist.
- [x] Deploy JWT-required Edge Function `ikoeru-secure`.
- [x] Add tenant-scoped `access_tokens` table.
- [ ] Deploy scoped public OBS/job Edge Function.
- [ ] Add production RLS policies per tenant before exposing browser writes.
- [ ] Create storage bucket for generated voice audio and avatar assets.
- [ ] Configure backups.

## API deployment

- [x] Backend code exists.
- [x] Admin/job endpoints require bearer tokens.
- [x] Character propose/apply/rollback endpoints exist.
- [x] Kit creation endpoint exists.
- [x] Training permission endpoint exists.
- [x] Render blueprint exists.
- [x] Secure Supabase Edge API exists.
- [x] Tenant-scoped token storage exists.
- [ ] Public OBS/job API created with token scope lookup.
- [ ] Set environment variables/secrets.
- [ ] Verify `/api/health`.
- [ ] Verify TwitCasting credential test.
- [ ] Verify comment polling job.
- [ ] Verify reply generation job.
- [ ] Verify TTS synthesis job.

## Frontend deployment

- [x] Owner dashboard static URL.
- [x] Customer dashboard URL.
- [x] Kit builder URL.
- [x] OBS scene static URL.
- [x] OBS scene can receive API URL, stream ID, and scene token.
- [ ] Connect dashboard to deployed API URL.
- [ ] Access control verified against deployed API.
- [ ] Emergency stop verified against deployed API.

## OBS test

- [x] Provide online scene URL.
- [x] Keep left side empty for external comment viewer.
- [x] Place イコエルAI on the right.
- [x] Speech bubble does not cover left comment viewer.
- [x] Blink/lip-sync hooks implemented.
- [x] Audio URL playback implemented.
- [ ] Confirm avatar image renders after GitHub Pages cache refresh.
- [ ] Confirm emergency stop clears speech/audio through deployed API.

## Live TwitCasting test

- [ ] Start private or test stream.
- [ ] Confirm current live detected.
- [ ] Send new comment.
- [ ] Confirm comment stored.
- [ ] Confirm AI reply generated.
- [ ] Confirm TTS generated.
- [ ] Confirm OBS event delivered.
- [ ] Confirm duplicate comments are ignored.
- [ ] Confirm reconnection does not replay old comments.

## Data monetization readiness

- [x] Tables for feedback, training permissions, and audit logs exist.
- [x] Service improvement consent can be saved separately.
- [x] Model training consent can be saved separately.
- [x] External data sales consent can be saved separately.
- [ ] Retention period visible.
- [ ] Revocation removes future exports.
- [ ] Exports are tenant-scoped.
- [ ] Audit log records export operator, time, purpose.

## Completion definition

Online rollout is complete only when:

- A network API URL is live.
- Admin/customer/OBS URLs work against the live API.
- TwitCasting live comments create replies.
- Audio and avatar animation work in OBS.
- Secrets are stored only in hosting provider.
- Supabase stores characters, comments, replies, feedback, permissions, audit logs.
- Emergency stop works online.
- A customer kit can be created without touching local files.
