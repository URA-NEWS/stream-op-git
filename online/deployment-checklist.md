# Online Deployment Checklist

## Current status

- Supabase existing project used: `Tool`
- Supabase project ref: `lcnuxfvjownsmqvuagkd`
- Supabase region: `ap-northeast-1`
- Ikoeru tenant created: `ikoeru-ai`
- First stream target: `twitcasting / l_xxx999`
- Secrets are not stored in GitHub.
- Backend API code is prepared but not deployed to a public runtime yet.

## Provider decision

Choose one before API deployment:

1. Render Free + Supabase Free
   - Lowest cost.
   - May sleep or throttle.
   - Good for prototype and owner testing.

2. Railway
   - Existing workspace is Hobby plan.
   - Do not deploy until owner accepts possible cost and confirms which project to use.

3. VPS
   - Best for VOICEVOX/Ollama always-on.
   - Not free.

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
- [ ] Add production RLS policies per tenant before exposing browser writes.
- [ ] Create storage bucket for generated voice audio and avatar assets.
- [ ] Configure backups.

## API deployment

- [x] Backend code exists.
- [x] Admin/job endpoints require bearer tokens.
- [x] Render blueprint exists.
- [ ] Create API server project.
- [ ] Set environment variables.
- [ ] Verify `/api/health`.
- [ ] Verify TwitCasting credential test.
- [ ] Verify comment polling job.
- [ ] Verify reply generation job.
- [ ] Verify TTS synthesis job.

## Frontend deployment

- [x] Owner dashboard static URL.
- [x] OBS scene static URL.
- [ ] Customer dashboard URL.
- [ ] Connect dashboard to deployed API URL.
- [ ] Access control verified.
- [ ] Emergency stop verified.

## OBS test

- [x] Provide online scene URL.
- [x] Keep left side empty for external comment viewer.
- [x] Place イコエルAI on the right.
- [x] Speech bubble does not cover left comment viewer.
- [x] Blink/lip-sync hooks implemented.
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
- [ ] Service improvement consent separated from external sale consent in UI.
- [ ] Model training consent separated from both in UI.
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
