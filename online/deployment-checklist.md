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
- Customer Supabase Edge Function is deployed with JWT verification enabled.
- Tenant-scoped access token table exists for admin/job/scene authorization.
- Tenant user membership and RLS exist for customer console reads.
- Customer change request storage and RLS exist.
- Customer training-permission storage route exists.

## Online URLs

- Owner dashboard: https://ura-news.github.io/stream-op-git/online/index.html?v=4
- Customer console: https://ura-news.github.io/stream-op-git/online/customer.html?v=2
- Kit builder: https://ura-news.github.io/stream-op-git/online/kits.html
- OBS scene: https://ura-news.github.io/stream-op-git/online/scene.html?demo=1&v=4
- Secure Supabase Edge API: https://lcnuxfvjownsmqvuagkd.functions.supabase.co/ikoeru-secure
- Customer Supabase Edge API: https://lcnuxfvjownsmqvuagkd.functions.supabase.co/ikoeru-customer-api

## Supabase setup

- [x] Use existing project `Tool`.
- [x] Run `online/supabase-schema.sql` as migration.
- [x] Insert first tenant, character, and TwitCasting stream.
- [x] Tables for feedback, training permissions, and audit logs exist.
- [x] Deploy JWT-required Edge Function `ikoeru-secure`.
- [x] Deploy JWT-required Edge Function `ikoeru-customer-api`.
- [x] Add tenant-scoped `access_tokens` table.
- [x] Add `tenant_users` membership table.
- [x] Add customer console RLS select policies.
- [x] Add customer-approved character change request table.
- [x] Add customer change request insert/select policies.
- [x] Add customer training permission insert policy.
- [ ] Add approval/apply workflow from `character_change_requests` to `characters`.
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
- [x] Customer Supabase Edge API exists.
- [x] Tenant-scoped token storage exists.
- [x] Customer read routes exist.
- [x] Customer change request route exists.
- [x] Customer training permission route exists.
- [ ] Public OBS/job API created with token scope lookup.
- [ ] Set environment variables/secrets.
- [ ] Verify `/api/health` with an actual Supabase Auth user JWT.
- [ ] Verify TwitCasting credential test.
- [ ] Verify comment polling job.
- [ ] Verify reply generation job.
- [ ] Verify TTS synthesis job.

## Frontend deployment

- [x] Owner dashboard static URL.
- [x] Customer dashboard URL.
- [x] Kit builder URL.
- [x] OBS scene static URL.
- [x] Customer dashboard explains required JWT and flow.
- [x] Customer dashboard calls JWT customer API.
- [x] OBS scene can receive API URL, stream ID, and scene token.
- [ ] Connect owner dashboard to deployed admin API URL.
- [ ] Access control verified against deployed API with a real user.
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
- [x] Customer change requests are stored as product data.
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
